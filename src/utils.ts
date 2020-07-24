import {
  Token,
  AnyValueToken,
  TokenType,
  IdentifierToken,
  SymbolToken,
} from "./Tokenizer";

export const Char = {
  isWhitespace(str: string) {
    return str.trim() === "";
  },

  isParenthesis(str: string) {
    return str === "(" || str === ")";
  },

  isComment(str: string) {
    return str === "#";
  },
};

export const Tokens = {
  isValueToken(token: Token): token is AnyValueToken {
    return (
      token.type === TokenType.Boolean ||
      token.type === TokenType.Number ||
      token.type === TokenType.String
    );
  },

  isIdentifier(token: any): token is IdentifierToken {
    return token && token.type == TokenType.Identifier;
  },

  isSymbol(token: any): token is SymbolToken {
    return token && token.type == TokenType.Symbol;
  },
};

const __debug = false;
export const log = <T>(content: T, message?: string) => {
  if (!__debug) {
    return content;
  }
  if (message) {
    console.log(message, content);
  } else {
    console.log(content);
  }
  return content;
};
