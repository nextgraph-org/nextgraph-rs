import type { ObjectLiteral, valueSetValue } from "shexj";

export function hashValueSetValue(vsv: valueSetValue) {
  if (typeof vsv === "string") return `string|${vsv}`;

  const vsvol = vsv as ObjectLiteral;
  if (vsvol.value) return `objectLiteral|${vsvol.value}|${vsvol.language}`;

  const vsvnol = vsv as Exclude<valueSetValue, ObjectLiteral | string>;

  switch (vsvnol.type) {
    case "IriStem":
      return `IriStem|${vsvnol.stem}`;
    case "IriStemRange":
      return `IriStemRange|${vsvnol.stem}|${vsvnol.exclusions}`;
    case "LiteralStem":
      return `LiteralStem|${vsvnol.stem}`;
    case "LiteralStemRange":
      return `LiteralStemRange|${vsvnol.stem}|${vsvnol.exclusions}`;
    case "Language":
      return `Language|${vsvnol.languageTag}`;
    case "LanguageStem":
      return `LanguageStem|${vsvnol.stem}`;
    case "LanguageStemRange":
      return `LanguageStemRange|${vsvnol.stem}|${vsvnol.exclusions}`;
  }
}
