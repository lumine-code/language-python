const { Point } = require("lumine");
const fs = require("fs");
const path = require("path");

const highlightsPath = path.join(__dirname, "..", "grammars", "python-highlights.scm");

const CTYPES_FIXTURE_ROWS = 12462;
const CTYPES_FIXTURE_COMMENT_ROWS = 9163;
const CTYPES_FIELDS_PER_CLASS = 96;

function buildCtypesFixture() {
  const lines = ["from ctypes import Structure, c_int"];
  let fieldIndex = 0;
  let classIndex = 0;

  while (fieldIndex < CTYPES_FIXTURE_COMMENT_ROWS) {
    const fieldCount = Math.min(CTYPES_FIELDS_PER_CLASS, CTYPES_FIXTURE_COMMENT_ROWS - fieldIndex);
    lines.push(`class C${classIndex}(Structure):`);
    lines.push("  _fields_ = [");
    for (let memberIndex = 0; memberIndex < fieldCount; memberIndex++, fieldIndex++) {
      lines.push(
        `    ("member_${classIndex}_${memberIndex}", c_int),  # generated ctypes field ${fieldIndex}`,
      );
    }
    lines.push("  ]");
    lines.push(`instance_${classIndex} = C${classIndex}()`);
    classIndex++;
  }

  while (lines.length < CTYPES_FIXTURE_ROWS) {
    lines.push(`PADDING_${String(lines.length).padStart(5, "0")} = 0`);
  }
  return lines.join("\r\n");
}

