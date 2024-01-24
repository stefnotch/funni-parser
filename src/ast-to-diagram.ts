import {
  ASTContainerNode,
  ASTTokenNode,
  type ASTNode,
  type ParserResult,
} from "./parser";
import { assertUnreachable } from "./utils/assert";

interface NodeWithInfo {
  readonly node: ASTNode;
  readonly diagramId: string;
}

export function astToDiagram(ast: ParserResult): string {
  let result = "flowchart TD\n";

  function walk(node: NodeWithInfo, parentNode: NodeWithInfo | null): string {
    let result = "";
    if (parentNode !== null) {
      result += `${parentNode.diagramId}["${getNodeText(
        parentNode.node
      )}"] --> ${node.diagramId}["${getNodeText(node.node)}"]\n`;
    }
    if (node.node instanceof ASTTokenNode) {
      return result;
    }
    node.node.children.forEach((child, i) => {
      result += walk(
        {
          node: child,
          diagramId: makeNodeName(node.diagramId, i),
        },
        node
      );
    });
    return result;
  }

  // Root node definition
  result += `${makeNodeName("", 0)}["${getNodeText(ast)}"]\n`;
  result += walk(
    {
      node: ast,
      diagramId: makeNodeName("", 0),
    },
    null
  );
  return result;
}

function getNodeText(node: ASTNode): string {
  const result = (() => {
    if (node instanceof ASTContainerNode) {
      if (node.type === "operation") {
        return node.children
          .flatMap((child) => (child.type === "operator" ? [child.value] : []))
          .join("");
      } else if (node.type === "brackets") {
        return "( )";
      } else if (node.type === "has-error") {
        return "has-error";
      } else {
        assertUnreachable(node.type);
      }
    } else {
      return node.value;
    }
  })();
  return escapeMermaid(result);
}

function makeNodeName(prefix: string, index: number): string {
  let result = prefix + index + "_";
  return result;
}

/**
 * From https://stackoverflow.com/a/66481918/3492994
 */
function escapeMermaid(unsafe: string) {
  return unsafe.replace(
    /[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g,
    (c) => "#" + ("000" + c.charCodeAt(0)).slice(-4) + ";"
  );
}
