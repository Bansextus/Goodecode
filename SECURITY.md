# Goodecode Security

Goodecode update/install behavior must not bypass macOS Gatekeeper. The extension must not delete `com.apple.quarantine`, run `spctl --master-disable`, or execute unverified downloads.

Public Goodebot downloads are distributed through `https://goodebot.net/download`, outside the extension. Published desktop releases should use HTTPS, release manifests, SHA-256 verification, app bundle validation, code-signature verification, and Gatekeeper assessment.
