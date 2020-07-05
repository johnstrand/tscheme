import { readFileSync } from "fs";
import { log } from "./utils";

export class FileReader {
  private __content: string[];
  private __index = 0;
  constructor(file: string) {
    // Read the entire file, and split it into individual lines
    this.__content = readFileSync(file, "utf8").split(/\r\n|\n|\r/);
  }

  readLine = () =>
    log(this.eof() ? null : this.__content[this.__index++], "readline");

  eof = () => this.__index === this.__content.length;
}
