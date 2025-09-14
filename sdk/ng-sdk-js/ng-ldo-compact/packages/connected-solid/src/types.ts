export type SolidUriPrefix = `http${"s" | ""}://`;

/**
 * A SolidUri is a URI that is valid in the Solid ecosystem ("http" and "https")
 */
export type SolidUri = SolidContainerUri | SolidLeafUri;

/**
 * A SolidContainerSlug is any string that has a pahtname that ends in a "/". It
 * represents a container.
 */
// The & {} allows for alias preservation
// eslint-disable-next-line @typescript-eslint/ban-types
export type SolidContainerSlug = `${string}/${NonPathnameEnding}` & {};

/**
 * A SolidLeafUri is any URI that has a pahtname that ends in a "/". It represents a
 * container.
 */
// The & {} allows for alias preservation
// eslint-disable-next-line @typescript-eslint/ban-types
export type SolidContainerUri = `${SolidUriPrefix}${SolidContainerSlug}` & {};

/**
 * A SolidLeafSlug is any string that does not have a pahtname that ends in a
 * "/". It represents a data resource or a binary resource. Not a container.
 */
export type SolidLeafSlug =
  // The & {} allows for alias preservation
  // eslint-disable-next-line @typescript-eslint/ban-types
  `${string}${EveryLegalPathnameCharacterOtherThanSlash}${NonPathnameEnding}` & {};

/**
 * A LeafUri is any URI that does not have a pahtname that ends in a "/". It
 * represents a data resource or a binary resource. Not a container.
 */
export type SolidLeafUri =
  // The & {} allows for alias preservation
  // eslint-disable-next-line @typescript-eslint/ban-types
  `${SolidUriPrefix}${SolidLeafSlug}` & {};

/**
 * @internal
 */
type NonPathnameEnding = "" | `?${string}` | `#${string}`;

/**
 * @internal
 */
type EveryLegalPathnameCharacterOtherThanSlash =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "0"
  | "-"
  | "."
  | "_"
  | "~"
  | ":"
  | "["
  | "]"
  | "@"
  | "!"
  | "$"
  | "&"
  | "'"
  | "("
  | ")"
  | "*"
  | "+"
  | ","
  | ";"
  | "=";
