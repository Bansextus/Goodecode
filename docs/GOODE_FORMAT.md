# `.goode` source package format

Format version 1 is a ZIP-compatible archive. Paths are relative, use `/`, and may not be absolute or contain `.` or `..` components.

Required entries are `goodecode.json`, `checksums.json`, `goodecode.toml`, and the source entrypoint named by `goodecode.json`. Checksums use SHA-256.

Runtime output, deployment contracts, device information, credentials, debug maps, and generated runtime code are prohibited. Newer unsupported format versions must be rejected without extraction.
