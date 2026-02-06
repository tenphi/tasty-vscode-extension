/**
 * Config Resolver
 *
 * Resolves the configuration hierarchy for a given file.
 * Walks up the directory tree to find all config files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MergedConfig,
  TastyExtensionConfig,
  createEmptyConfig,
  mergeConfigs,
} from '../../../shared/src/configTypes';
import { CONFIG_FILE_NAMES, findConfigFile, loadConfigFile } from './loader';

/**
 * Cache for loaded configs.
 */
const configCache = new Map<string, TastyExtensionConfig | null>();

/**
 * Cache for merged configs per directory.
 */
const mergedConfigCache = new Map<string, MergedConfig>();

/**
 * Check if a string is a package specifier (npm package name).
 * Package names don't start with '.' or '/' and follow npm naming conventions.
 */
function isPackageSpecifier(value: string): boolean {
  // Relative or absolute paths
  if (value.startsWith('.') || value.startsWith('/')) {
    return false;
  }
  // Scoped packages: @scope/package or @scope/package/path
  if (value.startsWith('@')) {
    return /^@[\w-]+\/[\w-]+(\/.*)?$/.test(value);
  }
  // Regular packages: package or package/path
  return /^[\w-]+(\/.*)?$/.test(value);
}

/**
 * Extract the package name (without subpath) from a package specifier.
 */
function extractPackageName(packageSpecifier: string): string {
  if (packageSpecifier.startsWith('@')) {
    // Scoped package: @scope/package or @scope/package/subpath
    const parts = packageSpecifier.split('/');
    return parts.slice(0, 2).join('/');
  }
  // Regular package: package or package/subpath
  return packageSpecifier.split('/')[0];
}

/**
 * Resolve a package directory by walking up node_modules.
 * This avoids require.resolve which is blocked by the package's `exports` field.
 * Returns the package root directory or undefined if not found.
 */
function resolvePackageDirectory(packageName: string, fromDir: string): string | undefined {
  const pkgName = extractPackageName(packageName);

  // Walk up directory tree looking in node_modules
  let currentDir = fromDir;
  while (true) {
    const candidate = path.join(currentDir, 'node_modules', pkgName);
    const pkgJsonPath = path.join(candidate, 'package.json');

    if (fs.existsSync(pkgJsonPath)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  return undefined;
}

/**
 * Resolve the extends path, supporting both relative paths and package specifiers.
 */
function resolveExtendsPath(configPath: string, extendsValue: string): string | undefined {
  const configDir = path.dirname(configPath);

  // Relative or absolute path
  if (!isPackageSpecifier(extendsValue)) {
    return path.resolve(configDir, extendsValue);
  }

  // Package specifier - resolve the package directory
  const packageDir = resolvePackageDirectory(extendsValue, configDir);
  if (!packageDir) {
    console.warn(`Could not resolve package "${extendsValue}" from ${configDir}`);
    return undefined;
  }

  // Find config file in the package directory
  const configFile = findConfigFile(packageDir);
  if (configFile) {
    return configFile;
  }

  // If extends includes a subpath like '@cube-dev/ui-kit/tasty.config', try that
  if (extendsValue.includes('/')) {
    const parts = extendsValue.split('/');
    const subpath = extendsValue.startsWith('@')
      ? parts.slice(2).join('/')
      : parts.slice(1).join('/');

    if (subpath) {
      // Try the exact subpath
      const exactPath = path.join(packageDir, subpath);
      if (fs.existsSync(exactPath)) {
        return exactPath;
      }

      // Try with config extensions
      for (const ext of ['.ts', '.js', '.mjs', '']) {
        const withExt = exactPath + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
    }
  }

  // Check for config file with standard names in package root
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(packageDir, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  console.warn(`No tasty config file found in package "${extendsValue}" at ${packageDir}`);
  return undefined;
}

/**
 * Resolve the config for a file by walking up the directory tree.
 */
export async function resolveConfig(
  filePath: string,
  workspaceRoot: string,
): Promise<MergedConfig> {
  const directory = path.dirname(filePath);

  // Check cache
  const cached = mergedConfigCache.get(directory);
  if (cached) {
    return cached;
  }

  // Collect all config files from the file's directory up to workspace root
  const configPaths: string[] = [];
  let currentDir = directory;

  while (currentDir.startsWith(workspaceRoot) || currentDir === workspaceRoot) {
    const configPath = findConfigFile(currentDir);
    if (configPath) {
      configPaths.push(configPath);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  // Load and merge configs from root to leaf (so closer configs override)
  configPaths.reverse();

  let result = createEmptyConfig();

  for (const configPath of configPaths) {
    const config = await loadConfig(configPath);
    if (config) {
      // Handle extends
      if (config.extends) {
        const extendsPath = resolveExtendsPath(configPath, config.extends);
        if (extendsPath) {
          const extendsConfig = await loadConfig(extendsPath);
          if (extendsConfig) {
            result = mergeConfigs(result, extendsConfig);
          }
        }
      }

      result = mergeConfigs(result, config);
    }
  }

  // Cache the result
  mergedConfigCache.set(directory, result);

  return result;
}

/**
 * Load a config file with caching.
 */
async function loadConfig(configPath: string): Promise<TastyExtensionConfig | null> {
  // Check cache
  if (configCache.has(configPath)) {
    return configCache.get(configPath) ?? null;
  }

  // Load and cache
  const config = await loadConfigFile(configPath);
  configCache.set(configPath, config);

  return config;
}

/**
 * Clear the config cache for a specific file.
 */
export function invalidateConfig(configPath: string): void {
  configCache.delete(configPath);

  // Clear all merged configs that might depend on this file
  mergedConfigCache.clear();
}

/**
 * Clear all config caches.
 */
export function clearConfigCache(): void {
  configCache.clear();
  mergedConfigCache.clear();
}

/**
 * Get all config files that affect a given file.
 */
export function getAffectingConfigFiles(filePath: string, workspaceRoot: string): string[] {
  const configPaths: string[] = [];
  let currentDir = path.dirname(filePath);

  while (currentDir.startsWith(workspaceRoot) || currentDir === workspaceRoot) {
    const configPath = findConfigFile(currentDir);
    if (configPath) {
      configPaths.push(configPath);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return configPaths;
}
