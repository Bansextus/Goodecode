"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

function findCaptureExecutable(configured, platform = process.platform, home = os.homedir()) {
  const candidates = configured ? [configured] : platform === "darwin" ? [
    "/Applications/Goodebot.app/Contents/Resources/bin/cortex_v5_upload_bridge",
    path.join(home, "Applications/Goodebot.app/Contents/Resources/bin/cortex_v5_upload_bridge"),
  ] : [];
  return candidates.find((candidate) => {
    if (!path.isAbsolute(candidate)) return false;
    try { fs.accessSync(candidate, fs.constants.X_OK); return fs.statSync(candidate).isFile(); } catch { return false; }
  });
}

async function captureBrainScreen(executable, output, execute = promisify(execFile)) {
  if (!path.isAbsolute(output) || path.extname(output).toLowerCase() !== ".png") throw new Error("Choose a PNG file for the Brain image.");
  await execute(executable, ["--capture-screen", output], { timeout: 20000, maxBuffer: 1024 * 1024, windowsHide: true });
  const image = fs.readFileSync(output);
  if (image.length < 24 || !image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error("The Brain did not return a valid PNG image.");
  return output;
}

async function captureFromVSCode(vscode) {
  if (!vscode.workspace.isTrusted) { await vscode.window.showWarningMessage("Trust this workspace before accessing the connected Brain."); return; }
  const configured = vscode.workspace.getConfiguration("goodecode").get("brainCaptureExecutable", "");
  const executable = findCaptureExecutable(configured);
  if (!executable) { await vscode.window.showErrorMessage("Install the updated Goodebot app, or set Goodecode: Brain Capture Executable to its screen-capture helper."); return; }
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = await vscode.window.showSaveDialog({ title: "Capture connected V5 Brain", defaultUri: vscode.Uri.file(path.join(folder, `Brain-${stamp}.png`)), filters: { "PNG image": ["png"] } });
  if (!target) return;
  try {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Capturing connected Brain…", cancellable: false }, () => captureBrainScreen(executable, target.fsPath));
    await vscode.commands.executeCommand("vscode.open", target);
  } catch (error) {
    const detail = String(error.stderr || error.message || error).trim();
    await vscode.window.showErrorMessage(`Brain capture failed: ${detail}. Check USB and close other applications using the Brain's serial port.`);
  }
}
module.exports = { findCaptureExecutable, captureBrainScreen, captureFromVSCode };
