from tree_sitter import Language, Parser
import tree_sitter_python

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


PY_LANGUAGE = Language(tree_sitter_python.language())
parser = Parser(PY_LANGUAGE)

src = open("test.py", "rb").read()

tree = parser.parse(src)
root = tree.root_node
print_tree(root, src)