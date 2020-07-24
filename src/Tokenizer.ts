import { FileReader } from "./FileReader";
import { Char } from "./utils";

class CharReader {
  private __index = 0;
  private __str: string;
  constructor(str: string) {
    this.__str = str;
  }

  // Return empty string rather than null to avoid a lot of null checks later
  public next = () => (this.eol() ? "" : this.__str[this.__index++]); // Return char at index and then increment index
  public peek = () => (this.eol() ? "" : this.__str[this.__index]); // Return char at index without incrementing index
  public eol = () => this.__index == this.__str.length;
}

export class Tokenizer {
  private __reader: FileReader;
  private __line = 0; // Maintain count of current line being read
  private __cache = Array<Token>(); // Cache tokens while reading
  constructor(reader: FileReader) {
    this.__reader = reader;
  }

  // If the reader has reached end of file, and the cache is empty,
  // then we can consider the file fully read
  public eof = () => this.__reader.eof() && !this.__cache.any();

  public peek = () => {
    // While cache is empty
    while (!this.__cache.any()) {
      // and there's data still to be read
      if (this.eof()) {
        return null;
      }
      // ensure that cache is filled
      this._cacheTokens();
    }

    // Return first cached element
    return this.__cache[0];
  };

  public next = () => {
    // Call peek to ensure that cache is filled
    // and save the returned value
    const next = this.peek();
    // Remove the first element in the cache
    this.__cache.shift();
    return next;
  };

  private _createToken = (value: string): Token => {
    // All tokes have line information
    const baseToken = {
      line: this.__line,
    };

    if (value === "(") {
      return {
        type: TokenType.LeftParenthesis,
        ...baseToken,
      };
    } else if (value === ")") {
      return {
        type: TokenType.RightParenthesis,
        ...baseToken,
      };
    } else if (value.startsWith('"')) {
      return {
        type: TokenType.String,
        // If the length is 2 (i.e, the value is just '\"\"') just return an empty string,
        // otherwise remove the first and the last character (so that '\"foo\"' becomes 'foo')
        value: value.length === 2 ? "" : value.substring(1, value.length - 1),
        ...baseToken,
      };
    } else if (value.startsWith("#")) {
      const flag = value[1];
      // Ensure that the value is either #t or #f, as those are the only valid boolean constants
      if (value.length !== 2 || (flag !== "f" && flag !== "t")) {
        throw `${value} is not a valid boolean constant, expected #t or #f`;
      }
      return {
        type: TokenType.Boolean,
        value: flag === "t",
        ...baseToken,
      };
    } else if (value.match(/^[a-zA-Z_][\w-]*$/)) {
      return {
        type: TokenType.Identifier,
        name: value,
        ...baseToken,
      };
    } else if (value.match(/^[!@$%&/.\-\\λ=?+|*^]+$/)) {
      return {
        type: TokenType.Symbol,
        name: value,
        ...baseToken,
      };
    } else {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        return { type: TokenType.Number, value: parsedValue, ...baseToken };
      }
      throw `Unable to parse token ${value}`;
    }
  };

  private _cacheTokens = () => {
    let row: string | null;
    /*
      while (
        not empty (
          row = 
            if read data is null, replace it with empty string, otherwise use read data, and trim whitespace
        )
      )
      Increment line, and
      check if end of file

      This keeps consuming empty lines (and increments the current line counter) until a row with
      data is found
    */
    while (!(row = (this.__reader.readLine() ?? "").trim())) {
      this.__line++;
      if (this.eof()) {
        return;
      }
    }

    this.__line++;
    const reader = new CharReader(row);
    const buffer = Array<string>();

    // Checks if buffer contains data, and if it does, creates a token from it
    const checkBuffer = () => {
      if (!buffer.any()) {
        return;
      }
      // Create a token from buffer content and push to cache
      this.__cache.push(this._createToken(buffer.join("")));
      buffer.clear();
    };

    while (!reader.eol()) {
      const next = reader.next();

      // Treat comma as whitespace, basically to help create a bit more visual
      // separation in the code
      if (Char.isWhitespace(next) || next === ",") {
        checkBuffer();
      } else if (Char.isComment(next)) {
        // If we encounter a comment symbol (;), we're done processing the current line
        break;
      } else if (Char.isParenthesis(next)) {
        checkBuffer();
        this.__cache.push({
          line: this.__line,
          type:
            next === "("
              ? TokenType.LeftParenthesis
              : TokenType.RightParenthesis,
        });
      } else if (next === '"') {
        checkBuffer();
        buffer.push(next);
        // Keep consuming characters until the next character is a string delimiter (")
        while (reader.peek() !== '"') {
          if (reader.eol()) {
            throw `Unexpected end-of-line reading string on line ${this.__line}`;
          }
          buffer.push(reader.next());
        }
        // Consume trailing "
        buffer.push(reader.next());
      } else {
        // For any other character, just put it on the buffer
        buffer.push(next);
      }
    }

    // Finally, before we're done with the row, ensure that the buffer is empty
    checkBuffer();
  };
}

export enum TokenType {
  Identifier = "Identifier",
  String = "String",
  Number = "Number",
  Boolean = "Boolean",
  LeftParenthesis = "LeftParenthesis",
  RightParenthesis = "RightParenthesis",
  Symbol = "Symbol",
}

type ValueTokenType<T extends string | number | boolean> = T extends string
  ? TokenType.String
  : T extends number
  ? TokenType.Number
  : T extends boolean
  ? TokenType.Boolean
  : never;
type BlockToken<
  T extends TokenType.LeftParenthesis | TokenType.RightParenthesis
> = TokenBase & { type: T };

interface TokenBase {
  line: number;
  type: TokenType;
}

interface ValueToken<T extends string | number | boolean> extends TokenBase {
  type: ValueTokenType<T>;
  value: T;
}

export type IdentifierToken = TokenBase & {
  type: TokenType.Identifier;
  name: string;
};
export type SymbolToken = TokenBase & {
  type: TokenType.Symbol;
  name: string;
};
export type LParenToken = BlockToken<TokenType.LeftParenthesis>;
export type RParenToken = BlockToken<TokenType.RightParenthesis>;
export type StringToken = ValueToken<string>;
export type NumberToken = ValueToken<number>;
export type BooleanToken = ValueToken<boolean>;
export type AnyValueToken = StringToken | NumberToken | BooleanToken;

export type Token =
  | IdentifierToken
  | SymbolToken
  | LParenToken
  | RParenToken
  | StringToken
  | NumberToken
  | BooleanToken;