describe("Python Tree-sitter highlights", () => {
  let editor;
  let languageMode;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
  });

  afterEach(() => editor?.destroy());

  async function setUp(text) {
    editor = await lumine.workspace.open("highlights.py");
    editor.setText(text);
    languageMode = editor.getBuffer().languageMode;
    await languageMode.ready;
  }

  function columnFor(row, text, occurrence = 0) {
    const line = editor.lineTextForBufferRow(row);
    let column = -1;
    for (let i = 0; i <= occurrence; i++) column = line.indexOf(text, column + 1);
    expect(column).not.toBe(-1);
    return column;
  }

  function scopesAt(row, text, occurrence = 0) {
    return editor
      .scopeDescriptorForBufferPosition([row, columnFor(row, text, occurrence)])
      .getScopesArray();
  }

  function rawCaptures(startRow, endRow) {
    const layer = languageMode.rootLanguageLayer;
    const options =
      startRow == null
        ? undefined
        : {
            startPosition: new Point(startRow, 0),
            endPosition: new Point(endRow, 0),
          };
    return layer.queries.highlightsQuery.captures(layer.tree.rootNode, options);
  }

  it("keeps unbounded containers leaf-rooted", () => {
    const querySource = fs.readFileSync(highlightsPath, "utf8");
    expect(querySource).not.toMatch(
      /\((?:argument_list|dictionary|list|parameters|subscript|tuple|type_parameter)\s*\n\s*(?:"|\(pair)/,
    );
    expect(querySource).toContain("(#is? test.childOfType argument_list)");
    expect(querySource).toContain("(#is? test.childOfType dictionary)");
    expect(querySource).not.toContain("(string_content (escape_sequence)");
    expect(querySource).toContain("(#is? test.childOfType string_content)");
  });

  it("keeps string delimiters, prefixes, interpolations, and incomplete strings scoped", async () => {
    await setUp(`plain = "value"
raw = r'value'
formatted = f"""value {plain}"""
unfinished = """value`);

    expect(scopesAt(0, '"', 0)).toContain("punctuation.definition.string.begin.python");
    expect(scopesAt(0, '"', 1)).toContain("punctuation.definition.string.end.python");
    expect(scopesAt(1, "r'")).toContain("storage.type.string.python");
    expect(scopesAt(1, "'", 0)).toContain("punctuation.definition.string.begin.python");
    expect(scopesAt(1, "'", 1)).toContain("punctuation.definition.string.end.python");
    expect(scopesAt(2, '"""', 0)).toContain("punctuation.definition.string.begin.python");
    expect(scopesAt(2, "{")).toContain("punctuation.section.embedded.begin.python");
    expect(scopesAt(2, "}")).toContain("punctuation.section.embedded.end.python");
    expect(scopesAt(2, '"""', 1)).toContain("punctuation.definition.string.end.python");
    expect(scopesAt(3, '"""')).toContain("punctuation.definition.string.begin.python");
  });

  it("restricts special function scopes to callees and names", async () => {
    await setUp(`__len__(value)
obj.__len__(value)
wrapper(__len__)
len(value)
wrapper(len)
exec(value)
wrapper(exec)
def __len__(self):
  return 0
def ordinary(value):
  return ordinary(value)`);

    expect(scopesAt(0, "__len__")).toContain("support.function.magic.python");
    expect(scopesAt(1, "__len__")).toContain("support.function.magic.python");
    expect(scopesAt(2, "__len__")).not.toContain("support.function.magic.python");
    expect(scopesAt(3, "len")).toContain("support.function.builtin.python");
    expect(scopesAt(4, "len")).not.toContain("support.function.builtin.python");
    expect(scopesAt(7, "__len__")).toContain("entity.name.function.magic.python");
    expect(scopesAt(9, "ordinary")).toContain("entity.name.function.python");
    expect(scopesAt(10, "ordinary")).toContain("support.other.function.python");

    const legacyCaptures = rawCaptures().filter(
      (capture) => capture.name === "keyword.other._TEXT_.python" && capture.node.text === "exec",
    );
    expect(legacyCaptures.map((capture) => capture.node.startPosition.row)).toEqual([5]);
  });

  it("keeps raw capture counts bounded for a large CRLF ctypes fixture", async () => {
    const fixture = buildCtypesFixture();
    expect(fixture.split("\r\n").length).toBe(CTYPES_FIXTURE_ROWS);
    expect(fixture.match(/# generated ctypes field/g).length).toBe(CTYPES_FIXTURE_COMMENT_ROWS);
    await setUp(fixture);

    const fullCaptures = rawCaptures();
    const viewportCaptures = rawCaptures(3, 76);
    const tileCaptures = rawCaptures(3, 9);

    // The renderer never asks for the full file. Leaf-rooted candidates make
    // that diagnostic count larger, but keep tile cost independent of a
    // collection that began thousands of rows before the viewport.
    expect(fullCaptures.length).toBeGreaterThan(CTYPES_FIXTURE_ROWS);
    expect(fullCaptures.length).toBeLessThanOrEqual(220000);
    expect(viewportCaptures.length).toBeLessThanOrEqual(1650);
    expect(tileCaptures.length).toBeLessThanOrEqual(140);
  });

  it("keeps tile query work bounded inside a large dictionary parent", async () => {
    const lines = ["mapping = {"];
    for (let index = 0; index < 6000; index++) lines.push(`  "key_${index}": ${index},`);
    lines.push("}");
    await setUp(lines.join("\r\n"));

    expect(rawCaptures(3000, 3006).length).toBeLessThanOrEqual(64);
  });

  it("keeps escapes local inside a large triple-quoted string", async () => {
    const lines = ['value = """'];
    for (let index = 0; index < 6000; index++) lines.push(`  \\nvalue_${index}`);
    lines.push('"""');
    await setUp(lines.join("\r\n"));

    expect(scopesAt(3000, "\\n")).toContain("constant.character.escape.python");
    const captures = rawCaptures(3000, 3006).filter(
      ({ name }) => name === "constant.character.escape.python",
    );
    expect(captures.length).toBe(6);
    expect(
      captures.every(({ node }) => node.startPosition.row >= 3000 && node.startPosition.row < 3006),
    ).toBe(true);
  });
});
