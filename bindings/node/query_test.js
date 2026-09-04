const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const Parser = require("tree-sitter");
const Odin = require(".");

const source = `package query_fixture
import fmt "core:fmt"

Thing :: struct {
  first, second: int,
}

Inline_Thing :: #type struct {
  nested: int,
}

State :: enum {
  Ready,
  Alias = Ready,
}

Inline_State :: #type enum {
  First,
  Second = First,
}

Flags :: bit_field u8 {
  enabled: bool | 1,
}

Inline_Flags :: #type bit_field u8 {
  low: u8 | 2,
}

overloads :: proc {first_handler, second_handler}
Callback :: proc(value: int) -> bool

when ODIN_OS == .Windows {
  windows_only :: proc() {}
} else when ODIN_OS == .Linux {
  linux_only :: proc() {}
} else {
  fallback :: proc() {}
}

process :: proc(
  first, second: int,
  limit: int = MAX,
  allocator := context.allocator,
) {
  target, other := source, target
  selected := object.member
}`;

function parse() {
  const parser = new Parser();
  parser.setLanguage(Odin);
  const root = parser.parse(source).rootNode;
  assert.equal(root.hasError, false);
  return root;
}

function readQuery(name, normalizePredicates = false) {
  const queryPath = path.join(__dirname, "..", "..", "queries", `${name}.scm`);
  let querySource = fs.readFileSync(queryPath, "utf8");

  if (normalizePredicates) {
    // Neovim predicates are not registered by the Node Tree-sitter binding.
    querySource = querySource
      .replaceAll("#lua-match?", "#match?")
      .replace(
        /\(#not-has-parent\? (@[A-Za-z._]+) [^)]*\)/g,
        '(#match? $1 ".*")',
      );
  }

  return new Parser.Query(Odin, querySource);
}

function hasCapture(captures, name, text, parentType) {
  return captures.some(capture =>
    capture.name === name &&
    capture.node.text === text &&
    capture.node.parent.type === parentType
  );
}

test("highlight query uses semantic declaration and member fields", () => {
  const captures = readQuery("highlights", true).captures(parse());

  assert.ok(hasCapture(captures, "namespace", "query_fixture", "package_declaration"));
  assert.ok(hasCapture(captures, "namespace", "fmt", "import_declaration"));
  assert.ok(hasCapture(captures, "type", "Thing", "struct_declaration"));
  assert.ok(hasCapture(captures, "function", "process", "procedure_declaration"));
  assert.ok(hasCapture(captures, "function", "overloads", "overloaded_procedure_declaration"));
  assert.ok(hasCapture(captures, "parameter", "first", "parameter"));
  assert.ok(hasCapture(captures, "parameter", "second", "parameter"));
  assert.ok(hasCapture(captures, "parameter", "allocator", "default_parameter"));
  assert.ok(hasCapture(captures, "field", "first", "field"));
  assert.ok(hasCapture(captures, "field", "enabled", "bit_field_member"));
  assert.ok(hasCapture(captures, "field", "member", "member_expression"));
  assert.ok(hasCapture(captures, "constant", "Alias", "enum_member"));
  assert.ok(hasCapture(captures, "constant", "Windows", "member_expression"));
  assert.equal(hasCapture(captures, "constant", "member", "member_expression"), false);
});

test("locals query distinguishes definitions from same-kind sibling references", () => {
  const captures = readQuery("locals").captures(parse());

  assert.ok(hasCapture(captures, "definition.function", "process", "procedure_declaration"));
  assert.ok(hasCapture(captures, "definition.function", "overloads", "overloaded_procedure_declaration"));
  assert.ok(hasCapture(captures, "definition.parameter", "first", "parameter"));
  assert.ok(hasCapture(captures, "definition.field", "second", "field"));
  assert.ok(hasCapture(captures, "definition.field", "enabled", "bit_field_member"));
  assert.ok(hasCapture(captures, "definition.enum", "Alias", "enum_member"));

  const enumReadyDefinitions = captures.filter(
    capture => capture.name === "definition.enum" && capture.node.text === "Ready",
  );
  assert.equal(enumReadyDefinitions.length, 1);

  const targetDefinitions = captures.filter(
    capture => capture.name === "definition.var" && capture.node.text === "target",
  );
  assert.equal(targetDefinitions.length, 1);
});

test("fold and indent queries cover declaration-only and inline compound nodes", () => {
  const root = parse();
  const localScopes = readQuery("locals")
    .captures(root)
    .filter(capture => capture.name === "scope")
    .map(capture => capture.node.type);
  assert.ok(localScopes.includes("declaration_block"));

  const foldTypes = readQuery("folds").captures(root).map(capture => capture.node.type);
  assert.ok(foldTypes.includes("conditional_declaration"));
  assert.ok(foldTypes.includes("else_when_declaration_clause"));
  assert.ok(foldTypes.includes("else_declaration_clause"));

  const indentTypes = readQuery("indents")
    .captures(root)
    .filter(capture => capture.name === "indent.begin")
    .map(capture => capture.node.type);
  assert.ok(indentTypes.includes("declaration_block"));
  assert.ok(indentTypes.includes("struct_type"));
  assert.ok(indentTypes.includes("enum_type"));
  assert.ok(indentTypes.includes("bit_field_type"));
  assert.ok(indentTypes.includes("bit_field_declaration"));
});
