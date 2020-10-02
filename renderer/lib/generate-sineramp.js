//
function lerp (a, b, t) { return (a * (1 - t)) + (b * t); }
//
// Custom version of Peter Kovesi's test image
// https://peterkovesi.com/projects/colourmaps/colourmaptestimage.html
// https://github.com/peterkovesi/PerceptualColourMaps.jl
// https://www.peterkovesi.com/matlabfns/
// https://rdrr.io/cran/pals/src/R/tools.R
//
module.exports = function (size = 1024, amplitude = 0.1, attenuation = 2)
{
    let width = size;
    let height = size;
    let canvas = document.createElement ('canvas');
    canvas.width = width;
    canvas.height = height;
    let context = canvas.getContext ('2d', { alpha: false });
    let imageData = context.getImageData (0, 0, width, height);
    let d = imageData.data;
    for (let y = 0; y < height; y++)
    {
        let rowValues = new Array (width);
        let rowAmplitude = lerp (amplitude, 0, (y / (height - 1)) ** ( 1 / attenuation));
        for (let x = 0; x < width; x++)
        {
            rowValues[x] = (x / (width - 1)) + (Math.sin (2 * Math.PI * (x + 0.5) / (width / 64)) * rowAmplitude);
        }
        // Normalize to [0.0, 1.0]
        let rowMinValue = Math.min (...rowValues);
        rowValues = rowValues.map (rowValue => rowValue - rowMinValue);
        let rowMaxValue = Math.max (...rowValues);
        rowValues = rowValues.map (rowValue => rowValue / rowMaxValue);
        for (let x = 0; x < width; x++)
        {
            let i = ((y * width) + x) * 4;
            d[i + 0] = d[i + 1] = d[i + 2] = Math.round (rowValues[x] * 255);
        }
    }
    context.putImageData (imageData, 0, 0);
    return canvas.toDataURL ();
}
//
