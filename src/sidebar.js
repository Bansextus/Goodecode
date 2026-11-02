"use strict";

const crypto = require("crypto");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderSidebar({ webview, logoUri, workspaceName, projectName, state, sourceName }) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const hasWorkspace = Boolean(workspaceName);
  const hasProject = Boolean(projectName);
  const status = !hasWorkspace ? "Open a folder to begin"
    : !hasProject ? "No Goodecode project yet"
      : state === "ready" ? "Ready to export" : "Check project for issues";
  const statusClass = state === "ready" ? "ready" : "muted";
  const primaryCommand = !hasWorkspace ? "openFolder" : hasProject ? "openStudio" : "createStarterFiles";
  const primaryLabel = !hasWorkspace ? "Open Folder" : hasProject ? "Open Code" : "Create Goodecode Project";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 14px 12px 20px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font: 13px var(--vscode-font-family); }
  button { font: inherit; cursor: pointer; }
  .brand { display:flex; align-items:center; gap:10px; padding:6px 4px 18px; }
  .brand img { width:38px; height:38px; object-fit:contain; }
  .brand strong { display:block; font-size:17px; letter-spacing:-.02em; }
  .brand small { display:block; margin-top:2px; color:var(--vscode-descriptionForeground); font-size:11px; }
  .section { border-top:1px solid var(--vscode-panel-border); padding-top:16px; margin-top:8px; }
  .eyebrow { color:var(--vscode-descriptionForeground); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.13em; }
  .project { margin-top:8px; font-size:14px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .status { display:flex; gap:7px; align-items:center; margin:9px 0 16px; color:var(--vscode-descriptionForeground); font-size:12px; }
  .status::before { content:""; flex:none; width:7px; height:7px; border-radius:50%; background:var(--vscode-descriptionForeground); }
  .status.ready::before { background:#57d5a1; }
  .action { width:100%; min-height:36px; border:1px solid var(--vscode-panel-border); border-radius:6px; padding:8px 10px; margin:0 0 7px; text-align:left; color:var(--vscode-foreground); background:var(--vscode-list-inactiveSelectionBackground); }
  .action:not([disabled]):hover, .action:not([disabled]):focus-visible { background:var(--vscode-list-hoverBackground); border-color:#ffd34f; outline:0; box-shadow:0 0 0 1px rgba(255,211,79,.55), 0 0 15px rgba(255,211,79,.38); }
  .action.primary { background:#ffd34f; color:#082038; border-color:#ffd34f; font-weight:700; }
  .action.primary:hover, .action.primary:focus-visible { background:#ffe078; box-shadow:0 0 0 1px #ffe078, 0 0 19px rgba(255,211,79,.65); }
  .action[disabled] { opacity:.48; cursor:not-allowed; }
  .files { margin:10px 0 0; padding:0; list-style:none; color:var(--vscode-descriptionForeground); font-family:var(--vscode-editor-font-family); font-size:11px; }
  .files li { padding:5px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .files span { color:#7dd7f2; margin-right:6px; }
  .note { margin:12px 2px 0; color:var(--vscode-descriptionForeground); line-height:1.45; font-size:11px; }
</style></head><body>
  <div class="brand"><img src="${escapeHtml(logoUri)}" alt=""><div><strong>Goodecode</strong><small>Goode&gt;Good</small></div></div>
  <section class="section" aria-label="Workspace">
    <div class="eyebrow">Workspace</div>
    <div class="project" title="${escapeHtml(projectName || workspaceName || "No folder open")}">${escapeHtml(projectName || workspaceName || "No folder open")}</div>
    <div class="status ${statusClass}">${escapeHtml(status)}</div>
    <button class="action primary" data-command="${primaryCommand}">${primaryLabel}</button>
    <button class="action" data-command="checkProject" ${hasProject ? "" : "disabled"}>Check Project</button>
    <button class="action" data-command="exportGoodeFile" ${hasProject ? "" : "disabled"}>Export for Goodebot</button>
  </section>
  <section class="section" aria-label="Project files">
    <div class="eyebrow">Project files</div>
    <ul class="files">${hasProject ? `<li><span>◇</span>goodecode.toml</li><li><span>◇</span>${escapeHtml(sourceName || "src/main.goode.py")}</li>` : '<li>Open or create a project to see its files.</li>'}</ul>
  </section>
  <section class="section" aria-label="Resources">
    <div class="eyebrow">Resources</div>
    <button class="action" data-command="captureBrainScreen">Capture Brain Screen</button>
    <button class="action" data-command="openSyntaxGuidePreview">Open Syntax Guide</button>
    <button class="action" data-command="openGoodebotDownload">Download Goodebot ↗</button>
    <p class="note">Goodecode checks source structure. Goodebot handles import, runtime, and deployment.</p>
  </section>
  <script nonce="${nonce}">const vscode = acquireVsCodeApi(); document.addEventListener('click', (event) => { const button = event.target.closest('button[data-command]'); if (button && !button.disabled) vscode.postMessage({ command: button.dataset.command }); });</script>
</body></html>`;
}

module.exports = { escapeHtml, renderSidebar };
