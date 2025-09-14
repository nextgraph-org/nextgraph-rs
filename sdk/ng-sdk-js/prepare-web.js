const fs = require('fs');

const PATH = './pkg/package.json';
const PATH_README = './pkg/README.md';

const pkg_json = fs.readFileSync(PATH);
let pkg = JSON.parse(pkg_json)
pkg.name = "@nextgraph-monorepo/ng-sdk-js";
pkg.files.push("ng_sdk_js_bg.wasm.d.ts");
pkg.files.push("snippets/**/*.js");
fs.writeFileSync(PATH, JSON.stringify(pkg, null, 2), 'utf8');
