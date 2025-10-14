// NOTE: this list must be up-to-date with browsers listed in
// test/acceptance/useragentstrings.yml
export const BROWSER_ALIASES_MAP = {
    'Amazon Silk': 'amazon_silk',
    'Android Browser': 'android',
    Bada: 'bada',
    BlackBerry: 'blackberry',
    Chrome: 'chrome',
    Chromium: 'chromium',
    Electron: 'electron',
    Epiphany: 'epiphany',
    Firefox: 'firefox',
    Focus: 'focus',
    Generic: 'generic',
    'Google Search': 'google_search',
    Googlebot: 'googlebot',
    'Internet Explorer': 'ie',
    'K-Meleon': 'k_meleon',
    Maxthon: 'maxthon',
    'Microsoft Edge': 'edge',
    'MZ Browser': 'mz',
    'NAVER Whale Browser': 'naver',
    Opera: 'opera',
    'Opera Coast': 'opera_coast',
    PhantomJS: 'phantomjs',
    Puffin: 'puffin',
    QupZilla: 'qupzilla',
    QQ: 'qq',
    QQLite: 'qqlite',
    Safari: 'safari',
    Sailfish: 'sailfish',
    'Samsung Internet for Android': 'samsung_internet',
    SeaMonkey: 'seamonkey',
    Sleipnir: 'sleipnir',
    Swing: 'swing',
    Tizen: 'tizen',
    'UC Browser': 'uc',
    Vivaldi: 'vivaldi',
    'WebOS Browser': 'webos',
    WeChat: 'wechat',
    'Yandex Browser': 'yandex',
    Roku: 'roku',
  };
  
  export const BROWSER_MAP = {
    amazon_silk: 'Amazon Silk',
    android: 'Android Browser',
    bada: 'Bada',
    blackberry: 'BlackBerry',
    chrome: 'Chrome',
    chromium: 'Chromium',
    electron: 'Electron',
    epiphany: 'Epiphany',
    firefox: 'Firefox',
    focus: 'Focus',
    generic: 'Generic',
    googlebot: 'Googlebot',
    google_search: 'Google Search',
    ie: 'Internet Explorer',
    k_meleon: 'K-Meleon',
    maxthon: 'Maxthon',
    edge: 'Microsoft Edge',
    mz: 'MZ Browser',
    naver: 'NAVER Whale Browser',
    opera: 'Opera',
    opera_coast: 'Opera Coast',
    phantomjs: 'PhantomJS',
    puffin: 'Puffin',
    qupzilla: 'QupZilla',
    qq: 'QQ Browser',
    qqlite: 'QQ Browser Lite',
    safari: 'Safari',
    sailfish: 'Sailfish',
    samsung_internet: 'Samsung Internet for Android',
    seamonkey: 'SeaMonkey',
    sleipnir: 'Sleipnir',
    swing: 'Swing',
    tizen: 'Tizen',
    uc: 'UC Browser',
    vivaldi: 'Vivaldi',
    webos: 'WebOS Browser',
    wechat: 'WeChat',
    yandex: 'Yandex Browser',
  };
  
  export const PLATFORMS_MAP = {
    tablet: 'tablet',
    mobile: 'mobile',
    desktop: 'desktop',
    tv: 'tv',
  };
  
  export const OS_MAP = {
    WindowsPhone: 'Windows Phone',
    Windows: 'Windows',
    MacOS: 'macOS',
    iOS: 'iOS',
    Android: 'Android',
    WebOS: 'WebOS',
    BlackBerry: 'BlackBerry',
    Bada: 'Bada',
    Tizen: 'Tizen',
    Linux: 'Linux',
    ChromeOS: 'Chrome OS',
    PlayStation4: 'PlayStation 4',
    Roku: 'Roku',
  };
  
  export const ENGINE_MAP = {
    EdgeHTML: 'EdgeHTML',
    Blink: 'Blink',
    Trident: 'Trident',
    Presto: 'Presto',
    Gecko: 'Gecko',
    WebKit: 'WebKit',
  };

  class Utils {
    /**
     * Get first matched item for a string
     * @param {RegExp} regexp
     * @param {String} ua
     * @return {Array|{index: number, input: string}|*|boolean|string}
     */
    static getFirstMatch(regexp, ua) {
      const match = ua.match(regexp);
      return (match && match.length > 0 && match[1]) || '';
    }
  
    /**
     * Get second matched item for a string
     * @param regexp
     * @param {String} ua
     * @return {Array|{index: number, input: string}|*|boolean|string}
     */
    static getSecondMatch(regexp, ua) {
      const match = ua.match(regexp);
      return (match && match.length > 1 && match[2]) || '';
    }
  
    /**
     * Match a regexp and return a constant or undefined
     * @param {RegExp} regexp
     * @param {String} ua
     * @param {*} _const Any const that will be returned if regexp matches the string
     * @return {*}
     */
    static matchAndReturnConst(regexp, ua, _const) {
      if (regexp.test(ua)) {
        return _const;
      }
      return void (0);
    }
  
    static getWindowsVersionName(version) {
      switch (version) {
        case 'NT': return 'NT';
        case 'XP': return 'XP';
        case 'NT 5.0': return '2000';
        case 'NT 5.1': return 'XP';
        case 'NT 5.2': return '2003';
        case 'NT 6.0': return 'Vista';
        case 'NT 6.1': return '7';
        case 'NT 6.2': return '8';
        case 'NT 6.3': return '8.1';
        case 'NT 10.0': return '10';
        default: return undefined;
      }
    }
  
    /**
     * Get macOS version name
     *    10.5 - Leopard
     *    10.6 - Snow Leopard
     *    10.7 - Lion
     *    10.8 - Mountain Lion
     *    10.9 - Mavericks
     *    10.10 - Yosemite
     *    10.11 - El Capitan
     *    10.12 - Sierra
     *    10.13 - High Sierra
     *    10.14 - Mojave
     *    10.15 - Catalina
     *
     * @example
     *   getMacOSVersionName("10.14") // 'Mojave'
     *
     * @param  {string} version
     * @return {string} versionName
     */
    static getMacOSVersionName(version) {
      const v = version.split('.').splice(0, 2).map(s => parseInt(s, 10) || 0);
      v.push(0);
      if (v[0] !== 10) {
        switch (v[0]) {
          case 11: return 'Big Sur';
          case 12: return 'Monterey';
          case 13: return 'Ventura';
          case 14: return 'Sonoma';
        }
      }
      else switch (v[1]) {
        case 5: return 'Leopard';
        case 6: return 'Snow Leopard';
        case 7: return 'Lion';
        case 8: return 'Mountain Lion';
        case 9: return 'Mavericks';
        case 10: return 'Yosemite';
        case 11: return 'El Capitan';
        case 12: return 'Sierra';
        case 13: return 'High Sierra';
        case 14: return 'Mojave';
        case 15: return 'Catalina';
        default: return undefined;
      }
    }
  
    /**
     * Get Android version name
     *    1.5 - Cupcake
     *    1.6 - Donut
     *    2.0 - Eclair
     *    2.1 - Eclair
     *    2.2 - Froyo
     *    2.x - Gingerbread
     *    3.x - Honeycomb
     *    4.0 - Ice Cream Sandwich
     *    4.1 - Jelly Bean
     *    4.4 - KitKat
     *    5.x - Lollipop
     *    6.x - Marshmallow
     *    7.x - Nougat
     *    8.x - Oreo
     *    9.x - Pie
     *
     * @example
     *   getAndroidVersionName("7.0") // 'Nougat'
     *
     * @param  {string} version
     * @return {string} versionName
     */
    static getAndroidVersionName(version) {
      const v = version.split('.').splice(0, 2).map(s => parseInt(s, 10) || 0);
      v.push(0);
      if (v[0] === 1 && v[1] < 5) return undefined;
      if (v[0] === 1 && v[1] < 6) return 'Cupcake';
      if (v[0] === 1 && v[1] >= 6) return 'Donut';
      if (v[0] === 2 && v[1] < 2) return 'Eclair';
      if (v[0] === 2 && v[1] === 2) return 'Froyo';
      if (v[0] === 2 && v[1] > 2) return 'Gingerbread';
      if (v[0] === 3) return 'Honeycomb';
      if (v[0] === 4 && v[1] < 1) return 'Ice Cream Sandwich';
      if (v[0] === 4 && v[1] < 4) return 'Jelly Bean';
      if (v[0] === 4 && v[1] >= 4) return 'KitKat';
      if (v[0] === 5) return 'Lollipop';
      if (v[0] === 6) return 'Marshmallow';
      if (v[0] === 7) return 'Nougat';
      if (v[0] === 8) return 'Oreo';
      if (v[0] === 9) return 'Pie';
      if (v[0] === 10) return 'Android 10';
      if (v[0] === 11) return 'Android 11';
      if (v[0] === 12) return 'Android 12';
      if (v[0] === 13) return 'Android 13';
      if (v[0] === 14) return 'Android 14';
      if (v[0] === 15) return 'Android 15';
      return undefined;
    }
  
    /**
     * Get version precisions count
     *
     * @example
     *   getVersionPrecision("1.10.3") // 3
     *
     * @param  {string} version
     * @return {number}
     */
    static getVersionPrecision(version) {
      return version.split('.').length;
    }
  
    /**
     * Calculate browser version weight
     *
     * @example
     *   compareVersions('1.10.2.1',  '1.8.2.1.90')    // 1
     *   compareVersions('1.010.2.1', '1.09.2.1.90');  // 1
     *   compareVersions('1.10.2.1',  '1.10.2.1');     // 0
     *   compareVersions('1.10.2.1',  '1.0800.2');     // -1
     *   compareVersions('1.10.2.1',  '1.10',  true);  // 0
     *
     * @param {String} versionA versions versions to compare
     * @param {String} versionB versions versions to compare
     * @param {boolean} [isLoose] enable loose comparison
     * @return {Number} comparison result: -1 when versionA is lower,
     * 1 when versionA is bigger, 0 when both equal
     */
    /* eslint consistent-return: 1 */
    static compareVersions(versionA, versionB, isLoose = false) {
      // 1) get common precision for both versions, for example for "10.0" and "9" it should be 2
      const versionAPrecision = Utils.getVersionPrecision(versionA);
      const versionBPrecision = Utils.getVersionPrecision(versionB);
  
      let precision = Math.max(versionAPrecision, versionBPrecision);
      let lastPrecision = 0;
  
      const chunks = Utils.map([versionA, versionB], (version) => {
        const delta = precision - Utils.getVersionPrecision(version);
  
        // 2) "9" -> "9.0" (for precision = 2)
        const _version = version + new Array(delta + 1).join('.0');
  
        // 3) "9.0" -> ["000000000"", "000000009"]
        return Utils.map(_version.split('.'), chunk => new Array(20 - chunk.length).join('0') + chunk).reverse();
      });
  
      // adjust precision for loose comparison
      if (isLoose) {
        lastPrecision = precision - Math.min(versionAPrecision, versionBPrecision);
      }
  
      // iterate in reverse order by reversed chunks array
      precision -= 1;
      while (precision >= lastPrecision) {
        // 4) compare: "000000009" > "000000010" = false (but "9" > "10" = true)
        if (chunks[0][precision] > chunks[1][precision]) {
          return 1;
        }
  
        if (chunks[0][precision] === chunks[1][precision]) {
          if (precision === lastPrecision) {
            // all version chunks are same
            return 0;
          }
  
          precision -= 1;
        } else if (chunks[0][precision] < chunks[1][precision]) {
          return -1;
        }
      }
  
      return undefined;
    }
  
    /**
     * Array::map polyfill
     *
     * @param  {Array} arr
     * @param  {Function} iterator
     * @return {Array}
     */
    static map(arr, iterator) {
      const result = [];
      let i;
      if (Array.prototype.map) {
        return Array.prototype.map.call(arr, iterator);
      }
      for (i = 0; i < arr.length; i += 1) {
        result.push(iterator(arr[i]));
      }
      return result;
    }
  
    /**
     * Array::find polyfill
     *
     * @param  {Array} arr
     * @param  {Function} predicate
     * @return {Array}
     */
    static find(arr, predicate) {
      let i;
      let l;
      if (Array.prototype.find) {
        return Array.prototype.find.call(arr, predicate);
      }
      for (i = 0, l = arr.length; i < l; i += 1) {
        const value = arr[i];
        if (predicate(value, i)) {
          return value;
        }
      }
      return undefined;
    }
  
    /**
     * Object::assign polyfill
     *
     * @param  {Object} obj
     * @param  {Object} ...objs
     * @return {Object}
     */
    static assign(obj, ...assigners) {
      const result = obj;
      let i;
      let l;
      if (Object.assign) {
        return Object.assign(obj, ...assigners);
      }
      for (i = 0, l = assigners.length; i < l; i += 1) {
        const assigner = assigners[i];
        if (typeof assigner === 'object' && assigner !== null) {
          const keys = Object.keys(assigner);
          keys.forEach((key) => {
            result[key] = assigner[key];
          });
        }
      }
      return obj;
    }
  
    /**
     * Get short version/alias for a browser name
     *
     * @example
     *   getBrowserAlias('Microsoft Edge') // edge
     *
     * @param  {string} browserName
     * @return {string}
     */
    static getBrowserAlias(browserName) {
      return BROWSER_ALIASES_MAP[browserName];
    }
  
    /**
     * Get short version/alias for a browser name
     *
     * @example
     *   getBrowserAlias('edge') // Microsoft Edge
     *
     * @param  {string} browserAlias
     * @return {string}
     */
    static getBrowserTypeByAlias(browserAlias) {
      return BROWSER_MAP[browserAlias] || '';
    }
  }

  const commonVersionIdentifier = /version\/(\d+(\.?_?\d+)+)/i;

