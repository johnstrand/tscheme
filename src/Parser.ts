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
    if (tokenizer.eof()) {
      throw "Unexpected end of stream";
    }
    const next = tokenizer.next() as Token;
    if (next.type === TokenType.LeftParenthesis) {
      const expression = Array<SyntaxTree>();
      while (tokenizer.peek()?.type !== TokenType.RightParenthesis) {
        if (tokenizer.eof()) {
          throw `Unexpected end of stream parsing statement starting on line ${next.line}`;
        }
        expression.push(this.read(tokenizer));
      }
      tokenizer.next();
      return expression;
    } else if (next.type === TokenType.RightParenthesis) {
      throw `Unexpected right parenthesis on line ${next.line}`;
    } else {
      return next as SyntaxTree;
    }
  },
};
