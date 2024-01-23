import type { Token } from "typescript";
import { TextBox, handleTexboxKeyDown, type UserInput } from "./user-input";
import { lexer, parse, type ParserResult } from "./parser";
import { computed, ref, shallowRef } from "vue";
import { Stream } from "./stream";

export function useEditor() {
  let textBox = shallowRef(TextBox.from("3 + 4 * (2 - 1)"));
  let tokens = shallowRef(lexer(textBox.value.userInput.get()));
  let ast = shallowRef(parse(new Stream(tokens.value)));

  function handleKeyDown(e: KeyboardEvent) {
    let newTextBox = handleTexboxKeyDown(e, textBox.value);
    let newTokens = lexer(newTextBox.userInput.get());
    let newAst = parse(new Stream(newTokens));

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
