//
const { tokenize, parseScript } = require ('esprima');
//
const colorUtils = require ('./color-utils.js');
//
function equalPoints (data1, data2)
{
    let isEqual = false;
    if (Array.isArray (data1) && Array.isArray (data2))
    {
        if (data1.length === data2.length)
        {
            for (let i = 0; i < data1.length; i++)
            {
                isEqual = equalPoints (data1[i], data2[i]);
                if (!isEqual) break;
            }
        }
    }
    else if (data1 === data2)
    {
        isEqual = true;
    }
    return isEqual;
}
//
function clonePoints (data)
{
    let clone;
    if (Array.isArray (data))
    {
        clone = [ ];
        for (let i = 0; i < data.length; i++)
        {
            clone.push (clonePoints (data[i]));
        }
    }
    else
    {
        clone = data;
    }
    return clone;
}
//
function limit (value, min, max)
{
    return (Math.min (Math.max (min, value), max));
}
//
function lerp (a, b, t)
{
    return (a * (1 - t)) + (b * t);
}
//
function coserp (a, b, t)
{
    t = limit (t, 0, 1);
    return a + ((b - a) * (1 - Math.cos (t * Math.PI)) / 2);
}
//
// <http://en.wikipedia.org/wiki/Smoothstep>
//
function smoothstep (a, b, t)
{
    t = limit (t, 0, 1);
    return a + ((b - a) * t * t * (3 - (2 * t)));
}
//
function smootherstep (a, b, t)
{
    t = limit (t, 0, 1);
    return a + ((b - a) * t * t * t * (t * ((t * 6) - 15) + 10));
}
//
function bias (t, b)
{
    return t / ((((1 / b) - 2) * (1 - t)) + 1);
}
//
function gain (t, g)
{
    return t < 0.5 ? bias (2 * t, g) / 2 : 1 - (bias ((2 * (1 - t)), g) / 2);
}
//
// Shape-preserving PCHIP (Piecewise Cubic Hermite Interpolation Polynomial)
// Based on:
// <http://www.mathworks.fr/moler/interp.pdf> (previous link)
// <https://www.mathworks.com/content/dam/mathworks/mathworks-dot-com/moler/interp.pdf>
// <http://en.wikipedia.org/wiki/Monotone_cubic_interpolation>
//
function getTangents (xs, ys, ms)
{
    let dxs = [ ];
    let ss = [ ];
    for (let i = 0; i < xs.length - 1; i++)
    {
        let dx = xs[i + 1] - xs[i];
        let dy = ys[i + 1] - ys[i];
        dxs.push (dx);
        ss.push (dy / dx);
    }
    ms[0] = ss[0];
    for (let i = 1; i < ss.length; i++)
    {
        let s1 = ss[i - 1];
        let s2 = ss[i];
        if ((s1 * s2) <= 0)
        {
            ms[i] = 0;
        }
        else
        {
            let w1 = (2 * dxs[i]) + dxs[i - 1];
            let w2 = (2 * dxs[i - 1]) + dxs[i];
            ms[i] = (w1 + w2) / ((w1 / s1) + (w2 / s2));
        }
    }
    ms[ms.length - 1] = ss[ss.length - 1];
}
//
function evalCurve (x, xs, ys, ms)
{
    let y;
    let count = xs.length;
    if (x < xs[0])
    {
        y = ys[0] + (ms[0] * (x - xs[0]));
    }
    else if (x > xs[count - 1])
    {
        y = ys[count - 1] + (ms[count - 1] * (x - xs[count - 1]))
    }
    else
    {
        let i = 1;
        while (xs[i] < x)
        {
            i++;
        }
        let h = xs[i] - xs[i - 1];
        let t = (x - xs[i - 1]) / h;
        let t2 = Math.pow (t, 2);
        let t3 = Math.pow (t, 3);
        let h00 = (2 * t3) - (3 * t2) + 1;
        let h10 = t3 - (2 * t2) + t;
        let h01 = (-2 * t3) + (3 * t2);
        let h11 = t3 - t2;
        y = (h00 * ys[i - 1]) + (h10 * h * ms[i - 1]) + (h01 * ys[i]) + (h11 * h * ms[i]);
    }
    return y;
}
//
function pchip (points, position)
{
    let pointsCount = points.length;
    if (pointsCount > 1)
    {
        for (let index = 1; index < pointsCount; index++)
        {
            if (points[index - 1][0] >= points[index][0])
            {
                throw new Error ("pchip: positions must be in strict ascending order");
            }
        }
        let cacheSize = (3 + 3) * 2;    // 3 * 2
        if (typeof pchip.statics === 'undefined')
        {
            pchip.statics = { };
            pchip.statics.cache = [ ];
            pchip.statics.cacheQueue = [ ];
            for (let index = 0; index < cacheSize; index++)
            {
                pchip.statics.cache.push ({ points: [ ], xs: [ ], ys: [ ], ms: [ ] });
                pchip.statics.cacheQueue.push (index);
            }
        }
        let matchIndex = -1;
        for (let index = 0; index < cacheSize; index++)
        {
            let cacheIndex = pchip.statics.cacheQueue[index];
            if (equalPoints (points, pchip.statics.cache[cacheIndex].points))
            {
                matchIndex = index;
                break;
            }
        }
        let cache;
        if (matchIndex === -1)
        {
            let cacheIndex = pchip.statics.cacheQueue.pop ();
            pchip.statics.cacheQueue.unshift (cacheIndex);
            cache = pchip.statics.cache[cacheIndex];
            cache.points = clonePoints (points);
            cache.xs = [ ];
            cache.ys = [ ];
            cache.ms = [ ];
            for (let pointsIndex = 0; pointsIndex < pointsCount; pointsIndex++)
            {
                cache.xs.push (points[pointsIndex][0]);
                cache.ys.push (points[pointsIndex][1]);
                cache.ms.push (1);
            }
            getTangents (cache.xs, cache.ys, cache.ms);
        }
        else
        {
            let cacheIndex = pchip.statics.cacheQueue[matchIndex];
            if (matchIndex !== 0)
            {
                pchip.statics.cacheQueue.splice (matchIndex, 1);
                pchip.statics.cacheQueue.unshift (cacheIndex);
            }
            cache = pchip.statics.cache[cacheIndex];
        }
        return evalCurve (position, cache.xs, cache.ys, cache.ms);
    }
    else
    {
        throw new Error ("pchip: two points or more are required");
    }
}
//
function interpolate (points, position, smoothness)
{
    let value;
    let pointsCount = points.length;
    if (pointsCount > 1)
    {
        for (let startIndex = 0; startIndex < (pointsCount - 1); startIndex++)
        {
            let startPoint = points[startIndex];
            let startPosition = startPoint[0];
            let startValue = startPoint[1];
            let endIndex = startIndex + 1;
            let endPoint = points[endIndex];
            let endPosition = endPoint[0];
            let endValue = endPoint[1];
            if (startPosition > endPosition)
            {
                throw new Error ("interpolate: positions must be in ascending order");
            }
            else
            {
                if ((position <= endPosition) || (endIndex === (pointsCount - 1)))
                {
                    value = lerp (startValue, endValue, (position - startPosition) / (endPosition - startPosition));
                    break;
                }
            }
        }
    }
    else
    {
        throw new Error ("interpolate: two points or more are required");
    }
    if (typeof smoothness !== 'undefined')
    {
        if (typeof smoothness === 'number')
        {
            if (smoothness !== 0)
            {
                let smoothValue = pchip (points, position);
                value = lerp (value, smoothValue, smoothness / 100);
            }
        }
        else
        {
            throw new Error ("interpolate: invalid smoothness value");
        }
    }
    return value;
}
//
function distribute (values, bounds, position, smoothness)
{
    let value;
    let count = values.length;
    if (count > 1)
    {
        let min = bounds[0];
        let max = bounds[1];
        let points = [ ];
        for (let valueIndex = 0; valueIndex < count; valueIndex++)
        {
            points.push ([ min + ((max - min) * valueIndex / (count - 1)), values[valueIndex] ]);
        }
        value = interpolate (points, position, smoothness);
    }
    else
    {
        throw new Error ("distribute: invalid number of values: " + count);
    }
    return value;
}
//
// Code adapted from:
// <http://blog.ivank.net/interpolation-with-cubic-splines.html>
// <http://www.ivank.net/blogspot/cspline/CSPL.js>
// By: Ivan Kuckir
//
function getNaturalKs (xs, ys, ks)
{
    function zerosMatrix (r, c)
    {
        let A = [ ];
        for (let i = 0; i < r; i++)
        {
            A.push ([ ]);
            for (let j = 0; j < c; j++)
            {
                A[i].push (0);
            }
        }
        return A;
    }
    function solve (A, x)
    {
        function swapRows (m, k, l)
        {
            let p = m[k];
            m[k] = m[l];
            m[l] = p;
        }
        let m = A.length;
        for (let k = 0; k < m; k++)
        {
            let i_max = 0;
            let vali = Number.NEGATIVE_INFINITY;
            for (let i = k; i < m; i++)
            {
                if(A[i][k] > vali)
                {
                    i_max = i;
                    vali = A[i][k];
                }
            }
            swapRows (A, k, i_max);
            for (let i = k + 1; i < m; i++)
            {
                for (let j = k + 1; j < m + 1; j++)
                {
                    A[i][j] = A[i][j] - A[k][j] * (A[i][k] / A[k][k]);
                }
                A[i][k] = 0;
            }
        }
        for (let i = m - 1; i >= 0; i--)
        {
            let v = A[i][m] / A[i][i];
            x[i] = v;
            for (let j = i - 1; j >= 0; j--)
            {
                A[j][m] -= A[j][i] * v;
                A[j][i] = 0;
            }
        }
    }
    let n = xs.length - 1;
    let A = zerosMatrix (n + 1, n + 2);
    for (let i = 1; i < n; i++)
    {
        A[i][i - 1] = 1 / (xs[i] - xs[i - 1]);
        A[i][i] = 2 * ((1 / (xs[i] - xs[i - 1])) + (1 / (xs[i + 1] - xs[i])));
        A[i][i + 1] = 1 / (xs[i + 1] - xs[i]);
        A[i][n + 1] = 3 * ((ys[i] - ys[i - 1]) / ((xs[i] - xs[i - 1]) * (xs[i] - xs[i - 1])) + (ys[i + 1] - ys[i]) / ((xs[i + 1] - xs[i]) * (xs[i + 1] - xs[i])));
    }
    A[0][0] = 2 / (xs[1] - xs[0]);
    A[0][1] = 1 / (xs[1] - xs[0]);
    A[0][n + 1] = 3 * (ys[1] - ys[0]) / ((xs[1] - xs[0]) * (xs[1] - xs[0]));
    A[n][n - 1] = 1 / (xs[n] - xs[n - 1]);
    A[n][n] = 2 / (xs[n] - xs[n - 1]);
    A[n][n + 1] = 3 * (ys[n] - ys[n - 1]) / ((xs[n] - xs[n - 1]) * (xs[n] - xs[n - 1]));
    solve (A, ks);
    A = null;
}
//
function evalSpline (x, xs, ys, ks, compatible)
{
    let y;
    let count = xs.length;
    if (x < xs[0])
    {
        y = (compatible) ? ys[0] : ys[0] + (ks[0] * (x - xs[0]));
    }
    else if (x > xs[count - 1])
    {
        y = (compatible) ? ys[count - 1] : ys[count - 1] + (ks[count - 1] * (x - xs[count - 1]));
    }
    else
    {
        let i = 1;
        while (xs[i] < x)
        {
            i++;
        }
        let x1 = xs[i - 1];
        let x2 = xs[i];
        let y1 = ys[i - 1];
        let y2 = ys[i];
        let k1 = ks[i - 1];
        let k2 = ks[i];
        let a = (k1 * (x2 - x1)) - (y2 - y1);
        let b = (-k2 * (x2 - x1)) + (y2 - y1);
        let t = (x - x1) / (x2 - x1);
        y = ((1 - t) * y1) + (t * y2) + (t * (1 - t) * (a * (1 - t) + (b * t)));
    }
    return y;
}
//
function spline (points, position, compatible)
{
    let pointsCount = points.length;
    if (pointsCount > 1)
    {
        for (let index = 1; index < pointsCount; index++)
        {
            if (points[index - 1][0] > points[index][0])
            {
                throw new Error ("spline: positions must be in ascending order");
            }
        }
        let cacheSize = (3 + 3) * 2;
        if (typeof spline.statics === 'undefined')
        {
            spline.statics = { };
            spline.statics.cache = [ ];
            spline.statics.cacheQueue = [ ];
            for (let index = 0; index < cacheSize; index++)
            {
                spline.statics.cache.push ({ points: [ ], xs: [ ], ys: [ ], ks: [ ] });
                spline.statics.cacheQueue.push (index);
            }
        }
        let matchIndex = -1;
        for (let index = 0; index < cacheSize; index++)
        {
            let cacheIndex = spline.statics.cacheQueue[index];
            if (equalPoints (points, spline.statics.cache[cacheIndex].points))
            {
                matchIndex = index;
                break;
            }
        }
        let cache;
        if (matchIndex === -1)
        {
            let cacheIndex = spline.statics.cacheQueue.pop ();
            spline.statics.cacheQueue.unshift (cacheIndex);
            cache = spline.statics.cache[cacheIndex];
            cache.points = clonePoints (points);
            cache.xs = [ ];
            cache.ys = [ ];
            cache.ks = [ ];
            for (let pointsIndex = 0; pointsIndex < pointsCount; pointsIndex++)
            {
                cache.xs.push (points[pointsIndex][0]);
                cache.ys.push (points[pointsIndex][1]);
                cache.ks.push (1);
            }
            getNaturalKs (cache.xs, cache.ys, cache.ks);
        }
        else
        {
            let cacheIndex = spline.statics.cacheQueue[matchIndex];
            if (matchIndex !== 0)
            {
                spline.statics.cacheQueue.splice (matchIndex, 1);
                spline.statics.cacheQueue.unshift (cacheIndex);
            }
            cache = spline.statics.cache[cacheIndex];
        }
        return evalSpline (position, cache.xs, cache.ys, cache.ks, compatible);
    }
    else
    {
        throw new Error ("spline: two points or more are required");
    }
}
//
function linear (coeffs, x)
{
    let a = coeffs[0]; if (!isFinite (a)) { a = 0 };
    let b = coeffs[1]; if (!isFinite (b)) { b = 0 };
    return (a * x) + b;
}
//
function quadratic (coeffs, x)
{
    let a = coeffs[0]; if (!isFinite (a)) { a = 0 };
    let b = coeffs[1]; if (!isFinite (b)) { b = 0 };
    let c = coeffs[2]; if (!isFinite (c)) { c = 0 };
    return (a * x * x) + (b * x) + c;
}
//
function cubic (coeffs, x)
{
    let a = coeffs[0]; if (!isFinite (a)) { a = 0 };
    let b = coeffs[1]; if (!isFinite (b)) { b = 0 };
    let c = coeffs[2]; if (!isFinite (c)) { c = 0 };
    let d = coeffs[3]; if (!isFinite (d)) { d = 0 };
    return (a * x * x * x) + (b * x * x) + (c * x) + d;
}
//
function polynomial (coeffs, x)
{
    let sum = 0;
    if (Array.isArray (coeffs))
    {
        let count = coeffs.length;
        if (count > 0)
        {
            for (let degree = 0; degree < count; degree++)
            {
                sum += coeffs[count - degree - 1] * Math.pow (x, degree);
            }
        }
    }
    return sum;
}
//
function grayscale (gray)
{
    return [ gray, gray, gray ];
}
//
function rgb (red, green, blue)
{
    return [ red, green, blue ];
}
//
function hsb (hue, saturation, brightness)
{
    return colorUtils.hsvToRgb ([ hue, saturation, brightness ]);
}
//
function hsv (hue, saturation, value)
{
    return colorUtils.hsvToRgb ([ hue, saturation, value ]);
}
//
function hwb (hue, whiteness, blackness)
{
    return colorUtils.hwbToRgb ([ hue, whiteness, blackness ]);
}
//
function hsl (hue, saturation, lightness)
{
    return colorUtils.hslToRgb ([ hue, saturation, lightness ]);
}
//
function hcl (hue, chroma, luminance)
{
    return colorUtils.hclToRgb ([ hue, chroma, luminance ]);
}
//
function lch (luminance, chroma, hue)
{
    return colorUtils.hclToRgb ([ hue, chroma, luminance ]);
}
//
function lab (luminance, a, b)
{
    return colorUtils.labToRgb ([ luminance, a, b ]);
}
//
function xyz (x, y, z)
{
    return colorUtils.xyzToRgb ([ x, y, z ]);
}
//
function ycbcr (y, cb, cr)
{
    return colorUtils.ycbcrToRgb ([ y, cb, cr ]);
}
//
function cubehelix (hue, saturation, lightness)
{
    return colorUtils.cubehelixHslToRgb ([ hue, saturation, lightness ]);
}
//
function grayscale_t (gray_t)
{
    return [ gray_t * 255, gray_t * 255, gray_t * 255 ];
}
//
function rgb_t (red_t, green_t, blue_t)
{
    return rgb (red_t * 255, green_t * 255, blue_t * 255);
}
//
function hsb_t (hue_t, saturation_t, brightness_t)
{
    return colorUtils.hsvToRgb ([ hue_t, saturation_t, brightness_t ], true);
}
//
function hsv_t (hue_t, saturation_t, value_t)
{
    return colorUtils.hsvToRgb ([ hue_t, saturation_t, value_t ], true);
}
//
function hwb_t (hue_t, whiteness_t, blackness_t)
{
    return colorUtils.hwbToRgb ([ hue_t, whiteness_t, blackness_t ], true);
}
//
function hsl_t (hue_t, saturation_t, lightness_t)
{
    return colorUtils.hslToRgb ([ hue_t, saturation_t, lightness_t ], true);
}
//
function hcl_t (hue_t, chroma_t, luminance_t)
{
    return colorUtils.hclToRgb ([ hue_t, chroma_t, luminance_t ], true);
}
//
function lch_t (luminance_t, chroma_t, hue_t)
{
    return colorUtils.hclToRgb ([ hue_t, chroma_t, luminance_t ], true);
}
//
function lab_t (luminance_t, a_t, b_t)
{
    return colorUtils.labToRgb ([ luminance_t, a_t, b_t ], true);
}
//
function xyz_t (x_t, y_t, z_t)
{
    return colorUtils.xyzToRgb ([ x_t, y_t, z_t ], true);
}
//
function ycbcr_t (y_t, cb_t, cr_t)
{
    return colorUtils.ycbcrToRgb ([ y_t, cb_t, cr_t ], true);
}
//
function cubehelix_t (hue_t, saturation_t, lightness_t)
{
    return colorUtils.cubehelixHslToRgb ([ hue_t, saturation_t, lightness_t ], true);
}
//
function interpolate_colors (stops, location, color_model, smoothness = 0)
{
    let rgb;
    let components;
    let points = [ [ ], [ ], [ ] ];
    let rgbTo;
    let toRgb;
    let colorModelBase;
    let colorModelOption;
    let stopsCount = stops.length;
    if (stopsCount > 1)
    {
        if (typeof color_model === 'string')
        {
            let colorModel = color_model.toLowerCase ().split (/[^\w]+/u);
            colorModelBase = colorModel[0];
            colorModelOption = colorModel[1];
        }
        else
        {
            throw new Error ("interpolate_colors: missing interpolation color model");
        }
        if ([ "rgb", "lab", "xyz", "ycbcr" ].includes (colorModelBase))
        {
            if (colorModelOption)
            {
                throw new Error ("interpolate_colors: invalid color model option: " + colorModelOption);
            }
            switch (colorModelBase)
            {
                case "rgb":
                    rgbTo = null;
                    toRgb = null;
                    break;
                case "lab":
                    rgbTo = colorUtils.rgbToLab;
                    toRgb = colorUtils.labToRgb;
                    break;
                case "xyz":
                    rgbTo = colorUtils.rgbToXyz;
                    toRgb = colorUtils.xyzToRgb;
                    break;
                case "ycbcr":
                    rgbTo = colorUtils.rgbToYcbcr;
                    toRgb = colorUtils.ycbcrToRgb;
                    break;
            }
            for (let stop of stops)
            {
                let position = stop[0];
                rgb = colorUtils.colorToRgb (stop[1]);
                components = rgbTo ? rgbTo (rgb) : rgb;
                points[0].push ([ position, components[0] ]);
                points[1].push ([ position, components[1] ]);
                points[2].push ([ position, components[2] ]);
            }
        }
        else if ([ "hsv", "hsb", "hwb", "hsl", "hcl", "lch", "cubehelix" ].includes (colorModelBase))
        {
            switch (colorModelBase)
            {
                case "hsv":
                case "hsb":
                    rgbTo = colorUtils.rgbToHsv;
                    toRgb = colorUtils.hsvToRgb;
                    break;
                case "hwb":
                    rgbTo = colorUtils.rgbToHwb;
                    toRgb = colorUtils.hwbToRgb;
                    break;
                case "hsl":
                    rgbTo = colorUtils.rgbToHsl;
                    toRgb = colorUtils.hslToRgb;
                    break;
                case "hcl":
                case "lch":
                    rgbTo = colorUtils.rgbToHcl;
                    toRgb = colorUtils.hclToRgb;
                    break;
                case "cubehelix":
                    rgbTo = colorUtils.rgbToCubehelixHsl;
                    toRgb = colorUtils.cubehelixHslToRgb;
                    break;
            }
            let hueShifts = [ ];
            let lastEndColor;
            for (let startIndex = 0; startIndex < (stopsCount - 1); startIndex++)
            {
                let startStop = stops[startIndex];
                let startLocation = startStop[0];
                let endIndex = startIndex + 1;
                let endStop = stops[endIndex];
                let endLocation = endStop[0];
                if (startLocation > endLocation)
                {
                    throw new Error ("interpolate_colors: locations must be in ascending order");
                }
                else
                {
                    let hueShift = 0;   // Default
                    let startColor = (startIndex === 0) ? rgbTo (colorUtils.colorToRgb (startStop[1])) : lastEndColor;
                    let endColor = rgbTo (colorUtils.colorToRgb (endStop[1]));
                    if (typeof colorModelOption === 'undefined')
                    {
                        throw new Error ("interpolate_colors: missing hue mode option suffix");
                    }
                    else
                    {
                        let deltaHue;
                        // Interpolation around the hue wheel
                        switch (colorModelOption)
                        {
                            case "inc":     // Increasing
                            case "asc":     // Ascending
                                if (endColor[0] < startColor[0])
                                {
                                    hueShift = +1;
                                }
                                break;
                            case "dec":     // Decreasing
                            case "desc":    // Descending
                                if (endColor[0] > startColor[0])
                                {
                                    hueShift = -1;
                                }
                                break;
                            case "near":    // Nearest route
                            case "short":   // Shortest path
                                deltaHue = Math.abs (endColor[0] - startColor[0]);
                                if (deltaHue > 180)
                                {
                                    if (endColor[0] < startColor[0])
                                    {
                                        hueShift = +1;
                                    }
                                    else if (endColor[0] > startColor[0])
                                    {
                                        hueShift = -1;
                                    }
                                }
                                else if (deltaHue === 180)
                                {
                                    // Same as "asc" or "inc"
                                    if (endColor[0] < startColor[0])
                                    {
                                        hueShift = +1;
                                    }
                                }
                                break;
                            case "far":     // Furthest route
                            case "long":    // Longest path
                                deltaHue = Math.abs (endColor[0] - startColor[0]);
                                if (deltaHue < 180)
                                {
                                    if (endColor[0] > startColor[0])
                                    {
                                        hueShift = -1;
                                    }
                                    else if (endColor[0] < startColor[0])
                                    {
                                        hueShift = +1;
                                    }
                                }
                                else if (deltaHue === 180)
                                {
                                    // Same as "desc" or "dec"
                                    if (endColor[0] > startColor[0])
                                    {
                                        hueShift = -1;
                                    }
                                }
                                break;
                            default:
                                throw new Error ("interpolate_colors: invalid color model option: " + colorModelOption);
                                break;
                        }
                    }
                    hueShifts.push (hueShift);
                    if (startIndex === 0)
                    {
                        points[0].push ([ startLocation, startColor[0] ]);
                        points[1].push ([ startLocation, startColor[1] ]);
                        points[2].push ([ startLocation, startColor[2] ]);
                    }
                    points[0].push ([ endLocation, endColor[0] ]);
                    points[1].push ([ endLocation, endColor[1] ]);
                    points[2].push ([ endLocation, endColor[2] ]);
                    lastEndColor = endColor;
                }
            }
            for (let hueShiftIndex = 0; hueShiftIndex < hueShifts.length; hueShiftIndex++)
            {
                let hueShift = hueShifts[hueShiftIndex];
                if (hueShift > 0)
                {
                    for (let index = hueShiftIndex + 1; index < points[0].length; index++)
                    {
                        points[0][index][1] += 360;
                    }
                }
                else if (hueShift < 0)
                {
                    for (let index = hueShiftIndex + 1; index < points[0].length; index++)
                    {
                        points[0][index][1] -= 360;
                    }
                }
            }
        }
        else
        {
            throw new Error ("interpolate_colors: invalid interpolation color model: " + colorModelBase);
        }
        //
        if (typeof smoothness === 'number')
        {
            smoothness = [ smoothness, smoothness, smoothness ];
        }
        if (colorModelBase === "lch")
        {
            smoothness.reverse ();
        }
        components =
        [
            interpolate (points[0], location, smoothness[0]),
            interpolate (points[1], location, smoothness[1]),
            interpolate (points[2], location, smoothness[2])
        ];
        rgb = toRgb ? toRgb (components) : components;
    }
    else
    {
        throw new Error ("interpolate_colors: two stops or more are required");
    }
    return rgb;
}
//
function distribute_colors (colors, bounds, location, color_model, smoothness)
{
    let rgb;
    let count = colors.length;
    if (count > 1)
    {
        let min = bounds[0];
        let max = bounds[1];
        let stops = [ ];
        for (let stopIndex = 0; stopIndex < count; stopIndex++)
        {
            stops.push ([ min + ((max - min) * stopIndex / (count - 1)), colors[stopIndex] ]);
        }
        rgb = interpolate_colors (stops, location, color_model, smoothness);
    }
    else
    {
        throw new Error ("distribute_colors: invalid number of colors: " + count);
    }
    return rgb;
}
//
function segmentIndex (index, count)
{
    return Math.floor ((index + 0.5) * count / 256);
}
//
function sampleIndex (index, count, alignment)
{
    if (!alignment)
    {
        alignment = "fill";
    }
    switch (alignment.toLowerCase ())
    {
        case "f":
        case "fill":
            index = index * 255 / (count - 1);
            break;
        case "l":
        case "left":
            index = (index + 0) * 255 / count;
            break;
        case "c":
        case "center":
            index = (index + 0.5) * 255 / count;
            break;
        case "r":
        case "right":
            index = (index + 1) * 255 / count;
            break;
        default:
            throw new Error ("sampleIndex: invalid alignment: " + alignment);
            break;
    }
    return index;
}
//
function steps (index, count, alignment)
{
    if (count)
    {
        if ((count > 1) && (count <= 256))
        {
            index = sampleIndex (segmentIndex (index, count), count, alignment)
        }
        else
        {
            throw new Error ("steps: invalid number of steps: " + count);
        }
    }
    return index;
}
//
// From p5.js: https://github.com/processing/p5.js/blob/master/src/math/calculation.js
//
// Constrains a value between a minimum and maximum value.
function constrain (n, low, high)
{
    return Math.max (Math.min (n, high), low);
}
//
// Re-maps a number from one range to another.
function map (n, start1, stop1, start2, stop2, withinBounds)
{
    const newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    if (!withinBounds)
    {
        return newval;
    }
    if (start2 < stop2)
    {
        return constrain (newval, start2, stop2);
    }
    else
    {
        return constrain (newval, stop2, start2);
    }
}
//
function discrete_colors (colors, bounds, location, average)
{
    let rgb;
    if (average)
    {
        let lowIndex = Math.floor ((map (location, bounds[0], bounds[1], 0, 255) + 0.25) * colors.length / 256);
        let highIndex = Math.floor ((map (location, bounds[0], bounds[1], 0, 255) + 0.75) * colors.length / 256);
        if (lowIndex !== highIndex)
        {
            let lowXyz = colorUtils.rgbToXyz (colorUtils.colorToRgb (colors[constrain (lowIndex, 0, colors.length - 1)]));
            let highXyz = colorUtils.rgbToXyz (colorUtils.colorToRgb (colors[constrain (highIndex, 0, colors.length - 1)]));
            let averageXyz =
            [
                (lowXyz[0] + highXyz[0]) / 2,
                (lowXyz[1] + highXyz[1]) / 2,
                (lowXyz[2] + highXyz[2]) / 2
            ]
            rgb = colorUtils.xyzToRgb (averageXyz);
        }
        else
        {
            rgb = colorUtils.colorToRgb (colors[constrain (lowIndex, 0, colors.length - 1)]);
        }
    }
    else
    {
        let index = Math.floor ((map (location, bounds[0], bounds[1], 0, 255) + 0.5) * colors.length / 256);
        rgb = colorUtils.colorToRgb (colors[constrain (index, 0, colors.length - 1)]);
    }
    return rgb;
}
//
// http://www.mrao.cam.ac.uk/~dag/CUBEHELIX/cubetry.html
// https://astron-soc.in/bulletin/11June/289392011.pdf
// https://gka.github.io/chroma.js/
// https://github.com/gka/chroma.js/blob/master/src/generator/cubehelix.js
//
function cubehelix_color (t, start = 0.5, rotations = -1.5, saturation = 1, gamma = 1, lightness = [ 0, 1 ])
{
    if (typeof lightness === 'number')
    {
        lightness = [ lightness, lightness ];
    }
    const coeffs = 
    [
        [ -0.14861,  1.78277 ],
        [ -0.29227, -0.90649 ],
        [  1.97294,  0.00000 ]
    ];
    let angle = 2 * Math.PI * ((start / 3) + (rotations * t));
    let x = Math.cos (angle);
    let y = Math.sin (angle);
    let lightnessGamma = Math.pow (lerp (limit (lightness[0], 0, 1), limit (lightness[1], 0, 1), t), gamma);
    let amplitude = saturation * lightnessGamma * (1 - lightnessGamma) / 2;
    let rgb =
    [
        (lightnessGamma + (amplitude * ((coeffs[0][0] * x) + (coeffs[0][1] * y)))) * 255,
        (lightnessGamma + (amplitude * ((coeffs[1][0] * x) + (coeffs[1][1] * y)))) * 255,
        (lightnessGamma + (amplitude * ((coeffs[2][0] * x) + (coeffs[2][1] * y)))) * 255
    ];
    return rgb;
}
//
function wavelength_color (w)
{
    let red_t;
    let green_t;
    let blue_t;
    //
    if ((w >= 380) && (w <= 440))
    {
        red_t = (440 - w) / (440 - 380);
        green_t = 0;
        blue_t = 1;
    }
    else if ((w >= 440) && (w <= 490))
    {
        red_t = 0;
        green_t = (w - 440) / (490 - 440);
        blue_t = 1;
    }
    else if ((w >= 490) && (w <= 510))
    {
        red_t = 0;
        green_t = 1;
        blue_t = (510 - w) / (510 - 490);
    }
    else if ((w >= 510) && (w <= 580))
    {
        red_t = (w - 510) / (580 - 510);
        green_t = 1;
        blue_t = 0;
    }
    else if ((w >= 580) && (w <= 645))
    {
        red_t = 1;
        green_t = (645 - w) / (645 - 580);
        blue_t = 0;
    }
    else if ((w >= 645) && (w <= 780))
    {
        red_t = 1;
        green_t = 0;
        blue_t = 0;
    }
    else
    {
        red_t = 0;
        green_t = 0;
        blue_t = 0;
    }
    //
    let factor;
    //
    if ((w >= 380) && (w <= 420))
    {
        factor = 0.3 + (0.7 * (w - 380) / (420 - 380));
    }
    else if ((w >= 420) && (w <= 700))
    {
        factor = 1;
    }
    else if ((w >= 700) && (w <= 780))
    {
        factor = 0.3 + (0.7 * (780 - w) / (780 - 700));
    }
    else
    {
        factor = 0;
    }
    //
    let gamma = 0.8;
    //
    let red = (red_t > 0) ? Math.pow (red_t * factor, gamma) * 255 : 0;
    let green = (green_t > 0) ? Math.pow (green_t * factor, gamma) * 255 : 0;
    let blue = (blue_t > 0) ? Math.pow (blue_t * factor, gamma) * 255 : 0;
    //
    return [ red, green, blue ];
}
//
function rgb_color_t (rgb_t)
{
    return rgb_t.map (component => component * 255);
}
//
function rgb_colors_t (colors_t)
{
    return colors_t.map (color => color.map (component => component * 255));
}
//
function transform_color (rgb, hue_shift = 0, saturation_multiplier = 1, lightness_multiplier = 1)
{
    let hsl = colorUtils.rgbToCubehelixHsl (colorUtils.colorToRgb (rgb).map (component => limit (component, 0, 255)));
    hsl[0] += hue_shift;
    hsl[1] *= saturation_multiplier;
    hsl[2] *= lightness_multiplier;
    rgb = colorUtils.cubehelixHslToRgb (hsl);
    return rgb;
}
//
const variables =
[
    'x',
    't'
];
//
const constants =
[
    'E',
    'LN2',
    'LN10',
    'LOG2E',
    'LOG10E',
    'PI',
    'SQRT1_2',
    'SQRT2',
];
//
const functions =
[
    'abs',
    'acos',
    'asin',
    'atan',
    'atan2',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'sin',
    'sqrt',
    'tan',
    //
    'bias',
    'coserp',
    'cubic',
    'distribute',
    'gain',
    'interpolate',
    'lerp',
    'linear',
    'pchip',
    'polynomial',
    'quadratic',
    'smootherstep',
    'smoothstep',
    'spline',
    //
    'grayscale',
    'rgb',
    'hsb',
    'hsv',
    'hwb',
    'hsl',
    'hcl',
    'lch',
    'lab',
    'xyz',
    'ycbcr',
    'cubehelix',
    //
    'grayscale_t',
    'rgb_t',
    'hsb_t',
    'hsv_t',
    'hwb_t',
    'hsl_t',
    'hcl_t',
    'lch_t',
    'lab_t',
    'xyz_t',
    'ycbcr_t',
    'cubehelix_t',
    //
    'interpolate_colors',
    'distribute_colors',
    'discrete_colors',
    'cubehelix_color',
    'wavelength_color',
    //
    'rgb_color_t',
    'rgb_colors_t',
    //
    'transform_color'
];
//
module.exports = function (formula)
{
    let tokens = tokenize (formula, { comment: true });
    for (let token of tokens)
    {
        if
        (
            (token.type === 'Identifier')
            &&
            (!([...variables, ...constants, ...functions].includes (token.value)))
        )
        {
            throw new Error (`Unknown identifier: ${token.value}`);
        }
        else if (token.type === 'Keyword')
        {
            throw new Error (`Unexpected keyword: ${token.value}`);
        }
        else if (token.type === 'Null')
        {
            throw new Error (`Unexpected ${token.value}.`);
        }
    }
    //
    function traverseNodes (node, meta)
    {
        let forbiddenNodeTypes =
        [
            'AssignmentExpression',
            'BlockComment',
            'LineComment',
            'MemberExpression',
            'ObjectExpression',
            'SequenceExpression'
        ];
        if (forbiddenNodeTypes.includes (node.type))
        {
            throw new Error (`[Line\xA0${meta.start.line},\xA0Col.\xA0${meta.start.column}] to [Line\xA0${meta.end.line},\xA0Col.\xA0${meta.end.column}]: Forbidden expression: ${node.type}`);
        }
    }
    parseScript (formula, { comment: true }, traverseNodes);
    //
    let evaluateFunction = new Function (variables, constants, functions, `'use strict';\nreturn (${formula});`);
    //
    this.evaluate = function (x, t)
    {
        let result = evaluateFunction
        (
            x,
            t,
            //
            // Math properties
            Math.E,       // Euler's constant and the base of natural logarithms, approximately 2.718.
            Math.LN2,     // Natural logarithm of 2, approximately 0.693.
            Math.LN10,    // Natural logarithm of 10, approximately 2.303.
            Math.LOG2E,   // Base 2 logarithm of E, approximately 1.443.
            Math.LOG10E,  // Base 10 logarithm of E, approximately 0.434.
            Math.PI,      // Ratio of the circumference of a circle to its diameter, approximately 3.14159.
            Math.SQRT1_2, // Square root of 1/2; equivalently, 1 over the square root of 2, approximately 0.707.
            Math.SQRT2,   // Square root of 2, approximately 1.414.
            //
            // Math methods
            Math.abs,     // Returns the absolute value of a number.
            Math.acos,    // Returns the arccosine of a number.
            Math.asin,    // Returns the arcsine of a number.
            Math.atan,    // Returns the arctangent of a number.
            Math.atan2,   // Returns the arctangent of the quotient of its arguments.
            Math.ceil,    // Returns the smallest integer greater than or equal to a number.
            Math.cos,     // Returns the cosine of a number.
            Math.exp,     // Returns E^x, where x is the argument, and E is Euler's constant (2.718...), the base of the natural logarithm.
            Math.floor,   // Returns the largest integer less than or equal to a number.
            Math.log,     // Returns the natural logarithm of a number.
            Math.max,     // Returns the largest value from the numbers provided as parameters.
            Math.min,     // Returns the smallest value from the numbers provided as parameters.
            Math.pow,     // Returns base to the exponent power, that is, base^exponent.
            Math.random,  // Returns a pseudo-random number between 0 and 1.
            Math.round,   // Returns the value of a number rounded to the nearest integer.
            Math.sin,     // Returns the sine of a number.
            Math.sqrt,    // Returns the positive square root of a number.
            Math.tan,     // Returns the tangent of a number.
            //
            // Built-in functions
            //
            bias,
            coserp,
            cubic,
            distribute,
            gain,
            interpolate,
            lerp,
            linear,
            pchip,
            polynomial,
            quadratic,
            smootherstep,
            smoothstep,
            spline,
            //
            grayscale,
            rgb,
            hsb,
            hsv,
            hwb,
            hsl,
            hcl,
            lch,
            lab,
            xyz,
            ycbcr,
            cubehelix,
            //
            grayscale_t,
            rgb_t,
            hsb_t,
            hsv_t,
            hwb_t,
            hsl_t,
            hcl_t,
            lch_t,
            lab_t,
            xyz_t,
            ycbcr_t,
            cubehelix_t,
            //
            interpolate_colors,
            distribute_colors,
            discrete_colors,
            cubehelix_color,
            wavelength_color,
            //
            rgb_color_t,
            rgb_colors_t,
            //
            transform_color
        );
        return result;
    };
}
//
