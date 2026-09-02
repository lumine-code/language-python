# language-python

Python language support.

## Features

- **Grammars**: provides a Tree-sitter grammar built from [tree-sitter-python](https://github.com/tree-sitter/tree-sitter-python).
- **Syntax highlighting**: full grammar coverage for Python files; the central `language-log` package provides traceback highlighting.
- **Snippets**: shortcuts for common Python constructs.

## Installation

To install `language-python` search for it in the Install pane of the Lumine settings, or run the command `lumine --install lumine-code/language-python`.

## Services

- `hyperlink.injection`: consumed to highlight URLs inside Python files as clickable links.
- `todo.injection`: consumed to highlight `TODO`-style markers inside comments.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
