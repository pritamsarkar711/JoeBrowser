/**
 * StealthBrowser Engine — MAIN-world spoofing script.
 *
 * Runs at document_start in the MAIN world (Chrome MV3 `world: "MAIN"`,
 * Firefox MV3 `world: "MAIN"`, both supported in current browser versions),
 * so page scripts see spoofed values first and can never observe the real
 * ones. The extension builder replaces __INJECT_CONFIG__ with the concrete
 * per-profile fingerprint before the browser launches.
 *
 * Design notes
 * ------------
 * - All overrides are accessors defined on prototypes, so they survive page
 *   redefinition attempts better than instance properties and they are what
 *   every getter-based read observes.
 * - Wrapped functions look native: Function.prototype.toString is patched so
 *   both `fn.toString()` AND `Function.prototype.toString.call(fn)` return
 *   `function name() { [native code] }`.
 * - Every override is guarded in try/catch: one failing property must never
 *   break the page (or the other overrides).
 * - Noise is generated from a per-profile SEED so the canvas/audio hashes are
 *   stable across sessions (a real device behaves identically every visit).
 */
(function () {
  'use strict';

  var CFG = __INJECT_CONFIG__;

  if (!CFG || typeof CFG !== 'object') return;

  var ENABLED = typeof CFG.userAgent === 'string' && CFG.userAgent.length > 0;

  // ---------------------------------------------------------------------------
  // Seeded noise generator (mulberry32)
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    var rnd = mulberry32(seed || 1);
    return {
      next: rnd,
      range: function (min, max) {
        return min + rnd() * (max - min);
      },
      int: function (min, max) {
        return min + Math.floor(rnd() * (max - min + 1));
      },
      jitter: function (amount) {
        return rnd() * amount * 2 - amount;
      }
    };
  }

  var canvasRng = makeRng(CFG.canvasNoiseSeed || 1);
  var audioRng = makeRng(CFG.audioNoiseSeed || 1);

  // ---------------------------------------------------------------------------
  // Native-looking function wrappers
  // ---------------------------------------------------------------------------

  var NATIVE_MARKER = '__stealthNative';
  var _origFnToString = Function.prototype.toString;

  Function.prototype.toString = function () {
    if (this && this[NATIVE_MARKER]) {
      return 'function ' + (this[NATIVE_MARKER] || '') + '() { [native code] }';
    }
    return _origFnToString.call(this);
  };

  /**
   * Build a wrapper that reports itself as a native function.
   * `name` is what toString() shows; `impl` receives (target, argsArray).
   */
  function nativeWrap(name, impl) {
    var f = function () {
      return impl(this, arguments);
    };
    Object.defineProperty(f, NATIVE_MARKER, { value: name, configurable: true });
    try {
      Object.defineProperty(f, 'name', { value: name, configurable: true });
    } catch (e) {
      /* some engines forbid renaming */
    }
    return f;
  }

  function safeDefine(obj, prop, descriptor) {
    try {
      Object.defineProperty(obj, prop, descriptor);
    } catch (e) {
      /* e.g. LegacyUnforgeable on Firefox — prefs cover those cases */
    }
  }

  function safeDefineGetter(obj, prop, getter) {
    safeDefine(obj, prop, { get: getter, configurable: true, enumerable: false });
  }

  // ---------------------------------------------------------------------------
  // 1. navigator
  // ---------------------------------------------------------------------------

  if (ENABLED) {
    var nav = navigator;
    var NavProto = Object.getPrototypeOf(navigator);

    // appVersion = UA without the "Mozilla/" prefix (matches real browsers)
    var appVersion = String(CFG.userAgent).replace(/^Mozilla\//, '');
    var isGeckoUA = /Firefox\//.test(CFG.userAgent);
    var isMobileUA = /Mobile|iPhone|iPad/.test(CFG.userAgent);

    var NAV_PROPS = {
      userAgent: CFG.userAgent,
      appVersion: appVersion,
      platform: CFG.platform || '',
      product: 'Gecko',
      productSub: isGeckoUA ? '20100101' : '20030107',
      vendor: isGeckoUA ? '' : 'Google Inc.',
      vendorSub: '',
      language: CFG.language || 'en-US',
      hardwareConcurrency: CFG.hardwareConcurrency,
      deviceMemory: CFG.deviceMemory,
      maxTouchPoints: CFG.maxTouchPoints,
      webdriver: false
    };

    Object.keys(NAV_PROPS).forEach(function (prop) {
      var value = NAV_PROPS[prop];
      safeDefineGetter(NavProto, prop, function () {
        return value;
      });
      safeDefineGetter(nav, prop, function () {
        return value;
      });
    });

    if (CFG.languages && CFG.languages.length) {
      var langs = CFG.languages.slice();
      safeDefineGetter(NavProto, 'languages', function () {
        return langs.slice();
      });
      safeDefineGetter(nav, 'languages', function () {
        return langs.slice();
      });
    }

    if (CFG.oscpu) {
      safeDefineGetter(NavProto, 'oscpu', function () {
        return CFG.oscpu;
      });
      safeDefineGetter(nav, 'oscpu', function () {
        return CFG.oscpu;
      });
    }

    // --- navigator.userAgentData (Client Hints) -----------------------------
    // The real object would leak the actual browser version and platform.
    var chromeVersionMatch = CFG.userAgent.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
    var edgeVersionMatch = CFG.userAgent.match(/Edg\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
    if (chromeVersionMatch && !isGeckoUA) {
      var fullVersion = chromeVersionMatch[1] + '.' + chromeVersionMatch[2] + '.' + chromeVersionMatch[3] + '.' + chromeVersionMatch[4];
      var major = chromeVersionMatch[1];
      var brands = [
        { brand: 'Chromium', version: major },
        { brand: 'Not_A Brand', version: '24' },
        { brand: 'Google Chrome', version: major }
      ];
      if (edgeVersionMatch) {
        brands.push({ brand: 'Microsoft Edge', version: edgeVersionMatch[1] });
      }
      var platformVersion = '15.0.0';
      if (CFG.platform && CFG.platform.indexOf('Mac') === 0) platformVersion = '15.5.0';
      if (CFG.platform && CFG.platform.indexOf('Linux') === 0) platformVersion = '6.5.0';
      if (CFG.platform && CFG.platform.indexOf('armv8l') === 0) platformVersion = '14.0.0';

      var uaData = {
        brands: brands,
        mobile: isMobileUA,
        platform: CFG.platform || 'Windows',
        getHighEntropyValues: function (hints) {
          return Promise.resolve({
            architecture: 'x86',
            bitness: '64',
            brands: brands,
            fullVersionList: brands,
            mobile: isMobileUA,
            model: '',
            platform: CFG.platform || 'Windows',
            platformVersion: platformVersion,
            uaFullVersion: fullVersion,
            wow64: false
          });
        },
        toJSON: function () {
          return { brands: brands, mobile: isMobileUA, platform: CFG.platform || 'Windows' };
        }
      };
      safeDefineGetter(NavProto, 'userAgentData', function () {
        return uaData;
      });
      safeDefineGetter(nav, 'userAgentData', function () {
        return uaData;
      });
    } else if (isGeckoUA) {
      // A Firefox UA must not expose a Chromium-only object.
      safeDefineGetter(NavProto, 'userAgentData', function () {
        return undefined;
      });
      safeDefineGetter(nav, 'userAgentData', function () {
        return undefined;
      });
    }

    // --- plugins / mimeTypes ------------------------------------------------
    if (CFG.pluginsSpoof) {
      function makeNamedArray(entries) {
        var arr = entries.slice();
        arr.item = function (i) {
          return arr[i] || null;
        };
        arr.namedItem = function (name) {
          for (var j = 0; j < arr.length; j++) {
            if (arr[j].name === name || arr[j].type === name) return arr[j];
          }
          return null;
        };
        Object.defineProperty(arr, 'length', { value: arr.length, writable: false });
        return arr;
      }

      // Real Chromium exposes ~5 PDF-related plugins and 2 mime types.
      function makePdfPlugin(name, filename) {
        var plugin = {
          name: name,
          description: 'Portable Document Format',
          filename: filename,
          length: 1,
          item: function (i) {
            return i === 0 ? pdfMimes[0] : null;
          },
          namedItem: function (n) {
            return n === 'application/pdf' ? pdfMimes[0] : n === 'text/pdf' ? pdfMimes[1] : null;
          }
        };
        plugin[0] = pdfMimes[0];
        return plugin;
      }

      var pdfMimes = [
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: null },
        { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: null }
      ];
      var pdfPlugins = [
        makePdfPlugin('PDF Viewer', 'internal-pdf-viewer'),
        makePdfPlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai'),
        makePdfPlugin('Chromium PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai'),
        makePdfPlugin('Portable Document Format', 'internal-pdf-viewer')
      ];
      // Wire up enabledPlugin back-references after construction.
      pdfMimes[0].enabledPlugin = pdfPlugins[0];
      pdfMimes[1].enabledPlugin = pdfPlugins[0];
      for (var pi = 0; pi < pdfPlugins.length; pi++) pdfPlugins[pi][0] = pdfMimes[0];

      var plugins = makeNamedArray(isGeckoUA ? [] : pdfPlugins);
      var mimes = makeNamedArray(isGeckoUA ? [] : pdfMimes);

      safeDefineGetter(NavProto, 'plugins', function () {
        return plugins;
      });
      safeDefineGetter(NavProto, 'mimeTypes', function () {
        return mimes;
      });
      safeDefineGetter(nav, 'plugins', function () {
        return plugins;
      });
      safeDefineGetter(nav, 'mimeTypes', function () {
        return mimes;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. screen & devicePixelRatio
  // ---------------------------------------------------------------------------

  if (ENABLED && CFG.screen) {
    var scr = CFG.screen;
    var ScreenProto = window.Screen ? Screen.prototype : null;

    var SCREEN_PROPS = {
      width: scr.width,
      height: scr.height,
      availWidth: scr.availWidth,
      availHeight: scr.availHeight,
      colorDepth: scr.colorDepth,
      pixelDepth: scr.pixelDepth
    };

    if (ScreenProto) {
      Object.keys(SCREEN_PROPS).forEach(function (prop) {
        var value = SCREEN_PROPS[prop];
        safeDefineGetter(ScreenProto, prop, function () {
          return value;
        });
      });
    }
    Object.keys(SCREEN_PROPS).forEach(function (prop) {
      var value = SCREEN_PROPS[prop];
      safeDefineGetter(window.screen, prop, function () {
        return value;
      });
    });

    if (scr.dpr) {
      safeDefineGetter(window, 'devicePixelRatio', function () {
        return scr.dpr;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. timezone (Date API part; Intl is handled at the browser level via
  //    --timezone-for-testing on Chromium and is a documented Firefox limit)
  // ---------------------------------------------------------------------------

  if (ENABLED && typeof CFG.timezoneOffset === 'number') {
    var offsetMinutes = -CFG.timezoneOffset; // Date.getTimezoneOffset returns UTC-relative
    var origGetTZ = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = nativeWrap('getTimezoneOffset', function () {
      return offsetMinutes;
    });
    if (origGetTZ) {
      // keep a reference so pages can still call the original if they saved it
      Date.prototype.getTimezoneOffset.__orig = origGetTZ;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. WebGL vendor / renderer
  // ---------------------------------------------------------------------------

  function patchWebGL(proto) {
    if (!proto) return;
    var origGetParam = proto.getParameter;
    if (typeof origGetParam !== 'function') return;
    var UNMASKED_VENDOR = 37445;
    var UNMASKED_RENDERER = 37446;
    proto.getParameter = nativeWrap('getParameter', function (self, args) {
      var pname = args[0];
      if (pname === UNMASKED_VENDOR && CFG.webglVendor) return CFG.webglVendor;
      if (pname === UNMASKED_RENDERER && CFG.webglRenderer) return CFG.webglRenderer;
      return origGetParam.apply(self, args);
    });
  }

  patchWebGL(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  patchWebGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);

  // ---------------------------------------------------------------------------
  // 5. Canvas noise (2D)
  // ---------------------------------------------------------------------------

  if (CFG.canvasNoiseEnabled && window.CanvasRenderingContext2D) {
    var ctxProto = CanvasRenderingContext2D.prototype;

    function wrapDrawMethod(name, perturb) {
      var orig = ctxProto[name];
      if (typeof orig !== 'function') return;
      ctxProto[name] = nativeWrap(name, function (self, args) {
        args = Array.prototype.slice.call(args);
        perturb(args);
        return orig.apply(self, args);
      });
    }

    // Text & shapes: sub-pixel coordinate jitter (changes the raster hash,
    // invisible to the eye).
    wrapDrawMethod('fillText', function (args) {
      args[1] = args[1] + canvasRng.jitter(0.15);
      args[2] = args[2] + canvasRng.jitter(0.15);
    });
    wrapDrawMethod('strokeText', function (args) {
      args[1] = args[1] + canvasRng.jitter(0.15);
      args[2] = args[2] + canvasRng.jitter(0.15);
    });
    wrapDrawMethod('fillRect', function (args) {
      args[0] += canvasRng.jitter(0.2);
      args[1] += canvasRng.jitter(0.2);
      args[2] += canvasRng.jitter(0.2);
      args[3] += canvasRng.jitter(0.2);
    });
    wrapDrawMethod('strokeRect', function (args) {
      args[0] += canvasRng.jitter(0.2);
      args[1] += canvasRng.jitter(0.2);
      args[2] += canvasRng.jitter(0.2);
      args[3] += canvasRng.jitter(0.2);
    });
    wrapDrawMethod('drawImage', function (args) {
      args[1] = args[1] + canvasRng.jitter(0.3);
      args[2] = args[2] + canvasRng.jitter(0.3);
    });
    wrapDrawMethod('arc', function (args) {
      args[0] += canvasRng.jitter(0.1);
      args[1] += canvasRng.jitter(0.1);
    });

    // getImageData: per-pixel noise (direct hash changer).
    // Seeded so repeated reads of the same canvas yield a stable hash.
    var origGetImageData = ctxProto.getImageData;
    if (typeof origGetImageData === 'function') {
      ctxProto.getImageData = nativeWrap('getImageData', function (self, args) {
        var img = origGetImageData.apply(self, args);
        try {
          var d = img.data;
          // Re-seed from canvasNoiseSeed + dimensions so noise is deterministic
          // for identical canvas content/size across calls.
          var localRng = makeRng(
            ((CFG.canvasNoiseSeed || 1) ^ (d.length * 2654435761)) >>> 0
          );
          for (var i = 0; i < d.length; i += 4) {
            d[i] = Math.max(0, Math.min(255, d[i] + localRng.int(-2, 2)));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + localRng.int(-2, 2)));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + localRng.int(-2, 2)));
          }
        } catch (e) {
          /* non-writable buffer */
        }
        return img;
      });
    }

    // toDataURL / toBlob: apply the same seeded pixel noise so canvas
    // fingerprint hashes (browserleaks, amiunique, etc.) differ from real HW.
    function noisifyCanvas(canvas) {
      try {
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        var w = canvas.width || 0;
        var h = canvas.height || 0;
        if (w < 1 || h < 1) return;
        var img = origGetImageData.call(ctx, 0, 0, w, h);
        var d = img.data;
        var localRng = makeRng(
          ((CFG.canvasNoiseSeed || 1) ^ (d.length * 2654435761)) >>> 0
        );
        for (var i = 0; i < d.length; i += 4) {
          d[i] = Math.max(0, Math.min(255, d[i] + localRng.int(-2, 2)));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + localRng.int(-2, 2)));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + localRng.int(-2, 2)));
        }
        ctx.putImageData(img, 0, 0);
      } catch (e) {
        /* tainted canvas or non-2d */
      }
    }

    if (window.HTMLCanvasElement) {
      var canvasProto = HTMLCanvasElement.prototype;
      var origToDataURL = canvasProto.toDataURL;
      if (typeof origToDataURL === 'function') {
        canvasProto.toDataURL = nativeWrap('toDataURL', function (self, args) {
          try {
            noisifyCanvas(self);
          } catch (e) {
            /* ignore */
          }
          return origToDataURL.apply(self, args);
        });
      }
      var origToBlob = canvasProto.toBlob;
      if (typeof origToBlob === 'function') {
        canvasProto.toBlob = nativeWrap('toBlob', function (self, args) {
          try {
            noisifyCanvas(self);
          } catch (e) {
            /* ignore */
          }
          return origToBlob.apply(self, args);
        });
      }
    }

    // Font probing via measureText: tiny seeded width noise when font
    // protection is enabled, so width-difference probes cannot distinguish
    // installed fonts.
    if (CFG.fontFingerprintProtection) {
      var origMeasure = ctxProto.measureText;
      if (typeof origMeasure === 'function') {
        ctxProto.measureText = nativeWrap('measureText', function (self, args) {
          var m = origMeasure.apply(self, args);
          var width = m.width;
          try {
            var key = String(args[0] || '');
            var h = 2166136261;
            for (var i = 0; i < key.length; i++) {
              h ^= key.charCodeAt(i);
              h = Math.imul(h, 16777619);
            }
            var rng = mulberry32(h >>> 0);
            width = width * (1 + (rng() - 0.5) * 0.0004);
          } catch (e) {
            /* keep real width */
          }
          try {
            Object.defineProperty(m, 'width', { value: width, configurable: true });
          } catch (e) {
            /* TextMetrics may be frozen */
          }
          return m;
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Audio noise
  // ---------------------------------------------------------------------------

  if (CFG.audioNoiseEnabled && window.AudioBuffer) {
    var origGetChannelData = AudioBuffer.prototype.getChannelData;
    if (typeof origGetChannelData === 'function') {
      AudioBuffer.prototype.getChannelData = nativeWrap('getChannelData', function (self, args) {
        var data = origGetChannelData.apply(self, args);
        try {
          // Inaudible (≈ -100 dB), but changes the audio fingerprint hash.
          for (var i = 0; i < data.length; i++) {
            data[i] += (audioRng.next() - 0.5) * 0.00002;
          }
        } catch (e) {
          /* read-only buffer */
        }
        return data;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 7. WebRTC leak protection
  // ---------------------------------------------------------------------------

  if (CFG.webRTCLeakProtect && window.RTCPeerConnection) {
    function stripCandidates(sdp) {
      // Remove every candidate line so no local/public IP can leak into the
      // signaling channel; keep everything else structurally intact.
      return String(sdp).replace(/a=candidate:[^\r\n]*(?:\r\n|\n)/g, '');
    }

    var pcProto = RTCPeerConnection.prototype;
    var origCreateOffer = pcProto.createOffer;
    if (typeof origCreateOffer === 'function') {
      pcProto.createOffer = nativeWrap('createOffer', function (self, args) {
        var p = origCreateOffer.apply(self, args);
        if (p && typeof p.then === 'function') {
          return p.then(function (offer) {
            try {
              offer.sdp = stripCandidates(offer.sdp);
            } catch (e) {
              /* sdp may be read-only in odd cases */
            }
            return offer;
          });
        }
        return p;
      });
    }
    var origCreateAnswer = pcProto.createAnswer;
    if (typeof origCreateAnswer === 'function') {
      pcProto.createAnswer = nativeWrap('createAnswer', function (self, args) {
        var p = origCreateAnswer.apply(self, args);
        if (p && typeof p.then === 'function') {
          return p.then(function (answer) {
            try {
              answer.sdp = stripCandidates(answer.sdp);
            } catch (e) {
              /* ignore */
            }
            return answer;
          });
        }
        return p;
      });
    }

    // Also block non-mDNS ICE candidates injected from the page.
    var origAddIce = pcProto.addIceCandidate;
    if (typeof origAddIce === 'function') {
      pcProto.addIceCandidate = nativeWrap('addIceCandidate', function (self, args) {
        try {
          var cand = args[0];
          if (cand && cand.candidate) {
            var c = String(cand.candidate);
            if (c.indexOf('typ srflx') !== -1 || c.indexOf('typ host') !== -1 || c.indexOf('typ relay') !== -1) {
              return Promise.resolve();
            }
          }
        } catch (e) {
          /* ignore */
        }
        return origAddIce.apply(self, args);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Font fingerprint protection
  // ---------------------------------------------------------------------------

  if (CFG.fontFingerprintProtection && typeof document !== 'undefined' && document.fonts) {
    var whitelist = (CFG.fonts && CFG.fonts.length ? CFG.fonts : []).map(function (f) {
      return String(f).toLowerCase();
    });

    if (whitelist.length) {
      // 8a. Declare @font-face for each whitelisted family using local()
      //     sources — makes them (and only them) enumerable + check()-able.
      var style = document.createElement('style');
      style.setAttribute('data-stealth', 'fonts');
      var css = '';
      for (var fi = 0; fi < whitelist.length; fi++) {
        var fam = CFG.fonts[fi];
        css += '@font-face{font-family:"' + fam.replace(/"/g, '\\"') + '";src:local("' + fam.replace(/"/g, '\\"') + '");font-display:block;}\n';
      }
      style.textContent = css;
      try {
        (document.head || document.documentElement).appendChild(style);
      } catch (e) {
        /* documentElement may not exist yet at document_start */
      }

      // 8b. Filter FontFaceSet enumeration to the whitelist only.
      var FFSProto = Object.getPrototypeOf(document.fonts) || FontFaceSet.prototype;

      function isWhitelisted(face) {
        try {
          var family = String(face && face.family ? face.family : '').toLowerCase().replace(/^["']|["']$/g, '');
          return whitelist.indexOf(family) !== -1;
        } catch (e) {
          return false;
        }
      }

      function whitelistedList(self) {
        var out = [];
        var iter = FFSProto[Symbol.iterator] || FFSProto.entries;
        if (typeof iter === 'function') {
          try {
            var it = iter.call(self);
            var step;
            while (!(step = it.next()).done) {
              var face = step.value && step.value[1] !== undefined ? step.value[1] : step.value;
              if (isWhitelisted(face)) out.push(face);
            }
          } catch (e) {
            /* fall through */
          }
        }
        return out;
      }

      var origForEach = FFSProto.forEach;
      if (typeof origForEach === 'function') {
        FFSProto.forEach = nativeWrap('forEach', function (self, args) {
          var cb = args[0];
          var thisArg = args[1];
          var list = whitelistedList(self);
          for (var i = 0; i < list.length; i++) {
            cb.call(thisArg, list[i], list[i], self);
          }
        });
      }

      var origEntries = FFSProto.entries || FFSProto[Symbol.iterator];
      if (typeof origEntries === 'function') {
        var filteredIter = function (self) {
          var list = whitelistedList(self);
          var idx = 0;
          return {
            next: function () {
              if (idx >= list.length) return { done: true, value: undefined };
              var v = [list[idx], list[idx]];
              idx++;
              return { done: false, value: v };
            }
          };
        };
        FFSProto.entries = nativeWrap('entries', function (self) {
          return filteredIter(self);
        });
        try {
          FFSProto[Symbol.iterator] = nativeWrap('values', function (self) {
            var list = whitelistedList(self);
            var idx = 0;
            return {
              next: function () {
                if (idx >= list.length) return { done: true, value: undefined };
                var v = list[idx];
                idx++;
                return { done: false, value: v };
              }
            };
          });
        } catch (e) {
          /* Symbol.iterator not writable */
        }
      }

      // 8c. load()/check() probes: refuse non-whitelisted families.
      var origLoad = FFSProto.load;
      if (typeof origLoad === 'function') {
        FFSProto.load = nativeWrap('load', function (self, args) {
          var font = String(args[0] || '');
          var family = (font.match(/["']([^"']+)["']/) || [null, font.split(' ').pop()])[1];
          if (family && whitelist.indexOf(family.toLowerCase()) === -1) {
            return Promise.resolve([]);
          }
          return origLoad.apply(self, args);
        });
      }

      var origCheck = FFSProto.check;
      if (typeof origCheck === 'function') {
        FFSProto.check = nativeWrap('check', function (self, args) {
          var font = String(args[0] || '');
          var family = (font.match(/["']([^"']+)["']/) || [null, font.split(' ').pop()])[1];
          if (family && whitelist.indexOf(family.toLowerCase()) === -1) {
            return false;
          }
          return origCheck.apply(self, args);
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Geolocation
  // ---------------------------------------------------------------------------

  if (ENABLED && navigator.geolocation) {
    var geo = CFG.geolocation || { mode: 'block', latitude: 0, longitude: 0 };

    function deny(cb) {
      if (typeof cb === 'function') {
        setTimeout(function () {
          cb({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1 });
        }, 0);
      }
    }

    if (geo.mode === 'spoof') {
      var position = {
        coords: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          accuracy: 20 + Math.random() * 40,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };
      var origGetPos = navigator.geolocation.getCurrentPosition;
      navigator.geolocation.getCurrentPosition = nativeWrap('getCurrentPosition', function (self, args) {
        var success = args[0];
        if (typeof success === 'function') {
          setTimeout(function () {
            success(position);
          }, 0);
        }
      });
      var origWatch = navigator.geolocation.watchPosition;
      navigator.geolocation.watchPosition = nativeWrap('watchPosition', function (self, args) {
        var success = args[0];
        if (typeof success === 'function') {
          setTimeout(function () {
            success(position);
          }, 0);
        }
        return 1;
      });
    } else {
      navigator.geolocation.getCurrentPosition = nativeWrap('getCurrentPosition', function (self, args) {
        deny(args[1]);
      });
      navigator.geolocation.watchPosition = nativeWrap('watchPosition', function (self, args) {
        deny(args[1]);
        return 0;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Misc hardening
  // ---------------------------------------------------------------------------

  if (ENABLED) {
    // Permissions API: return consistent results based on the permissions policy.
    try {
      if (navigator.permissions && navigator.permissions.query) {
        var origQuery = navigator.permissions.query;
        var permPolicy = CFG.permissionsPolicy || {};
        // Default policy: geolocation follows the geo mode, others are 'prompt'.
        var defaultPermStates = {
          geolocation: (CFG.geolocation && CFG.geolocation.mode === 'spoof') ? 'granted' : 'denied',
          notifications: permPolicy.notifications || 'prompt',
          camera: permPolicy.camera || 'prompt',
          microphone: permPolicy.microphone || 'prompt',
          'persistent-storage': 'prompt',
          midi: 'prompt',
          'background-sync': 'granted'
        };
        navigator.permissions.query = nativeWrap('query', function (self, args) {
          var desc = args[0];
          if (desc && desc.name) {
            var state = defaultPermStates[desc.name];
            if (state) {
              return Promise.resolve({ state: state, onchange: null });
            }
          }
          return origQuery.call(self, desc);
        });
      }
    } catch (e) {
      /* ignore */
    }

    // navigator.connection spoofing — prevent connection type / speed fingerprinting.
    try {
      if (navigator.connection) {
        var connDownlink = CFG.connectionDownlink || 10;
        var connEffType = CFG.connectionEffectiveType || '4g';
        var connRtt = CFG.connectionRtt || 50;
        Object.defineProperty(navigator.connection, 'downlink', {
          get: function () { return connDownlink; },
          configurable: true
        });
        Object.defineProperty(navigator.connection, 'effectiveType', {
          get: function () { return connEffType; },
          configurable: true
        });
        Object.defineProperty(navigator.connection, 'rtt', {
          get: function () { return connRtt; },
          configurable: true
        });
        Object.defineProperty(navigator.connection, 'type', {
          get: function () { return 'wifi'; },
          configurable: true
        });
        Object.defineProperty(navigator.connection, 'saveData', {
          get: function () { return false; },
          configurable: true
        });
      }
    } catch (e) {
      /* ignore */
    }

    // MediaDevices enumeration protection — return a consistent, limited set
    // of devices instead of the real hardware list.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        var origEnumerate = navigator.mediaDevices.enumerateDevices;
        var fakeDevices = [
          { kind: 'audioinput', deviceId: 'default', groupId: 'default', label: '' },
          { kind: 'videoinput', deviceId: 'default', groupId: 'default', label: '' },
          { kind: 'audiooutput', deviceId: 'default', groupId: 'default', label: '' }
        ];
        navigator.mediaDevices.enumerateDevices = nativeWrap('enumerateDevices', function (self) {
          return Promise.resolve(fakeDevices);
        });
      }
    } catch (e) {
      /* ignore */
    }

    // navigator.getBattery() spoofing — prevent battery status fingerprinting.
    try {
      if (navigator.getBattery) {
        var fakeBattery = {
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: function () {},
          removeEventListener: function () {},
          dispatchEvent: function () { return true; },
          onchargingchange: null,
          onchargingtimechange: null,
          ondischargingtimechange: null,
          onlevelchange: null
        };
        navigator.getBattery = nativeWrap('getBattery', function () {
          return Promise.resolve(fakeBattery);
        });
      }
    } catch (e) {
      /* ignore */
    }

    // SpeechSynthesis voice enumeration protection — return a consistent
    // minimal voice set to prevent voice-based fingerprinting.
    try {
      if (window.speechSynthesis && window.speechSynthesis.getVoices) {
        var origGetVoices = window.speechSynthesis.getVoices;
        var cachedVoices = null;
        window.speechSynthesis.getVoices = nativeWrap('getVoices', function () {
          if (!cachedVoices) {
            try {
              var real = origGetVoices.call(window.speechSynthesis);
              // Keep only the first 2 voices to reduce fingerprint surface.
              if (real && real.length > 2) {
                cachedVoices = real.slice(0, 2);
              } else {
                cachedVoices = real;
              }
            } catch (e) {
              cachedVoices = [];
            }
          }
          return cachedVoices;
        });
      }
    } catch (e) {
      /* ignore */
    }

    // Make sure `window.chrome` exists only for Chromium-family UAs.
    // (Firefox lacks it; a Chrome UA on Firefox would be inconsistent, but if
    // the user chose a Chrome UA on Firefox we do NOT fake window.chrome —
    // that is documented as unsupported in the README.)
  }

  // Expose a marker so the fingerprint test page can confirm injection.
  try {
    Object.defineProperty(window, '__stealthBrowserEngine__', {
      value: { version: '1.0.0', injected: true },
      configurable: false,
      enumerable: false,
      writable: false
    });
  } catch (e) {
    /* ignore */
  }
})();