const browserParsersList = [
  /* Googlebot */
  {
    test: [/googlebot/i],
    describe(ua) {
      const browser = {
        name: 'Googlebot',
      };
      const version = Utils.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },

  /* Opera < 13.0 */
  {
    test: [/opera/i],
    describe(ua) {
      const browser = {
        name: 'Opera',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },

  /* Opera > 13.0 */
  {
    test: [/opr\/|opios/i],
    describe(ua) {
      const browser = {
        name: 'Opera',
      };
      const version = Utils.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/SamsungBrowser/i],
    describe(ua) {
      const browser = {
        name: 'Samsung Internet for Android',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/Whale/i],
    describe(ua) {
      const browser = {
        name: 'NAVER Whale Browser',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/MZBrowser/i],
    describe(ua) {
      const browser = {
        name: 'MZ Browser',
      };
      const version = Utils.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/focus/i],
    describe(ua) {
      const browser = {
        name: 'Focus',
      };
      const version = Utils.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/swing/i],
    describe(ua) {
      const browser = {
        name: 'Swing',
      };
      const version = Utils.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/coast/i],
    describe(ua) {
      const browser = {
        name: 'Opera Coast',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/opt\/\d+(?:.?_?\d+)+/i],
    describe(ua) {
      const browser = {
        name: 'Opera Touch',
      };
      const version = Utils.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/yabrowser/i],
    describe(ua) {
      const browser = {
        name: 'Yandex Browser',
      };
      const version = Utils.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/ucbrowser/i],
    describe(ua) {
      const browser = {
        name: 'UC Browser',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/Maxthon|mxios/i],
    describe(ua) {
      const browser = {
        name: 'Maxthon',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/epiphany/i],
    describe(ua) {
      const browser = {
        name: 'Epiphany',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/puffin/i],
    describe(ua) {
      const browser = {
        name: 'Puffin',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/sleipnir/i],
    describe(ua) {
      const browser = {
        name: 'Sleipnir',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/k-meleon/i],
    describe(ua) {
      const browser = {
        name: 'K-Meleon',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/micromessenger/i],
    describe(ua) {
      const browser = {
        name: 'WeChat',
      };
      const version = Utils.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/qqbrowser/i],
    describe(ua) {
      const browser = {
        name: (/qqbrowserlite/i).test(ua) ? 'QQ Browser Lite' : 'QQ Browser',
      };
      const version = Utils.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/msie|trident/i],
    describe(ua) {
      const browser = {
        name: 'Internet Explorer',
      };
      const version = Utils.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/\sedg\//i],
    describe(ua) {
      const browser = {
        name: 'Microsoft Edge',
      };

      const version = Utils.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/edg([ea]|ios)/i],
    describe(ua) {
      const browser = {
        name: 'Microsoft Edge',
      };

      const version = Utils.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/vivaldi/i],
    describe(ua) {
      const browser = {
        name: 'Vivaldi',
      };
      const version = Utils.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/seamonkey/i],
    describe(ua) {
      const browser = {
        name: 'SeaMonkey',
      };
      const version = Utils.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/sailfish/i],
    describe(ua) {
      const browser = {
        name: 'Sailfish',
      };

      const version = Utils.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/silk/i],
    describe(ua) {
      const browser = {
        name: 'Amazon Silk',
      };
      const version = Utils.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/phantom/i],
    describe(ua) {
      const browser = {
        name: 'PhantomJS',
      };
      const version = Utils.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/slimerjs/i],
    describe(ua) {
      const browser = {
        name: 'SlimerJS',
      };
      const version = Utils.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(ua) {
      const browser = {
        name: 'BlackBerry',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/(web|hpw)[o0]s/i],
    describe(ua) {
      const browser = {
        name: 'WebOS Browser',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua) || Utils.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/bada/i],
    describe(ua) {
      const browser = {
        name: 'Bada',
      };
      const version = Utils.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/tizen/i],
    describe(ua) {
      const browser = {
        name: 'Tizen',
      };
      const version = Utils.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/qupzilla/i],
    describe(ua) {
      const browser = {
        name: 'QupZilla',
      };
      const version = Utils.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/firefox|iceweasel|fxios/i],
    describe(ua) {
      const browser = {
        name: 'Firefox',
      };
      const version = Utils.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/electron/i],
    describe(ua) {
      const browser = {
        name: 'Electron',
      };
      const version = Utils.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/MiuiBrowser/i],
    describe(ua) {
      const browser = {
        name: 'Miui',
      };
      const version = Utils.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/chromium/i],
    describe(ua) {
      const browser = {
        name: 'Chromium',
      };
      const version = Utils.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, ua) || Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/chrome|crios|crmo/i],
    describe(ua) {
      const browser = {
        name: 'Chrome',
      };
      const version = Utils.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },
  {
    test: [/GSA/i],
    describe(ua) {
      const browser = {
        name: 'Google Search',
      };
      const version = Utils.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },

  /* Android Browser */
  {
    test(parser) {
      const notLikeAndroid = !parser.test(/like android/i);
      const butAndroid = parser.test(/android/i);
      return notLikeAndroid && butAndroid;
    },
    describe(ua) {
      const browser = {
        name: 'Android Browser',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },

  /* PlayStation 4 */
  {
    test: [/playstation 4/i],
    describe(ua) {
      const browser = {
        name: 'PlayStation 4',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },

  /* Safari */
  {
    test: [/safari|applewebkit/i],
    describe(ua) {
      const browser = {
        name: 'Safari',
      };
      const version = Utils.getFirstMatch(commonVersionIdentifier, ua);

      if (version) {
        browser.version = version;
      }

      return browser;
    },
  },

  /* Something else */
  {
    test: [/.*/i],
    describe(ua) {
      /* Here we try to make sure that there are explicit details about the device
       * in order to decide what regexp exactly we want to apply
       * (as there is a specific decision based on that conclusion)
       */
      const regexpWithoutDeviceSpec = /^(.*)\/(.*) /;
      const regexpWithDeviceSpec = /^(.*)\/(.*)[ \t]\((.*)/;
      const hasDeviceSpec = ua.search('\\(') !== -1;
      const regexp = hasDeviceSpec ? regexpWithDeviceSpec : regexpWithoutDeviceSpec;
      return {
        name: Utils.getFirstMatch(regexp, ua),
        version: Utils.getSecondMatch(regexp, ua),
      };
    },
  },
];

const enginesParsersList = [
    /* EdgeHTML */
    {
      test(parser) {
        return parser.getBrowserName(true) === 'microsoft edge';
      },
      describe(ua) {
        const isBlinkBased = /\sedg\//i.test(ua);
  
        // return blink if it's blink-based one
        if (isBlinkBased) {
          return {
            name: ENGINE_MAP.Blink,
          };
        }
  
        // otherwise match the version and return EdgeHTML
        const version = Utils.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, ua);
  
        return {
          name: ENGINE_MAP.EdgeHTML,
          version,
        };
      },
    },
  
    /* Trident */
    {
      test: [/trident/i],
      describe(ua) {
        const engine = {
          name: ENGINE_MAP.Trident,
        };
  
        const version = Utils.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, ua);
  
        if (version) {
          engine.version = version;
        }
  
        return engine;
      },
    },
  
    /* Presto */
    {
      test(parser) {
        return parser.test(/presto/i);
      },
      describe(ua) {
        const engine = {
          name: ENGINE_MAP.Presto,
        };
  
        const version = Utils.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, ua);
  
        if (version) {
          engine.version = version;
        }
  
        return engine;
      },
    },
  
    /* Gecko */
    {
      test(parser) {
        const isGecko = parser.test(/gecko/i);
        const likeGecko = parser.test(/like gecko/i);
        return isGecko && !likeGecko;
      },
      describe(ua) {
        const engine = {
          name: ENGINE_MAP.Gecko,
        };
  
        const version = Utils.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, ua);
  
        if (version) {
          engine.version = version;
        }
  
        return engine;
      },
    },
  
    /* Blink */
    {
      test: [/(apple)?webkit\/537\.36/i],
      describe() {
        return {
          name: ENGINE_MAP.Blink,
        };
      },
    },
  
    /* WebKit */
    {
      test: [/(apple)?webkit/i],
      describe(ua) {
        const engine = {
          name: ENGINE_MAP.WebKit,
        };
  
        const version = Utils.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, ua);
  
        if (version) {
          engine.version = version;
        }
  
        return engine;
      },
    },
  ];

  const platformParsersList = [
    /* Googlebot */
    {
      test: [/googlebot/i],
      describe() {
        return {
          type: 'bot',
          vendor: 'Google',
        };
      },
    },
  
    /* Huawei */
    {
      test: [/huawei/i],
      describe(ua) {
        const model = Utils.getFirstMatch(/(can-l01)/i, ua) && 'Nova';
        const platform = {
          type: PLATFORMS_MAP.mobile,
          vendor: 'Huawei',
        };
        if (model) {
          platform.model = model;
        }
        return platform;
      },
    },
  
    /* Nexus Tablet */
    {
      test: [/nexus\s*(?:7|8|9|10).*/i],
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
          vendor: 'Nexus',
        };
      },
    },
  
    /* iPad */
    {
      test: [/ipad/i],
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
          vendor: 'Apple',
          model: 'iPad',
        };
      },
    },
  
    /* Firefox on iPad */
    {
      test: [/Macintosh(.*?) FxiOS(.*?)\//],
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
          vendor: 'Apple',
          model: 'iPad',
        };
      },
    },
  
    /* Amazon Kindle Fire */
    {
      test: [/kftt build/i],
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
          vendor: 'Amazon',
          model: 'Kindle Fire HD 7',
        };
      },
    },
  
    /* Another Amazon Tablet with Silk */
    {
      test: [/silk/i],
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
          vendor: 'Amazon',
        };
      },
    },
  
    /* Tablet */
    {
      test: [/tablet(?! pc)/i],
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
        };
      },
    },
  
    /* iPod/iPhone */
    {
      test(parser) {
        const iDevice = parser.test(/ipod|iphone/i);
        const likeIDevice = parser.test(/like (ipod|iphone)/i);
        return iDevice && !likeIDevice;
      },
      describe(ua) {
        const model = Utils.getFirstMatch(/(ipod|iphone)/i, ua);
        return {
          type: PLATFORMS_MAP.mobile,
          vendor: 'Apple',
          model,
        };
      },
    },
  
    /* Nexus Mobile */
    {
      test: [/nexus\s*[0-6].*/i, /galaxy nexus/i],
      describe() {
        return {
          type: PLATFORMS_MAP.mobile,
          vendor: 'Nexus',
        };
      },
    },
  
    /* Mobile */
    {
      test: [/[^-]mobi/i],
      describe() {
        return {
          type: PLATFORMS_MAP.mobile,
        };
      },
    },
  
    /* BlackBerry */
    {
      test(parser) {
        return parser.getBrowserName(true) === 'blackberry';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.mobile,
          vendor: 'BlackBerry',
        };
      },
    },
  
    /* Bada */
    {
      test(parser) {
        return parser.getBrowserName(true) === 'bada';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.mobile,
        };
      },
    },
  
    /* Windows Phone */
    {
      test(parser) {
        return parser.getBrowserName() === 'windows phone';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.mobile,
          vendor: 'Microsoft',
        };
      },
    },
  
    /* Android Tablet */
    {
      test(parser) {
        const osMajorVersion = Number(String(parser.getOSVersion()).split('.')[0]);
        return parser.getOSName(true) === 'android' && (osMajorVersion >= 3);
      },
      describe() {
        return {
          type: PLATFORMS_MAP.tablet,
        };
      },
    },
  
    /* Android Mobile */
    {
      test(parser) {
        return parser.getOSName(true) === 'android';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.mobile,
        };
      },
    },
  
    /* desktop */
    {
      test(parser) {
        return parser.getOSName(true) === 'macos';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.desktop,
          vendor: 'Apple',
        };
      },
    },
  
    /* Windows */
    {
      test(parser) {
        return parser.getOSName(true) === 'windows';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.desktop,
        };
      },
    },
  
    /* Linux */
    {
      test(parser) {
        return parser.getOSName(true) === 'linux';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.desktop,
        };
      },
    },
  
    /* PlayStation 4 */
    {
      test(parser) {
        return parser.getOSName(true) === 'playstation 4';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.tv,
        };
      },
    },
  
    /* Roku */
    {
      test(parser) {
        return parser.getOSName(true) === 'roku';
      },
      describe() {
        return {
          type: PLATFORMS_MAP.tv,
        };
      },
    },
  ];
  

  const osParsersList = [
    /* Roku */
    {
      test: [/Roku\/DVP/],
      describe(ua) {
        const version = Utils.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, ua);
        return {
          name: OS_MAP.Roku,
          version,
        };
      },
    },
  
    /* Windows Phone */
    {
      test: [/windows phone/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, ua);
        return {
          name: OS_MAP.WindowsPhone,
          version,
        };
      },
    },
  
    /* Windows */
    {
      test: [/windows /i],
      describe(ua) {
        const version = Utils.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, ua);
        const versionName = Utils.getWindowsVersionName(version);
  
        return {
          name: OS_MAP.Windows,
          version,
          versionName,
        };
      },
    },
  
    /* Firefox on iPad */
    {
      test: [/Macintosh(.*?) FxiOS(.*?)\//],
      describe(ua) {
        const result = {
          name: OS_MAP.iOS,
        };
        const version = Utils.getSecondMatch(/(Version\/)(\d[\d.]+)/, ua);
        if (version) {
          result.version = version;
        }
        return result;
      },
    },
  
    /* macOS */
    {
      test: [/macintosh/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, ua).replace(/[_\s]/g, '.');
        const versionName = Utils.getMacOSVersionName(version);
  
        const os = {
          name: OS_MAP.MacOS,
          version,
        };
        if (versionName) {
          os.versionName = versionName;
        }
        return os;
      },
    },
  
    /* iOS */
    {
      test: [/(ipod|iphone|ipad)/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, ua).replace(/[_\s]/g, '.');
  
        return {
          name: OS_MAP.iOS,
          version,
        };
      },
    },
  
    /* Android */
    {
      test(parser) {
        const notLikeAndroid = !parser.test(/like android/i);
        const butAndroid = parser.test(/android/i);
        return notLikeAndroid && butAndroid;
      },
      describe(ua) {
        const version = Utils.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, ua);
        const versionName = Utils.getAndroidVersionName(version);
        const os = {
          name: OS_MAP.Android,
          version,
        };
        if (versionName) {
          os.versionName = versionName;
        }
        return os;
      },
    },
  
    /* WebOS */
    {
      test: [/(web|hpw)[o0]s/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, ua);
        const os = {
          name: OS_MAP.WebOS,
        };
  
        if (version && version.length) {
          os.version = version;
        }
        return os;
      },
    },
  
    /* BlackBerry */
    {
      test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, ua)
          || Utils.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, ua)
          || Utils.getFirstMatch(/\bbb(\d+)/i, ua);
  
        return {
          name: OS_MAP.BlackBerry,
          version,
        };
      },
    },
  
    /* Bada */
    {
      test: [/bada/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, ua);
  
        return {
          name: OS_MAP.Bada,
          version,
        };
      },
    },
  
    /* Tizen */
    {
      test: [/tizen/i],
      describe(ua) {
        const version = Utils.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, ua);
  
        return {
          name: OS_MAP.Tizen,
          version,
        };
      },
    },
  
    /* Linux */
    {
      test: [/linux/i],
      describe() {
        return {
          name: OS_MAP.Linux,
        };
      },
    },
  
    /* Chrome OS */
    {
      test: [/CrOS/],
      describe() {
        return {
          name: OS_MAP.ChromeOS,
        };
      },
    },
  
    /* Playstation 4 */
    {
      test: [/PlayStation 4/],
      describe(ua) {
        const version = Utils.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, ua);
        return {
          name: OS_MAP.PlayStation4,
          version,
        };
      },
    },
  ];

  /**
 * The main class that arranges the whole parsing process.
 */
