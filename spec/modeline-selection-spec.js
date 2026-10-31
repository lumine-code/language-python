describe("python modeline selection", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
  });
  it("selects exact Vim aliases", () => {
    for (const field of ["ft", "filetype", "syntax"]) {
      const source = "# vim: set " + field + "=" + "python" + ":";
      expect(lumine.grammars.selectGrammar("extensionless", source).scopeName)
        .withContext(source)
        .toBe("source.python");
    }
  });
  it("rejects aliases that only start with the language name", () => {
    for (const field of ["ft", "filetype", "syntax"])
      for (const suffix of ["ish", "_extra", "-extra", ".extra"]) {
        const source = "# vim: set " + field + "=" + "python" + suffix + ":";
        expect(lumine.grammars.selectGrammar("extensionless", source).scopeName)
          .withContext(source)
          .not.toBe("source.python");
      }
  });
});
