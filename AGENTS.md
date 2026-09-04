# Agents.md

Assume the recipient is an expert programmer. Be concise and technical; omit basic background and obvious implementation details unless they materially affect the answer.

## Odin syntax reminders

- Runtime conditional expressions: `x if cond else y` or `cond ? x : y`.
- Compile-time conditional expression: `x when cond else y`.
- Optional-ok operators include `or_else`, `or_return`, `or_continue`, and `or_break`.

## Search

- Prefer `rg` and `fd` for textual and file search.
- Use narrow, exact searches where possible; prefer `rg -wF` for identifiers.
- Avoid dumping large match sets or context ranges. Locate first, then inspect the relevant source directly.

## Odin Programming Language reference

- Overview of the language: <https://odin-lang.org/docs/overview/>
- Base Library Collection: `$ODIN_HOME/base`
- Core Library Collection: `$ODIN_HOME/core`
- Vendor Library Collection: `$ODIN_HOME/vendor`

## Engineering Principles

- Prefer simple data, explicit control flow, and straightforward Odin over abstraction.
- Keep ownership, lifetimes, costs, and mutation visible.
- Prefer contiguous data and value semantics over pointer-rich object graphs.
- Introduce indirection, generics, caches, pools, or abstraction layers only when they solve a concrete problem.
- Preserve important architectural boundaries, but do not over-factor local code.
- Optimize for cognitive locality: keep related decisions and state close together.
- Prefer clear data representation over optimization machinery.
- Follow existing project patterns unless there is a concrete reason to change them.

## Allocation and Performance

- Prefer stack allocation or scratch arenas for temporary data. Match allocator lifetime to data lifetime and use the narrowest lifetime that covers the data.
- For owned allocations, ownership, lifetime, allocator, and release strategy must be clear.
- Data allocated from `context.temp_allocator` or another scratch allocator must not escape the scope or cycle in which that allocator is reset.
- Be deliberate about `context.allocator`. Pass an allocator explicitly or establish it at a clear subsystem boundary when allocation lifetime is not obvious.
- Remember that Odin has no automatic memory management: release owned allocations and the backing storage of dynamic containers with the allocator that created them.
- Do not retain pointers into storage that may move, including dynamic arrays that can reallocate. Retain an index/handle or establish pointer stability explicitly.
- Existing arenas and pools may be used when they materially simplify ownership, lifetime, pointer stability, or scale; do not introduce them automatically.
- Choose asymptotically reasonable designs and avoid obvious waste, but do not optimize without evidence.
- Simple scans, rebuilding derived state, temporary allocations, and coarse-grained operations are acceptable at suitable scales.
- Prefer improving data representation over adding optimization machinery.
- Do not introduce caches without a clear need and invalidation strategy.

## Control Flow and Cognitive Locality

- Optimize for the number of concepts the reader must hold at once, not for line count.
- Separate independent decisions, such as state availability, variant dispatch, payload selection, and the final operation, into explicit control flow.
- Prefer a few direct statements over compact expressions that require mentally expanding branches.
- Keep semantic control flow in the parent procedure where practical. Push mechanical traversal, indexing, storage access, encoding, and data movement into helpers.
- Do not split procedures so aggressively that the overall control flow becomes harder to follow.
- Prefer ordinary early exits. Sticky failure is acceptable for operations with a clear discard boundary when it materially simplifies the successful path and failed output cannot escape.
- Use `defer` when cleanup must occur across multiple exits. Prefer linear cleanup when there is only one exit path.

## Validation and Data Exposure

- Validate enough to prevent crashes, invalid domain state, and incorrect user-visible behavior. Do not add exhaustive defensive hardening without a concrete need.
- Use `assert` for programmer errors, violated invariants, and impossible internal states. Handle expected failures explicitly and keep assertions close to the code relying on them.
- Return expected errors explicitly, normally with multiple return values, and handle them near the operation that produced them.
- Avoid ceremonial getters and setters. Expose fields directly when doing so does not violate an invariant; use procedures when they enforce invariants or preserve a meaningful boundary.
- Names describe semantic meaning, not storage class or representation.

## Comments and Repository Hygiene

- Comments document intent, ownership, lifetime, invariants, constraints, and non-obvious design decisions. Do not restate the code.
- Deferred-work comments state the concrete condition that would make the work necessary.
- Do not manually edit generated files; change their source/generator and regenerate them.
- Do not investigate or discuss line endings unless they cause a concrete problem.
  Avoid line-ending-only changes.

### Project Style

- Use `Ada_Case` for types and enum values, `snake_case` for imports, procedures, and variables, and `SCREAMING_SNAKE_CASE` for constants.
- Prefer single-word import names.
- Use tabs for indentation and spaces only for alignment. Put opening braces at the end of the declaration or control-flow line.
- Write declarations as `name: Type = value` or `name := value`; do not insert spaces before the colon or around `:=` inconsistently.
- Design structs so their zero value is useful where practical. Use `---` only when uninitialized storage is intentional and immediately initialized before any read.
- Use `distinct` types for domain values that must not be mixed accidentally, such as unrelated IDs, units, or coordinate spaces.
- Use `int` for ordinary indices, counts, and arithmetic. Do not use unsigned integers merely to express non-negativity; use fixed-width or unsigned types when required by bit operations, storage layout, serialization, Vulkan, or another foreign ABI.
- Omit unnecessary semicolons.

### Language Quirks

- When assigning values to a struct, Odin expects either names or no names, but not a mix of both. For example, these are valid:

    ```odin
    return Message{id = getNextMessageID(), type = type, timestamp = time.now(), pid = pid}
    return Message{getNextMessageID(), type, time.now(), pid}
    ```

    while

    ```odin
    return Message{getNextMessageID(), type, timestamp = time.now(), pid}
    ```

    is not valid and will result in a compilation error.

## Testing

- Test files use the `*_test.odin` naming convention (e.g., `grid_test.odin`) and should begin with `#+test` when they belong to a package that is also built outside tests.
- Test a package with `odin test .` or `odin test path/to/package`. Use `odin test file_test.odin -file` only when the file is a self-contained package.
- Use `import "core:testing"`. Every test procedure has the `@(test)` attribute and exactly one parameter, conventionally `t: ^testing.T`.
- Prefer `testing.expect_value` when comparing values and `testing.expect` or `testing.expectf` for other conditions. Provide diagnostics that identify the expected and actual behavior when the helper does not already do so.
- Keep tests focused enough that a failure identifies one behavior. Account for the test runner executing tests concurrently by default; tests must not depend on shared mutable global state or execution order.
