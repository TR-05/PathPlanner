// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, line: number) {
  const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace placeholders with webview URIs
  const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview', 'style.css'))
  );
  const bezierScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview', 'bezier.js'))
  );
  const rendererScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview', 'renderer.js'))
  );

  const imageUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview', 'VURC.png'))
  );
  html = html.replace('<!-- IMAGE_PLACEHOLDER -->', imageUri.toString());

  html = html.replace('<!-- STYLE_PLACEHOLDER -->', `<link rel="stylesheet" href="${styleUri}">`);
  html = html.replace('<!-- SCRIPT_PLACEHOLDER -->', `<script src="${bezierScriptUri}"></script><script src="${rendererScriptUri}"></script>`);
  html = html.replace('<!-- LINE_PLACEHOLDER -->', `Line ${line} clicked!`);

  return html;
}

// The webview panel will be created inside the command handler where 'line' is defined.

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.showGui', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const line = editor.selection.active.line;
      vscode.window.showInformationMessage(`Line ${line + 1} clicked!`);
      // Create and show the webview panel with the correct line number
		const panel = vscode.window.createWebviewPanel(
		'customGui',
		'Custom GUI',
		{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
		{ enableScripts: true }
		);
    panel.webview.html = getWebviewContent(context, panel, line + 1);
      // Here, you can implement your GUI logic
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
