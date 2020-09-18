//
const { ipcRenderer, nativeImage, remote, shell, webFrame } = require ('electron');
const { app, BrowserWindow, getCurrentWebContents, getCurrentWindow, getGlobal } = remote;
//
const fs = require ('fs');
const path = require ('path');
//
const appName = app.name;
const appVersion = app.getVersion ();
//
const mainWindow = getCurrentWindow ();
const webContents = getCurrentWebContents ();
//
const settings = getGlobal ('settings');
//
const appDefaultFolderPath = app.getPath (settings.defaultFolder);
//
const Storage = require ('../lib/storage.js');
const rendererStorage = new Storage ('renderer-preferences');
//
const fileDialogs = require ('./lib/file-dialogs.js');
const pullDownMenus = require ('./lib/pull-down-menus.js');
const exampleMenus = require ('./lib/example-menus');
const json = require ('./lib/json2.js');
//
const colorUtils = require ('./lib/color-utils.js');
const { createCurvesMap, createLinearGradient, createColorTable, createTestImage } = require ('./lib/color-ramp-preview.js');
//
const mapColorRamp = require ('./lib/map-color-ramp.js');
//
const previewImageSize = 256;
const pixelRatio = Math.max (window.devicePixelRatio, 1.5); // Leave room for zoom factor up to 144%
const previewSizeOptions = { width: previewImageSize * pixelRatio, height: previewImageSize * pixelRatio, quality: 'better' };
//
let testImages = { };
//
let testImagesDirname = path.join (__dirname, 'test-images');
let testImagesFilenames = fs.readdirSync (testImagesDirname);
testImagesFilenames.sort ((a, b) => a.replace (/\.png$/i, "").localeCompare (b.replace (/\.png$/i, "")));
for (let testImagesFilename of testImagesFilenames)
{
    let pngFilename = testImagesFilename.match (/(.*)\.png$/i);
    if (pngFilename)
    {
        let pngLabel = pngFilename[1];
        if (pngLabel[0] !== '~')
        {
            let pngPath = path.join (testImagesDirname, testImagesFilename);
            let pngNativeImage = nativeImage.createFromPath (pngPath);
            testImages[pngLabel] = 
            {
                path: pngPath,
                dataURL: pngNativeImage.toDataURL (),
                previewDataURL: pngNativeImage.resize (previewSizeOptions).toDataURL ()
            }
        }
    }
}
//
const ColorFormula = require ('./lib/color-formula.js');
//
function isRGBArray (rgb)
{
    return Array.isArray (rgb) && (rgb.length === 3) && rgb.every (component => (typeof component === 'number') && (!isNaN (component)));
}
//
function isRGBHexString (rgb)
{
    return (typeof rgb === 'string') && /^#[0-9A-Fa-f]{6}$/.test (rgb);
}
//
function isCurve (curve)
{
    return Array.isArray (curve) && (curve.length === 256) && curve.every (component => (typeof component === 'number') && (!isNaN (component)));
}
//
function normalize (component)
{
    return Math.min (Math.max (0, Math.round (component)), 255);
}
//
function calculateColorRamp (formula, steps, reverse)
{
    let colorRamp = [ ];
    let colorFormula = new ColorFormula (formula);
    if (steps)
    {
        let count = steps.count;
        let alignment = steps.alignment;
        if (reverse)
        {
            if (alignment === 'start')
            {
                alignment = 'end';
            }
            else if (alignment === 'end')
            {
                alignment = 'start';
            }
        }
        for (let index = 0; index < count; index++)
        {
            let sampleIndex = getSampleIndex (index, count, alignment);
            let x = reverse ? 255 - sampleIndex : sampleIndex;
            let rgbColor = colorUtils.colorToRgb (colorFormula.evaluate (x, x / 255));
            if (isRGBArray (rgbColor))
            {
                colorRamp.push (rgbColor.map (component => normalize (component)));
            }
            else
            {
                throw new Error ("Not a valid color ramp element.");
            }
        }
    }
    else
    {
        for (let index = 0; index < 256; index++)
        {
            let x = reverse ? 255 - index : index;
            let rgbColor = colorUtils.colorToRgb (colorFormula.evaluate (x, x / 255));
            if (isRGBArray (rgbColor))
            {
                colorRamp.push (rgbColor.map (component => normalize (component)));
            }
            else
            {
                throw new Error ("Not a valid color ramp element.");
            }
        }
    }
    return colorRamp;
}
//
const serializer = new XMLSerializer ();
//
function escapedContent (string)
{
    let span = document.createElement ('span');
    span.textContent = string;
    let escaped = span.innerHTML;
    span.remove ();
    return escaped;
}
//
function escapedAttribute (string)
{
    let span = document.createElement ('span');
    span.setAttribute ('dummy', string);
    let escaped = span.outerHTML.match (/"(.*)"/u)[1];
    span.remove ();
    return escaped;
}
//
let examples = [ ];
//
let examplesDirname = path.join (__dirname, 'examples');
let examplesFilenames = fs.readdirSync (examplesDirname);
examplesFilenames.sort ((a, b) => a.replace (/\.json$/i, "").localeCompare (b.replace (/\.json$/i, "")));
for (let examplesFilename of examplesFilenames)
{
    let filename = path.join (examplesDirname, examplesFilename);
    if (fs.statSync (filename).isDirectory ())
    {
        let dirname = filename;
        let itemsFilenames = fs.readdirSync (dirname);
        itemsFilenames.sort ((a, b) => a.replace (/\.json$/i, "").localeCompare (b.replace (/\.json$/i, "")));
        let items = [ ];
        for (let itemsFilename of itemsFilenames)
        {
            let filename = path.join (dirname, itemsFilename);
            if (fs.statSync (filename).isFile ())
            {
                let jsonFilename = itemsFilename.match (/(.*)\.json$/i);
                if (jsonFilename && (jsonFilename[1][0] !== '~'))
                {
                    items.push ({ label: jsonFilename[1], string: fs.readFileSync (filename, 'utf8').replace (/^\uFEFF/, "") });
                }
            }
        }
        examples.push ({ label: examplesFilename, items: items });
    }
    else if (fs.statSync (filename).isFile ())
    {
        let jsonFilename = examplesFilename.match (/(.*)\.json$/i);
        if (jsonFilename && (jsonFilename[1][0] !== '~'))
        {
            examples.push ({ label: jsonFilename[1], string: fs.readFileSync (filename, 'utf8').replace (/^\uFEFF/, "") });
        }
    }
}
//
let galleryPath = path.join (app.getPath ('userData'), 'examples-gallery');
let galleryIndexPath = path.join (galleryPath, 'index.html');
//
let isExamplesGalleryGenerated = false;
//
function openExamplesGallery ()
{
    if (!isExamplesGalleryGenerated)
    {
        let galleryNavigation = [ ];
        let galleryContents = [ ];
        //
        let imagesDirname = 'images';
        //
        let categoryIndex = 0;
        galleryNavigation.push ('<ul>');
        for (let example of examples)
        {
            let exampleIndex = 0;
            galleryNavigation.push (`<li><a href="#${encodeURIComponent (example.label)}">${escapedContent (example.label)}</a>`);
            galleryNavigation.push ('<ul>');
            galleryContents.push (`<h2 id="${encodeURIComponent (example.label)}">${escapedContent (example.label)}</h2>`);
            for (let item of example.items)
            {
                let data = JSON.parse (item.string).colorRamp;
                galleryNavigation.push (`<li><a href="#${encodeURIComponent (item.label)}">${escapedContent (item.label)}</a></li>`);
                galleryContents.push (`<h3 id="${encodeURIComponent (item.label)}">${escapedContent (data.name)}</h3>`);
                let curvesMapFileName = `${categoryIndex}-${exampleIndex}-curves-map.svg`;
                galleryContents.push (`<p><img src="${path.join (imagesDirname, curvesMapFileName)}" width="260" height="260" alt="${escapedAttribute (data.name)} - Curves Map Preview"></p>`);
                let LinearGradientFileName = `${categoryIndex}-${exampleIndex}-linear-gradient.svg`;
                galleryContents.push (`<p><img src="${path.join (imagesDirname, LinearGradientFileName)}" width="260" height="52" alt="${escapedAttribute (data.name)} - Linear Gradient Preview"></p>`);
                galleryContents.push (`<pre class="formula">\n${escapedContent (data.formula)}\n</pre>`);
                if (data.steps)
                {
                    galleryContents.push (`<div class="info"><ul><li>Steps count: ${data.steps.count}</li><li>Steps alignment: ${data.steps.alignment}</li></ul></div>`);
                }
                if (data.reverse) galleryContents.push (`<div class="info"><ul><li>Reverse: ${Boolean (data.reverse)}</li></ul></div>`);
                exampleIndex++;
            }
            galleryNavigation.push ('</ul>');
            galleryNavigation.push (`</li>`);
            categoryIndex++;
        }
        galleryNavigation.push ('</ul>');
        //
        let galleryTemplatePath = path.join (__dirname, 'doc-template');
        //
        fs.rmdirSync (galleryPath, { recursive: true });
        fs.mkdirSync (path.join (galleryPath, imagesDirname), { recursive: true });
        let files = fs.readdirSync (galleryTemplatePath);
        for (let file of files)
        {
            fs.copyFileSync (path.join (galleryTemplatePath, file), path.join (galleryPath, file));
        }
        let galleryPage = fs.readFileSync (galleryIndexPath, 'utf8');
        galleryPage = galleryPage.replace ("{{title}}", "Gallery of Examples"),
        galleryPage = galleryPage.replace ("{{navigation-title}}", "Gallery of Examples"),
        galleryPage = galleryPage.replace ("{{navigation}}", galleryNavigation.join ("\n"));
        galleryPage = galleryPage.replace ("{{contents}}", galleryContents.join ("\n"));
        fs.writeFileSync (galleryIndexPath, galleryPage);
        //
        categoryIndex = 0;
        for (let example of examples)
        {
            let exampleIndex = 0;
            for (let item of example.items)
            {
                let colorRamp256;
                let data = JSON.parse (item.string).colorRamp;
                let colorRamp = calculateColorRamp (data.formula, data.steps, data.reverse);
                if (colorRamp.length < 256)
                {
                    colorRamp256 = [ ];
                    for (let index = 0; index < 256; index++)
                    {
                        colorRamp256.push (colorRamp[Math.floor ((index + 0.5) * colorRamp.length / 256)]);
                    }
                }
                else
                {
                    colorRamp256 = colorRamp;
                }
                let curvesMapFileName = `${categoryIndex}-${exampleIndex}-curves-map.svg`;
                let curvesMapPath = path.join (galleryPath, imagesDirname, curvesMapFileName);
                let LinearGradientFileName = `${categoryIndex}-${exampleIndex}-linear-gradient.svg`;
                let linearGradientPath = path.join (galleryPath, imagesDirname, LinearGradientFileName);
                fs.writeFileSync (curvesMapPath, serializer.serializeToString (createCurvesMap (colorRamp256, 8)));
                fs.writeFileSync (linearGradientPath, serializer.serializeToString (createLinearGradient (colorRamp256, true)));
                exampleIndex++;
            }
            categoryIndex++;
        }
        //
        isExamplesGalleryGenerated = true;
    }
    shell.openPath (galleryIndexPath);
}
//
ipcRenderer.on ('open-examples-gallery', () => openExamplesGallery ());
//
const colorNames = require ('./lib/color-names.json');
//
let colorNamesPath = path.join (app.getPath ('userData'), 'color-names');
let colorNamesIndexPath = path.join (colorNamesPath, 'index.html');
//
let isColorNamesGenerated = false;
//
function openColorNames ()
{
    if (!isColorNamesGenerated)
    {
        let colorNamesNavigation = [ ];
        let colorNamesContents = [ ];
        //
        colorNamesNavigation.push ('<ul>');
        for (let set of colorNames)
        {
            let setName = set.name.toLowerCase ();
            colorNamesNavigation.push (`<li><a href="#${encodeURIComponent (set.name)}" title="${set.description}">${set.name}</a>`);
            colorNamesContents.push (`<h2 id="${encodeURIComponent (set.name)}">${set.name}</h2>`);
            colorNamesContents.push ("<table>");
            for (let color of set.colors)
            {
                let colorName = (color.name.en || color.name).toLowerCase ().replace (/ /g, "_");
                if (setName.startsWith ("x11"))
                {
                    colorName = `x11/${colorName}`;
                }
                else if (setName.startsWith ("xkcd"))
                {
                    colorName = `xkcd/${colorName}`;
                }
                else if (setName.startsWith ("mac"))
                {
                    colorName = `mac/${colorName}`;
                }
                colorNamesContents.push ("<tr>");
                colorNamesContents.push (`<td><span class="code">${JSON.stringify (colorName)}</span></td>`);
                colorNamesContents.push (`<td><span class="code">${JSON.stringify (color.hex)}</span></td>`);
                colorNamesContents.push (`<td><span class="code">[ ${colorUtils.hexToRgb (color.hex).join (", ")} ]</span></td>`);
                colorNamesContents.push (`<td class="wide-cell"><div class="swatch" style="background-color: ${color.hex};"></div></td>`);
                colorNamesContents.push ("</tr>");
            }
            colorNamesContents.push ("</table>");
            colorNamesNavigation.push (`</li>`);
        }
        colorNamesNavigation.push ('</ul>');
        //
        let colorNamesTemplatePath = path.join (__dirname, 'doc-template');
        //
        fs.rmdirSync (colorNamesPath, { recursive: true });
        fs.mkdirSync (colorNamesPath, { recursive: true });
        let files = fs.readdirSync (colorNamesTemplatePath);
        for (let file of files)
        {
            fs.copyFileSync (path.join (colorNamesTemplatePath, file), path.join (colorNamesPath, file));
        }
        let colorNamesPage = fs.readFileSync (colorNamesIndexPath, 'utf8');
        colorNamesPage = colorNamesPage.replace ("{{title}}", "Lists of Color Names"),
        colorNamesPage = colorNamesPage.replace ("{{navigation-title}}", "Lists of Color Names"),
        colorNamesPage = colorNamesPage.replace ("{{navigation}}", colorNamesNavigation.join ("\n"));
        colorNamesPage = colorNamesPage.replace ("{{contents}}", colorNamesContents.join ("\n"));
        fs.writeFileSync (colorNamesIndexPath, colorNamesPage);
        //
        isColorNamesGenerated = true;
    }
    shell.openPath (colorNamesIndexPath);
}
//
ipcRenderer.on ('open-color-names', () => openColorNames ());
//
const defaultPrefs =
{
    zoomLevel: 0,
    formulaName: "Linear Grayscale",
    formulaString: "[ x, x, x ]",
    stepsCheckbox: false,
    countSelect: 8,
    alignmentSelect: "fill",
    reverseCheckbox: false,
    gridUnitCount: 8,
    continuousGradient: false,
    specificSelect: "",
    verticalColorTable: false,
    defaultFormulaFolderPath: appDefaultFolderPath,
    defaultPreviewFolderPath: appDefaultFolderPath,
    defaultColorRampFolderPath: appDefaultFolderPath
};
let prefs = rendererStorage.get (defaultPrefs);
//
webFrame.setZoomLevel (prefs.zoomLevel);
//
ipcRenderer.on ('reset-zoom', () => webFrame.setZoomLevel (0));
ipcRenderer.on ('zoom-in', () => webFrame.setZoomLevel (Math.min (webFrame.getZoomLevel () + 0.5, settings.maxZoomLevel)));
ipcRenderer.on ('zoom-out', () => webFrame.setZoomLevel (Math.max (webFrame.getZoomLevel () - 0.5, settings.minZoomLevel)));
//
// Visual zoom is disabled by default in Electron
if (settings.smartZoom)
{
    webFrame.setVisualZoomLevelLimits (1, 3);  // Enable smart zoom (double-tap and pinch)
}
//
function generateTitle ()
{
    let title = settings.window.titleTemplate.replace ("{{app}}", appName);
    let zoomFactor = Math.round (webFrame.getZoomFactor () * 100);
    return title + ((zoomFactor !== 100) ? settings.window.zoomSuffixTemplate.replace ("{{zoom}}", zoomFactor) : "");
}
//
const section = document.body.querySelector ('.section');
const clearButton = document.body.querySelector ('.clear-button');
const examplesButton = document.body.querySelector ('.examples-button');
const loadButton = document.body.querySelector ('.load-button');
const saveButton = document.body.querySelector ('.save-button');
const formulaName = document.body.querySelector ('.formula-name');
const formulaString = document.body.querySelector ('.formula-string');
const stepsCheckbox = document.body.querySelector ('.steps');
const countSelect = document.body.querySelector ('.count-select');
const alignmentSelect = document.body.querySelector ('.alignment-select');
const reverseCheckbox = document.body.querySelector ('.reverse');
const importMenuButton = document.body.querySelector ('.import-menu-button');
const calculateButton = document.body.querySelector ('.calculate-button');
const exportMenuButton = document.body.querySelector ('.export-menu-button');
const colorRampList = document.body.querySelector ('.color-ramp-list');
const curvesMapPreview = document.body.querySelector ('.curves-map-preview');
const linearGradientPreview = document.body.querySelector ('.linear-gradient-preview');
const specificPreview = document.body.querySelector ('.specific-preview');
const specificSelect = document.body.querySelector ('.specific-select');
//
let currentErrorString = null;
let currentColorRamp = null;
let currentColorRamp256 = null;
//
ipcRenderer.send ('enable-output-menus', false);
//
let appComment = ` Generated by ${appName} v${appVersion} `;
//
function setFormulaFields (name, formula, steps, reverse)
{
    formulaName.value = name;
    formulaString.value = formula;
    formulaString.scrollTop = 0;
    formulaString.scrollLeft = 0;
    stepsCheckbox.checked = steps;
    if (steps)
    {
        countSelect.value = steps.count.toString ();
        alignmentSelect.value = steps.alignment;
    }
    countSelect.disabled = !stepsCheckbox.checked;
    alignmentSelect.disabled = !stepsCheckbox.checked;
    reverseCheckbox.checked = reverse;
}
//
clearButton.addEventListener
(
    'click',
    (event) =>
    {
        setFormulaFields ("", "");
        calculateButton.click ();
    }
);
//
let examplesMenu = exampleMenus.makeMenu
(
    examples,
    (example) =>
    {
        let colorRamp = JSON.parse (example.string).colorRamp;
        setFormulaFields (colorRamp.name, colorRamp.formula, colorRamp.steps, colorRamp.reverse);
        calculateButton.click ();
    }
);
//
examplesButton.addEventListener
(
    'click',
    (event) =>
    {
        pullDownMenus.popup (event.currentTarget, examplesMenu);
    }
);
//
let defaultFormulaFolderPath = prefs.defaultFormulaFolderPath;
//
loadButton.addEventListener
(
    'click',
    (event) =>
    {
        fileDialogs.loadTextFile
        (
            "Load formula data file:",
            [ { name: "Formula data file (*.json)", extensions: [ 'json' ] } ],
            defaultFormulaFolderPath,
            'utf8',
            (text, filePath) =>
            {
                try
                {
                    let colorRamp = JSON.parse (text.replace (/^\uFEFF/, "")).colorRamp;
                    setFormulaFields (colorRamp.name, colorRamp.formula, colorRamp.steps, colorRamp.reverse);
                    calculateButton.click ();
                }
                catch (e)
                {
                    alert (`Invalid formula data file format:\n${path.basename (filePath)}`);
                }
                defaultFormulaFolderPath = path.dirname (filePath);
            }
        );
    }
);
//
saveButton.addEventListener
(
    'click',
    (event) =>
    {
        fileDialogs.saveTextFile
        (
            "Save formula data file:",
            [ { name: "Formula data file (*.json)", extensions: [ 'json' ] } ],
            formulaName.value ? path.join (defaultFormulaFolderPath, `${formulaName.value}.json`) : defaultFormulaFolderPath,
            'utf8',
            (filePath) =>
            {
                defaultFormulaFolderPath = path.dirname (filePath);
                let colorRamp =
                {
                    "name": formulaName.value,
                    "formula": formulaString.value
                };
                if (stepsCheckbox.checked)
                {
                    colorRamp["steps"] = { "count": parseInt (countSelect.value), "alignment" : alignmentSelect.value };
                }
                if (reverseCheckbox.checked)
                {
                    colorRamp["reverse"] = true;
                }
                return json.stringify ({ "colorRamp" : colorRamp }, null, 4);
            }
        );
    }
);
//
ipcRenderer.on ('load-formula', () => { loadButton.click (); });
ipcRenderer.on ('save-formula', () => { saveButton.click (); });
//
formulaName.value = prefs.formulaName;
formulaString.value = prefs.formulaString;
//
formulaString.addEventListener
(
    'keydown',
    (event) =>
    {
        if ((event.key === 'Enter') && ((process.platform === 'darwin') ? event.metaKey : event.ctrlKey))
        {
            event.preventDefault ();
            calculateButton.click ();
        }
    }
);
//
function tabSeparate (colorRamp)
{
    const useHeader = true;
    let lines = [ ];
    if (useHeader)
    {
        lines.push ([ "Red", "Green", "Blue" ].join ("\t"));
    }
    for (let color of colorRamp)
    {
        lines.push (color.join ("\t"));
    }
    return lines.join ("\n");
}
//
function smartStringify (colorRamp, level = 0)
{
    let indentation = "    ";
    let colorStrings = [ ];
    for (let color of colorRamp)
    {
        colorStrings.push (`${indentation.repeat (level + 1)}${json.stringify (color)}`);
    }
    return `${indentation.repeat (level)}[\n${colorStrings.join (",\n")}\n${indentation.repeat (level)}]`;
}
//
stepsCheckbox.checked = prefs.stepsCheckbox;
stepsCheckbox.addEventListener
(
    'input',
    event =>
    {
        countSelect.disabled = !event.currentTarget.checked;
        alignmentSelect.disabled = !event.currentTarget.checked;
        calculateButton.click ();
    }
);
//
for (let count = 1; count < 256; count++)
{
    let option = document.createElement ('option');
    option.textContent = count.toString ();
    countSelect.appendChild (option);
}
countSelect.value = prefs.countSelect.toString ();
if (countSelect.selectedIndex < 0) // -1: no element is selected
{
    countSelect.selectedIndex = 0;
}
countSelect.disabled = !stepsCheckbox.checked;
countSelect.addEventListener
(
    'input',
    event =>
    {
        if (currentColorRamp)
        {
            calculateButton.click ();
        }
    }
);
//
alignmentSelect.value = prefs.alignmentSelect;
if (alignmentSelect.selectedIndex < 0) // -1: no element is selected
{
    alignmentSelect.selectedIndex = 0;
}
alignmentSelect.disabled = !stepsCheckbox.checked;
alignmentSelect.addEventListener
(
    'input',
    event =>
    {
        if (currentColorRamp)
        {
            calculateButton.click ();
        }
    }
);
//
reverseCheckbox.checked = prefs.reverseCheckbox;
reverseCheckbox.addEventListener ('input', event => { calculateButton.click (); });
//
function getSampleIndex (index, count, alignment)
{
    if (!alignment)
    {
        alignment = "fill";
    }
    switch (alignment.toLowerCase ())
    {
        case "fill":
            index = index * 255 / (count - 1) || index;
            break;
        case "start":
            index = (index + 0) * 255 / count;
            break;
        case "center":
            index = (index + 0.5) * 255 / count;
            break;
        case "end":
            index = (index + 1) * 255 / count;
            break;
        default:
            throw new Error ("getSampleIndex: invalid alignment: " + alignment);
            break;
    }
    return index;
}
//
calculateButton.addEventListener
(
    'click',
    (event) =>
    {
        currentErrorString = null;
        currentColorRamp = null;
        currentColorRamp256 = null;
        ipcRenderer.send ('enable-output-menus', false);
        exportMenuButton.disabled = true;
        specificSelect.disabled = true;
        let formula = formulaString.value.trim ();
        if (formula)
        {
            let steps;
            if (stepsCheckbox.checked)
            {
                steps = { count: parseInt (countSelect.value), alignment: alignmentSelect.value };
            }
            let reverse = reverseCheckbox.checked;
            try
            {
                currentColorRamp = calculateColorRamp (formula, steps, reverse);
                if (currentColorRamp.length < 256)
                {
                    currentColorRamp256 = [ ];
                    for (let index = 0; index < 256; index++)
                    {
                        currentColorRamp256.push (currentColorRamp[Math.floor ((index + 0.5) * currentColorRamp.length / 256)]);
                    }
                }
                else
                {
                    currentColorRamp256 = currentColorRamp;
                }
                ipcRenderer.send ('enable-output-menus', true);
                exportMenuButton.disabled = false;
                specificSelect.disabled = false;
                updatePreviews ();
            }
            catch (e)
            {
                currentErrorString = e;
                updatePreviews ();
            }
        }
        else
        {
            updatePreviews ();
        }
    }
);
//
let importMenu =
remote.Menu.buildFromTemplate
(
    [
        { label: "Color Ramp (.json)...", click: () => { webContents.send ('import-color-ramp', 'json'); } },
        { label: "Color Ramp (.tsv)...", click: () => { webContents.send ('import-color-ramp', 'tsv'); } },
        { type: 'separator' },
        { label: "Color Table (.act)...", click: () => { webContents.send ('import-color-table'); } },
        { label: "Curves Map (.amp)...", click: () => { webContents.send ('import-curves-map'); } },
        { label: "Lookup Table (.lut)...", click: () => { webContents.send ('import-lookup-table'); } }
    ]
);
//
importMenuButton.addEventListener
(
    'click',
    (event) =>
    {
        pullDownMenus.popup (event.currentTarget, importMenu);
    }
);
//
let exportMenu =
remote.Menu.buildFromTemplate
(
    [
        { label: "Color Ramp (.json)...", click: () => { webContents.send ('export-color-ramp', 'json'); } },
        { label: "Color Ramp (.tsv)...", click: () => { webContents.send ('export-color-ramp', 'tsv'); } },
        { type: 'separator' },
        { label: "Color Table (.act)...", click: () => { webContents.send ('export-color-table'); } },
        { label: "Curves Map (.amp)...", click: () => { webContents.send ('export-curves-map'); } },
        { label: "Lookup Table (.lut)...", click: () => { webContents.send ('export-lookup-table'); } },
        { type: 'separator' },
        { label: "Gradient (.grd)...", click: () => { webContents.send ('export-gradient'); } }
    ]
);
//
exportMenuButton.addEventListener
(
    'click',
    (event) =>
    {
        pullDownMenus.popup (event.currentTarget, exportMenu);
    }
);
//
let defaultColorRampFolderPath = prefs.defaultColorRampFolderPath;
//
const headerClutSize = 32;      // NIH Image (ImageJ) header
const rawClutFileSize = 768;    // (256 * 3) or (3 * 256)
const rawElementSize = rawClutFileSize / 3;
const footerClutSize = 4;       // Photoshop Save for Web CLUT footer (undocumented)
//
function transpose (array)
{
    return array[0].map ((_, column) => array.map (row => row[column]));
}
//
function convertColorRampToFormula (name, colorRamp)
{
    setFormulaFields (name, `discrete_colors\n(\n${smartStringify (colorRamp, 1)},\n    [ 0, 255 ], x\n)`);
}
//
function importColorRamp (fileType)
{
    fileDialogs.loadAnyFile
    (
        `Import color ramp data file (.${fileType}):`,
        [
            { name: `Color ramp data file (*.${fileType})`, extensions: [ fileType ] }
        ],
        defaultColorRampFolderPath,
        {
            '.json': 'utf8',
            '.tsv': 'utf8'
        },
        (data, filePath) =>
        {
            let basename = path.basename (filePath);
            let name = path.parse (filePath).name;
            if (fileType === 'json')
            {
                try
                {
                    let colorRamp = JSON.parse (data.replace (/^\uFEFF/, ""));
                    if (Array.isArray (colorRamp) && (colorRamp.length > 0) && colorRamp.every (color => isRGBHexString (color)))
                    {
                        convertColorRampToFormula (name, colorRamp.map (color => colorUtils.hexToRgb (color)));
                        calculateButton.click ();
                    }
                    else if (Array.isArray (colorRamp) && (colorRamp.length > 0) && colorRamp.every (color => isRGBArray (color)))
                    {
                        convertColorRampToFormula (name, colorRamp);
                        calculateButton.click ();
                    }
                    else if (Array.isArray (colorRamp) && (colorRamp.length === 3) && colorRamp.every (curve => isCurve (curve)))
                    {
                        convertColorRampToFormula (name, transpose (colorRamp));
                        calculateButton.click ();
                    }
                    else
                    {
                        alert (`Invalid color ramp data file format:\n${basename}`);
                    }
                }
                catch (e)
                {
                    alert (`Invalid color ramp data file format:\n${basename}`);
                }
            }
            else if (fileType === 'tsv')
            {
                let colorRamp = [ ];
                let lines = data.replace (/^\uFEFF/, "").split (/\r?\n/);
                for (let line of lines)
                {
                    let color = line.split ("\t").map (component => parseFloat (component));
                    if (isRGBArray (color))
                    {
                        colorRamp.push (color);
                    }
                }
                if (colorRamp.length > 0)
                {
                    convertColorRampToFormula (name, colorRamp);
                    calculateButton.click ();
                }
                else
                {
                    alert (`Invalid color ramp data file format:\n${basename}`);
                }
            }
            defaultColorRampFolderPath = path.dirname (filePath);
        }
    );
}
//
function importColorTable ()
{
    fileDialogs.loadAnyFile
    (
        "Import color table data file (.act):",
        [
            { name: "Color table data file (*.act)", extensions: [ 'act' ] }
        ],
        defaultColorRampFolderPath,
        {
            '.act': 'binary'
        },
        (data, filePath) =>
        {
            let colorRamp = [ ];
            if ((data.length === rawClutFileSize)　||　(data.length === (rawClutFileSize + footerClutSize)))
            {
                // Interleaved
                for (var index = 0; index < rawElementSize; index++)
                {
                    var rgb = data.substr (3 * index, 3);
                    colorRamp.push ([ rgb.charCodeAt (0), rgb.charCodeAt (1), rgb.charCodeAt (2) ]);
                }
                convertColorRampToFormula (path.parse (filePath).name, colorRamp);
                calculateButton.click ();
            }
            else
            {
                alert (`Unrecognized color table data file format:\n${path.basename (filePath)}`);
            }
            defaultColorRampFolderPath = path.dirname (filePath);
        }
    );
}
//
function importCurvesMap ()
{
    fileDialogs.loadAnyFile
    (
        "Import curves map data file (.amp):",
        [
            { name: "Curves map data file (*.amp)", extensions: [ 'amp' ] }
        ],
        defaultColorRampFolderPath,
        {
            '.amp': 'binary'
        },
        (data, filePath) =>
        {
            let colorRamp = [ ];
            if (data.length === rawClutFileSize)
            {
                // Not interleaved
                let curvesMap = [ ];
                for (let index = 0; index < 3; index++)
                {
                    curvesMap.push (data.substr (rawElementSize * index, rawElementSize));
                }
                for (var index = 0; index < rawElementSize; index++)
                {
                    colorRamp.push ([ curvesMap[0].charCodeAt (index), curvesMap[1].charCodeAt (index), curvesMap[2].charCodeAt (index) ]);
                }
                convertColorRampToFormula (path.parse (filePath).name, colorRamp);
                calculateButton.click ();
            }
            else
            {
                alert (`Unrecognized curves map data file format:\n${path.basename (filePath)}`);
            }
            defaultColorRampFolderPath = path.dirname (filePath);
        }
    );
}
//
function importLookupTable ()
{
    fileDialogs.loadAnyFile
    (
        "Import lookup table data file (.lut):",
        [
            { name: "Lookup table data file (*.lut)", extensions: [ 'lut' ] }
        ],
        defaultColorRampFolderPath,
        {
            '.lut': 'binary'
        },
        (data, filePath) =>
        {
            let colorRamp = [ ];
            if
            (
                (data.length === rawClutFileSize)
                ||
                ((data.length === (headerClutSize + rawClutFileSize)) && (data.substr (0, 4) === 'ICOL'))
            )
            {
                // Not interleaved
                let offset = (data.length === (headerClutSize + rawClutFileSize)) ? headerClutSize : 0;
                let curvesMap = [ ];
                for (let index = 0; index < 3; index++)
                {
                    curvesMap.push (data.substr (offset + (rawElementSize * index), rawElementSize));
                }
                for (var index = 0; index < rawElementSize; index++)
                {
                    colorRamp.push ([ curvesMap[0].charCodeAt (index), curvesMap[1].charCodeAt (index), curvesMap[2].charCodeAt (index) ]);
                }
                convertColorRampToFormula (path.parse (filePath).name, colorRamp);
                calculateButton.click ();
            }
            else
            {
                alert (`Unrecognized lookup table data file format:\n${path.basename (filePath)}`);
            }
            defaultColorRampFolderPath = path.dirname (filePath);
        }
    );
}
//
ipcRenderer.on ('import-color-ramp', (event, args) => { importColorRamp (args); });
ipcRenderer.on ('import-color-table', () => { importColorTable (); });
ipcRenderer.on ('import-curves-map', () => { importCurvesMap (); });
ipcRenderer.on ('import-lookup-table', () => { importLookupTable (); });
//
function colorRampToData (colorRamp, interleaved)
{
    let data = [ ];
    if (interleaved)
    {
        for (let color of colorRamp)
        {
            data.push (String.fromCharCode (color[0]));
            data.push (String.fromCharCode (color[1]));
            data.push (String.fromCharCode (color[2]));
        }
    }
    else
    {
        let reds = [ ];
        let greens = [ ];
        let blues = [ ];
        for (let color of colorRamp)
        {
            reds.push (String.fromCharCode (color[0]));
            greens.push (String.fromCharCode (color[1]));
            blues.push (String.fromCharCode (color[2]));
        }
        data = [ ...reds, ...greens, ...blues ];
    }
    return data.join ("");
}
//
function exportColorRamp (fileType)
{
    if (currentColorRamp)
    {
        fileDialogs.saveTextFile
        (
            `Export color ramp data file (.${fileType}):`,
            [ { name: `Color ramp data file (*.${fileType})`, extensions: [ fileType ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.${fileType}`) : defaultColorRampFolderPath,
            'utf8',
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return fileType === 'tsv' ? tabSeparate (currentColorRamp) : smartStringify (currentColorRamp);
            }
        );
    }
}
//
function exportColorTable ()
{
    if (currentColorRamp256)
    {
        fileDialogs.saveBinaryFile
        (
            "Export color table data file (.act):",
            [ { name: "Color table data file (*.act)", extensions: [ 'act' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.act`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToData (currentColorRamp256, true);
            }
        );
    }
}
//
function exportCurvesMap ()
{
    if (currentColorRamp256)
    {
        fileDialogs.saveBinaryFile
        (
            "Export curves map data file (.amp):",
            [ { name: "Curves map data file (*.amp)", extensions: [ 'amp' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.amp`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToData (currentColorRamp256, false);
            }
        );
    }
}
//
function exportLookupTable ()
{
    if (currentColorRamp256)
    {
        fileDialogs.saveBinaryFile
        (
            "Export lookup table data file (.lut):",
            [ { name: "Lookup table data file (*.lut)", extensions: [ 'lut' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.lut`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToData (currentColorRamp256, false);
            }
        );
    }
}
//
function toUnicodeString (string)
{
    let buffer = Buffer.allocUnsafe (Uint32Array.BYTES_PER_ELEMENT);
    let offset = 0;
    offset = buffer.writeUInt32BE (string.length + 1, offset);
    return buffer.toString ('binary') + Buffer.from (string + '\0', 'utf16le').swap16 ().toString ('binary');
}
//
function toID (id, isStringID)
{
    let buffer = Buffer.allocUnsafe (Uint32Array.BYTES_PER_ELEMENT + id.length);
    let offset = 0;
    offset = buffer.writeUInt32BE (isStringID ? id.length : 0, offset);
    offset = buffer.write (id, offset);
    return buffer.toString ('binary');
}
//
function toUInt16BEString (number)
{
    let buffer = Buffer.allocUnsafe (Uint16Array.BYTES_PER_ELEMENT);
    buffer.writeUInt16BE (number);
    return buffer.toString ('binary');
}
//
function toInt16BEString (number)
{
    let buffer = Buffer.allocUnsafe (Int16Array.BYTES_PER_ELEMENT);
    buffer.writeInt16BE (number);
    return buffer.toString ('binary');
}
//
function toUInt32BEString (number)
{
    let buffer = Buffer.allocUnsafe (Uint32Array.BYTES_PER_ELEMENT);
    buffer.writeUInt32BE (number);
    return buffer.toString ('binary');
}
//
function toInt32BEString (number)
{
    let buffer = Buffer.allocUnsafe (Int32Array.BYTES_PER_ELEMENT);
    buffer.writeInt32BE (number);
    return buffer.toString ('binary');
}
//
function toDoubleBEString (number)
{
    let buffer = Buffer.allocUnsafe (Float64Array.BYTES_PER_ELEMENT);
    buffer.writeDoubleBE (number);
    return buffer.toString ('binary');
}
//
function toClass (name, id)
{
    return toUnicodeString (name) + toID (id);
}
//
function toKey (id)
{
    return toID (id);
}
//
function toCount (number)
{
    return toUInt32BEString (number);
}
//
function toString (string)
{
    return 'TEXT' + toUnicodeString (string);
}
//
function toObject (name, id)
{
    return 'Objc' + toUnicodeString (name) + toID (id);
}
//
function toList ()
{
    return 'VlLs';
}
//
function toEnum (type, value)
{
    return 'enum' + toID (type) + toID (value);
}
//
function toInteger (number)
{
    return 'long' + toInt32BEString (number);
}
//
function toDouble (number)
{
    return 'doub' + toDoubleBEString (number);
}
//
function toUnitDouble (unit, number)
{
    return 'UntF' + unit + toDoubleBEString (number);
}
//
function colorRampToGradient (colorRamp)
{
    data = [ ];
    let name = formulaName.value;
    let colorStops = [ ];
    let colorStopsCount = 100;
    let interpolation = 0;  // 0 (0%) to 4096 (100%)
    for (let colorStopIndex = 0; colorStopIndex < colorStopsCount; colorStopIndex++)
    {
        let rgb = colorRamp[Math.round (colorStopIndex * 255 / (colorStopsCount - 1))];
        let colorStop =
        {
            color: { red: rgb[0], green: rgb[1], blue: rgb[2] },
            location: Math.round (colorStopIndex * 4096 / (colorStopsCount - 1)),
            midpoint: 50
        }
        colorStops.push (colorStop);
    }
    let transparencyStops =
    [
        { location: 0, midpoint: 50, opacity: 100 },
        { location: 4096, midpoint: 50, opacity: 100 }
    ];
    // Adobe Photoshop gradients file format
    // https://github.com/tonton-pixel/json-photoshop-scripting/tree/master/Documentation/Photoshop-Gradients-File-Format
    // Adobe Photoshop actions file format
    // https://github.com/tonton-pixel/json-photoshop-scripting/tree/master/Documentation/Photoshop-Actions-File-Format
    data.push ('8BGR');
    data.push (toUInt16BEString (5));
    data.push (toUInt32BEString (16));
    data.push (toClass ("", 'null'));
    data.push (toCount (1));
    data.push (toKey ('GrdL'));
    data.push (toList ());
    data.push (toCount (1));
    data.push (toObject ("Gradient", 'Grdn'));
    data.push (toCount (1));
    data.push (toKey ('Grad'));
    data.push (toObject ("Gradient", 'Grdn'));
    data.push (toCount (5));
    data.push (toKey ('Nm  '));
    data.push (toString (name));
    data.push (toKey ('GrdF'));
    data.push (toEnum ('GrdF', 'CstS'));
    data.push (toKey ('Intr'));
    data.push (toDouble (interpolation));
    data.push (toKey ('Clrs'));
    data.push (toList ());
    data.push (toCount (colorStops.length));
    for (let colorStop of colorStops)
    {
        data.push (toObject ("", 'Clrt'));
        data.push (toCount (4));
        data.push (toKey ('Clr '));
        data.push (toObject ("", 'RGBC'));
        data.push (toCount (3));
        data.push (toKey ('Rd  '));
        data.push (toDouble (colorStop.color.red));
        data.push (toKey ('Grn '));
        data.push (toDouble (colorStop.color.green));
        data.push (toKey ('Bl  '));
        data.push (toDouble (colorStop.color.blue));
        data.push (toKey ('Type'));
        data.push (toEnum ('Clry', 'UsrS'));
        data.push (toKey ('Lctn'));
        data.push (toInteger (colorStop.location));
        data.push (toKey ('Mdpn'));
        data.push (toInteger (colorStop.midpoint));
    }
    data.push (toKey ('Trns'));
    data.push (toList ());
    data.push (toCount (transparencyStops.length));
    for (let transparencyStop of transparencyStops)
    {
        data.push (toObject ("", 'TrnS'));
        data.push (toCount (3));
        data.push (toKey ('Opct'));
        data.push (toUnitDouble ('#Prc', transparencyStop.opacity));
        data.push (toKey ('Lctn'));
        data.push (toInteger (transparencyStop.location));
        data.push (toKey ('Mdpn'));
        data.push (toInteger (transparencyStop.midpoint));
    }
    return data.join ("");
}
//
function exportGradient ()
{
    if (currentColorRamp256)
    {
        fileDialogs.saveBinaryFile
        (
            "Export gradient data file (.grd):",
            [ { name: "Gradient data file (*.grd)", extensions: [ 'grd' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.grd`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToGradient (currentColorRamp256);
            }
        );
    }
}
//
ipcRenderer.on ('export-color-ramp', (event, args) => { exportColorRamp (args); });
ipcRenderer.on ('export-color-table', () => { exportColorTable (); });
ipcRenderer.on ('export-curves-map', () => { exportCurvesMap (); });
ipcRenderer.on ('export-lookup-table', () => { exportLookupTable (); });
ipcRenderer.on ('export-gradient', () => { exportGradient (); });
//
function rgbToHex (rgb)
{
    let red = normalize (rgb[0]);
    let green = normalize (rgb[1]);
    let blue = normalize (rgb[2]);
    let redHex = red.toString (16).toUpperCase ().padStart (2, "0");
    let greenHex = green.toString (16).toUpperCase ().padStart (2, "0");
    let blueHex = blue.toString (16).toUpperCase ().padStart (2, "0");
    return `#${redHex}${greenHex}${blueHex}`;
}
//
function createColorRampList (colorRamp, errorString)
{
    let table = document.createElement ('table');
    if (errorString)
    {
        table.className= 'info';
        let row = document.createElement ('tr');
        row.className = 'row';
        let error = document.createElement ('td');
        error.className = 'error';
        error.textContent = errorString;
        row.appendChild (error);
        table.appendChild (row);
    }
    else if (colorRamp)
    {
        table.className= 'list';
        for (let colorIndex = 0; colorIndex < colorRamp.length; colorIndex++)
        {
            let rgbColor = colorRamp[colorIndex];
            let row = document.createElement ('tr');
            row.className = 'row';
            let index = document.createElement ('th');
            index.className = 'index';
            index.textContent = `[${colorIndex}]`;
            row.appendChild (index);
            let hex = document.createElement ('td');
            hex.className = 'hex';
            hex.textContent = JSON.stringify (rgbToHex (rgbColor));
            row.appendChild (hex);
            let rgb = document.createElement ('td');
            rgb.className = 'rgb';
            rgb.textContent = `[ ${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]} ]`;
            row.appendChild (rgb);
            let color = document.createElement ('td');
            color.className = 'color';
            let swatch = document.createElement ('div');
            swatch.className = 'swatch';
            swatch.textContent = "\xA0";
            swatch.style.backgroundColor = rgbToHex (rgbColor);
            swatch.title = swatch.style.backgroundColor;
            color.appendChild (swatch);
            row.appendChild (color);
            table.appendChild (row);
        }
    }
    return table;
}
//
function updateColorRampList ()
{
    while (colorRampList.firstChild)
    {
        colorRampList.firstChild.remove ();
    }
    colorRampList.scrollTop = 0;
    colorRampList.scrollLeft = 0;
    colorRampList.appendChild (createColorRampList (currentColorRamp, currentErrorString));
}
//
let currentGridUnitCount = prefs.gridUnitCount;
//
let currentContinuousGradient = prefs.continuousGradient;
//
function updateCurvesMapPreview ()
{
    while (curvesMapPreview.firstChild)
    {
        curvesMapPreview.firstChild.remove ();
    }
    curvesMapPreview.appendChild (createCurvesMap (currentColorRamp256, currentGridUnitCount));
}
//
function updateLinearGradientPreview ()
{
    while (linearGradientPreview.firstChild)
    {
        linearGradientPreview.firstChild.remove ();
    }
    linearGradientPreview.appendChild (createLinearGradient (currentColorRamp256, currentContinuousGradient));
}
//
let currentVerticalColorTable = prefs.verticalColorTable;
//
if (Object.keys (testImages).length > 0)
{
    let option;
    option = document.createElement ('option');
    option.textContent = "──────";
    option.disabled = true;
    specificSelect.appendChild (option);
    for (let testImage in testImages)
    {
        option = document.createElement ('option');
        option.textContent = testImage;
        specificSelect.appendChild (option)
    }
}
specificSelect.value = prefs.specificSelect;
if (specificSelect.selectedIndex < 0) // -1: no element is selected
{
    specificSelect.selectedIndex = 0;
}
specificSelect.addEventListener ('input', () => { updateSpecificPreview (); });
//
function updateSpecificPreview ()
{
    if (specificSelect.value)
    {
        if (currentColorRamp256)
        {
            function updateTestImage (dataURL)
            {
                while (specificPreview.firstChild)
                {
                    specificPreview.firstChild.remove ();
                }
                specificPreview.appendChild (createTestImage (dataURL));
            }
            mapColorRamp (currentColorRamp256, testImages[specificSelect.value].previewDataURL, updateTestImage);
        }
        else
        {
            while (specificPreview.firstChild)
            {
                specificPreview.firstChild.remove ();
            }
            specificPreview.appendChild (createTestImage (null));
        }
    }
    else
    {
        while (specificPreview.firstChild)
        {
            specificPreview.firstChild.remove ();
        }
        specificPreview.appendChild (createColorTable (currentColorRamp256, currentVerticalColorTable));
    }
}
//
function updatePreviews ()
{
    updateColorRampList ();
    updateCurvesMapPreview ();
    updateLinearGradientPreview ();
    updateSpecificPreview ();
}
//
updatePreviews ();
//
calculateButton.click ();
//
let defaultPreviewFolderPath = prefs.defaultPreviewFolderPath;
//
function saveSVG (svg, defaultFilename)
{
    fileDialogs.saveTextFile
    (
        "Save SVG file:",
        [ { name: "SVG file (*.svg)", extensions: [ 'svg' ] } ],
        path.join (defaultPreviewFolderPath, `${defaultFilename}.svg`),
        'utf8',
        (filePath) =>
        {
            defaultPreviewFolderPath = path.dirname (filePath);
            return svg;
        }
    );
}
//
function savePNG (png, defaultFilename)
{
    fileDialogs.saveTextFile
    (
        "Save PNG file:",
        [ { name: "PNG file (*.png)", extensions: [ 'png' ] } ],
        path.join (defaultPreviewFolderPath, `${defaultFilename}.png`),
        'base64',
        (filePath) =>
        {
            defaultPreviewFolderPath = path.dirname (filePath);
            return png;
        }
    );
}
//
function saveCurvesMapSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createCurvesMap (currentColorRamp256, currentGridUnitCount, appComment)), "curves-map-preview");
}
//
let setGridUnitCount = (menuItem) => { currentGridUnitCount = menuItem.id; updateCurvesMapPreview ();};
//
let curvesMapMenuTemplate =
[
    { label: "Curves Map - Preview", enabled: false },
    { type: 'separator' },
    {
        label: "Grid Units",
        submenu:
        [
            { label: "4 × 4", id: 4, type: 'radio', click: setGridUnitCount },
            { label: "6 × 6", id: 6, type: 'radio', click: setGridUnitCount },
            { label: "8 × 8", id: 8, type: 'radio', click: setGridUnitCount },
            { label: "10 × 10", id: 10, type: 'radio', click: setGridUnitCount },
            { label: "12 × 12", id: 12, type: 'radio', click: setGridUnitCount }
        ]
    },
    { label: "Save as SVG...", click: saveCurvesMapSVG },
    { type: 'separator' },
    { label: "Enlarged Preview...", click: (menuItem) => openEnlargedWindow ('enlarge-curves-map') }
];
let curvesMapContextualMenu = remote.Menu.buildFromTemplate (curvesMapMenuTemplate);
let currentGridUnitMenuItem = curvesMapContextualMenu.getMenuItemById (currentGridUnitCount);
if (currentGridUnitMenuItem)
{
    currentGridUnitMenuItem.checked = true;
}
//
curvesMapPreview.addEventListener
(
    'contextmenu',
    (event) =>
    {
        if (BrowserWindow.getFocusedWindow () === mainWindow)   // Should not be necessary...
        {
            if (currentColorRamp)
            {
                event.preventDefault ();
                let factor = webFrame.getZoomFactor ();
                curvesMapContextualMenu.popup ({ window: mainWindow, x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
            }
        }
    }
);
//
curvesMapPreview.addEventListener
(
    'dblclick',
    (event) =>
    {
        if (currentColorRamp)
        {
            event.preventDefault ();
            openEnlargedWindow ('enlarge-curves-map');
        }
    }
);
//
function saveLinearGradientSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createLinearGradient (currentColorRamp256, currentContinuousGradient, appComment)), "linear-gradient-preview");
}
//
let setContinuousGradient = (menuItem) => { currentContinuousGradient = menuItem.id; updateLinearGradientPreview ();};
//
let linearGradientMenuTemplate =
[
    { label: "Linear Gradient - Preview", enabled: false },
    { type: 'separator' },
    {
        label: "Gradient",
        submenu:
        [
            { label: "Discrete", id: false, type: 'radio', click: setContinuousGradient },
            { label: "Continuous", id: true, type: 'radio', click: setContinuousGradient }
        ]
    },
    { label: "Save as SVG...", click: saveLinearGradientSVG },
    { type: 'separator' },
    { label: "Enlarged Preview...", click: (menuItem) => openEnlargedWindow ('enlarge-linear-gradient') }
];
let linearGradientContextualMenu = remote.Menu.buildFromTemplate (linearGradientMenuTemplate);
let currentContinuousGradientMenuItem = linearGradientContextualMenu.getMenuItemById (currentContinuousGradient);
if (currentContinuousGradientMenuItem)
{
    currentContinuousGradientMenuItem.checked = true;
}
//
linearGradientPreview.addEventListener
(
    'contextmenu',
    (event) =>
    {
        if (BrowserWindow.getFocusedWindow () === mainWindow)   // Should not be necessary...
        {
            if (currentColorRamp)
            {
                event.preventDefault ();
                let factor = webFrame.getZoomFactor ();
                linearGradientContextualMenu.popup ({ window: mainWindow, x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
            }
        }
    }
);
//
linearGradientPreview.addEventListener
(
    'dblclick',
    (event) =>
    {
        if (currentColorRamp)
        {
            event.preventDefault ();
            openEnlargedWindow ('enlarge-linear-gradient');
        }
    }
);
//
function saveColorTableSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createColorTable (currentColorRamp256, currentVerticalColorTable, appComment)), "color-table-preview");
}
//
let setVerticalColorTable = (menuItem) => { currentVerticalColorTable = menuItem.id; updateSpecificPreview ();};
//
let colorTableMenuTemplate =
[
    { label: "Color Table - Preview", enabled: false },
    { type: 'separator' },
    {
        label: "Layout",
        submenu:
        [
            { label: "Horizontal", id: false, type: 'radio', click: setVerticalColorTable },
            { label: "Vertical", id: true, type: 'radio', click: setVerticalColorTable }
        ]
    },
    { label: "Save as SVG...", click: saveColorTableSVG },
    { type: 'separator' },
    { label: "Enlarged Preview...", click: (menuItem) => openEnlargedWindow ('enlarge-color-table') }
];
let colorTableMenuContextualMenu = remote.Menu.buildFromTemplate (colorTableMenuTemplate);
let currentVerticalColorTableMenuItem = colorTableMenuContextualMenu.getMenuItemById (currentVerticalColorTable);
if (currentVerticalColorTableMenuItem)
{
    currentVerticalColorTableMenuItem.checked = true;
}
//
function saveTestImageSVG (menuItem)
{
    function updateTestImage (dataURL)
    {
        saveSVG (serializer.serializeToString (createTestImage (dataURL, appComment)), "test-image-preview");
    }
    mapColorRamp (currentColorRamp256, testImages[specificSelect.value].dataURL, updateTestImage);
}
//
function exportTestImagePNG (menuItem)
{
    function updateTestImage (dataURL)
    {
        savePNG (dataURL.replace ('data:image/png;base64,', ''), `${specificSelect.value} | ${formulaName.value}`);
    }
    mapColorRamp (currentColorRamp256, testImages[specificSelect.value].dataURL, updateTestImage);
}
//
let testImageMenuTemplate =
[
    { label: "Test Image - Preview", enabled: false },
    { type: 'separator' },
    { label: "Save as SVG...", click: saveTestImageSVG },
    { label: "Export as PNG...", click: exportTestImagePNG },
    { type: 'separator' },
    { label: "Enlarged Preview...", click: (menuItem) => openEnlargedWindow ('enlarge-test-image') }
];
let testImageMenuContextualMenu = remote.Menu.buildFromTemplate (testImageMenuTemplate);
//
specificPreview.addEventListener
(
    'contextmenu',
    (event) =>
    {
        if (BrowserWindow.getFocusedWindow () === mainWindow)   // Should not be necessary...
        {
            if (currentColorRamp)
            {
                event.preventDefault ();
                let factor = webFrame.getZoomFactor ();
                if (specificSelect.value)
                {
                    testImageMenuContextualMenu.popup ({ window: mainWindow, x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
                }
                else
                {
                    colorTableMenuContextualMenu.popup ({ window: mainWindow, x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
                }
            }
        }
    }
);
//
specificPreview.addEventListener
(
    'dblclick',
    (event) =>
    {
        if (currentColorRamp)
        {
            event.preventDefault ();
            openEnlargedWindow (specificSelect.value ? 'enlarge-test-image' : 'enlarge-color-table');
        }
    }
);
//
const enlargedString = "Enlarged Preview";
//
let enlargedWindow = null;
//
function openEnlargedWindow (action)
{
    if (!enlargedWindow)
    {
        enlargedWindow = new BrowserWindow
        (
            {
                title: `${enlargedString} | ${appName}`,
                width: 720,
                height: 720,
                fullscreenable: false,
                resizable: false,
                parent: mainWindow,
                modal: true,
                show: false,
                webPreferences:
                {
                    nodeIntegration: true,
                    enableRemoteModule: true
                }
            }
        );
        if (process.platform !== 'darwin')
        {
            enlargedWindow.removeMenu ();
        }
        let svgs = [ ];
        switch (action)
        {
            case 'enlarge-curves-map':
            case 'enlarge-linear-gradient':
                svgs.push (serializer.serializeToString (createCurvesMap (currentColorRamp256, currentGridUnitCount)));
                svgs.push (serializer.serializeToString (createLinearGradient (currentColorRamp256, currentContinuousGradient)));
                break;
            case 'enlarge-color-table':
                svgs.push (serializer.serializeToString (createColorTable (currentColorRamp256, currentVerticalColorTable)));
                break;
            case 'enlarge-test-image':
                function updateTestImage (dataURL)
                {
                    svgs.push (serializer.serializeToString (createTestImage (dataURL)));
                }
                mapColorRamp (currentColorRamp256, testImages[specificSelect.value].dataURL, updateTestImage);
                break;
        }
        enlargedWindow.loadFile (path.join (__dirname, 'enlarged', 'index.html'))
        .then
        (
            () => enlargedWindow.show ()
        );
        enlargedWindow.webContents.on ('did-finish-load',  () => enlargedWindow.webContents.send ('display-enlarged-svgs', svgs));
        enlargedWindow.on ('close', () => { enlargedWindow = null; });
    }
}
//
window.addEventListener // *Not* document.addEventListener
(
    'beforeunload',
    () =>
    {
        let prefs =
        {
            zoomLevel: webFrame.getZoomLevel (),
            formulaName: formulaName.value,
            formulaString: formulaString.value,
            stepsCheckbox: stepsCheckbox.checked,
            countSelect: parseInt (countSelect.value),
            alignmentSelect: alignmentSelect.value,
            reverseCheckbox: reverseCheckbox.checked,
            gridUnitCount: currentGridUnitCount,
            continuousGradient: currentContinuousGradient,
            specificSelect: specificSelect.value,
            verticalColorTable: currentVerticalColorTable,
            defaultFormulaFolderPath: defaultFormulaFolderPath,
            defaultPreviewFolderPath: defaultPreviewFolderPath,
            defaultColorRampFolderPath: defaultColorRampFolderPath
        };
        rendererStorage.set (prefs);
    }
);
//
// Open all http:// and https:// links in external browser
document.body.addEventListener
(
    'click',
    (event) =>
    {
        let aTag = event.target.closest ('a');
        if (aTag)
        {
            event.preventDefault ();
            let aUrl = aTag.getAttribute ('xlink:href') || aTag.getAttribute ('href');
            if (aUrl && (aUrl.startsWith ("http://") || aUrl.startsWith ("https://")))
            {
                let isCommandOrControlClick = (process.platform === 'darwin') ? event.metaKey : event.ctrlKey;
                shell.openExternal (aUrl, { activate: !isCommandOrControlClick }); // options are macOS only anyway
            }
        }
    }
);
//
webContents.once
(
    'did-finish-load', (event) =>
    {
        document.title = generateTitle ();
        section.classList.add ('is-shown');
        ipcRenderer.send ('show-window');
    }
);
//
const scroll = require ('./lib/scroll.js');
//
ipcRenderer.on ('scroll-to-top', () => { scroll.toTop (document.body); });
ipcRenderer.on ('scroll-to-bottom', () => { scroll.toBottom (document.body); });
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
window.addEventListener
(
    'resize',
    (event) =>
    {
        document.title = generateTitle ();
    }
);
//
if (settings.escapeExitsFullScreen)
{
    window.addEventListener
    (
        'keydown',
        (event) =>
        {
            if ((event.key === 'Escape') && !(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey))
            {
                event.preventDefault ();
                ipcRenderer.send ('exit-full-screen');
            }
        }
    );
}
//
