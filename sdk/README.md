# Goodecode 2 Beta — Native Screen SDK

Create a custom V5 Brain screen, author robot instructions in your preferred language, and export an editable **modded `.goode`** project for Cortex. This SDK is public Apache-2.0 code. Goodebot and the Cortex compiler/runtime are proprietary and are not included in the SDK repository.

**Developer beta: 2.0.0-beta.1.** Native rendering is not a sandbox: bugs can crash the entire program. Hardware frame rate and competition acceptance must be verified on your robot before use. Beta tooling does not convert existing profiles or replace their screens.

For the complete guide to modifying the VS Code extension itself, see [Extension modding guide](https://github.com/Bansextus/Goodecode-2-SDK/blob/main/sdk/docs/extension-modding.md).

## Start here

Requires Node 22.18+ (for TypeScript), Python 3, and Clang for the desktop preview. No npm dependencies or install scripts are needed.

```sh
node sdk/cli.js create /absolute/path/to/MyScreen
node sdk/cli.js generate /absolute/path/to/MyScreen
node sdk/cli.js preview /absolute/path/to/MyScreen
node sdk/cli.js validate /absolute/path/to/MyScreen
node sdk/cli.js export /absolute/path/to/MyScreen /absolute/path/to/MyScreen.goode
```

Open the localhost URL printed by Preview. The host runs the real compiled renderer on your Mac, supplies explicitly simulated motor telemetry, and forwards pointer events. Ctrl-C closes the host. It never activates a physical motor.

In **Goodecode 2 Beta**, the command palette exposes Create Mod Project, Generate Mod Instructions, Validate Mod, Preview Screen, and Export Modded Project. Executing adapters and native preview requires a trusted VS Code workspace. Review third-party repositories before trusting them.

## What to edit

- `renderer/screen.c`: init, frame, touch, and shutdown callbacks. Full 480 × 240 coordinates; no reserved UI strips.
- `authoring/program.py`, `.js`, or `.ts`: emit a portable instruction document on stdout.
- `goode.mod.json`: selects the renderer and language adapter; declares SDK and Cortex ABI compatibility.
- `goode.lock.json`: locks SDK, instruction schema, and screen ABI. Beta 1 renderers are dependency-free C or C++.
- `goode.instructions.json` and `src/main.goode.py`: generated, inspectable instructions and Cortex source. Regenerate after editing authoring code.
- `goode.generated.json`: generation hashes. Validation never executes authoring scripts. Packaging checks that source and instruction output are current.

The example starts without motor declarations. Add your real hardware under `configuration`; do not copy arbitrary ports onto a robot. Its IMU declaration uses port 21 for demonstration; configure an unused real port for your robot before deploying.

## Languages and the instruction contract

Set `adapter.language` to `python`, `javascript`, `typescript`, or `json` and `adapter.entry` to a file under `authoring/`. Python/JS/TS programs can use their language's normal control flow **at generation time**; they emit JSON, not firmware. Generation is an explicit developer action and may execute arbitrary repository code on your computer.

The JSON format is:

```json
{
  "schemaVersion": 1,
  "name": "My screen",
  "configuration": [
    {"op":"motor", "args":{"name":"Lift", "port":5, "gearset":"green", "brake":"hold"}},
    {"op":"imu", "args":{"name":"Drive IMU", "port":21, "required":false}}
  ],
  "autonomous": [{"op":"run_motor", "args":{"device":"Lift", "speed":30, "duration_ms":500}}],
  "driver": []
}
```

Each section contains calls with named `args` and optional ordered `positional` arguments. For example, a wait is `{"op":"wait_ms","positional":[1000],"args":{}}`. Arguments are finite JSON numbers, strings, booleans, null, or arrays. The SDK validates operation names and lowers calls into canonical Goodecode. Cortex then validates argument semantics, hardware, callbacks, and deployment. Structural validation is not a substitute for Cortex checks.

For another language, generate that JSON using its own tooling and select the `json` adapter. This avoids executing unknown compiler commands during import. Add an adapter in the SDK repository to automate generation. No programming language is interpreted on the Brain merely by naming it in the manifest.

Configuration operations: `motor`, `motor_group`, `pneumatic`, `imu`, `drivetrain_ports`, `drive_mode`.

Runtime operations: `status`, `wait_ms`, `sleep_ms`, `drive_for`, `turn_for`, `turn_to_heading`, `run_motor`, `stop`, `motor_group_command`, `pneumatic_on`, `pneumatic_off`, `pneumatic_toggle`, `tank_drive`, `arcade_drive`, `bind_motor_group`, `bind_button_sequence`. Use the matching Goodecode syntax guide for argument names and units. Other commands fail explicitly rather than being silently omitted.

## Native rendering ABI 1

`include/goode_screen.h` is the public contract. Modules export exactly these C symbols:

- `goode_screen_init(host)`: retain the stable host table; initialize local state.
- `goode_screen_frame(telemetry)`: render a complete frame; do not retain the telemetry pointer.
- `goode_screen_touch(x, y, pressed)`: update interaction state. Rendering belongs in the frame callback.
- `goode_screen_shutdown()`: release module state when the host disables an over-budget renderer. Firmware process exit otherwise releases its memory.

The host exposes clear, filled rectangle, text, and action-queue callbacks. Compose arbitrary shapes/pixels using rectangles or your own drawing algorithms. Colors are `0xRRGGBB`. Keep host calls inside the synchronous callbacks; do not spawn threads, block, sleep, or retain the display. No hardware pointers are exposed.

Telemetry contains time, field connection, mode (0 disabled, 1 autonomous, 2 driver), and up to 21 configured motors with connected state, measured RPM, and measured voltage. A missing motor has `connected=0`; zero RPM alone does not mean disconnected. The desktop preview supplies synthetic values, not Brain feedback. Native V5 uses the actual motor API.

`host->action("existing-action-id")` enqueues a Cortex screen action. The runtime dispatches it through its ordinary profile and field-control checks, never directly from the drawing callback. Beta 1 delivers these queued actions after the current autonomous function returns. It does not interrupt autonomous execution. The desktop host logs actions instead of running motors.

Aim for 30 FPS and <10 ms callback time, including init/touch/frame. The V5 host disables an over-budget renderer after it returns and restores the standard screen. This cannot preempt a hung callback or protect against invalid memory accesses. Native modules share the firmware address space and are not certified competition code.

C/C++ is the shipped renderer toolchain. Another language must produce the same freestanding ARM hard-float C ABI through a toolchain adapter added to Cortex; beta 1 deliberately rejects unknown renderer languages. It does not accept a third-party precompiled firmware image.

## Goodebot / Cortex workflow

1. Export using the beta command, then import the `.goode` into a developer build of Goodebot with native-mod support.
2. The package is marked MODDED and preserves renderer sources, authoring sources, assets, lockfile, generated instructions, and checksums. Format 2 is deliberately rejected by older Goodebot versions.
3. In the Digital Twin, choose **Run Native Mod Preview**. This runs the desktop host with simulated telemetry, not a pixel-perfect V5 font emulator.
4. Build with Cortex. It snapshots/hash-checks native sources and rebuilds the renderer into an opt-in runtime. Official projects retain the prebuilt runtime path.
5. Deploy using the normal Goodebot deployment workflow. Test disabled, autonomous, driver, and Timed Run states on hardware.

Native builds need the private Cortex developer toolchain: Rust nightly with the V5 target/build-std support, LLVM clang/llvm-ar/llvm-objcopy, and cached runtime dependencies. `GOODEBOT_NATIVE_MOD_TOOLCHAIN_ROOT` points to the developer repository root. Missing tools produce errors; ordinary released Goodebot binaries do not automatically gain native screen support. The public SDK does not distribute the private compiler. A packaged public compiler distribution remains a release prerequisite for users without developer tooling.

## Test and contribute

```sh
node --test sdk/test/sdk.test.js
```

Tests cover adapter parity, package preservation, stale output, unsafe paths, SDK incompatibility, native frames, and touch. See `docs/acceptance.md` for hardware acceptance and known beta limits. Never claim hardware verification from a desktop preview or successful ARM link alone.
