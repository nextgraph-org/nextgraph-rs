const crypto = require('crypto');
const fs = require('fs');
const {gzip, } = require('node-gzip');

var algorithm = 'sha256'
  , shasum = crypto.createHash(algorithm)

const sha_file = './dist-web/index.sha256';
const gzip_file = './dist-web/index.gzip';
var filename = './dist-web/index.html'
  , s = fs.ReadStream(filename)

var bufs = [];
s.on('data', function(data) {
    shasum.update(data)
    bufs.push(data);
})

s.on('end', function() {
    var hash = shasum.digest('hex')
    console.log(hash + '  ' + filename)

    fs.writeFileSync(sha_file, hash, 'utf8');

    var buf = Buffer.concat(bufs);
    gzip(buf).then((compressed) => {fs.writeFileSync(gzip_file, compressed);});

    fs.rm(filename,()=>{});

})


