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
  const hasFunction = (name) => new RegExp(`^\\s*def\\s+${name}\\s*\\(`, "m").test(source);
  const currentFormat = hasFunction("configure_programs") || /ctx\.program_profile\s*\(/.test(source);
  const required = currentFormat
    ? ["initialize", "configure_robot", "configure_programs"]
    : ["configure_project", "configure_robot", "configure_autonomous", "configure_controls"];
  for (const fn of required) {
    if (!hasFunction(fn)) errors.push(`Required function ${fn} is missing.`);
  }
  if (currentFormat) {
    const profiles = [...source.matchAll(/ctx\.program_profile\s*\(([\s\S]*?)\)/g)];
    if (!profiles.length) errors.push("Declare at least one program_profile in configure_programs.");
    for (const [, args] of profiles) {
      for (const key of ["autonomous", "driver_control", "brain_screen"]) {
        const callback = args.match(new RegExp(`\\b${key}\\s*=\\s*["']([A-Za-z_][A-Za-z0-9_]*)["']`))?.[1];
        if (!callback) errors.push(`Program profile must declare a ${key} callback.`);
        else if (!hasFunction(callback)) errors.push(`Program callback ${callback} is not declared.`);
      }
    }
  } else {
    const slots = [...source.matchAll(/ctx\.auton_slot\s*\(/g)].length;
    if (slots !== 4) errors.push(`Canonical projects require exactly four autonomous slots; found ${slots}.`);
  }
  const ports = [...source.matchAll(/\bport\s*=\s*(-?\d+)/g)].map((match) => Math.abs(Number(match[1])));
  for (const [, list] of source.matchAll(/\bports\s*=\s*\[([^\]]*)\]/g)) {
    for (const value of list.split(",")) {
      if (/^\s*-?\d+\s*$/.test(value)) ports.push(Math.abs(Number(value)));
    }
  }
  const duplicates = [...new Set(ports.filter((port, index) => ports.indexOf(port) !== index))];
  if (duplicates.length) errors.push(`Each physical Smart Port may be declared once; duplicates: ${duplicates.join(", ")}.`);
  const referencedAssets = [...source.matchAll(/["'](assets\/[A-Za-z0-9._/-]+)["']/g)].map((match) => match[1]);
  for (const asset of new Set(referencedAssets)) {
    if (!safeRelativePath(asset) || !fs.existsSync(path.join(root, asset))) errors.push(`Missing referenced asset: ${asset}.`);
  }
  if (!currentFormat && !/@goodecode\.template:\s*2\.1/.test(source)) warnings.push("The source does not declare canonical template 2.1.");
  return { errors, warnings, entry, manifest, source };
}

function sha256(data) { return crypto.createHash("sha256").update(data).digest("hex"); }

function collectProjectFiles(root, modded = false) {
  const files = [];
  for (const topLevel of (modded ? ["src", "assets", "renderer", "authoring"] : ["src", "assets"])) {
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

function buildPackage({ root, outputPath, extensionVersion, modded = false }) {
  if (fs.existsSync(path.join(root, "goode.mod.json")) && !modded) throw new Error("This is a native mod. Use Export Modded Project to preserve its renderer and authoring sources.");
  const result = checkProject(root);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const name = manifestValue(result.manifest, "name") || path.basename(root);
  const targetFamily = manifestValue(result.manifest, "target") || "compatible-v5";
  const files = [{ path: "goodecode.toml", data: Buffer.from(result.manifest) }, ...collectProjectFiles(root, modded)];
  if (modded) {
    for (const name of ["goode.mod.json", "goode.lock.json", "goode.instructions.json", "goode.generated.json"]) {
      const location = path.join(root, name);
      if (fs.lstatSync(location).isSymbolicLink()) throw new Error("Mod manifests cannot be symbolic links.");
      files.push({ path: name, data: fs.readFileSync(location) });
    }
  }

  for (const file of files) if (file.data.length > MAX_FILE_BYTES) throw new Error(`${file.path} exceeds the 5 MiB file limit.`);
  const total = files.reduce((sum, file) => sum + file.data.length, 0);
  if (total > MAX_PACKAGE_BYTES) throw new Error("Project exceeds the 25 MiB package limit.");
  const metadata = {
    formatVersion: modded ? 2 : FORMAT_VERSION,
    ...(modded ? { modded: true, modManifest: "goode.mod.json" } : {}),
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