class Parser {
    /**
     * Create instance of Parser
     *
     * @param {String} UA User-Agent string
     * @param {Boolean} [skipParsing=false] parser can skip parsing in purpose of performance
     * improvements if you need to make a more particular parsing
     * like {@link Parser#parseBrowser} or {@link Parser#parsePlatform}
     *
     * @throw {Error} in case of empty UA String
     *
     * @constructor
     */
    constructor(UA, skipParsing = false) {
      if (UA === void (0) || UA === null || UA === '') {
        throw new Error("UserAgent parameter can't be empty");
      }
  
      this._ua = UA;
  
      /**
       * @typedef ParsedResult
       * @property {Object} browser
       * @property {String|undefined} [browser.name]
       * Browser name, like `"Chrome"` or `"Internet Explorer"`
       * @property {String|undefined} [browser.version] Browser version as a String `"12.01.45334.10"`
       * @property {Object} os
       * @property {String|undefined} [os.name] OS name, like `"Windows"` or `"macOS"`
       * @property {String|undefined} [os.version] OS version, like `"NT 5.1"` or `"10.11.1"`
       * @property {String|undefined} [os.versionName] OS name, like `"XP"` or `"High Sierra"`
       * @property {Object} platform
       * @property {String|undefined} [platform.type]
       * platform type, can be either `"desktop"`, `"tablet"` or `"mobile"`
       * @property {String|undefined} [platform.vendor] Vendor of the device,
       * like `"Apple"` or `"Samsung"`
       * @property {String|undefined} [platform.model] Device model,
       * like `"iPhone"` or `"Kindle Fire HD 7"`
       * @property {Object} engine
       * @property {String|undefined} [engine.name]
       * Can be any of this: `WebKit`, `Blink`, `Gecko`, `Trident`, `Presto`, `EdgeHTML`
       * @property {String|undefined} [engine.version] String version of the engine
       */
      this.parsedResult = {};
  
      if (skipParsing !== true) {
        this.parse();
      }
    }
  
