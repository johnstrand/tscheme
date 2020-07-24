import { readFileSync } from "fs";

export class FileReader {
  private __content: string[];
  private __index = 0;
  constructor(file: string) {
    // Read the entire file, and split it into individual lines
    this.__content = readFileSync(file, "utf8").split(/\r\n|\n|\r/);
  }

  // Have we reached end of the file? Return null, else return current line and
  // increment the pointer
  readLine = () => (this.eof() ? null : this.__content[this.__index++]);

  eof = () => this.__index === this.__content.length;
}
