#!/usr/bin/env python3
<<<<<<< HEAD
"""Multi-language tree-sitter parser driver.

Reads a source file (default: `test.txt`), detects whether it's C, C++,
JavaScript or Python, loads the appropriate tree-sitter Language (trying
several common bindings and fallbacks), parses the file, and prints an
indented node tree.

Behavior summary:
- Default input file: `test.txt` (resolved relative to the script if not found)
- Language detection: filename extension first, then simple content heuristics
- Language loading: tries `tree_sitter_languages.get_language`, then
  language-specific packages (e.g. `tree_sitter_python`, `tree_sitter_javascript`,
  `tree_sitter_cpp`, `tree_sitter_c`) and will wrap PyCapsule results into
  `tree_sitter.Language` where needed.
=======
"""
Read a Python source file (default: test.py), parse it with tree-sitter,
and print an indented tree (node types, ranges and short source snippets).

This script attempts multiple ways to obtain a Python Tree-sitter Language:
 - tree_sitter_languages.get_language('python')
 - the tree_sitter_python package attribute (common in some installs)
 - a prebuilt shared library named `my-languages.so`/`my-languages.dll` next to this file

If no language is available it prints guidance on how to install or build one.
>>>>>>> d182c99 (working tree generation)
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Optional


<<<<<<< HEAD
def detect_language_from_filename(path: str) -> Optional[str]:
	ext = os.path.splitext(path)[1].lower()
	if ext in (".py", ".pyw"):
		return "python"
	if ext in (".js", ".mjs", ".cjs"):
		return "javascript"
	if ext in (".c", ".h"):
		return "c"
	if ext in (".cpp", ".cc", ".cxx", ".hpp", ".hh"):
		return "cpp"
	return None


def detect_language_from_content(src_text: str) -> Optional[str]:
	# Simple heuristics — good enough for small files / demos
	s = src_text
	# Prefer C++-specific patterns before generic C includes
	if "using namespace std" in s or "std::" in s or "#include <iostream>" in s:
		return "cpp"
	# Generic C detection (keep after C++ checks)
	if "#include" in s or "int main(" in s or "printf(" in s:
		return "c"
	if "def " in s or "import " in s or "class " in s:
		return "python"
	if "console.log" in s or "function(" in s or "=>" in s or "export default" in s:
		return "javascript"
	return None


def try_get_language(lang_key: str, lib_path: Optional[str] = None, lib_name: Optional[str] = None) -> Optional[object]:
	"""Attempt to obtain a tree_sitter.Language for the requested language key.

	lang_key: one of 'python', 'javascript', 'c', 'cpp'
	"""
	# Strategy A: tree_sitter_languages helper
	try:
		from tree_sitter_languages import get_language  # type: ignore

		lang = get_language(lang_key)
		if lang is not None:
			return lang
	except Exception:
		pass

	# Strategy B: language-specific packages (common names)
	pkg_candidates = {
		"python": ["tree_sitter_python"],
		"javascript": ["tree_sitter_javascript", "tree_sitter_javascript_binding", "tree_sitter_javascript_native"],
		"c": ["tree_sitter_c"],
		"cpp": ["tree_sitter_cpp", "tree_sitter_cxx", "tree_sitter_c_plus_plus"],
	}

	try:
		from tree_sitter import Language as TS_Language  # type: ignore
	except Exception:
		TS_Language = None  # type: ignore

	for pkg in pkg_candidates.get(lang_key, []):
		try:
			mod = __import__(pkg)
		except Exception:
			continue

		# common exported names
		for attr in ("language", "PY_LANGUAGE", "LANGUAGE", "Language"):
			if hasattr(mod, attr):
				candidate = getattr(mod, attr)
				try:
					result = candidate() if callable(candidate) else candidate
				except Exception:
					result = candidate

				# If tree_sitter.Language is available, try wrapping
				if TS_Language is not None:
					try:
						if isinstance(result, TS_Language):
							return result
					except Exception:
						pass
					try:
						wrapped = TS_Language(result)
						return wrapped
					except Exception:
						pass

				# last resort: return the raw object
				return result

	# Strategy C: maybe user provided a shared library
	if lib_path and TS_Language is not None:
		try:
			if os.path.exists(lib_path):
				return TS_Language(lib_path, lib_name or lang_key)
		except Exception:
			pass

	return None


