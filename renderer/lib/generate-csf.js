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
    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            let i = ((y * width) + x) * 4;
            let gray = (Math.cos ((5 * Math.PI * x / (width - 1)) ** 2) / Math.exp (2 * Math.PI * (1 - (y / (height - 1))))) + 0.5;
            d[i + 0] = d[i + 1] = d[i + 2] = Math.round (gray * 255);
        }
    }
    context.putImageData (imageData, 0, 0);
    return canvas.toDataURL ();
}
//
