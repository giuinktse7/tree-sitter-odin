const assert = require('node:assert/strict');
const { test } = require('node:test');
const Parser = require('tree-sitter');
const Odin = require('.');

function parse(body) {
  const parser = new Parser();
  parser.setLanguage(Odin);
  return parser.parse(`run :: proc() {\n${body}\n}`).rootNode;
}

test('selector calls expose receiver, method and arguments', () => {
  const root = parse('result := receiver->method(arg).field');
  assert.equal(root.hasError, false);
  const call = root.descendantsOfType('selector_call_expression')[0];
  assert.equal(call.childForFieldName('operand').text, 'receiver');
  assert.equal(call.childForFieldName('function').text, 'method');
  assert.equal(call.childForFieldName('argument').text, 'arg');
  for (const value of ['receiver->(method)(arg)', 'receiver->table.method(arg)', 'receiver->table[0](arg)']) {
    assert.equal(parse(`result := ${value}`).hasError, true, value);
  }
});

test('type assertions are distinct from selectors and accept types', () => {
  for (const type of ['Thing', '^Thing', '[]Thing', 'map[string]int', 'proc(int) -> bool']) {
    const root = parse(`result := value.(${type})`);
    assert.equal(root.hasError, false, type);
    const assertion = root.descendantsOfType('type_assertion_expression')[0];
    assert.equal(assertion.childForFieldName('operand').text, 'value');
    assert.equal(assertion.childForFieldName('type').text, type);
  }
  const inferred = parse('result := value.?');
  assert.equal(inferred.hasError, false);
  assert.equal(inferred.descendantsOfType('type_assertion_expression').length, 1);
  assert.equal(parse('result := value.(left + right)').hasError, true);
});

test('pointer types are expression operands without changing dereferences', () => {
  const root = parse(`check :: proc($T: typeid, $field: string)
    where intrinsics.type_field_type(T, field) == ^T {}`);
  assert.equal(root.hasError, false);
  const comparison = root.descendantsOfType('binary_expression')[0];
  assert.equal(comparison.childForFieldName('right').type, 'pointer_type');
  for (const source of ['result := typeid_of(value) == ^^Thing',
    'Pointer :: ^Thing', 'accept(^Thing)', 'switch T { case ^Thing: }',
    'result := pointer^', 'result := pointer^.field', 'result := (^Thing)pointer']) {
    assert.equal(parse(source).hasError, false, source);
  }
  assert.equal(parse('result := pointer^').descendantsOfType('address').length, 1);
});

test('qualified compound literals remain distinct from member access', () => {
  for (const value of ['pkg.Record{field = value}', 'transmute([dynamic]T)runtime.Raw_Dynamic_Array{data = nil}', 'pkg.Record{field = value}.field']) {
    assert.equal(parse(`result := ${value}`).hasError, false, value);
  }
});

test('slice and array types are expression operands', () => {
  for (const type of ['[]int', '[]^Thing', '[4]int', '[dynamic]int', '[^]int']) {
    const root = parse(`check :: proc($T: typeid) { when T == ${type} {} }`);
    assert.equal(root.hasError, false, type);
    const comparison = root.descendantsOfType('binary_expression')[0];
    assert.equal(comparison.childForFieldName('right').type, 'array_type');
    assert.equal(comparison.childForFieldName('right').text, type);
  }
  assert.equal(parse(`check :: proc(arg: $T)
    where T == []^Thing || T == []^Other {}`).hasError, false);
  assert.equal(parse('Slice :: []').hasError, true);
  for (const source of ['Slice :: []int', 'accept([]int)',
    'switch T { case []int: }', 'result := []int{1, 2}',
    'result := [4]int{1, 2, 3, 4}', 'result := items[index]',
    'result := items[start:end]', 'result := ([]int)value']) {
    assert.equal(parse(source).hasError, false, source);
  }
});

test('dynamic arrays accept capacity expressions', () => {
  for (const capacity of ['64', 'MAX_SIZE', 'BASE + EXTRA']) {
    const root = parse(`buffer: [dynamic; ${capacity}]byte`);
    assert.equal(root.hasError, false, capacity);
    const type = root.descendantsOfType('array_type')[0];
    assert.equal(type.childForFieldName('capacity').text, capacity);
    assert.equal(parse(`buffer := [dynamic; ${capacity}]byte{1, 2}`).hasError, false);
    assert.equal(parse(`when T == [dynamic; ${capacity}]byte {}`).hasError, false);
  }
  assert.equal(parse('buffer: [dynamic]byte').hasError, false);
  assert.equal(parse('buffer: [dynamic;]byte').hasError, true);
  assert.equal(parse('buffer: [dynamic; 64]').hasError, true);
  assert.equal(parse('buffer: [4; 64]byte').hasError, true);
});

test('short declarations require names in blocks and control headers', () => {
  assert.equal(parse('callback := #force_inline proc(value: int) -> int { return value }').hasError, false);
  for (const declaration of ['value := get()', 'value, ok := get()']) {
    for (const body of [declaration, `if ${declaration}; ok {}`, `for ${declaration}; ok; value = next {}`, `switch ${declaration}; value { case 1: }`]) {
      const root = parse(body);
      assert.equal(root.hasError, false, body);
      assert.ok(root.descendantsOfType('variable_declaration').length > 0, body);
    }
  }
  assert.equal(parse('if ok {} else if value := get(); value {}').hasError, false);
  for (const target of ['object.field', 'items[0]', '(value)', 'left + right']) {
    for (const body of [`${target} := get()`, `if ${target} := get(); ok {}`, `for ${target} := get(); ok; value = next {}`, `switch ${target} := get(); value {}`]) {
      assert.equal(parse(body).hasError, true, body);
    }
  }
  assert.equal(parse('object.field = value\nitems[0] = value').hasError, false);
});

test('float tokens preserve separators and adjacent arithmetic operators', () => {
  for (const value of ['1_024.0', '1.0+value', '1.0-value', '1.0e+2+value', '1.0e-2-value']) {
    const root = parse(`result := ${value}`);
    assert.equal(root.hasError, false, value);
    assert.equal(root.descendantsOfType('float').length, 1, value);
    assert.equal(root.descendantsOfType('member_expression').length, 0, value);
  }
});

test('range loops expose identifier bindings including reference bindings', () => {
  for (const bindings of ['', 'value', 'value, index', '&value', '&value, index']) {
    const root = parse(`for ${bindings} in values {}`);
    assert.equal(root.hasError, false, bindings);
    const loop = root.descendantsOfType('for_statement')[0];
    assert.equal(loop.childForFieldName('iterable').text, 'values');
    assert.deepEqual(loop.childrenForFieldName('binding').map(node => node.text),
      bindings.replace('&', '').split(',').map(value => value.trim()).filter(Boolean));
  }
  const initialized = parse('for source := get(); value in source {}');
  assert.equal(initialized.hasError, false);
  const loop = initialized.descendantsOfType('for_statement')[0];
  assert.equal(loop.childForFieldName('initializer').type, 'variable_declaration');
  assert.equal(loop.childForFieldName('binding').text, 'value');
  for (const bindings of ['object.field', 'items[0]', 'value,', 'value,,index']) {
    assert.equal(parse(`for ${bindings} in values {}`).hasError, true, bindings);
  }
  assert.equal(parse('for (value in values) {}').hasError, false);
  assert.equal(parse('for value in values; value = next {}').hasError, true);
});
