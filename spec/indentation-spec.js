const dedent = require("dedent");

describe("Python indentation (Tree-sitter)", () => {
  let editor;
  let languageMode;
  let grammar;

  async function insertNewline() {
    editor.getLastSelection().insertText("\n", { autoIndent: true, autoIndentNewline: true });
    await languageMode.atTransactionEnd();
    if (editor.autoIndentAtTransactionEndPromise) await editor.autoIndentAtTransactionEndPromise;
  }

  async function expectToAutoIndentAfter(text, assert = true) {
    editor.setText(text);
    await languageMode.atTransactionEnd();
    editor.setCursorBufferPosition([Infinity, Infinity]);
    let currentRow = editor.getLastCursor().getBufferPosition().row;
    await insertNewline();
    if (assert) {
      expect(editor.lineTextForBufferRow(currentRow + 1)).toEqual("    ");
    } else {
      expect(editor.lineTextForBufferRow(currentRow + 1)).toEqual("");
    }
  }

  beforeEach(async () => {
    editor = await lumine.workspace.open();
    await lumine.packages.activatePackage("language-python");
    grammar = lumine.grammars.grammarForScopeName("source.python");
    editor.setGrammar(grammar);
    languageMode = editor.languageMode;
    await languageMode.ready;
  });

  it("preserves parsed block boundaries when reindenting an existing module", async () => {
    editor.update({ tabLength: 4, softTabs: true });
    const source =
      "def first():\n    values = [\n1,\n2\n]\n    return values\ndef second():\n    return 2\nresult = second()\n";
    editor.setText(source);
    await editor.whenGrammarSettled();
    editor.getBuffer().clearUndoStack();
    const expected =
      "def first():\n    values = [\n        1,\n        2\n    ]\n    return values\ndef second():\n    return 2\nresult = second()\n";
    editor.autoIndentBufferRows(0, editor.getLastBufferRow());
    await editor.whenGrammarSettled();
    expect(editor.getText()).toBe(expected);
    editor.autoIndentBufferRows(0, editor.getLastBufferRow());
    expect(editor.getText()).toBe(expected);
    editor.undo();
    expect(editor.getText()).toBe(source);
  });

  it("keeps clauses, nested definitions and match cases at their parsed levels", async () => {
    editor.update({ tabLength: 4, softTabs: true });
    const source =
      "def outer():\n    def inner():\n        return 1\n    if True:\n        pass\n    elif False:\n        pass\n    else:\n        pass\n    try:\n        pass\n    except ValueError:\n        pass\n    finally:\n        pass\n    match inner():\n        case 1:\n            pass\n        case _:\n            pass\n    return inner\nresult = outer()\n";
    editor.setText(source);
    await editor.whenGrammarSettled();
    editor.autoIndentBufferRows(0, editor.getLastBufferRow());
    await editor.whenGrammarSettled();
    expect(editor.getText()).toBe(source);
  });

  it("preserves literal string contents and comment alignment during reindent", async () => {
    editor.update({ tabLength: 4, softTabs: true });
    const source =
      'def first():\n    value = """first\n\tkeep this tab\n  keep these spaces\n"""\n    return value\n# next function\ndef second():\n    # an aligned comment\n    return 2\n';
    editor.setText(source);
    await editor.whenGrammarSettled();
    editor.selectAll();
    editor.autoIndentSelectedRows();
    await editor.whenGrammarSettled();
    expect(editor.getText()).toBe(source);
  });

  it("keeps module statements at column zero when an earlier comment is indented", async () => {
    const source =
      "    # intentionally aligned\ndef first():\n    return 1\ndef second():\n    return 2\n";
    editor.update({ tabLength: 4, softTabs: true });
    editor.setText(source);
    await editor.whenGrammarSettled();
    editor.autoIndentBufferRows(1, editor.getLastBufferRow() - 1);
    expect(editor.getText()).toBe(source);
  });

  it("indents blocks properly", async () => {
    await expectToAutoIndentAfter(`if 1 > 2:`);
    await expectToAutoIndentAfter(`if 1 > 2: # test`);
    await expectToAutoIndentAfter(`if 1 > 2: pass`, false);

    await expectToAutoIndentAfter(`def f(x):`);
    await expectToAutoIndentAfter(`def f(x): # test`);
    await expectToAutoIndentAfter(`def f(x): pass`, false);

    await expectToAutoIndentAfter(`class Fx(object):`);
    await expectToAutoIndentAfter(`class Fx(object): # test`);
    await expectToAutoIndentAfter(`class Fx(object): pass`, false);

    await expectToAutoIndentAfter(`while True:`);
    await expectToAutoIndentAfter(`while True: # test`);
    await expectToAutoIndentAfter(`while True: pass`, false);

    await expectToAutoIndentAfter(`for _ in iter(x):`);
    await expectToAutoIndentAfter(`for _ in iter(x): # test`);
    await expectToAutoIndentAfter(`for _ in iter(x): pass`, false);

    await expectToAutoIndentAfter(dedent`
      if 1 > 2:
        pass
      elif 2 > 3:
    `);

    await expectToAutoIndentAfter(dedent`
      if 1 > 2:
        pass
      elif 2 > 3: # test
    `);

    await expectToAutoIndentAfter(
      dedent`
      if 1 > 2:
        pass
      elif 2 > 3: pass
    `,
      false,
    );

    await expectToAutoIndentAfter(dedent`
      if 1 > 2:
        pass
      elif 2 > 3:
          pass
      else:
    `);

    await expectToAutoIndentAfter(dedent`
      if 1 > 2:
          pass
      elif 2 > 3:
          pass
      else: # test
    `);

    await expectToAutoIndentAfter(
      dedent`
      if 1 > 2:
          pass
      elif 2 > 3:
          pass
      else: pass
    `,
      false,
    );

    await expectToAutoIndentAfter(`try:`);

    // The assertions below don't work because `tree-sitter-python` doesn't
    // parse them correctly unless they occur within an already intact
    // `try/except` block. This needs to be fixed upstream.
    // await expectToAutoIndentAfter(`try: # test`)
    // await expectToAutoIndentAfter(`try: pass`, false)

    await expectToAutoIndentAfter(dedent`
      try:
          do_something()
      except:
    `);
    await expectToAutoIndentAfter(dedent`
      try:
          do_something()
      except: # test
    `);
    await expectToAutoIndentAfter(
      dedent`
      try:
          do_something()
      except: pass
    `,
      false,
    );
  });

  it("indents blocks properly (complex cases)", async () => {
    editor.setText(dedent`
      try: pass
      except: pass
    `);
    await languageMode.atTransactionEnd();
    editor.setCursorBufferPosition([0, Infinity]);
    await insertNewline();
    expect(editor.lineTextForBufferRow(1)).toBe("");

    editor.setText(dedent`
      try: #foo
      except: pass
    `);
    await languageMode.atTransactionEnd();
    editor.setCursorBufferPosition([0, Infinity]);
    await insertNewline();
    expect(editor.lineTextForBufferRow(1)).toBe("    ");
  });

  it(`does not indent for other usages of colons`, async () => {
    await expectToAutoIndentAfter(`x = lambda a : a + 10`, false);
    await expectToAutoIndentAfter(`x = list[:2]`, false);
    await expectToAutoIndentAfter(`x = { foo: 2 }`, false);
  });

  it("indents braces properly", async () => {
    let pairs = [
      ["[", "]"],
      ["{", "}"],
      ["(", ")"],
    ];
    for (let [a, b] of pairs) {
      editor.setText(`x = ${a}

      ${b}`);
      await languageMode.atTransactionEnd();
      editor.setCursorBufferPosition([0, Infinity]);
      await insertNewline();
      expect(editor.lineTextForBufferRow(1)).toBe("    ");
    }

    editor.setText(`x = <

    >`);
    await languageMode.atTransactionEnd();
    editor.setCursorBufferPosition([0, Infinity]);
    await insertNewline();
    expect(editor.lineTextForBufferRow(1)).toBe("");
  });

  it("dedents properly", async () => {
    editor.setText(dedent`
      if 1 > 2:
        pass
        eli
    `);
    editor.setCursorBufferPosition([Infinity, Infinity]);
    await languageMode.atTransactionEnd();
    editor.getLastSelection().insertText("f", {
      autoIndent: true,
      autoDecreaseIndent: true,
    });
    await languageMode.atTransactionEnd();
    expect(editor.lineTextForBufferRow(2)).toBe("elif");

    editor.setText(dedent`
      if 1 > 2:
        pass
        els
    `);
    editor.setCursorBufferPosition([Infinity, Infinity]);
    await languageMode.atTransactionEnd();
    editor.getLastSelection().insertText("e", {
      autoIndent: true,
      autoDecreaseIndent: true,
    });
    await languageMode.atTransactionEnd();
    expect(editor.lineTextForBufferRow(2)).toBe("else");

    editor.setText(dedent`
      match x:
          case "a":
              pass
          cas
    `);
    editor.setCursorBufferPosition([Infinity, Infinity]);
    await languageMode.atTransactionEnd();
    editor.getLastSelection().insertText("e", {
      autoIndent: true,
      autoDecreaseIndent: true,
    });
    await languageMode.atTransactionEnd();
    expect(editor.lineTextForBufferRow(3)).toBe("    case");
  });
});
