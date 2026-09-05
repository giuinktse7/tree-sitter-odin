# tree-sitter-odin

[![CI][ci]](https://github.com/tree-sitter-grammars/tree-sitter-odin/actions/workflows/ci.yml)
[![discord][discord]](https://discord.gg/w7nTvsVJhm)
[![matrix][matrix]](https://matrix.to/#/#tree-sitter-chat:matrix.org)
[![crates][crates]](https://crates.io/crates/tree-sitter-odin)
[![npm][npm]](https://www.npmjs.com/package/tree-sitter-odin)
[![pypi][pypi]](https://pypi.org/project/tree-sitter-odin)

[Odin](https://odin-lang.org) grammar for [tree-sitter](https://tree-sitter.github.io)

## Odin code navigation

The repository includes an [ast-grep](https://ast-grep.github.io/) integration
for structural search and source-accurate symbol navigation. It requires
ast-grep 0.44.1 or newer, Odin, and a GCC-compatible C compiler.

```sh
./tools/odin-ast/install
./tools/odin-ast/test
```

The installer compiles the committed generated parser and native `odin-ast`
command, checks the staged installation, then installs it under the current
user's config and local-bin directories. Run it again after changing the
parser, wrapper, or outline rules. The separate test command uses the
development dependencies to regenerate the parser and run the full corpus,
Node binding, lint, and navigation test suite.

```sh
odin-ast outline path/to/file.odin
odin-ast map path/to/source
odin-ast find Symbol_Name path/to/source
odin-ast show path/to/file.odin Symbol_Name
odin-ast run --pattern '$NAME :: $VALUE' --lang odin path/to/source
```

`map`, `find`, and `show` include private declarations. `find` returns every
exact item or member match; `show` refuses missing or ambiguous names rather
than selecting one silently. Other subcommands are forwarded to ast-grep with
the installed Odin configuration. Set `ODIN_AST_GREP`, `ODIN_AST_CONFIG_DIR`,
or `ODIN_AST_BIN_DIR` to override installation/runtime locations; a specific
runtime config file can be selected with `ODIN_AST_CONFIG`.

[ci]: https://img.shields.io/github/actions/workflow/status/tree-sitter-grammars/tree-sitter-odin/ci.yml?logo=github&label=CI
[discord]: https://img.shields.io/discord/1063097320771698699?logo=discord&label=discord
[matrix]: https://img.shields.io/matrix/tree-sitter-chat%3Amatrix.org?logo=matrix&label=matrix
[npm]: https://img.shields.io/npm/v/tree-sitter-odin?logo=npm
[crates]: https://img.shields.io/crates/v/tree-sitter-odin?logo=rust
[pypi]: https://img.shields.io/pypi/v/tree-sitter-odin?logo=pypi&logoColor=ffd242
