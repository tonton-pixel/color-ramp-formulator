# <img src="icons/icon-256.png" width="64px" align="center" alt="Color Ramp Formulator icon"> COLOR RAMP FORMULATOR

**Color Ramp Formulator** is an open-source desktop application used to generate algorithmically-defined **color ramps**, making use of **formulas**.

This application is built with [Electron](https://www.electronjs.org/), and works on macOS, Linux and Windows operating systems.

<img src="screenshots/color-ramp-formulator-color-table.png" width="960" alt="Color Ramp Formulator (Color Table) screenshot">

<img src="screenshots/color-ramp-formulator-daibutsu.png" width="960" alt="Color Ramp Formulator (Daibutsu) screenshot">

<img src="screenshots/color-ramp-formulator-heightmap.png" width="960" alt="Color Ramp Formulator (Heightmap) screenshot">

## Examples

### CubeHelix (Destiny)

<p><img src="images/cubehelix-destiny-curves-map.svg" alt="CubeHelix (Destiny) Curves Map"></p>
<p><img src="images/cubehelix-destiny-linear-gradient.svg" alt="CubeHelix (Destiny) Linear Gradient"></p>

```javascript
cubehelix_color (1 - t, 0, 0.4, 0.8, 1, [ 0.15, 0.85 ])
```

### Diverging

<p><img src="images/diverging-curves-map.svg" alt="Diverging Curves Map"></p>
<p><img src="images/diverging-linear-gradient.svg" alt="Diverging Linear Gradient"></p>

```javascript
rgb_t
(
    cos ((t - 2/6) * PI),
    cos ((t - 3/6) * PI),
    cos ((t - 4/6) * PI)
)
```

### Fancy (Ternary)

<p><img src="images/fancy-ternary-curves-map.svg" alt="Fancy (Ternary) Curves Map"></p>
<p><img src="images/fancy-ternary-linear-gradient.svg" alt="Fancy (Ternary) Linear Gradient"></p>

```javascript
rgb
(
    (x < 127.5) ? 255 - (2 * x) : (2 * x) - 255,
    (x < 127.5) ? 1.5 * x : 127.5 + (0.5 * x),
    (x < 127.5) ? 127.5 + (0.5 * (255 - x)) : 1.5 * (255 - x)
)
```

### Green Sequential (Discrete)

<p><img src="images/green-sequential-discrete-curves-map.svg" alt="Green Sequential (Discrete) Curves Map"></p>
<p><img src="images/green-sequential-discrete-linear-gradient.svg" alt="Green Sequential (Discrete) Linear Gradient"></p>

```javascript
discrete_colors
(
    [
        "#085A32",
        "#118649",
        "#18A85A",
        "#52B974",
        "#9ECF8A",
        "#D2E3A2",
        "#F0F1BA",
        "#F7F8E5"
    ],
    [ 0, 255 ], x
)
```

### Iron (YCbCr)

<p><img src="images/iron-ycbcr-curves-map.svg" alt="Iron (YCbCr) Curves Map"></p>
<p><img src="images/iron-ycbcr-linear-gradient.svg" alt="Iron (YCbCr) Linear Gradient"></p>

```javascript
ycbcr_t
(
    lerp (0.059, 0.886, t),
    cubic ([ 5.99477, -8.68926, 2.53768, 0.550188 ], t),
    cubic ([ 0.683558, -2.49828, 1.94276, 0.383144 ], t)
)
```

### Navajo White (Transformed)

<p><img src="images/navajo-white-transformed-curves-map.svg" alt="Navajo White (Transformed) Curves Map"></p>
<p><img src="images/navajo-white-transformed-linear-gradient.svg" alt="Navajo White (Transformed) Linear Gradient"></p>

```javascript
transform_color
(
    "navajo_white",
    0, lerp (1, 2, t), lerp (1, 1/3, t)
)
```

### Parakeet (CubeHelix)

<p><img src="images/parakeet-cubehelix-curves-map.svg" alt="Parakeet (CubeHelix) Curves Map"></p>
<p><img src="images/parakeet-cubehelix-linear-gradient.svg" alt="Parakeet (CubeHelix) Linear Gradient"></p>

```javascript
interpolate_colors
(
    [
        [ 0/3, cubehelix (260, 60, 35) ],
        [ 2/3, cubehelix (80, 120, 75) ],
        [ 3/3, "gold" ]
    ],
    t,
    "cubehelix-dec", [ 100, 0, 0 ]
)
```

### Radiancy (HSL)

<p><img src="images/radiancy-hsl-curves-map.svg" alt="Radiancy (HSL) Curves Map"></p>
<p><img src="images/radiancy-hsl-linear-gradient.svg" alt="Radiancy (HSL) Linear Gradient"></p>

```javascript
distribute_colors
(
    [ "#2A4858", "#FAFA6E", "#2A4858" ],
    [ 0, 1 ], t,
    "hsl-far", [ 0, 100, 0 ]
)
```

### Two-Sided Color Bar

<p><img src="images/two-sided-color-bar-curves-map.svg" alt="Two-Sided Color Bar Curves Map"></p>
<p><img src="images/two-sided-color-bar-linear-gradient.svg" alt="Two-Sided Color Bar Linear Gradient"></p>

```javascript
hsv
(
    t < 0.5 ? lerp (240, 120, t) : lerp (60, -60, t - 0.5),
    100,
    100
)
```

### Yellow to Blue

<p><img src="images/yellow-to-blue-curves-map.svg" alt="Yellow to Blue Curves Map"></p>
<p><img src="images/yellow-to-blue-linear-gradient.svg" alt="Yellow to Blue Linear Gradient"></p>

```javascript
hcl_t
(
    1/9 + 1/6 + (t / 2),
    0.5,
    1 - pow (t, 1.5)
)
```

### Yellow to Red (Wavelengths)

<p><img src="images/yellow-to-red-wavelengths-curves-map.svg" alt="Yellow to Red (Wavelengths) Curves Map"></p>
<p><img src="images/yellow-to-red-wavelengths-linear-gradient.svg" alt="Yellow to Red (Wavelengths) Linear Gradient"></p>

```javascript
wavelength_color (lerp (580, 645, t))
```

## Using

You can [download the latest release](https://github.com/tonton-pixel/color-ramp-formulator/releases) for macOS.

## Building

You'll need [Node.js](https://nodejs.org/) (which comes with [npm](https://www.npmjs.com/)) installed on your computer in order to build this application.

### Clone method

```bash
# Clone the repository
git clone https://github.com/tonton-pixel/color-ramp-formulator
# Go into the repository
cd color-ramp-formulator
# Install dependencies
npm install
# Run the application
npm start
```

**Note**: to use the clone method, the core tool [git](https://www.git-scm.com/) must also be installed.

### Download method

If you don't wish to clone, you can [download the source code](https://github.com/tonton-pixel/color-ramp-formulator/archive/master.zip), unZip it, then directly run the following commands from a Terminal opened at the resulting `color-ramp-formulator-master` folder location:

```bash
# Install dependencies
npm install
# Run the application
npm start
```

### Packaging

Several scripts are also defined in the `package.json` file to build OS-specific bundles of the application, using the simple yet powerful [Electron Packager](https://github.com/electron-userland/electron-packager) Node module.\
For instance, running the following command (once the dependencies are installed) will create the `Color Ramp Formulator.app` version for macOS:

```bash
# Build macOS (Darwin) application
npm run build-darwin
```

## License

The MIT License (MIT).

Copyright © 2020 Michel Mariani.
