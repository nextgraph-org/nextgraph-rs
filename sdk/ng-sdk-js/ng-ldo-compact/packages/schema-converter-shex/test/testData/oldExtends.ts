import type { TestData } from "./testData.js";

/**
 * Old Extends
 */
export const oldExtends: TestData = {
  name: "old extends",
  shexc: `
  PREFIX ex: <https://example.com/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>

  ex:EntityShape EXTRA a {
    $ex:EntityRef (
      a [ ex:Entity ] ;
      ex:entityId .
    )
  }

  ex:PersonShape EXTRA a {
    $ex:PersonRef (
      &ex:EntityRef ;
      a [ ex:Person ] ;
      foaf:name .
    )
  }

  ex:EmployeeShape EXTRA a {
    &ex:PersonRef ;
    a [ ex:Employee ] ;
    ex:employeeNumber .
  }
  `,
  sampleTurtle: `
    @prefix ex: <http://example.com/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .

    ex:SampleEmployee
      ex:entityId "123"^^xsd:integer ;
      foaf:name "Jacko" ;
      ex:employeeNumber "456"^^xsd:integer ;
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
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface Entity {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Entity";\n    }>;\n    entityId: any;\n}\n\nexport interface Person {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Entity";\n    } | {\n        "@id": "Person";\n    }>;\n    entityId: any;\n    name: any;\n}\n\nexport interface Employee {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Entity";\n    } | {\n        "@id": "Person";\n    } | {\n        "@id": "Employee";\n    }>;\n    entityId: any;\n    name: any;\n    employeeNumber: any;\n}\n\n',
};
