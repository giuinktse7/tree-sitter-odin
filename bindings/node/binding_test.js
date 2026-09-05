const assert = require("node:assert");
const { test } = require("node:test");

const Parser = require("tree-sitter");

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require(".")));
});

test("exposes semantic member and operand fields", () => {
  const parser = new Parser();
  parser.setLanguage(require("."));

  const source = `State :: enum { Ready, Alias = Ready }
run :: proc(first, second: int) {
  target, other = source, target
  selected := object.member
}`;
  const root = parser.parse(source).rootNode;

  assert.equal(root.hasError, false);

  const enumDeclaration = root.namedChild(0);
  const enumMembers = enumDeclaration.childrenForFieldName("member");
  assert.equal(enumMembers.length, 2);
  assert.equal(enumMembers[1].childForFieldName("name").text, "Alias");
  assert.equal(enumMembers[1].childForFieldName("value").text, "Ready");

  const procedure = root.namedChild(1).childForFieldName("value");
  const parameters = procedure
    .childForFieldName("signature")
    .childForFieldName("parameters");
  assert.deepEqual(
    parameters.namedChild(0).childrenForFieldName("name").map(node => node.text),
    ["first", "second"],
  );

  const body = procedure.childForFieldName("body");
  const assignment = body.namedChild(0);
  assert.deepEqual(
    assignment.childrenForFieldName("left").map(node => node.text),
    ["target", "other"],
  );
  assert.deepEqual(
    assignment.childrenForFieldName("right").map(node => node.text),
    ["source", "target"],
  );
  assert.equal(assignment.childForFieldName("operator").text, "=");

  const member = body.namedChild(1).childForFieldName("value");
  assert.equal(member.childForFieldName("operand").text, "object");
  assert.equal(member.childForFieldName("field").text, "member");
});
