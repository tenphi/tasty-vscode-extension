/**
 * Tests for the State Key Parser
 */

import {
  parseStateKey,
  isStateKey,
  isSubElement,
  parseSelectorAffix,
  SelectorAffixTokenType,
} from '../server/src/stateParser';
import { TastyTokenType } from '../shared/src/types';

describe('StateKeyParser', () => {
  describe('Default State', () => {
    it('should parse empty string as default state', () => {
      const tokens = parseStateKey('');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.DefaultState);
    });
  });

  describe('Boolean Modifiers', () => {
    it('should parse boolean modifier', () => {
      const tokens = parseStateKey('hovered');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.BooleanMod);
      expect(tokens[0].value).toBe('hovered');
    });

    it('should parse hyphenated modifier', () => {
      const tokens = parseStateKey('is-active');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.BooleanMod);
      expect(tokens[0].value).toBe('is-active');
    });
  });

  describe('Value Modifiers', () => {
    it('should parse value modifier', () => {
      const tokens = parseStateKey('theme=dark');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ValueMod);
      expect(tokens[0].value).toBe('theme=dark');
    });

    it('should parse quoted value modifier', () => {
      const tokens = parseStateKey('size="large"');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ValueMod);
      expect(tokens[0].value).toBe('size="large"');
    });
  });

  describe('Pseudo-classes', () => {
    it('should parse pseudo-class', () => {
      const tokens = parseStateKey(':hover');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.PseudoClass);
      expect(tokens[0].value).toBe(':hover');
    });

    it('should parse complex pseudo-class', () => {
      const tokens = parseStateKey(':focus-visible');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.PseudoClass);
      expect(tokens[0].value).toBe(':focus-visible');
    });

    it('should parse functional pseudo-class', () => {
      const tokens = parseStateKey(':nth-child(2n)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.PseudoClass);
      expect(tokens[0].value).toBe(':nth-child(2n)');
    });
  });

  describe('Selectors', () => {
    it('should parse class selector', () => {
      const tokens = parseStateKey('.active');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ClassSelector);
      expect(tokens[0].value).toBe('.active');
    });

    it('should parse attribute selector', () => {
      const tokens = parseStateKey('[disabled]');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.AttrSelector);
      expect(tokens[0].value).toBe('[disabled]');
    });

    it('should parse attribute selector with value', () => {
      const tokens = parseStateKey('[aria-expanded="true"]');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.AttrSelector);
      expect(tokens[0].value).toBe('[aria-expanded="true"]');
    });
  });

  describe('Advanced States', () => {
    it('should parse @media state', () => {
      const tokens = parseStateKey('@media(w < 768px)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.MediaState);
      expect(tokens[0].value).toBe('@media(w < 768px)');
    });

    it('should parse @root state', () => {
      const tokens = parseStateKey('@root(theme=dark)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.RootState);
      expect(tokens[0].value).toBe('@root(theme=dark)');
    });

    it('should parse @own state', () => {
      const tokens = parseStateKey('@own(hovered)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.OwnState);
      expect(tokens[0].value).toBe('@own(hovered)');
    });

    it('should parse @starting state', () => {
      const tokens = parseStateKey('@starting');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.StartingState);
      expect(tokens[0].value).toBe('@starting');
    });

    it('should parse container query shorthand', () => {
      const tokens = parseStateKey('@(card, w >= 400px)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ContainerState);
    });

    it('should parse state alias', () => {
      const tokens = parseStateKey('@mobile', ['@mobile', '@tablet']);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.StateAlias);
      expect(tokens[0].value).toBe('@mobile');
    });
    
    it('should parse unknown state alias (for validation)', () => {
      // @state2 is NOT in the known aliases, but should still parse as StateAlias
      const tokens = parseStateKey('type=file | @state2', ['@state']);
      // Filter out whitespace tokens
      const nonWhitespace = tokens.filter(t => t.type !== TastyTokenType.Whitespace);
      expect(nonWhitespace).toHaveLength(3);
      expect(nonWhitespace[0].type).toBe(TastyTokenType.ValueMod);
      expect(nonWhitespace[0].value).toBe('type=file');
      expect(nonWhitespace[1].type).toBe(TastyTokenType.StateOperator);
      expect(nonWhitespace[1].value).toBe('|');
      expect(nonWhitespace[2].type).toBe(TastyTokenType.StateAlias);
      expect(nonWhitespace[2].value).toBe('@state2');
    });
  });

  describe('Logical Operators', () => {
    it('should parse AND operator', () => {
      const tokens = parseStateKey('hovered & focused');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TastyTokenType.BooleanMod);
      expect(tokens[1].type).toBe(TastyTokenType.StateOperator);
      expect(tokens[1].value).toBe('&');
      expect(tokens[2].type).toBe(TastyTokenType.BooleanMod);
    });

    it('should parse NOT operator', () => {
      const tokens = parseStateKey('!disabled');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TastyTokenType.StateOperator);
      expect(tokens[0].value).toBe('!');
      expect(tokens[1].type).toBe(TastyTokenType.BooleanMod);
    });

    it('should parse complex expression', () => {
      const tokens = parseStateKey('hovered & !disabled');
      expect(tokens).toHaveLength(4);
    });
  });
});

