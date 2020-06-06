# <img src="icons/icon-256.png" width="64px" align="center" alt="Color Ramp Formulator icon"> COLOR RAMP FORMULATOR

**Color Ramp Formulator** is an open-source desktop application used to generate algorithmically-defined color ramps, making use of formulas.

This application is built with [Electron](https://www.electronjs.org/), and works on macOS, Linux and Windows operating systems.

<img src="screenshots/color-ramp-formulator.png" width="675" alt="Color Ramp Formulator screenshot">

## Building

You'll need [Node.js](https://nodejs.org) (which comes with [npm](http://npmjs.com/)) installed on your computer in order to build this application.

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

**Note**: to use the clone method, the core tool [Git](https://git-scm.com/) must also be installed.

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
For instance, running the following command (once the dependencies are installed) will create a `Color Ramp Formulator.app` version for macOS:

```bash
# Build macOS (Darwin) application
npm run build-darwin
```

## Using

You can [download the latest release](https://github.com/tonton-pixel/color-ramp-formulator/releases) for macOS.

## License

The MIT License (MIT).

Copyright © 2020 Michel MARIANI.
