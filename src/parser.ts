import { None, Some, type Option, Result, Ok, Err } from "./result";
import type { Stream } from "./stream";

export type Token = {
  type: "number" | "variable" | "operator" | "bracket" | "whitespace" | "error";
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
}

export type ASTNode = ASTContainerNode | ASTTokenNode;

export class ASTContainerNode {
  constructor(
    public readonly type: "operation" | "brackets" | "has-error",
    public readonly children: ASTNode[],
    public readonly range: readonly [number, number]
  ) {}
}

export class ASTTokenNode {
  constructor(
    public readonly type:
      | "number"
      | "variable"
      | "bracket"
      | "operator"
      | "whitespace"
      | "error",
    public readonly value: string,
    public readonly range: readonly [number, number]
  ) {}

  static fromToken(
    token: Token & { type: ASTTokenNode["type"] }
  ): ASTTokenNode {
    return new ASTTokenNode(token.type, token.value, token.range);
  }
}

export type ParserResult = ASTNode;

export function parse(tokens: Stream<Token>): ParserResult {
  function parseWithRecovery(): ParserResult {
    let ast = parseExpression();
    if (tokens.peek().isErr()) {
      return ast;
    } else {
      // There are still tokens left
      const next = parseWithRecovery();
      return new ASTContainerNode(
        "has-error",
        [
          ast,
          new ASTTokenNode("error", "Missing operator", [
            ast.range[1],
            ast.range[1],
          ]),
          next,
        ],
        [ast.range[0], next.range[1]]
      );
    }
  }

  function parseExpression(): ParserResult {
    let node = parseTerm();
    while (
      tokens
        .peek()
        .map((token) => token.type === "operator")
        .unwrapOr(false)
    ) {
      const operator = ASTTokenNode.fromToken(tokens.next().unwrap());
      const right = parseTerm();
      node = new ASTContainerNode(
        "operation",
        [node, operator, right],
        [node.range[0], right.range[1]]
      );
    }

    return node;
  }

  function parseTermBrackets(openingBracket: ASTTokenNode): ParserResult {
    const next = parseExpression();
    const closingBracket = tokens
      .nextIf((token) => token.value === ")" && token.type === "bracket")
      .map(ASTTokenNode.fromToken);

    if (closingBracket.isErr()) {
      return new ASTContainerNode(
        "has-error",
        [
          openingBracket,
          next,
          new ASTTokenNode("error", "Missing closing bracket", [
            next.range[1],
            next.range[1],
          ]),
        ],
        [openingBracket.range[0], next.range[1]]
      );
    }
    return new ASTContainerNode(
      "brackets",
      [openingBracket, next, closingBracket.unwrap()],
      [openingBracket.range[0], closingBracket.unwrap().range[1]]
    );
  }

  function parseTerm(): ParserResult {
    return tokens
      .next()
      .map((token): ParserResult => {
        if (token.type === "number" || token.type === "variable") {
          return ASTTokenNode.fromToken(token);
        } else if (token.type === "bracket" && token.value === "(") {
          return parseTermBrackets(ASTTokenNode.fromToken(token));
        } else {
          return new ASTContainerNode(
            "has-error",
            [new ASTTokenNode("error", token.value, token.range)],
            token.range
          );
        }
      })
      .unwrapOr(new ASTTokenNode("error", "Missing term", [0, 0]));
  }

  return parseWithRecovery();
}
