import { TextBox, handleTexboxKeyDown, type UserInput } from "./user-input";
import { lexer, parse, type ParserResult } from "./parser";
import { computed, ref, shallowRef } from "vue";
import { Stream } from "./stream";

export function useEditor() {
  const textBox = shallowRef(TextBox.from("3+4*(2-1)"));
  const tokens = shallowRef(
    lexer(new Stream(textBox.value.userInput.zipped()))
  );
  const ast = shallowRef(parse(new Stream(tokens.value)));

  function handleKeyDown(e: KeyboardEvent) {
    let newTextBox = handleTexboxKeyDown(e, textBox.value);
    const newTokens = lexer(new Stream(newTextBox.userInput.zipped()));
    const newAst = parse(new Stream(newTokens));

    let updates = newTextBox.userInput.getUpdates().slice();
    newTokens.forEach((token) => {
      if (token.type === "error") {
        return;
      }
      for (let i = token.range[0]; i < token.range[1]; i++) {
        updates[i] = false;
      }
    });
    newTextBox = newTextBox.setUpdates(updates);

    textBox.value = newTextBox;
    tokens.value = newTokens;
    ast.value = newAst;
  }

  return {
    textBox,
    userInput: computed(() => textBox.value.userInput),
    tokens,
    ast,
    handleKeyDown,
  };
}
