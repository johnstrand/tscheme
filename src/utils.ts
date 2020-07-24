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
    return str === ";";
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
