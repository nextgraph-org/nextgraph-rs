import type { Schema } from "@ldo/traverser-shexj";
import * as dom from "dts-dom";
import type { Schema as ShapeSchema } from "../types.ts";
export interface TypingReturn {
    typingsString: string;
    typings: {
        typingString: string;
        dts: dom.TopLevelDeclaration;
    }[];
}
export declare function shexJConverter(shexj: Schema): Promise<[TypingReturn, ShapeSchema]>;
//# sourceMappingURL=converter.d.ts.map