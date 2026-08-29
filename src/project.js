"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { writeZip } = require("./zip");

const FORMAT_VERSION = 1;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;

function safeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 240
    && !value.startsWith("/") && !value.startsWith("~") && !value.includes("\\")
    && value.split("/").every((part) => part && part !== "." && part !== "..");
}

function manifestValue(text, key) {
  return text.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`, "m"))?.[1]?.trim() || "";
}

function checkProject(root) {
  const errors = [];
  const warnings = [];
  const manifestPath = path.join(root, "goodecode.toml");
  if (!fs.existsSync(manifestPath)) return { errors: ["goodecode.toml is required."], warnings, files: [] };
  const manifest = fs.readFileSync(manifestPath, "utf8");
  const entry = manifestValue(manifest, "entry") || "src/main.goode.py";
  if (!safeRelativePath(entry)) errors.push("The manifest entry must be a safe relative path.");
  const entryPath = path.resolve(root, entry);
  if (!entryPath.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(entryPath)) errors.push(`Missing source entrypoint: ${entry}.`);
  const source = fs.existsSync(entryPath) ? fs.readFileSync(entryPath, "utf8") : "";
  for (const fn of ["configure_project", "configure_robot", "configure_autonomous", "configure_controls"]) {
    if (!new RegExp(`^\\s*def\\s+${fn}\\s*\\(`, "m").test(source)) errors.push(`Required function ${fn} is missing.`);
  }
  const slots = [...source.matchAll(/ctx\.auton_slot\s*\(/g)].length;
  if (slots !== 4) errors.push(`Canonical projects require exactly four autonomous slots; found ${slots}.`);
  const ports = [...source.matchAll(/\bport\s*=\s*(-?\d+)/g)].map((match) => Math.abs(Number(match[1])));
  const duplicates = [...new Set(ports.filter((port, index) => ports.indexOf(port) !== index))];
  if (duplicates.length) errors.push(`Each physical Smart Port may be declared once; duplicates: ${duplicates.join(", ")}.`);
  const referencedAssets = [...source.matchAll(/["'](assets\/[A-Za-z0-9._/-]+)["']/g)].map((match) => match[1]);
  for (const asset of new Set(referencedAssets)) {
    if (!safeRelativePath(asset) || !fs.existsSync(path.join(root, asset))) errors.push(`Missing referenced asset: ${asset}.`);
  }
  if (!/@goodecode\.template:\s*2\.1/.test(source)) warnings.push("The source does not declare canonical template 2.1.");
  return { errors, warnings, entry, manifest, source };
}

function sha256(data) { return crypto.createHash("sha256").update(data).digest("hex"); }

function collectProjectFiles(root) {
  const files = [];
  for (const topLevel of ["src", "assets"]) {
    const base = path.join(root, topLevel);
    if (!fs.existsSync(base)) continue;
    const visit = (directory) => {
      for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, item.name);
        if (item.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${path.relative(root, absolute)}.`);
        if (item.isDirectory()) visit(absolute);
        else if (item.isFile()) files.push({ path: path.relative(root, absolute).split(path.sep).join("/"), data: fs.readFileSync(absolute) });
      }
    };
    visit(base);
  }
  return files;
}

function buildPackage({ root, outputPath, extensionVersion }) {
  const result = checkProject(root);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const name = manifestValue(result.manifest, "name") || path.basename(root);
  const targetFamily = manifestValue(result.manifest, "target") || "compatible-v5";
  const files = [{ path: "goodecode.toml", data: Buffer.from(result.manifest) }, ...collectProjectFiles(root)];
  for (const file of files) if (file.data.length > MAX_FILE_BYTES) throw new Error(`${file.path} exceeds the 5 MiB file limit.`);
  const total = files.reduce((sum, file) => sum + file.data.length, 0);
  if (total > MAX_PACKAGE_BYTES) throw new Error("Project exceeds the 25 MiB package limit.");
  const metadata = {
    formatVersion: FORMAT_VERSION,
    project: { name, entrypoint: result.entry, templateVersion: "2.1", targetFamily },
    createdBy: { tool: "Goodecode VS Code Extension", version: extensionVersion },
  };
  const checksums = Object.fromEntries(files.map((file) => [file.path, sha256(file.data)]));
  writeZip(outputPath, [
    { path: "goodecode.json", data: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`) },
    { path: "checksums.json", data: Buffer.from(`${JSON.stringify({ algorithm: "sha256", files: checksums }, null, 2)}\n`) },
    ...files,
  ]);
  return { ...result, metadata, outputPath };
}

module.exports = { FORMAT_VERSION, MAX_FILE_BYTES, MAX_PACKAGE_BYTES, safeRelativePath, checkProject, buildPackage };
