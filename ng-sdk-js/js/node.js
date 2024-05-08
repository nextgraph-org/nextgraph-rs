// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.


const macNameMap = new Map([
	[23, ['Sonoma', '14']],
	[22, ['Ventura', '13']],
	[21, ['Monterey', '12']],
	[20, ['Big Sur', '11']],
	[19, ['Catalina', '10.15']],
	[18, ['Mojave', '10.14']],
	[17, ['High Sierra', '10.13']],
	[16, ['Sierra', '10.12']],
	[15, ['El Capitan', '10.11']],
	[14, ['Yosemite', '10.10']],
	[13, ['Mavericks', '10.9']],
	[12, ['Mountain Lion', '10.8']],
	[11, ['Lion', '10.7']],
	[10, ['Snow Leopard', '10.6']],
	[9, ['Leopard', '10.5']],
	[8, ['Tiger', '10.4']],
	[7, ['Panther', '10.3']],
	[6, ['Jaguar', '10.2']],
	[5, ['Puma', '10.1']],
]);

function macosRelease(release) {
  let split = (release).split('.');
	rel = Number(split[0]);
	let [name, version] = macNameMap.get(rel) || ['Unknown', release];
  if (name!='Unknown') {
    if (split.length>1) version += '.'+split[1];
    //if (split.length>2 && split[2]) version += '.'+split[2];
  }
	return {
    name: "macOS",
		versionName: name,
		version,
    release
	};
}

const winNames = new Map([
	['10.0.2', '11'], // It's unclear whether future Windows 11 versions will use this version scheme: https://github.com/sindresorhus/windows-release/pull/26/files#r744945281
  ['10.0.22', 'Server 2022'],
	['10.0', '10 or Server 2016/2019'],
	['6.3', '8.1 or Server 2012 R2'],
	['6.2', '8 or Server 2012'],
	['6.1', '7 or Server 2008 R2'],
	['6.0', 'Vista or Server 2008'],
	['5.2', 'Server 2003'],
	['5.1', 'XP'],
	['5.0', '2000'],
	['4.90', 'ME'],
	['4.10', '98'],
	['4.03', '95'],
	['4.00', '95'],
  ['3.00', 'NT'],
]);

function windowsRelease(release) {
	const version = /(\d+\.\d+)(?:\.(\d+))?/.exec(release);

	let ver = version[1] || '';
	const build = version[2] || '';

  if (ver.startsWith('3.')) {
    ver = '3.00';
  }
  if (ver === '10.0' && build.startsWith('20348')) {
    // Windows Server 2022
    ver = '10.0.22';
  } else if (ver === '10.0' && build.startsWith('2')) {
    // Windows 11
		ver = '10.0.2';
	}

	return {
    name: "Windows",
    versionName: winNames.get(ver),
    version: build,
    release
  };
}

function osName(platform, release) {
  if (platform === 'darwin') {
    return release? macosRelease(release) : {name: "macOS"};
  }

  if (platform === 'linux') {
    id = release ? release.replace(/^(\d+\.\d+).*/, '$1') : '';
    return {name:'Linux', version: id || release, release};
  }

  if (platform === 'win32') {
    return release ? windowsRelease(release) : {name: "Windows"};
  }
  if (platform === 'aix') { platform = 'AIX'; }
  else if (platform === 'freebsd') { platform = 'FreeBSD'; }
  else if (platform === 'openbsd') { platform = 'OpenBSD'; }
  else if (platform === 'android') { platform = 'Android'; }
  else if (platform === 'sunos') { platform = 'SunOS'; }
  return {name:platform, version:release};
}
module.exports.version = function () {
  return require('../../../package.json').version;
}

module.exports.client_details = function () {
  const process = require('process');
  let arch = osnode.machine? osnode.machine() : process.arch;
  if (arch=="ia32") {arch="x86"}
  else if (arch=="x64") {arch="x86_64"}
  else if (arch=="i386") {arch="x86"}
  else if (arch=="i686") {arch="x86"}
  else if (arch=="amd64") {arch="x86_64"}
  else if (arch=="arm64") {arch="aarch64"}
  const osnode = require('os');
  let os = osName(osnode.platform(),osnode.release());
  if (osnode.version) os.uname = osnode.version();
  os.type = osnode.type();

  return JSON.stringify({
    platform: { type: "server", arch },
    os,
    engine: {
      name: "nodejs",
      version: process.version,
      arch : process.arch,
      machine: osnode.machine? osnode.machine() : undefined,
      versions: process.versions
    }
  });
};


module.exports.is_browser = function() {
    return false;
}


module.exports.session_save = function(key,value) {
    
}

module.exports.storage_clear = function() {
    
}

module.exports.session_get = function(key) {
    
}

module.exports.session_remove = function(key) {
    
}

module.exports.local_save = function(key,value) {
    
}

module.exports.local_get = function(key) {
    
}
