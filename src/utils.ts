export const isWhitespace = (str: string | null) => {
  return str === " " || str === "\t" || str === "\n" || str === "\r";
};

export const isParenthesis = (str: string | null) => {
  return str === "(" || str === ")";
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
