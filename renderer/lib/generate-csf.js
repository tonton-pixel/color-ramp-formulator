//
function lerp (a, b, t) { return (a * (1 - t)) + (b * t); }
//
// https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
//
const f = (a, b) => [].concat (...a.map (d => b.map (e => [].concat (d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian (f (a, b), ...c) : a);
//
// Campbell-Robson CSF (Contrast Sensitivity Function) Chart
// http://ohzawa-lab.bpe.es.osaka-u.ac.jp/ohzawa-lab/izumi/CSF/A_JG_RobsonCSFchart.html
// http://ohzawa-lab.bpe.es.osaka-u.ac.jp/ohzawa-lab/izumi/CSF/AlgorithmInC.txt
// https://cran.r-project.org/web/packages/pals/vignettes/pals_examples.html
// https://rdrr.io/cran/pals/src/R/tools.R
//
module.exports = function (size = 1024)
{
    let width = size;
    let height = size;
    let canvas = document.createElement ('canvas');
    canvas.width = width;
    canvas.height = height;
    let context = canvas.getContext ('2d', { alpha: false });
    let imageData = context.getImageData (0, 0, width, height);
    let d = imageData.data;
    let xValues = new Array (width);
    for (let x = 0; x < width; x++)
    {
        xValues[x] = lerp (0, 5 * Math.PI, x / (width - 1)) ;
    }
    let yValues = new Array (height);
    for (let y = 0; y < height; y++)
    {
        yValues[y] = lerp (0, 2 * Math.PI, 1 - (y / (height - 1)));
    }
    let zValues = cartesian (yValues, xValues);
    for (let z = 0; z < zValues.length; z++)
    {
        let zValue = zValues[z];
        let gray = (Math.cos (zValue[1] ** 2) / Math.exp (zValue[0])) + 0.5;
        let i = z * 4;
        d[i + 0] = d[i + 1] = d[i + 2] = Math.round (gray * 255);
    }
    context.putImageData (imageData, 0, 0);
    return canvas.toDataURL ();
}
//
