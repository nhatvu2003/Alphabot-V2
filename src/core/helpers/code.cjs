// Lightweight ANSI color helper (CommonJS)
// Provides small subset of chalk API used in this project

function wrapAnsi(text, r, g, b, bold = false) {
  const color = `\x1b[38;2;${r};${g};${b}m`;
  const boldCode = bold ? '\x1b[1m' : '';
  const reset = '\x1b[0m';
  return `${boldCode}${color}${text}${reset}`;
}

function hexToRgb(hex) {
  if (!hex) return [255,255,255];
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(h=>h+h).join('');
  const bigint = parseInt(hex,16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r,g,b];
}

function makeColorFunction(rgb) {
  const fn = (text) => wrapAnsi(text, rgb[0], rgb[1], rgb[2], false);
  fn.bold = (text) => wrapAnsi(text, rgb[0], rgb[1], rgb[2], true);
  return fn;
}

const colors = {
  cyan: makeColorFunction([0, 255, 255]),
  green: makeColorFunction([46, 204, 113]),
  yellow: makeColorFunction([245, 158, 66]),
  red: makeColorFunction([148, 43, 43]),
  blue: makeColorFunction([52, 152, 219]),
  gray: makeColorFunction([128, 128, 128]),
  magenta: makeColorFunction([155, 89, 182]),
  white: makeColorFunction([255,255,255])
};

// Provide chalk.bold.hex(...).bold('text') chain used in code
const bold = {
  hex: (hex) => {
    const rgb = hexToRgb(hex);
    return {
      bold: (text) => wrapAnsi(text, rgb[0], rgb[1], rgb[2], true)
    };
  }
};

// Provide chalk.hex(color).bold(text) convenience
function hex(hex) {
  const rgb = hexToRgb(hex);
  const fn = (text) => wrapAnsi(text, rgb[0], rgb[1], rgb[2], false);
  fn.bold = (text) => wrapAnsi(text, rgb[0], rgb[1], rgb[2], true);
  return fn;
}

const code = {
  ...colors,
  hex,
  bold
};

module.exports = code;
