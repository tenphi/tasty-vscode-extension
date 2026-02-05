/**
 * Tasty Language Server
 *
 * Main entry point for the LSP server.
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  DidChangeConfigurationNotification,
  DidChangeWatchedFilesNotification,
  FileChangeType,
  CompletionParams,
  HoverParams,
  SemanticTokensParams,
  SemanticTokensBuilder,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ServerSettings, DEFAULT_SERVER_SETTINGS } from '../../shared/src/types';
import { MergedConfig, createEmptyConfig } from '../../shared/src/configTypes';
import { resolveConfig, clearConfigCache, isConfigFile, CONFIG_FILE_NAMES } from './config';
import { SEMANTIC_TOKENS_LEGEND, provideSemanticTokens } from './semanticTokens';
import { getCompletions, CompletionContext } from './completion';
import { getHoverInfo, HoverContext } from './hover';
import { getDefinition, toDefinitionContext } from './definition';
import { getCodeActions } from './codeActions';
import { getDocumentColors, colorToRgbString } from './colorProvider';
import { validateDocument } from './diagnostics';
import {
  getDocumentData,
  invalidateSourceFile,
  clearSourceFileCache,
} from './sourceFileCache';
import {
  getContextAtPosition,
  toCompletionContext,
  toHoverContext,
  findContainingJsxStyleProp,
  getJsxStylePropContext,
  jsxPropToCompletionContext,
  jsxPropToHoverContext,
} from './contextResolver';
import { collectLocalDefinitions } from './localDefinitions';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Global settings
let globalSettings: ServerSettings = DEFAULT_SERVER_SETTINGS;

// Document settings cache
const documentSettings: Map<string, ServerSettings> = new Map();

// Workspace folder (for config resolution)
let workspaceRoot: string | undefined;

// Config cache per document
const documentConfigs: Map<string, MergedConfig> = new Map();

// Capabilities
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
let hasWatchFileCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Check for capabilities
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );
  hasWatchFileCapability = !!(
    capabilities.workspace && !!capabilities.workspace.didChangeWatchedFiles
  );

  // Get workspace root
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    workspaceRoot = params.workspaceFolders[0].uri.replace('file://', '');
  } else if (params.rootUri) {
    workspaceRoot = params.rootUri.replace('file://', '');
  } else if (params.rootPath) {
    workspaceRoot = params.rootPath;
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,

      // Semantic tokens
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        full: true,
        range: false,
      },

      // Completions
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['#', '$', '@', ':', '.', "'", '"'],
      },

      // Hover
      hoverProvider: true,

      // Definition (go-to-definition)
      definitionProvider: true,

      // Code actions (quick fixes, refactoring)
      codeActionProvider: {
        codeActionKinds: ['quickfix', 'refactor.rewrite'],
      },

      // Document colors (color preview)
      colorProvider: true,

      // Diagnostics
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for configuration changes
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  if (hasWatchFileCapability) {
    // Register for config file changes
    connection.client.register(DidChangeWatchedFilesNotification.type, {
      watchers: [
        { globPattern: '**/tasty.config.ts' },
        { globPattern: '**/tasty.config.js' },
        { globPattern: '**/tasty.config.mjs' },
      ],
    });
  }

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// Watch for config file changes on disk
connection.onDidChangeWatchedFiles((params) => {
  connection.console.log(`File watcher triggered with ${params.changes.length} changes`);
  let configChanged = false;

  for (const change of params.changes) {
    // Decode URI and extract file path
    let filePath: string;
    try {
      const url = new URL(change.uri);
      filePath = decodeURIComponent(url.pathname);
    } catch {
      filePath = change.uri.replace('file://', '');
    }

    connection.console.log(`File change: ${filePath} (type: ${change.type})`);

    // Check if this is a config file by name
    const fileName = filePath.split('/').pop() || '';
    if (CONFIG_FILE_NAMES.includes(fileName)) {
      configChanged = true;
      connection.console.log(`Config file detected: ${filePath}`);
    }
  }

  if (configChanged) {
    // Clear all caches first
    clearConfigCache();
    documentConfigs.clear();
    clearSourceFileCache();
    
    // Clear diagnostics immediately for all open documents
    const docUris = documents.all().map(d => d.uri);
    for (const uri of docUris) {
      connection.sendDiagnostics({ uri, diagnostics: [] });
    }
    
    // Delay to ensure config file is fully written to disk, then revalidate
    setTimeout(() => {
      const freshDocs = documents.all();
      Promise.all(freshDocs.map(doc => validateAndPublishDiagnostics(doc))).catch(() => {});
    }, 200);
  }
});

