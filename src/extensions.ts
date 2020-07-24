interface Array<T> {
  /**
   * Returns true if array contains at least one element
   */
  any(): boolean;
  /**
   * Empties the array (by setting length to 0)
   */
  clear(): void;
}

Array.prototype.any = function () {
  return this.length > 0;
};

Array.prototype.clear = function () {
  this.length = 0;
};
