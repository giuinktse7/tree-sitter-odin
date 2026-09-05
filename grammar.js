/**
 * @file Odin grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 * @see {@link https://odin-lang.org|Official website}
 * @see {@link https://odin-lang.org/docs/overview|Official documentation}
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  PARENTHESES: -1,
  ASSIGNMENT: 1,
  TERNARY: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  COMPARE: 5,
  EQUALITY: 6,
  BITWISE_OR: 7,
  BITWISE_XOR: 8,
  BITWISE_AND: 9,
  BITWISE_AND_NOT: 10,
  SHIFT: 11,
  ADD: 12,
  MULTIPLY: 13,
  CAST: 14,
  IN: 15,
  UNARY: 16,
  CALL: 17,
  MEMBER: 18,
  MATRIX: 19,
  VARIADIC: 20,
};

module.exports = grammar({
  name: 'odin',

  conflicts: $ => [
    // because of optional($.tag)
    [$.array_type],
    [$.variable_declaration, $.const_declaration, $.var_declaration, $._expression_no_in],
    [$.variable_declaration, $.var_declaration, $._expression_no_in],
    [$.variable_declaration, $._for_in_expression, $.var_declaration],
    // lol: size_of(Map_Cell(T){}.data) / size_of(T) when size_of(T) > 0 else 1
    [$._expression_no_in, $.struct],
    [$._expression_no_in, $.type],
    [$._expression_no_in, $.type, $._compound_literal_polymorphic_type],
    [$._expression_no_in, $._compound_literal_polymorphic_type],
    [$._expression_no_in, $.field_identifier],
    [$._tuple_element_type, $._named_type_names],
    [$._expression_no_in, $._tuple_element_type],
    [$._param_name, $.type],
    [$.struct_declaration, $.struct_type],
    [$.union_declaration, $.union_type],
    [$.field, $.struct_member],
  ],

  externals: $ => [
    $._newline,
    $._backslash,
    $._nl_comma,
    $.float,
    $._multiline_string,
    $.block_comment,
    '{',
    '"',
  ],

  extras: $ => [
    $.comment,
    $.block_comment,
    /\s/,
    $._backslash,
  ],

  supertypes: $ => [
    $.declaration,
    $.expression,
    $.literal,
    $.statement,
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(repeat(seq($.declaration, $._separator)), optional($.declaration)),

    block: $ => prec(2, seq(
      '{',
      sep(seq(optional($.tag), $.statement), $._separator),
      '}',
    )),

    declaration_block: $ => seq(
      '{',
      sep($.declaration, $._separator),
      '}',
    ),

    tagged_block: $ => seq($.tag, $.block),

    declaration: $ => choice(
      $.build_tag,
      $.package_declaration,
      $.import_declaration,
      $.procedure_declaration,
      $.overloaded_procedure_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.union_declaration,
      $.bit_field_declaration,
      $.variable_declaration,
      $.var_declaration,
      $.const_declaration,
      $.const_type_declaration,
      $.foreign_block,
      $.conditional_declaration,
      $.directive_declaration,
    ),

    directive_declaration: $ => seq(
      field('directive', $.tag),
      optional($._call_arguments),
    ),

    build_tag: $ => seq('#+', /.+/),

    package_declaration: $ => seq('package', field('name', $.identifier)),

    import_declaration: $ => seq(
      optional($.attributes),
      optional('foreign'),
      'import',
      optional(field('alias', $.identifier)),
      choice(
        field('path', $.string),
        seq(
          '{',
          commaSep1(field('path', choice($.string, $.identifier))),
          optional(','),
          '}',
        ),
      ),
    ),

    procedure_declaration: $ => seq(
      optional($.attributes),
      field('name', $.identifier),
      '::',
      optional(field('tag', $.tag)),
      field('value', $.procedure),
    ),

    procedure: $ => prec.right(1, seq(
      field('signature', $.procedure_signature),
      optional(field('body', choice($.block, $.uninitialized))),
    )),

    procedure_signature: $ => prec.right(seq(
      'proc',
      optional(field('calling_convention', $.calling_convention)),
      field('parameters', $.parameters),
      optional(seq(
        '->',
        optional(field('tag', $.tag)),
        field('result', $.type),
        optional(field('tag', $.tag)),
      )),
      optional(field('constraints', $.where_clause)),
      optional(field('tag', $.tag)),
    )),

    where_clause: $ => prec.right(seq('where', commaSep1(prec.right($.expression)))),

    calling_convention: _ => choice(
      '"odin"',
      '"contextless"',
      '"stdcall"',
      '"std"',
      '"cdecl"',
      '"c"',
      '"fastcall"',
      '"fast"',
      '"none"',
      '"system"',
    ),

    overloaded_procedure_declaration: $ => seq(
      optional($.attributes),
      field('name', $.identifier),
      '::',
      'proc',
      '{',
      optional(seq(
        commaSep1(field('value', $.expression)),
        optional(','),
      )),
      '}',
    ),

    struct_declaration: $ => prec.dynamic(1, seq(
      optional($.attributes),
      field('name', $.identifier),
      '::',
      'struct',
      optional(field('parameters', $.polymorphic_parameters)),
      repeat(field('tag', $.directive)),
      optional(field('constraints', $.where_clause)),
      '{',
      optional(seq(
        commaSep1(field('member', $.field)),
        optional(','),
      )),
      '}',
    )),

    enum_declaration: $ => seq(
      optional($.attributes),
      optional('using'),
      field('name', $.identifier),
      '::',
      'enum',
      optional(field('type', $.type)),
      '{',
      optional(seq(
        commaSep1(field('member', $.enum_member)),
        optional(','),
      )),
      '}',
    ),

    enum_member: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $.expression))),
    ),

    union_declaration: $ => prec.dynamic(1, seq(
      optional($.attributes),
      field('name', $.identifier),
      '::',
      'union',
      optional(field('parameters', $.polymorphic_parameters)),
      repeat(field('tag', $.directive)),
      '{',
      optional(seq(
        commaSep1(field('member', $.type)),
        optional(','),
      )),
      '}',
    )),

    bit_field_declaration: $ => seq(
      optional($.attributes),
      field('name', $.identifier),
      '::',
      'bit_field',
      field('type', $.type),
      '{',
      optional(seq(
        commaSep1(field('member', $.bit_field_member)),
        optional(','),
      )),
      '}',
    ),

    bit_field_member: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.type),
      '|',
      field('width', $.expression),
    ),

    variable_declaration: $ => seq(
      optional($.attributes),
      commaSep1(field('name', $.identifier)),
      ':=',
      optional(field('tag', alias($.procedure_tag, $.tag))),
      commaSep1(field('value', choice($.expression, $.procedure))),
      optional(','),
    ),

    procedure_tag: _ => choice('#force_inline', '#force_no_inline', '#must_tail'),

    const_declaration: $ => seq(
      optional($.attributes),
      commaSep1(field('name', $.identifier)),
      '::',
      optional(field('tag', $.tag)),
      commaSep1(
        choice(
          field('value', $.expression),
          seq(alias('#type', $.tag), field('value', $.type)),
          field('value', $.bit_set_type),
        ),
      ),
    ),

    const_type_declaration: $ => prec(1, seq(
      optional($.attributes),
      field('name', $.identifier),
      ':',
      field('type', $.type),
      ':',
      field('value', $.expression),
    )),

    foreign_block: $ => seq(
      optional($.attributes),
      'foreign',
      optional(field('name', $.identifier)),
      field('body', $.declaration_block),
    ),

    foreign_statement: $ => seq(
      optional($.attributes),
      'foreign',
      optional(field('name', $.identifier)),
      field('body', $.block),
    ),

    attributes: $ => repeat1($.attribute),

    attribute: $ => seq(
      '@',
      choice(
        $.identifier,
        seq(
          '(',
          commaSep1(seq($.identifier, optional(seq('=', $.expression)))),
          ')',
        ),
      ),
    ),

    parameters: $ => seq(
      '(',
      optional(seq(
        commaSep1(choice($.parameter, $.default_parameter)),
        optional(','),
      )),
      ')',
    ),
    parameter: $ => prec.right(choice(
      prec.dynamic(1, seq(
        commaSep1($._param_name),
        $._param_type,
      )),
      prec.dynamic(-1, seq(
        optional(field('tag', $.tag)),
        optional('using'),
        field('type', $.type),
      )),
    )),
    _param_name: $ => seq(
      optional(field('tag', $.tag)),
      optional('using'),
      optional('$'),
      field('name', $.identifier),
    ),
    _param_type: $ => seq(
      ':',
      optional(field('tag', $.tag)),
      field('type', $.type),
      optional($.identifier),
      optional(seq('=', field('value', $.expression))),
    ),


    default_parameter: $ => seq(
      optional(field('tag', $.tag)),
      optional('using'),
      field('name', $.identifier),
      ':=',
      field('value', $.expression),
    ),

    polymorphic_parameters: $ => seq(
      '(',
      commaSep1(seq(
        commaSep1(seq(optional('$'), field('name', $.identifier))),
        ':',
        field('type', $.type),
        optional(seq('=', field('default', $.expression))),
      )),
      ')',
    ),

    field: $ => prec.right(seq(
      commaSep1(seq(optional(field('tag', $.tag)), optional('using'), field('name', $.identifier))),
      ':',
      optional(field('tag', $.tag)),
      field('type', $.type),
      optional(field('tag', $.string)),
    )),

    statement: $ => prec(1, choice(
      $.procedure_declaration,
      $.overloaded_procedure_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.union_declaration,
      $.bit_field_declaration,
      $.const_declaration,
      $.import_declaration,
      $.assignment_statement,
      $.variable_declaration,
      $.update_statement,
      $.if_statement,
      $.when_statement,
      $.for_statement,
      $.switch_statement,
      $.defer_statement,
      $.break_statement,
      $.continue_statement,
      $.fallthrough_statement,
      $.label_statement,
      $.using_statement,
      $.return_statement,
      $.directive_statement,
      $._expression_no_tag,
      $.var_declaration,
      $.foreign_statement,
      $.tagged_block,
      $.block,
    )),

    assignment_statement: $ => prec(PREC.ASSIGNMENT, seq(
      optional(seq($.attributes, optional($.tag))),
      commaSep1(field('left', $.expression)),
      field('operator', '='),
      optional($.tag),
      commaSep1(field('right', choice($.expression, $.procedure))),
    )),

    update_statement: $ => seq(
      commaSep1(field('left', $.expression)),
      field('operator', choice('+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '||=', '&&=', '&~=')),
      commaSep1(field('right', $.expression)),
    ),

    if_statement: $ => prec.right(seq(
      'if',
      optional(seq(
        optional(field('initializer', choice($.assignment_statement, $.variable_declaration, $.update_statement, $.var_declaration))),
        ';',
      )),
      optional($.tag),
      field('condition', $.expression),
      choice(
        field('consequence', $.block),
        seq('do', field('consequence', $.statement)),
      ),
      repeat($.else_if_clause),
      optional($.else_clause),
    )),

    else_if_clause: $ => seq(
      'else',
      'if',
      optional(seq(
        optional(field('initializer', choice($.assignment_statement, $.variable_declaration, $.var_declaration))),
        ';',
      )),
      field('condition', $.expression),
      choice(
        field('consequence', $.block),
        seq('do', field('consequence', $.statement)),
      ),
    ),

    else_clause: $ => seq(
      'else',
      choice(
        field('consequence', $.block),
        seq('do', field('consequence', $.statement)),
      ),
    ),

    when_statement: $ => prec.right(seq(
      'when',
      $.expression,
      choice($.block, seq('do', $.statement)),
      repeat($.else_when_clause),
      optional($.else_clause),
    )),

    conditional_declaration: $ => prec.right(seq(
      'when',
      $.expression,
      $.declaration_block,
      repeat($.else_when_declaration_clause),
      optional($.else_declaration_clause),
    )),

    else_when_declaration_clause: $ => seq(
      'else',
      'when',
      $.expression,
      $.declaration_block,
    ),

    else_declaration_clause: $ => seq(
      'else',
      $.declaration_block,
    ),

    else_when_clause: $ => seq(
      'else',
      'when',
      $.expression,
      $.block,
    ),

    for_statement: $ => seq(
      'for',
      optional(seq(
        optional(seq(
          optional(field('initializer', choice($.assignment_statement, $.variable_declaration, $.update_statement, $.var_declaration))),
          ';',
        )),
        choice(
          $._for_in_expression,
          seq(
            optional(field('condition', $._for_condition)),
            optional(seq(
              ';',
              optional(field('post', choice(
                $.update_statement,
                alias($._simple_assignment_statement, $.assignment_statement),
              ))),
            )),
          ),
        ),
      )),
      field('consequence', choice($.block, seq('do', $.statement))),
    ),
    _for_in_expression: $ => prec(1, seq(
      optional(commaSep1(seq(optional('&'), field('binding', $.identifier)))),
      'in',
      field('iterable', $.expression),
    )),

    _for_condition: $ => prec.left(choice($._expression_no_in, $.tag)),

    _simple_assignment_statement: $ => seq(
      optional($.attributes),
      commaSep1(field('left', $.expression)),
      field('operator', '='),
      commaSep1(field('right', $.expression)),
    ),

    switch_statement: $ => seq(
      'switch',
      optional(seq(
        optional('in'),
        field('condition', choice(
          $.expression,
          seq(field('initializer', choice($.assignment_statement, $.variable_declaration, $.var_declaration)), $._separator, optional($.expression)),
        )),
      )),
      '{',
      repeat($.switch_case),
      '}',
    ),

    switch_case: $ => seq(
      'case',
      commaSep(field('condition', $.expression)),
      ':',
      sep(seq(optional($.tag), $.statement), $._separator),
    ),

    defer_statement: $ => seq('defer', $.statement),

    directive_statement: $ => seq(
      field('directive', choice(
        '#bounds_check',
        '#no_bounds_check',
        '#type_assert',
        '#no_type_assert',
        '#partial',
        '#reverse',
        '#unroll',
      )),
      field('statement', $.statement),
    ),

    break_statement: $ => seq('break', optional($.identifier)),

    continue_statement: $ => seq('continue', optional($.identifier)),

    fallthrough_statement: _ => 'fallthrough',

    var_declaration: $ => prec.right(seq(
      optional($.attributes),
      commaSep1(field('name', $.identifier)),
      ':',
      optional(field('tag', $.tag)),
      choice(
        seq(
          field('type', $.type),
          optional(seq(choice('=', ':'), commaSep1(field('value', $.expression)))),
        ),
        seq('=', commaSep1(field('value', $.expression))),
      ),
    )),

    return_statement: $ => prec.right(1, seq(
      'return',
      optional($.tag),
      optional(seq(
        commaExternalSep1(choice($.expression, $.procedure, $._procedure_type), $),
        optional(','),
      )),
    )),

    label_statement: $ => seq(
      $.identifier,
      ':',
      choice($.if_statement, $.for_statement, $.switch_statement, $.directive_statement, $.block),
    ),

    using_statement: $ => seq('using', $.expression),

    expression: $ => prec.left(choice(
      $._expression_no_tag,
      $.tag,
    )),

    _expression_no_tag: $ => choice($._expression_no_in, $.in_expression),

    _expression_no_in: $ => choice(
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.call_expression,
      $.selector_call_expression,
      $.member_expression,
      $.type_assertion_expression,
      $.index_expression,
      $.slice_expression,
      $.range_expression,
      $.cast_expression,
      $.parenthesized_expression,
      $.variadic_expression,
      $.or_return_expression,
      $.or_continue_expression,
      $.or_break_expression,
      $.identifier,
      $.address,
      $.pointer_type,
      $.array_type,
      $.map_type,
      $.union_type,
      $.struct_type,
      $.distinct_type,
      $.matrix_type,
      $.literal,
      '?',
    ),

    unary_expression: $ => prec.right(PREC.UNARY, seq(
      field('operator', choice('+', '-', '~', '!', '&')),
      field('argument', $.expression),
    )),

    binary_expression: $ => {
      const table = [
        ['||', PREC.LOGICAL_OR],
        ['or_else', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['>', PREC.COMPARE],
        ['>=', PREC.COMPARE],
        ['<=', PREC.COMPARE],
        ['<', PREC.COMPARE],
        ['==', PREC.EQUALITY],
        ['!=', PREC.EQUALITY],
        ['~=', PREC.EQUALITY],
        ['|', PREC.BITWISE_OR],
        ['~', PREC.BITWISE_XOR],
        ['&', PREC.BITWISE_AND],
        ['&~', PREC.BITWISE_AND_NOT],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['%%', PREC.MULTIPLY],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $.expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $.expression),
        ));
      }));
    },

    ternary_expression: $ => prec.right(seq(
      field('condition', choice($._expression_no_tag, $.struct)),
      choice(
        prec(PREC.TERNARY, seq(
          '?',
          field('consequence', $.expression),
          ':',
          field('alternative', $.expression),
        )),
        seq(
          choice('if', 'when'),
          field('consequence', $.expression),
          'else',
          field('alternative', $.expression),
        ),
      ),
    )),

    call_expression: $ => prec.left(PREC.CALL, seq(
      field('function', choice(seq($.tag, $.identifier), $._expression_no_tag, $.tag)),
      $._call_arguments,
    )),

    _call_arguments: $ => prec.left(PREC.CALL, seq(
      '(',
      optional(seq(
        commaSep1(field('argument', choice(
          $.named_argument,
          $.expression,
          $.procedure,
        ))),
        optional(','),
      )),
      ')',
    )),

    named_argument: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', choice($.expression, $.procedure, $._procedure_type)),
    ),

    selector_call_expression: $ => prec.left(PREC.CALL, seq(
      field('operand', $.expression),
      '->',
      field('function', $.identifier),
      $._call_arguments,
    )),

    member_expression: $ => prec.left(PREC.MEMBER, seq(
      optional(field('operand', $.expression)),
      '.',
      field('field', $.identifier),
    )),

    type_assertion_expression: $ => prec.left(PREC.MEMBER, seq(
      field('operand', $.expression),
      '.',
      choice('?', seq('(', field('type', $.type), ')')),
    )),

    index_expression: $ => prec.left(PREC.MEMBER, seq(
      field('operand', $.expression),
      '[',
      field('index', $.expression),
      optional(seq(',', field('index', $.expression))),
      ']',
    )),

    slice_expression: $ => prec.left(PREC.MEMBER, seq(
      field('operand', $.expression),
      '[',
      optional(field('start', $.expression)),
      ':',
      optional(field('end', $.expression)),
      ']',
    )),

    range_expression: $ => prec.left(PREC.MEMBER, seq(
      field('start', $.expression),
      field('operator', choice('..=', '..<')),
      field('end', $.expression),
    )),

    cast_expression: $ => prec.left(PREC.CAST, seq(
      choice(
        seq(
          '(',
          field('type', choice($.pointer_type, $.array_type, $._procedure_type)),
          ')',
          optional(field('operand', $.expression)),
        ),
        seq(
          field('operator', choice('cast', 'transmute')),
          '(',
          field('type', $.type),
          ')',
          field('operand', $.expression),
        ),
        seq(field('operator', 'auto_cast'), field('operand', $.expression)),
      ),
    )),

    in_expression: $ => prec.right(-1, seq($.expression, choice('in', 'not_in'), $.expression)),

    variadic_expression: $ => prec.left(PREC.VARIADIC, seq('..', $.expression)),

    parenthesized_expression: $ => seq('(', $.expression, ')'),

    or_return_expression: $ => seq($.expression, 'or_return'),

    or_continue_expression: $ => prec.right(seq(
      $.expression,
      'or_continue',
      field('label', optional($.identifier)),
    )),

    or_break_expression: $ => prec.right(seq($.expression, 'or_break', optional($.identifier))),

    address: $ => seq($.expression, '^'),

    type: $ => prec.right(typeChoice($)),

    pointer_type: $ => prec.left(seq('^', $.type)),

    variadic_type: $ => prec.left(seq('..', $.type)),

    array_type: $ => prec.dynamic(1, prec(1, seq(
      optional($.tag),
      '[',
      optional(seq(optional('$'), choice(
        seq('dynamic', optional(seq(';', field('capacity', $.expression)))),
        '^', '?', $.expression,
      ))),
      ']',
      field('element', choice(
        alias($._array_element_polymorphic_type, $.polymorphic_type),
        $.type,
      )),
    ))),

    map_type: $ => prec.right(seq('map', '[', $.type, ']', $.type)),

    union_type: $ => prec.right(seq(
      'union',
      optional($.polymorphic_parameters),
      repeat(field('tag', $.directive)),
      '{',
      commaSep1($.type),
      optional(','),
      '}',
    )),

    bit_set_type: $ => seq(
      'bit_set',
      '[',
      choice($.constant_type, $.enum_type, $.expression),
      optional(seq(';', $.type)),
      ']',
    ),

    matrix_type: $ => prec.left(seq(
      'matrix',
      '[',
      choice($.constant_type, $.expression),
      ',',
      choice($.constant_type, $.expression),
      ']',
      $.type,
    )),

    field_type: $ => seq($.identifier, repeat1(seq(token.immediate('.'), $.identifier))),

    tuple_type: $ => seq(
      '(',
      optional(seq(
        choice(
          $._unnamed_tuple_types,
          $._named_tuple_types,
        ),
      )),
      ')',
    ),

    _unnamed_tuple_types: $ => seq(
      alias($._tuple_element_type, $.type),
      optional(seq(',', optional($._unnamed_tuple_types))),
    ),

    _tuple_element_type: $ => typeChoice($),

    _named_tuple_types: $ => seq(
      choice($.named_type, $.default_type),
      optional(seq(',', optional($._named_tuple_types))),
    ),

    struct_type: $ => prec(1, seq(
      'struct',
      optional($.polymorphic_parameters),
      repeat($.directive),
      '{',
      optional($._struct_members),
      '}',
    )),

    _struct_members: $ => seq(
      commaSep1(field('member', $.struct_member)),
      optional(','),
    ),

    struct_member: $ => seq(
      commaSep1(seq(optional('using'), field('name', $.identifier))),
      ':',
      optional(field('tag', $.tag)),
      field('type', $.type),
      optional(field('tag', $.string)),

    ),

    enum_type: $ => seq(
      'enum',
      optional(field('underlying_type', $.type)),
      '{',
      commaSep1(field('member', $.enum_member)),
      optional(','),
      '}',
    ),

    bit_field_type: $ => seq(
      'bit_field',
      field('type', $.type),
      '{',
      commaSep1(field('member', $.bit_field_member)),
      optional(','),
      '}',
    ),

    named_type: $ => prec.dynamic(1, seq(
      $._named_type_names,
      ':',
      $.type,
      optional(prec(1, seq('=', $.expression))),
    )),

    _named_type_names: $ => commaSep1($.identifier),

    default_type: $ => seq($.identifier, ':=', $.expression),

    constant_type: $ => prec.right(seq('$', $.type)),

    specialized_type: $ => prec.right(seq($.type, '/', $.type)),

    _procedure_type: $ => alias($.procedure_signature, $.procedure_type),

    distinct_type: $ => prec.right(seq('distinct', optional($.tag), $.type)),

    empty_type: _ => '!',

    polymorphic_type: $ => seq(
      field('type', $.type),
      '(',
      commaSep1(field('argument', choice($.type, $.literal, $.member_expression))),
      ')',
    ),

    _compound_literal_polymorphic_type: $ => seq(
      field('type', choice($.identifier, $.field_identifier)),
      '(',
      commaSep1(field('argument', choice($.type, $.literal, $.member_expression))),
      ')',
    ),

    _array_element_polymorphic_type: $ => prec(2, seq(
      field('type', choice($.identifier, $.field_identifier)),
      '(',
      commaSep1(field('argument', choice($.type, $.literal, $.member_expression))),
      ')',
    )),

    conditional_type: $ => seq('(', $.type, 'when', $.expression, 'else', $.type, ')'),

    literal: $ => prec.right(choice(
      $.struct,
      $.map,
      $.bit_set,
      $.matrix,
      $.float,
      $.number,
      $.string,
      $.character,
      $.boolean,
      $.nil,
      $.uninitialized,
    )),

    struct: $ => seq(
      optional(field('type', choice(
        $.identifier,
        $.field_identifier,
        alias($._compound_literal_polymorphic_type, $.polymorphic_type),
        $.array_type,
        $.union_type,
        $.struct_type,
        $.enum_type,
        $.bit_field_type,
      ))),
      '{',
      optional(seq(
        commaSep1($.struct_field),
        optional(','),
      )),
      '}',
    ),

    map: $ => seq(
      'map',
      '[',
      $.type,
      ']',
      $.type,
      '{',
      optional(seq(
        commaSep1(seq($.expression, '=', $.expression)),
        optional(','),
      )),
      '}',
    ),

    bit_set: $ => seq(
      'bit_set',
      '[',
      $.expression,
      optional(seq(
        ';',
        field('underlying_type', $.type),
      )),
      ']',
      '{',
      commaSep($.expression),
      '}',
    ),

    matrix: $ => seq(
      'matrix',
      '[',
      $.expression,
      ',',
      $.expression,
      ']',
      $.type,
      '{',
      optional(seq(
        commaSep1($.expression),
        optional(','),
      )),
      '}',
    ),

    struct_field: $ => prec.right(seq(
      $.expression,
      optional(seq(
        '=',
        choice($.expression, $.procedure, $._procedure_type),
      )),
    )),

    number: _ => {
      const decimal = /[0-9][0-9_]*[ijk]?/;
      const basedDecimal = /0d[0-9_]+[ijk]?/;
      const dozenal = /0z[0-9a-bA-B_]+[ijk]?/;
      const hex = /0x[0-9a-fA-F_]+[ijk]?/;
      const octal = /0o[0-7_]+[ijk]?/;
      const binary = /0b[01_]+[ijk]?/;
      // no float

      return token(choice(
        decimal,
        basedDecimal,
        dozenal,
        hex,
        octal,
        binary,
      ));
    },

    string: $ => choice($._string_literal, $._raw_string_literal, $._multiline_string),

    _string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
      )),
      '"',
    ),

    _raw_string_literal: $ => seq(
      '`',
      repeat(alias($._raw_string_content, $.string_content)),
      '`',
    ),

    character: $ => seq(
      '\'',
      choice(
        /[^'\\]/,
        $.escape_sequence,
      ),
      '\'',
    ),

    string_content: _ => token.immediate(prec(1, /[^"\\]+/)),

    _raw_string_content: _ => token.immediate(prec(1, /[^`]+/)),

    _escape_sequence: $ => choice(
      prec(2, token.immediate(seq('\\', /[^abfnrtvxu'\"\\\?]/))),
      prec(1, $.escape_sequence),
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[^xu0-7]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u\{[0-9a-fA-F]+\}/,
        /U[0-9a-fA-F]{8}/,
      ),
    )),

    boolean: _ => choice('true', 'false'),

    nil: _ => 'nil',

    uninitialized: _ => '---',

    directive: $ => seq(
      $.tag,
      optional(choice($._call_arguments, $.identifier, $.number)),
    ),

    tag: $ => seq(
      '#',
      field('name', $.identifier),
    ),

    identifier: _ => /[_\p{XID_Start}][_\p{XID_Continue}]*/u,

    field_identifier: $ => seq($.identifier, repeat1(seq('.', $.identifier))),

    keyword_identifier: _ => prec(-3, choice(
      'nil',
      'false',
      'true',
    )),

    _separator: $ => choice(
      $._newline,
      ';',
    ),

    comment: _ => token(seq('//', /[^\r\n]*/)),
  },
});