// Configuration change handler
connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = (change.settings?.tasty as ServerSettings) || DEFAULT_SERVER_SETTINGS;
  }
});

// Get document settings
async function getDocumentSettings(resource: string): Promise<ServerSettings> {
  if (!hasConfigurationCapability) {
    return globalSettings;
  }

  let result = documentSettings.get(resource);
  if (!result) {
    result = await connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'tasty',
    });
    result = result || DEFAULT_SERVER_SETTINGS;
    documentSettings.set(resource, result);
  }

  return result;
}

// Get config for a document
async function getDocumentConfig(document: TextDocument): Promise<MergedConfig> {
  const uri = document.uri;

  // Check cache
  let config = documentConfigs.get(uri);
  if (config) {
    return config;
  }

  // Resolve config
  const filePath = uri.replace('file://', '');
  if (workspaceRoot) {
    config = await resolveConfig(filePath, workspaceRoot);
  } else {
    config = createEmptyConfig();
  }

  documentConfigs.set(uri, config);
  return config;
}

// Validate a document and publish diagnostics
async function validateAndPublishDiagnostics(document: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable || !settings.enableDiagnostics) {
    // Clear diagnostics if disabled
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    return;
  }

  // Only validate TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return;
  }

  try {
    const config = await getDocumentConfig(document);
    const { sourceFile, contexts, jsxStyleProps } = getDocumentData(document);
    const diagnostics = validateDocument(document, sourceFile, contexts, config, jsxStyleProps);
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
  } catch (error) {
    connection.console.error(`Validation error: ${error}`);
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
  }
}

// Document open handler
documents.onDidOpen(async (event) => {
  // Pre-load config and validate
  await getDocumentConfig(event.document);
  await validateAndPublishDiagnostics(event.document);
});

// Document close handler
documents.onDidClose((event) => {
  documentSettings.delete(event.document.uri);
  documentConfigs.delete(event.document.uri);
  invalidateSourceFile(event.document.uri);
  // Clear diagnostics for closed document
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

// Document change handler
documents.onDidChangeContent(async (change) => {
  // Invalidate cache and revalidate
  invalidateSourceFile(change.document.uri);
  await validateAndPublishDiagnostics(change.document);
});

// Semantic tokens handler (supplementary to TextMate grammar)
connection.languages.semanticTokens.on(async (params: SemanticTokensParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { data: [] };
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable || !settings.enableSemanticHighlighting) {
    return { data: [] };
  }

  // Only process TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return { data: [] };
  }

  try {
    const config = await getDocumentConfig(document);
    const { sourceFile, contexts, jsxStyleProps } = getDocumentData(document);
    const builder = provideSemanticTokens(document, sourceFile, contexts, config, jsxStyleProps);
    return builder.build();
  } catch (error) {
    connection.console.error(`Semantic tokens error: ${error}`);
    return { data: [] };
  }
});

// Completion handler
connection.onCompletion(async (params: CompletionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable || !settings.enableAutoComplete) {
    return [];
  }

  // Only process TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return [];
  }

  try {
    const config = await getDocumentConfig(document);
    const { sourceFile, contexts, jsxStyleProps } = getDocumentData(document);

    // Collect local definitions from this file
    const localDefs = collectLocalDefinitions(contexts, sourceFile);

    const offset = document.offsetAt(params.position);

    // First check if we're inside a JSX style prop
    const jsxProp = findContainingJsxStyleProp(offset, jsxStyleProps);
    if (jsxProp) {
      const jsxCtx = getJsxStylePropContext(document, params.position, jsxProp);
      const context = jsxPropToCompletionContext(jsxCtx, params.position);
      return getCompletions(context, config, localDefs);
    }

    // Fall back to style object context detection
    const positionContext = getContextAtPosition(
      document,
      params.position,
      sourceFile,
      contexts,
    );

    // Convert to completion context format
    const context = toCompletionContext(positionContext, params.position);
    return getCompletions(context, config, localDefs);
  } catch (error) {
    connection.console.error(`Completion error: ${error}`);
    return [];
  }
});

