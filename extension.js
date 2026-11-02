"use strict";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { checkProject, buildPackage } = require("./src/project");
const { templateProviders } = require("./src/extensions");
const { renderSidebar } = require("./src/sidebar");
const { captureFromVSCode } = require("./src/brainCapture");

const SIDEBAR_ACTIONS = Object.freeze({
  openFolder: "vscode.openFolder",
  openStudio: "goodecode.openStudio",
  createStarterFiles: "goodecode.createStarterFiles",
  checkProject: "goodecode.checkProject",
  exportGoodeFile: "goodecode.exportGoodeFile",
  captureBrainScreen: "goodecode.captureBrainScreen",
  openSyntaxGuidePreview: "goodecode.openSyntaxGuidePreview",
  openGoodebotDownload: "goodecode.openGoodebotDownload",
});

const workspaceRoot = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";

function projectRoot() {
  const root = workspaceRoot();
  if (!root) return "";
  const nested = path.join(root, "Goodecode");
  if (fs.existsSync(path.join(root, "goodecode.toml"))) return root;
  if (fs.existsSync(path.join(nested, "goodecode.toml"))) return nested;
  return root;
}

function projectSnapshot() {
  const workspace = workspaceRoot();
  const root = projectRoot();
  if (!workspace) return { workspaceName: "", projectName: "", state: "empty", sourceName: "" };
  if (!fs.existsSync(path.join(root, "goodecode.toml"))) {
    return { workspaceName: path.basename(workspace), projectName: "", state: "empty", sourceName: "" };
  }
  try {
    const result = checkProject(root);
    return {
      workspaceName: path.basename(workspace),
      projectName: path.basename(root),
      state: result.errors.length ? "issues" : "ready",
      sourceName: result.entry || "src/main.goode.py",
    };
  } catch {
    return { workspaceName: path.basename(workspace), projectName: path.basename(root), state: "issues", sourceName: "src/main.goode.py" };
  }
}

class GoodecodeSidebarProvider {
  constructor(context) {
    this.context = context;
    this.view = undefined;
  }

  resolveWebviewView(view) {
    this.view = view;
    const media = vscode.Uri.file(path.join(this.context.extensionPath, "media"));
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.onDidReceiveMessage((message) => {
      const command = Object.hasOwn(SIDEBAR_ACTIONS, message?.command) ? SIDEBAR_ACTIONS[message.command] : undefined;
      if (command) vscode.commands.executeCommand(command);
    });
    view.onDidChangeVisibility(() => { if (view.visible) this.refresh(); });
    this.refresh();
  }

  refresh() {
    if (!this.view) return;
    const logo = vscode.Uri.file(path.join(this.context.extensionPath, "media", "goodecode-icon.png"));
    this.view.webview.html = renderSidebar({
      webview: this.view.webview,
      logoUri: this.view.webview.asWebviewUri(logo).toString(),
      ...projectSnapshot(),
    });
  }
}

async function openStudio() {
  const workspace = workspaceRoot();
  if (!workspace) {
    const choice = await vscode.window.showInformationMessage("Open a folder to start a Goodecode project.", "Open Folder");
    if (choice === "Open Folder") await vscode.commands.executeCommand("vscode.openFolder");
    return;
  }
  const root = projectRoot();
  if (!fs.existsSync(path.join(root, "goodecode.toml"))) {
    const choice = await vscode.window.showInformationMessage("Create a Goodecode project in this folder first.", "Create Project");
    if (choice === "Create Project") await vscode.commands.executeCommand("goodecode.createStarterFiles");
    return;
  }
  let entry = "src/main.goode.py";
  try { entry = checkProject(root).entry || entry; } catch { /* Open the default source when authoring checks cannot run. */ }
  const source = path.resolve(root, entry);
  if (!source.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(source)) {
    vscode.window.showWarningMessage(`Goodecode source file is missing: ${entry}. Run Check Project for details.`);
    return;
  }
  await vscode.window.showTextDocument(vscode.Uri.file(source), { preview: false });
}

