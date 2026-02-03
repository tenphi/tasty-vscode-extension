/**
 * Definition Provider
 *
 * Provides go-to-definition support for tasty tokens and state aliases.
 */

import { Location, Range, Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { MergedConfig } from '../../shared/src/configTypes';
import { LocalDefinitions, getTokenLocation, getStateLocation } from './localDefinitions';

/**
 * Definition context information.
 */
export interface DefinitionContext {
  /** The word/token under the cursor */
  word: string;
  /** Is this a token reference? (#name or $name) */
  isToken: boolean;
  /** Is this a state alias? (@name) */
  isStateAlias: boolean;
}

/**
 * Get definition location for a token or state alias.
 *
 * For locally-defined tokens/states, returns the location in the current file.
 * For config-defined tokens/states, returns the location in tasty.config.ts if available.
 */
export function getDefinition(
  document: TextDocument,
  context: DefinitionContext,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  configFileUri?: string,
): Location | null {
  const { word, isToken, isStateAlias } = context;

  if (isToken) {
    return getTokenDefinition(document, word, config, localDefs, configFileUri);
  }

  if (isStateAlias) {
    return getStateAliasDefinition(document, word, config, localDefs, configFileUri);
  }

  return null;
}

/**
 * Get definition for a token (#name or $name).
 */
function getTokenDefinition(
  document: TextDocument,
  token: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  configFileUri?: string,
): Location | null {
  // Check for local definition first (higher priority)
  const localLocation = getTokenLocation(token, localDefs);
  if (localLocation) {
    return {
      uri: document.uri,
      range: Range.create(
        document.positionAt(localLocation.start),
        document.positionAt(localLocation.end),
      ),
    };
  }

  // Check if token is in config
  if (Array.isArray(config.tokens) && config.tokens.includes(token) && configFileUri) {
    // Return a location pointing to the config file
    // We return a range at the beginning of the file since we don't have exact positions
    // The user can then search for the token in the config
    return {
      uri: configFileUri,
      range: Range.create(Position.create(0, 0), Position.create(0, 0)),
    };
  }

  return null;
}

/**
 * Get definition for a state alias (@name).
 */
function getStateAliasDefinition(
  document: TextDocument,
  alias: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  configFileUri?: string,
): Location | null {
  // Check for local definition first (higher priority)
  const localLocation = getStateLocation(alias, localDefs);
  if (localLocation) {
    return {
      uri: document.uri,
      range: Range.create(
        document.positionAt(localLocation.start),
        document.positionAt(localLocation.end),
      ),
    };
  }

  // Check if state alias is in config
  if (config.states.includes(alias) && configFileUri) {
    // Return a location pointing to the config file
    return {
      uri: configFileUri,
      range: Range.create(Position.create(0, 0), Position.create(0, 0)),
    };
  }

  return null;
}

/**
 * Extract definition context from a word and its surrounding context.
 */
export function toDefinitionContext(word: string): DefinitionContext {
  return {
    word,
    isToken: word.startsWith('#') || word.startsWith('$'),
    isStateAlias: word.startsWith('@') && !['@media', '@root', '@own', '@supports', '@starting', '@keyframes', '@properties'].includes(word.split('(')[0]),
  };
}
