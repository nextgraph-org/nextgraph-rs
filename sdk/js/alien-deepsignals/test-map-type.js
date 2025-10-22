import { deepSignal } from './dist/index.js';

const root = deepSignal({ 
  mySet: new Set([
    { "@id": "obj1", value: 10 },
    { "@id": "obj2", value: 20 }
  ])
});

const result = root.mySet.values().map(entry => entry);
console.log('Type:', typeof result);
console.log('Constructor:', result.constructor.name);
console.log('Result:', result);
console.log('Has next?:', typeof result.next);
console.log('Is iterable?:', Symbol.iterator in result);

// Convert to array
const arr = Array.from(result);
console.log('Array:', arr);
console.log('First entry:', arr[0]);