def print_tree(node, src_bytes: bytes, indent: int = 0, max_snippet: int = 90) -> None:
	prefix = "  " * indent
	start_point = node.start_point  # (row, column)
	end_point = node.end_point
	node_text = src_bytes[node.start_byte : node.end_byte].decode("utf8", errors="replace")
	snippet = node_text.replace("\n", "\\n")
	if len(snippet) > max_snippet:
		snippet = snippet[: max_snippet - 3] + "..."
	print(f"{prefix}{node.type}  [{start_point} - {end_point}]  {snippet!r}")
	for child in node.children:
		print_tree(child, src_bytes, indent + 1, max_snippet)


def main(argv: list[str] | None = None) -> int:
	p = argparse.ArgumentParser(description="Parse a source file (c, cpp, js, python) with tree-sitter and print the tree.")
	p.add_argument("file", nargs="?", default="test.txt", help="Source file to parse (default: test.txt)")
	p.add_argument("--lib", help="Path to a tree-sitter language shared library (optional)")
	p.add_argument("--lang-name", default=None, help="Language name inside the shared library (optional)")
	args = p.parse_args(argv)

	path = os.path.abspath(args.file)
	if not os.path.exists(path):
		alt = os.path.join(os.path.dirname(__file__), args.file)
		if os.path.exists(alt):
			path = os.path.abspath(alt)
		else:
			print(f"File not found: {path}")
			return 2

	with open(path, "rb") as f:
		src_bytes = f.read()
	try:
		src_text = src_bytes.decode("utf8")
	except Exception:
		src_text = ""

	# Detect language (prefer content heuristics; filename is fallback)
	lang = detect_language_from_content(src_text) or detect_language_from_filename(path)
	if lang is None:
		print("Could not reliably detect language from filename or contents. Please pass a file with extension or use --lib to supply a language.")
		return 3

	print(f"Detected language: {lang}")

	# Import parser
	try:
		from tree_sitter import Parser  # type: ignore
	except Exception:
		print("The `tree_sitter` Python package is not installed. Install with: pip install tree-sitter")
		return 4

	# Try to load the language object
	lang_obj = try_get_language(lang, lib_path=args.lib, lib_name=args.lang_name)
	if lang_obj is None:
		print(f"Could not load tree-sitter language for: {lang}. Try installing prebuilt bindings or pass --lib.")
		return 5

	# Normalize: if we have a raw capsule, attempt to wrap into Language
	try:
		from tree_sitter import Language as TS_Language  # type: ignore
		if not isinstance(lang_obj, TS_Language):
			try:
				lang_obj = TS_Language(lang_obj)
			except Exception:
				# leave as-is and hope Parser accepts it
				pass
	except Exception:
		pass

	# Create parser and set language
	try:
		# Some Parser implementations accept language= on construction
		try:
			parser = Parser(language=lang_obj)  # type: ignore
		except TypeError:
			parser = Parser()
			if hasattr(parser, "set_language"):
				parser.set_language(lang_obj)
			elif hasattr(parser, "language"):
				setattr(parser, "language", lang_obj)
			else:
				raise RuntimeError("Cannot configure Parser with the language object on this installation")
	except Exception as e:
		print("Failed to set language on parser:", e)
		return 6

	tree = parser.parse(src_bytes)
	print(f"Parsed file: {path}\nBytes: {len(src_bytes)}\n")
	print_tree(tree.root_node, src_bytes)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
=======
def find_python_language() -> Optional[object]:
    """Try multiple strategies to locate a Tree-sitter Python Language object.

    Returns a language object suitable for Parser.set_language, or None.
    """
    # Strategy 1: tree_sitter_languages helper (if installed)
    try:
        from tree_sitter_languages import get_language  # type: ignore

        lang = get_language("python")
        if lang is not None:
            return lang
    except Exception:
        pass

    # Strategy 2: a dedicated tree-sitter python package may expose the language
    try:
        import tree_sitter_python as tsp  # type: ignore

        for attr in ("PY_LANGUAGE", "PYTHON_LANGUAGE", "language", "Language"):
            if hasattr(tsp, attr):
                candidate = getattr(tsp, attr)
                # If it's callable (factory), call it; else use as-is
                try:
                    result = candidate() if callable(candidate) else candidate
                except Exception:
                    result = candidate

                # If tree_sitter.Language exists, try to wrap the result (it may be a PyCapsule)
                try:
                    from tree_sitter import Language as TS_Language  # type: ignore

                    # If it's already a Language instance, return it
                    if isinstance(result, TS_Language):
                        return result

                    # Otherwise, try to construct a Language from the capsule/object
                    try:
                        maybe_lang = TS_Language(result)
                        return maybe_lang
                    except Exception:
                        # Couldn't wrap; fall back to returning raw result
                        return result
                except Exception:
                    # tree_sitter not available; return raw
                    return result
    except Exception:
        pass

    # Strategy 3: look for a prebuilt shared library next to this file
    try:
        from tree_sitter import Language  # type: ignore

        base = os.path.dirname(__file__)
        # try common names for shared libs
        for name in ("my-languages.so", "my-languages.dylib", "my-languages.dll"):
            path = os.path.join(base, name)
            if os.path.exists(path):
                try:
                    return Language(path, "python")
                except Exception:
                    pass
    except Exception:
        # tree_sitter not installed
        pass

    return None


