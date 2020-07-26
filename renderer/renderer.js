//
const { ipcRenderer, remote, shell, webFrame } = require ('electron');
const { app, getCurrentWebContents, getGlobal } = remote;
//
const fs = require ('fs');
const path = require ('path');
//
const appName = app.name;
const appVersion = app.getVersion ();
//
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
const { createCurvesMap, createLinearGradient, createColorTable } = require ('./lib/color-ramp-preview.js');
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
function transpose (array)
{
    return array[0].map ((_, column) => array.map (row => row[column]));
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
                let data = JSON.parse (item.string).colorRamp;
                let colorFormula = new ColorFormula (data.formula);
                let colorRamp = [ ];
                for (let x = 0; x < 256; x++)
                {
                    let rgbColor = colorUtils.colorToRgb (colorFormula.evaluate (x, x / 255));
                    if (isRGBArray (rgbColor))
                    {
                        colorRamp.push (rgbColor.map (component => normalize (component)));
                    }
                }
                let curvesMapFileName = `${categoryIndex}-${exampleIndex}-curves-map.svg`;
                let curvesMapPath = path.join (galleryPath, imagesDirname, curvesMapFileName);
                let LinearGradientFileName = `${categoryIndex}-${exampleIndex}-linear-gradient.svg`;
                let linearGradientPath = path.join (galleryPath, imagesDirname, LinearGradientFileName);
                fs.writeFileSync (curvesMapPath, serializer.serializeToString (createCurvesMap (colorRamp, 8)));
                fs.writeFileSync (linearGradientPath, serializer.serializeToString (createLinearGradient (colorRamp, true)));
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
    useStepsCheckbox: false,
    stepsSelect: 8,
    alignmentSelect: "fill",
    reverseCheckbox: false,
    gridUnitCount: 8,
    continuousGradient: false,
    defaultFormulaFolderPath: appDefaultFolderPath,
    defaultSVGFolderPath: appDefaultFolderPath,
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
const calculateButton = document.body.querySelector ('.calculate-button');
const importExportMenuButton = document.body.querySelector ('.import-export-menu-button');
const useStepsCheckbox = document.body.querySelector ('.use-steps');
const stepsSelect = document.body.querySelector ('.steps-select');
const alignmentSelect = document.body.querySelector ('.alignment-select');
const reverseCheckbox = document.body.querySelector ('.reverse');
const colorRampList = document.body.querySelector ('.color-ramp-list');
const curvesMapPreview = document.body.querySelector ('.curves-map-preview');
const linearGradientPreview = document.body.querySelector ('.linear-gradient-preview');
const colorTablePreview = document.body.querySelector ('.color-table-preview');
//
let currentErrorString = null;
let currentColorRamp = null;
let previewColorRamp = null;
//
let appComment = ` Generated by ${appName} v${appVersion} `;
//
clearButton.addEventListener
(
    'click',
    (event) =>
    {
        formulaName.value = "";
        formulaString.value = "";
        currentErrorString = null;
        currentColorRamp = null;
        previewColorRamp = null;
        ipcRenderer.send ('enable-export-menu', false, false);
        updatePreviews ();
    }
);
//
let examplesMenu = exampleMenus.makeMenu
(
    examples,
    (example) =>
    {
        let colorRamp = JSON.parse (example.string).colorRamp;
        formulaName.value = colorRamp.name;
        formulaString.value = colorRamp.formula;
        formulaString.scrollTop = 0;
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
            "Load formula file:",
            [ { name: "Formula file (*.json)", extensions: [ 'json' ] } ],
            defaultFormulaFolderPath,
            'utf8',
            (text, filePath) =>
            {
                try
                {
                    let colorRamp = JSON.parse (text.replace (/^\uFEFF/, "")).colorRamp;
                    formulaName.value = colorRamp.name;
                    formulaString.value = colorRamp.formula;
                    formulaString.scrollTop = 0;
                    calculateButton.click ();
                }
                catch (e)
                {
                    alert (`Invalid formula file format:\n${path.basename (filePath)}`);
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
            "Save formula file:",
            [ { name: "Formula file (*.json)", extensions: [ 'json' ] } ],
            formulaName.value ? path.join (defaultFormulaFolderPath, `${formulaName.value}.json`) : defaultFormulaFolderPath,
            (filePath) =>
            {
                defaultFormulaFolderPath = path.dirname (filePath);
                let colorRamp = { "colorRamp" : { "name": formulaName.value, "formula": formulaString.value } };
                return json.stringify (colorRamp, null, 4);
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
        previewColorRamp = null;
        ipcRenderer.send ('enable-export-menu', false, false);
        updatePreviews ();
        let formula = formulaString.value.trim ();
        if (formula)
        {
            try
            {
                let colorFormula = new ColorFormula (formula);
                let colorRamp = [ ];
                if (useStepsCheckbox.checked)
                {
                    let steps = stepsSelect.value;
                    for (let index = 0; index < steps; index++)
                    {
                        let alignment = alignmentSelect.value;
                        if (reverseCheckbox.checked)
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
                        let sampleIndex = getSampleIndex (index, steps, alignment);
                        let x = reverseCheckbox.checked ? 255 - sampleIndex : sampleIndex;
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
                    currentColorRamp = colorRamp;
                    previewColorRamp = [ ];
                    for (let index = 0; index < 256; index++)
                    {
                        previewColorRamp.push (colorRamp[Math.floor ((index + 0.5) * colorRamp.length / 256)]);
                    }
                    ipcRenderer.send ('enable-export-menu', true, false);
                }
                else
                {
                    for (let index = 0; index < 256; index++)
                    {
                        let x = reverseCheckbox.checked ? 255 - index : index;
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
                    currentColorRamp = colorRamp;
                    previewColorRamp = colorRamp;
                    ipcRenderer.send ('enable-export-menu', true, true);
                }
                updatePreviews ();
            }
            catch (e)
            {
                currentErrorString = e;
                updatePreviews ();
            }
        }
    }
);
//
let importExportMenu =
remote.Menu.buildFromTemplate
(
    [
        {
            label: "Import",
            id: "import",
            submenu:
            [
                { label: "Color Ramp (.json)...", click: () => { webContents.send ('import-color-ramp', 'json'); } },
                { label: "Color Ramp (.tsv)...", click: () => { webContents.send ('import-color-ramp', 'tsv'); } },
                { type: 'separator' },
                { label: "Color Table (.act)...", click: () => { webContents.send ('import-color-table'); } },
                { label: "Curves Map (.amp)...", click: () => { webContents.send ('import-curves-map'); } },
                { label: "Lookup Table (.lut)...", click: () => { webContents.send ('import-lookup-table'); } }
            ]
        },
        {
            label: "Export",
            id: "export",
            enabled: false,
            submenu:
            [
                { label: "Color Ramp (.json)...", click: () => { webContents.send ('export-color-ramp', 'json'); } },
                { label: "Color Ramp (.tsv)...", click: () => { webContents.send ('export-color-ramp', 'tsv'); } },
                { type: 'separator' },
                { label: "Color Table (.act)...", id: 'export-act', click: () => { webContents.send ('export-color-table'); } },
                { label: "Curves Map (.amp)...", id: 'export-amp', click: () => { webContents.send ('export-curves-map'); } },
                { label: "Lookup Table (.lut)...", id: 'export-lut', click: () => { webContents.send ('export-lookup-table'); } }
            ]
        }
    ]
);
//
importExportMenuButton.addEventListener
(
    'click',
    (event) =>
    {
        importExportMenu.getMenuItemById ('export').enabled = (currentColorRamp !== null);
        importExportMenu.getMenuItemById ('export-act').enabled = (currentColorRamp !== null) && (currentColorRamp.length === 256);
        importExportMenu.getMenuItemById ('export-amp').enabled = (currentColorRamp !== null) && (currentColorRamp.length === 256);
        importExportMenu.getMenuItemById ('export-lut').enabled = (currentColorRamp !== null) && (currentColorRamp.length === 256);
        pullDownMenus.popup (event.currentTarget, importExportMenu);
    }
);
//
useStepsCheckbox.checked = prefs.useStepsCheckbox;
useStepsCheckbox.addEventListener
(
    'input',
    event =>
    {
        stepsSelect.disabled = !event.currentTarget.checked;
        alignmentSelect.disabled = !event.currentTarget.checked;
        if (currentColorRamp)
        {
            calculateButton.click ();
        }
    }
);
//
for (let count = 1; count < 256; count++)
{
    let option = document.createElement ('option');
    option.textContent = count.toString ();
    stepsSelect.appendChild (option);
}
stepsSelect.value = prefs.stepsSelect.toString ();
if (stepsSelect.selectedIndex < 0) // -1: no element is selected
{
    stepsSelect.selectedIndex = 0;
}
stepsSelect.disabled = !useStepsCheckbox.checked;
stepsSelect.addEventListener
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
alignmentSelect.disabled = !useStepsCheckbox.checked;
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
reverseCheckbox.addEventListener
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
let defaultColorRampFolderPath = prefs.defaultColorRampFolderPath;
//
const headerClutSize = 32;      // NIH Image (ImageJ) header
const rawClutFileSize = 768;    // (256 * 3) or (3 * 256)
const rawElementSize = rawClutFileSize / 3;
const footerClutSize = 4;       // Photoshop Save for Web CLUT footer (undocumented)
//
function convertColorRampToFormula (name, colorRamp)
{
    formulaName.value = name;
    formulaString.value = `discrete_colors\n(\n${smartStringify (colorRamp, 1)},\n    [ 0, 255 ], x\n)`;
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
    if (currentColorRamp && (currentColorRamp.length === 256))
    {
        fileDialogs.saveBinaryFile
        (
            "Export color table data file (.act):",
            [ { name: "Color table data file (*.act)", extensions: [ 'act' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.act`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToData (currentColorRamp, true);
            }
        );
    }
}
//
function exportCurvesMap ()
{
    if (currentColorRamp && (currentColorRamp.length === 256))
    {
        fileDialogs.saveBinaryFile
        (
            "Export curves map data file (.amp):",
            [ { name: "Curves map data file (*.amp)", extensions: [ 'amp' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.amp`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToData (currentColorRamp, false);
            }
        );
    }
}
//
function exportLookupTable ()
{
    if (currentColorRamp && (currentColorRamp.length === 256))
    {
        fileDialogs.saveBinaryFile
        (
            "Export lookup table data file (.lut):",
            [ { name: "Lookup table data file (*.lut)", extensions: [ 'lut' ] } ],
            formulaName.value ? path.join (defaultColorRampFolderPath, `${formulaName.value}.lut`) : defaultColorRampFolderPath,
            (filePath) =>
            {
                defaultColorRampFolderPath = path.dirname (filePath);
                return colorRampToData (currentColorRamp, false);
            }
        );
    }
}
//
ipcRenderer.on ('export-color-ramp', (event, args) => { exportColorRamp (args); });
ipcRenderer.on ('export-color-table', () => { exportColorTable (); });
ipcRenderer.on ('export-curves-map', () => { exportCurvesMap (); });
ipcRenderer.on ('export-lookup-table', () => { exportLookupTable (); });
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
    curvesMapPreview.appendChild (createCurvesMap (previewColorRamp, currentGridUnitCount));
}
//
function updateLinearGradientPreview ()
{
    while (linearGradientPreview.firstChild)
    {
        linearGradientPreview.firstChild.remove ();
    }
    linearGradientPreview.appendChild (createLinearGradient (previewColorRamp, currentContinuousGradient));
}
//
function updateColorTablePreview ()
{
    while (colorTablePreview.firstChild)
    {
        colorTablePreview.firstChild.remove ();
    }
    colorTablePreview.appendChild (createColorTable (previewColorRamp));
}
//
function updatePreviews ()
{
    updateColorRampList ();
    updateCurvesMapPreview ();
    updateLinearGradientPreview ();
    updateColorTablePreview ();
}
//
updatePreviews ();
//
let defaultSVGFolderPath = prefs.defaultSVGFolderPath;
//
function saveSVG (svg, defaultFilename)
{
    fileDialogs.saveTextFile
    (
        "Save SVG file:",
        [ { name: "SVG file (*.svg)", extensions: [ 'svg' ] } ],
        path.join (defaultSVGFolderPath, `${defaultFilename}.svg`),
        (filePath) =>
        {
            defaultSVGFolderPath = path.dirname (filePath);
            return svg;
        }
    );
}
//
function saveCurvesMapSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createCurvesMap (previewColorRamp, currentGridUnitCount, appComment)), "curves-map");
}
//
let setGridUnitCount = (menuItem) => { currentGridUnitCount = parseInt (menuItem.id); updateCurvesMapPreview ();};
//
let curvesMapMenuTemplate =
[
    {
        label: "Curves Map Preview",
        enabled: false
    },
    {
        type: "separator"
    },
    {
        label: "Grid Units",
        submenu:
        [
            { label: "4 × 4", id: "4", type: 'radio', click: setGridUnitCount },
            { label: "6 × 6", id: "6", type: 'radio', click: setGridUnitCount },
            { label: "8 × 8", id: "8", type: 'radio', click: setGridUnitCount },
            { label: "10 × 10", id: "10", type: 'radio', click: setGridUnitCount },
            { label: "12 × 12", id: "12", type: 'radio', click: setGridUnitCount }
        ]
    },
    {
        label: "Save as SVG...", click: saveCurvesMapSVG
    }
];
let curvesMapContextualMenu = remote.Menu.buildFromTemplate (curvesMapMenuTemplate);
let currentGridUnitMenuItem = curvesMapContextualMenu.getMenuItemById (currentGridUnitCount.toString ());
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
        if (previewColorRamp)
        {
            event.preventDefault ();
            let factor = webFrame.getZoomFactor ();
            curvesMapContextualMenu.popup ({ x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
        }
    }
);
//
function saveLinearGradientSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createLinearGradient (previewColorRamp, currentContinuousGradient, appComment)), "linear-gradient");
}
//
let setContinuousGradient = (menuItem) => { currentContinuousGradient = menuItem.id; updateLinearGradientPreview ();};
//
let linearGradientMenuTemplate =
[
    {
        label: "Linear Gradient Preview",
        enabled: false
    },
    {
        type: "separator"
    },
    {
        label: "Gradient",
        submenu:
        [
            { label: "Discrete", id: false, type: 'radio', click: setContinuousGradient },
            { label: "Continuous", id: true, type: 'radio', click: setContinuousGradient }
        ]
    },
    {
        label: "Save as SVG...", click: saveLinearGradientSVG
    }
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
        if (previewColorRamp)
        {
            event.preventDefault ();
            let factor = webFrame.getZoomFactor ();
            linearGradientContextualMenu.popup ({ x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
        }
    }
);
//
function saveColorTableSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createColorTable (previewColorRamp, appComment)), "color-table");
}
//
let colorTableMenuTemplate =
[
    {
        label: "Color Table Preview",
        enabled: false
    },
    {
        type: "separator"
    },
    {
        label: "Save as SVG...", click: saveColorTableSVG
    }
];
let colorTableMenuContextualMenu = remote.Menu.buildFromTemplate (colorTableMenuTemplate);
//
colorTablePreview.addEventListener
(
    'contextmenu',
    (event) =>
    {
        if (previewColorRamp)
        {
            event.preventDefault ();
            let factor = webFrame.getZoomFactor ();
            colorTableMenuContextualMenu.popup ({ x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
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
            zoomLevel: webFrame.getZoomLevel (),
            formulaName: formulaName.value,
            formulaString: formulaString.value,
            useStepsCheckbox: useStepsCheckbox.checked,
            stepsSelect: parseInt (stepsSelect.value),
            alignmentSelect: alignmentSelect.value,
            reverseCheckbox: reverseCheckbox.checked,
            gridUnitCount: currentGridUnitCount,
            continuousGradient: currentContinuousGradient,
            defaultFormulaFolderPath: defaultFormulaFolderPath,
            defaultSVGFolderPath: defaultSVGFolderPath,
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
