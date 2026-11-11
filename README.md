# AutoActivity — Electron + Node.js

A Windows desktop application built with Electron, Node.js and RobotJS.

## Features

- Default 5-minute interval
- Seconds / Minutes / Hours
- Shift, Ctrl, Alt, Space, Enter, F15
- Custom keyboard key
- Mouse movement
- Start / Stop
- Countdown
- Test Action Now
- System tray
- Windows installer (`.exe`)

## Requirements

- Windows 10 or Windows 11
- Node.js 18+ recommended
- npm

## Run in development

Open Command Prompt in this folder:

```bash
npm install
npm start
```

## Build Windows installer

```bash
npm run build
```

The installer will be generated in:

```text
dist/
```

It will look similar to:

```text
AutoActivity-Setup-1.0.0.exe
```

## Notes about RobotJS

RobotJS is a native Node.js module. Electron Builder normally handles packaging it, but if a native-module rebuild is required for your particular Node/Electron environment, run:

```bash
npx electron-rebuild
```

Then run:

```bash
npm start
```

and rebuild.

## Usage

1. Open AutoActivity.
2. Leave the interval at `5 Minutes` for the requested default.
3. Select the action.
4. Click **Test Action Now**.
5. Click **START**.
6. The application performs the action at the selected interval.

The action is sent to the currently focused Windows application.

## Important

Use automation only where it is allowed. Do not use it to bypass workplace, school, service, security, or attendance controls.
