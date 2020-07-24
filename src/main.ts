import "./extensions";
import { FileReader } from "./FileReader";
import { Tokenizer } from "./Tokenizer";
import { Parser } from "./Parser";
import { Runtime } from "./Runtime";

const reader = new FileReader("./examples/block.tss");
const tokenizer = new Tokenizer(reader);

while (!tokenizer.eof()) {
  const ast = Parser.read(tokenizer);
  const value = Runtime.execute(ast);
  if (value !== undefined && value !== null) {
    console.log(value);
  }
}
