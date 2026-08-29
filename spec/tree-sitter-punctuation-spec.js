describe("Python Tree-sitter punctuation", () => {
  let editor;

  beforeEach(async () => {
    lumine.config.set("editor.useTreeSitterParsers", true);
    await lumine.packages.activatePackage("language-python");
    editor = await lumine.workspace.open("punctuation.py");
    editor.setText(`def function(a, b):
  function(a, b)
  tuple_value = (a, b)
  dictionary = {key: a, other: b}
  list_value = [a, b]
  comprehension = {key: value for key in values}`);
    await editor.getBuffer().languageMode.ready;
  });

  afterEach(() => editor.destroy());

  function scopesAt(row, text) {
    const column = editor.lineTextForBufferRow(row).indexOf(text);
    return editor.scopeDescriptorForBufferPosition([row, column]).getScopesArray();
  }

  it("keeps container punctuation scoped with leaf-rooted captures", () => {
    expect(scopesAt(0, ",")).toContain("punctuation.separator.parameters.comma.python");
    expect(scopesAt(1, ",")).toContain("punctuation.separator.arguments.comma.python");
    expect(scopesAt(2, ",")).toContain("punctuation.separator.tuple.comma.python");
    expect(scopesAt(3, ":")).toContain("punctuation.separator.key-value.python");
    expect(scopesAt(3, ",")).toContain("punctuation.separator.dictionary.comma.python");
    expect(scopesAt(4, "[")).toContain("punctuation.definition.list.begin.bracket.square.python");
    expect(scopesAt(5, "key")).not.toContain("entity.other.attribute-name.python");
    expect(scopesAt(5, ":")).not.toContain("punctuation.separator.key-value.python");
  });
});
