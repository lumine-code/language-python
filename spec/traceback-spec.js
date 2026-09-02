describe("Python traceback Tree-sitter grammar", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
    await lumine.packages.activatePackage("language-log");
  });

  it("selects and highlights traceback files", async () => {
    const editor = await lumine.workspace.open("failure.pytb");
    editor.setText(
      'Traceback (most recent call last):\n  File "app.py", line 7, in <module>\nValueError: bad value\n',
    );
    await editor.languageMode.ready;

    expect(editor.getGrammar().scopeName).toBe("text.python.traceback");
    expect(editor.scopeDescriptorForBufferPosition([0, 2]).getScopesArray()).toContain(
      "keyword.control.exception.python-traceback",
    );
    expect(editor.scopeDescriptorForBufferPosition([1, 3]).getScopesArray()).toContain(
      "keyword.other.file.python-traceback",
    );
  });
});
