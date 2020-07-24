import {
  Tokenizer,
  TokenType,
  Token,
  LParenToken,
  RParenToken,
} from "./Tokenizer";

export type SyntaxTree =
  | Exclude<Token, LParenToken | RParenToken>
  | SyntaxTree[];

export const Parser = {
  read(tokenizer: Tokenizer) {
    // Check if we have run out of tokens
    if (tokenizer.eof()) {
      throw "Unexpected end of stream";
    }

    // Pop next token from queue
    const next = tokenizer.next() as Token;
    // If we are dealing with the start of an s-expression
    if (next.type === TokenType.LeftParenthesis) {
      // Initialize an array
      const expression = Array<SyntaxTree>();
      // Loop until we encounter a right parenthesis
      while (tokenizer.peek()?.type !== TokenType.RightParenthesis) {
        if (tokenizer.eof()) {
          throw `Unexpected end of stream parsing statement starting on line ${next.line}`;
        }
        // And extract and add nested S-expressions
        expression.push(this.read(tokenizer));
      }
      // Consume the trailing right parenthesis
      tokenizer.next();
      return expression;
    } else if (next.type === TokenType.RightParenthesis) {
      throw `Unexpected right parenthesis on line ${next.line}`;
    } else {
      // Otherwise, just return the plain expression
      return next as SyntaxTree;
    }
  },
};
