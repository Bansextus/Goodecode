# Goodecode — extension development and modding guide

Goodecode is the open-source authoring extension for Goodebot. Stable **1.0.2** authors Python-first projects. **Goodecode 2.0.0-beta.1** adds a repository SDK for custom native Brain screens and language adapters, packaged as modded `.goode` projects.

The public extension and SDK stop at the package boundary. Goodebot imports projects and Cortex performs proprietary compilation and deployment. Export success does **not** certify hardware operation, competition behavior, or native-code safety. Goodebot and Cortex source are not part of the public SDK.

## Contents

1. [Choose how to mod](#choose-how-to-mod)
2. [Run the extension from source](#run-the-extension-from-source)
3. [Build a separate beta VSIX](#build-a-separate-beta-vsix)
4. [Create your first screen mod](#create-your-first-screen-mod)
5. [Author in Python, JavaScript, TypeScript, or another language](#author-in-python-javascript-typescript-or-another-language)
6. [Customize native Brain rendering](#customize-native-brain-rendering)
7. [Change the extension itself](#change-the-extension-itself)
8. [Validate, export, preview, and deploy](#validate-export-preview-and-deploy)
9. [Test and troubleshoot](#test-and-troubleshoot)
10. [Compatibility, redistribution, and boundaries](#compatibility-redistribution-and-boundaries)

## Choose how to mod

| Goal | Recommended starting point |
|---|---|
| Make your own Brain screen | `sdk/examples/dashboard/renderer/screen.c` |
| Change robot instructions using another language | `sdk/examples/dashboard/authoring/` |
| Add language generation support | `sdk/index.js` and `sdk/schemas/` |
| Add editor commands or change the sidebar | `extension.js`, `src/modCommands.js`, `src/sidebar.js` |
| Change syntax colors or snippets | `syntaxes/`, `snippets/`, `language-configuration.json` |
| Change package contents | `src/project.js`, `src/zip.js`, package schemas, and matching importer |
| Add a new native renderer toolchain | SDK C ABI plus private Cortex compiler integration; extension changes alone are insufficient |

A screen project does **not** require forking/rebuilding the extension. Fork the extension when you want to change its authoring experience, checks, commands, or supported adapter implementations.

## Run the extension from source

Clone the public [Goodecode repository](https://github.com/Bansextus/Goodecode) and open its extension root in VS Code. Use the branch/release containing these beta SDK files; older public releases do not contain them. In the larger Goodebot developer checkout, this root is `02-goodecode-extension/`.

For the beta extension sources:

```sh
git clone --branch codex/goodecode-2-beta https://github.com/Bansextus/Goodecode.git
cd Goodecode
```

The checkout retains the stable base manifest; use `scripts/build-beta.js` below to create the separate beta extension identity.

Install Node, npm, Python 3, and VS Code. Native desktop preview also needs Clang; on macOS this is available with Xcode Command Line Tools. TypeScript examples require Node **22.18 or newer** for native type stripping.

```sh
npm ci
npm test
```

Launch an Extension Development Host from VS Code:

```sh
code --extensionDevelopmentPath=/absolute/path/to/extension-root /absolute/path/to/test-workspace
```

You can also create a VS Code extension-host launch configuration and press F5. Keep a disposable test workspace for authoring experiments. Do not point template-creation tests at a project you need to preserve.

For stable authoring, use **Goodecode: Create Goodecode**, **Check Project**, and **Export .goode**. Stable 1.0.2 includes **Goode>Good**, the syntax guide, and **Capture Brain Screen**; capture needs the updated Goodebot USB helper and does not deploy/start a robot program.

## Build a separate beta VSIX

The beta build script copies public extension sources and SDK into a new directory. It gives the extension a separate identity (`BanSextus.goodecode-beta`), beta command namespace, and activity container. The stable package version is not rewritten.

```sh
node scripts/build-beta.js /absolute/path/to/beta-extension
cd /absolute/path/to/beta-extension
npx @vscode/vsce package --no-dependencies --out /absolute/path/to/goodecode-2.0.0-beta.1.vsix
code --install-extension /absolute/path/to/goodecode-2.0.0-beta.1.vsix
```

Run these commands from the extension root, not the outer Goodebot monorepo. Use a fresh output directory for reproducible builds. Installing a local VSIX and publishing to the Marketplace are different actions. A public Marketplace beta release must satisfy Marketplace version/channel requirements; this prerelease VSIX is the developer beta artifact.

## Create your first screen mod

Use **Goodecode 2 Beta: Create Mod Project** and choose an empty directory. Existing projects are never overwritten. Alternatively:

```sh
node sdk/cli.js create /absolute/path/to/MyScreen
node sdk/cli.js generate /absolute/path/to/MyScreen
node sdk/cli.js preview /absolute/path/to/MyScreen
```

Preview prints a localhost URL. Open it to see the compiled C renderer animate with simulated motor telemetry. Click the display to switch pages. It uses the same C callback interface as V5, with a desktop font approximation.

The standalone public [Goodecode 2 SDK repository](https://github.com/Bansextus/Goodecode-2-SDK) uses the same `node sdk/cli.js ...` commands. The example contains an IMU declaration on port 21 for demonstration and no motors. Set hardware to your actual wiring before deployment.

### Project layout

```text
MyScreen/
  goodecode.toml             # project name, canonical entrypoint, target
  goode.mod.json            # mod ID, SDK, adapters, Cortex/renderer ABI
  goode.lock.json           # exact dependency-free beta contract
  authoring/program.py      # Python generator (default)
  authoring/program.js      # equivalent JavaScript generator
  authoring/program.ts      # equivalent TypeScript generator
  renderer/screen.c         # your native screen implementation
  goode.instructions.json   # generated common instruction document
  goode.generated.json      # generation hashes
  src/main.goode.py         # generated canonical Cortex source
  assets/                   # optional source assets
```

Edit `authoring/` and `renderer/`; regenerate robot instructions after changing authoring. Generated files remain readable but manual edits cause stale-output checks to fail. Keep the complete directory in Git, not only the `.goode` export.

## Author in Python, JavaScript, TypeScript, or another language

`goode.mod.json` chooses an adapter:

```json
"adapter": {"language":"javascript", "entry":"authoring/program.js"}
```

Python, JavaScript, and TypeScript generators print **one JSON document to stdout**. Put logs on stderr. A generator is an ordinary program running on your computer: its loops/functions create instructions at build time, not at runtime on the Brain.

The common instruction document looks like this:

```json
{
  "schemaVersion":1,
  "name":"My Robot",
  "configuration":[
    {"op":"motor","args":{"name":"Lift","port":5,"gearset":"green","brake":"hold"}},
    {"op":"imu","args":{"name":"Drive IMU","port":21,"required":false}}
  ],
  "autonomous":[
    {"op":"status","positional":["Lifting"],"args":{}},
    {"op":"run_motor","args":{"device":"Lift","speed":30,"duration_ms":500}},
    {"op":"wait_ms","positional":[250],"args":{}}
  ],
  "driver":[]
}
```

`positional` is optional and preserves argument order; `args` contains named arguments. Values must be finite JSON literals or arrays. Match Goodecode command signatures: for example `wait_ms` takes one positional duration in milliseconds, and distance commands take the distance positionally. The SDK validates structure and allowed operations; Cortex validates the actual command semantics and hardware configuration.

For another language (Rust, C#, Java, etc.), write a generator that produces this document, save it under `authoring/`, and select the `json` adapter. This is the initial language-neutral interface. To automate a language, add its runner to the SDK manifest validator and generator dispatch, update its schema, and add equivalence tests. Never use shell interpolation to build adapter commands. Keep execution explicit, bounded, and restricted to trusted workspaces.

This does not mean arbitrary language runtimes are installed on the Brain. Authoring languages generate common instructions; renderer languages must compile to the supported native C ABI.

## Customize native Brain rendering

The source contract is [`sdk/include/goode_screen.h`](sdk/include/goode_screen.h). Implement all four callbacks:

```c
#include "goode_screen.h"
static const GoodeScreenHost *host;
void goode_screen_init(const GoodeScreenHost *h) { host = h; }
void goode_screen_frame(const GoodeTelemetry *t) {
    host->clear(0x061525);
    host->text(20, 24, "My robot", 0xFFD454);
    if (t->motor_count && t->motors[0].connected)
        host->rect(20, 70, (int)t->motors[0].rpm, 12, 0x26D8F4);
}
void goode_screen_touch(int32_t x, int32_t y, uint32_t pressed) {
    /* Update your own page/button state. */
}
void goode_screen_shutdown(void) { host = 0; }
```

Coordinates span **480 × 240**. Colors are RGB hex. The host exposes clearing, rectangles, text, and queued actions. You can create arbitrary pixel/shape algorithms using rectangles, including one-pixel rectangles. Beta 1 ships dependency-free C/C++ tooling; adding another native renderer language requires a freestanding ARM hard-float toolchain adapter and matching Cortex integration.

Telemetry provides time, mode, field connection, and configured motors' measured RPM/voltage. `connected=0` explicitly indicates unavailable hardware. Do not treat commands or simulated preview data as proof of actual motion. The V5 host reads real motor telemetry.

Do not retain telemetry/display pointers, block, sleep, or create threads in callbacks. Render a complete frame and keep total callback time under 10 ms; target 30 FPS. An over-budget callback is disabled after it returns, restoring the standard screen. Native code is **not sandboxed**: invalid pointers or an infinite loop can crash/freeze the whole program.

`host->action("existing-action-id")` queues an existing Cortex screen action. It does not directly operate motors or bypass field-control restrictions. Actions requested during a blocking autonomous function are dispatched after that function returns. Preview logs these actions rather than activating hardware.

## Change the extension itself

### Commands

Register ordinary commands in `extension.js` and contribute their titles/IDs in `package.json`. Beta-only commands live in `src/modCommands.js` and are activated only by the generated beta package. Use `context.subscriptions` for cleanup, including preview processes and event handlers.

When adding a webview action, add it to the explicit action-to-command allowlist; do not execute arbitrary command IDs received from webview messages. Escape user text, use a restrictive content security policy, and expose only required local resources. Check workspace trust before executing language adapters, compiling, or running native previews.

### Sidebar and syntax

`src/sidebar.js` builds the sidebar HTML. Change its layout/styles without duplicating the VS Code editor. `syntaxes/` owns token scopes; `snippets/` provides insertion templates. Add tests for new actions and do not assume a visual change updates the compiler contract.

### Templates and providers

`src/extensions.js` contains the legacy official template-provider API. Third-party provider registration stays disabled in stable releases. Goodecode 2 mod projects use the repository SDK; enabling arbitrary provider loading is a separate trust/compatibility feature. Do not simply flip the stable feature flag and claim runtime support.

### Checks and export

`src/project.js` provides stable project checks and ZIP packaging. `sdk/index.js` validates mod manifests, adapters, generated output, and format 2 export. `src/zip.js` writes packages. Keep paths relative, reject symlinks, enforce size limits, and checksum every included project file. Never silently drop an unsupported command to make an export pass.

A modded package includes source, authoring files, renderer files, lockfile, generated instructions, assets, and checksums. Its metadata says `formatVersion:2` and `modded:true`. Normal official exports remain format 1. Older importers should reject a mod package explicitly instead of loading it as an ordinary project.

## Validate, export, preview, and deploy

```sh
node sdk/cli.js generate /absolute/path/to/MyScreen
node sdk/cli.js validate /absolute/path/to/MyScreen
node sdk/cli.js export /absolute/path/to/MyScreen /absolute/path/to/MyScreen.goode
```

Import the result into a developer build of Goodebot with native-mod support. **Run Native Mod Preview** in the Digital Twin embeds the compiled desktop host. It supplies synthetic telemetry; desktop and V5 text rendering are not identical.

Cortex snapshots and hashes the native source, rebuilds the renderer into an opt-in runtime, installs the validated robot payload, and uses the existing upload path. Modifying the renderer invalidates build freshness. An official project keeps its existing prebuilt-runtime workflow.

Native compilation requires the **private Cortex developer toolchain**, including Rust nightly, cached V5 runtime dependencies, and LLVM clang/llvm-ar/llvm-objcopy. `GOODEBOT_NATIVE_MOD_TOOLCHAIN_ROOT` points to its repository root. Missing tooling gives a build error; the public extension does not include the proprietary compiler. A packaged compiler distribution for users without developer tooling is not part of this local developer beta.

Use ordinary Goodebot deployment and test on a connected Brain. Verify Practice, Competition, Timed Run, disable, auton-to-driver transitions, missing motors, and touch while rendering. Do not equate a desktop preview or successful ARM link with completed hardware acceptance.

## Test and troubleshoot

```sh
npm test
node --test sdk/test/sdk.test.js
```

SDK tests exercise Python/JS/TS parity, preserved package files, stale output, invalid ABI, symlinks, unsupported instructions, native animation, and touch. The private app additionally tests import, source snapshots, and Cortex bundles. See [`sdk/docs/acceptance.md`](sdk/docs/acceptance.md).

| Problem | Fix |
|---|---|
| Mod commands missing | Install the separate beta VSIX and use its command-palette entries. |
| SDK files missing after cloning | Use the beta source release; older public versions do not contain the SDK. |
| Create refuses the directory | Choose an empty folder; it protects existing project files. |
| Generated source is stale | Run Generate in a trusted workspace after editing authoring code. |
| TypeScript fails to execute | Use external Node 22.18+ and the supported dependency-free example. |
| Invalid wait duration | Emit `positional:[milliseconds]`, not a keyword duration. |
| Native header missing | Compile through the SDK host/Cortex bridge; it supplies the include path. |
| Goodebot rejects the package | Use the developer build supporting format 2 and the exact beta SDK/ABI. |
| Compiler/toolchain not found | Install Cortex developer tooling; a stable runtime binary cannot contain your renderer. |
| Preview and Brain fonts differ | Desktop preview uses a small approximation; check final layout on V5. |
| Native renderer falls back | Reduce callback work below the frame budget and inspect the renderer. |
| Motors fail while the screen animates | Check hardware, field state, and Cortex diagnostics; rendering success is independent of motor output. |

## Compatibility, redistribution, and boundaries

Extension, SDK, package-format, and renderer-ABI versions are separate. The beta manifest pins `2.0.0-beta.1`, `v5-native-screen-1`, and screen ABI 1; incompatible versions fail explicitly. Existing profiles are not automatically converted.

The extension and public SDK use Apache-2.0; preserve `LICENSE` and applicable notices. Forks must not imply official Goodebot compatibility certification. See `NOTICE`, `TRADEMARKS.md`, `CONTRIBUTING.md`, and [`docs/BOUNDARY.md`](docs/BOUNDARY.md). Public contributions and support follow those files; a modified VSIX is not automatically an official release.

Goodecode and Goodebot are independent third-party projects, not affiliated with or endorsed by VEX Robotics.
