# @ldo/ldo

`@ldo/ldo` is the primary interface for accessing Linked Data Objects given raw RDF.

## Guide

A full walkthrough for using the `@ldo/ldo` library can be found in the [For RDF Usage Guide](https://ldo.js.org/latest/raw_rdf/).

## Installation

### Automatic Installation

Navigate into your project's root folder and run the following command:
```
cd my_project/
npx run @ldo/cli init
```

<details>
<summary>
Manual Installation
</summary>

If you already have generated ShapeTypes, you may install the `@ldo/ldo` library independently.

```
npm i @ldo/ldo
```
</details>

## Simple Example

Below is a simple example of LDO in a real use-case (changing the name on a Solid Pod). Assume that a ShapeType was previously generated and placed at `./.ldo/foafProfile.shapeTypes`.

```typescript
import {
  parseRdf,
  startTransaction,
  toSparqlUpdate,
  toTurtle,
  set,
} from "@ldo/ldo";
import { FoafProfileShapeType } from "./.ldo/foafProfile.shapeTypes.js";

async function run() {
  const rawTurtle = `
  <#me> a <http://xmlns.com/foaf/0.1/Person>;
      <http://xmlns.com/foaf/0.1/name> "Jane Doe".
  `;

  /**
   * Step 1: Convert Raw RDF into a Linked Data Object
   */
  const ldoDataset = await parseRdf(rawTurtle, {
    baseIRI: "https://solidweb.me/jane_doe/profile/card",
  });
  // Create a linked data object by telling the dataset the type and subject of
  // the object
  const janeProfile = ldoDataset
    // Tells the LDO dataset that we're looking for a FoafProfile
    .usingType(FoafProfileShapeType)
    // Says the subject of the FoafProfile
    .fromSubject("https://solidweb.me/jane_doe/profile/card#me");

  /**
   * Step 2: Manipulate the Linked Data Object
   */
  // Logs "Jane Doe"
  console.log(janeProfile.name);
  // Logs "Person"
  console.log(janeProfile.type);
  // Logs 0
  console.log(janeProfile.knows?.size);

  // Begins a transaction that tracks your changes
  startTransaction(janeProfile);
  janeProfile.name = "Jane Smith";
  janeProfile.knows?.add({
    "@id": "https://solidweb.me/john_smith/profile/card#me",
    type: {
      "@id": "Person",
    },
    name: "John Smith",
    knows: set(janeProfile),
  });

  // Logs "Jane Smith"
  console.log(janeProfile.name);
  // Logs "John Smith"
  console.log(janeProfile.knows?.toArray()[0].name);
  // Logs "Jane Smith"
  console.log(janeProfile.knows?.toArray()[0].knows?.toArray()[0].name);

  /**
   * Step 3: Convert it back to RDF
   */
  // Logs:
  // <https://solidweb.me/jane_doe/profile/card#me> a <http://xmlns.com/foaf/0.1/Person>;
  //   <http://xmlns.com/foaf/0.1/name> "Jane Smith";
  //   <http://xmlns.com/foaf/0.1/knows> <https://solidweb.me/john_smith/profile/card#me>.
  // <https://solidweb.me/john_smith/profile/card#me> a <http://xmlns.com/foaf/0.1/Person>;
  //   <http://xmlns.com/foaf/0.1/name> "John Smith";
  //   <http://xmlns.com/foaf/0.1/knows> <https://solidweb.me/jane_doe/profile/card#me>.
  console.log(await toTurtle(janeProfile));
  // Logs:
  // DELETE DATA {
  //   <https://solidweb.me/jane_doe/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Jane Doe" .
  // };
  // INSERT DATA {
  //   <https://solidweb.me/jane_doe/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Jane Smith" .
  //   <https://solidweb.me/jane_doe/profile/card#me> <http://xmlns.com/foaf/0.1/knows> <https://solidweb.me/john_smith/profile/card#me> .
  //   <https://solidweb.me/john_smith/profile/card#me> <http://xmlns.com/foaf/0.1/name> "John Smith" .
  //   <https://solidweb.me/john_smith/profile/card#me> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> .
  //   <https://solidweb.me/john_smith/profile/card#me> <http://xmlns.com/foaf/0.1/knows> <https://solidweb.me/jane_doe/profile/card#me> .
  // }
  console.log(await toSparqlUpdate(janeProfile));
}
run();
```

## API Details

Types

 - [`LdoBase`](https://ldo.js.org/latest/api/ldo/LdoBase/)
 - [`ShapeType`](https://ldo.js.org/latest/api/ldo/ShapeType/)

Getting an LdoDataset

 - [`parseRdf`](https://ldo.js.org/latest/api/ldo/parseRdf/)
 - [`createLdoDatasetFactory`](https://ldo.js.org/latest/api/ldo/createLdoDatasetFactory/)
 - [`LdoDatasetFactory`](https://ldo.js.org/latest/api/ldo/LdoDatasetFactory/)
 - [`createLdoDataset`](https://ldo.js.org/latest/api/ldo/createLdoDataset/)
 - [`LdoDataset`](https://ldo.js.org/latest/api/ldo/LdoDataset/)

Getting a Linked Data Object

 - [`LdoBuilder`](https://ldo.js.org/latest/api/ldo/LdoBuilder/)

Converting a Linked Data Object to Raw RDF

 - [`toTurtle`](https://ldo.js.org/latest/api/ldo/toTurtle/)
 - [`toNTriples`](https://ldo.js.org/latest/api/ldo/toNTriples/)
 - [`serialize`](https://ldo.js.org/latest/api/ldo/serialize/)

Transactions

 - [transactions](https://ldo.js.org/latest/api/ldo/transactions/)
 - [`toSparqlUpdate`](https://ldo.js.org/latest/api/ldo/toSparqlUpdate/)

Language Tag Support

 - [`languageOf`](https://ldo.js.org/latest/api/ldo/languageOf/)
 - [`setLanguagePreferences`](https://ldo.js.org/latest/api/ldo/setLanguagePreferences/)

Graph Support

 - [`graphOf`](https://ldo.js.org/latest/api/ldo/graphOf/)
 - [`write`](https://ldo.js.org/latest/api/ldo/write/)

Other Helper Functions

 - [`getDataset`](https://ldo.js.org/latest/api/ldo/getDataset/)

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT
