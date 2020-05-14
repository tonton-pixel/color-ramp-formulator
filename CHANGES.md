# Release Notes

This project adheres to [Semantic Versioning](https://semver.org/).

## 1.0.0-beta.8

- Renamed application to `Color Ramp Formulator`.

## 1.0.0-beta.7

- Added File menu in menu bar.
- Added Import/Export actions menu button.
- Added import of four color ramp data file formats (`.json`, `.act`, `.amp`, `.lut`), with automatic conversion to custom formula format, making use of a new `discrete_colors ()` color helper function.
- Improved handling of invalid loaded or imported data files.

## 1.0.0-beta.6

- Revamped calculations of saturation and hue in the function converting `RGB` to `CubeHelix HSL`, making use of all coefficients.
- Updated component values for examples of `cubehelix ()` and `cubehelix_t ()` in the formula format help page.
- Used 'fractional range' terminology instead of 'float range'.
- Updated formula samples.
- Added provisional reference links to the documentation help page.

## 1.0.0-beta.5

- Moved calculation of `t` (`x / 255`) out of the `colorRamp.evaluate ()` function.
- Improved error handling when calculating color ramp by using higher-level try/catch.
- Improved validity check of formulas.
- Added color helper functions `cubehelix ()`, `cubehelix_t ()`, and `cubehelix_color ()`.
- Revamped color helper functions `interpolate_colors ()` and `distribute_colors ()`:
    - Added support for `Lab`, `XYZ`, `YCbCr`, and `CubeHelix HSL` color models.
    - Added hue option as string suffix to hue-based color models.
    - Allowed smoothness to be applied to all color models, and to each color component independently.
    - Lifted restrictions on smoothness range: [0, 100].
- Used simpler, more consistent fractional range for `a` and `b` components of `Lab` color model.
- Updated formula samples accordingly.
- Added drafts pages about documentation and formula format, accessible from the `Help` menu.
- Improved display of monospaced fonts on Linux by adding "DejaVu Sans Mono" to the font stack.
- Added line breaks to generated SVG.
- Updated design of application icons.
- Updated `Electron` to version `8.2.5`.

## 1.0.0-beta.4

- Added two new color helper functions: `rgb_color_t ()` and `rgb_colors_t ()` to convert RGB colors with components expressed in fractional range `[0, 1]` to standard `[0, 255]`.
- Improved evaluation of formulas.
- Updated formula samples.
- Updated `Electron` to version `8.2.2`.

## 1.0.0-beta.3

- Added support for `HWB` (Hue, White, Black) and `Grayscale` color models.
- Added RGB colors helper function: `wavelength_color ()`.
- Improved performance of color conversions.
- Disallowed comments in formulas.
- Updated formula samples.
- Updated package keywords.

## 1.0.0-beta.2

- Renamed the RGB colors functions `distributeColors ()` and `interpolateColors ()` to `distribute_colors ()` and `interpolate_colors ()` respectively.
- Updated sample formulas accordingly.
- Allowed underscore characters in named color strings.
- Improved styling of disabled preview areas.
- Disabled resizing of text areas.
- Updated keywords in `package.json`.
- Updated screenshot in `README.md`.
- Updated release notes.

## 1.0.0-beta.1

- Initial beta release:
    - No end-user documentation.
    - No packaged release for macOS.
    - File format, syntax, and validation of formulas are not yet finalized.
    - Some features are missing, and some others may be removed later.
