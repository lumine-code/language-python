describe("Python Tree-sitter identifier roles", () => {
  let editor;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
  });

  afterEach(() => editor?.destroy());

  async function setUp(text) {
    editor = await lumine.workspace.open("identifier-roles.py");
    editor.setText(text);
    await editor.getBuffer().languageMode.ready;
  }

  function scopesAt(row, identifier, occurrence = 0) {
    const matches = [...editor.lineTextForBufferRow(row).matchAll(/\b[A-Za-z_]\w*\b/g)].filter(
      ([word]) => word === identifier,
    );
    const column = matches[occurrence]?.index ?? -1;
    expect(column).withContext(`${row}/${identifier}/${occurrence}`).not.toBe(-1);
    return editor.scopeDescriptorForBufferPosition([row, column]).getScopesArray();
  }

  function expectRole(row, identifier, scope, occurrence = 0) {
    const scopes = scopesAt(row, identifier, occurrence);
    const context = `${row}/${identifier}/${occurrence}`;
    expect(scopes).withContext(context).toContain(scope);
    expect(scopes).withContext(context).not.toContain("constant.other.python");
    return scopes;
  }

  function expectConstant(row, identifier, occurrence = 0) {
    const scopes = scopesAt(row, identifier, occurrence);
    const context = `${row}/${identifier}/${occurrence}`;
    expect(scopes).withContext(context).toContain("constant.other.python");
    expect(scopes).withContext(context).not.toContain("variable.parameter.function.python");
    expect(scopes).withContext(context).not.toContain("variable.parameter.function.lambda.python");
    expect(scopes).withContext(context).not.toContain("support.storage.type.python");
  }

  it("keeps the uppercase property definition from the reported example scoped as a function", async () => {
    await setUp(`@property
def P(s):
    '''Return referenced Plate instance.'''
    return s._P()`);

    expectRole(0, "property", "support.other.function.decorator.python");
    expectRole(1, "P", "entity.name.function.python");
    expectRole(1, "s", "variable.parameter.function.python");
    expectRole(3, "_P", "support.other.function.python");
    expect(scopesAt(3, "_P")).not.toContain("support.type.constructor.python");
  });

  it("keeps uppercase function and class declarations scoped inside nested and async definitions", async () => {
    await setUp(`def F():
    pass
def ALL_CAPS():
    pass
async def A():
    pass
class C:
    def M(self):
        pass
    async def ASYNC_METHOD(self):
        pass
    class INNER:
        def NESTED():
            pass
class ALL_CAPS_CLASS:
    pass
class CamelCase:
    pass`);

    for (const [row, identifier] of [
      [0, "F"],
      [2, "ALL_CAPS"],
      [4, "A"],
      [7, "M"],
      [9, "ASYNC_METHOD"],
      [12, "NESTED"],
    ]) {
      expectRole(row, identifier, "entity.name.function.python");
    }
    for (const [row, identifier] of [
      [6, "C"],
      [11, "INNER"],
      [14, "ALL_CAPS_CLASS"],
      [16, "CamelCase"],
    ]) {
      expectRole(row, identifier, "entity.name.type.class.python");
    }
  });

  it("keeps uppercase superclass names scoped as inherited classes", async () => {
    await setUp(`class Derived(BASE, B):
    pass
class C(BASE):
    pass
consume(BASE, B)`);

    expectRole(0, "BASE", "entity.other.inherited-class.python");
    expectRole(0, "B", "entity.other.inherited-class.python");
    expectRole(2, "BASE", "entity.other.inherited-class.python");
    expectConstant(4, "BASE");
    expectConstant(4, "B");
  });

  it("keeps uppercase parameters and keyword names distinct from their default and argument values", async () => {
    await setUp(`def F(PLAIN, TYPED: TYPE, DEFAULTED=DEFAULT, TYPED_DEFAULT: TYPE = DEFAULT_TYPED, *ARGS, KEYWORD_ONLY=DEFAULT_KEYWORD, **KWARGS):
    return PLAIN
consume(KEY=VALUE)
def G(*, K=DEFAULT_K):
    pass
def H(*TYPED_ARGS: TYPE, **TYPED_KWARGS: TYPE):
    pass`);

    for (const identifier of [
      "PLAIN",
      "TYPED",
      "DEFAULTED",
      "TYPED_DEFAULT",
      "ARGS",
      "KEYWORD_ONLY",
      "KWARGS",
    ]) {
      expectRole(0, identifier, "variable.parameter.function.python");
    }
    expectRole(2, "KEY", "variable.parameter.function.python");
    expectRole(3, "K", "variable.parameter.function.python");
    expectRole(5, "TYPED_ARGS", "variable.parameter.function.python");
    expectRole(5, "TYPED_KWARGS", "variable.parameter.function.python");
    for (const identifier of ["DEFAULT", "DEFAULT_TYPED", "DEFAULT_KEYWORD"]) {
      expectConstant(0, identifier);
    }
    expectConstant(2, "VALUE");
    expectConstant(3, "DEFAULT_K");
    expectRole(0, "TYPE", "support.storage.type.python", 0);
    expectRole(0, "TYPE", "support.storage.type.python", 1);
    expectRole(5, "TYPE", "support.storage.type.python", 0);
    expectRole(5, "TYPE", "support.storage.type.python", 1);
  });

  it("keeps uppercase lambda parameters scoped without claiming their default expressions", async () => {
    await setUp(`callback = lambda PLAIN, DEFAULTED=DEFAULT, *ARGS, KEYWORD_ONLY=DEFAULT_KEYWORD, **KWARGS: PLAIN
compound = lambda DEFAULTED=FIRST + SECOND: DEFAULTED`);

    for (const identifier of ["PLAIN", "DEFAULTED", "ARGS", "KEYWORD_ONLY", "KWARGS"]) {
      expectRole(0, identifier, "variable.parameter.function.lambda.python");
    }
    expectRole(1, "DEFAULTED", "variable.parameter.function.lambda.python");
    expectConstant(0, "DEFAULT");
    expectConstant(0, "DEFAULT_KEYWORD");
    expectConstant(1, "FIRST");
    expectConstant(1, "SECOND");
  });

  it("keeps uppercase exception aliases and identifier dictionary keys in their structural roles", async () => {
    await setUp(`try:
    consume(VALUE)
except RuntimeError as ERROR:
    pass
mapping = {KEY: VALUE, OTHER_KEY: OTHER_VALUE}`);

    expectRole(2, "ERROR", "variable.other.exception.python");
    expectRole(4, "KEY", "entity.other.attribute-name.python");
    expectRole(4, "OTHER_KEY", "entity.other.attribute-name.python");
    expectConstant(1, "VALUE");
    expectConstant(4, "VALUE");
    expectConstant(4, "OTHER_VALUE");
  });

  it("keeps uppercase identifiers in simple and compound annotations scoped as types", async () => {
    await setUp(`field: TYPE
compound: LIST[TYPE | OTHER]
namespaced: pkg.TYPE
nested: dict[KEY_TYPE, tuple[VALUE_TYPE, OTHER_TYPE]] = DEFAULT
def convert(P: TYPE, Q: LIST[OTHER | THIRD] = DEFAULT_ARG) -> RESULT | None:
    local: TYPE | OTHER = DEFAULT_LOCAL
    return VALUE`);

    for (const [row, identifiers] of [
      [0, ["TYPE"]],
      [1, ["LIST", "TYPE", "OTHER"]],
      [2, ["TYPE"]],
      [3, ["KEY_TYPE", "VALUE_TYPE", "OTHER_TYPE"]],
      [4, ["TYPE", "LIST", "OTHER", "THIRD", "RESULT"]],
      [5, ["TYPE", "OTHER"]],
    ]) {
      for (const identifier of identifiers) {
        expectRole(row, identifier, "support.storage.type.python");
      }
    }
    expectRole(4, "P", "variable.parameter.function.python");
    expectRole(4, "Q", "variable.parameter.function.python");
    expectConstant(3, "DEFAULT");
    expectConstant(4, "DEFAULT_ARG");
    expectConstant(5, "DEFAULT_LOCAL");
    expectConstant(6, "VALUE");
  });

  it("keeps uppercase decorator names and namespaces scoped without changing constant arguments", async () => {
    await setUp(`@P
def plain(): pass
@DECORATOR(VALUE)
def called(): pass
@pkg.P
def namespaced(): pass
@P.decorate
def uppercase_namespace(): pass
@pkg.P(VALUE, KEY=OTHER)
def namespaced_called(): pass
@P.ns.Decorator
def chain(): pass
@pkg.P(C(VALUE))
def nested_call(): pass`);

    for (const [row, identifier] of [
      [0, "P"],
      [2, "DECORATOR"],
      [6, "P"],
      [10, "P"],
    ]) {
      const scopes = expectRole(row, identifier, "support.other.function.decorator.python");
      expect(scopes).not.toContain("support.type.constructor.python");
    }
    const bareTargetScopes = expectRole(4, "P", "support.other.property.python");
    expect(bareTargetScopes).toContain("constant.other.property.python");
    expect(bareTargetScopes).not.toContain("support.type.constructor.python");
    expectRole(6, "decorate", "support.other.property.python");
    expectRole(10, "ns", "support.other.property.python");
    expectRole(10, "Decorator", "support.other.property.python");
    for (const row of [8, 12]) {
      const scopes = expectRole(row, "P", "support.other.function.python");
      expect(scopes).not.toContain("support.type.constructor.python");
      expect(scopes).not.toContain("constant.other.property.python");
    }
    expectRole(8, "KEY", "variable.parameter.function.python");
    expectRole(12, "C", "support.type.constructor.python");
    expectConstant(2, "VALUE");
    expectConstant(8, "VALUE");
    expectConstant(8, "OTHER");
    expectConstant(12, "VALUE");
  });

  it("preserves constants inside subscript and parenthesized decorator expressions", async () => {
    await setUp(`@decorators[INDEX]
def indexed(): pass
@(P if FLAG else Q)
def conditional(): pass
@(P | Q)
def combined(): pass`);

    expectConstant(0, "INDEX");
    for (const identifier of ["P", "FLAG", "Q"]) expectConstant(2, identifier);
    expectConstant(4, "P");
    expectConstant(4, "Q");
  });

  it("preserves standalone constants, uppercase properties, and conventional constructor calls", async () => {
    await setUp(`CONST = VALUE
consume(CONST, VALUE)
obj.A
obj.A()
A()
qualified.A()`);

    expectConstant(0, "CONST");
    expectConstant(0, "VALUE");
    expectConstant(1, "CONST");
    expectConstant(1, "VALUE");
    const propertyScopes = expectRole(2, "A", "support.other.property.python");
    expect(propertyScopes).toContain("constant.other.property.python");
    expect(propertyScopes).not.toContain("support.type.constructor.python");
    for (const row of [3, 4, 5]) {
      const scopes = expectRole(row, "A", "support.type.constructor.python");
      expect(scopes).not.toContain("constant.other.property.python");
    }
  });
});
