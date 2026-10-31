describe("Conservative python indentation", () => {
  let editor;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.python"));
    editor.update({ tabLength: 4, softTabs: true });
    await editor.whenGrammarSettled();
  });

  afterEach(() => editor?.destroy());

  for (const [name, source, row, columns] of [
    ["an unfinished quoted brace", 'value = "{', 0, 0],
    ["a quote followed by text", 'value = "hello {', 0, 0],
    ["a closed string before a real opener", 'value = "ok"; values = [', 0, 4],
    ["a clear unfinished container", "values = [", 0, 4],
    ["an unknown colon", "value:", 0, 0],
    ["a dictionary separator", 'value = {"key":', 0, 4],
    ["an unfinished annotation", "value: Type", 0, 0],
    ["a one-line with suite", "with lock: work()", 0, 0],
    ["a one-line finally suite", "try:\n    work()\nfinally: cleanup()", 2, 0],
    ["a with suite header", "with lock:", 0, 4],
    ["a comment after a suite colon", "with lock: # comment", 0, 4],
    ["an ordinary except-prefixed identifier", "try:\n    exceptional = 1", 1, 4],
    ["a suite beside a format specifier", 'if f"{value:03}":', 0, 4],
  ]) {
    it(`keeps the intended level after ${name}`, async () => {
      editor.setText(source);
      await editor.whenGrammarSettled();
      editor.setCursorBufferPosition([row, Infinity]);
      editor.insertText("\n", { autoIndent: true, autoIndentNewline: true });
      await editor.whenGrammarSettled();
      expect(editor.lineTextForBufferRow(row + 1)).toBe(" ".repeat(columns));
      expect(editor.getCursorBufferPosition().column).toBe(columns);
    });
  }

  it("dedents a closing delimiter only when it is typed at the start of a row", async () => {
    editor.setText("values = [" + "\n    ");
    await editor.whenGrammarSettled();
    editor.setCursorBufferPosition([1, Infinity]);
    editor.insertText("]", { autoIndent: true, autoDecreaseIndent: true });
    await editor.whenGrammarSettled();
    expect(editor.lineTextForBufferRow(1)).toBe("]");
  });
});
