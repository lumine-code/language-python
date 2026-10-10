const CONFIG_KEY = "language-python.highlightConstants";

describe("Python Tree-sitter constant highlighting setting", () => {
  let editor;
  let languageMode;
  let originalValue;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
    originalValue = lumine.config.get(CONFIG_KEY);
    lumine.config.set(CONFIG_KEY, true);
  });

  afterEach(() => {
    editor?.destroy();
    lumine.config.set(CONFIG_KEY, originalValue);
  });

  async function setUp(text) {
    editor = await lumine.workspace.open("constant-setting.py");
    editor.setText(text);
    languageMode = editor.getBuffer().languageMode;
    await languageMode.ready;
    await languageMode.atGrammarSettlement();
  }

  function scopesAt(row, text, occurrence = 0) {
    const line = editor.lineTextForBufferRow(row);
    let column = -1;
    for (let i = 0; i <= occurrence; i++) column = line.indexOf(text, column + 1);
    expect(column).withContext(`${row}/${text}/${occurrence}`).not.toBe(-1);
    return editor.scopeDescriptorForBufferPosition([row, column]).getScopesArray();
  }

  function expectNoHeuristicConstant(row, text, occurrence = 0) {
    const scopes = scopesAt(row, text, occurrence);
    const context = `${row}/${text}/${occurrence}`;
    expect(scopes).withContext(context).not.toContain("constant.other.python");
    expect(scopes).withContext(context).not.toContain("constant.other.property.python");
    return scopes;
  }

  it("enables heuristic constant scopes by default", async () => {
    expect(lumine.config.getSchema(CONFIG_KEY)).toEqual(
      jasmine.objectContaining({ type: "boolean", default: true }),
    );
    lumine.config.unset(CONFIG_KEY);
    expect(lumine.config.get(CONFIG_KEY)).toBe(true);
    await setUp(`CONST = VALUE
consume(CONST)
obj.CONST`);

    expect(scopesAt(0, "CONST")).toContain("constant.other.python");
    expect(scopesAt(0, "VALUE")).toContain("constant.other.python");
    expect(scopesAt(1, "CONST")).toContain("constant.other.python");
    expect(scopesAt(2, "CONST")).toContain("constant.other.property.python");
  });

  it("removes uppercase constant scopes while preserving identifier roles and ordinary assignment scopes", async () => {
    lumine.config.set(CONFIG_KEY, false);
    await setUp(`CONST = 1
value = 2
consume(CONST)
obj.CONST
obj.value
class C:
    def P(UPPER: TYPE = DEFAULT):
        return UPPER
class Derived(BASE): pass
A()
obj.A()
callback = lambda PARAM=DEFAULT: PARAM
consume(KEY=VALUE)`);

    for (const [row, text, scope] of [
      [0, "CONST", "variable.other.assignment.python"],
      [3, "CONST", "support.other.property.python"],
      [5, "C", "entity.name.type.class.python"],
      [6, "P(", "entity.name.function.python"],
      [6, "UPPER", "variable.parameter.function.python"],
      [6, "TYPE", "support.storage.type.python"],
      [8, "BASE", "entity.other.inherited-class.python"],
      [9, "A", "support.type.constructor.python"],
      [10, "A", "support.type.constructor.python"],
      [11, "PARAM", "variable.parameter.function.lambda.python"],
      [12, "KEY", "variable.parameter.function.python"],
    ]) {
      expect(expectNoHeuristicConstant(row, text)).withContext(`${row}/${text}`).toContain(scope);
    }
    for (const [row, text] of [
      [2, "CONST"],
      [6, "DEFAULT"],
      [7, "UPPER"],
      [11, "DEFAULT"],
      [12, "VALUE"],
    ]) {
      expectNoHeuristicConstant(row, text);
    }
    expect(scopesAt(0, "CONST")).toEqual(scopesAt(1, "value"));
    expect(scopesAt(3, "CONST")).toEqual(scopesAt(4, "value"));
  });

  it("keeps builtin constants, numbers, and strings highlighted when heuristic constant highlighting is disabled", async () => {
    lumine.config.set(CONFIG_KEY, false);
    await setUp(
      `values = [None, True, False, Ellipsis, NotImplemented, 123, 4.5, "double", 'single']`,
    );

    for (const [text, scope] of [
      ["None", "constant.builtin.none.python"],
      ["True", "constant.builtin.true.python"],
      ["False", "constant.builtin.false.python"],
      ["Ellipsis", "constant.language.ellipsis.python"],
      ["NotImplemented", "constant.language.not-implemented.python"],
      ["123", "constant.numeric.integer.python"],
      ["4.5", "constant.numeric.float.python"],
      ['"double"', "string.quoted.double.single-line.python"],
      ["'single'", "string.quoted.single.single-line.python"],
    ]) {
      expect(expectNoHeuristicConstant(0, text)).withContext(text).toContain(scope);
    }
  });

  it("updates the same positions in an open editor when the setting changes from true to false and back", async () => {
    const text = "CONST = VALUE\nobj.CONST";
    await setUp(text);

    for (const [row, scope, fallbackScope] of [
      [0, "constant.other.python", "variable.other.assignment.python"],
      [1, "constant.other.property.python", "support.other.property.python"],
    ]) {
      lumine.config.set(CONFIG_KEY, true);
      await languageMode.atGrammarSettlement();
      expect(scopesAt(row, "CONST")).withContext(`${row}/enabled`).toContain(scope);

      lumine.config.set(CONFIG_KEY, false);
      await languageMode.atGrammarSettlement();
      expect(expectNoHeuristicConstant(row, "CONST"))
        .withContext(`${row}/disabled`)
        .toContain(fallbackScope);

      lumine.config.set(CONFIG_KEY, true);
      await languageMode.atGrammarSettlement();
      expect(scopesAt(row, "CONST")).withContext(`${row}/reenabled`).toContain(scope);
    }
    expect(editor.getText()).toBe(text);
    expect(editor.getBuffer().languageMode).toBe(languageMode);
  });
});
