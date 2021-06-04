//
const clearButton = document.body.querySelector ('.clear-button');
const openButton = document.body.querySelector ('.open-button');
const grayscaleFilterLabel = document.body.querySelector ('.grayscale-filter-label');
const grayscaleFilterSelect = document.body.querySelector ('.grayscale-filter-select');
const saveButton = document.body.querySelector ('.save-button');
const closeButton = document.body.querySelector ('.close-button');
const canvas = document.body.querySelector ('.canvas');
//
const { ipcRenderer } = require ('electron');
const { app, dialog, getCurrentWindow, getGlobal } = require ('@electron/remote');
//
const fs = require ('fs');
const path = require ('path');
const url = require ('url');
//
const Storage = require ('../../lib/storage.js');
const applyStorage = new Storage ('apply-preferences');
//
const settings = getGlobal ('settings');
//
const applyWindow = getCurrentWindow ();
//
const appDefaultFolderPath = app.getPath (settings.defaultFolder);
//
const defaultPrefs =
{
    imagePath: null,
    grayscaleFilterSelect: "",
    defaultInputImageFolderPath: appDefaultFolderPath,
    defaultOutputImageFolderPath: appDefaultFolderPath
};
let prefs = applyStorage.get (defaultPrefs);
//
let imagePath = prefs.imagePath;
//
let defaultInputImageFolderPath = prefs.defaultInputImageFolderPath;
let defaultOutputImageFolderPath = prefs.defaultOutputImageFolderPath;
//
const grayscaleWeights =
{
    "Luminosity": [ 0.299, 0.587, 0.114 ],  // "Luminosity", "Luma", "Gray"
    // "Average": [ 0.333, 0.333, 0.333 ], // "Average", "All", "RGB", "Plain", "Basic", "Simple"
    "": null,
    "Red Filter": [ 1, 0, 0 ],
    "Orange Filter": [ 0.75, 0.25, 0 ],
    "Yellow Filter": [ 0.5, 0.5, 0 ],
    "Lime Filter": [ 0.25, 0.75, 0 ],
    "Green Filter": [ 0, 1, 0 ],
    "Jade Filter": [ 0, 0.75, 0.25 ],
    "Cyan Filter": [ 0, 0.5, 0.5 ],
    "Cobalt Filter": [ 0, 0.25, 0.75 ],
    "Blue Filter": [ 0, 0, 1 ],
    "Purple Filter": [ 0.25, 0, 0.75 ],
    "Magenta Filter": [ 0.5, 0, 0.5 ],
    "Cardinal Filter": [ 0.75, 0, 0.25 ]
}
//
function getWeightsTooltip (weights)
{
    let tooltip =
    [
        `Red: ${(weights[0] * 100).toFixed (0)} %`,
        `Green: ${(weights[1] * 100).toFixed (0)} %`,
        `Blue: ${(weights[2] * 100).toFixed (0)} %`
    ]
    return tooltip.join ("\n");
}
//
for (let grayscaleWeight in grayscaleWeights)
{
    let option = document.createElement ('option');
    option.className = 'weights';
    if (grayscaleWeight)
    {
        option.textContent = grayscaleWeight;
        option.title = getWeightsTooltip (grayscaleWeights[grayscaleWeight]);
    }
    else
    {
        option.textContent = "───────";
        option.disabled = true;
    }
    grayscaleFilterSelect.appendChild (option);
}
grayscaleFilterSelect.value = prefs.grayscaleFilterSelect;
if (grayscaleFilterSelect.selectedIndex < 0) // -1: no element is selected
{
    grayscaleFilterSelect.selectedIndex = 0;
}
grayscaleFilterSelect.addEventListener
(
    'input',
    event =>
    {
        if (currentColorRamp256)
        {
            applyColorMap (imagePath, event.currentTarget.value);
        }
    }
);
//
clearButton.addEventListener
(
    'click',
    event =>
    {
        imagePath = null;
        applyColorMap (imagePath, grayscaleFilterSelect.value);
        grayscaleFilterLabel.classList.add ('disabled');
        grayscaleFilterSelect.disabled = true;
        saveButton.disabled = true;
    }
);
//
openButton.addEventListener
(
    'click',
    event =>
    {
        dialog.showOpenDialog
        (
            applyWindow,
            {
                title: "Open image file (PNG or JPEG):",
                message: "Open image file (PNG or JPEG):",
                filters:
                [
                    { name: "Image file (*.png, *.jpeg, *.jpg)", extensions: [ 'png', 'jpeg', 'jpg' ] }
                ],
                defaultPath: defaultInputImageFolderPath
            }
        )
        .then
        (
            result =>
            {
                if (!result.canceled)
                {
                    imagePath = result.filePaths[0];
                    defaultInputImageFolderPath = path.dirname (imagePath);
                    applyColorMap (imagePath, grayscaleFilterSelect.value);
                    grayscaleFilterLabel.classList.remove ('disabled');
                    grayscaleFilterSelect.disabled = false;
                    saveButton.disabled = false;
                }
            }
        );
    }
);
//
saveButton.addEventListener
(
    'click',
    event =>
    {
        let name = [ path.parse (imagePath).name, grayscaleFilterSelect.value, currentFormulaName ].join (" | ");
        let outputImagePath = path.join (defaultOutputImageFolderPath, `${name}.png`);
        dialog.showSaveDialog
        (
            applyWindow,
            {
                title: "Save image file (PNG):",
                message: "Save image file (PNG):",
                filters:
                [
                    { name: "Image file (*.png)", extensions: [ 'png', ] }
                ],
                defaultPath: outputImagePath
            }
        )
        .then
        (
            result =>
            {
                if (!result.canceled)
                {
                    let outputImagePath = result.filePath;
                    fs.writeFile
                    (
                        outputImagePath,
                        canvas.toDataURL ().replace ('data:image/png;base64,', ''),
                        'base64',
                        (err) =>
                        {
                            if (err)
                            {
                                alert ("An error occurred writing the file:\n" + err.message);
                            }
                            else
                            {
                                defaultOutputImageFolderPath = path.dirname (outputImagePath);
                            }
                        }
                    );
                }
            }
        );
    }
);
//
let currentColorRamp256 = null;
let currentFormulaName;
//
function applyColorMap (imagePath, grayscaleFilter)
{
    let isImage = imagePath && fs.existsSync (imagePath);
    if (isImage)
    {
        let weights = grayscaleWeights[grayscaleFilter];
        let img = new Image ();
        img.onload = function ()
        {
            let width = this.naturalWidth;
            let height = this.naturalHeight;
            canvas.width = width;
            canvas.height = height;
            let context = canvas.getContext ('2d', { alpha: true });
            context.drawImage (img, 0, 0);
            let image = context.getImageData (0, 0, width, height);
            let d = image.data;
            let n = width * height * 4;
            for (let i = 0; i < n; i += 4)
            {
                let rgb = currentColorRamp256[Math.round ((weights[0] * d[i + 0]) + (weights[1] * d[i + 1]) + (weights[2] * d[i + 2]))];
                d[i + 0] = rgb[0];
                d[i + 1] = rgb[1];
                d[i + 2] = rgb[2];
            }
            context.putImageData (image, 0, 0);
            canvas.title = imagePath;
            canvas.hidden = false;
        };
        img.src = url.pathToFileURL (imagePath).href;
    }
    else
    {
        canvas.width = 0;
        canvas.height = 0;
        canvas.title = "";
        canvas.hidden = true;
    }
    return isImage;
}
//
ipcRenderer.on
(
    'apply-color-map',
    (event, colorRamp256, formulaName) =>
    {
        currentColorRamp256 = colorRamp256;
        currentFormulaName = formulaName;
        if (imagePath)
        {
            let isImage = applyColorMap (imagePath, grayscaleFilterSelect.value);
            if (isImage)
            {
                grayscaleFilterLabel.classList.remove ('disabled');
                grayscaleFilterSelect.disabled = false;
                saveButton.disabled = false;
            }
            else
            {
                grayscaleFilterLabel.classList.add ('disabled');
                grayscaleFilterSelect.disabled = true;
                saveButton.disabled = true;
            }
        }
    }
);
//
window.addEventListener // *Not* document.addEventListener
(
    'beforeunload',
    () =>
    {
        let prefs =
        {
            imagePath: imagePath,
            grayscaleFilterSelect: grayscaleFilterSelect.value,
            defaultInputImageFolderPath: defaultInputImageFolderPath,
            defaultOutputImageFolderPath: defaultOutputImageFolderPath
        };
        applyStorage.set (prefs);
    }
);
//
// Adapted from https://github.com/ten1seven/track-focus
(function (body)
{
    let mouseFocus;
    let bindEvents = function ()
    {
        body.addEventListener ('keydown', (event) => { mouseFocus = false; });
        body.addEventListener ('mousedown', (event) => { mouseFocus = true; });
        body.addEventListener ('focusin', (event) => { if (mouseFocus) event.target.classList.add ('mouse-focus'); });
        body.addEventListener ('focusout', (event) => { if (document.activeElement !== event.target) event.target.classList.remove ('mouse-focus'); });
    };
    bindEvents ();
}) (document.body);
//
closeButton.addEventListener ('click', (event) => { event.preventDefault (); window.close (); });
//
window.addEventListener ('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault (); window.close (); } });
//
