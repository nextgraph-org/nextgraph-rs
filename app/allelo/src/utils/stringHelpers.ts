export function camelCaseToWords(str: string) {
  return str.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

export function wordsToCamelCase(str: string) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}

export function kebabCaseToWords(str: string) {
  return str.replace(/-/g, " ").trim();
}

export function wordsToKebabCase(str: string) {
  return str.replace(/\s+/g, "-").trim();
}
