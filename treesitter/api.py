#!/usr/bin/env python3
from __future__ import annotations

import os
import importlib.util
from typing import Optional

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def load_main_module():
    # load the local main.py as a module so we can reuse its helpers
    here = os.path.dirname(__file__)
    path = os.path.join(here, "main.py")
    spec = importlib.util.spec_from_file_location("ts_main", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore
    return mod


def node_to_lines(node, src_bytes: bytes, indent: int = 0, max_snippet: int = 120):
    prefix = "  " * indent
    start_point = node.start_point
    end_point = node.end_point
    node_text = src_bytes[node.start_byte: node.end_byte].decode("utf8", errors="replace")
    snippet = node_text.replace("\n", "\\n")
    if len(snippet) > max_snippet:
        snippet = snippet[: max_snippet - 3] + "..."
    lines = [f"{prefix}{node.type}  [{start_point} - {end_point}]  {snippet!r}"]
    for child in node.children:
        lines.extend(node_to_lines(child, src_bytes, indent + 1, max_snippet))
    return lines


@app.route("/parse", methods=["POST"])
def parse_code():
    data = request.get_json(force=True)
    code = data.get("code", "")
    force_lang = data.get("language")

    mod = load_main_module()

    # detect language if not forced
    lang = force_lang or mod.detect_language_from_content(code) or None
    if lang is None:
        return jsonify({"error": "Could not detect language and no language forced"}), 400

    try:
        from tree_sitter import Parser, Language  # type: ignore
    except Exception as e:
        return jsonify({"error": f"tree_sitter not available: {e}"}), 500

    # obtain language object via the helper in main.py, falling back to None
    try:
        lang_obj = mod.try_get_language(lang)
    except Exception:
        lang_obj = None

    if lang_obj is None:
        return jsonify({"error": f"Could not load language for: {lang}. Try installing bindings or pass a shared lib."}), 500

    # ensure we have a proper Language instance
    try:
        if not isinstance(lang_obj, Language):
            try:
                lang_obj = Language(lang_obj)
            except Exception:
                pass
    except Exception:
        # Can't import Language or check — proceed and hope parser accepts it
        pass

    # create parser and set language
    try:
        try:
            parser = Parser(language=lang_obj)  # type: ignore
        except TypeError:
            parser = Parser()
            if hasattr(parser, "set_language"):
                parser.set_language(lang_obj)
            elif hasattr(parser, "language"):
                setattr(parser, "language", lang_obj)
            else:
                return jsonify({"error": "Parser cannot be configured with language object"}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to set language on parser: {e}"}), 500

    try:
        src_bytes = code.encode("utf8")
        tree = parser.parse(src_bytes)
        lines = node_to_lines(tree.root_node, src_bytes)
        return jsonify({"tree": "\n".join(lines)})
    except Exception as e:
        return jsonify({"error": f"Parse failed: {e}"}), 500


@app.route('/', methods=['GET'])
def index():
    # Serve the web UI if present in the same folder as this file
    here = os.path.dirname(__file__)
    ui_path = os.path.join(here, 'web.html')
    if os.path.exists(ui_path):
        return send_from_directory(here, 'web.html')
    return jsonify({"message": "web.html not found in treesitter folder"}), 404


@app.route('/web.html', methods=['GET'])
def web_html():
    return index()


if __name__ == "__main__":
    # run development server on port 5000
    app.run(host="127.0.0.1", port=5000, debug=True)
