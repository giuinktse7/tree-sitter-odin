const assert = require('node:assert/strict');
const { test } = require('node:test');
const Parser = require('tree-sitter');
const Odin = require('.');

function parse(source) {
  const parser = new Parser();
  parser.setLanguage(Odin);
  return parser.parse(source).rootNode;
}

test('declarations require identifier names', () => {
  const declarations = [
    'NAME :: proc() {}',
    'NAME :: proc {handler}',
    'NAME :: struct {}',
    'NAME :: enum {Ready}',
    'NAME :: union {int, string}',
    'NAME :: bit_field u8 {enabled: bool | 1}',
    'NAME := 1',
    'NAME :: 1',
    'NAME : int : 1',
    'NAME : int = 1',
  ];
  for (const declaration of declarations) {
    assert.equal(parse(declaration.replace('NAME', 'valid')).hasError, false, declaration);
    for (const name of ['object.field', 'items[0]', '(name)', 'left + right']) {
      const source = declaration.replace('NAME', name);
      assert.equal(parse(source).hasError, true, source);
    }
  }
  for (const operator of [':=', '::', ': int =']) {
    const source = `first, second ${operator} 1, 2`;
    assert.equal(parse(source).hasError, false, source);
  }
});

test('selectors preserve chains, calls, implicit selectors and assertions', () => {
  for (const value of ['.Ready', 'value.field', 'get_value().field',
    'value.field.method()', 'value.(Thing)', 'value.?']) {
    assert.equal(parse(`run :: proc() { result := ${value} }`).hasError, false, value);
  }
  const root = parse('run :: proc() { result := object.method(arg) }');
  assert.equal(root.hasError, false);
  const call = root.descendantsOfType('call_expression')[0];
  assert.equal(call.childForFieldName('function').type, 'member_expression');
  assert.equal(call.childForFieldName('function').childForFieldName('field').text, 'method');
  assert.equal(parse('run :: proc() { result := value.123 }').hasError, true);
});

test('labels are identifiers and assignment targets remain expressions', () => {
  const source = `run :: proc() {
    outer: for {
      value := get_value() or_break outer
      items[0] = value
      object.field = value
      break outer
    }
  }`;
  assert.equal(parse(source).hasError, false);
  assert.equal(parse('run :: proc() { object.field: for {} }').hasError, true);
  const breakExpression = parse(source).descendantsOfType('or_break_expression')[0];
  assert.equal(breakExpression.lastNamedChild.type, 'identifier');
  assert.equal(breakExpression.lastNamedChild.text, 'outer');
});
