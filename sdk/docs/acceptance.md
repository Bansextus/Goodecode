# Beta acceptance checklist

Automated checks available in the developer repository:

- SDK Python/JS/TS parity and canonical generation.
- Mod format 2 ZIP and checksums; official format 1 remains unchanged.
- Reject stale generated sources, invalid ABI, unsupported operations, path traversal and symlinks.
- Compile actual C renderer against desktop host; assert animated frames and touch changes.
- Swift import, snapshot freshness, malformed manifests, Cortex bundle and final V5 artifact.
- Build Cortex with and without the native-screen feature; keep stable prebuilt binary untouched.

Hardware acceptance (requires a connected V5 Brain and controller):

1. Deploy a native mod through Goodebot, start it, verify full-screen output and touch page changes.
2. With motors securely lifted, compare actual measured RPM/voltage against displayed values. Disconnect one motor; verify disconnected status and continuation on others.
3. Verify Practice standalone driver, Start/chord autonomous, and Timed Run.
4. Verify Competition disabled → autonomous → driver transitions and physical field disable immediately stopping outputs.
5. Measure frame callback latency and frame cadence during motor commands/autonomous waits; target 30 FPS and <10 ms callbacks.
6. Use a deliberately slow *returning* renderer to verify fallback. Never deliberately hang firmware with motors enabled.

Status for this implementation: desktop and ARM tests are recorded by the implementation run. No hardware acceptance is implied; no Brain was visible over USB when work began.

Known limits: dependency-free C/C++ renderer tooling, no native process isolation, no cross-language renderer compiler plugins yet, actions queued during blocking auton execute after it returns, desktop text uses a small preview font rather than the V5 font, and no automatic production app/toolchain distribution.
