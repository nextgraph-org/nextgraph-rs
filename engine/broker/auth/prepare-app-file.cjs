const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {gzip, } = require('node-gzip');

var algorithm = 'sha256'
  , shasum = crypto.createHash(algorithm)

const sha_file = './dist/index.sha256';
var filename = './dist/index.html'
  , s = fs.ReadStream(filename)

function gzipFilesRecursively(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) throw err;

        files.forEach(file => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) throw err;

                if (stats.isDirectory()) {
                    // If it's a directory, call the function recursively
                    gzipFilesRecursively(filePath);
                } else {
                    console.log(filePath);
                    if (filePath.endsWith(".svg")) {
                      fs.unlinkSync(filePath);
                    } else {
                      const filecontent = fs.readFileSync(filePath);
                      gzip(filecontent).then((compressed) => {fs.writeFileSync(filePath+".gzip", compressed);});
                    }
                }
            });
        });
    });
}

gzipFilesRecursively('./dist')

s.on('data', function(data) {
    shasum.update(data)
})

s.on('end', function() {
    var hash = shasum.digest('hex')
    console.log(hash + '  ' + filename)

    fs.writeFileSync(sha_file, hash, 'utf8');

})



