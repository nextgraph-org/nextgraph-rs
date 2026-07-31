const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {gzip, } = require('node-gzip');

var algorithm = 'sha256'
  , shasum = crypto.createHash(algorithm)

const sha_file = './dist-web/index.sha256';
//const gzip_file = './dist-web/index.gzip';
var filename = './dist-web/index.html'
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
                    // If it's a file, process it (e.g., log the file path)
                    console.log(filePath);
                    const filecontent = fs.readFileSync(filePath);
                    gzip(filecontent).then((compressed) => {fs.writeFileSync(filePath+".gzip", compressed);});
                }
            });
        });
    });
}

gzipFilesRecursively('./dist-web')

//var bufs = [];
s.on('data', function(data) {
    shasum.update(data)
    //bufs.push(data);
})

s.on('end', function() {
    var hash = shasum.digest('hex')
    console.log(hash + '  ' + filename)

    fs.writeFileSync(sha_file, hash, 'utf8');

    //var buf = Buffer.concat(bufs);
    //gzip(buf).then((compressed) => {fs.writeFileSync(gzip_file, compressed);});

    //fs.rm(filename,()=>{});

})


