import { TextBox, type UserInput } from "./user-input";
import {
  lexer,
  parse,
  type ASTNode,
  type ParserResult,
  type Token,
} from "./parser";
import { computed, ref, shallowRef } from "vue";
import { Stream } from "./stream";

class Editor {
  readonly tokens: Token[];
  readonly ast: ParserResult;

  constructor(public textBox: TextBox) {
    this.tokens = lexer(new Stream(this.textBox.userInput.zipped()));
    this.ast = parse(new Stream(this.tokens));
  }

  private delete(): Editor {
    this.textBox = this.textBox.withUpdates((v) => {
      let updates = v.slice();
      this.ast
        .getAffectedRanges("delete", this.textBox.caretOffset)
        .forEach((range) => {
          for (let i = range[0]; i < range[1]; i++) {
            updates[i] = true;
          }
        });
      return updates;
    });
    const newTextBox = this.textBox.delete();
    return new Editor(newTextBox);
  }

  private insert(value: string): Editor {
    this.textBox = this.textBox.withUpdates((v) => {
      let updates = v.slice();
      this.ast
        .getAffectedRanges("insert", this.textBox.caretOffset)
        .forEach((range) => {
          for (let i = range[0]; i < range[1]; i++) {
            updates[i] = true;
          }
        });
      return updates;
    });
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

  handleKeyDown(event: KeyboardEvent): {
    editor: Editor;
    debugTextBox: TextBox;
  } {
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

    const newTextBox = newEditor.textBox.withUpdates((v) => {
      // Set the "updates" to "everything parsed fine, except for the errors"
      let updates = new Array<boolean>(v.length).fill(false);
      newEditor.ast.getErrors().forEach((token) => {
        for (let i = token.range[0]; i < token.range[1]; i++) {
          updates[i] = true;
        }
      });
      return updates;
    });
    return { editor: newEditor, debugTextBox: newEditor.textBox };
  }
}

export function useEditor() {
  const editor = shallowRef(new Editor(TextBox.from("?3+4*(2-1)")));
  const debugTextBox = shallowRef(TextBox.empty());

  function handleKeyDown(e: KeyboardEvent) {
    const result = editor.value.handleKeyDown(e);
    editor.value = result.editor;
    debugTextBox.value = result.debugTextBox;
  }

  return {
    textBox: computed(() => editor.value.textBox),
    debugTextBox: computed(() => debugTextBox.value),
    userInput: computed(() => editor.value.textBox.userInput),
    tokens: computed(() => editor.value.tokens),
    ast: computed(() => editor.value.ast),
    handleKeyDown,
  };
}
