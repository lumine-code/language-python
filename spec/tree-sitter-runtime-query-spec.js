const { createRequire } = require("module");
const path = require("path");
const { TextBuffer } = require("lumine");

describe("Python query compatibility across Tree-sitter runtimes", () => {
  let buffers, registries, grammars, factory, Registry, Mode, config, grammarPath, nativePath;

  beforeEach(async () => {
    jasmine.useRealClock();
    await lumine.packages.activatePackage("language-python");
    const active = lumine.grammars.grammarForScopeName("source.python");
    factory = active.constructor;
    const coreModule = Object.values(require.cache).find((entry) => entry.exports === factory);
    const requireCore = createRequire(coreModule.filename);
    Registry = requireCore("./grammar-registry");
    Mode = requireCore("./tree-sitter-language-mode");
    nativePath = requireCore.resolve("tree-sitter-python");
    grammarPath = path.join(__dirname, "..", "grammars", "python.json");
    config = requireCore("@lumine-code/season").readFileSync(grammarPath);
    buffers = [];
    registries = [];
    grammars = [];
  });

  afterEach(() => {
    for (const buffer of buffers) buffer.destroy();
    for (const grammar of grammars) grammar.deactivate();
    for (const registry of registries) registry.clear();
  });

  async function parse(runtime, text) {
    const registry = new Registry({ config: lumine.config });
    registries.push(registry);
    const grammar = new factory(registry, grammarPath, {
      ...config,
      scopeName: "source.python.query-control",
      treeSitter:
        runtime === "node"
          ? { ...config.treeSitter, runtime: "node", languageModule: nativePath }
          : config.treeSitter,
    });
    grammars.push(grammar);
    registry.addGrammar(grammar);
    const buffer = new TextBuffer({ text });
    buffers.push(buffer);
    const mode = new Mode({ buffer, grammar, grammars: registry, config: lumine.config });
    buffer.setLanguageMode(mode);
    await mode.ready;
    await mode.atGrammarSettlement();
    return { buffer, mode, grammar };
  }

  it("compiles complete highlights across runtimes and the shipped WASM tags", async () => {
    for (const runtime of ["wasm", "node"]) {
      const { mode, grammar } = await parse(runtime, "# comment\nVALUE = 1\n");
      expect(grammar.highlightsQuery).not.toContain("; (placeholder)");
      // Core's native development fixture is v0.25.0, whose statement AST
      // predates the shipped upstream commit. Its highlights remain compatible;
      // exact native tags parity is checked with the original-source control.
      for (const kind of runtime === "wasm"
        ? ["highlightsQuery", "tagsQuery"]
        : ["highlightsQuery"]) {
        const query = await grammar.getQuery(kind);
        const captures = query.captures(mode.tree.rootNode, {
          startPosition: mode.tree.rootNode.startPosition,
          endPosition: mode.tree.rootNode.endPosition,
        });
        expect(captures.length).withContext(`${runtime}/${kind}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps self, cls and constant captures final with matching actual core scopes", async () => {
    const text =
      "class Worker:\n    def work(self, cls):\n        VALUE = 1\n        return self, cls, VALUE\n";
    const results = [];
    for (const runtime of ["wasm", "node"]) {
      const { buffer, mode, grammar } = await parse(runtime, text);
      const query = await grammar.getQuery("highlightsQuery");
      const captures = query.captures(mode.tree.rootNode, {
        startPosition: mode.tree.rootNode.startPosition,
        endPosition: mode.tree.rootNode.endPosition,
      });
      const scopes = (index) =>
        mode.scopeDescriptorForPosition(buffer.positionForCharacterIndex(index)).getScopesArray();
      for (const [word, scope] of [
        ["self", "variable.language.self.python"],
        ["cls", "variable.language.cls.python"],
        ["VALUE", "constant.other.python"],
      ]) {
        let index = -1;
        while ((index = text.indexOf(word, index + 1)) !== -1) {
          const actual = scopes(index);
          expect(actual).withContext(`${runtime}/${word}`).toContain(scope);
          const capture = captures.find(
            (item) => item.name === scope && item.node.startIndex === index,
          );
          expect(capture?.setProperties?.["capture.final"]).toBe("true");
        }
      }
      results.push(Array.from({ length: text.length }, (_, index) => scopes(index)));
    }
    expect(results[1]).toEqual(results[0]);
  });
});
