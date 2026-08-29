# Goodecode

Goodecode is the open-source, Python-first authoring extension for Goodebot projects. It provides syntax support, official starter templates, authoring diagnostics, and source-first `.goode` export.

Goodecode stops at the package boundary. Goodebot imports `.goode` packages and performs proprietary runtime, simulation, hardware, safety, and deployment work. A successful Goodecode check means a project is structurally exportable; it does not certify deployability or physical behavior.

## Development

```bash
npm ci
npm test
npm run package
```

The VSIX builds without private repositories, services, credentials, or binaries. See `docs/GOODE_FORMAT.md`, `schemas/goodecode-package.schema.json`, and `docs/BOUNDARY.md`.

Issues are welcome. Pull requests and official compatibility support for modified templates are deferred while the boundary stabilizes. Apache-2.0 still permits modification and redistribution; see `LICENSE`, `NOTICE`, `CONTRIBUTING.md`, and `TRADEMARKS.md`.

The internal provider API is intentionally modding-ready while third-party provider loading remains disabled. See `docs/MODDING_ROADMAP.md`.

Goodecode and Goodebot are independent third-party projects and are not affiliated with or endorsed by VEX Robotics.
