// Every supported Python file type resolves to the Tree-sitter grammar.
describe("Python grammar selection", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
  });

  it("selects the tree-sitter grammar for python file types when enabled", () => {
    for (const name of ["main.py", "types.pyi", "gui.pyw", "service.tac", "wscript"]) {
      const grammar = lumine.grammars.selectGrammar(name, "");
      expect(grammar.scopeName).toBe("source.python");
      expect(grammar.constructor.name).toBe("TreeSitterGrammar");
    }
  });
});
