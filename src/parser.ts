import { None, Some, type Option, Result, Ok, Err } from "./result";
import type { Stream } from "./stream";

type Token = {
  type: "number" | "variable" | "operator" | "bracket";
  value: string;
  range: [number, number];
};

export function lexer(input: string): Token[] {
  const regex = /\s*([()]|[A-Za-z_][A-Za-z0-9_]*|\d+(\.\d+)?|[+\-*/])\s*/g;
  let result;
  const tokens: Token[] = [];
  while ((result = regex.exec(input)) !== null) {
    let token: Token = {
      type: "invalid" as any,
      value: result[0].trim(),
      range: [result.index, regex.lastIndex],
    };
    if (!isNaN(Number(token.value))) {
      token.type = "number";
    } else if (["+", "-", "*", "/"].includes(token.value)) {
      token.type = "operator";
    } else if (["(", ")"].includes(token.value)) {
      token.type = "bracket";
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token.value)) {
      token.type = "variable";
    } else {
      throw new TypeError("Unknown token " + token.value);
    }
    tokens.push(token);
  }
  return tokens;
}

export type ASTNode = {
  type: "number" | "variable" | "operation";
  value: string;
  children: ASTNode[];
  range: [number, number];
};

export type ParserResult = Result<ASTNode, string>;

export function parse(tokens: Stream<Token>): ParserResult {
  function parseExpression(): ParserResult {
    return parseTerm().andThen((node): ParserResult => {
      while (
        tokens
          .peek()
          .map((token) => token.type === "operator")
          .unwrapOr(false)
      ) {
        const operator = tokens.next().unwrap();
        const right = parseTerm().split();
        if (right.t === "err") {
          return Err("Missing right operand");
        }
        node = {
          type: "operation",
          value: operator.value,
          children: [node, right.v],
          range: [node.range[0], right.v.range[1]],
        };
      }

      return Ok(node);
    });
  }

  function parseTerm(): ParserResult {
    return tokens
      .next()
      .mapErr((_) => "No next token")
      .andThen((token): ParserResult => {
        if (token.type === "number" || token.type === "variable") {
          return Ok({
            type: token.type,
            value: token.value,
            children: [],
            range: token.range,
          });
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
            return Err("Missing closing bracket");
          }
        } else {
          return Err("Unexpected token " + token.value);
        }
      });
  }

  return parseExpression();
}
