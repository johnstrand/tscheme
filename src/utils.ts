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