def print_tree(node, src_bytes: bytes, indent: int = 0, max_snippet: int = 60) -> None:
    prefix = "  " * indent
    start_point = node.start_point  # (row, column)
    end_point = node.end_point
    node_text = src_bytes[node.start_byte : node.end_byte].decode("utf8", errors="replace")
    snippet = node_text.replace("\n", "\\n")
    if len(snippet) > max_snippet:
        snippet = snippet[: max_snippet - 3] + "..."
    print(f"{prefix}{node.type}  [{start_point} - {end_point}]  {snippet!r}")
    # recurse
    for child in node.children:
        print_tree(child, src_bytes, indent + 1, max_snippet)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Parse a Python file with tree-sitter and print the tree.")
    p.add_argument("file", nargs="?", default="test.py", help="Python source file to parse (default: test.py)")
    p.add_argument("--lib", help="Path to a tree-sitter language shared library (optional)")
    p.add_argument("--lang-name", default="python", help="Language name inside the shared library (default: python)")
    args = p.parse_args(argv)

    # Resolve the input path. If a plain filename (like the default 'test.py') is
    # not found in the current working directory, also try next to this script.
    path = os.path.abspath(args.file)
    if not os.path.exists(path):
        # try relative to script directory
        alt = os.path.join(os.path.dirname(__file__), args.file)
        if os.path.exists(alt):
            path = os.path.abspath(alt)
        else:
            print(f"File not found: {path}")
            return 2

    with open(path, "rb") as f:
        src = f.read()

    # Try to import Parser and find a python language
    try:
        from tree_sitter import Parser  # type: ignore
    except Exception:
        print("The `tree_sitter` Python package is not installed.\n" "Install with: pip install tree-sitter")
        return 3

    lang = None
    # If user provided a library, try to load it first
    if args.lib:
        try:
            from tree_sitter import Language  # type: ignore

            libpath = os.path.abspath(args.lib)
            if os.path.exists(libpath):
                lang = Language(libpath, args.lang_name)
            else:
                print(f"Provided lib path does not exist: {libpath}")
                return 6
        except Exception as e:
            print("Failed to load language from shared library:", e)
            return 7

    if lang is None:
        lang = find_python_language()

    if lang is None:
        print("Could not locate a Tree-sitter Python language object.")
        print("Options:\n - install `tree_sitter_languages` (pip) which provides prebuilt languages\n"
              " - install a package named `tree-sitter-python` that exposes the language object\n"
              " - or build a language shared library and pass it with --lib\n\n"
              "Example to build a shared lib (requires the `tree-sitter` CLI and the python grammar source):\n"
              "  from tree_sitter import Language\n"
              "  Language.build_library('my-languages.so', ['path/to/tree-sitter-python'])\n")
        return 4

    # Ensure we have an actual tree_sitter.Language instance; if not, inform the user
    try:
        from tree_sitter import Language as TS_Language  # type: ignore

        if not isinstance(lang, TS_Language):
            print(f"Found language object, but it's type {type(lang)} not {TS_Language}.")
            print("If you installed a package that exposes a raw capsule or factory, try building a shared library and pass it via --lib.")
            return 8
    except Exception:
        # if we can't import TS_Language, proceed and let parser complain
        pass

    # Create parser and set language, handling different tree-sitter Python bindings
    try:
        # Some bindings accept the language on construction
        try:
            parser = Parser(language=lang)  # type: ignore
        except TypeError:
            parser = Parser()
            # newer bindings have set_language, older ones may use set_language too
            if hasattr(parser, "set_language"):
                parser.set_language(lang)
            else:
                # Fallback: try to set a `language` attribute or call a differently named method
                if hasattr(parser, "language"):
                    setattr(parser, "language", lang)
                else:
                    raise RuntimeError("Cannot configure Parser with the language object on this installation")
    except Exception as e:
        print("Failed to set language on parser:", e)
        return 5

    tree = parser.parse(src)
    print(f"Parsed file: {path}\nBytes: {len(src)}\n")
    root = tree.root_node
    print_tree(root, src)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
>>>>>>> d182c99 (working tree generation)
