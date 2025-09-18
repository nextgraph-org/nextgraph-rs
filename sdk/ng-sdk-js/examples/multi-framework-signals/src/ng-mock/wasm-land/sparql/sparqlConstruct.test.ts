import { buildConstructQuery } from "./buildSparqlConstructFromShape.ts";
import { testShapeSchema } from "./testShape.schema.ts";

console.log(
    buildConstructQuery({
        schema: testShapeSchema,
        shapeId: "http://example.org/TestObject",
    })
);
