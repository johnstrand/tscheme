import { SyntaxTree } from "./Parser";
import { Tokens } from "./utils";
import { IdentifierToken, SymbolToken } from "./Tokenizer";

// Primitive, i.e., non-reference types in JavaScript are
// boolean, string, and number
type Primitive = boolean | string | number;
type Value = Primitive | (Function & { lazy?: boolean }) | null | Value[];
type Context = Map<string, Value>;

const variables = (() => {
  // Global variables (i.e., those defined at the root level)
  const globals = new Map<string, Value>();
  globals.set("PI", Math.PI);
  globals.set("E", Math.E);

  // Local scope stack, to handle multiple active scopes
  const locals = Array<Context>();
  const hasLocalScope = () => locals.length > 0;
  const getLocalScope = () => locals[locals.length - 1];

  // The rules for looking up a value is this: Check if it exists in current local scope,
  // otherwise attempt to find it in the global scope

  return {
    /**
     * Push a new local scope onto the stack
     * @param scope The new scope
     */
    push(scope: Context) {
      locals.push(scope);
    },
    /**
     * Remove (and return) the last added local scope
     */
    pop() {
      return locals.pop();
    },
    /**
     * Retrieve the last added local scope (if any), otherwise return the global scope
     */
    peek() {
      return hasLocalScope() ? getLocalScope() : globals;
    },
    /**
     * Check if a variable is defined either in the last local scope or the global scope
     * @param name The variable to check
     */
    has(name: string) {
      return (hasLocalScope() ? getLocalScope() : globals).has(name);
    },
    /**
     * Fetch a value from a variable name from the local scope (if one exists and contains the requested name),
     * otherwise attempt to fetch it from the global scope
     * @param name The variable whose content to fetch
     */
    get(name: string) {
      return (
        (hasLocalScope() && getLocalScope().has(name)
          ? getLocalScope()
          : globals
        ).get(name) ?? null
      );
    },
    /**
     * Sets a variable (in the local scope if one exists, otherwise in the global scope) to the specified value
     * @param name The variable to set
     * @param value The value to set it to
     */
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

  // Marks a function for lazy evaluation, this means that the runtime will pass the arguments to the function
  // without evaluating them beforehand
  function lazy(m: Method): Method {
    m.lazy = true;
    return m;
  }

  // Track which variable is current being defined, this is necessary to allow for recursion. Otherwise, the function
  // would only exist in the parent scope, and not in it's own scope
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
      // Fetch all values from the current scope, and bind the scope to the lambda expression being defined
      const boundScope = new Map(variables.peek());
      // Extract names from the arguments
      const argNames = (args as IdentifierToken[]).map((ident) => ident.name);
      // Store the external name (if one exists), for later use
      const _name = defining;
      // The method is named here, so that we may reference the name later
      return function lambda(lambdaArgs: any[]) {
        // Create a new scope from the bound scope
        variables.push(boundScope);
        // If we have a named function, store a copy in it's own scope. This is necessary for recursion
        if (typeof _name === "string") {
          variables.set(_name, lambda);
        }

        // For each named argument, create a local variable with the same name, and positionally match the values
        // from the invocation
        argNames.forEach((name, index) => {
          variables.set(name, lambdaArgs[index]);
        });

        // Execute the body of the lambda expression
        const value = execute(body);
        // Remove its local scope
        variables.pop();
        // Return the final value
        return value;
      };
    }),
    define: lazy(([identifier, value], allowRedefinition: boolean) => {
      // Before we may create or update a variable, we must do some checks

      // Ensure that the identifier actually is an identifier
      if (!Tokens.isIdentifier(identifier)) {
        throw `Define target must be identifier, found ${identifier}`;
      }

      // Extract intended name, and
      const { name } = identifier;
      // ensure that this isn't a name from the standard library
      if (stdlib[name]) {
        throw `${name} is a reserved name`;
      }

      // If the variable already has been defined, and allowRedefinition is false, throw an error
      if (variables.has(name) && !allowRedefinition) {
        throw `${name} is already defined, use 'set' if redefinition is intentional`;
      }

      // Ensure that the user isn't trying to do (define foo (define bar 1))
      if (defining) {
        throw `Nested defines are not permitted, already defining ${defining}`;
      }

      // Track name of variable being defined
      defining = name;
      // Evaluate value
      variables.set(name, execute(value));
      // Clear flag once we're done defining
      defining = undefined;
    }),
    if: lazy(([cond, ifTrue, ifFalse]) => {
      // Evaluate the condition
      const isTrue = execute(cond);
      // If the condition is true, evaluate the if-block
      if (isTrue) {
        return execute(ifTrue);
      } else {
        // If the condition is true, and there is an else-block, evalute that, otherwise return undefined
        return ifFalse && execute(ifFalse);
      }
    }),
    block: (values: any[]) => {
      // If the block contained any values, return the last value, otherwise return undefined
      return values.length ? values[values.length - 1] : undefined;
    },
  };

  // Create a few aliases
  stdlib["\\"] = stdlib.lambda;
  stdlib["$"] = stdlib.define;
  // Set is exactly like define, except that the allowRedefinition flag is set to true
  stdlib["set"] = lazy((args) => stdlib.define(args, true));

  function execute(ast: SyntaxTree): IdentifierToken | SymbolToken | Value {
    if (Array.isArray(ast)) {
      if (!ast.any()) {
        throw "Unexpected empty statement";
      }
      const [head, ...tail] = ast;
      const target = execute(head);

      if (typeof target !== "function") {
        throw `Expected function, got ${typeof target} (Line ${
          (head as any).line
        })`;
      }

      if ((target as Function & { lazy: boolean }).lazy) {
        return target(tail);
      } else {
        return target(tail.map((item) => execute(item)));
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
