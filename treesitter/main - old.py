#!/usr/bin/env python3
"""
Read a Python source file (default: test.py), parse it with tree-sitter,
and print an indented tree (node types, ranges and short source snippets).

This script attempts multiple ways to obtain a Python Tree-sitter Language:
 - tree_sitter_languages.get_language('python')
 - the tree_sitter_python package attribute (common in some installs)
 - a prebuilt shared library named `my-languages.so`/`my-languages.dll` next to this file

If no language is available it prints guidance on how to install or build one.
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Optional


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
