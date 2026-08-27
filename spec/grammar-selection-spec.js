// The "Use Tree-Sitter Parsers" setting only breaks ties between grammars
// that match a file; a fileTypes entry present only in the TextMate grammar
// routes that extension to TextMate no matter what the setting says. These
// specs pin that every python file type is listed by the tree-sitter grammar
// too, so the setting stays in control.
describe("Python grammar selection", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
  });

  it("selects the tree-sitter grammar for python file types when enabled", () => {
    lumine.config.set("editor.useTreeSitterParsers", true);
    for (const name of ["main.py", "types.pyi", "gui.pyw"]) {
      const grammar = lumine.grammars.selectGrammar(name, "");
      expect(grammar.scopeName).toBe("source.python");
      expect(grammar.constructor.name).toBe("TreeSitterGrammar");
    }
  });

  it("selects the IPython tree-sitter grammar for .ipy files when enabled", () => {
    lumine.config.set("editor.useTreeSitterParsers", true);
    const grammar = lumine.grammars.selectGrammar("main.ipy", "");
    expect(grammar.name).toBe("IPython");
    expect(grammar.scopeName).toBe("source.python.ipy");
    expect(grammar.constructor.name).toBe("TreeSitterGrammar");
  });

  it("falls back to the TextMate grammars when tree-sitter is disabled", () => {
    lumine.config.set("editor.useTreeSitterParsers", false);
    const python = lumine.grammars.selectGrammar("main.py", "");
    expect(python.scopeName).toBe("source.python");
    expect(python.constructor.name).not.toBe("TreeSitterGrammar");

    const ipython = lumine.grammars.selectGrammar("main.ipy", "");
    expect(ipython.name).toBe("IPython");
    expect(ipython.scopeName).toBe("source.python.ipy");
    expect(ipython.constructor.name).not.toBe("TreeSitterGrammar");
  });
});
