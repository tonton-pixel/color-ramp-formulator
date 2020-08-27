//
module.exports = function (colorRamp256, dataURL, callback)
{
    let img = new Image ();
    img.onload = function ()
    {
        let width = this.naturalWidth;
        let height = this.naturalHeight;
        let canvas = document.createElement ('canvas');
        canvas.width = width;
        canvas.height = height;
        let context = canvas.getContext ('2d', { alpha: false });
        context.drawImage (this, 0, 0);
        let imageData = context.getImageData (0, 0, width, height);
        let d = imageData.data;
        let n = width * height * 4;
        for (let i = 0; i < n; i += 4)
        {
            let rgb = colorRamp256[Math.round ((0.299 * d[i + 0]) + (0.587 * d[i + 1]) + (0.114 * d[i + 2]))];
            d[i + 0] = rgb[0];
            d[i + 1] = rgb[1];
            d[i + 2] = rgb[2];
        }
        context.putImageData (imageData, 0, 0);
        callback (canvas.toDataURL ());
    };
    img.src = dataURL;
}
//
