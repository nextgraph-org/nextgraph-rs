A library of RDFJS Datasets that have many uses including subscribing to node changes and making transactions on a dataset.

This library follows the [RDFJS spec for a Dataset](https://rdf.js.org/dataset-spec/).

## Installation
```bash
npm i @ldo/subscribable-dataset
```

## Simple Example

```typescript
import { createSubscribableDataset, DatasetChanges } from "@ldo/subscribable-dataset";
import { Dataset } from "@rdfjs/types";
import { quad, namedNode }from '@ldo/rdf-utils';

const subscribableDataset = createSubscribableDataset([
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Firebender")
  ),
]);
subscribableDataset.on(
  namedNode("http://example.org/cartoons#Zuko"),
  (currentQuads: Dataset, changes: DatasetChanges) => {
    console.log(currentQuads.toString());
    console.log("--------");
    console.log(changes.added?.toString());
  }
);
/*
Prints:
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" .
--------
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" .
*/
subscribableDataset.add(
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#name"),
    literal("Zuko")
  )
);
```

## Loading from Serialized Data

```typescript
import { serializedToDataset, serializedToSubscribableDataset } from "@ldo/subscribable-dataset";

async function run(): Promise<void> {
  // Create an ExtendedDataset using Turtle
  const turtleData = `
    @prefix : <#>.
    @prefix elem: <http://purl.org/dc/elements/1.1/>.
    @prefix card: </profile/card#>.
    
    :this
        elem:author card:me.
  `;
  const turtleDataset = await serializedToDataset(turtleData, {
    baseIRI:
      "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#",
    // NOTE: the "format" field isn't required because Turtle is the default parser
  });

  // Create a SubcribableDataset using JSON-LD
  const jsonLdData = [
    {
      "@id":
        "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#this",
      "http://purl.org/dc/elements/1.1/author": [
        {
          "@id": "https://jackson.solidcommunity.net/profile/card#me",
        },
      ],
    },
    {
      "@id": "https://jackson.solidcommunity.net/profile/card#me",
    },
  ];
  const jsonLdDataset = await serializedToSubscribableDataset(
    JSON.stringify(jsonLdData),
    {
      baseIRI:
        "https://jackson.solidcommunity.net/IndividualChats/jackson.solidcommunity.net/index.ttl#",
      format: "application/ld+json",
    }
  );
  // Returns true because the input data describes the same triple.
  console.log(turtleDataset.equals(jsonLdDataset));
}
run();
```

## Advanced Example

```typescript
import { createSubscribableDataset, DatasetChanges } from "@ldo/subscribable-dataset";
import { quad, namedNode, literal } from '@ldo/rdf-utils';
import { Dataset } from "@rdfjs/types";

// Create an empty subscribable dataset
const subscribableDataset = createSubscribableDataset();
// Add some initial quads
subscribableDataset.addAll([
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Firebender"),
    namedNode("http://example.org/cartoons")
  ),
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#name"),
    literal("Zuko"),
    namedNode("http://example.org/cartoons")
  ),
]);
// Set up listeners
// Listener that will trigger whenever a quad containing the named
// node "http://example.org/cartoons#Zuko" is added or removed.
subscribableDataset.on(
  namedNode("http://example.org/cartoons#Zuko"),
  (zukoQuads: Dataset, changes: DatasetChanges) => {
    console.log("ZUKO NODE CHANGED ============");
    console.log(zukoQuads.toString());
    console.log("Added Quads:");
    console.log(changes.added?.toString());
    console.log("Removed Quads:");
    console.log(changes.removed?.toString());
    console.log("\n\n");
  }
);
// Listener that will trigger whenever a quad containing the named
// node "http://example.org/cartoons" is added or removed. This is
// useful for keeping track of the cartoons graph.
subscribableDataset.on(
  namedNode("http://example.org/cartoons"),
  (cartoonGraphQuads: Dataset, changes: DatasetChanges) => {
    console.log("CARTOON GRAPH CHANGED ============");
    console.log(cartoonGraphQuads.toString());
    console.log("Added Quads:");
    console.log(changes.added?.toString());
    console.log("Removed Quads:");
    console.log(changes.removed?.toString());
    console.log("\n\n");
  }
);

// Modify the dataset
/*
Prints:
CARTOON GRAPH CHANGED ============
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Waterbender> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#name> "Katara" <http://example.org/cartoons> .

Added Quads:
<http://example.org/cartoons#Katara> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Waterbender> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#name> "Katara" <http://example.org/cartoons> .

Removed Quads:
undefined
 */
subscribableDataset.addAll([
  quad(
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Waterbender"),
    namedNode("http://example.org/cartoons")
  ),
  quad(
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons#name"),
    literal("Katara"),
    namedNode("http://example.org/cartoons")
  ),
]);

/*
Prints:
ZUKO NODE CHANGED ============
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .

Added Quads:
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .

Removed Quads:
undefined


CARTOON GRAPH CHANGED ============
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Waterbender> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#name> "Katara" <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .

Added Quads:
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .

Removed Quads:
undefined
*/
subscribableDataset.addAll([
  quad(
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons#hasEnemy"),
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons")
  ),
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#hasEnemy"),
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons")
  ),
]);

// If there are many operation you want to do at once, use transactions.
// An update will not be triggered until the transaction is committed.
const transactionalDataset = subscribableDataset.startTransaction();
// Delete all triples with a "hasEnemy" predicate
transactionalDataset.deleteMatches(
  undefined,
  namedNode("http://example.org/cartoons#hasEnemy"),
  undefined,
  undefined
);
// Add "hasFrient" predicate
transactionalDataset.addAll([
  quad(
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons#hasFriend"),
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons")
  ),
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#hasFriend"),
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons")
  ),
]);
/*
Prints:
ZUKO NODE CHANGED ============
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .

Added Quads:
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .

Removed Quads:
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .


CARTOON GRAPH CHANGED ============
<http://example.org/cartoons#Zuko> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Firebender> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#name> "Zuko" <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/cartoons#Waterbender> <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#name> "Katara" <http://example.org/cartoons> .
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .

Added Quads:
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasFriend> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .

Removed Quads:
<http://example.org/cartoons#Katara> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Zuko> <http://example.org/cartoons> .
<http://example.org/cartoons#Zuko> <http://example.org/cartoons#hasEnemy> <http://example.org/cartoons#Katara> <http://example.org/cartoons> .
*/
transactionalDataset.commit();
```

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT
