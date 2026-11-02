## 1.0.2

- Sidebar tagline: Goode>Good.
- Updated the syntax guide for current profiles, movement geometry, IMU fallback, and custom sensor functions.
- Added Capture Brain Screen: save a PNG from the USB-connected V5 Brain and open it in VS Code. Requires the updated Goodebot capture helper.

## 1.0.1

- Accept current Practice/Competition program profiles during authoring checks and export.
- Check declared profile callbacks without requiring the legacy four-slot template.
- Include motor-group ports in duplicate-port checks.
- Include the validated physical V5 motor/pneumatic example.

# Changelog

## 1.0.0

- Promotes the Goodecode package and Goodebot handoff contract to 1.0.
- Keeps deterministic import compatibility for packages exported by 0.0.68.

## 0.0.68

- Establishes Goodecode as a standalone Apache-2.0 authoring extension.
- Adds structural checks and the ZIP-compatible `.goode` source package.
- Moves runtime, simulation, hardware, safety, and deployment responsibilities behind Goodebot import.
- Adds a versioned provider seam for future modding while third-party loading remains disabled.
