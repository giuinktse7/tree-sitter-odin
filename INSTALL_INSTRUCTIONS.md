# Install `odin-ast`

`odin-ast` provides structural navigation and search for Odin source code using
`tree-sitter-odin` and `ast-grep`.

## Prerequisites

Install the following tools before continuing:

- `ast-grep` 0.44.1 or newer
- The Odin compiler
- A C compiler available as `cc`, or selected with `CC`

Verify that they are available:

```sh
ast-grep --version
odin version
${CC:-cc} --version
```

## Linux and WSL

From the `tree-sitter-odin` repository root, run:

```sh
./tools/odin-ast/install
```

The installer builds the committed native parser and the `odin-ast` executable,
stages and checks them together, then installs these files for the current
user:

```text
~/.config/ast-grep/odin/parsers/odin.so
~/.config/ast-grep/odin/outline/odin.yml
~/.config/ast-grep/odin/sgconfig.yml
~/.local/bin/odin-ast
```

No administrator privileges are required.

### Make `odin-ast` reachable from anywhere

Ensure `~/.local/bin` is on your `PATH`:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

To make that permanent for future login sessions, add it to `~/.profile`:

```sh
printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$HOME/.profile"
```

Open a new shell, or reload the profile:

```sh
. "$HOME/.profile"
hash -r
```

Verify that the command can be found and started:

```sh
command -v odin-ast
odin-ast --help
```

The default command location is:

```text
~/.local/bin/odin-ast
```

## Windows with Git Bash

Use native Windows installations of Odin, ast-grep, and a C compiler from Git
Bash. The compiler must be available as `cc`, or selected with the `CC`
environment variable. MinGW GCC and Clang are suitable choices; `cl` and
`clang-cl` are not supported.

Install using Clang:

```sh
CC=clang ./tools/odin-ast/install
```

The installer writes the configuration and command below your Git Bash home
directory, normally `C:\Users\<name>`:

```text
~/.config/ast-grep/odin/
~/.local/bin/odin-ast.exe
```

Add `~/.local/bin` to the Git Bash `PATH`:

```sh
printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$HOME/.bashrc"
. "$HOME/.bashrc"
hash -r
```

Verify the installation:

```sh
command -v odin-ast
odin-ast --help
```

The resolved command will normally be:

```text
/c/Users/<name>/.local/bin/odin-ast.exe
```

Run the full test suite:

```sh
CC=clang ./tools/odin-ast/test
```

## Test the integration

Run the full corpus, Node binding, lint, and navigation test suite from the
repository root:

```sh
./tools/odin-ast/test
```

The full development test suite requires Node.js, npm, and the Tree-sitter CLI.
The test script installs missing npm dependencies and verifies that the
committed generated parser files are current. These tools are not required to
install or run `odin-ast`.

## Custom locations

The following environment variables override the defaults:

- `ODIN_AST_GREP`: ast-grep executable
- `ODIN_AST_CONFIG_DIR`: installed configuration directory
- `ODIN_AST_BIN_DIR`: installed executable directory
- `ODIN_AST_CONFIG`: runtime configuration file
- `ODIN`: Odin compiler used during installation
- `CC`: C compiler used to build the parser

On Windows, `odin-ast` automatically resolves npm's `ast-grep` shell shim to
the native `ast-grep.exe` shipped with the package. If `ODIN_AST_GREP` is set
explicitly on Windows, point it to a native `.exe`, not a `.cmd` or shell
script.

The development test script additionally accepts `TREE_SITTER` to select a
specific Tree-sitter CLI.

For example:

```sh
ODIN_AST_BIN_DIR="$HOME/bin" ./tools/odin-ast/install
```

## Basic usage

Show the declaration structure of a directory:

```sh
odin-ast map path/to/source
```

Show a detailed outline, including signatures and members:

```sh
odin-ast outline path/to/file.odin
```

Find exact declarations or members by name:

```sh
odin-ast find Symbol_Name path/to/source
```

Print one exact declaration without reading the entire file:

```sh
odin-ast show path/to/file.odin Symbol_Name
```

Forward any other ast-grep command with the installed Odin configuration. The
first argument after `odin-ast` is the ast-grep command:

```sh
odin-ast AST_GREP_COMMAND [ARGS...]
odin-ast run --pattern '$NAME :: $VALUE' --lang odin path/to/source
```

Run `odin-ast --help` to display the command summary.