    /**
     * Get UserAgent string of current Parser instance
     * @return {String} User-Agent String of the current <Parser> object
     *
     * @public
     */
    getUA() {
      return this._ua;
    }
  
    /**
     * Test a UA string for a regexp
     * @param {RegExp} regex
     * @return {Boolean}
     */
    test(regex) {
      return regex.test(this._ua);
    }
  
    /**
     * Get parsed browser object
     * @return {Object}
     */
    parseBrowser() {
      this.parsedResult.browser = {};
  
      const browserDescriptor = Utils.find(browserParsersList, (_browser) => {
        if (typeof _browser.test === 'function') {
          return _browser.test(this);
        }
  
        if (_browser.test instanceof Array) {
          return _browser.test.some(condition => this.test(condition));
        }
  
        throw new Error("Browser's test function is not valid");
      });
  
      if (browserDescriptor) {
        this.parsedResult.browser = browserDescriptor.describe(this.getUA());
      }
  
      return this.parsedResult.browser;
    }
  
    /**
     * Get parsed browser object
     * @return {Object}
     *
     * @public
     */
    getBrowser() {
      if (this.parsedResult.browser) {
        return this.parsedResult.browser;
      }
  
      return this.parseBrowser();
    }
  
    /**
     * Get browser's name
     * @return {String} Browser's name or an empty string
     *
     * @public
     */
    getBrowserName(toLowerCase) {
      if (toLowerCase) {
        return String(this.getBrowser().name).toLowerCase() || '';
      }
      return this.getBrowser().name || '';
    }
  
  
    /**
     * Get browser's version
     * @return {String} version of browser
     *
     * @public
     */
    getBrowserVersion() {
      return this.getBrowser().version;
    }
  
