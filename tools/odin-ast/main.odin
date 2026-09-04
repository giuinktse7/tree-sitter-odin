package main

import "core:encoding/json"
import "core:fmt"
import "core:mem"
import "core:os"
import "core:slice"
import "core:strings"

Position :: struct {
	line:   int,
	column: int,
}

Byte_Range :: struct {
	start: int,
	end:   int,
}

Source_Range :: struct {
	start:       Position,
	end:         Position,
	byte_offset: Byte_Range `json:"byteOffset"`,
}

Outline_Entry :: struct {
	name:        string,
	symbol_type: string        `json:"symbolType"`,
	ast_kind:    string        `json:"astKind"`,
	signature:   string,
	range:       Source_Range,
	members:     []Outline_Entry,
}

Outline_File :: struct {
	path:  string,
	items: []Outline_Entry,
}

Match :: struct {
	file:   string,
	entry:  ^Outline_Entry,
	parent: ^Outline_Entry,
	symbol: string,
}

main :: proc() {
	status := run()
	if status != 0 {
		os.exit(status)
	}
}

run :: proc() -> int {
	arena: mem.Dynamic_Arena
	mem.dynamic_arena_init(&arena)
	defer mem.dynamic_arena_destroy(&arena)
	context.allocator = mem.dynamic_arena_allocator(&arena)

	config, ok := resolve_config_path()
	if !ok {
		return 1
	}
	if len(os.args) == 1 {
		print_usage()
		return 0
	}

	command := os.args[1]
	args := os.args[2:]

	switch command {
	case "help", "--help", "-h":
		print_usage()
		return 0
	}

	ast_grep, ast_grep_ok := resolve_ast_grep()
	if !ast_grep_ok {
		return 1
	}

	switch command {
	case "outline":
		if !require_config(config) {
			return 1
		}
		child := make_command(ast_grep, {
			"outline", "--config", config, "--color", "never",
			"--items", "all", "--view", "expanded",
		}, args)
		return run_inherited(child)
	case "map":
		if !require_config(config) {
			return 1
		}
		child := make_command(ast_grep, {
			"outline", "--config", config, "--color", "never",
			"--items", "structure", "--view", "names",
		}, args)
		return run_inherited(child)
	case "find":
		return find_symbol(ast_grep, config, args)
	case "show":
		return show_symbol(ast_grep, config, args)
	case:
		if strings.has_prefix(command, "-") || command == "completions" {
			child := make_command(ast_grep, {command}, args)
			return run_inherited(child)
		}
		if !require_config(config) {
			return 1
		}
		child := make_command(ast_grep, {command, "--config", config}, args)
		return run_inherited(child)
	}
}

resolve_ast_grep :: proc() -> (string, bool) {
	if requested := os.get_env("ODIN_AST_GREP", context.allocator); requested != "" {
		when ODIN_OS == .Windows {
			if !strings.equal_fold(os.ext(requested), ".exe") {
				fmt.eprintf("odin-ast: ODIN_AST_GREP must name a native .exe: %s\n", requested)
				return "", false
			}
			if !os.is_file(requested) {
				fmt.eprintf("odin-ast: ODIN_AST_GREP is not a file: %s\n", requested)
				return "", false
			}
		}
		return requested, true
	}

	when ODIN_OS != .Windows {
		return "ast-grep", true
	} else {
		if executable := find_windows_ast_grep(); executable != "" {
			return executable, true
		}
		fmt.eprintln(
			"odin-ast: cannot find a native ast-grep executable\n" +
			"Install ast-grep or set ODIN_AST_GREP to ast-grep.exe.",
		)
		return "", false
	}
}

find_windows_ast_grep :: proc() -> string {
	path := os.get_env("PATH", context.allocator)
	directories, err := os.split_path_list(path, context.allocator)
	if err != nil {
		return ""
	}

	for path_entry in directories {
		directory := path_entry
		if directory == "" {
			directory = "."
		}

		direct_executable := join_path_silent({directory, "ast-grep.exe"})
		if direct_executable != "" && os.is_file(direct_executable) {
			return direct_executable
		}

		npm_executable := join_path_silent({
			directory,
			"node_modules",
			"@ast-grep",
			"cli",
			"ast-grep.exe",
		})
		if npm_executable != "" && os.is_file(npm_executable) {
			return npm_executable
		}
	}
	return ""
}

