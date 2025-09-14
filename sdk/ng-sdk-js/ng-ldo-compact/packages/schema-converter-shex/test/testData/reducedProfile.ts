import type { TestData } from "./testData.js";

/**
 * Reduced Profile
 */
export const reducedProfile: TestData = {
  name: "reduced profile",
  shexc: `
PREFIX srs: <https://shaperepo.com/schemas/solidProfile#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schem: <http://schema.org/>
PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX acl: <http://www.w3.org/ns/auth/acl#>
PREFIX cert:  <http://www.w3.org/ns/auth/cert#>
PREFIX ldp: <http://www.w3.org/ns/ldp#>
PREFIX sp: <http://www.w3.org/ns/pim/space#>
PREFIX solid: <http://www.w3.org/ns/solid/terms#>

srs:SolidProfileShape EXTRA a {
  a [ schem:Person ]
    // rdfs:comment  "Defines the node as a Person" ;
  a [ foaf:Person ]
    // rdfs:comment  "Defines the node as a Person" ;
  vcard:hasEmail @srs:EmailShape *
    // rdfs:comment  "The person's email." ;
  foaf:name xsd:string ?
    // rdfs:comment  "An alternate way to define a person's name" ;
}

srs:EmailShape EXTRA a {
  a [
    vcard:Dom
    vcard:Home
    vcard:ISDN
    vcard:Internet
    vcard:Intl
    vcard:Label
    vcard:Parcel
    vcard:Postal
    vcard:Pref
    vcard:Work
    vcard:X400
  ] ?
    // rdfs:comment  "The type of email." ;
  vcard:value IRI
    // rdfs:comment  "The value of an email as a mailto link (Example <mailto:jane@example.com>)" ;
}
  `,
  sampleTurtle: ``,
  baseNode: "",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    Person: {
      "@id": "http://schema.org/Person",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        hasEmail: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "http://xmlns.com/foaf/0.1/name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
      },
    },
    Person2: {
      "@id": "http://xmlns.com/foaf/0.1/Person",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        hasEmail: {
          "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "http://xmlns.com/foaf/0.1/name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
      },
    },
    hasEmail: {
      "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
      "@type": "@id",
      "@isCollection": true,
    },
    Dom: {
      "@id": "http://www.w3.org/2006/vcard/ns#Dom",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Home: {
      "@id": "http://www.w3.org/2006/vcard/ns#Home",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    ISDN: {
      "@id": "http://www.w3.org/2006/vcard/ns#ISDN",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Internet: {
      "@id": "http://www.w3.org/2006/vcard/ns#Internet",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Intl: {
      "@id": "http://www.w3.org/2006/vcard/ns#Intl",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Label: {
      "@id": "http://www.w3.org/2006/vcard/ns#Label",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Parcel: {
      "@id": "http://www.w3.org/2006/vcard/ns#Parcel",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Postal: {
      "@id": "http://www.w3.org/2006/vcard/ns#Postal",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Pref: {
      "@id": "http://www.w3.org/2006/vcard/ns#Pref",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    Work: {
      "@id": "http://www.w3.org/2006/vcard/ns#Work",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    X400: {
      "@id": "http://www.w3.org/2006/vcard/ns#X400",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        value: {
          "@id": "http://www.w3.org/2006/vcard/ns#value",
          "@type": "@id",
        },
      },
    },
    value: {
      "@id": "http://www.w3.org/2006/vcard/ns#value",
      "@type": "@id",
    },
    name: {
      "@id": "http://xmlns.com/foaf/0.1/name",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface SolidProfile {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Defines the node as a Person | Defines the node as a Person\n     */\n    type: LdSet<{\n        "@id": "Person";\n    } | {\n        "@id": "Person2";\n    }>;\n    /**\n     * The person\'s email.\n     */\n    hasEmail?: LdSet<Email>;\n    /**\n     * An alternate way to define a person\'s name\n     */\n    name?: string;\n}\n\nexport interface Email {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * The type of email.\n     */\n    type?: LdSet<{\n        "@id": "Dom";\n    } | {\n        "@id": "Home";\n    } | {\n        "@id": "ISDN";\n    } | {\n        "@id": "Internet";\n    } | {\n        "@id": "Intl";\n    } | {\n        "@id": "Label";\n    } | {\n        "@id": "Parcel";\n    } | {\n        "@id": "Postal";\n    } | {\n        "@id": "Pref";\n    } | {\n        "@id": "Work";\n    } | {\n        "@id": "X400";\n    }>;\n    /**\n     * The value of an email as a mailto link (Example <mailto:jane@example.com>)\n     */\n    value: {\n        "@id": string;\n    };\n}\n\n',
};
