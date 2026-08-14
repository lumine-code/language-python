# language-python

Python language support.

## Features

- **Grammars**: provides Tree-sitter grammars built from [lumine-code/tree-sitter-python](https://github.com/lumine-code/tree-sitter-python) and [tree-sitter/tree-sitter-python](https://github.com/tree-sitter/tree-sitter-python), and TextMate grammars derived from [atom/language-python](https://github.com/atom/language-python).
- **Syntax highlighting**: full grammar coverage for Python files, consoles, tracebacks, and regular expressions.
- **IPython support**: dedicated Tree-sitter and TextMate grammars for `.ipy` files that parse IPython-only statements — magics (`%m`, `%%m`), shell escapes (`!cmd`), and help requests (`?obj`, `obj?`) — without syntax errors.
- **Snippets**: shortcuts for common Python constructs.

## Installation

To install `language-python` search for it in the Install pane of the Lumine settings, or run the command `lumine --install lumine-code/language-python`.

## Services

- `hyperlink.injection`: consumed to highlight URLs inside Python files as clickable links.
- `todo.injection`: consumed to highlight `TODO`-style markers inside comments.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
