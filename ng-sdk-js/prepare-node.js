const fs = require('fs');

const PATH = './pkg-node/package.json';

const pkg_json = fs.readFileSync(PATH);
let pkg = JSON.parse(pkg_json)
pkg.name = "ng-sdk-node";
pkg.description = "nodejs app sdk of NextGraph";
fs.writeFileSync(PATH, JSON.stringify(pkg, null, 2), 'utf8');