    /**
     * Get OS
     * @return {Object}
     *
     * @example
     * this.getOS();
     * {
     *   name: 'macOS',
     *   version: '10.11.12'
     * }
     */
    getOS() {
      if (this.parsedResult.os) {
        return this.parsedResult.os;
      }
  
      return this.parseOS();
    }
  
    /**
     * Parse OS and save it to this.parsedResult.os
     * @return {*|{}}
     */
    parseOS() {
      this.parsedResult.os = {};
  
      const os = Utils.find(osParsersList, (_os) => {
        if (typeof _os.test === 'function') {
          return _os.test(this);
        }
  
        if (_os.test instanceof Array) {
          return _os.test.some(condition => this.test(condition));
        }
  
        throw new Error("Browser's test function is not valid");
      });
  
      if (os) {
        this.parsedResult.os = os.describe(this.getUA());
      }
  
      return this.parsedResult.os;
    }
  
    /**
     * Get OS name
     * @param {Boolean} [toLowerCase] return lower-cased value
     * @return {String} name of the OS — macOS, Windows, Linux, etc.
     */
    getOSName(toLowerCase) {
      const { name } = this.getOS();
  
      if (toLowerCase) {
        return String(name).toLowerCase() || '';
      }
  
      return name || '';
    }
  
    /**
     * Get OS version
     * @return {String} full version with dots ('10.11.12', '5.6', etc)
     */
    getOSVersion() {
      return this.getOS().version;
    }
  
