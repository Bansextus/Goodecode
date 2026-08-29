# Modding-ready architecture

Goodecode is intended to support team-created templates and authoring extensions in a future release. That capability is deliberately disabled today while trust, compatibility, and support rules are defined.

The code is already organized around versioned providers:

- Template providers return a manifest and source files without receiving filesystem access.
- Authoring checks operate on the public project model rather than runtime internals.
- `.goode` remains the stable handoff regardless of which approved template created a project.
- Provider API versions are independent of package-format and extension versions.

When modding is enabled, third-party providers will require declared IDs, API versions, capabilities, provenance, and compatibility ranges. Official branding and Goodebot compatibility certification will remain separate from the right to modify Apache-2.0 source.

Until then, `THIRD_PARTY_EXTENSIONS_ENABLED` remains false and registration fails closed. Teams may inspect and fork the source, but Goodebot support covers official templates only.

## V5.1 concept: Goodebot Dev

One concept under consideration for V5.1 is a separate, proprietary Goodebot Dev application. A developer could use an editor to design a custom Brain screen, code template, and matching Digital Twin presentation. The app could compile those resources into a portable mod package, provisionally described as `.goode-<mod-name>`.

A Goodebot user would select that mod package from the normal import experience. Goodebot would install the package only after validation, then discover and import the modified `.goode` projects associated with it through the same source-first workflow used by official projects. The mod package could carry its own Digital Twin presentation while the proprietary runtime and hardware boundary remain inside Goodebot.

This is a design direction, not a released specification. The extension, filename convention, manifest, signing and trust model, permissions, compatibility rules, update behavior, sandboxing, Digital Twin API, and sharing policy are intentionally undecided. No current release loads third-party mod packages, and developers should not build against `.goode-<mod-name>` as though it were stable.
