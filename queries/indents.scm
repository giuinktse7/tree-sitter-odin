[
  (block)
  (declaration_block)
  (enum_declaration)
  (enum_type)
  (union_declaration)
  (struct_declaration)
  (struct_type)
  (struct)
  (bit_field_declaration)
  (bit_field_type)
  (parameters)
  (tuple_type)
  (call_expression)
  (switch_case)
] @indent.begin

; hello(
((identifier) . (ERROR "(" @indent.begin))

[
  ")"
  "]"
] @indent.branch @indent.end

; Have to do all closing brackets separately because the one for switch statements shouldn't end.
(block "}" @indent.branch @indent.end)
(declaration_block "}" @indent.branch @indent.end)
(enum_declaration "}" @indent.branch @indent.end)
(enum_type "}" @indent.branch @indent.end)
(union_declaration "}" @indent.branch @indent.end)
(struct_declaration "}" @indent.branch @indent.end)
(struct_type "}" @indent.branch @indent.end)
(struct "}" @indent.branch @indent.end)
(bit_field_declaration "}" @indent.branch @indent.end)
(bit_field_type "}" @indent.branch @indent.end)

[
  (comment)
  (block_comment)
  (string)
  (ERROR)
] @indent.auto