    /**
     * Get parsed platform
     * @return {{}}
     */
    getPlatform() {
      if (this.parsedResult.platform) {
        return this.parsedResult.platform;
      }
  
      return this.parsePlatform();
    }
  
    /**
     * Get platform name
     * @param {Boolean} [toLowerCase=false]
     * @return {*}
     */
    getPlatformType(toLowerCase = false) {
      const { type } = this.getPlatform();
  
      if (toLowerCase) {
        return String(type).toLowerCase() || '';
      }
  
      return type || '';
    }
  
    /**
     * Get parsed platform
     * @return {{}}
     */
    parsePlatform() {
      this.parsedResult.platform = {};
  
      const platform = Utils.find(platformParsersList, (_platform) => {
        if (typeof _platform.test === 'function') {
          return _platform.test(this);
        }
  
        if (_platform.test instanceof Array) {
          return _platform.test.some(condition => this.test(condition));
        }
  
        throw new Error("Browser's test function is not valid");
      });
  
      if (platform) {
        this.parsedResult.platform = platform.describe(this.getUA());
      }
  
      return this.parsedResult.platform;
    }
  
    /**
     * Get parsed engine
     * @return {{}}
     */
    getEngine() {
      if (this.parsedResult.engine) {
        return this.parsedResult.engine;
      }
  
      return this.parseEngine();
    }
  
