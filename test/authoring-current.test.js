"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { checkProject, buildPackage } = require("../src/project");
const example = path.resolve(__dirname, "../examples/v5-physical-control");
assert.deepEqual(checkProject(example).errors, []);
assert.deepEqual(checkProject(example).warnings, []);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "goodecode-current-"));
try {
  fs.cpSync(example, root, { recursive: true });
  const sourcePath = path.join(root, "src/main.goode.py");
  const source = fs.readFileSync(sourcePath, "utf8");
  const output = path.join(root, "example.goode");
  buildPackage({ root, outputPath: output, extensionVersion: "1.0.1" });
  assert.equal(fs.readFileSync(output).readUInt32LE(0), 0x04034b50);
  fs.writeFileSync(sourcePath, source.replace("def competition_driver_control(", "def removed_driver("));
  assert(checkProject(root).errors.some((e) => e.includes("competition_driver_control is not declared")));
  fs.writeFileSync(sourcePath, source.replace("ports=[-3, -4]", "ports=[-1, -4]"));
  assert(checkProject(root).errors.some((e) => e.includes("duplicates: 1")));
  fs.writeFileSync(sourcePath, source.replace("def configure_robot(", "def removed_robot("));
  assert(checkProject(root).errors.some((e) => e.includes("configure_robot is missing")));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("Current program-profile authoring and export tests passed.");
