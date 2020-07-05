interface Array<T> {
  any(): boolean;
  clear(): void;
}

Array.prototype.any = function () {
  return this.length > 0;
};

Array.prototype.clear = function () {
  this.length = 0;
};
