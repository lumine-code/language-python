describe("python interpreter selection", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-python");
  });
  it("selects real direct and env interpreters", () => {
    for (const runner of ["python", "python3", "python3.14", "python.exe", "pythonw.exe"]) {
      for (const source of [
        "#!/usr/bin/" + runner,
        "#!/usr/bin/env " + runner,
        "#!/usr/bin/env.exe -S " + runner + " --version",
        "#!C:\\bin\\" + runner,
      ]) {
        expect(lumine.grammars.selectGrammar("extensionless", source).scopeName)
          .withContext(source)
          .toBe("source.python");
      }
    }
  });
  it("rejects runner names appearing only in wrappers or arguments", () => {
    const runner = "python";
    for (const source of [
      "#!/usr/bin/" + runner + "-wrapper",
      "#!/usr/bin/env " + runner + "-wrapper",
      "#!/bin/sh -c 'echo " + runner + "'",
      "#!/usr/bin/env printf " + runner,
      "#!/usr/bin/other /tmp/" + runner,
    ]) {
      expect(lumine.grammars.selectGrammar("extensionless", source).scopeName)
        .withContext(source)
        .not.toBe("source.python");
    }
  });
  it("honors an explicit user file association", () => {
    try {
      lumine.config.set("core.customFileTypes", { "source.python": ["custom-recheck"] });
      expect(
        lumine.grammars.selectGrammar("script.custom-recheck", "#!/usr/bin/other").scopeName,
      ).toBe("source.python");
    } finally {
      lumine.config.unset("core.customFileTypes");
    }
  });
});