print_usage :: proc() {
	fmt.print(
		"Usage:\n" +
		"  odin-ast outline [PATHS...]\n" +
		"  odin-ast map [PATHS...]\n" +
		"  odin-ast find SYMBOL [PATHS...]\n" +
		"  odin-ast show FILE SYMBOL\n" +
		"  odin-ast AST_GREP_COMMAND [ARGS...]\n",
	)
}

resolve_config_path :: proc() -> (string, bool) {
	if config := os.get_env("ODIN_AST_CONFIG", context.allocator); config != "" {
		return config, true
	}

	config_root := os.get_env("ODIN_AST_CONFIG_DIR", context.allocator)
	if config_root == "" {
		config_home := os.get_env("XDG_CONFIG_HOME", context.allocator)
		if config_home == "" {
			home := os.get_env("HOME", context.allocator)
			when ODIN_OS == .Windows {
				if user_profile := os.get_env("USERPROFILE", context.allocator); user_profile != "" {
					home = user_profile
				}
			}
			if home == "" {
				fmt.eprintln("odin-ast: cannot resolve the user configuration directory")
				return "", false
			}
			config_home = join_path({home, ".config"})
			if config_home == "" {
				return "", false
			}
		}
		config_root = join_path({config_home, "ast-grep", "odin"})
		if config_root == "" {
			return "", false
		}
	}

	config := join_path({config_root, "sgconfig.yml"})
	return config, config != ""
}

join_path :: proc(parts: []string) -> string {
	result, err := os.join_path(parts, context.allocator)
	if err != nil {
		fmt.eprintln("odin-ast: cannot construct configuration path")
		return ""
	}
	return result
}

join_path_silent :: proc(parts: []string) -> string {
	result, err := os.join_path(parts, context.allocator)
	if err != nil {
		return ""
	}
	return result
}

require_config :: proc(config: string) -> bool {
	if os.is_file(config) {
		return true
	}
	fmt.eprintf(
		"Odin ast-grep configuration not found: %s\nRun tools/odin-ast/install first.\n",
		config,
	)
	return false
}

make_command :: proc(executable: string, fixed, trailing: []string) -> []string {
	command := make([dynamic]string, 0, 1 + len(fixed) + len(trailing))
	append(&command, executable)
	append(&command, ..fixed)
	append(&command, ..trailing)
	return command[:]
}

run_inherited :: proc(command: []string) -> int {
	desc := os.Process_Desc {
		command = command,
		stdin   = os.stdin,
		stdout  = os.stdout,
		stderr  = os.stderr,
	}
	process, start_err := os.process_start(desc)
	if start_err != nil {
		fmt.eprintf("odin-ast: cannot run %s: %v\n", command[0], start_err)
		return 1
	}
	state, wait_err := os.process_wait(process)
	if wait_err != nil {
		fmt.eprintf("odin-ast: cannot wait for %s: %v\n", command[0], wait_err)
		return 1
	}
	if !state.exited {
		return 1
	}
	return state.exit_code
}

run_captured :: proc(command: []string) -> (stdout: []byte, status: int) {
	desc := os.Process_Desc {command = command}
	state, child_stdout, child_stderr, process_err := os.process_exec(
		desc,
		context.allocator,
	)
	if len(child_stderr) > 0 {
		_, _ = os.write(os.stderr, child_stderr)
	}
	if process_err != nil {
		fmt.eprintf("odin-ast: cannot run %s: %v\n", command[0], process_err)
		return nil, 1
	}
	if !state.exited {
		return nil, 1
	}
	return child_stdout, state.exit_code
}

load_outline :: proc(ast_grep, config: string, paths: []string) -> ([]Outline_File, int) {
	if !require_config(config) {
		return nil, 1
	}

	child := make_command(ast_grep, {
		"outline", "--config", config, "--color", "never",
		"--items", "structure", "--view", "expanded", "--json=compact",
	}, paths)
	if len(paths) == 0 {
		child = make_command(ast_grep, {
			"outline", "--config", config, "--color", "never",
			"--items", "structure", "--view", "expanded", "--json=compact", ".",
		}, nil)
	}

	output, status := run_captured(child)
	if status != 0 {
		return nil, status
	}

	files: []Outline_File
	if unmarshal_err := json.unmarshal(output, &files); unmarshal_err != nil {
		fmt.eprintf("odin-ast: cannot parse ast-grep outline JSON: %v\n", unmarshal_err)
		return nil, 1
	}
	return files, 0
}

