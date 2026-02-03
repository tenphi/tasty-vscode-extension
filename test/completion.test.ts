/**
 * Tests for the Completion Provider
 */

import { getCompletions, CompletionContext } from '../server/src/completion';
import { createEmptyConfig, MergedConfig } from '../shared/src/configTypes';
import { createEmptyLocalDefinitions, LocalDefinitions } from '../server/src/localDefinitions';

// CompletionItemKind enum values (from vscode-languageserver)
const CompletionItemKind = {
  Property: 10,
  Color: 16,
  EnumMember: 20,
  Unit: 11,
  Keyword: 14,
};

describe('CompletionProvider', () => {
  let config: MergedConfig;
  let localDefs: LocalDefinitions;

  beforeEach(() => {
    config = {
      ...createEmptyConfig(),
      tokens: ['#primary', '#secondary', '$gap', '$spacing'],
      presets: ['h1', 'h2', 't1', 't2'],
      states: ['@mobile', '@dark'],
    };
    localDefs = createEmptyLocalDefinitions();
  });

  describe('Property Name Completions', () => {
    it('should provide property name completions', () => {
      const context: CompletionContext = {
        isPropertyName: true,
        isPropertyValue: false,
        isStateKey: false,
        textBefore: '',
      };

      const items = getCompletions(context, config, localDefs);
      expect(items.length).toBeGreaterThan(0);
      
      const paddingItem = items.find(i => i.label === 'padding');
      expect(paddingItem).toBeDefined();
      expect(paddingItem!.kind).toBe(CompletionItemKind.Property);
    });
  });

  describe('Property Value Completions', () => {
    it('should provide color token completions', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'fill',
        isStateKey: false,
        textBefore: '#',
      };

      const items = getCompletions(context, config, localDefs);
      
      const primaryItem = items.find(i => i.label === '#primary');
      expect(primaryItem).toBeDefined();
      expect(primaryItem!.kind).toBe(CompletionItemKind.Color);
    });

    it('should provide preset completions for preset property', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'preset',
        isStateKey: false,
        textBefore: '',
      };

      const items = getCompletions(context, config, localDefs);
      
      const h1Item = items.find(i => i.label === 'h1');
      expect(h1Item).toBeDefined();
      expect(h1Item!.kind).toBe(CompletionItemKind.EnumMember);

      // Should also provide modifier combos
      const h1StrongItem = items.find(i => i.label === 'h1 strong');
      expect(h1StrongItem).toBeDefined();
    });

    it('should provide unit completions after number', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'padding',
        isStateKey: false,
        textBefore: '2',
      };

      const items = getCompletions(context, config, localDefs);
      
      const xUnitItem = items.find(i => i.label === 'x');
      expect(xUnitItem).toBeDefined();
      expect(xUnitItem!.kind).toBe(CompletionItemKind.Unit);
    });

    it('should provide direction modifiers for padding', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'padding',
        isStateKey: false,
        textBefore: '2x ',
      };

      const items = getCompletions(context, config, localDefs);
      
      const topItem = items.find(i => i.label === 'top');
      expect(topItem).toBeDefined();
      expect(topItem!.kind).toBe(CompletionItemKind.Keyword);
    });

    it('should provide flow property values', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'flow',
        isStateKey: false,
        textBefore: '',
      };

      const items = getCompletions(context, config, localDefs);
      
      const rowItem = items.find(i => i.label === 'row');
      expect(rowItem).toBeDefined();
      expect(rowItem!.kind).toBe(CompletionItemKind.EnumMember);

      const columnWrapItem = items.find(i => i.label === 'column wrap');
      expect(columnWrapItem).toBeDefined();
    });

    it('should provide display property values', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'display',
        isStateKey: false,
        textBefore: '',
      };

      const items = getCompletions(context, config, localDefs);
      
      const flexItem = items.find(i => i.label === 'flex');
      expect(flexItem).toBeDefined();

      const gridItem = items.find(i => i.label === 'grid');
      expect(gridItem).toBeDefined();
    });

    it('should provide border style completions for border property', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'border',
        isStateKey: false,
        textBefore: '',
      };

      const items = getCompletions(context, config, localDefs);
      
      const solidItem = items.find(i => i.label === 'solid');
      expect(solidItem).toBeDefined();
      expect(solidItem!.kind).toBe(CompletionItemKind.Keyword);

      const dashedItem = items.find(i => i.label === 'dashed');
      expect(dashedItem).toBeDefined();

      const dottedItem = items.find(i => i.label === 'dotted');
      expect(dottedItem).toBeDefined();
    });

    it('should provide border style completions for outline property', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: true,
        propertyName: 'outline',
        isStateKey: false,
        textBefore: '',
      };

      const items = getCompletions(context, config, localDefs);
      
      const solidItem = items.find(i => i.label === 'solid');
      expect(solidItem).toBeDefined();

      const noneItem = items.find(i => i.label === 'none');
      expect(noneItem).toBeDefined();
    });
  });

  describe('State Key Completions', () => {
    it('should provide state alias completions', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: false,
        isStateKey: true,
        textBefore: '@',
      };

      const items = getCompletions(context, config, localDefs);
      
      const mobileItem = items.find(i => i.label === '@mobile');
      expect(mobileItem).toBeDefined();
    });

    it('should provide pseudo-class completions', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: false,
        isStateKey: true,
        textBefore: ':',
      };

      const items = getCompletions(context, config, localDefs);
      
      const hoverItem = items.find(i => i.label === ':hover');
      expect(hoverItem).toBeDefined();
    });

    it('should provide advanced state completions', () => {
      const context: CompletionContext = {
        isPropertyName: false,
        isPropertyValue: false,
        isStateKey: true,
        textBefore: '@',
      };

      const items = getCompletions(context, config, localDefs);
      
      const mediaItem = items.find(i => i.label === '@media');
      expect(mediaItem).toBeDefined();

      const rootItem = items.find(i => i.label === '@root');
      expect(rootItem).toBeDefined();

      const startingItem = items.find(i => i.label === '@starting');
      expect(startingItem).toBeDefined();
    });
  });
});
