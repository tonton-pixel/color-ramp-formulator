//
function easeIn (t) { return 1 - Math.sqrt (1 - (t * t)); }
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
            let angle = Math.PI / 4;
            let rotX = 2 / Math.SQRT2 * (((x / width - 0.5) * Math.cos (angle)) + ((y / height - 0.5) * Math.sin (angle)));
            let rotY = 2 / Math.SQRT2 * (((x / width - 0.5) * -Math.sin (angle)) + ((y / height - 0.5) * Math.cos (angle)));
            let gray = ((Math.sin ((rotX + 0.5) * Math.PI) * Math.sin ((rotY + 0.5) * Math.PI)) + 1) / 2;
            d[i + 0] = d[i + 1] = d[i + 2] = Math.round (easeIn (gray ** 0.6) * 255);
        }
    }
    context.putImageData (imageData, 0, 0);
    return canvas.toDataURL ();
}
//