find_symbol :: proc(ast_grep, config: string, args: []string) -> int {
	if len(args) == 0 {
		fmt.eprintln("usage: odin-ast find SYMBOL [PATHS...]")
		return 1
	}

	symbol := args[0]
	files, status := load_outline(ast_grep, config, args[1:])
	if status != 0 {
		return status
	}
	matches := collect_matches(files, symbol)
	if len(matches) == 0 {
		fmt.eprintf("symbol not found: %s\n", symbol)
		return 1
	}

	for match in matches {
		write_match(os.stdout, match)
	}
	return 0
}

show_symbol :: proc(ast_grep, config: string, args: []string) -> int {
	if len(args) != 2 {
		fmt.eprintln("usage: odin-ast show FILE SYMBOL")
		return 1
	}

	file, symbol := args[0], args[1]
	files, status := load_outline(ast_grep, config, {file})
	if status != 0 {
		return status
	}
	matches := collect_matches(files, symbol)
	if len(matches) == 0 {
		fmt.eprintf("symbol not found: %s\n", symbol)
		return 1
	}
	if len(matches) > 1 {
		fmt.eprintf("symbol is ambiguous: %s (%d matches)\n", symbol, len(matches))
		for match in matches {
			fmt.eprint("  ")
			write_match(os.stderr, match)
		}
		return 2
	}

	match := matches[0]
	source, read_err := os.read_entire_file(match.file, context.allocator)
	if read_err != nil {
		fmt.eprintf("odin-ast: cannot read %s: %v\n", match.file, read_err)
		return 1
	}
	start := match.entry.range.byte_offset.start
	end := match.entry.range.byte_offset.end
	if start < 0 || end < start || end > len(source) {
		fmt.eprintf("odin-ast: invalid source range for %s\n", symbol)
		return 1
	}

	definition := source[start:end]
	if _, write_err := os.write(os.stdout, definition); write_err != nil {
		fmt.eprintf("odin-ast: cannot write declaration: %v\n", write_err)
		return 1
	}
	if len(definition) > 0 && definition[len(definition)-1] != '\n' {
		fmt.print("\n")
	}
	return 0
}

collect_matches :: proc(files: []Outline_File, symbol: string) -> []Match {
	matches := make([dynamic]Match)
	for file_index in 0 ..< len(files) {
		file := &files[file_index]
		for item_index in 0 ..< len(file.items) {
			item := &file.items[item_index]
			if entry_declares(item, symbol) {
				append(&matches, Match {file = file.path, entry = item, symbol = symbol})
			}
			for member_index in 0 ..< len(item.members) {
				member := &item.members[member_index]
				if entry_declares(member, symbol) {
					append(&matches, Match {
						file   = file.path,
						entry  = member,
						parent = item,
						symbol = symbol,
					})
				}
			}
		}
	}

	slice.sort_by(matches[:], proc(left, right: Match) -> bool {
		if left.file != right.file {
			return left.file < right.file
		}
		return left.entry.range.byte_offset.start < right.entry.range.byte_offset.start
	})
	return matches[:]
}

entry_declares :: proc(entry: ^Outline_Entry, symbol: string) -> bool {
	if entry.name == symbol {
		return true
	}

	separator := ""
	switch entry.ast_kind {
	case "const_declaration":
		separator = "::"
	case "variable_declaration":
		separator = ":="
	case "var_declaration", "field", "struct_member":
		separator = ":"
	case:
		return false
	}

	separator_index := strings.index(entry.signature, separator)
	if separator_index < 0 {
		return false
	}
	remaining := entry.signature[:separator_index]
	for {
		comma_index := strings.index_byte(remaining, ',')
		candidate := remaining
		if comma_index >= 0 {
			candidate = remaining[:comma_index]
		}
		candidate = strings.trim_space(candidate)
		if strings.has_prefix(candidate, "using ") {
			candidate = strings.trim_space(candidate[len("using "):])
		}
		if candidate == symbol {
			return true
		}
		if comma_index < 0 {
			break
		}
		remaining = remaining[comma_index+1:]
	}
	return false
}

write_match :: proc(file: ^os.File, match: Match) {
	start := match.entry.range.start
	if match.parent == nil {
		fmt.fprintf(
			file,
			"%s:%d:%d\t%s\t%s\n",
			match.file,
			start.line + 1,
			start.column + 1,
			match.entry.symbol_type,
			match.symbol,
		)
		return
	}
	fmt.fprintf(
		file,
		"%s:%d:%d\t%s\t%s.%s\n",
		match.file,
		start.line + 1,
		start.column + 1,
		match.entry.symbol_type,
		match.parent.name,
		match.symbol,
	)
}