describe('isStateKey', () => {
  it('should return true for empty string', () => {
    expect(isStateKey('')).toBe(true);
  });

  it('should return true for boolean modifiers', () => {
    expect(isStateKey('hovered')).toBe(true);
  });

  it('should return true for pseudo-classes', () => {
    expect(isStateKey(':hover')).toBe(true);
  });

  it('should return true for @ states', () => {
    expect(isStateKey('@mobile')).toBe(true);
  });

  it('should return true for expressions with operators', () => {
    expect(isStateKey('hovered & focused')).toBe(true);
  });
});

describe('isSubElement', () => {
  it('should return true for capitalized names', () => {
    expect(isSubElement('Title')).toBe(true);
    expect(isSubElement('Content')).toBe(true);
    expect(isSubElement('Icon')).toBe(true);
  });

  it('should return false for lowercase names', () => {
    expect(isSubElement('title')).toBe(false);
    expect(isSubElement('padding')).toBe(false);
  });

  it('should return false for @ prefixed names', () => {
    expect(isSubElement('@keyframes')).toBe(false);
  });
});

describe('parseSelectorAffix', () => {
  describe('Combinators', () => {
    it('should parse > as direct child combinator', () => {
      const tokens = parseSelectorAffix('>');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[0].value).toBe('>');
    });

    it('should parse + as adjacent sibling combinator', () => {
      const tokens = parseSelectorAffix('+');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[0].value).toBe('+');
    });

    it('should parse ~ as general sibling combinator', () => {
      const tokens = parseSelectorAffix('~');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[0].value).toBe('~');
    });
  });

  describe('Sub-elements', () => {
    it('should parse capitalized identifier as sub-element', () => {
      const tokens = parseSelectorAffix('Body');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.SubElement);
      expect(tokens[0].value).toBe('Body');
    });

    it('should parse >Body>Row> as element chain', () => {
      const tokens = parseSelectorAffix('>Body>Row>');
      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[1].type).toBe(SelectorAffixTokenType.SubElement);
      expect(tokens[1].value).toBe('Body');
      expect(tokens[2].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[3].type).toBe(SelectorAffixTokenType.SubElement);
      expect(tokens[3].value).toBe('Row');
      expect(tokens[4].type).toBe(SelectorAffixTokenType.Combinator);
    });
  });

  describe('HTML tags', () => {
    it('should parse lowercase identifier as HTML tag', () => {
      const tokens = parseSelectorAffix('ul');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.HtmlTag);
      expect(tokens[0].value).toBe('ul');
    });

    it('should parse >ul>li as tag chain', () => {
      const tokens = parseSelectorAffix('>ul>li');
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[1].type).toBe(SelectorAffixTokenType.HtmlTag);
      expect(tokens[1].value).toBe('ul');
      expect(tokens[2].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[3].type).toBe(SelectorAffixTokenType.HtmlTag);
      expect(tokens[3].value).toBe('li');
    });
  });

  describe('Pseudo-elements', () => {
    it('should parse ::before as pseudo-element', () => {
      const tokens = parseSelectorAffix('::before');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.PseudoElement);
      expect(tokens[0].value).toBe('::before');
    });

    it('should parse ::after as pseudo-element', () => {
      const tokens = parseSelectorAffix('::after');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.PseudoElement);
      expect(tokens[0].value).toBe('::after');
    });

    it('should parse ::before, ::after as multiple pseudo-elements', () => {
      const tokens = parseSelectorAffix('::before, ::after');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.PseudoElement);
      expect(tokens[0].value).toBe('::before');
      expect(tokens[1].type).toBe(SelectorAffixTokenType.Punctuation);
      expect(tokens[1].value).toBe(',');
      expect(tokens[2].type).toBe(SelectorAffixTokenType.PseudoElement);
      expect(tokens[2].value).toBe('::after');
    });
  });

  describe('Pseudo-classes', () => {
    it('should parse :hover as pseudo-class', () => {
      const tokens = parseSelectorAffix(':hover');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.PseudoClass);
      expect(tokens[0].value).toBe(':hover');
    });

    it('should parse >@:hover as combinator + placeholder + pseudo-class', () => {
      const tokens = parseSelectorAffix('>@:hover');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[0].value).toBe('>');
      expect(tokens[1].type).toBe(SelectorAffixTokenType.Placeholder);
      expect(tokens[1].value).toBe('@');
      expect(tokens[2].type).toBe(SelectorAffixTokenType.PseudoClass);
      expect(tokens[2].value).toBe(':hover');
    });
  });

  describe('Class and attribute selectors', () => {
    it('should parse .active as class selector', () => {
      const tokens = parseSelectorAffix('.active');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.ClassSelector);
      expect(tokens[0].value).toBe('.active');
    });

    it('should parse [disabled] as attribute selector', () => {
      const tokens = parseSelectorAffix('[disabled]');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.AttrSelector);
      expect(tokens[0].value).toBe('[disabled]');
    });

    it('should parse >@.active as combinator + placeholder + class', () => {
      const tokens = parseSelectorAffix('>@.active');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[1].type).toBe(SelectorAffixTokenType.Placeholder);
      expect(tokens[2].type).toBe(SelectorAffixTokenType.ClassSelector);
    });
  });

  describe('Complex patterns', () => {
    it('should parse >Item+ as combinator + sub-element + combinator', () => {
      const tokens = parseSelectorAffix('>Item+');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[0].value).toBe('>');
      expect(tokens[1].type).toBe(SelectorAffixTokenType.SubElement);
      expect(tokens[1].value).toBe('Item');
      expect(tokens[2].type).toBe(SelectorAffixTokenType.Combinator);
      expect(tokens[2].value).toBe('+');
    });

    it('should parse a:hover as tag + pseudo-class', () => {
      const tokens = parseSelectorAffix('a:hover');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(SelectorAffixTokenType.HtmlTag);
      expect(tokens[0].value).toBe('a');
      expect(tokens[1].type).toBe(SelectorAffixTokenType.PseudoClass);
      expect(tokens[1].value).toBe(':hover');
    });
  });
});

