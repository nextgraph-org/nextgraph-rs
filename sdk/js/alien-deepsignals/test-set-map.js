import { deepSignal, subscribeDeepMutations } from './dist/index.js';

const root = deepSignal({ 
  mySet: new Set([
    { "@id": "obj1", value: 10 },
    { "@id": "obj2", value: 20 }
  ])
});

subscribeDeepMutations(root, (patches) => {
  console.log('Patches:', JSON.stringify(patches, null, 2));
});

// Use .map() to get entries
const entries = root.mySet.values().map(entry => {
  console.log('Entry:', entry);
  return entry;
});

console.log('Got entries:', entries.length);
console.log('Modifying first entry...');

// Modify the first one
entries[0].value = 100;

setTimeout(() => {
  console.log('Done');
}, 100);
