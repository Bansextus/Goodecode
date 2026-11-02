"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { captureBrainScreen, findCaptureExecutable } = require("../src/brainCapture");
const { renderSidebar } = require("../src/sidebar");
(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "goodecode-capture-"));
  try {
    const output = path.join(root, "Brain with spaces.png");
    const helper = path.join(root, "capture-helper"); fs.writeFileSync(helper, "helper"); fs.chmodSync(helper, 0o755);
    assert.equal(findCaptureExecutable(helper), helper);
    assert.equal(findCaptureExecutable("relative-helper"), undefined);
    const png = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
    const calls = [];
    await captureBrainScreen(helper, output, async (...args) => { calls.push(args); fs.writeFileSync(output, png); });
    assert.deepEqual(calls[0][1], ["--capture-screen", output]);
    assert.equal(calls[0][2].timeout, 20000);
    await assert.rejects(captureBrainScreen(helper, output, async () => { throw new Error("No Brain"); }), /No Brain/);
    await assert.rejects(captureBrainScreen(helper, output, async () => fs.writeFileSync(output, "invalid")), /valid PNG/);
    const html = renderSidebar({ webview: { cspSource: "vscode-resource:" }, logoUri: "logo.png" });
    assert(html.includes("Goode&gt;Good")); assert(html.includes('data-command="captureBrainScreen"'));
    console.log("Brain capture tests passed.");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
