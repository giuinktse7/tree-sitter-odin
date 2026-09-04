package navigation_fixture

import fmt "core:fmt"
import {runtime, "core:mem"}

Public_Procedure :: proc(
    left: int,
    right := 1,
) -> (sum: int, ok: bool) where left > 0 {
    Local_Only :: proc() {}
    Local_Value := 1
    return left + right, true
}

Bodyless_Procedure :: proc(value: int) -> bool ---

private_procedure :: proc() {}

@(private = "file")
Private_By_Attribute :: proc() {}

@(deprecated = "private")
Still_Public :: proc() {}

Dispatch :: proc {
    Public_Procedure,
    Bodyless_Procedure,
}

Record :: struct {
    Public_Field, Other_Public_Field: int,
    private_field: string,
}

private_record :: struct {
    Field: int,
}

Status :: enum u8 {
    Ready = 1,
    Alias = Ready,
    hidden = Alias,
}

Payload :: union {
    int,
    string,
}

Width :: 2

Flags :: bit_field u8 {
    Enabled: bool | 1,
    Mode: u8 | Width,
    hidden: u8 | Width,
}

COUNT, SECOND_COUNT :: 1, 2
typed_count : int : 3
Current, Previous := 4, 5
typed_value, typed_other: int = 6, 7
declared_value: int

Inline_Struct :: #type struct {
    Nested_Field: int,
}

Inline_Enum :: #type enum {
    Nested_Member,
}

Inline_Union :: #type union {
    int,
    string,
}

Inline_Bit_Field :: #type bit_field u8 {
    Nested_Bit: u8 | 1,
}

when ODIN_OS == .Windows {
    Conditional_Procedure :: proc() {}
    Duplicate :: proc() {}
} else {
    Duplicate :: proc() ---
}

foreign system {
    Foreign_Procedure :: proc(value: int) -> int ---
    foreign_private :: proc() ---
    when ODIN_ARCH == .amd64 {
        Nested_Foreign_Procedure :: proc() ---
    }
}
