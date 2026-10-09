declare module 'random-color' {
  interface RandomColor {
    hexString(): string;
    rgbString(): string;
    hslString(): string;
    rgb(): [number, number, number];
    hsl(): [number, number, number];
  }

  function randomColor(): RandomColor;
  export = randomColor;
}
