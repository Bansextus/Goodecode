"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { checkProject, buildPackage, safeRelativePath } = require("../src/project");

assert.equal(safeRelativePath("src/main.goode.py"), true);
assert.equal(safeRelativePath("../private.py"), false);
assert.equal(safeRelativePath("/tmp/private.py"), false);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "goodecode-public-test-"));
fs.mkdirSync(path.join(root, "src"));
fs.writeFileSync(path.join(root, "goodecode.toml"), 'name = "Test Robot"\nentry = "src/main.goode.py"\ntarget = "compatible-v5"\n');
fs.writeFileSync(path.join(root, "src/main.goode.py"), `# @goodecode.template: 2.1
def configure_project(ctx): pass
def configure_robot(ctx): pass
def configure_autonomous(ctx):
    ctx.auton_slot(name="One")
    ctx.auton_slot(name="Two")
    ctx.auton_slot(name="Three")
    ctx.auton_slot(name="Four")
def configure_controls(ctx): pass
`);
assert.deepEqual(checkProject(root).errors, []);
const output = path.join(root, "Test-Robot.goode");
buildPackage({ root, outputPath: output, extensionVersion: "test" });
assert.equal(fs.readFileSync(output).readUInt32LE(0), 0x04034b50, ".goode must be a ZIP archive");

const publicRoot = path.resolve(__dirname, "..");
for (const relative of ["extension.js", "src", "test", "README.md", "package.json"]) {
  const target = path.join(publicRoot, relative);
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target, { recursive: true }).map(String).filter((item) => fs.statSync(path.join(target, item)).isFile()).map((item) => path.join(target, item))
    : [target];
  for (const file of files) {
    if (file === __filename) continue;
    if (/node_modules|\.vsix$/.test(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(text, /goodecode_cortex|vendor\/goodecode-cortex|deploymentContract|runtimeManifest/, `private boundary leak in ${file}`);
  }
}
console.log("Public Goodecode boundary tests passed.");
