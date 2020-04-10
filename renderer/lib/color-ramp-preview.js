function normalize (value)
{
    return Math.min (Math.max (0, Math.round (value)), 255);
}
//
function rgbRToHex (rgb)
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
module.exports.createCurvesMap = function (colorRamp, gridUnitCount)
{
    const curvesWidth = 256;
    const curvesHeight = 256;
    const border = 1;
    const gap = 1;
    const containerWidth = border + gap + curvesWidth + gap + border;
    const containerHeight = border + gap + curvesHeight + gap + border;
    const gridColor = "#E8E8E8";
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');    
    svg.setAttributeNS (null, 'viewBox', `0 0 ${containerWidth} ${containerHeight}`);
    svg.setAttributeNS (null, 'width', containerWidth);
    svg.setAttributeNS (null, 'height', containerHeight);
    //
    let container = document.createElementNS (xmlns, 'rect');
    container.setAttributeNS (null, 'class', 'curves-map-container');
    container.setAttributeNS (null, 'width', containerWidth);
    container.setAttributeNS (null, 'height', containerHeight);
    container.setAttributeNS (null, 'stroke', 'gray');
    container.setAttributeNS (null, 'stroke-width', border + gap);
    container.setAttributeNS (null, 'fill', 'white');
    svg.appendChild (container);
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
        if (Array.isArray (colorRamp) && (colorRamp.length === 3)) // curves
        {
            let redCurve = colorRamp[0];
            let greenCurve = colorRamp[1];
            let blueCurve = colorRamp[2];
            if
            (
                (Array.isArray (redCurve) && (redCurve.length === 256))
                &&
                (Array.isArray (greenCurve) && (greenCurve.length === 256))
                &&
                (Array.isArray (blueCurve) && (blueCurve.length === 256))
            )
            {
                curves.red = redCurve.map (red => normalize (red));
                curves.green = greenCurve.map (green => normalize (green));
                curves.blue = blueCurve.map (blue => normalize (blue));
            }
        }
        else if (Array.isArray (colorRamp) && (colorRamp.length === 256)) // color table
        {
            for (let color of colorRamp)
            {
                if ((typeof color === 'string') && (/^#[0-9a-fA-F]{6}$/.test (color)))
                {
                    curves.red.push (parseInt (color.slice (1, 3), 16));
                    curves.green.push (parseInt (color.slice (3, 5), 16));
                    curves.blue.push (parseInt (color.slice (5, 7), 16));
                }
                else if (Array.isArray (color) && (color.length === 3))
                {
                    curves.red.push (normalize (color[0]));
                    curves.green.push (normalize (color[1]));
                    curves.blue.push (normalize (color[2]));
                }
            }
        }
        //
        if (gridUnitCount)
        {
            for (var row = 0; row <= gridUnitCount; row++)
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'horizontal-grid');
                rect.setAttributeNS (null, 'x', border);
                rect.setAttributeNS (null, 'y', border + (curvesHeight / gridUnitCount * row));
                rect.setAttributeNS (null, 'width', border + curvesWidth + border);
                rect.setAttributeNS (null, 'height', 2);
                rect.setAttributeNS (null, 'fill', gridColor);
                svg.appendChild (rect);
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
                svg.appendChild (rect);
            }
        }
        //
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
                rect.setAttributeNS (null, 'fill', '#000000');  // Not '#FFFFFF'!
                svg.appendChild (rect);
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
                color = (redValue === greenValue) ? '#FFFF00' : ((redValue === blueValue) ? '#FF00FF' : '#FF0000');
                redRect.setAttributeNS (null, 'fill', color);
                svg.appendChild (redRect);
                let greenRect = document.createElementNS (xmlns, 'rect');
                greenRect.setAttributeNS (null, 'class', 'value');
                greenRect.setAttributeNS (null, 'x', border + gap + index);
                greenRect.setAttributeNS (null, 'y', border + curvesHeight - greenValue);
                greenRect.setAttributeNS (null, 'width', 1);
                greenRect.setAttributeNS (null, 'height', 1);
                color = (greenValue === redValue) ? '#FFFF00' : ((greenValue === blueValue) ? '#00FFFF' : '#00FF00');
                greenRect.setAttributeNS (null, 'fill', color);
                svg.appendChild (greenRect);
                let blueRect = document.createElementNS (xmlns, 'rect');
                blueRect.setAttributeNS (null, 'class', 'value');
                blueRect.setAttributeNS (null, 'x', border + gap + index);
                blueRect.setAttributeNS (null, 'y', border + curvesHeight - blueValue);
                blueRect.setAttributeNS (null, 'width', 1);
                blueRect.setAttributeNS (null, 'height', 1);
                color = (blueValue === redValue) ? '#FF00FF' : ((blueValue === greenValue) ? '#00FFFF' : '#0000FF');
                blueRect.setAttributeNS (null, 'fill', color);
                svg.appendChild (blueRect);
            }
        }
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    return svg;
};
//
//
module.exports.createLinearGradient = function (colorRamp)
{
    const rampWidth = 256;
    const rampHeight = 48;
    const border = 1;
    const gap = 1;
    const id = "ramp-linear-gradient";
    const containerWidth = border + gap + rampWidth + gap + border;
    const containerHeight = border + gap + rampHeight + gap + border;
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');    
    svg.setAttributeNS (null, 'viewBox', `0 0 ${containerWidth} ${containerHeight}`);
    svg.setAttributeNS (null, 'width', containerWidth);
    svg.setAttributeNS (null, 'height', containerHeight);
    //
    let container = document.createElementNS (xmlns, 'rect');
    container.setAttributeNS (null, 'class', 'linear-gradient-container');
    container.setAttributeNS (null, 'width', containerWidth);
    container.setAttributeNS (null, 'height', containerHeight);
    container.setAttributeNS (null, 'stroke', 'gray');
    container.setAttributeNS (null, 'stroke-width', border + gap);
    container.setAttributeNS (null, 'fill', 'white');
    svg.appendChild (container);
    //
    if (colorRamp)
    {
        svg.classList.remove ('disabled');
        let colors = [ ];
        if (Array.isArray (colorRamp) && (colorRamp.length === 3)) // curves
        {
            let redCurve = colorRamp[0];
            let greenCurve = colorRamp[1];
            let blueCurve = colorRamp[2];
            if
            (
                (Array.isArray (redCurve) && (redCurve.length === 256))
                &&
                (Array.isArray (greenCurve) && (greenCurve.length === 256))
                &&
                (Array.isArray (blueCurve) && (blueCurve.length === 256))
            )
            {
                for (let index = 0; index < 256; index++)
                {
                    colors.push (rgbRToHex ([ redCurve[index], greenCurve[index], blueCurve[index] ]));
                }
            }
        }
        else if (Array.isArray (colorRamp) && (colorRamp.length === 256)) // color table
        {
            for (let color of colorRamp)
            {
                if ((typeof color === 'string') && (/^#[0-9a-fA-F]{6}$/.test (color)))
                {
                    colors.push (color.toUpperCase ());
                }
                else if (Array.isArray (color) && (color.length === 3))
                {
                    colors.push (rgbRToHex (color));
                }
            }
        }
        //
        let defs = document.createElementNS (xmlns, 'defs');
        let linearGradient = document.createElementNS (xmlns, 'linearGradient');
        linearGradient.setAttributeNS (null, 'gradientUnits', 'objectBoundingBox');
        linearGradient.setAttributeNS (null, 'id', id);
        let x = 0;
        for (let color of colors)
        {
            let stop = document.createElementNS (xmlns, 'stop');
            // stop.setAttributeNS (null, 'offset', `${(x++ / (rampWidth - 1)) * 100}%`);
            stop.setAttributeNS (null, 'offset', `${x++ / (rampWidth - 1)}`);
            stop.setAttributeNS (null, 'stop-color', color);
            linearGradient.appendChild (stop);
        }
        defs.appendChild (linearGradient);
        svg.appendChild (defs);
        //
        let rect = document.createElementNS (xmlns, 'rect');
        rect.setAttributeNS (null, 'class', 'ramp');
        rect.setAttributeNS (null, 'x', border + gap);
        rect.setAttributeNS (null, 'y', border + gap);
        rect.setAttributeNS (null, 'width', rampWidth);
        rect.setAttributeNS (null, 'height', rampHeight);
        rect.setAttributeNS (null, 'fill', `url(#${id})`);
        svg.appendChild (rect);
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    return svg;
};
//
module.exports.createColorTable = function (colorRamp)
{
    const rows = 16;
    const columns = 16;
    const clutWidth = 256;
    const clutHeight = 256;
    const border = 1;
    const gap = 1;
    const containerWidth = border + gap + clutWidth + gap + border;
    const containerHeight = border + gap + clutHeight + gap + border;
    const cellWidth = 14;
    const cellHeight = 14;
    //
    const xmlns = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS (xmlns, 'svg');    
    svg.setAttributeNS (null, 'viewBox', `0 0 ${containerWidth} ${containerHeight}`);
    svg.setAttributeNS (null, 'width', containerWidth);
    svg.setAttributeNS (null, 'height', containerHeight);
    //
    let container = document.createElementNS (xmlns, 'rect');
    container.setAttributeNS (null, 'class', 'color-table-container');
    container.setAttributeNS (null, 'width', containerWidth);
    container.setAttributeNS (null, 'height', containerHeight);
    container.setAttributeNS (null, 'stroke', 'gray');
    container.setAttributeNS (null, 'stroke-width', border + gap);
    container.setAttributeNS (null, 'fill', 'white');
    svg.appendChild (container);
    //
    if (colorRamp)
    {
        svg.classList.remove ('disabled');
        let colors = [ ];
        if (Array.isArray (colorRamp) && (colorRamp.length === 3)) // curves
        {
            let redCurve = colorRamp[0];
            let greenCurve = colorRamp[1];
            let blueCurve = colorRamp[2];
            if
            (
                (Array.isArray (redCurve) && (redCurve.length === 256))
                &&
                (Array.isArray (greenCurve) && (greenCurve.length === 256))
                &&
                (Array.isArray (blueCurve) && (blueCurve.length === 256))
            )
            {
                for (let index = 0; index < 256; index++)
                {
                    colors.push (rgbRToHex ([ redCurve[index], greenCurve[index], blueCurve[index] ]));
                }
            }
        }
        else if (Array.isArray (colorRamp) && (colorRamp.length === 256)) // color table
        {
            for (let color of colorRamp)
            {
                if ((typeof color === 'string') && (/^#[0-9a-fA-F]{6}$/.test (color)))
                {
                    colors.push (color.toUpperCase ());
                }
                else if (Array.isArray (color) && (color.length === 3))
                {
                    colors.push (rgbRToHex (color));
                }
            }
        }
        //
        let colorIndex = 0;
        for (let row = 0; row < rows; row++)
        {
            for (let column = 0; column < columns; column++)
            {
                let rect = document.createElementNS (xmlns, 'rect');
                rect.setAttributeNS (null, 'class', 'ramp');
                rect.setAttributeNS (null, 'x', border + border + gap + column * (border + gap + cellWidth));
                rect.setAttributeNS (null, 'y', border + border + gap + row * (border + gap + cellHeight));
                rect.setAttributeNS (null, 'width', cellWidth);
                rect.setAttributeNS (null, 'height', cellHeight);
                rect.setAttributeNS (null, 'fill', colors[colorIndex]);
                let title = document.createElementNS (xmlns, 'title');
                title.textContent = `[${colorIndex}]\xA0:\xA0${hexToRgb (colors[colorIndex])}\xA0or\xA0${colors[colorIndex]}`;
                rect.appendChild (title);
                svg.appendChild (rect);
                colorIndex++;
            }
        }
    }
    else
    {
        svg.classList.add ('disabled');
    }
    //
    return svg;
};
//
