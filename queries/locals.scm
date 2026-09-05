; Scopes

[
  (block)
  (declaration_block)
  (declaration)
  (statement)
] @scope

; References

(identifier) @reference

; Definitions

(package_declaration name: (identifier) @definition.namespace)

(import_declaration alias: (identifier) @definition.namespace)

(procedure_declaration name: (identifier) @definition.function)

(overloaded_procedure_declaration name: (identifier) @definition.function)

(struct_declaration name: (identifier) @definition.type)

(enum_declaration name: (identifier) @definition.enum)

(union_declaration name: (identifier) @definition.type)

(bit_field_declaration name: (identifier) @definition.type)

(variable_declaration name: (identifier) @definition.var)

(var_declaration name: (identifier) @definition.var)

(for_statement binding: (identifier) @definition.var)

(const_declaration name: (identifier) @definition.constant)

(const_type_declaration name: (identifier) @definition.type)

(parameter name: (identifier) @definition.parameter)

(default_parameter name: (identifier) @definition.parameter)

(field name: (identifier) @definition.field)

(struct_member name: (identifier) @definition.field)

(enum_member name: (identifier) @definition.enum)

(bit_field_member name: (identifier) @definition.field)

(label_statement (identifier) @definition ":")
