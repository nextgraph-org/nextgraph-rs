const fs = require('fs');

const PATH = './pkg/package.json';
const PATH_README = './pkg/README.md';

const pkg_json = fs.readFileSync(PATH);
let pkg = JSON.parse(pkg_json)
pkg.name = "@nextgraph-monorepo/wasm-tools-auth";
pkg.files.push("wasm_tools_bg.wasm.d.ts");
fs.writeFileSync(PATH, JSON.stringify(pkg, null, 2), 'utf8');
