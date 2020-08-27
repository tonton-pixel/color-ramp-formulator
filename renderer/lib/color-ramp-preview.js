//
function normalize (value)
{
    return Math.min (Math.max (0, Math.round (value)), 255);
}
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
function hexToRgb (hex)
{
    let red = parseInt (hex.substr (1 + 0, 2), 16);
    let green = parseInt (hex.substr (1 + 2, 2), 16);
    let blue = parseInt (hex.substr (1 + 4, 2), 16);
    return `rgb(${red}, ${green}, ${blue})`;
}
//
const redHex = '#FF0000';
const yellowHex = '#FFBF00';  // Should be '#FFFF00'!
const greenHex = '#00BF00';  // Should be '#00FF00'!
const cyanHex = '#00BFFF';  // Should be '#00FFFF'!
const blueHex = '#0000FF';
const magentaHex = '#FF00FF';
const whiteHex = '#000000';  // Should be '#FFFFFF'!

module.exports.createCurvesMap = function (colorRamp, gridUnitCount, comment)
{
    const curvesWidth = 256;
    const curvesHeight = 256;
    const border = 1;
    const gap = 1;
    const frameWidth = border + gap + curvesWidth + gap + border;
    const frameHeight = border + gap + curvesHeight + gap + border;
    const gridColor = "#EBEBEB";
    //
    let level = 0;
    let indentation = "    ";
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');
    svg.setAttributeNS (null, 'viewBox', `0 0 ${frameWidth} ${frameHeight}`);
    svg.setAttributeNS (null, 'width', frameWidth);
    svg.setAttributeNS (null, 'height', frameHeight);
    //
    level++;
    //
    if (comment)
    {
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (document.createComment (comment));
    }
    //
    let frame = document.createElementNS (xmlns, 'rect');
    frame.setAttributeNS (null, 'class', 'frame');
    frame.setAttributeNS (null, 'width', frameWidth);
    frame.setAttributeNS (null, 'height', frameHeight);
    frame.setAttributeNS (null, 'stroke', 'gray');
    frame.setAttributeNS (null, 'stroke-width', border + gap);
    frame.setAttributeNS (null, 'fill', 'white');
    frame.setAttributeNS (null, 'shape-rendering', 'crispEdges');
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    svg.appendChild (frame);
    //
    if (colorRamp)
    {
        svg.classList.remove ('disabled');
        let curves =
        {
            red: [ ],
            green: [ ],
            blue: [ ]
        };
        for (let color of colorRamp)
        {
            curves.red.push (normalize (color[0]));
            curves.green.push (normalize (color[1]));
            curves.blue.push (normalize (color[2]));
        }
        //
        level++;
        if (gridUnitCount)
        {
            let grid = document.createElementNS (xmlns, 'g');
            grid.setAttributeNS (null, 'class', 'grid');
            grid.setAttributeNS (null, 'shape-rendering', 'geometricPrecision');
            for (var row = 0; row <= gridUnitCount; row++)
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'horizontal-grid');
                rect.setAttributeNS (null, 'x', border);
                rect.setAttributeNS (null, 'y', border + (curvesHeight / gridUnitCount * row));
                rect.setAttributeNS (null, 'width', border + curvesWidth + border);
                rect.setAttributeNS (null, 'height', 2);
                rect.setAttributeNS (null, 'fill', gridColor);
                grid.appendChild (document.createTextNode ("\n"));
                grid.appendChild (document.createTextNode (indentation.repeat (level)));
                grid.appendChild (rect);
            }
            for (var column = 0; column <= gridUnitCount; column++)
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'vertical-grid');
                rect.setAttributeNS (null, 'x', border + (curvesWidth / gridUnitCount * column));
                rect.setAttributeNS (null, 'y', border);
                rect.setAttributeNS (null, 'width', 2);
                rect.setAttributeNS (null, 'height', border + curvesHeight + border);
                rect.setAttributeNS (null, 'fill', gridColor);
                grid.appendChild (document.createTextNode ("\n"));
                grid.appendChild (document.createTextNode (indentation.repeat (level)));
                grid.appendChild (rect);
            }
            level--;
            grid.appendChild (document.createTextNode ("\n"));
            grid.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (document.createTextNode ("\n"));
            svg.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (grid);
        }
        //
        level++;
        let values = document.createElementNS (xmlns, 'g');
        values.setAttributeNS (null, 'class', 'values');
        values.setAttributeNS (null, 'shape-rendering', 'geometricPrecision');
        for (let index = 0; index < 256; index++)
        {
            let redValue = curves.red[index];
            let greenValue = curves.green[index];
            let blueValue = curves.blue[index];
            if ((redValue === greenValue) && (redValue === blueValue))
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'value');
                rect.setAttributeNS (null, 'x', border + gap + index);
                rect.setAttributeNS (null, 'y', border + curvesHeight - redValue);
                rect.setAttributeNS (null, 'width', 1);
                rect.setAttributeNS (null, 'height', 1);
                rect.setAttributeNS (null, 'fill', whiteHex);
                values.appendChild (document.createTextNode ("\n"));
                values.appendChild (document.createTextNode (indentation.repeat (level)));
                values.appendChild (rect);
            }
            else
            {
                let color;
                let redRect = document.createElementNS (xmlns, 'rect');
                redRect.setAttributeNS (null, 'class', 'value');
                redRect.setAttributeNS (null, 'x', border + gap + index);
                redRect.setAttributeNS (null, 'y', border + curvesHeight - redValue);
                redRect.setAttributeNS (null, 'width', 1);
                redRect.setAttributeNS (null, 'height', 1);
                color = (redValue === greenValue) ? yellowHex : ((redValue === blueValue) ? magentaHex : redHex);
                redRect.setAttributeNS (null, 'fill', color);
                values.appendChild (document.createTextNode ("\n"));
                values.appendChild (document.createTextNode (indentation.repeat (level)));
                values.appendChild (redRect);
                let greenRect = document.createElementNS (xmlns, 'rect');
                greenRect.setAttributeNS (null, 'class', 'value');
                greenRect.setAttributeNS (null, 'x', border + gap + index);
                greenRect.setAttributeNS (null, 'y', border + curvesHeight - greenValue);
                greenRect.setAttributeNS (null, 'width', 1);
                greenRect.setAttributeNS (null, 'height', 1);
                color = (greenValue === redValue) ? yellowHex : ((greenValue === blueValue) ? cyanHex : greenHex);
                greenRect.setAttributeNS (null, 'fill', color);
                values.appendChild (document.createTextNode ("\n"));
                values.appendChild (document.createTextNode (indentation.repeat (level)));
                values.appendChild (greenRect);
                let blueRect = document.createElementNS (xmlns, 'rect');
                blueRect.setAttributeNS (null, 'class', 'value');
                blueRect.setAttributeNS (null, 'x', border + gap + index);
                blueRect.setAttributeNS (null, 'y', border + curvesHeight - blueValue);
                blueRect.setAttributeNS (null, 'width', 1);
                blueRect.setAttributeNS (null, 'height', 1);
                color = (blueValue === redValue) ? magentaHex : ((blueValue === greenValue) ? cyanHex : blueHex);
                blueRect.setAttributeNS (null, 'fill', color);
                values.appendChild (document.createTextNode ("\n"));
                values.appendChild (document.createTextNode (indentation.repeat (level)));
                values.appendChild (blueRect);
            }
        }
        level--;
        values.appendChild (document.createTextNode ("\n"));
        values.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (values);
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    level--;
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    //
    return svg;
};
//
//
module.exports.createLinearGradient = function (colorRamp, continuousGradient, comment)
{
    const rampWidth = 256;
    const rampHeight = 48;
    const border = 1;
    const gap = 1;
    const frameWidth = border + gap + rampWidth + gap + border;
    const frameHeight = border + gap + rampHeight + gap + border;
    //
    let level = 0;
    let indentation = "    ";
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');
    svg.setAttributeNS (null, 'viewBox', `0 0 ${frameWidth} ${frameHeight}`);
    svg.setAttributeNS (null, 'width', frameWidth);
    svg.setAttributeNS (null, 'height', frameHeight);
    //
    level++;
    //
    if (comment)
    {
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (document.createComment (comment));
    }
    //
    let frame = document.createElementNS (xmlns, 'rect');
    frame.setAttributeNS (null, 'class', 'frame');
    frame.setAttributeNS (null, 'width', frameWidth);
    frame.setAttributeNS (null, 'height', frameHeight);
    frame.setAttributeNS (null, 'stroke', 'gray');
    frame.setAttributeNS (null, 'stroke-width', border + gap);
    frame.setAttributeNS (null, 'fill', 'white');
    frame.setAttributeNS (null, 'shape-rendering', 'crispEdges');
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    svg.appendChild (frame);
    //
    if (colorRamp)
    {
        svg.classList.remove ('disabled');
        let colors = [ ];
        for (let color of colorRamp)
        {
            colors.push (rgbToHex (color));
        }
        //
        level++;
        if (continuousGradient)
        {
            level++;
            const id = "linear-gradient";
            let defs = document.createElementNS (xmlns, 'defs');
            let linearGradient = document.createElementNS (xmlns, 'linearGradient');
            linearGradient.setAttributeNS (null, 'id', id);
            linearGradient.setAttributeNS (null, 'gradientUnits', 'objectBoundingBox');
            let x = 0;
            for (let color of colors)
            {
                let stop = document.createElementNS (xmlns, 'stop');
                // stop.setAttributeNS (null, 'offset', `${(x++ / (rampWidth - 1)) * 100}%`);
                stop.setAttributeNS (null, 'offset', `${x++ / (rampWidth - 1)}`);
                stop.setAttributeNS (null, 'stop-color', color);
                linearGradient.appendChild (document.createTextNode ("\n"));
                linearGradient.appendChild (document.createTextNode (indentation.repeat (level)));
                linearGradient.appendChild (stop);
            }
            level--;
            linearGradient.appendChild (document.createTextNode ("\n"));
            linearGradient.appendChild (document.createTextNode (indentation.repeat (level)));
            defs.appendChild (document.createTextNode ("\n"));
            defs.appendChild (document.createTextNode (indentation.repeat (level)));
            defs.appendChild (linearGradient);
            level--;
            defs.appendChild (document.createTextNode ("\n"));
            defs.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (document.createTextNode ("\n"));
            svg.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (defs);
            //
            let rect = document.createElementNS (xmlns, 'rect');
            rect.setAttributeNS (null, 'class', 'continuous-gradient');
            rect.setAttributeNS (null, 'x', border + gap);
            rect.setAttributeNS (null, 'y', border + gap);
            rect.setAttributeNS (null, 'width', rampWidth);
            rect.setAttributeNS (null, 'height', rampHeight);
            rect.setAttributeNS (null, 'fill', `url(#${id})`);
            rect.setAttributeNS (null, 'shape-rendering', 'crispEdges');
            svg.appendChild (document.createTextNode ("\n"));
            svg.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (rect);
        }
        else
        {
            let discreteGradient = document.createElementNS (xmlns, 'g');
            discreteGradient.setAttributeNS (null, 'class', 'discrete-gradient');
            discreteGradient.setAttributeNS (null, 'shape-rendering', 'crispEdges');
            for (let colorIndex = 0; colorIndex < colors.length; colorIndex++)
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'color');
                rect.setAttributeNS (null, 'x', border + gap + colorIndex);
                rect.setAttributeNS (null, 'y', border + gap);
                rect.setAttributeNS (null, 'width', 1);
                rect.setAttributeNS (null, 'height', rampHeight);
                rect.setAttributeNS (null, 'fill', colors[colorIndex]);
                discreteGradient.appendChild (document.createTextNode ("\n"));
                discreteGradient.appendChild (document.createTextNode (indentation.repeat (level)));
                discreteGradient.appendChild (rect);
            }
            level--;
            discreteGradient.appendChild (document.createTextNode ("\n"));
            discreteGradient.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (document.createTextNode ("\n"));
            svg.appendChild (document.createTextNode (indentation.repeat (level)));
            svg.appendChild (discreteGradient);
        }
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    level--;
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    //
    return svg;
};
//
module.exports.createColorTable = function (colorRamp, comment)
{
    const rows = 16;
    const columns = 16;
    const clutWidth = 256;
    const clutHeight = 256;
    const border = 1;
    const gap = 1;
    const frameWidth = border + gap + clutWidth + gap + border;
    const frameHeight = border + gap + clutHeight + gap + border;
    const cellWidth = 14;
    const cellHeight = 14;
    //
    let level = 0;
    let indentation = "    ";
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');
    svg.setAttributeNS (null, 'viewBox', `0 0 ${frameWidth} ${frameHeight}`);
    svg.setAttributeNS (null, 'width', frameWidth);
    svg.setAttributeNS (null, 'height', frameHeight);
    //
    level++;
    //
    if (comment)
    {
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (document.createComment (comment));
    }
    //
    let frame = document.createElementNS (xmlns, 'rect');
    frame.setAttributeNS (null, 'class', 'frame');
    frame.setAttributeNS (null, 'width', frameWidth);
    frame.setAttributeNS (null, 'height', frameHeight);
    frame.setAttributeNS (null, 'stroke', 'gray');
    frame.setAttributeNS (null, 'stroke-width', border + gap);
    frame.setAttributeNS (null, 'fill', 'white');
    frame.setAttributeNS (null, 'shape-rendering', 'crispEdges');
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    svg.appendChild (frame);
    //
    if (colorRamp)
    {
        svg.classList.remove ('disabled');
        let colorTable = [ ];
        for (let color of colorRamp)
        {
            colorTable.push (rgbToHex (color));
        }
        //
        level++;
        let colors = document.createElementNS (xmlns, 'g');
        colors.setAttributeNS (null, 'class', 'colors');
        colors.setAttributeNS (null, 'shape-rendering', 'geometricPrecision');
        let colorIndex = 0;
        for (let row = 0; row < rows; row++)
        {
            for (let column = 0; column < columns; column++)
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'color');
                rect.setAttributeNS (null, 'x', border + border + gap + column * (border + gap + cellWidth));
                rect.setAttributeNS (null, 'y', border + border + gap + row * (border + gap + cellHeight));
                rect.setAttributeNS (null, 'width', cellWidth);
                rect.setAttributeNS (null, 'height', cellHeight);
                rect.setAttributeNS (null, 'fill', colorTable[colorIndex]);
                let title = document.createElementNS (xmlns, 'title');
                title.textContent = `[${colorIndex}]\xA0:\xA0${hexToRgb (colorTable[colorIndex])}\xA0or\xA0${colorTable[colorIndex]}`;
                rect.appendChild (title);
                colors.appendChild (document.createTextNode ("\n"));
                colors.appendChild (document.createTextNode (indentation.repeat (level)));
                colors.appendChild (rect);
                colorIndex++;
            }
        }
        level--;
        colors.appendChild (document.createTextNode ("\n"));
        colors.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (colors);
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    level--;
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    //
    return svg;
};
//
module.exports.createTestImage = function (dataURL, size, comment)
{
    const border = 1;
    const gap = 1;
    const frameWidth = border + gap + size + gap + border;
    const frameHeight = border + gap + size + gap + border;
    //
    let level = 0;
    let indentation = "    ";
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');
    svg.setAttributeNS (null, 'viewBox', `0 0 ${frameWidth} ${frameHeight}`);
    svg.setAttributeNS (null, 'width', frameWidth);
    svg.setAttributeNS (null, 'height', frameHeight);
    //
    level++;
    //
    if (comment)
    {
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (document.createComment (comment));
    }
    //
    let frame = document.createElementNS (xmlns, 'rect');
    frame.setAttributeNS (null, 'class', 'frame');
    frame.setAttributeNS (null, 'width', frameWidth);
    frame.setAttributeNS (null, 'height', frameHeight);
    frame.setAttributeNS (null, 'stroke', 'gray');
    frame.setAttributeNS (null, 'stroke-width', border + gap);
    frame.setAttributeNS (null, 'fill', 'white');
    frame.setAttributeNS (null, 'shape-rendering', 'crispEdges');
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    svg.appendChild (frame);
    //
    if (dataURL)
    {
        svg.classList.remove ('disabled');
        let image = document.createElementNS (xmlns, 'image');
        image.setAttributeNS (null, 'class', 'image');
        image.setAttributeNS (null, 'x', 2);
        image.setAttributeNS (null, 'y', 2);
        image.setAttributeNS (null, 'width', size);
        image.setAttributeNS (null, 'height', size);
        image.setAttributeNS (null, 'href', dataURL);
        svg.appendChild (document.createTextNode ("\n"));
        svg.appendChild (document.createTextNode (indentation.repeat (level)));
        svg.appendChild (image);
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    level--;
    svg.appendChild (document.createTextNode ("\n"));
    svg.appendChild (document.createTextNode (indentation.repeat (level)));
    //
    return svg;
};
//
