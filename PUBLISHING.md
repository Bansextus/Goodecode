# Publishing Goodecode

Official releases are produced from the public Goodecode repository after required checks pass.

1. Use Node.js 22.18 or newer.
2. Run `npm ci`, `npm test`, and `npm run package` from a clean checkout.
3. Inspect the VSIX file list and run the boundary scan before signing.
4. Tag the matching source commit and attach the source archive and SHA-256 checksum.
5. Publish the same reviewed VSIX through the official BanSextus Marketplace identity.

Marketplace credentials, signing material, private application source, and proprietary runtime artifacts must never enter this repository or its CI artifacts. Official branding and Goodebot compatibility certification apply only to maintainer-produced releases.
