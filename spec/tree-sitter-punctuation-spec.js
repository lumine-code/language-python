const { Point } = require("lumine");

describe("Python Tree-sitter punctuation", () => {
  let editor;
  let languageMode;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
    editor = await lumine.workspace.open("punctuation.py");
    editor.setText(`def function(a, b):
  function(a, b)
  tuple_value = (a, b)
  dictionary = {key: a, other: b}
  list_value = [a, b]
  item = obj[0]
  destructured_a, destructured_b = tuple_value
  lambda_value = lambda a, b: (a, b)

class Container[T]:
  pass

comprehension = {key: value for key in values}`);
    languageMode = editor.getBuffer().languageMode;
    await languageMode.ready;
  });

  afterEach(() => editor.destroy());

  function scopesAt(row, text, occurrence = 0) {
    const line = editor.lineTextForBufferRow(row);
    let column = -1;
    for (let i = 0; i <= occurrence; i++) column = line.indexOf(text, column + 1);
    expect(column).not.toBe(-1);
    return editor.scopeDescriptorForBufferPosition([row, column]).getScopesArray();
  }

  function capturesForRows(startRow, endRow) {
    return languageMode.rootLanguageLayer.queries.highlightsQuery.captures(
      languageMode.rootLanguageLayer.tree.rootNode,
      {
        startPosition: new Point(startRow, 0),
        endPosition: new Point(endRow, 0),
      },
    );
  }

  it("scopes the complete container punctuation matrix", () => {
    expect(scopesAt(0, "(")).toContain(
      "punctuation.definition.parameters.begin.bracket.round.python",
    );
    expect(scopesAt(0, ",")).toContain("punctuation.separator.parameters.comma.python");
    expect(scopesAt(0, ")")).toContain(
      "punctuation.definition.parameters.end.bracket.round.python",
    );
    expect(scopesAt(1, "(")).toContain(
      "punctuation.definition.arguments.begin.bracket.round.python",
    );
    expect(scopesAt(1, ",")).toContain("punctuation.separator.arguments.comma.python");
    expect(scopesAt(1, ")")).toContain("punctuation.definition.arguments.end.bracket.round.python");
    expect(scopesAt(2, "(")).toContain("punctuation.definition.tuple.begin.bracket.round.python");
    expect(scopesAt(2, ",")).toContain("punctuation.separator.tuple.comma.python");
    expect(scopesAt(2, ")")).toContain("punctuation.definition.tuple.end.bracket.round.python");
    expect(scopesAt(3, "{")).toContain(
      "punctuation.definition.dictionary.begin.bracket.curly.python",
    );
    expect(scopesAt(3, ":")).toContain("punctuation.separator.key-value.python");
    expect(scopesAt(3, ",")).toContain("punctuation.separator.dictionary.comma.python");
    expect(scopesAt(3, "}")).toContain(
      "punctuation.definition.dictionary.end.bracket.curly.python",
    );
    expect(scopesAt(4, "[")).toContain("punctuation.definition.list.begin.bracket.square.python");
    expect(scopesAt(4, "]")).toContain("punctuation.definition.list.end.bracket.square.python");
    expect(scopesAt(5, "[")).toContain(
      "punctuation.definition.subscript.begin.bracket.square.python",
    );
    expect(scopesAt(5, "]")).toContain(
      "punctuation.definition.subscript.end.bracket.square.python",
    );
    expect(scopesAt(6, ",")).toContain("punctuation.separator.destructuring.comma.python");
    expect(scopesAt(7, ",", 0)).toContain("punctuation.separator.parameters.comma.python");
    expect(scopesAt(7, ",", 1)).toContain("punctuation.separator.tuple.comma.python");
    expect(scopesAt(9, "[")).toContain("punctuation.definition.list.begin.bracket.square.python");
    expect(scopesAt(9, "]")).toContain("punctuation.definition.list.end.bracket.square.python");
    expect(scopesAt(12, "key")).not.toContain("entity.other.attribute-name.python");
    expect(scopesAt(12, ":")).not.toContain("punctuation.separator.key-value.python");
  });

  it("returns only local punctuation when a multiline parent starts before the query range", async () => {
    editor.setText(`def function(
  first,
  second,
):
  return function(
    first,
    second,
  )

mapping = {
  "first": 1,
  "second": 2,
}`);
    await languageMode.atTransactionEnd();

    const parameterCaptures = capturesForRows(2, 4);
    const parameterPunctuation = parameterCaptures.filter(
      (capture) => capture.name.startsWith("punctuation.") && capture.name.includes(".parameters."),
    );
    expect(
      parameterPunctuation.every(
        (capture) => capture.node.startPosition.row >= 2 && capture.node.startPosition.row < 4,
      ),
    ).toBe(true);
    expect(
      parameterPunctuation.some(
        (capture) =>
          capture.name === "punctuation.separator.parameters.comma.python" &&
          capture.node.startPosition.row === 2,
      ),
    ).toBe(true);
    expect(
      parameterPunctuation.some(
        (capture) =>
          capture.name === "punctuation.definition.parameters.end.bracket.round.python" &&
          capture.node.startPosition.row === 3,
      ),
    ).toBe(true);

    const argumentCaptures = capturesForRows(6, 8);
    const argumentPunctuation = argumentCaptures.filter(
      (capture) => capture.name.startsWith("punctuation.") && capture.name.includes(".arguments."),
    );
    expect(
      argumentPunctuation.every(
        (capture) => capture.node.startPosition.row >= 6 && capture.node.startPosition.row < 8,
      ),
    ).toBe(true);
    expect(
      argumentPunctuation.some(
        (capture) =>
          capture.name === "punctuation.separator.arguments.comma.python" &&
          capture.node.startPosition.row === 6,
      ),
    ).toBe(true);
    expect(
      argumentPunctuation.some(
        (capture) =>
          capture.name === "punctuation.definition.arguments.end.bracket.round.python" &&
          capture.node.startPosition.row === 7,
      ),
    ).toBe(true);

    const dictionaryCaptures = capturesForRows(11, 13);
    const dictionaryPunctuation = dictionaryCaptures.filter(
      (capture) => capture.name.includes(".dictionary.") || capture.name.includes(".key-value."),
    );
    expect(
      dictionaryPunctuation.every(
        (capture) => capture.node.startPosition.row >= 11 && capture.node.startPosition.row < 13,
      ),
    ).toBe(true);
    expect(
      dictionaryPunctuation.some(
        (capture) =>
          capture.name === "punctuation.separator.key-value.python" &&
          capture.node.startPosition.row === 11,
      ),
    ).toBe(true);
    expect(
      dictionaryPunctuation.some(
        (capture) =>
          capture.name === "punctuation.definition.dictionary.end.bracket.curly.python" &&
          capture.node.startPosition.row === 12,
      ),
    ).toBe(true);
  });
});
