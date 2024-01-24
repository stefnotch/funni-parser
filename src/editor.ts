import { TextBox, type UserInput } from "./user-input";
import { lexer, parse, type ParserResult, type Token } from "./parser";
import { computed, ref, shallowRef } from "vue";
import { Stream } from "./stream";

class Editor {
  tokens: Token[];
  ast: ParserResult;

  constructor(public textBox: TextBox) {
    this.tokens = lexer(new Stream(this.textBox.userInput.zipped()));
    this.ast = parse(new Stream(this.tokens));
  }

  private delete(): Editor {
    const newTextBox = this.textBox.delete();
    // TODO: Invalidate token
    // TODO: Invalidate based on ast
    return new Editor(newTextBox);
  }

  private insert(value: string): Editor {
    const newTextBox = this.textBox.insert(value);
    return new Editor(newTextBox);
  }

  private moveLeft(): Editor {
    const newTextBox = this.textBox.moveLeft();
    return new Editor(newTextBox);
  }

  private moveRight(): Editor {
    const newTextBox = this.textBox.moveRight();
    return new Editor(newTextBox);
  }

  handleKeyDown(event: KeyboardEvent): Editor {
    const newEditor = (() => {
      event.preventDefault();
      if (event.key === "Backspace") {
        return this.delete();
      } else if (event.key === "ArrowLeft") {
        return this.moveLeft();
      } else if (event.key === "ArrowRight") {
        return this.moveRight();
      } else if (event.key.length === 1) {
        return this.insert(event.key);
      }
      return this;
    })();

    let updates = newEditor.textBox.userInput.getUpdates().slice();
    newEditor.tokens.forEach((token) => {
      if (token.type === "error") {
        return;
      }
      for (let i = token.range[0]; i < token.range[1]; i++) {
        updates[i] = false;
      }
    });
    return new Editor(newEditor.textBox.setUpdates(updates));
  }
}

export function useEditor() {
  const editor = shallowRef(new Editor(TextBox.from("?3+4*(2-1)")));

  function handleKeyDown(e: KeyboardEvent) {
    editor.value = editor.value.handleKeyDown(e);
  }

  return {
    textBox: computed(() => editor.value.textBox),
    userInput: computed(() => editor.value.textBox.userInput),
    tokens: computed(() => editor.value.tokens),
    ast: computed(() => editor.value.ast),
    handleKeyDown,
  };
}
