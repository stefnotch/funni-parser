import { h, type VNode } from "vue";

function toSpliced<T>(
  array: T[],
  start: number,
  deleteCount: number,
  ...items: T[]
): T[] {
  let copy = array.slice();
  copy.splice(start, deleteCount, ...items);
  return copy;
}

export class UserInput {
  constructor(private _value: string[], private _updates: boolean[]) {}

  static from(input: string): UserInput {
    let value = input.split("");
    return new UserInput(
      value,
      value.map(() => true)
    );
  }

  get(): string {
    return this._value.join("");
  }

  getUpdates(): readonly boolean[] {
    return this._updates;
  }

  setUpdates(updates: boolean[]): UserInput {
    if (updates.length !== this._value.length) {
      throw new Error("Updates array must have the same length as the value");
    }
    return new UserInput(this._value, updates);
  }

  insert(index: number, value: string): UserInput {
    return new UserInput(
      toSpliced(this._value, index, 0, value),
      toSpliced(this._updates, index, 0, true)
    );
  }

  delete(index: number): UserInput {
    return new UserInput(
      toSpliced(this._value, index, 1),
      toSpliced(this._updates, index, 1)
    );
  }

  zipped(): [string, boolean][] {
    return this._value.map((value, index) => [value, this._updates[index]]);
  }
}

export class TextBox {
  constructor(public userInput: UserInput, private _caret: number) {}

  static from(input: string): TextBox {
    return new TextBox(UserInput.from(input), 0);
  }

  setUpdates(updates: boolean[]) {
    return new TextBox(this.userInput.setUpdates(updates), this._caret);
  }

  insert(value: string): TextBox {
    return new TextBox(
      this.userInput.insert(this._caret, value),
      this._caret + 1
    );
  }

  delete(): TextBox {
    return new TextBox(this.userInput.delete(this._caret - 1), this._caret - 1);
  }

  moveLeft(): TextBox {
    if (this._caret === 0) {
      return this;
    }
    return new TextBox(this.userInput, this._caret - 1);
  }

  moveRight(): TextBox {
    if (this._caret === this.userInput.get().length) {
      return this;
    }
    return new TextBox(this.userInput, this._caret + 1);
  }

  render(): VNode {
    let updates = this.userInput.getUpdates();
    let children = Array.from(this.userInput.get()).map((char, index) => {
      let isUpdate = updates[index];
      let hasCaret = index === this._caret;
      return h(
        "span",
        {
          class: {
            "is-updated": isUpdate,
            "caret-after": hasCaret,
          },
        },
        char
      );
    });
    if (this._caret === this.userInput.get().length) {
      children.push(h("span", { class: "caret-after" }, ""));
    }
    return h("div", { class: "text-box" }, children);
  }
}

export function handleTexboxKeyDown(
  event: KeyboardEvent,
  textBox: TextBox
): TextBox {
  event.preventDefault();
  if (event.key === "Backspace") {
    return textBox.delete();
  } else if (event.key === "ArrowLeft") {
    return textBox.moveLeft();
  } else if (event.key === "ArrowRight") {
    return textBox.moveRight();
  } else if (event.key.length === 1) {
    return textBox.insert(event.key);
  }
  return textBox;
}
