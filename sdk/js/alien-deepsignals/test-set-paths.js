import { deepSignal, subscribeDeepMutations } from './dist/index.js';

const root = deepSignal({ 
  mySet: new Set([
    { "@id": "obj1", value: 10 }
  ])
});

subscribeDeepMutations(root, (patches) => {
  console.log('Patches:', JSON.stringify(patches, null, 2));
});

// Get the first entry from the set
const entries = root.mySet.values();
const firstEntry = entries.next().value;

console.log('First entry:', firstEntry);
console.log('Modifying value...');

// Modify it
firstEntry.value = 20;

setTimeout(() => {
  console.log('Done');
}, 100);
