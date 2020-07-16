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

type Context = Map<string, Value>;

const variables = (() => {
  const globals = new Map<string, Value>();
  const locals = Array<Context>();
  const hasLocalScope = () => locals.length > 0;
  const getLocalScope = () => locals[locals.length - 1];
  return {
    push(scope: Context) {
      console.log("Push scope");
      locals.push(scope);
    },
    pop() {
      console.log("Pop scope");
      return locals.pop();
    },
    has(name: string) {
      return (hasLocalScope() ? getLocalScope() : globals).has(name);
    },
    get(name: string) {
      if (keywords[name]) {
        throw `${name} cannot be used in this context`;
      }
      console.log(`Resolving ${name}`);
      return (
        (hasLocalScope() && getLocalScope().has(name)
          ? getLocalScope()
          : globals
        ).get(name) ?? null
      );
    },
    set(name: string, value: any) {
      if (stdlib[name] || keywords[name]) {
        throw `${name} cannot be re-assigned`;
      }
      (hasLocalScope() ? getLocalScope() : globals).set(name, value);
      return value;
    },
  };
})();

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

type Primitive = boolean | string | number;

type Value = Primitive | Function | null | Value[];

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
      localScope.set(name, evaluate(params[index]) as Value);
    }

    return () => {
      variables.push(localScope);
      const result = evaluate(body);
      variables.pop();
      return result;
    };
  },
};

keywords["\\"] = keywords.lambda;
keywords["λ"] = keywords.lambda;

const evaluate = (tree: SyntaxTree): IdentifierToken | SymbolToken | Value => {
  if (Array.isArray(tree)) {
    if (!tree.any()) {
      throw "Unexpected empty statement";
    }
    const target = tree.shift()!;
    const evaluateTree = () => tree.map((node) => evaluate(node));

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
      const value = evaluate(tree.shift()!);
      return variables.set(name.name, value);
    } else if (stdlib[target.name]) {
      return stdlib[target.name](evaluateTree());
    } else if (keywords[target.name]) {
      return keywords[target.name](tree);
    } else if (
      variables.has(target.name) &&
      typeof variables.get(target.name) === "function"
    ) {
      return (variables.get(target.name) as Function)!(evaluateTree());
    } else if (typeof target === "function") {
      console.log("function", target);
      return (target as Function)(evaluateTree());
    } else {
      throw `Unknown identifier ${JSON.stringify(target)}`;
    }
  } else if (tree.type === TokenType.Identifier) {
    return variables.get(tree.name);
  } else if (isValueToken(tree)) {
    return tree.value;
  } else {
    console.log("default", tree);
    return tree;
  }
};

while (!tokenizer.eof()) {
  const tree = Parser.read(tokenizer);
  console.log(tree);
  evaluate(tree);
}
