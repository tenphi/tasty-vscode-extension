/**
 * Source File Cache
 *
 * Caches parsed TypeScript source files and detected contexts
 * to avoid repeated parsing for semantic tokens, diagnostics, etc.
 */

import * as ts from 'typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DetectedStyleObject, detectContexts, DetectionOptions } from './contextDetector';

/**
 * Cached document data.
 */
interface DocumentCache {
  version: number;
  sourceFile: ts.SourceFile;
  contexts: DetectedStyleObject[];
}

/**
 * Cache for parsed documents.
 */
const cache = new Map<string, DocumentCache>();

/**
 * Default detection options for context detection.
 */
const defaultDetectionOptions: DetectionOptions = {
  enableHeuristics: true,
};

/**
 * Determine the script kind based on file extension.
 */
function getScriptKind(uri: string): ts.ScriptKind {
  if (uri.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (uri.endsWith('.ts')) return ts.ScriptKind.TS;
  if (uri.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (uri.endsWith('.js')) return ts.ScriptKind.JS;
  // Default to TSX for unknown extensions (most permissive)
  return ts.ScriptKind.TSX;
}

/**
 * Get the cached source file for a document.
 * If not cached or version changed, parses and caches the document.
 */
export function getSourceFile(document: TextDocument): ts.SourceFile {
  const cached = cache.get(document.uri);
  if (cached && cached.version === document.version) {
    return cached.sourceFile;
  }

  // Parse and cache the source file
  const sourceFile = ts.createSourceFile(
    document.uri,
    document.getText(),
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(document.uri),
  );

  // Detect contexts as well
  const contexts = detectContexts(sourceFile, defaultDetectionOptions);

  cache.set(document.uri, {
    version: document.version,
    sourceFile,
    contexts,
  });

  return sourceFile;
}

/**
 * Get the cached detected style contexts for a document.
 * If not cached or version changed, parses and caches the document.
 */
export function getStyleContexts(document: TextDocument): DetectedStyleObject[] {
  const cached = cache.get(document.uri);
  if (cached && cached.version === document.version) {
    return cached.contexts;
  }

  // Parse and cache - this will also cache the source file
  getSourceFile(document);

  // Now get from cache
  return cache.get(document.uri)?.contexts ?? [];
}

/**
 * Get both source file and contexts in one call.
 */
export function getDocumentData(
  document: TextDocument,
): { sourceFile: ts.SourceFile; contexts: DetectedStyleObject[] } {
  const cached = cache.get(document.uri);
  if (cached && cached.version === document.version) {
    return { sourceFile: cached.sourceFile, contexts: cached.contexts };
  }

  // Parse and cache
  const sourceFile = ts.createSourceFile(
    document.uri,
    document.getText(),
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(document.uri),
  );

  const contexts = detectContexts(sourceFile, defaultDetectionOptions);

  cache.set(document.uri, {
    version: document.version,
    sourceFile,
    contexts,
  });

  return { sourceFile, contexts };
}

/**
 * Invalidate the cache for a specific document.
 */
export function invalidateSourceFile(uri: string): void {
  cache.delete(uri);
}

/**
 * Clear the entire cache.
 */
export function clearSourceFileCache(): void {
  cache.clear();
}
