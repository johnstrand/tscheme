import { FileReader } from "./FileReader";
import { Char } from "./utils";

class CharReader {
  private __index = 0;
  private __str: string;
  constructor(str: string) {
    this.__str = str;
  }

  // Return empty string rather than null to avoid a lot of null checks later
  public next = () => (this.eol() ? "" : this.__str[this.__index++]);
  public peek = () => (this.eol() ? "" : this.__str[this.__index]);
  public eol = () => this.__index == this.__str.length;
}

export class Tokenizer {
  private __reader: FileReader;
  private __line = 0;
  private __cache = Array<Token>();
  constructor(reader: FileReader) {
    this.__reader = reader;
  }

  public eof = () => this.__reader.eof() && !this.__cache.any();

  public peek = () => {
    while (!this.__cache.any()) {
      if (this.eof()) {
        return null;
      }
      this._cacheTokens();
    }

    return this.__cache[0];
  };

  public next = () => {
    const next = this.peek();
    this.__cache.shift();
    return next;
  };

  private _createToken = (value: string): Token => {
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
        value: value.length === 2 ? "" : value.substring(1, value.length - 1),
        ...baseToken,
      };
    } else if (value.startsWith("#")) {
      const flag = value[1];
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

    while (!(row = (this.__reader.readLine() ?? "").trim())) {
      this.__line++;
      if (this.eof()) {
        return;
      }
    }

    this.__line++;
    const reader = new CharReader(row);
    const buffer = Array<string>();

    const checkBuffer = () => {
      if (!buffer.any()) {
        return;
      }
      this.__cache.push(this._createToken(buffer.join("")));
      buffer.clear();
    };

    while (!reader.eol()) {
      const next = reader.next();
      if (Char.isWhitespace(next) || next === ",") {
        checkBuffer();
      } else if (Char.isComment(next)) {
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
        while (reader.peek() !== '"') {
          if (reader.eol()) {
            throw `Unexpected end-of-line reading string on line ${this.__line}`;
          }
          buffer.push(reader.next());
        }
        buffer.push(reader.next());
      } else {
        buffer.push(next);
      }
    }

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
