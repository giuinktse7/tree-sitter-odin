const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fixturePath = path.join(__dirname, "navigation.odin");
const source = fs.readFileSync(fixturePath);
const files = JSON.parse(fs.readFileSync(0, "utf8"));

assert.equal(files.length, 1);
assert.equal(files[0].language, "odin");

const items = files[0].items;
const expectedItems = [
  ["navigation_fixture", "package", "package_declaration", false],
  ["core:fmt", "module", "import_declaration", false],
  ["runtime", "module", "import_declaration", false],
  ["Public_Procedure", "function", "procedure_declaration", true],
  ["Bodyless_Procedure", "function", "procedure_declaration", true],
  ["private_procedure", "function", "procedure_declaration", false],
  ["Private_By_Attribute", "function", "procedure_declaration", false],
  ["Still_Public", "function", "procedure_declaration", true],
  ["Dispatch", "function", "overloaded_procedure_declaration", true],
  ["Record", "struct", "struct_declaration", true],
  ["private_record", "struct", "struct_declaration", false],
  ["Status", "enum", "enum_declaration", true],
  ["Payload", "struct", "union_declaration", true],
  ["Width", "constant", "const_declaration", true],
  ["Flags", "struct", "bit_field_declaration", true],
  ["COUNT", "constant", "const_declaration", true],
  ["typed_count", "constant", "const_type_declaration", false],
  ["Current", "variable", "variable_declaration", true],
  ["typed_value", "variable", "var_declaration", false],
  ["declared_value", "variable", "var_declaration", false],
  ["Inline_Struct", "struct", "const_declaration", true],
  ["Inline_Enum", "enum", "const_declaration", true],
  ["Inline_Union", "struct", "const_declaration", true],
  ["Inline_Bit_Field", "struct", "const_declaration", true],
  ["Conditional_Procedure", "function", "procedure_declaration", true],
  ["Duplicate", "function", "procedure_declaration", true],
  ["Duplicate", "function", "procedure_declaration", true],
  ["Foreign_Procedure", "function", "procedure_declaration", true],
  ["foreign_private", "function", "procedure_declaration", false],
  ["Nested_Foreign_Procedure", "function", "procedure_declaration", true],
];

assert.deepEqual(
  items.map(item => [item.name, item.symbolType, item.astKind, item.isExported]),
  expectedItems,
);

for (const item of items) {
  assert.equal(item.role, "item");
  assert.equal(typeof item.isImport, "boolean");
  assert.equal(typeof item.isExported, "boolean");
  assert.equal(rangeText(item), rangeText(item).trim());
}

assert.equal(items[0].signature, "package navigation_fixture");
assert.equal(items[1].isImport, true);
assert.equal(items[2].isImport, true);
assert.ok(items.slice(3).every(item => item.isImport === false));

const publicProcedure = item("Public_Procedure");
assert.equal(
  publicProcedure.signature,
  "Public_Procedure :: proc(\n" +
    "    left: int,\n" +
    "    right := 1,\n" +
    ") -> (sum: int, ok: bool) where left > 0",
);
assert.ok(rangeText(publicProcedure).includes("Local_Only :: proc() {}"));
assert.equal(item("Bodyless_Procedure").signature.includes("---"), false);
assert.ok(rangeText(item("Bodyless_Procedure")).endsWith("---"));
assert.ok(rangeText(item("Private_By_Attribute")).startsWith("@(private = \"file\")"));

assert.deepEqual(memberSummary(item("Record")), [
  ["Public_Field", "field", "field", true, "Public_Field, Other_Public_Field: int"],
  ["private_field", "field", "field", false, "private_field: string"],
]);
assert.deepEqual(memberSummary(item("Status")), [
  ["Ready", "enumMember", "enum_member", true, "Ready = 1"],
  ["Alias", "enumMember", "enum_member", true, "Alias = Ready"],
  ["hidden", "enumMember", "enum_member", false, "hidden = Alias"],
]);
assert.deepEqual(memberSummary(item("Flags")), [
  ["Enabled", "field", "bit_field_member", true, "Enabled: bool | 1"],
  ["Mode", "field", "bit_field_member", true, "Mode: u8 | Width"],
  ["hidden", "field", "bit_field_member", false, "hidden: u8 | Width"],
]);
assert.deepEqual(memberSummary(item("Inline_Struct")), [
  ["Nested_Field", "field", "struct_member", true, "Nested_Field: int"],
]);
assert.deepEqual(memberSummary(item("Inline_Enum")), [
  ["Nested_Member", "enumMember", "enum_member", true, "Nested_Member"],
]);
assert.deepEqual(memberSummary(item("Inline_Bit_Field")), [
  ["Nested_Bit", "field", "bit_field_member", true, "Nested_Bit: u8 | 1"],
]);

assert.equal(items.filter(candidate => candidate.name === "Duplicate").length, 2);
for (const localName of ["Local_Only", "Local_Value", "Nested_Field", "Nested_Member", "Nested_Bit"]) {
  assert.equal(items.some(candidate => candidate.name === localName), false);
}

function item(name) {
  const matches = items.filter(candidate => candidate.name === name);
  assert.equal(matches.length, 1, `expected one outline item named ${name}`);
  return matches[0];
}

function rangeText(entry) {
  const {start, end} = entry.range.byteOffset;
  return source.subarray(start, end).toString("utf8");
}

function memberSummary(parent) {
  return (parent.members || []).map(member => [
    member.name,
    member.symbolType,
    member.astKind,
    member.isPublic,
    rangeText(member),
  ]);
}
