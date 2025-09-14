import type { TestData } from "./testData.js";

/**
 * Circular
 */
export const extendsSimple: TestData = {
  name: "extends simple",
  shexc: `
  PREFIX ex: <https://example.com/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>

  ex:EntityShape {
    a [ ex:Entity ] ;
    ex:entityId .
  }

  ex:PersonShape EXTENDS @ex:EntityShape {
    a [ ex:Person ] ;
    foaf:name .
  }

  ex:EmployeeShape EXTENDS @ex:PersonShape {
    a [ ex:Employee ] ;
    ex:employeeNumber .
  }
  `,
  sampleTurtle: `
    @prefix example: <http://example.com/> .

    example:SampleParent
      a example:Parent ;
      example:hasChild example:SampleChild .

    example:SampleChild
      a example:Child ;
      example:hasParent example:SampleParent .
  `,
  baseNode: "http://example.com/SampleParent",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    Entity: {
      "@id": "https://example.com/Entity",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        entityId: "https://example.com/entityId",
      },
    },
    entityId: "https://example.com/entityId",
    Person: {
      "@id": "https://example.com/Person",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        entityId: "https://example.com/entityId",
        name: "http://xmlns.com/foaf/0.1/name",
      },
    },
    name: "http://xmlns.com/foaf/0.1/name",
    Employee: {
      "@id": "https://example.com/Employee",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        entityId: "https://example.com/entityId",
        name: "http://xmlns.com/foaf/0.1/name",
        employeeNumber: "https://example.com/employeeNumber",
      },
    },
    employeeNumber: "https://example.com/employeeNumber",
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface Entity {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Entity";\n    }>;\n    entityId: any;\n}\n\nexport interface Person {\n    "@id"?: LdSet<string | string>;\n    "@context"?: LdSet<LdoJsonldContext | LdoJsonldContext>;\n    type: LdSet<{\n        "@id": "Entity";\n    } | {\n        "@id": "Person";\n    }>;\n    entityId: any;\n    name: any;\n}\n\nexport interface Employee {\n    "@id"?: LdSet<string | string | string>;\n    "@context"?: LdSet<LdoJsonldContext | LdoJsonldContext | LdoJsonldContext>;\n    type: LdSet<{\n        "@id": "Entity";\n    } | {\n        "@id": "Person";\n    } | {\n        "@id": "Employee";\n    }>;\n    entityId: any;\n    name: any;\n    employeeNumber: any;\n}\n\n',
  successfulCompactTypings: `export type IRI = string;\n\nexport interface Entity {\n    id: IRI;\n    /**\n     * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type\n     */\n    type: "https://example.com/Entity";\n    /**\n     * Original IRI: https://example.com/entityId\n     */\n    entityId: any;\n}\n\nexport interface Person {\n    /**\n     * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type | Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type\n     */\n    type: "https://example.com/Entity" | "https://example.com/Person";\n    /**\n     * Original IRI: https://example.com/entityId\n     */\n    entityId: any;\n    id: IRI;\n    /**\n     * Original IRI: http://xmlns.com/foaf/0.1/name\n     */\n    name: any;\n}\n\nexport interface Employee {\n    /**\n     * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type | Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type | Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type\n     */\n    type: "https://example.com/Entity" | "https://example.com/Person" | "https://example.com/Employee";\n    /**\n     * Original IRI: https://example.com/entityId\n     */\n    entityId: any;\n    /**\n     * Original IRI: http://xmlns.com/foaf/0.1/name\n     */\n    name: any;\n    id: IRI;\n    /**\n     * Original IRI: https://example.com/employeeNumber\n     */\n    employeeNumber: any;\n}\n\n`,
};