    /**
     * Get engines's name
     * @return {String} Engines's name or an empty string
     *
     * @public
     */
    getEngineName(toLowerCase) {
      if (toLowerCase) {
        return String(this.getEngine().name).toLowerCase() || '';
      }
      return this.getEngine().name || '';
    }
  
    /**
     * Get parsed platform
     * @return {{}}
     */
    parseEngine() {
      this.parsedResult.engine = {};
  
      const engine = Utils.find(enginesParsersList, (_engine) => {
        if (typeof _engine.test === 'function') {
          return _engine.test(this);
        }
  
        if (_engine.test instanceof Array) {
          return _engine.test.some(condition => this.test(condition));
        }
  
        throw new Error("Browser's test function is not valid");
      });
  
      if (engine) {
        this.parsedResult.engine = engine.describe(this.getUA());
      }
  
      return this.parsedResult.engine;
    }
  
    /**
     * Parse full information about the browser
     * @returns {Parser}
     */
    parse() {
      this.parseBrowser();
      this.parseOS();
      this.parsePlatform();
      this.parseEngine();
  
      return this;
    }
  
    /**
     * Get parsed result
     * @return {ParsedResult}
     */
    getResult() {
      return Utils.assign({}, this.parsedResult);
    }
  
    /**
     * Check if parsed browser matches certain conditions
     *
     * @param {Object} checkTree It's one or two layered object,
     * which can include a platform or an OS on the first layer
     * and should have browsers specs on the bottom-laying layer
     *
     * @returns {Boolean|undefined} Whether the browser satisfies the set conditions or not.
     * Returns `undefined` when the browser is no described in the checkTree object.
     *
     * @example
     * const browser = Bowser.getParser(window.navigator.userAgent);
     * if (browser.satisfies({chrome: '>118.01.1322' }))
     * // or with os
     * if (browser.satisfies({windows: { chrome: '>118.01.1322' } }))
     * // or with platforms
     * if (browser.satisfies({desktop: { chrome: '>118.01.1322' } }))
     */
    satisfies(checkTree) {
      const platformsAndOSes = {};
      let platformsAndOSCounter = 0;
      const browsers = {};
      let browsersCounter = 0;
  
      const allDefinitions = Object.keys(checkTree);
  
      allDefinitions.forEach((key) => {
        const currentDefinition = checkTree[key];
        if (typeof currentDefinition === 'string') {
          browsers[key] = currentDefinition;
          browsersCounter += 1;
        } else if (typeof currentDefinition === 'object') {
          platformsAndOSes[key] = currentDefinition;
          platformsAndOSCounter += 1;
        }
      });
  
      if (platformsAndOSCounter > 0) {
        const platformsAndOSNames = Object.keys(platformsAndOSes);
        const OSMatchingDefinition = Utils.find(platformsAndOSNames, name => (this.isOS(name)));
  
        if (OSMatchingDefinition) {
          const osResult = this.satisfies(platformsAndOSes[OSMatchingDefinition]);
  
          if (osResult !== void 0) {
            return osResult;
          }
        }
  
        const platformMatchingDefinition = Utils.find(
          platformsAndOSNames,
          name => (this.isPlatform(name)),
        );
        if (platformMatchingDefinition) {
          const platformResult = this.satisfies(platformsAndOSes[platformMatchingDefinition]);
  
          if (platformResult !== void 0) {
            return platformResult;
          }
        }
      }
  
      if (browsersCounter > 0) {
        const browserNames = Object.keys(browsers);
        const matchingDefinition = Utils.find(browserNames, name => (this.isBrowser(name, true)));
  
        if (matchingDefinition !== void 0) {
          return this.compareVersion(browsers[matchingDefinition]);
        }
      }
  
      return undefined;
    }
  