async function createProject() {
  const root = workspaceRoot();
  if (!root) return vscode.window.showWarningMessage("Open a folder before creating a Goodecode project.");
  const main = path.join(root, "src/main.goode.py");
  if (fs.existsSync(main)) {
    if (fs.existsSync(path.join(root, "goodecode.toml"))) return openStudio();
    return vscode.window.showWarningMessage("src/main.goode.py already exists. Add a goodecode.toml manifest or choose another folder; Goodecode will not overwrite your source.");
  }
  if (fs.existsSync(path.join(root, "goodecode.toml"))) {
    return vscode.window.showWarningMessage("goodecode.toml already exists. Goodecode will not overwrite this project manifest.");
  }
  const name = path.basename(root).replaceAll('"', "");
  const template = templateProviders()[0].create(name);
  for (const [relative, contents] of Object.entries({ "goodecode.toml": template.manifest, ...template.files })) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  await vscode.window.showTextDocument(vscode.Uri.file(main), { preview: false });
}

async function check() {
  const root = projectRoot();
  if (!root || !fs.existsSync(path.join(root, "goodecode.toml"))) {
    return vscode.window.showWarningMessage("Open a Goodecode project first.");
  }
  const result = checkProject(root);
  if (result.errors.length) {
    return vscode.window.showErrorMessage(`Goodecode authoring checks failed:\n${result.errors.join("\n")}`);
  }
  return vscode.window.showInformationMessage(`Goodecode project is structurally ready to export.${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}`);
}

async function exportForGoodebot(context) {
  const root = projectRoot();
  if (!root || !fs.existsSync(path.join(root, "goodecode.toml"))) {
    return vscode.window.showWarningMessage("Open a Goodecode project first.");
  }
  const name = path.basename(root).replace(/[^A-Za-z0-9._-]+/g, "-") || "Goodecode-Project";
  const target = path.join(root, `${name}.goode`);
  try {
    buildPackage({ root, outputPath: target, extensionVersion: context.extension.packageJSON.version });
  } catch (error) {
    return vscode.window.showErrorMessage(`Goodecode export blocked:\n${error.message}`);
  }
  const action = await vscode.window.showInformationMessage(
    `Exported ${path.basename(target)} for Goodebot. Runtime and deployment checks happen after import.`, "Reveal"
  );
  if (action === "Reveal") await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(target));
}

function activate(context) {
  if (context.extension.packageJSON.goodecodeBeta) require("./src/modCommands").activateMods(vscode, context, projectRoot);
  const sidebar = new GoodecodeSidebarProvider(context);
  const refresh = () => sidebar.refresh();
  const register = (name, handler) => context.subscriptions.push(vscode.commands.registerCommand(name, async (...args) => {
    try { return await handler(...args); } finally { refresh(); }
  }));

  context.subscriptions.push(vscode.window.registerWebviewViewProvider("goodecode.sidebar", sidebar));
  register("goodecode.openStudio", openStudio);
  register("goodecode.refreshSidebar", refresh);
  register("goodecode.openGoodebotDownload", () => vscode.env.openExternal(vscode.Uri.parse("https://goodebot.net/download")));
  register("goodecode.openWorkspaceFolder", () => {
    const root = workspaceRoot();
    return root ? vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(root)) : vscode.commands.executeCommand("vscode.openFolder");
  });
  register("goodecode.createStarterFiles", createProject);
  register("goodecode.createSingleScriptTemplate", createProject);
  register("goodecode.migrateTemplateV2", createProject);
  register("goodecode.openSyntaxGuidePreview", () => vscode.commands.executeCommand(
    "markdown.showPreview", vscode.Uri.file(path.join(context.extensionPath, "content/goodecode-syntax-guide.md"))
  ));
  register("goodecode.captureBrainScreen", () => captureFromVSCode(vscode));
  register("goodecode.checkProject", check);
  register("goodecode.exportGoodeFile", () => exportForGoodebot(context));

  const watcher = vscode.workspace.createFileSystemWatcher("**/{goodecode.toml,*.goode.py}");
  context.subscriptions.push(watcher);
  context.subscriptions.push(watcher.onDidCreate(refresh), watcher.onDidChange(refresh), watcher.onDidDelete(refresh));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(refresh));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refresh));
}

function deactivate() {}
module.exports = { activate, deactivate };
