//
const { ipcRenderer, remote, shell, webFrame } = require ('electron');
const { app, getCurrentWebContents, getGlobal } = remote;
//
const fs = require ('fs');
const path = require ('path');
//
const appName = app.name;
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
const sampleMenus = require ('./lib/sample-menus');
const json = require ('./lib/json2.js');
//
const colorRamps = require ('./lib/color-ramps.js');
const { createCurvesMap, createLinearGradient, createColorTable } = require ('./lib/color-ramp-preview.js');
//
const ColorFormula = require ('./lib/color-formula.js');
//
const defaultPrefs =
{
    zoomLevel: 0,
    formulaName: "",
    formulaString: "",
    gridUnitCount: 4,
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
    let title = settings.window.titleTemplate
                    .replace ("{{app}}", appName);
    let zoomFactor = Math.round (webFrame.getZoomFactor () * 100);
    return title + ((zoomFactor !== 100) ? settings.window.zoomSuffixTemplate.replace ("{{zoom}}", zoomFactor) : "");
}
//
const section = document.body.querySelector ('.section');
const clearButton = document.body.querySelector ('.clear-button');
const samplesButton = document.body.querySelector ('.samples-button');
const loadButton = document.body.querySelector ('.load-button');
const saveButton = document.body.querySelector ('.save-button');
const formulaName = document.body.querySelector ('.formula-name');
const formulaString = document.body.querySelector ('.formula-string');
const calculateButton = document.body.querySelector ('.calculate-button');
const resultString = document.body.querySelector ('.result-string');
const curvesMapPreview = document.body.querySelector ('.curves-map-preview');
const linearGradientPreview = document.body.querySelector ('.linear-gradient-preview');
const colorTablePreview = document.body.querySelector ('.color-table-preview');
const importButton = document.body.querySelector ('.import-button');
const exportButton = document.body.querySelector ('.export-button');
//
let currentColorRamp = null;
//
clearButton.addEventListener
(
    'click',
    (event) =>
    {
        formulaName.value = "";
        formulaString.value = "";
        resultString.value = "";
        currentColorRamp = null;
        updatePreview ();
    }
);
//
let samplesDirname = path.join (__dirname, 'samples');
let samplesFilenames = fs.readdirSync (samplesDirname);
samplesFilenames.sort ((a, b) => a.replace (/\.json$/i, "").localeCompare (b.replace (/\.json$/i, "")));
let samples = [ ];
for (let samplesFilename of samplesFilenames)
{
    let filename = path.join (samplesDirname, samplesFilename);
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
        samples.push ({ label: samplesFilename, items: items });
    }
    else if (fs.statSync (filename).isFile ())
    {
        let jsonFilename = samplesFilename.match (/(.*)\.json$/i);
        if (jsonFilename && (jsonFilename[1][0] !== '~'))
        {
            samples.push ({ label: jsonFilename[1], string: fs.readFileSync (filename, 'utf8').replace (/^\uFEFF/, "") });
        }
    }
}
//
let samplesMenu = sampleMenus.makeMenu
(
    samples,
    (sample) =>
    {
        let colorRamp = JSON.parse (sample.string).colorRamp;
        formulaName.value = colorRamp.name;
        formulaString.value = colorRamp.formula;
        calculateButton.click ();
    }
);
//
samplesButton.addEventListener
(
    'click',
    (event) =>
    {
        pullDownMenus.popup (event.currentTarget, samplesMenu);
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
            [ { name: "JSON (*.json)", extensions: [ 'json' ] } ],
            defaultFormulaFolderPath,
            'utf8',
            (text, filePath) =>
            {
                let colorRamp = JSON.parse (text.replace (/^\uFEFF/, "")).colorRamp;
                formulaName.value = colorRamp.name;
                formulaString.value = colorRamp.formula;
                calculateButton.click ();
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
            [ { name: "JSON (*.json)", extensions: [ 'json' ] } ],
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
function smartStringify (colorRamp)
{
    let colorStrings = [ ];
    for (let color of colorRamp)
    {
        colorStrings.push (`    ${json.stringify (color)}`);
    }
    return `[\n${colorStrings.join (",\n")}\n]`;
}
// To be later moved to lib/color-ramps.js?
function isRGBArray (rgb)
{
    return Array.isArray (rgb) && (rgb.length === 3) && rgb.every (component => (typeof component === 'number') && (!isNaN (component)));
}
//
calculateButton.addEventListener
(
    'click',
    (event) =>
    {
        resultString.value = "";
        resultString.scrollTop = 0;
        resultString.classList.remove ('error');
        currentColorRamp = null;
        updatePreview ();
        let formula = formulaString.value.trim ();
        if (formula)
        {
            try
            {
                let colorFormula = new ColorFormula (formula);
                let colorRamp = [ ];
                for (let x = 0; x < 256; x++)
                {
                    let rgbColor = colorFormula.evaluate (x, x / 255);
                    if (isRGBArray (rgbColor))
                    {
                        colorRamp.push (rgbColor.map (component => normalize (component)));
                    }
                    else
                    {
                        throw new Error ("Not a valid color ramp element.");
                    }
                }
                resultString.value = smartStringify (colorRamp);
                currentColorRamp = colorRamp;
                updatePreview ();
            }
            catch (error)
            {
                resultString.value = error;
                resultString.classList.add ('error');
            }
        }
    }
);
//
let currentGridUnitCount = prefs.gridUnitCount;
//
function updateCurvesMapPreview ()
{
    while (curvesMapPreview.firstChild)
    {
        curvesMapPreview.firstChild.remove ();
    }
    curvesMapPreview.appendChild (createCurvesMap (currentColorRamp, currentGridUnitCount));
}
//
function updateLinearGradientPreview ()
{
    while (linearGradientPreview.firstChild)
    {
        linearGradientPreview.firstChild.remove ();
    }
    linearGradientPreview.appendChild (createLinearGradient (currentColorRamp));
}
//
function updateColorTablePreview ()
{
    while (colorTablePreview.firstChild)
    {
        colorTablePreview.firstChild.remove ();
    }
    colorTablePreview.appendChild (createColorTable (currentColorRamp));
}
//
function updatePreview ()
{
    updateCurvesMapPreview ();
    updateLinearGradientPreview ();
    updateColorTablePreview ();
}
//
updatePreview ();
//
let defaultSVGFolderPath = prefs.defaultSVGFolderPath;
//
function saveSVG (svg, defaultFilename)
{
    fileDialogs.saveTextFile
    (
        "Save SVG file:",
        [ { name: "SVG File (*.svg)", extensions: [ 'svg' ] } ],
        path.join (defaultSVGFolderPath, `${defaultFilename}.svg`),
        (filePath) =>
        {
            defaultSVGFolderPath = path.dirname (filePath);
            return svg;
        }
    );
}
//
let serializer = new XMLSerializer ();
//
function saveCurvesMapSVG (menuItem)
{
    saveSVG (serializer.serializeToString (createCurvesMap (currentColorRamp, currentGridUnitCount)), "curves-map");
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
        if (currentColorRamp)
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
    saveSVG (serializer.serializeToString (createLinearGradient (currentColorRamp)), "linear-gradient");
}
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
        label: "Save as SVG...", click: saveLinearGradientSVG
    }
];
let linearGradientContextualMenu = remote.Menu.buildFromTemplate (linearGradientMenuTemplate);
//
linearGradientPreview.addEventListener
(
    'contextmenu',
    (event) =>
    {
        if (currentColorRamp)
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
    saveSVG (serializer.serializeToString (createColorTable (currentColorRamp)), "color-table");
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
        if (currentColorRamp)
        {
            event.preventDefault ();
            let factor = webFrame.getZoomFactor ();
            colorTableMenuContextualMenu.popup ({ x: Math.round (event.x * factor), y: Math.round (event.y * factor) });
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
importButton.addEventListener
(
    'click',
    (event) =>
    {
        fileDialogs.loadAnyFile
        (
            "Load color ramp file:",
            [
                {
                    name: "Color ramp file (*.json;*.act;*.amp;*.lut)",
                    extensions: [ 'json', 'act', 'amp','lut' ]
                }
            ],
            defaultColorRampFolderPath,
            {
                '.json': 'utf8',
                '.act': 'binary',
                '.amp': 'binary',
                '.lut': 'binary'
            },
            (data, filePath) =>
            {
                let colorRamp = [ ];
                let extension = path.extname (filePath).toLowerCase ();
                if (extension === '.json')
                {
                    colorRamp = JSON.parse (data.replace (/^\uFEFF/, ""));
                    if (colorRamps.isClut (colorRamp) || colorRamps.isMapping (colorRamp))
                    {
                        currentColorRamp = colorRamp;
                        updatePreview ();
                        defaultColorRampFolderPath = path.dirname (filePath);
                    }
                    else
                    {
                        alert (`Invalid color ramp file format:\n${filePath}`);
                    }
                }
                else if (extension === '.act')
                {
                    if ((data.length === rawClutFileSize)　||　(data.length === (rawClutFileSize + footerClutSize)))
                    {
                        // Interleaved
                        for (var index = 0; index < rawElementSize; index++)
                        {
                            var rgb = data.substr (3 * index, 3);
                            colorRamp.push ([ rgb.charCodeAt (0), rgb.charCodeAt (1), rgb.charCodeAt (2) ]);
                        }
                        currentColorRamp = colorRamp;
                        updatePreview ();
                        defaultColorRampFolderPath = path.dirname (filePath);
                    }
                    else
                    {
                        alert (`Unrecognized color table file format:\n${filePath}`);
                    }
                }
                else if (extension === '.amp')
                {
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
                        currentColorRamp = colorRamp;
                        updatePreview ();
                        defaultColorRampFolderPath = path.dirname (filePath);
                    }
                    else
                    {
                        alert (`Unrecognized curves map file format:\n${filePath}`);
                    }
                }
                else if (extension === '.lut')
                {
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
                        currentColorRamp = colorRamp;
                        updatePreview ();
                        defaultColorRampFolderPath = path.dirname (filePath);
                    }
                    else
                    {
                        alert (`Unrecognized lookup table file format:\n${filePath}`);
                    }
                }
            }
        );
    }
);
//
exportButton.addEventListener
(
    'click',
    (event) =>
    {
        console.log ("Export");
    }
);
//
function normalize (component)
{
    return Math.min (Math.max (0, Math.round (component)), 255);
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
            gridUnitCount: currentGridUnitCount,
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
getCurrentWebContents ().once
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
