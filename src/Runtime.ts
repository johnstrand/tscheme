import { SyntaxTree } from "./Parser";
import { Tokens } from "./utils";
import { IdentifierToken, SymbolToken } from "./Tokenizer";

type Primitive = boolean | string | number;
type Value = Primitive | (Function & { lazy?: boolean }) | null | Value[];
type Context = Map<string, Value>;

const variables = (() => {
  const globals = new Map<string, Value>();
  const locals = Array<Context>();
  const hasLocalScope = () => locals.length > 0;
  const getLocalScope = () => locals[locals.length - 1];
  return {
    push(scope: Context) {
      locals.push(scope);
    },
    pop() {
      return locals.pop();
    },
    peek() {
      return hasLocalScope() ? getLocalScope() : globals;
    },
    has(name: string) {
      return (hasLocalScope() ? getLocalScope() : globals).has(name);
    },
    get(name: string) {
      return (
        (hasLocalScope() && getLocalScope().has(name)
          ? getLocalScope()
          : globals
        ).get(name) ?? null
      );
    },
    set(name: string, value: any) {
      (hasLocalScope() ? getLocalScope() : globals).set(name, value);
      return value;
    },
  };
})();

export const Runtime = (() => {
  type StringIndexed<T> = { [key: string]: T };

  type Method = ((...args: any[]) => any) & { lazy?: boolean };

  type NamedFunctions = StringIndexed<Method>;

  function lazy(m: Method): Method {
    m.lazy = true;
    return m;
  }

  let defining: string | undefined;

  const stdlib: NamedFunctions = {
    "+": (numbers: number[]) => numbers.reduce((acc, cur) => acc + cur, 0),
    "-": (numbers: number[]) =>
      numbers.length === 1
        ? -numbers[0]
        : numbers.slice(1).reduce((acc, cur) => acc - cur, numbers[0]),
    "*": (numbers: number[]) => numbers.reduce((acc, cur) => acc * cur, 1),
    "/": (numbers: number[]) => numbers.reduce((acc, cur) => acc / cur, 1),
    "=": (args: any[]) => args.length === 0 || args.every((v) => v == args[0]),
    write: (args: any[]) => console.log(args.join("")),
    lambda: lazy(([args, body]) => {
      const boundScope = new Map(variables.peek());
      const argNames = (args as IdentifierToken[]).map((ident) => ident.name);
      const _name = defining;
      return function lambda(lambdaArgs: any[]) {
        variables.push(boundScope);
        if (typeof _name === "string") {
          variables.set(_name, lambda);
        }
        argNames.forEach((name, index) => {
          variables.set(name, lambdaArgs[index]);
        });
        const value = execute(body);
        variables.pop();
        return value;
      };
    }),
    define: lazy(([identifierOrSymbol, value], isSet: boolean) => {
      if (
        !Tokens.isIdentifier(identifierOrSymbol) &&
        !Tokens.isSymbol(identifierOrSymbol)
      ) {
        throw `Define target must be identifier or symbol, found ${identifierOrSymbol}`;
      }
      const { name } = identifierOrSymbol;
      if (stdlib[name]) {
        throw `${name} is a reserved name`;
      }

      if (variables.has(name) && !isSet) {
        throw `${name} is already defined, use 'set' if redefinition is intentional`;
      }

      if (defining) {
        throw `Nested defines are not permitted, already defining ${defining}`;
      }
      defining = name;
      variables.set(name, execute(value));
      defining = undefined;
    }),
    if: lazy(([cond, ifTrue, ifFalse]) => {
      const isTrue = execute(cond);
      if (isTrue) {
        return execute(ifTrue);
      } else {
        return ifFalse && execute(ifFalse);
      }
    }),
    block: (values: any[]) => {
      return values.length ? values[values.length - 1] : undefined;
    },
  };

  stdlib["\\"] = stdlib.lambda;
  stdlib["$"] = stdlib.define;
  stdlib["set"] = lazy((args) => stdlib.define(args, true));

  function execute(ast: SyntaxTree): IdentifierToken | SymbolToken | Value {
    if (Array.isArray(ast)) {
      if (!ast.any()) {
        throw "Unexpected empty statement";
      }
      const [ref, ...tree] = ast;
      const target = execute(ref);

      if (typeof target !== "function") {
        throw `Expected function, got ${typeof target} (Line ${
          (ref as any).line
        })`;
      }

      if ((target as Function & { lazy: boolean }).lazy) {
        return target(tree);
      } else {
        return target(tree.map((item) => execute(item)));
      }
    } else if (Tokens.isValueToken(ast)) {
      return ast.value;
    } else if (Tokens.isIdentifier(ast) || Tokens.isSymbol(ast)) {
      if (stdlib[ast.name]) {
        return stdlib[ast.name];
      } else if (variables.has(ast.name)) {
        return variables.get(ast.name);
      } else {
        throw `Unknown symbol or identifier ${ast.name}`;
      }
    } else {
      throw JSON.stringify(ast);
    }
  }
  return {
    execute,
  };
})();
