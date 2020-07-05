import "./extensions";
import { FileReader } from "./FileReader";
import {
  Tokenizer,
  TokenType,
  Token,
  AnyValueToken,
  IdentifierToken,
  SymbolToken,
} from "./Tokenizer";
import { Parser, SyntaxTree } from "./Parser";

const reader = new FileReader("./examples/lambda.tss");
const tokenizer = new Tokenizer(reader);

const globalScope = new Map<string, Value>();

function isValueToken(token: Token): token is AnyValueToken {
  return (
    token.type === TokenType.Boolean ||
    token.type === TokenType.Number ||
    token.type === TokenType.String
  );
}

function isIdentifier(token: any): token is IdentifierToken {
  return token && token.type == TokenType.Identifier;
}

function isSymbol(token: any): token is SymbolToken {
  return token && token.type == TokenType.Symbol;
}

type Value = boolean | string | number | Function | null | Value[];

const stdlib: { [key: string]: (...args: any[]) => any } = {
  "+": (numbers: number[]) => numbers.reduce((acc, cur) => acc + cur, 0),
  "*": (numbers: number[]) => numbers.reduce((acc, cur) => acc * cur, 1),
  write: (args: any[]) => console.log(args.join(",")),
};

const keywords: { [key: string]: (...args: any[]) => any } = {
  lambda: ([args, body], parentScope: Map<string, Value>) => (
    params: SyntaxTree[]
  ) => {
    const localScope = new Map(parentScope);
    for (const index in params) {
      const { name } = args[index] as IdentifierToken;
      localScope.set(name, evaluate(params[index], parentScope) as Value);
    }

    return evaluate(body, localScope);
  },
};

keywords["\\"] = keywords.lambda;
keywords["λ"] = keywords.lambda;

const evaluate = (
  tree: SyntaxTree,
  localScope?: Map<string, Value>
): IdentifierToken | SymbolToken | Value => {
  const context = {
    has(name: string) {
      return (localScope ? localScope : globalScope).has(name);
    },
    get(name: string) {
      if (keywords[name]) {
        throw `${name} cannot be used in this context`;
      }
      return (
        (localScope && localScope.has(name) ? localScope : globalScope).get(
          name
        ) ?? null
      );
    },
    set(name: string, value: any) {
      if (stdlib[name] || keywords[name]) {
        throw `${name} cannot be re-assigned`;
      }
      (localScope ? localScope : globalScope).set(name, value);
      return value;
    },
  };

  if (Array.isArray(tree)) {
    if (!tree.any()) {
      throw "Unexpected empty statement";
    }
    const target = tree.shift()!;
    const evaluateTree = () => tree.map((node) => evaluate(node, localScope));

    if (
      !isIdentifier(target) &&
      !isSymbol(target) &&
      typeof target !== "function"
    ) {
      throw `Invalid identifier ${JSON.stringify(target)}`;
    }

    if (target.name === "define" || target.name === "$") {
      const name = tree.shift()! as IdentifierToken;
      if (name.type !== TokenType.Identifier) {
        throw `Expected identifer, found ${name} at ${name.line}`;
      }
      const value = evaluate(tree.shift()!, localScope);
      return context.set(name.name, value);
    } else if (stdlib[target.name]) {
      return stdlib[target.name](evaluateTree());
    } else if (keywords[target.name]) {
      return keywords[target.name](tree, localScope);
    } else if (
      context.has(target.name) &&
      typeof context.get(target.name) === "function"
    ) {
      return (context.get(target.name) as Function)!(evaluateTree());
    } else if (typeof target === "function") {
      return (target as Function)(evaluateTree());
    } else {
      throw `Unknown identifier ${JSON.stringify(target)}`;
    }
  } else if (tree.type === TokenType.Identifier) {
    return context.get(tree.name);
  } else if (isValueToken(tree)) {
    return tree.value;
  } else {
    return tree;
  }
};

while (!tokenizer.eof()) {
  const tree = Parser.read(tokenizer);
  evaluate(tree);
}