module.exports.PREC = PREC;

/**
 * Creates the alternatives accepted as an Odin type
 *
 * @param {GrammarSymbols<any>} $
 *
 * @returns {ChoiceRule}
 */
function typeChoice($) {
  return choice(
    $.identifier,
    $.pointer_type,
    $.variadic_type,
    $.array_type,
    $.map_type,
    $.union_type,
    $.bit_set_type,
    $.matrix_type,
    $.field_type,
    $.tuple_type,
    $.struct_type,
    $.enum_type,
    $.bit_field_type,
    $.constant_type,
    $.specialized_type,
    $._procedure_type,
    $.distinct_type,
    $.empty_type,
    $.polymorphic_type,
    $.conditional_type,
    '...',
  );
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return sep1(rule, ',');
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @param {GrammarSymbols<any>} $
 *
 * @returns {SeqRule}
 */
function commaExternalSep1(rule, $) {
  return sep1(rule, choice(',', alias($._nl_comma, ',')));
}

/**
 * Creates a rule to match zero or more occurrences of `rule` separated by `sep`
 *
 * @param {RegExp | Rule | string} rule
 *
 * @param {RegExp | Rule | string} sep
 *
 * @returns {ChoiceRule}
 */
function sep(rule, sep) {
  return optional(seq(rule, repeat(seq(sep, optional(rule)))));
}

/**
 * Creates a rule to match one or more occurrences of `rule` separated by `sep`
 *
 * @param {RegExp | Rule | string} rule
 *
 * @param {RegExp | Rule | string} sep
 *
 * @returns {SeqRule}
 */
function sep1(rule, sep) {
  return seq(rule, repeat(seq(sep, rule)));
}
