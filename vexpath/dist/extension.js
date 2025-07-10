"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
function getWebviewContent(context, panel, line) {
  const htmlPath = path.join(context.extensionPath, "src", "webview", "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, "src", "webview", "style.css"))
  );
  const bezierScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, "src", "webview", "bezier.js"))
  );
  const rendererScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, "src", "webview", "renderer.js"))
  );
  const imageUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, "src", "webview", "VURC.png"))
  );
  html = html.replace("<!-- IMAGE_PLACEHOLDER -->", imageUri.toString());
  html = html.replace("<!-- STYLE_PLACEHOLDER -->", `<link rel="stylesheet" href="${styleUri}">`);
  html = html.replace("<!-- SCRIPT_PLACEHOLDER -->", `<script src="${bezierScriptUri}"></script><script src="${rendererScriptUri}"></script>`);
  html = html.replace("<!-- LINE_PLACEHOLDER -->", `Line ${line} clicked!`);
  return html;
}
function activate(context) {
  let disposable = vscode.commands.registerCommand("extension.showGui", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const line = editor.selection.active.line;
      vscode.window.showInformationMessage(`Line ${line + 1} clicked!`);
      const panel = vscode.window.createWebviewPanel(
        "customGui",
        "Custom GUI",
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: true }
      );
      panel.webview.html = getWebviewContent(context, panel, line + 1);
    }
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