// Hover handler
connection.onHover(async (params: HoverParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable || !settings.hoverPreview) {
    return null;
  }

  // Only process TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return null;
  }

  try {
    const config = await getDocumentConfig(document);
    const { sourceFile, contexts, jsxStyleProps } = getDocumentData(document);

    // Collect local definitions from this file
    const localDefs = collectLocalDefinitions(contexts, sourceFile);

    const offset = document.offsetAt(params.position);

    // First check if we're inside a JSX style prop
    const jsxProp = findContainingJsxStyleProp(offset, jsxStyleProps);
    if (jsxProp) {
      const jsxCtx = getJsxStylePropContext(document, params.position, jsxProp);
      const context = jsxPropToHoverContext(document, params.position, jsxCtx);
      
      if (!context) {
        return null;
      }
      
      return getHoverInfo(context, config, localDefs);
    }

    // Fall back to style object context detection
    const positionContext = getContextAtPosition(
      document,
      params.position,
      sourceFile,
      contexts,
    );

    // Convert to hover context format
    const context = toHoverContext(positionContext, document, params.position);

    if (!context) {
      return null;
    }

    return getHoverInfo(context, config, localDefs);
  } catch (error) {
    connection.console.error(`Hover error: ${error}`);
    return null;
  }
});

// Definition handler (go-to-definition)
connection.onDefinition(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable) {
    return null;
  }

  // Only process TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return null;
  }

  try {
    const config = await getDocumentConfig(document);
    const { sourceFile, contexts } = getDocumentData(document);

    // Collect local definitions from this file
    const localDefs = collectLocalDefinitions(contexts, sourceFile);

    // Get the word at the cursor position
    const offset = document.offsetAt(params.position);
    const text = document.getText();
    
    // Find word boundaries (simple token extraction)
    let start = offset;
    let end = offset;
    
    // Extend backward to find token start
    while (start > 0 && /[a-zA-Z0-9_#$@-]/.test(text[start - 1])) {
      start--;
    }
    
    // Extend forward to find token end
    while (end < text.length && /[a-zA-Z0-9_-]/.test(text[end])) {
      end++;
    }
    
    const word = text.slice(start, end);
    if (!word) {
      return null;
    }

    const context = toDefinitionContext(word);
    
    // Get config file URI if available
    let configFileUri: string | undefined;
    if (workspaceRoot) {
      // Try to find config file in workspace
      const configPath = require('path').join(workspaceRoot, 'tasty.config.ts');
      configFileUri = `file://${configPath}`;
    }

    return getDefinition(document, context, config, localDefs, configFileUri);
  } catch (error) {
    connection.console.error(`Definition error: ${error}`);
    return null;
  }
});

// Code actions handler (quick fixes, refactoring)
connection.onCodeAction(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable) {
    return [];
  }

  // Only process TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return [];
  }

  try {
    return getCodeActions(document, params.range, params.context.diagnostics);
  } catch (error) {
    connection.console.error(`Code actions error: ${error}`);
    return [];
  }
});

// Document colors handler (color preview)
connection.onDocumentColor(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable) {
    return [];
  }

  // Only process TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return [];
  }

  try {
    return getDocumentColors(document);
  } catch (error) {
    connection.console.error(`Document color error: ${error}`);
    return [];
  }
});

// Color presentation handler (for editing colors)
connection.onColorPresentation((params) => {
  const color = params.color;
  return [
    {
      label: colorToRgbString(color),
    },
  ];
});

// Diagnostic handler (pull model)
connection.languages.diagnostics.on(async (params: DocumentDiagnosticParams): Promise<DocumentDiagnosticReport> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  }

  const settings = await getDocumentSettings(document.uri);
  if (!settings.enable || !settings.enableDiagnostics) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  }

  // Only validate TypeScript/TSX files
  const uri = document.uri;
  if (!uri.endsWith('.ts') && !uri.endsWith('.tsx')) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  }

  try {
    const config = await getDocumentConfig(document);
    const { sourceFile, contexts, jsxStyleProps } = getDocumentData(document);
    const diagnostics = validateDocument(document, sourceFile, contexts, config, jsxStyleProps);

    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: diagnostics,
    };
  } catch (error) {
    connection.console.error(`Diagnostic error: ${error}`);
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  }
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

// Get version from package.json
const pkg = require('../../package.json');
connection.console.log(`Tasty Language Server v${pkg.version} started`);