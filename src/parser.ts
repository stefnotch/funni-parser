import { None, Some, type Option, Result, Ok, Err } from "./result";
import type { Stream } from "./stream";

type Token = {
  type: "number" | "variable" | "operator" | "bracket" | "error";
  value: string;
  range: [number, number];
  isEdited: boolean;
};

export function lexer(input: Stream<[string, boolean]>): Token[] {
  const tokens: Token[] = [];
  while (true) {
    let next = input.next();
    if (next.isErr()) {
      return tokens;
    }
    let nextValue = next.unwrap();
    let startIndex = input.lastIndex().unwrap();
    if (isWhitespace(nextValue[0])) {
      // Whitespace purposefully leads to an error token
      tokens.push({
        type: "error",
        value: nextValue[0],
        range: [startIndex, input.upcomingIndex()],
        isEdited: nextValue[1],
      });
    } else if (isDigit(nextValue[0])) {
      let number = nextValue[0];
      let isEdited = nextValue[1];
      while (true) {
        let peek = input.peek().andThen((v): Option<[string, boolean]> => {
          if (isDigit(v[0])) {
            return Some(v);
          }
          return None();
        });
        if (peek.isOk()) {
          input.next();
          number += peek.unwrap()[0];
          isEdited = isEdited || peek.unwrap()[1];
        } else {
          break;
        }
      }
      tokens.push({
        type: "number",
        value: number,
        range: [startIndex, input.upcomingIndex()],
        isEdited,
      });
    } else if (isIdentifierStart(nextValue[0])) {
      let identifier = nextValue[0];
      let isEdited = nextValue[1];
      while (true) {
        let peek = input.peek().andThen((v): Option<[string, boolean]> => {
          if (isIdentifierContinue(v[0])) {
            return Some(v);
          }
          return None();
        });
        if (peek.isOk()) {
          input.next();
          identifier += peek.unwrap()[0];
          isEdited = isEdited || peek.unwrap()[1];
        } else {
          break;
        }
      }
      tokens.push({
        type: "variable",
        value: identifier,
        range: [startIndex, input.upcomingIndex()],
        isEdited,
      });
    } else if (isOperator(nextValue[0])) {
      tokens.push({
        type: "operator",
        value: nextValue[0],
        range: [startIndex, input.upcomingIndex()],
        isEdited: nextValue[1],
      });
    } else if (isBracket(nextValue[0])) {
      tokens.push({
        type: "bracket",
        value: nextValue[0],
        range: [startIndex, input.upcomingIndex()],
        isEdited: nextValue[1],
      });
    } else {
      tokens.push({
        type: "error",
        value: nextValue[0],
        range: [startIndex, input.upcomingIndex()],
        isEdited: nextValue[1],
      });
    }
  }
  function isWhitespace(value: string): boolean {
    return /^\s$/.test(value);
  }
  function isDigit(value: string): boolean {
    return /^[0-9]$/.test(value);
  }
  function isIdentifierStart(value: string): boolean {
    return /^[a-zA-Z_]$/.test(value);
  }
  function isIdentifierContinue(value: string): boolean {
    return /^[a-zA-Z0-9_]$/.test(value);
  }
  function isOperator(value: string): boolean {
    return ["+", "-", "*", "/"].includes(value);
  }
  function isBracket(value: string): boolean {
    return ["(", ")"].includes(value);
  }
  return tokens;
}

export class ASTNode {
  type: "number" | "variable" | "operation" | "has-error" | "error";
  value: string;
  children: ASTNode[];
  range: [number, number];

  constructor(
    type: "number" | "variable" | "operation" | "has-error" | "error",
    value: string,
    children: ASTNode[],
    range: [number, number]
  ) {
    this.type = type;
    this.value = value;
    this.children = children;
    this.range = range;
  }
}

export type ParserResult = ASTNode;

export function parse(tokens: Stream<Token>): ParserResult {
  function parseExpression(): ParserResult {
    let node = parseTerm();
    while (
      tokens
        .peek()
        .map((token) => token.type === "operator")
        .unwrapOr(false)
    ) {
      const operator = tokens.next().unwrap();
      const right = parseTerm();
      node = new ASTNode(
        "operation",
        operator.value,
        [node, right],
        [node.range[0], right.range[1]]
      );
    }

    return node;
  }

  function parseTerm(): ParserResult {
    return tokens
      .next()
      .map((token): ParserResult => {
        if (token.type === "number" || token.type === "variable") {
          return new ASTNode(token.type, token.value, [], token.range);
        } else if (token.type === "bracket" && token.value === "(") {
          const next = parseExpression();
          if (
            tokens
              .peek()
              .map((token) => token.type === "bracket" && token.value === ")")
              .unwrapOr(false)
          ) {
            tokens.next().unwrap();
            return next;
          } else {
            return new ASTNode(
              "has-error",
              "",
              [next, new ASTNode("error", ")", [], [0, 0])],
              [token.range[0], next.range[1]]
            );
          }
        } else {
          return new ASTNode(
            "has-error",
            "",
            [new ASTNode("error", token.value, [], token.range)],
            token.range
          );
        }
      })
      .unwrapOr(new ASTNode("error", "", [], [0, 0]));
  }

  return parseExpression();
}