    /**
     * Check if the browser name equals the passed string
     * @param browserName The string to compare with the browser name
     * @param [includingAlias=false] The flag showing whether alias will be included into comparison
     * @returns {boolean}
     */
    isBrowser(browserName, includingAlias = false) {
      const defaultBrowserName = this.getBrowserName().toLowerCase();
      let browserNameLower = browserName.toLowerCase();
      const alias = Utils.getBrowserTypeByAlias(browserNameLower);
  
      if (includingAlias && alias) {
        browserNameLower = alias.toLowerCase();
      }
      return browserNameLower === defaultBrowserName;
    }
  
    compareVersion(version) {
      let expectedResults = [0];
      let comparableVersion = version;
      let isLoose = false;
  
      const currentBrowserVersion = this.getBrowserVersion();
  
      if (typeof currentBrowserVersion !== 'string') {
        return void 0;
      }
  
      if (version[0] === '>' || version[0] === '<') {
        comparableVersion = version.substr(1);
        if (version[1] === '=') {
          isLoose = true;
          comparableVersion = version.substr(2);
        } else {
          expectedResults = [];
        }
        if (version[0] === '>') {
          expectedResults.push(1);
        } else {
          expectedResults.push(-1);
        }
      } else if (version[0] === '=') {
        comparableVersion = version.substr(1);
      } else if (version[0] === '~') {
        isLoose = true;
        comparableVersion = version.substr(1);
      }
  
      return expectedResults.indexOf(
        Utils.compareVersions(currentBrowserVersion, comparableVersion, isLoose),
      ) > -1;
    }
  
    isOS(osName) {
      return this.getOSName(true) === String(osName).toLowerCase();
    }
  
    isPlatform(platformType) {
      return this.getPlatformType(true) === String(platformType).toLowerCase();
    }
  
    isEngine(engineName) {
      return this.getEngineName(true) === String(engineName).toLowerCase();
    }
  
    /**
     * Is anything? Check if the browser is called "anything",
     * the OS called "anything" or the platform called "anything"
     * @param {String} anything
     * @param [includingAlias=false] The flag showing whether alias will be included into comparison
     * @returns {Boolean}
     */
    is(anything, includingAlias = false) {
      return this.isBrowser(anything, includingAlias) || this.isOS(anything)
        || this.isPlatform(anything);
    }
  
    /**
     * Check if any of the given values satisfies this.is(anything)
     * @param {String[]} anythings
     * @returns {Boolean}
     */
    some(anythings = []) {
      return anythings.some(anything => this.is(anything));
    }
  }
/**
 * Bowser class.
 * Keep it simple as much as it can be.
 * It's supposed to work with collections of {@link Parser} instances
 * rather then solve one-instance problems.
 * All the one-instance stuff is located in Parser class.
 *
 * @class
 * @classdesc Bowser is a static object, that provides an API to the Parsers
 * @hideconstructor
 */
 export class Bowser {
    /**
     * Creates a {@link Parser} instance
     *
     * @param {String} UA UserAgent string
     * @param {Boolean} [skipParsing=false] Will make the Parser postpone parsing until you ask it
     * explicitly. Same as `skipParsing` for {@link Parser}.
     * @returns {Parser}
     * @throws {Error} when UA is not a String
     *
     * @example
     * const parser = Bowser.getParser(window.navigator.userAgent);
     * const result = parser.getResult();
     */
    static getParser(UA, skipParsing = false) {
      if (typeof UA !== 'string') {
        throw new Error('UserAgent should be a string');
      }
      return new Parser(UA, skipParsing);
    }
  
    /**
     * Creates a {@link Parser} instance and runs {@link Parser.getResult} immediately
     *
     * @param UA
     * @return {ParsedResult}
     *
     * @example
     * const result = Bowser.parse(window.navigator.userAgent);
     */
    static parse(UA) {
      return (new Parser(UA)).getResult();
    }
  
    static get BROWSER_MAP() {
      return BROWSER_MAP;
    }
  
    static get ENGINE_MAP() {
      return ENGINE_MAP;
    }
  
    static get OS_MAP() {
      return OS_MAP;
    }
  
    static get PLATFORMS_MAP() {
      return PLATFORMS_MAP;
    }
  };
  
  