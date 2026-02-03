/**
 * Tasty VSCode Extension Client
 *
 * This is the main entry point for the VSCode extension.
 * It initializes the language client and connects to the language server.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';

// TransportKind enum values (avoid bundling issues)
// stdio = 0, ipc = 1, pipe = 2, socket = 3
const TransportKind = {
  stdio: 0,
  ipc: 1,
  pipe: 2,
  socket: 3,
} as const;

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Tasty Extension');
  outputChannel.appendLine('Tasty Syntax Highlighting extension is activating...');
  
  try {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('dist', 'server', 'server.js'));
    outputChannel.appendLine(`Server module path: ${serverModule}`);
    
    // Check if server file exists
    const fs = require('fs');
    if (!fs.existsSync(serverModule)) {
      outputChannel.appendLine(`ERROR: Server module not found at ${serverModule}`);
      vscode.window.showErrorMessage(`Tasty: Server module not found at ${serverModule}`);
      return;
    }
    outputChannel.appendLine('Server module file exists');

    // Debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // Server options - run the server as a Node.js module
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions,
      },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register the server for TypeScript and TSX documents
      documentSelector: [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
      ],
      synchronize: {
        // Watch for changes to tasty.config files
        fileEvents: [
          vscode.workspace.createFileSystemWatcher('**/tasty.config.ts'),
          vscode.workspace.createFileSystemWatcher('**/tasty.config.js'),
          vscode.workspace.createFileSystemWatcher('**/tasty.config.mjs'),
        ],
      },
      outputChannel,
      middleware: {
        provideDocumentSemanticTokens: async (document, token, next) => {
          outputChannel.appendLine(`[MIDDLEWARE] Semantic tokens requested for: ${document.uri.toString()}`);
          const result = await next(document, token);
          if (result) {
            outputChannel.appendLine(`[MIDDLEWARE] Got ${(result as any).data?.length || 0} token values`);
          } else {
            outputChannel.appendLine(`[MIDDLEWARE] No result`);
          }
          return result;
        },
        provideCompletionItem: async (document, position, context, token, next) => {
          outputChannel.appendLine(`[MIDDLEWARE] Completion requested at ${position.line}:${position.character}`);
          const result = await next(document, position, context, token);
          outputChannel.appendLine(`[MIDDLEWARE] Got ${Array.isArray(result) ? result.length : (result as any)?.items?.length || 0} completions`);
          return result;
        },
      },
    };

    // Create the language client and start it
    client = new LanguageClient(
      'tastyLanguageServer',
      'Tasty Language Server',
      serverOptions,
      clientOptions,
    );

    outputChannel.appendLine('Starting language client...');
    
    // Start the client. This will also launch the server.
    await client.start();
    
    outputChannel.appendLine('Language client started successfully!');

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('tasty.restartServer', async () => {
        await client.restart();
        vscode.window.showInformationMessage('Tasty Language Server restarted');
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('tasty.showConfig', async () => {
        // Get the current document's config
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage('No active editor');
          return;
        }

        vscode.window.showInformationMessage(
          'Tasty config loaded. Check the output panel for details.',
        );
      }),
    );
    
    context.subscriptions.push(outputChannel);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`ERROR: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      outputChannel.appendLine(`Stack: ${error.stack}`);
    }
    vscode.window.showErrorMessage(`Tasty extension failed to start: ${errorMessage}`);
    outputChannel.show();
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