describe('Container Queries', () => {
  it('should parse named container query with size condition', () => {
    const tokens = parseStateKey('@(panel, w >= 300px)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.ContainerState);
    expect(tokens[0].value).toBe('@(panel, w >= 300px)');
    expect(tokens[0].children).toBeDefined();
  });

  it('should parse unnamed container query', () => {
    const tokens = parseStateKey('@(w >= 400px)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.ContainerState);
  });

  it('should parse style query with $variant', () => {
    const tokens = parseStateKey('@(card, $variant)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.ContainerState);
    expect(tokens[0].children).toBeDefined();
  });

  it('should parse style query with $variant=value', () => {
    const tokens = parseStateKey('@(sidebar, $variant=danger)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.ContainerState);
  });
});

describe('Supports Queries', () => {
  it('should parse @supports with property check', () => {
    const tokens = parseStateKey('@supports(display: grid-lanes)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.SupportsState);
    expect(tokens[0].value).toBe('@supports(display: grid-lanes)');
  });

  it('should parse @supports with simple property check', () => {
    const tokens = parseStateKey('@supports(display: grid)');
    expect(tokens[0].type).toBe(TastyTokenType.SupportsState);
    expect(tokens[0].value).toBe('@supports(display: grid)');
  });
});

describe('Range Syntax in Media Queries', () => {
  it('should parse simple comparison', () => {
    const tokens = parseStateKey('@media(w < 768px)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.MediaState);
    expect(tokens[0].children).toBeDefined();
    // Should have children: w, <, 768px
    const children = tokens[0].children!;
    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  it('should parse range with two conditions', () => {
    const tokens = parseStateKey('@media(768px <= w < 1024px)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.MediaState);
  });

  it('should parse height query', () => {
    const tokens = parseStateKey('@media(h > 800px)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.MediaState);
  });
});

describe(':has() Sub-element Support', () => {
  it('should parse :has(SubElement) with sub-element detection', () => {
    const tokens = parseStateKey(':has(Body)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.PseudoClass);
    expect(tokens[0].value).toBe(':has(Body)');
    expect(tokens[0].children).toBeDefined();
    expect(tokens[0].children).toHaveLength(1);
    expect(tokens[0].children![0].type).toBe(TastyTokenType.SubElement);
    expect(tokens[0].children![0].value).toBe('Body');
  });

  it('should parse :has(Body > Row) with combinator and sub-elements', () => {
    const tokens = parseStateKey(':has(Body > Row)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.PseudoClass);
    expect(tokens[0].children).toBeDefined();
    expect(tokens[0].children!.length).toBeGreaterThan(1);
    
    // Find sub-element tokens
    const subElements = tokens[0].children!.filter(
      (t) => t.type === TastyTokenType.SubElement,
    );
    expect(subElements).toHaveLength(2);
    expect(subElements[0].value).toBe('Body');
    expect(subElements[1].value).toBe('Row');
  });

  it('should parse :has(Item) in combined state', () => {
    const tokens = parseStateKey('hovered & :has(Item)');
    expect(tokens.length).toBeGreaterThan(1);
    
    // Find the :has pseudo-class
    const hasPseudo = tokens.find(
      (t) => t.type === TastyTokenType.PseudoClass && t.value.startsWith(':has'),
    );
    expect(hasPseudo).toBeDefined();
    expect(hasPseudo!.children).toBeDefined();
    expect(hasPseudo!.children![0].type).toBe(TastyTokenType.SubElement);
    expect(hasPseudo!.children![0].value).toBe('Item');
  });

  it('should parse :is() with sub-elements', () => {
    const tokens = parseStateKey(':is(Header, Footer)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TastyTokenType.PseudoClass);
    expect(tokens[0].value).toBe(':is(Header, Footer)');
    expect(tokens[0].children).toBeDefined();
    
    const subElements = tokens[0].children!.filter(
      (t) => t.type === TastyTokenType.SubElement,
    );
    expect(subElements).toHaveLength(2);
  });
});
