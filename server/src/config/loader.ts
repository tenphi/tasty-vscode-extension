/**
 * Config Loader
 *
 * Loads and parses tasty.config.ts/js files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import { TastyExtensionConfig } from '../../../shared/src/configTypes';

/**
 * Config file names to look for, in order of preference.
 */
export const CONFIG_FILE_NAMES = ['tasty.config.ts', 'tasty.config.js', 'tasty.config.mjs'];

/**
 * Find a config file in the given directory.
 * Returns the full path or undefined if not found.
 */
export function findConfigFile(directory: string): string | undefined {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(directory, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return undefined;
}

/**
 * Load and parse a config file.
 * Handles both TypeScript and JavaScript files.
 */
export async function loadConfigFile(filePath: string): Promise<TastyExtensionConfig | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);

    if (ext === '.ts') {
      return parseTypeScriptConfig(content, filePath);
    } else {
      return parseJavaScriptConfig(content, filePath);
    }
  } catch (error) {
    console.error(`Failed to load config file ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse a TypeScript config file.
 * Compiles to JavaScript and evaluates.
 */
function parseTypeScriptConfig(content: string, filePath: string): TastyExtensionConfig | null {
  try {
    // Transpile TypeScript to JavaScript
    const result = ts.transpileModule(content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        removeComments: true,
      },
      fileName: filePath,
    });

    return evaluateConfigScript(result.outputText, filePath);
  } catch (error) {
    console.error(`Failed to parse TypeScript config ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse a JavaScript config file.
 * Uses TypeScript's transpiler to properly handle ESM to CommonJS conversion.
 */
function parseJavaScriptConfig(content: string, filePath: string): TastyExtensionConfig | null {
  try {
    // Use TypeScript to transpile ESM to CJS - it handles all edge cases correctly
    const result = ts.transpileModule(content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        allowJs: true,
        removeComments: true,
      },
      fileName: filePath,
    });

    return evaluateConfigScript(result.outputText, filePath);
  } catch (error) {
    console.error(`Failed to parse JavaScript config ${filePath}:`, error);
    return null;
  }
}

/**
 * Evaluate a config script and extract the default export.
 */
function evaluateConfigScript(script: string, filePath: string): TastyExtensionConfig | null {
  try {
    // Create a sandbox with module-like environment
    const sandbox = {
      module: { exports: {} as Record<string, unknown> },
      exports: {} as Record<string, unknown>,
      require: (id: string) => {
        // Return empty objects for imports we don't need
        if (id.includes('tasty-vscode-extension')) {
          return {};
        }
        throw new Error(`Cannot require module: ${id}`);
      },
      console,
      __filename: filePath,
      __dirname: path.dirname(filePath),
    };

    // Link exports
    sandbox.exports = sandbox.module.exports;

    // Run the script
    const context = vm.createContext(sandbox);
    vm.runInContext(script, context, { filename: filePath });

    // Get the exported config
    const config = sandbox.module.exports;

    // Handle default export
    if (config && typeof config === 'object') {
      if ('default' in config) {
        return validateConfig(config.default as TastyExtensionConfig);
      }
      return validateConfig(config as TastyExtensionConfig);
    }

    return null;
  } catch (error) {
    console.error(`Failed to evaluate config script ${filePath}:`, error);
    return null;
  }
}

/**
 * Validate and normalize a config object.
 */
function validateConfig(config: unknown): TastyExtensionConfig | null {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const result: TastyExtensionConfig = {};
  const obj = config as Record<string, unknown>;

  // Validate extends (accept string or single-element array)
  if (typeof obj.extends === 'string') {
    result.extends = obj.extends;
  } else if (
    Array.isArray(obj.extends) &&
    obj.extends.length === 1 &&
    typeof obj.extends[0] === 'string'
  ) {
    result.extends = obj.extends[0];
  }

  // Validate tokens
  if (obj.tokens === false) {
    result.tokens = false;
  } else if (Array.isArray(obj.tokens)) {
    result.tokens = obj.tokens.filter((t): t is string => typeof t === 'string');
  }

  // Validate units
  if (obj.units === false) {
    result.units = false;
  } else if (Array.isArray(obj.units)) {
    result.units = obj.units.filter((u): u is string => typeof u === 'string');
  }

  // Validate funcs
  if (obj.funcs === false) {
    result.funcs = false;
  } else if (Array.isArray(obj.funcs)) {
    result.funcs = obj.funcs.filter((f): f is string => typeof f === 'string');
  }

  // Validate states
  if (Array.isArray(obj.states)) {
    result.states = obj.states.filter((s): s is string => typeof s === 'string');
  }

  // Validate presets
  if (Array.isArray(obj.presets)) {
    result.presets = obj.presets.filter((p): p is string => typeof p === 'string');
  }

  return result;
}

/**
 * Check if a file path is a tasty config file.
 */
export function isConfigFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return CONFIG_FILE_NAMES.includes(fileName);
}
