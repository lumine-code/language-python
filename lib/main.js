exports.activate = function () {};

exports.consumeHyperlinkInjection = (hyperlink) => {
  hyperlink.addInjectionPoint("source.python", {
    types: ["comment", "string_content"],
  });
};

exports.consumeTodoInjection = (todo) => {
  todo.addInjectionPoint("source.python", { types: ["comment"] });
};
