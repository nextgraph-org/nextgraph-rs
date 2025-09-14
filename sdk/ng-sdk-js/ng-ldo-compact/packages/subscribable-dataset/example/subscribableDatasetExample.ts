import { createSubscribableDataset } from "../src/index.js";
import { quad, namedNode, literal } from "@ldo/rdf-utils";
import type { DatasetChanges } from "@ldo/rdf-utils";

// Create an empty subscribable dataset
const subscribableDataset = createSubscribableDataset();
// Add some initial quads
subscribableDataset.addAll([
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Firebender"),
    namedNode("http://example.org/cartoons"),
  ),
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#name"),
    literal("Zuko"),
    namedNode("http://example.org/cartoons"),
  ),
]);
// Set up listeners
// Listener that will trigger whenever a quad containing the named
// node "http://example.org/cartoons#Zuko" is added or removed.
subscribableDataset.on(
  [namedNode("http://example.org/cartoons#Zuko"), null, null, null],
  (changes: DatasetChanges) => {
    console.log("Added Quads:");
    console.log(changes.added?.toString());
    console.log("Removed Quads:");
    console.log(changes.removed?.toString());
    console.log("\n\n");
  },
);
// Listener that will trigger whenever a quad containing the named
// node "http://example.org/cartoons" is added or removed. This is
// useful for keeping track of the cartoons graph.
subscribableDataset.on(
  [namedNode("http://example.org/cartoons"), null, null, null],
  (changes: DatasetChanges) => {
    console.log("CARTOON GRAPH CHANGED ============");
    console.log("Added Quads:");
    console.log(changes.added?.toString());
    console.log("Removed Quads:");
    console.log(changes.removed?.toString());
    console.log("\n\n");
  },
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
    namedNode("http://example.org/cartoons"),
  ),
  quad(
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons#name"),
    literal("Katara"),
    namedNode("http://example.org/cartoons"),
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
    namedNode("http://example.org/cartoons"),
  ),
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#hasEnemy"),
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons"),
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
  undefined,
);
// Add "hasFrient" predicate
transactionalDataset.addAll([
  quad(
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons#hasFriend"),
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons"),
  ),
  quad(
    namedNode("http://example.org/cartoons#Zuko"),
    namedNode("http://example.org/cartoons#hasFriend"),
    namedNode("http://example.org/cartoons#Katara"),
    namedNode("http://example.org/cartoons"),
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
