const fs = require('fs');

const PATH = './pkg/package.json';
const PATH_README = './pkg/README.md';

const pkg_json = fs.readFileSync(PATH);
let pkg = JSON.parse(pkg_json)
pkg.name = "@ng-org/lib-wasm";
pkg.files.push("lib_wasm_bg.wasm.d.ts");
pkg.files.push("snippets/**/*.js");
fs.writeFileSync(PATH, JSON.stringify(pkg, null, 2), 'utf8');

fs.readFile(PATH_README, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(/ lib-wasm/g, ' @ng-org/lib-wasm');
  
    fs.writeFile(PATH_README, result, 'utf8', function (err) {
       if (err) return console.log(err);
    });
  });