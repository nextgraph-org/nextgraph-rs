const fs = require('fs');

const PATH = './pkg-node/package.json';
const PATH_README = './pkg-node/README.md';

const pkg_json = fs.readFileSync(PATH);
let pkg = JSON.parse(pkg_json)
pkg.name = "nextgraph";
pkg.description = "nodeJS SDK of NextGraph";
fs.writeFileSync(PATH, JSON.stringify(pkg, null, 2), 'utf8');

fs.readFile(PATH_README, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(/ng-sdk-js/g, 'nextgraph');
  
    fs.writeFile(PATH_README, result, 'utf8', function (err) {
       if (err) return console.log(err);
    });
  });