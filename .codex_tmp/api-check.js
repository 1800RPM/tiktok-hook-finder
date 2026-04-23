// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = import.meta.require;

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/is.js
var require_is = __commonJS((exports, module) => {
  var defined = function(val) {
    return typeof val !== "undefined" && val !== null;
  };
  var object = function(val) {
    return typeof val === "object";
  };
  var plainObject = function(val) {
    return Object.prototype.toString.call(val) === "[object Object]";
  };
  var fn = function(val) {
    return typeof val === "function";
  };
  var bool = function(val) {
    return typeof val === "boolean";
  };
  var buffer = function(val) {
    return val instanceof Buffer;
  };
  var typedArray = function(val) {
    if (defined(val)) {
      switch (val.constructor) {
        case Uint8Array:
        case Uint8ClampedArray:
        case Int8Array:
        case Uint16Array:
        case Int16Array:
        case Uint32Array:
        case Int32Array:
        case Float32Array:
        case Float64Array:
          return true;
      }
    }
    return false;
  };
  var arrayBuffer = function(val) {
    return val instanceof ArrayBuffer;
  };
  var string = function(val) {
    return typeof val === "string" && val.length > 0;
  };
  var number = function(val) {
    return typeof val === "number" && !Number.isNaN(val);
  };
  var integer = function(val) {
    return Number.isInteger(val);
  };
  var inRange = function(val, min, max) {
    return val >= min && val <= max;
  };
  var inArray = function(val, list) {
    return list.includes(val);
  };
  var invalidParameterError = function(name, expected, actual) {
    return new Error(`Expected ${expected} for ${name} but received ${actual} of type ${typeof actual}`);
  };
  var nativeError = function(native, context) {
    context.message = native.message;
    return context;
  };
  module.exports = {
    defined,
    object,
    plainObject,
    fn,
    bool,
    buffer,
    typedArray,
    arrayBuffer,
    string,
    number,
    integer,
    inRange,
    inArray,
    invalidParameterError,
    nativeError
  };
});

// node_modules/.bun/detect-libc@2.1.2/node_modules/detect-libc/lib/process.js
var require_process = __commonJS((exports, module) => {
  var isLinux = () => process.platform === "linux";
  var report = null;
  var getReport = () => {
    if (!report) {
      if (isLinux() && process.report) {
        const orig = process.report.excludeNetwork;
        process.report.excludeNetwork = true;
        report = process.report.getReport();
        process.report.excludeNetwork = orig;
      } else {
        report = {};
      }
    }
    return report;
  };
  module.exports = { isLinux, getReport };
});

// node_modules/.bun/detect-libc@2.1.2/node_modules/detect-libc/lib/filesystem.js
var require_filesystem = __commonJS((exports, module) => {
  var fs = __require("fs");
  var LDD_PATH = "/usr/bin/ldd";
  var SELF_PATH = "/proc/self/exe";
  var MAX_LENGTH = 2048;
  var readFileSync2 = (path2) => {
    const fd = fs.openSync(path2, "r");
    const buffer = Buffer.alloc(MAX_LENGTH);
    const bytesRead = fs.readSync(fd, buffer, 0, MAX_LENGTH, 0);
    fs.close(fd, () => {});
    return buffer.subarray(0, bytesRead);
  };
  var readFile = (path2) => new Promise((resolve, reject) => {
    fs.open(path2, "r", (err, fd) => {
      if (err) {
        reject(err);
      } else {
        const buffer = Buffer.alloc(MAX_LENGTH);
        fs.read(fd, buffer, 0, MAX_LENGTH, 0, (_, bytesRead) => {
          resolve(buffer.subarray(0, bytesRead));
          fs.close(fd, () => {});
        });
      }
    });
  });
  module.exports = {
    LDD_PATH,
    SELF_PATH,
    readFileSync: readFileSync2,
    readFile
  };
});

// node_modules/.bun/detect-libc@2.1.2/node_modules/detect-libc/lib/elf.js
var require_elf = __commonJS((exports, module) => {
  var interpreterPath = (elf) => {
    if (elf.length < 64) {
      return null;
    }
    if (elf.readUInt32BE(0) !== 2135247942) {
      return null;
    }
    if (elf.readUInt8(4) !== 2) {
      return null;
    }
    if (elf.readUInt8(5) !== 1) {
      return null;
    }
    const offset = elf.readUInt32LE(32);
    const size = elf.readUInt16LE(54);
    const count = elf.readUInt16LE(56);
    for (let i = 0;i < count; i++) {
      const headerOffset = offset + i * size;
      const type = elf.readUInt32LE(headerOffset);
      if (type === 3) {
        const fileOffset = elf.readUInt32LE(headerOffset + 8);
        const fileSize = elf.readUInt32LE(headerOffset + 32);
        return elf.subarray(fileOffset, fileOffset + fileSize).toString().replace(/\0.*$/g, "");
      }
    }
    return null;
  };
  module.exports = {
    interpreterPath
  };
});

// node_modules/.bun/detect-libc@2.1.2/node_modules/detect-libc/lib/detect-libc.js
var require_detect_libc = __commonJS((exports, module) => {
  var childProcess = __require("child_process");
  var { isLinux, getReport } = require_process();
  var { LDD_PATH, SELF_PATH, readFile, readFileSync: readFileSync2 } = require_filesystem();
  var { interpreterPath } = require_elf();
  var cachedFamilyInterpreter;
  var cachedFamilyFilesystem;
  var cachedVersionFilesystem;
  var command = "getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true";
  var commandOut = "";
  var safeCommand = () => {
    if (!commandOut) {
      return new Promise((resolve) => {
        childProcess.exec(command, (err, out) => {
          commandOut = err ? " " : out;
          resolve(commandOut);
        });
      });
    }
    return commandOut;
  };
  var safeCommandSync = () => {
    if (!commandOut) {
      try {
        commandOut = childProcess.execSync(command, { encoding: "utf8" });
      } catch (_err) {
        commandOut = " ";
      }
    }
    return commandOut;
  };
  var GLIBC = "glibc";
  var RE_GLIBC_VERSION = /LIBC[a-z0-9 \-).]*?(\d+\.\d+)/i;
  var MUSL = "musl";
  var isFileMusl = (f) => f.includes("libc.musl-") || f.includes("ld-musl-");
  var familyFromReport = () => {
    const report = getReport();
    if (report.header && report.header.glibcVersionRuntime) {
      return GLIBC;
    }
    if (Array.isArray(report.sharedObjects)) {
      if (report.sharedObjects.some(isFileMusl)) {
        return MUSL;
      }
    }
    return null;
  };
  var familyFromCommand = (out) => {
    const [getconf, ldd1] = out.split(/[\r\n]+/);
    if (getconf && getconf.includes(GLIBC)) {
      return GLIBC;
    }
    if (ldd1 && ldd1.includes(MUSL)) {
      return MUSL;
    }
    return null;
  };
  var familyFromInterpreterPath = (path2) => {
    if (path2) {
      if (path2.includes("/ld-musl-")) {
        return MUSL;
      } else if (path2.includes("/ld-linux-")) {
        return GLIBC;
      }
    }
    return null;
  };
  var getFamilyFromLddContent = (content) => {
    content = content.toString();
    if (content.includes("musl")) {
      return MUSL;
    }
    if (content.includes("GNU C Library")) {
      return GLIBC;
    }
    return null;
  };
  var familyFromFilesystem = async () => {
    if (cachedFamilyFilesystem !== undefined) {
      return cachedFamilyFilesystem;
    }
    cachedFamilyFilesystem = null;
    try {
      const lddContent = await readFile(LDD_PATH);
      cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
    } catch (e) {}
    return cachedFamilyFilesystem;
  };
  var familyFromFilesystemSync = () => {
    if (cachedFamilyFilesystem !== undefined) {
      return cachedFamilyFilesystem;
    }
    cachedFamilyFilesystem = null;
    try {
      const lddContent = readFileSync2(LDD_PATH);
      cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
    } catch (e) {}
    return cachedFamilyFilesystem;
  };
  var familyFromInterpreter = async () => {
    if (cachedFamilyInterpreter !== undefined) {
      return cachedFamilyInterpreter;
    }
    cachedFamilyInterpreter = null;
    try {
      const selfContent = await readFile(SELF_PATH);
      const path2 = interpreterPath(selfContent);
      cachedFamilyInterpreter = familyFromInterpreterPath(path2);
    } catch (e) {}
    return cachedFamilyInterpreter;
  };
  var familyFromInterpreterSync = () => {
    if (cachedFamilyInterpreter !== undefined) {
      return cachedFamilyInterpreter;
    }
    cachedFamilyInterpreter = null;
    try {
      const selfContent = readFileSync2(SELF_PATH);
      const path2 = interpreterPath(selfContent);
      cachedFamilyInterpreter = familyFromInterpreterPath(path2);
    } catch (e) {}
    return cachedFamilyInterpreter;
  };
  var family = async () => {
    let family2 = null;
    if (isLinux()) {
      family2 = await familyFromInterpreter();
      if (!family2) {
        family2 = await familyFromFilesystem();
        if (!family2) {
          family2 = familyFromReport();
        }
        if (!family2) {
          const out = await safeCommand();
          family2 = familyFromCommand(out);
        }
      }
    }
    return family2;
  };
  var familySync = () => {
    let family2 = null;
    if (isLinux()) {
      family2 = familyFromInterpreterSync();
      if (!family2) {
        family2 = familyFromFilesystemSync();
        if (!family2) {
          family2 = familyFromReport();
        }
        if (!family2) {
          const out = safeCommandSync();
          family2 = familyFromCommand(out);
        }
      }
    }
    return family2;
  };
  var isNonGlibcLinux = async () => isLinux() && await family() !== GLIBC;
  var isNonGlibcLinuxSync = () => isLinux() && familySync() !== GLIBC;
  var versionFromFilesystem = async () => {
    if (cachedVersionFilesystem !== undefined) {
      return cachedVersionFilesystem;
    }
    cachedVersionFilesystem = null;
    try {
      const lddContent = await readFile(LDD_PATH);
      const versionMatch = lddContent.match(RE_GLIBC_VERSION);
      if (versionMatch) {
        cachedVersionFilesystem = versionMatch[1];
      }
    } catch (e) {}
    return cachedVersionFilesystem;
  };
  var versionFromFilesystemSync = () => {
    if (cachedVersionFilesystem !== undefined) {
      return cachedVersionFilesystem;
    }
    cachedVersionFilesystem = null;
    try {
      const lddContent = readFileSync2(LDD_PATH);
      const versionMatch = lddContent.match(RE_GLIBC_VERSION);
      if (versionMatch) {
        cachedVersionFilesystem = versionMatch[1];
      }
    } catch (e) {}
    return cachedVersionFilesystem;
  };
  var versionFromReport = () => {
    const report = getReport();
    if (report.header && report.header.glibcVersionRuntime) {
      return report.header.glibcVersionRuntime;
    }
    return null;
  };
  var versionSuffix = (s) => s.trim().split(/\s+/)[1];
  var versionFromCommand = (out) => {
    const [getconf, ldd1, ldd2] = out.split(/[\r\n]+/);
    if (getconf && getconf.includes(GLIBC)) {
      return versionSuffix(getconf);
    }
    if (ldd1 && ldd2 && ldd1.includes(MUSL)) {
      return versionSuffix(ldd2);
    }
    return null;
  };
  var version = async () => {
    let version2 = null;
    if (isLinux()) {
      version2 = await versionFromFilesystem();
      if (!version2) {
        version2 = versionFromReport();
      }
      if (!version2) {
        const out = await safeCommand();
        version2 = versionFromCommand(out);
      }
    }
    return version2;
  };
  var versionSync = () => {
    let version2 = null;
    if (isLinux()) {
      version2 = versionFromFilesystemSync();
      if (!version2) {
        version2 = versionFromReport();
      }
      if (!version2) {
        const out = safeCommandSync();
        version2 = versionFromCommand(out);
      }
    }
    return version2;
  };
  module.exports = {
    GLIBC,
    MUSL,
    family,
    familySync,
    isNonGlibcLinux,
    isNonGlibcLinuxSync,
    version,
    versionSync
  };
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/internal/debug.js
var require_debug = __commonJS((exports, module) => {
  var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
  module.exports = debug;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/internal/constants.js
var require_constants = __commonJS((exports, module) => {
  var SEMVER_SPEC_VERSION = "2.0.0";
  var MAX_LENGTH = 256;
  var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
  var MAX_SAFE_COMPONENT_LENGTH = 16;
  var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
  var RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease"
  ];
  module.exports = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  };
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/internal/re.js
var require_re = __commonJS((exports, module) => {
  var {
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_LENGTH
  } = require_constants();
  var debug = require_debug();
  exports = module.exports = {};
  var re = exports.re = [];
  var safeRe = exports.safeRe = [];
  var src = exports.src = [];
  var safeSrc = exports.safeSrc = [];
  var t = exports.t = {};
  var R = 0;
  var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  var safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
  ];
  var makeSafeRegex = (value) => {
    for (const [token, max] of safeRegexReplacements) {
      value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
    }
    return value;
  };
  var createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug(name, index, value);
    t[name] = index;
    src[index] = value;
    safeSrc[index] = safe;
    re[index] = new RegExp(value, isGlobal ? "g" : undefined);
    safeRe[index] = new RegExp(safe, isGlobal ? "g" : undefined);
  };
  createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
  createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.` + `(${src[t.NUMERICIDENTIFIER]})\\.` + `(${src[t.NUMERICIDENTIFIER]})`);
  createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` + `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` + `(${src[t.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
  createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
  createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
  createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
  createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
  createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
  createToken("FULL", `^${src[t.FULLPLAIN]}$`);
  createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
  createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
  createToken("GTLT", "((?:<|>)?=?)");
  createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` + `(?:\\.(${src[t.XRANGEIDENTIFIER]})` + `(?:\\.(${src[t.XRANGEIDENTIFIER]})` + `(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?` + `)?)?`);
  createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?` + `)?)?`);
  createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
  createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("COERCEPLAIN", `${"(^|[^\\d])" + "(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})` + `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` + `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
  createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?` + `(?:${src[t.BUILD]})?` + `(?:$|[^\\d])`);
  createToken("COERCERTL", src[t.COERCE], true);
  createToken("COERCERTLFULL", src[t.COERCEFULL], true);
  createToken("LONETILDE", "(?:~>?)");
  createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
  exports.tildeTrimReplace = "$1~";
  createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
  createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("LONECARET", "(?:\\^)");
  createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
  exports.caretTrimReplace = "$1^";
  createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
  createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
  createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
  createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
  exports.comparatorTrimReplace = "$1$2$3";
  createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})` + `\\s+-\\s+` + `(${src[t.XRANGEPLAIN]})` + `\\s*$`);
  createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})` + `\\s+-\\s+` + `(${src[t.XRANGEPLAINLOOSE]})` + `\\s*$`);
  createToken("STAR", "(<|>)?=?\\s*\\*");
  createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS((exports, module) => {
  var looseOption = Object.freeze({ loose: true });
  var emptyOpts = Object.freeze({});
  var parseOptions = (options) => {
    if (!options) {
      return emptyOpts;
    }
    if (typeof options !== "object") {
      return looseOption;
    }
    return options;
  };
  module.exports = parseOptions;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS((exports, module) => {
  var numeric = /^[0-9]+$/;
  var compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a === b ? 0 : a < b ? -1 : 1;
    }
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  module.exports = {
    compareIdentifiers,
    rcompareIdentifiers
  };
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/classes/semver.js
var require_semver = __commonJS((exports, module) => {
  var debug = require_debug();
  var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
  var { safeRe: re, t } = require_re();
  var parseOptions = require_parse_options();
  var { compareIdentifiers } = require_identifiers();

  class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
          return version;
        } else {
          version = version.version;
        }
      } else if (typeof version !== "string") {
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      }
      if (version.length > MAX_LENGTH) {
        throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
      }
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
      if (!m) {
        throw new TypeError(`Invalid Version: ${version}`);
      }
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            const num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) {
        this.version += `-${this.prerelease.join(".")}`;
      }
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) {
          return 0;
        }
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) {
        return 0;
      }
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.major < other.major) {
        return -1;
      }
      if (this.major > other.major) {
        return 1;
      }
      if (this.minor < other.minor) {
        return -1;
      }
      if (this.minor > other.minor) {
        return 1;
      }
      if (this.patch < other.patch) {
        return -1;
      }
      if (this.patch > other.patch) {
        return 1;
      }
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === undefined && b === undefined) {
          return 0;
        } else if (b === undefined) {
          return 1;
        } else if (a === undefined) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === undefined && b === undefined) {
          return 0;
        } else if (b === undefined) {
          return 1;
        } else if (a === undefined) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (identifier) {
          const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
          if (!match || match[1] !== identifier) {
            throw new Error(`invalid identifier: ${identifier}`);
          }
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier, identifierBase);
          }
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0) {
            throw new Error(`version ${this.raw} is not a prerelease`);
          }
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) {
            this.prerelease = [base];
          } else {
            let i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false) {
                throw new Error("invalid increment argument: identifier already exists");
              }
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) {
              prerelease = [identifier];
            }
            if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
              if (isNaN(this.prerelease[1])) {
                this.prerelease = prerelease;
              }
            } else {
              this.prerelease = prerelease;
            }
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) {
        this.raw += `+${this.build.join(".")}`;
      }
      return this;
    }
  }
  module.exports = SemVer;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/parse.js
var require_parse = __commonJS((exports, module) => {
  var SemVer = require_semver();
  var parse = (version, options, throwErrors = false) => {
    if (version instanceof SemVer) {
      return version;
    }
    try {
      return new SemVer(version, options);
    } catch (er) {
      if (!throwErrors) {
        return null;
      }
      throw er;
    }
  };
  module.exports = parse;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/coerce.js
var require_coerce = __commonJS((exports, module) => {
  var SemVer = require_semver();
  var parse = require_parse();
  var { safeRe: re, t } = require_re();
  var coerce = (version, options) => {
    if (version instanceof SemVer) {
      return version;
    }
    if (typeof version === "number") {
      version = String(version);
    }
    if (typeof version !== "string") {
      return null;
    }
    options = options || {};
    let match = null;
    if (!options.rtl) {
      match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
    } else {
      const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
      let next;
      while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    const major = match[2];
    const minor = match[3] || "0";
    const patch = match[4] || "0";
    const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
  };
  module.exports = coerce;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/compare.js
var require_compare = __commonJS((exports, module) => {
  var SemVer = require_semver();
  var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  module.exports = compare;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/gte.js
var require_gte = __commonJS((exports, module) => {
  var compare = require_compare();
  var gte = (a, b, loose) => compare(a, b, loose) >= 0;
  module.exports = gte;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS((exports, module) => {
  class LRUCache {
    constructor() {
      this.max = 1000;
      this.map = new Map;
    }
    get(key) {
      const value = this.map.get(key);
      if (value === undefined) {
        return;
      } else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      const deleted = this.delete(key);
      if (!deleted && value !== undefined) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  }
  module.exports = LRUCache;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/eq.js
var require_eq = __commonJS((exports, module) => {
  var compare = require_compare();
  var eq = (a, b, loose) => compare(a, b, loose) === 0;
  module.exports = eq;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/neq.js
var require_neq = __commonJS((exports, module) => {
  var compare = require_compare();
  var neq = (a, b, loose) => compare(a, b, loose) !== 0;
  module.exports = neq;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/gt.js
var require_gt = __commonJS((exports, module) => {
  var compare = require_compare();
  var gt = (a, b, loose) => compare(a, b, loose) > 0;
  module.exports = gt;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/lt.js
var require_lt = __commonJS((exports, module) => {
  var compare = require_compare();
  var lt = (a, b, loose) => compare(a, b, loose) < 0;
  module.exports = lt;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/lte.js
var require_lte = __commonJS((exports, module) => {
  var compare = require_compare();
  var lte = (a, b, loose) => compare(a, b, loose) <= 0;
  module.exports = lte;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS((exports, module) => {
  var eq = require_eq();
  var neq = require_neq();
  var gt = require_gt();
  var gte = require_gte();
  var lt = require_lt();
  var lte = require_lte();
  var cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a === b;
      case "!==":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  module.exports = cmp;
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/classes/comparator.js
var require_comparator = __commonJS((exports, module) => {
  var ANY = Symbol("SemVer ANY");

  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== undefined ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  module.exports = Comparator;
  var parseOptions = require_parse_options();
  var { safeRe: re, t } = require_re();
  var cmp = require_cmp();
  var debug = require_debug();
  var SemVer = require_semver();
  var Range = require_range();
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/classes/range.js
var require_range = __commonJS((exports, module) => {
  var SPACE_CHARACTERS = /\s+/g;

  class Range {
    constructor(range, options) {
      options = parseOptions(options);
      if (range instanceof Range) {
        if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
          return range;
        } else {
          return new Range(range.raw, options);
        }
      }
      if (range instanceof Comparator) {
        this.raw = range.value;
        this.set = [[range]];
        this.formatted = undefined;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = undefined;
    }
    get range() {
      if (this.formatted === undefined) {
        this.formatted = "";
        for (let i = 0;i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0;k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range) {
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
      range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range);
      range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range);
      range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range);
      range = range.replace(re[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range);
      let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re[t.COMPARATORLOOSE]);
        });
      }
      debug("range list", rangeList);
      const rangeMap = new Map;
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range, options) {
      if (!(range instanceof Range)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0;i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  module.exports = Range;
  var LRU = require_lrucache();
  var cache = new LRU;
  var parseOptions = require_parse_options();
  var Comparator = require_comparator();
  var debug = require_debug();
  var SemVer = require_semver();
  var {
    safeRe: re,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = require_re();
  var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
  var isNullSet = (c) => c.value === "<0.0.0-0";
  var isAny = (c) => c.value === "";
  var isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  var parseComparator = (comp, options) => {
    comp = comp.replace(re[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
  var replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  var replaceTilde = (comp, options) => {
    const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug("tilde return", ret);
      return ret;
    });
  };
  var replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  var replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug("caret return", ret);
      return ret;
    });
  };
  var replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  var replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug("xRange return", ret);
      return ret;
    });
  };
  var replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re[t.STAR], "");
  };
  var replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  var testSet = (set, version, options) => {
    for (let i = 0;i < set.length; i++) {
      if (!set[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0;i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
});

// node_modules/.bun/semver@7.7.4/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS((exports, module) => {
  var Range = require_range();
  var satisfies = (version, range, options) => {
    try {
      range = new Range(range, options);
    } catch (er) {
      return false;
    }
    return range.test(version);
  };
  module.exports = satisfies;
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/package.json
var require_package = __commonJS((exports, module) => {
  module.exports = {
    name: "sharp",
    description: "High performance Node.js image processing, the fastest module to resize JPEG, PNG, WebP, GIF, AVIF and TIFF images",
    version: "0.33.5",
    author: "Lovell Fuller <npm@lovell.info>",
    homepage: "https://sharp.pixelplumbing.com",
    contributors: [
      "Pierre Inglebert <pierre.inglebert@gmail.com>",
      "Jonathan Ong <jonathanrichardong@gmail.com>",
      "Chanon Sajjamanochai <chanon.s@gmail.com>",
      "Juliano Julio <julianojulio@gmail.com>",
      "Daniel Gasienica <daniel@gasienica.ch>",
      "Julian Walker <julian@fiftythree.com>",
      "Amit Pitaru <pitaru.amit@gmail.com>",
      "Brandon Aaron <hello.brandon@aaron.sh>",
      "Andreas Lind <andreas@one.com>",
      "Maurus Cuelenaere <mcuelenaere@gmail.com>",
      "Linus Unneb\xE4ck <linus@folkdatorn.se>",
      "Victor Mateevitsi <mvictoras@gmail.com>",
      "Alaric Holloway <alaric.holloway@gmail.com>",
      "Bernhard K. Weisshuhn <bkw@codingforce.com>",
      "Chris Riley <criley@primedia.com>",
      "David Carley <dacarley@gmail.com>",
      "John Tobin <john@limelightmobileinc.com>",
      "Kenton Gray <kentongray@gmail.com>",
      "Felix B\xFCnemann <Felix.Buenemann@gmail.com>",
      "Samy Al Zahrani <samyalzahrany@gmail.com>",
      "Chintan Thakkar <lemnisk8@gmail.com>",
      "F. Orlando Galashan <frulo@gmx.de>",
      "Kleis Auke Wolthuizen <info@kleisauke.nl>",
      "Matt Hirsch <mhirsch@media.mit.edu>",
      "Matthias Thoemmes <thoemmes@gmail.com>",
      "Patrick Paskaris <patrick@paskaris.gr>",
      "J\xE9r\xE9my Lal <kapouer@melix.org>",
      "Rahul Nanwani <r.nanwani@gmail.com>",
      "Alice Monday <alice0meta@gmail.com>",
      "Kristo Jorgenson <kristo.jorgenson@gmail.com>",
      "YvesBos <yves_bos@outlook.com>",
      "Guy Maliar <guy@tailorbrands.com>",
      "Nicolas Coden <nicolas@ncoden.fr>",
      "Matt Parrish <matt.r.parrish@gmail.com>",
      "Marcel Bretschneider <marcel.bretschneider@gmail.com>",
      "Matthew McEachen <matthew+github@mceachen.org>",
      "Jarda Kot\u011B\u0161ovec <jarda.kotesovec@gmail.com>",
      "Kenric D'Souza <kenric.dsouza@gmail.com>",
      "Oleh Aleinyk <oleg.aleynik@gmail.com>",
      "Marcel Bretschneider <marcel.bretschneider@gmail.com>",
      "Andrea Bianco <andrea.bianco@unibas.ch>",
      "Rik Heywood <rik@rik.org>",
      "Thomas Parisot <hi@oncletom.io>",
      "Nathan Graves <nathanrgraves+github@gmail.com>",
      "Tom Lokhorst <tom@lokhorst.eu>",
      "Espen Hovlandsdal <espen@hovlandsdal.com>",
      "Sylvain Dumont <sylvain.dumont35@gmail.com>",
      "Alun Davies <alun.owain.davies@googlemail.com>",
      "Aidan Hoolachan <ajhoolachan21@gmail.com>",
      "Axel Eirola <axel.eirola@iki.fi>",
      "Freezy <freezy@xbmc.org>",
      "Daiz <taneli.vatanen@gmail.com>",
      "Julian Aubourg <j@ubourg.net>",
      "Keith Belovay <keith@picthrive.com>",
      "Michael B. Klein <mbklein@gmail.com>",
      "Jordan Prudhomme <jordan@raboland.fr>",
      "Ilya Ovdin <iovdin@gmail.com>",
      "Andargor <andargor@yahoo.com>",
      "Paul Neave <paul.neave@gmail.com>",
      "Brendan Kennedy <brenwken@gmail.com>",
      "Brychan Bennett-Odlum <git@brychan.io>",
      "Edward Silverton <e.silverton@gmail.com>",
      "Roman Malieiev <aromaleev@gmail.com>",
      "Tomas Szabo <tomas.szabo@deftomat.com>",
      "Robert O'Rourke <robert@o-rourke.org>",
      "Guillermo Alfonso Varela Chouci\xF1o <guillevch@gmail.com>",
      "Christian Flintrup <chr@gigahost.dk>",
      "Manan Jadhav <manan@motionden.com>",
      "Leon Radley <leon@radley.se>",
      "alza54 <alza54@thiocod.in>",
      "Jacob Smith <jacob@frende.me>",
      "Michael Nutt <michael@nutt.im>",
      "Brad Parham <baparham@gmail.com>",
      "Taneli Vatanen <taneli.vatanen@gmail.com>",
      "Joris Dugu\xE9 <zaruike10@gmail.com>",
      "Chris Banks <christopher.bradley.banks@gmail.com>",
      "Ompal Singh <ompal.hitm09@gmail.com>",
      "Brodan <christopher.hranj@gmail.com>",
      "Ankur Parihar <ankur.github@gmail.com>",
      "Brahim Ait elhaj <brahima@gmail.com>",
      "Mart Jansink <m.jansink@gmail.com>",
      "Lachlan Newman <lachnewman007@gmail.com>",
      "Dennis Beatty <dennis@dcbeatty.com>",
      "Ingvar Stepanyan <me@rreverser.com>",
      "Don Denton <don@happycollision.com>"
    ],
    scripts: {
      install: "node install/check",
      clean: "rm -rf src/build/ .nyc_output/ coverage/ test/fixtures/output.*",
      test: "npm run test-lint && npm run test-unit && npm run test-licensing && npm run test-types",
      "test-lint": "semistandard && cpplint",
      "test-unit": "nyc --reporter=lcov --reporter=text --check-coverage --branches=100 mocha",
      "test-licensing": 'license-checker --production --summary --onlyAllow="Apache-2.0;BSD;ISC;LGPL-3.0-or-later;MIT"',
      "test-leak": "./test/leak/leak.sh",
      "test-types": "tsd",
      "package-from-local-build": "node npm/from-local-build",
      "package-from-github-release": "node npm/from-github-release",
      "docs-build": "node docs/build && node docs/search-index/build",
      "docs-serve": "cd docs && npx serve",
      "docs-publish": "cd docs && npx firebase-tools deploy --project pixelplumbing --only hosting:pixelplumbing-sharp"
    },
    type: "commonjs",
    main: "lib/index.js",
    types: "lib/index.d.ts",
    files: [
      "install",
      "lib",
      "src/*.{cc,h,gyp}"
    ],
    repository: {
      type: "git",
      url: "git://github.com/lovell/sharp.git"
    },
    keywords: [
      "jpeg",
      "png",
      "webp",
      "avif",
      "tiff",
      "gif",
      "svg",
      "jp2",
      "dzi",
      "image",
      "resize",
      "thumbnail",
      "crop",
      "embed",
      "libvips",
      "vips"
    ],
    dependencies: {
      color: "^4.2.3",
      "detect-libc": "^2.0.3",
      semver: "^7.6.3"
    },
    optionalDependencies: {
      "@img/sharp-darwin-arm64": "0.33.5",
      "@img/sharp-darwin-x64": "0.33.5",
      "@img/sharp-libvips-darwin-arm64": "1.0.4",
      "@img/sharp-libvips-darwin-x64": "1.0.4",
      "@img/sharp-libvips-linux-arm": "1.0.5",
      "@img/sharp-libvips-linux-arm64": "1.0.4",
      "@img/sharp-libvips-linux-s390x": "1.0.4",
      "@img/sharp-libvips-linux-x64": "1.0.4",
      "@img/sharp-libvips-linuxmusl-arm64": "1.0.4",
      "@img/sharp-libvips-linuxmusl-x64": "1.0.4",
      "@img/sharp-linux-arm": "0.33.5",
      "@img/sharp-linux-arm64": "0.33.5",
      "@img/sharp-linux-s390x": "0.33.5",
      "@img/sharp-linux-x64": "0.33.5",
      "@img/sharp-linuxmusl-arm64": "0.33.5",
      "@img/sharp-linuxmusl-x64": "0.33.5",
      "@img/sharp-wasm32": "0.33.5",
      "@img/sharp-win32-ia32": "0.33.5",
      "@img/sharp-win32-x64": "0.33.5"
    },
    devDependencies: {
      "@emnapi/runtime": "^1.2.0",
      "@img/sharp-libvips-dev": "1.0.4",
      "@img/sharp-libvips-dev-wasm32": "1.0.5",
      "@img/sharp-libvips-win32-ia32": "1.0.4",
      "@img/sharp-libvips-win32-x64": "1.0.4",
      "@types/node": "*",
      async: "^3.2.5",
      cc: "^3.0.1",
      emnapi: "^1.2.0",
      "exif-reader": "^2.0.1",
      "extract-zip": "^2.0.1",
      icc: "^3.0.0",
      "jsdoc-to-markdown": "^8.0.3",
      "license-checker": "^25.0.1",
      mocha: "^10.7.3",
      "node-addon-api": "^8.1.0",
      nyc: "^17.0.0",
      prebuild: "^13.0.1",
      semistandard: "^17.0.0",
      "tar-fs": "^3.0.6",
      tsd: "^0.31.1"
    },
    license: "Apache-2.0",
    engines: {
      node: "^18.17.0 || ^20.3.0 || >=21.0.0"
    },
    config: {
      libvips: ">=8.15.3"
    },
    funding: {
      url: "https://opencollective.com/libvips"
    },
    binary: {
      napi_versions: [
        9
      ]
    },
    semistandard: {
      env: [
        "mocha"
      ]
    },
    cc: {
      linelength: "120",
      filter: [
        "build/include"
      ]
    },
    nyc: {
      include: [
        "lib"
      ]
    },
    tsd: {
      directory: "test/types/"
    }
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/libvips.js
var require_libvips = __commonJS((exports, module) => {
  var { spawnSync } = __require("child_process");
  var { createHash } = __require("crypto");
  var semverCoerce = require_coerce();
  var semverGreaterThanOrEqualTo = require_gte();
  var semverSatisfies = require_satisfies();
  var detectLibc = require_detect_libc();
  var { config, engines, optionalDependencies } = require_package();
  var minimumLibvipsVersionLabelled = process.env.npm_package_config_libvips || config.libvips;
  var minimumLibvipsVersion = semverCoerce(minimumLibvipsVersionLabelled).version;
  var prebuiltPlatforms = [
    "darwin-arm64",
    "darwin-x64",
    "linux-arm",
    "linux-arm64",
    "linux-s390x",
    "linux-x64",
    "linuxmusl-arm64",
    "linuxmusl-x64",
    "win32-ia32",
    "win32-x64"
  ];
  var spawnSyncOptions = {
    encoding: "utf8",
    shell: true
  };
  var log = (item) => {
    if (item instanceof Error) {
      console.error(`sharp: Installation error: ${item.message}`);
    } else {
      console.log(`sharp: ${item}`);
    }
  };
  var runtimeLibc = () => detectLibc.isNonGlibcLinuxSync() ? detectLibc.familySync() : "";
  var runtimePlatformArch = () => `${process.platform}${runtimeLibc()}-${process.arch}`;
  var buildPlatformArch = () => {
    if (isEmscripten()) {
      return "wasm32";
    }
    const { npm_config_arch, npm_config_platform, npm_config_libc } = process.env;
    const libc = typeof npm_config_libc === "string" ? npm_config_libc : runtimeLibc();
    return `${npm_config_platform || process.platform}${libc}-${npm_config_arch || process.arch}`;
  };
  var buildSharpLibvipsIncludeDir = () => {
    try {
      return __require(`@img/sharp-libvips-dev-${buildPlatformArch()}/include`);
    } catch {
      try {
        return (()=>{throw new Error("Cannot require module "+"@img/sharp-libvips-dev/include");})();
      } catch {}
    }
    return "";
  };
  var buildSharpLibvipsCPlusPlusDir = () => {
    try {
      return (()=>{throw new Error("Cannot require module "+"@img/sharp-libvips-dev/cplusplus");})();
    } catch {}
    return "";
  };
  var buildSharpLibvipsLibDir = () => {
    try {
      return __require(`@img/sharp-libvips-dev-${buildPlatformArch()}/lib`);
    } catch {
      try {
        return __require(`@img/sharp-libvips-${buildPlatformArch()}/lib`);
      } catch {}
    }
    return "";
  };
  var isUnsupportedNodeRuntime = () => {
    if (process.release?.name === "node" && process.versions) {
      if (!semverSatisfies(process.versions.node, engines.node)) {
        return { found: process.versions.node, expected: engines.node };
      }
    }
  };
  var isEmscripten = () => {
    const { CC } = process.env;
    return Boolean(CC && CC.endsWith("/emcc"));
  };
  var isRosetta = () => {
    if (process.platform === "darwin" && process.arch === "x64") {
      const translated = spawnSync("sysctl sysctl.proc_translated", spawnSyncOptions).stdout;
      return (translated || "").trim() === "sysctl.proc_translated: 1";
    }
    return false;
  };
  var sha512 = (s) => createHash("sha512").update(s).digest("hex");
  var yarnLocator = () => {
    try {
      const identHash = sha512(`imgsharp-libvips-${buildPlatformArch()}`);
      const npmVersion = semverCoerce(optionalDependencies[`@img/sharp-libvips-${buildPlatformArch()}`]).version;
      return sha512(`${identHash}npm:${npmVersion}`).slice(0, 10);
    } catch {}
    return "";
  };
  var spawnRebuild = () => spawnSync(`node-gyp rebuild --directory=src ${isEmscripten() ? "--nodedir=emscripten" : ""}`, {
    ...spawnSyncOptions,
    stdio: "inherit"
  }).status;
  var globalLibvipsVersion = () => {
    if (process.platform !== "win32") {
      const globalLibvipsVersion2 = spawnSync("pkg-config --modversion vips-cpp", {
        ...spawnSyncOptions,
        env: {
          ...process.env,
          PKG_CONFIG_PATH: pkgConfigPath()
        }
      }).stdout;
      return (globalLibvipsVersion2 || "").trim();
    } else {
      return "";
    }
  };
  var pkgConfigPath = () => {
    if (process.platform !== "win32") {
      const brewPkgConfigPath = spawnSync('which brew >/dev/null 2>&1 && brew environment --plain | grep PKG_CONFIG_LIBDIR | cut -d" " -f2', spawnSyncOptions).stdout || "";
      return [
        brewPkgConfigPath.trim(),
        process.env.PKG_CONFIG_PATH,
        "/usr/local/lib/pkgconfig",
        "/usr/lib/pkgconfig",
        "/usr/local/libdata/pkgconfig",
        "/usr/libdata/pkgconfig"
      ].filter(Boolean).join(":");
    } else {
      return "";
    }
  };
  var skipSearch = (status, reason, logger) => {
    if (logger) {
      logger(`Detected ${reason}, skipping search for globally-installed libvips`);
    }
    return status;
  };
  var useGlobalLibvips = (logger) => {
    if (Boolean(process.env.SHARP_IGNORE_GLOBAL_LIBVIPS) === true) {
      return skipSearch(false, "SHARP_IGNORE_GLOBAL_LIBVIPS", logger);
    }
    if (Boolean(process.env.SHARP_FORCE_GLOBAL_LIBVIPS) === true) {
      return skipSearch(true, "SHARP_FORCE_GLOBAL_LIBVIPS", logger);
    }
    if (isRosetta()) {
      return skipSearch(false, "Rosetta", logger);
    }
    const globalVipsVersion = globalLibvipsVersion();
    return !!globalVipsVersion && semverGreaterThanOrEqualTo(globalVipsVersion, minimumLibvipsVersion);
  };
  module.exports = {
    minimumLibvipsVersion,
    prebuiltPlatforms,
    buildPlatformArch,
    buildSharpLibvipsIncludeDir,
    buildSharpLibvipsCPlusPlusDir,
    buildSharpLibvipsLibDir,
    isUnsupportedNodeRuntime,
    runtimePlatformArch,
    log,
    yarnLocator,
    spawnRebuild,
    globalLibvipsVersion,
    pkgConfigPath,
    useGlobalLibvips
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/sharp.js
var require_sharp = __commonJS((exports, module) => {
  var { familySync, versionSync } = require_detect_libc();
  var { runtimePlatformArch, isUnsupportedNodeRuntime, prebuiltPlatforms, minimumLibvipsVersion } = require_libvips();
  var runtimePlatform = runtimePlatformArch();
  var paths = [
    `../src/build/Release/sharp-${runtimePlatform}.node`,
    "../src/build/Release/sharp-wasm32.node",
    `@img/sharp-${runtimePlatform}/sharp.node`,
    "@img/sharp-wasm32/sharp.node"
  ];
  var sharp;
  var errors = [];
  for (const path2 of paths) {
    try {
      sharp = __require(path2);
      break;
    } catch (err) {
      errors.push(err);
    }
  }
  if (sharp) {
    module.exports = sharp;
  } else {
    const [isLinux, isMacOs, isWindows] = ["linux", "darwin", "win32"].map((os) => runtimePlatform.startsWith(os));
    const help = [`Could not load the "sharp" module using the ${runtimePlatform} runtime`];
    errors.forEach((err) => {
      if (err.code !== "MODULE_NOT_FOUND") {
        help.push(`${err.code}: ${err.message}`);
      }
    });
    const messages = errors.map((err) => err.message).join(" ");
    help.push("Possible solutions:");
    if (isUnsupportedNodeRuntime()) {
      const { found, expected } = isUnsupportedNodeRuntime();
      help.push("- Please upgrade Node.js:", `    Found ${found}`, `    Requires ${expected}`);
    } else if (prebuiltPlatforms.includes(runtimePlatform)) {
      const [os, cpu] = runtimePlatform.split("-");
      const libc = os.endsWith("musl") ? " --libc=musl" : "";
      help.push("- Ensure optional dependencies can be installed:", "    npm install --include=optional sharp", "- Ensure your package manager supports multi-platform installation:", "    See https://sharp.pixelplumbing.com/install#cross-platform", "- Add platform-specific dependencies:", `    npm install --os=${os.replace("musl", "")}${libc} --cpu=${cpu} sharp`);
    } else {
      help.push(`- Manually install libvips >= ${minimumLibvipsVersion}`, "- Add experimental WebAssembly-based dependencies:", "    npm install --cpu=wasm32 sharp", "    npm install @img/sharp-wasm32");
    }
    if (isLinux && /(symbol not found|CXXABI_)/i.test(messages)) {
      try {
        const { config } = __require(`@img/sharp-libvips-${runtimePlatform}/package`);
        const libcFound = `${familySync()} ${versionSync()}`;
        const libcRequires = `${config.musl ? "musl" : "glibc"} ${config.musl || config.glibc}`;
        help.push("- Update your OS:", `    Found ${libcFound}`, `    Requires ${libcRequires}`);
      } catch (errEngines) {}
    }
    if (isLinux && /\/snap\/core[0-9]{2}/.test(messages)) {
      help.push("- Remove the Node.js Snap, which does not support native modules", "    snap remove node");
    }
    if (isMacOs && /Incompatible library version/.test(messages)) {
      help.push("- Update Homebrew:", "    brew update && brew upgrade vips");
    }
    if (errors.some((err) => err.code === "ERR_DLOPEN_DISABLED")) {
      help.push("- Run Node.js without using the --no-addons flag");
    }
    if (isWindows && /The specified procedure could not be found/.test(messages)) {
      help.push("- Using the canvas package on Windows?", "    See https://sharp.pixelplumbing.com/install#canvas-and-windows", "- Check for outdated versions of sharp in the dependency tree:", "    npm ls sharp");
    }
    help.push("- Consult the installation documentation:", "    See https://sharp.pixelplumbing.com/install");
    throw new Error(help.join(`
`));
  }
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/constructor.js
var require_constructor = __commonJS((exports, module) => {
  var util = __require("util");
  var stream = __require("stream");
  var is = require_is();
  require_sharp();
  var debuglog = util.debuglog("sharp");
  var Sharp = function(input, options) {
    if (arguments.length === 1 && !is.defined(input)) {
      throw new Error("Invalid input");
    }
    if (!(this instanceof Sharp)) {
      return new Sharp(input, options);
    }
    stream.Duplex.call(this);
    this.options = {
      topOffsetPre: -1,
      leftOffsetPre: -1,
      widthPre: -1,
      heightPre: -1,
      topOffsetPost: -1,
      leftOffsetPost: -1,
      widthPost: -1,
      heightPost: -1,
      width: -1,
      height: -1,
      canvas: "crop",
      position: 0,
      resizeBackground: [0, 0, 0, 255],
      useExifOrientation: false,
      angle: 0,
      rotationAngle: 0,
      rotationBackground: [0, 0, 0, 255],
      rotateBeforePreExtract: false,
      flip: false,
      flop: false,
      extendTop: 0,
      extendBottom: 0,
      extendLeft: 0,
      extendRight: 0,
      extendBackground: [0, 0, 0, 255],
      extendWith: "background",
      withoutEnlargement: false,
      withoutReduction: false,
      affineMatrix: [],
      affineBackground: [0, 0, 0, 255],
      affineIdx: 0,
      affineIdy: 0,
      affineOdx: 0,
      affineOdy: 0,
      affineInterpolator: this.constructor.interpolators.bilinear,
      kernel: "lanczos3",
      fastShrinkOnLoad: true,
      tint: [-1, 0, 0, 0],
      flatten: false,
      flattenBackground: [0, 0, 0],
      unflatten: false,
      negate: false,
      negateAlpha: true,
      medianSize: 0,
      blurSigma: 0,
      precision: "integer",
      minAmpl: 0.2,
      sharpenSigma: 0,
      sharpenM1: 1,
      sharpenM2: 2,
      sharpenX1: 2,
      sharpenY2: 10,
      sharpenY3: 20,
      threshold: 0,
      thresholdGrayscale: true,
      trimBackground: [],
      trimThreshold: -1,
      trimLineArt: false,
      gamma: 0,
      gammaOut: 0,
      greyscale: false,
      normalise: false,
      normaliseLower: 1,
      normaliseUpper: 99,
      claheWidth: 0,
      claheHeight: 0,
      claheMaxSlope: 3,
      brightness: 1,
      saturation: 1,
      hue: 0,
      lightness: 0,
      booleanBufferIn: null,
      booleanFileIn: "",
      joinChannelIn: [],
      extractChannel: -1,
      removeAlpha: false,
      ensureAlpha: -1,
      colourspace: "srgb",
      colourspacePipeline: "last",
      composite: [],
      fileOut: "",
      formatOut: "input",
      streamOut: false,
      keepMetadata: 0,
      withMetadataOrientation: -1,
      withMetadataDensity: 0,
      withIccProfile: "",
      withExif: {},
      withExifMerge: true,
      resolveWithObject: false,
      jpegQuality: 80,
      jpegProgressive: false,
      jpegChromaSubsampling: "4:2:0",
      jpegTrellisQuantisation: false,
      jpegOvershootDeringing: false,
      jpegOptimiseScans: false,
      jpegOptimiseCoding: true,
      jpegQuantisationTable: 0,
      pngProgressive: false,
      pngCompressionLevel: 6,
      pngAdaptiveFiltering: false,
      pngPalette: false,
      pngQuality: 100,
      pngEffort: 7,
      pngBitdepth: 8,
      pngDither: 1,
      jp2Quality: 80,
      jp2TileHeight: 512,
      jp2TileWidth: 512,
      jp2Lossless: false,
      jp2ChromaSubsampling: "4:4:4",
      webpQuality: 80,
      webpAlphaQuality: 100,
      webpLossless: false,
      webpNearLossless: false,
      webpSmartSubsample: false,
      webpPreset: "default",
      webpEffort: 4,
      webpMinSize: false,
      webpMixed: false,
      gifBitdepth: 8,
      gifEffort: 7,
      gifDither: 1,
      gifInterFrameMaxError: 0,
      gifInterPaletteMaxError: 3,
      gifReuse: true,
      gifProgressive: false,
      tiffQuality: 80,
      tiffCompression: "jpeg",
      tiffPredictor: "horizontal",
      tiffPyramid: false,
      tiffMiniswhite: false,
      tiffBitdepth: 8,
      tiffTile: false,
      tiffTileHeight: 256,
      tiffTileWidth: 256,
      tiffXres: 1,
      tiffYres: 1,
      tiffResolutionUnit: "inch",
      heifQuality: 50,
      heifLossless: false,
      heifCompression: "av1",
      heifEffort: 4,
      heifChromaSubsampling: "4:4:4",
      heifBitdepth: 8,
      jxlDistance: 1,
      jxlDecodingTier: 0,
      jxlEffort: 7,
      jxlLossless: false,
      rawDepth: "uchar",
      tileSize: 256,
      tileOverlap: 0,
      tileContainer: "fs",
      tileLayout: "dz",
      tileFormat: "last",
      tileDepth: "last",
      tileAngle: 0,
      tileSkipBlanks: -1,
      tileBackground: [255, 255, 255, 255],
      tileCentre: false,
      tileId: "https://example.com/iiif",
      tileBasename: "",
      timeoutSeconds: 0,
      linearA: [],
      linearB: [],
      debuglog: (warning) => {
        this.emit("warning", warning);
        debuglog(warning);
      },
      queueListener: function(queueLength) {
        Sharp.queue.emit("change", queueLength);
      }
    };
    this.options.input = this._createInputDescriptor(input, options, { allowStream: true });
    return this;
  };
  Object.setPrototypeOf(Sharp.prototype, stream.Duplex.prototype);
  Object.setPrototypeOf(Sharp, stream.Duplex);
  function clone() {
    const clone2 = this.constructor.call();
    const { debuglog: debuglog2, queueListener, ...options } = this.options;
    clone2.options = structuredClone(options);
    clone2.options.debuglog = debuglog2;
    clone2.options.queueListener = queueListener;
    if (this._isStreamInput()) {
      this.on("finish", () => {
        this._flattenBufferIn();
        clone2.options.input.buffer = this.options.input.buffer;
        clone2.emit("finish");
      });
    }
    return clone2;
  }
  Object.assign(Sharp.prototype, { clone });
  module.exports = Sharp;
});

// node_modules/.bun/color-name@1.1.4/node_modules/color-name/index.js
var require_color_name = __commonJS((exports, module) => {
  module.exports = {
    aliceblue: [240, 248, 255],
    antiquewhite: [250, 235, 215],
    aqua: [0, 255, 255],
    aquamarine: [127, 255, 212],
    azure: [240, 255, 255],
    beige: [245, 245, 220],
    bisque: [255, 228, 196],
    black: [0, 0, 0],
    blanchedalmond: [255, 235, 205],
    blue: [0, 0, 255],
    blueviolet: [138, 43, 226],
    brown: [165, 42, 42],
    burlywood: [222, 184, 135],
    cadetblue: [95, 158, 160],
    chartreuse: [127, 255, 0],
    chocolate: [210, 105, 30],
    coral: [255, 127, 80],
    cornflowerblue: [100, 149, 237],
    cornsilk: [255, 248, 220],
    crimson: [220, 20, 60],
    cyan: [0, 255, 255],
    darkblue: [0, 0, 139],
    darkcyan: [0, 139, 139],
    darkgoldenrod: [184, 134, 11],
    darkgray: [169, 169, 169],
    darkgreen: [0, 100, 0],
    darkgrey: [169, 169, 169],
    darkkhaki: [189, 183, 107],
    darkmagenta: [139, 0, 139],
    darkolivegreen: [85, 107, 47],
    darkorange: [255, 140, 0],
    darkorchid: [153, 50, 204],
    darkred: [139, 0, 0],
    darksalmon: [233, 150, 122],
    darkseagreen: [143, 188, 143],
    darkslateblue: [72, 61, 139],
    darkslategray: [47, 79, 79],
    darkslategrey: [47, 79, 79],
    darkturquoise: [0, 206, 209],
    darkviolet: [148, 0, 211],
    deeppink: [255, 20, 147],
    deepskyblue: [0, 191, 255],
    dimgray: [105, 105, 105],
    dimgrey: [105, 105, 105],
    dodgerblue: [30, 144, 255],
    firebrick: [178, 34, 34],
    floralwhite: [255, 250, 240],
    forestgreen: [34, 139, 34],
    fuchsia: [255, 0, 255],
    gainsboro: [220, 220, 220],
    ghostwhite: [248, 248, 255],
    gold: [255, 215, 0],
    goldenrod: [218, 165, 32],
    gray: [128, 128, 128],
    green: [0, 128, 0],
    greenyellow: [173, 255, 47],
    grey: [128, 128, 128],
    honeydew: [240, 255, 240],
    hotpink: [255, 105, 180],
    indianred: [205, 92, 92],
    indigo: [75, 0, 130],
    ivory: [255, 255, 240],
    khaki: [240, 230, 140],
    lavender: [230, 230, 250],
    lavenderblush: [255, 240, 245],
    lawngreen: [124, 252, 0],
    lemonchiffon: [255, 250, 205],
    lightblue: [173, 216, 230],
    lightcoral: [240, 128, 128],
    lightcyan: [224, 255, 255],
    lightgoldenrodyellow: [250, 250, 210],
    lightgray: [211, 211, 211],
    lightgreen: [144, 238, 144],
    lightgrey: [211, 211, 211],
    lightpink: [255, 182, 193],
    lightsalmon: [255, 160, 122],
    lightseagreen: [32, 178, 170],
    lightskyblue: [135, 206, 250],
    lightslategray: [119, 136, 153],
    lightslategrey: [119, 136, 153],
    lightsteelblue: [176, 196, 222],
    lightyellow: [255, 255, 224],
    lime: [0, 255, 0],
    limegreen: [50, 205, 50],
    linen: [250, 240, 230],
    magenta: [255, 0, 255],
    maroon: [128, 0, 0],
    mediumaquamarine: [102, 205, 170],
    mediumblue: [0, 0, 205],
    mediumorchid: [186, 85, 211],
    mediumpurple: [147, 112, 219],
    mediumseagreen: [60, 179, 113],
    mediumslateblue: [123, 104, 238],
    mediumspringgreen: [0, 250, 154],
    mediumturquoise: [72, 209, 204],
    mediumvioletred: [199, 21, 133],
    midnightblue: [25, 25, 112],
    mintcream: [245, 255, 250],
    mistyrose: [255, 228, 225],
    moccasin: [255, 228, 181],
    navajowhite: [255, 222, 173],
    navy: [0, 0, 128],
    oldlace: [253, 245, 230],
    olive: [128, 128, 0],
    olivedrab: [107, 142, 35],
    orange: [255, 165, 0],
    orangered: [255, 69, 0],
    orchid: [218, 112, 214],
    palegoldenrod: [238, 232, 170],
    palegreen: [152, 251, 152],
    paleturquoise: [175, 238, 238],
    palevioletred: [219, 112, 147],
    papayawhip: [255, 239, 213],
    peachpuff: [255, 218, 185],
    peru: [205, 133, 63],
    pink: [255, 192, 203],
    plum: [221, 160, 221],
    powderblue: [176, 224, 230],
    purple: [128, 0, 128],
    rebeccapurple: [102, 51, 153],
    red: [255, 0, 0],
    rosybrown: [188, 143, 143],
    royalblue: [65, 105, 225],
    saddlebrown: [139, 69, 19],
    salmon: [250, 128, 114],
    sandybrown: [244, 164, 96],
    seagreen: [46, 139, 87],
    seashell: [255, 245, 238],
    sienna: [160, 82, 45],
    silver: [192, 192, 192],
    skyblue: [135, 206, 235],
    slateblue: [106, 90, 205],
    slategray: [112, 128, 144],
    slategrey: [112, 128, 144],
    snow: [255, 250, 250],
    springgreen: [0, 255, 127],
    steelblue: [70, 130, 180],
    tan: [210, 180, 140],
    teal: [0, 128, 128],
    thistle: [216, 191, 216],
    tomato: [255, 99, 71],
    turquoise: [64, 224, 208],
    violet: [238, 130, 238],
    wheat: [245, 222, 179],
    white: [255, 255, 255],
    whitesmoke: [245, 245, 245],
    yellow: [255, 255, 0],
    yellowgreen: [154, 205, 50]
  };
});

// node_modules/.bun/is-arrayish@0.3.4/node_modules/is-arrayish/index.js
var require_is_arrayish = __commonJS((exports, module) => {
  module.exports = function isArrayish(obj) {
    if (!obj || typeof obj === "string") {
      return false;
    }
    return obj instanceof Array || Array.isArray(obj) || obj.length >= 0 && (obj.splice instanceof Function || Object.getOwnPropertyDescriptor(obj, obj.length - 1) && obj.constructor.name !== "String");
  };
});

// node_modules/.bun/simple-swizzle@0.2.4/node_modules/simple-swizzle/index.js
var require_simple_swizzle = __commonJS((exports, module) => {
  var isArrayish = require_is_arrayish();
  var concat = Array.prototype.concat;
  var slice = Array.prototype.slice;
  var swizzle = module.exports = function swizzle(args) {
    var results = [];
    for (var i = 0, len = args.length;i < len; i++) {
      var arg = args[i];
      if (isArrayish(arg)) {
        results = concat.call(results, slice.call(arg));
      } else {
        results.push(arg);
      }
    }
    return results;
  };
  swizzle.wrap = function(fn) {
    return function() {
      return fn(swizzle(arguments));
    };
  };
});

// node_modules/.bun/color-string@1.9.1/node_modules/color-string/index.js
var require_color_string = __commonJS((exports, module) => {
  var colorNames = require_color_name();
  var swizzle = require_simple_swizzle();
  var hasOwnProperty = Object.hasOwnProperty;
  var reverseNames = Object.create(null);
  for (name in colorNames) {
    if (hasOwnProperty.call(colorNames, name)) {
      reverseNames[colorNames[name]] = name;
    }
  }
  var name;
  var cs = module.exports = {
    to: {},
    get: {}
  };
  cs.get = function(string) {
    var prefix = string.substring(0, 3).toLowerCase();
    var val;
    var model;
    switch (prefix) {
      case "hsl":
        val = cs.get.hsl(string);
        model = "hsl";
        break;
      case "hwb":
        val = cs.get.hwb(string);
        model = "hwb";
        break;
      default:
        val = cs.get.rgb(string);
        model = "rgb";
        break;
    }
    if (!val) {
      return null;
    }
    return { model, value: val };
  };
  cs.get.rgb = function(string) {
    if (!string) {
      return null;
    }
    var abbr = /^#([a-f0-9]{3,4})$/i;
    var hex = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i;
    var rgba = /^rgba?\(\s*([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/;
    var per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/;
    var keyword = /^(\w+)$/;
    var rgb = [0, 0, 0, 1];
    var match;
    var i;
    var hexAlpha;
    if (match = string.match(hex)) {
      hexAlpha = match[2];
      match = match[1];
      for (i = 0;i < 3; i++) {
        var i2 = i * 2;
        rgb[i] = parseInt(match.slice(i2, i2 + 2), 16);
      }
      if (hexAlpha) {
        rgb[3] = parseInt(hexAlpha, 16) / 255;
      }
    } else if (match = string.match(abbr)) {
      match = match[1];
      hexAlpha = match[3];
      for (i = 0;i < 3; i++) {
        rgb[i] = parseInt(match[i] + match[i], 16);
      }
      if (hexAlpha) {
        rgb[3] = parseInt(hexAlpha + hexAlpha, 16) / 255;
      }
    } else if (match = string.match(rgba)) {
      for (i = 0;i < 3; i++) {
        rgb[i] = parseInt(match[i + 1], 0);
      }
      if (match[4]) {
        if (match[5]) {
          rgb[3] = parseFloat(match[4]) * 0.01;
        } else {
          rgb[3] = parseFloat(match[4]);
        }
      }
    } else if (match = string.match(per)) {
      for (i = 0;i < 3; i++) {
        rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
      }
      if (match[4]) {
        if (match[5]) {
          rgb[3] = parseFloat(match[4]) * 0.01;
        } else {
          rgb[3] = parseFloat(match[4]);
        }
      }
    } else if (match = string.match(keyword)) {
      if (match[1] === "transparent") {
        return [0, 0, 0, 0];
      }
      if (!hasOwnProperty.call(colorNames, match[1])) {
        return null;
      }
      rgb = colorNames[match[1]];
      rgb[3] = 1;
      return rgb;
    } else {
      return null;
    }
    for (i = 0;i < 3; i++) {
      rgb[i] = clamp(rgb[i], 0, 255);
    }
    rgb[3] = clamp(rgb[3], 0, 1);
    return rgb;
  };
  cs.get.hsl = function(string) {
    if (!string) {
      return null;
    }
    var hsl = /^hsla?\(\s*([+-]?(?:\d{0,3}\.)?\d+)(?:deg)?\s*,?\s*([+-]?[\d\.]+)%\s*,?\s*([+-]?[\d\.]+)%\s*(?:[,|\/]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/;
    var match = string.match(hsl);
    if (match) {
      var alpha = parseFloat(match[4]);
      var h = (parseFloat(match[1]) % 360 + 360) % 360;
      var s = clamp(parseFloat(match[2]), 0, 100);
      var l = clamp(parseFloat(match[3]), 0, 100);
      var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, s, l, a];
    }
    return null;
  };
  cs.get.hwb = function(string) {
    if (!string) {
      return null;
    }
    var hwb = /^hwb\(\s*([+-]?\d{0,3}(?:\.\d+)?)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/;
    var match = string.match(hwb);
    if (match) {
      var alpha = parseFloat(match[4]);
      var h = (parseFloat(match[1]) % 360 + 360) % 360;
      var w = clamp(parseFloat(match[2]), 0, 100);
      var b = clamp(parseFloat(match[3]), 0, 100);
      var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, w, b, a];
    }
    return null;
  };
  cs.to.hex = function() {
    var rgba = swizzle(arguments);
    return "#" + hexDouble(rgba[0]) + hexDouble(rgba[1]) + hexDouble(rgba[2]) + (rgba[3] < 1 ? hexDouble(Math.round(rgba[3] * 255)) : "");
  };
  cs.to.rgb = function() {
    var rgba = swizzle(arguments);
    return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ")" : "rgba(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ", " + rgba[3] + ")";
  };
  cs.to.rgb.percent = function() {
    var rgba = swizzle(arguments);
    var r = Math.round(rgba[0] / 255 * 100);
    var g = Math.round(rgba[1] / 255 * 100);
    var b = Math.round(rgba[2] / 255 * 100);
    return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + r + "%, " + g + "%, " + b + "%)" : "rgba(" + r + "%, " + g + "%, " + b + "%, " + rgba[3] + ")";
  };
  cs.to.hsl = function() {
    var hsla = swizzle(arguments);
    return hsla.length < 4 || hsla[3] === 1 ? "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)" : "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, " + hsla[3] + ")";
  };
  cs.to.hwb = function() {
    var hwba = swizzle(arguments);
    var a = "";
    if (hwba.length >= 4 && hwba[3] !== 1) {
      a = ", " + hwba[3];
    }
    return "hwb(" + hwba[0] + ", " + hwba[1] + "%, " + hwba[2] + "%" + a + ")";
  };
  cs.to.keyword = function(rgb) {
    return reverseNames[rgb.slice(0, 3)];
  };
  function clamp(num, min, max) {
    return Math.min(Math.max(min, num), max);
  }
  function hexDouble(num) {
    var str = Math.round(num).toString(16).toUpperCase();
    return str.length < 2 ? "0" + str : str;
  }
});

// node_modules/.bun/color-convert@2.0.1/node_modules/color-convert/conversions.js
var require_conversions = __commonJS((exports, module) => {
  var cssKeywords = require_color_name();
  var reverseKeywords = {};
  for (const key of Object.keys(cssKeywords)) {
    reverseKeywords[cssKeywords[key]] = key;
  }
  var convert = {
    rgb: { channels: 3, labels: "rgb" },
    hsl: { channels: 3, labels: "hsl" },
    hsv: { channels: 3, labels: "hsv" },
    hwb: { channels: 3, labels: "hwb" },
    cmyk: { channels: 4, labels: "cmyk" },
    xyz: { channels: 3, labels: "xyz" },
    lab: { channels: 3, labels: "lab" },
    lch: { channels: 3, labels: "lch" },
    hex: { channels: 1, labels: ["hex"] },
    keyword: { channels: 1, labels: ["keyword"] },
    ansi16: { channels: 1, labels: ["ansi16"] },
    ansi256: { channels: 1, labels: ["ansi256"] },
    hcg: { channels: 3, labels: ["h", "c", "g"] },
    apple: { channels: 3, labels: ["r16", "g16", "b16"] },
    gray: { channels: 1, labels: ["gray"] }
  };
  module.exports = convert;
  for (const model of Object.keys(convert)) {
    if (!("channels" in convert[model])) {
      throw new Error("missing channels property: " + model);
    }
    if (!("labels" in convert[model])) {
      throw new Error("missing channel labels property: " + model);
    }
    if (convert[model].labels.length !== convert[model].channels) {
      throw new Error("channel and label counts mismatch: " + model);
    }
    const { channels, labels } = convert[model];
    delete convert[model].channels;
    delete convert[model].labels;
    Object.defineProperty(convert[model], "channels", { value: channels });
    Object.defineProperty(convert[model], "labels", { value: labels });
  }
  convert.rgb.hsl = function(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const delta = max - min;
    let h;
    let s;
    if (max === min) {
      h = 0;
    } else if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else if (b === max) {
      h = 4 + (r - g) / delta;
    }
    h = Math.min(h * 60, 360);
    if (h < 0) {
      h += 360;
    }
    const l = (min + max) / 2;
    if (max === min) {
      s = 0;
    } else if (l <= 0.5) {
      s = delta / (max + min);
    } else {
      s = delta / (2 - max - min);
    }
    return [h, s * 100, l * 100];
  };
  convert.rgb.hsv = function(rgb) {
    let rdif;
    let gdif;
    let bdif;
    let h;
    let s;
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const v = Math.max(r, g, b);
    const diff = v - Math.min(r, g, b);
    const diffc = function(c) {
      return (v - c) / 6 / diff + 1 / 2;
    };
    if (diff === 0) {
      h = 0;
      s = 0;
    } else {
      s = diff / v;
      rdif = diffc(r);
      gdif = diffc(g);
      bdif = diffc(b);
      if (r === v) {
        h = bdif - gdif;
      } else if (g === v) {
        h = 1 / 3 + rdif - bdif;
      } else if (b === v) {
        h = 2 / 3 + gdif - rdif;
      }
      if (h < 0) {
        h += 1;
      } else if (h > 1) {
        h -= 1;
      }
    }
    return [
      h * 360,
      s * 100,
      v * 100
    ];
  };
  convert.rgb.hwb = function(rgb) {
    const r = rgb[0];
    const g = rgb[1];
    let b = rgb[2];
    const h = convert.rgb.hsl(rgb)[0];
    const w = 1 / 255 * Math.min(r, Math.min(g, b));
    b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));
    return [h, w * 100, b * 100];
  };
  convert.rgb.cmyk = function(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const k = Math.min(1 - r, 1 - g, 1 - b);
    const c = (1 - r - k) / (1 - k) || 0;
    const m = (1 - g - k) / (1 - k) || 0;
    const y = (1 - b - k) / (1 - k) || 0;
    return [c * 100, m * 100, y * 100, k * 100];
  };
  function comparativeDistance(x, y) {
    return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
  }
  convert.rgb.keyword = function(rgb) {
    const reversed = reverseKeywords[rgb];
    if (reversed) {
      return reversed;
    }
    let currentClosestDistance = Infinity;
    let currentClosestKeyword;
    for (const keyword of Object.keys(cssKeywords)) {
      const value = cssKeywords[keyword];
      const distance = comparativeDistance(rgb, value);
      if (distance < currentClosestDistance) {
        currentClosestDistance = distance;
        currentClosestKeyword = keyword;
      }
    }
    return currentClosestKeyword;
  };
  convert.keyword.rgb = function(keyword) {
    return cssKeywords[keyword];
  };
  convert.rgb.xyz = function(rgb) {
    let r = rgb[0] / 255;
    let g = rgb[1] / 255;
    let b = rgb[2] / 255;
    r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
    g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
    b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    return [x * 100, y * 100, z * 100];
  };
  convert.rgb.lab = function(rgb) {
    const xyz = convert.rgb.xyz(rgb);
    let x = xyz[0];
    let y = xyz[1];
    let z = xyz[2];
    x /= 95.047;
    y /= 100;
    z /= 108.883;
    x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);
    return [l, a, b];
  };
  convert.hsl.rgb = function(hsl) {
    const h = hsl[0] / 360;
    const s = hsl[1] / 100;
    const l = hsl[2] / 100;
    let t2;
    let t3;
    let val;
    if (s === 0) {
      val = l * 255;
      return [val, val, val];
    }
    if (l < 0.5) {
      t2 = l * (1 + s);
    } else {
      t2 = l + s - l * s;
    }
    const t1 = 2 * l - t2;
    const rgb = [0, 0, 0];
    for (let i = 0;i < 3; i++) {
      t3 = h + 1 / 3 * -(i - 1);
      if (t3 < 0) {
        t3++;
      }
      if (t3 > 1) {
        t3--;
      }
      if (6 * t3 < 1) {
        val = t1 + (t2 - t1) * 6 * t3;
      } else if (2 * t3 < 1) {
        val = t2;
      } else if (3 * t3 < 2) {
        val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
      } else {
        val = t1;
      }
      rgb[i] = val * 255;
    }
    return rgb;
  };
  convert.hsl.hsv = function(hsl) {
    const h = hsl[0];
    let s = hsl[1] / 100;
    let l = hsl[2] / 100;
    let smin = s;
    const lmin = Math.max(l, 0.01);
    l *= 2;
    s *= l <= 1 ? l : 2 - l;
    smin *= lmin <= 1 ? lmin : 2 - lmin;
    const v = (l + s) / 2;
    const sv = l === 0 ? 2 * smin / (lmin + smin) : 2 * s / (l + s);
    return [h, sv * 100, v * 100];
  };
  convert.hsv.rgb = function(hsv) {
    const h = hsv[0] / 60;
    const s = hsv[1] / 100;
    let v = hsv[2] / 100;
    const hi = Math.floor(h) % 6;
    const f = h - Math.floor(h);
    const p = 255 * v * (1 - s);
    const q = 255 * v * (1 - s * f);
    const t = 255 * v * (1 - s * (1 - f));
    v *= 255;
    switch (hi) {
      case 0:
        return [v, t, p];
      case 1:
        return [q, v, p];
      case 2:
        return [p, v, t];
      case 3:
        return [p, q, v];
      case 4:
        return [t, p, v];
      case 5:
        return [v, p, q];
    }
  };
  convert.hsv.hsl = function(hsv) {
    const h = hsv[0];
    const s = hsv[1] / 100;
    const v = hsv[2] / 100;
    const vmin = Math.max(v, 0.01);
    let sl;
    let l;
    l = (2 - s) * v;
    const lmin = (2 - s) * vmin;
    sl = s * vmin;
    sl /= lmin <= 1 ? lmin : 2 - lmin;
    sl = sl || 0;
    l /= 2;
    return [h, sl * 100, l * 100];
  };
  convert.hwb.rgb = function(hwb) {
    const h = hwb[0] / 360;
    let wh = hwb[1] / 100;
    let bl = hwb[2] / 100;
    const ratio = wh + bl;
    let f;
    if (ratio > 1) {
      wh /= ratio;
      bl /= ratio;
    }
    const i = Math.floor(6 * h);
    const v = 1 - bl;
    f = 6 * h - i;
    if ((i & 1) !== 0) {
      f = 1 - f;
    }
    const n = wh + f * (v - wh);
    let r;
    let g;
    let b;
    switch (i) {
      default:
      case 6:
      case 0:
        r = v;
        g = n;
        b = wh;
        break;
      case 1:
        r = n;
        g = v;
        b = wh;
        break;
      case 2:
        r = wh;
        g = v;
        b = n;
        break;
      case 3:
        r = wh;
        g = n;
        b = v;
        break;
      case 4:
        r = n;
        g = wh;
        b = v;
        break;
      case 5:
        r = v;
        g = wh;
        b = n;
        break;
    }
    return [r * 255, g * 255, b * 255];
  };
  convert.cmyk.rgb = function(cmyk) {
    const c = cmyk[0] / 100;
    const m = cmyk[1] / 100;
    const y = cmyk[2] / 100;
    const k = cmyk[3] / 100;
    const r = 1 - Math.min(1, c * (1 - k) + k);
    const g = 1 - Math.min(1, m * (1 - k) + k);
    const b = 1 - Math.min(1, y * (1 - k) + k);
    return [r * 255, g * 255, b * 255];
  };
  convert.xyz.rgb = function(xyz) {
    const x = xyz[0] / 100;
    const y = xyz[1] / 100;
    const z = xyz[2] / 100;
    let r;
    let g;
    let b;
    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.204 + z * 1.057;
    r = r > 0.0031308 ? 1.055 * r ** (1 / 2.4) - 0.055 : r * 12.92;
    g = g > 0.0031308 ? 1.055 * g ** (1 / 2.4) - 0.055 : g * 12.92;
    b = b > 0.0031308 ? 1.055 * b ** (1 / 2.4) - 0.055 : b * 12.92;
    r = Math.min(Math.max(0, r), 1);
    g = Math.min(Math.max(0, g), 1);
    b = Math.min(Math.max(0, b), 1);
    return [r * 255, g * 255, b * 255];
  };
  convert.xyz.lab = function(xyz) {
    let x = xyz[0];
    let y = xyz[1];
    let z = xyz[2];
    x /= 95.047;
    y /= 100;
    z /= 108.883;
    x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);
    return [l, a, b];
  };
  convert.lab.xyz = function(lab) {
    const l = lab[0];
    const a = lab[1];
    const b = lab[2];
    let x;
    let y;
    let z;
    y = (l + 16) / 116;
    x = a / 500 + y;
    z = y - b / 200;
    const y2 = y ** 3;
    const x2 = x ** 3;
    const z2 = z ** 3;
    y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
    x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
    z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;
    x *= 95.047;
    y *= 100;
    z *= 108.883;
    return [x, y, z];
  };
  convert.lab.lch = function(lab) {
    const l = lab[0];
    const a = lab[1];
    const b = lab[2];
    let h;
    const hr = Math.atan2(b, a);
    h = hr * 360 / 2 / Math.PI;
    if (h < 0) {
      h += 360;
    }
    const c = Math.sqrt(a * a + b * b);
    return [l, c, h];
  };
  convert.lch.lab = function(lch) {
    const l = lch[0];
    const c = lch[1];
    const h = lch[2];
    const hr = h / 360 * 2 * Math.PI;
    const a = c * Math.cos(hr);
    const b = c * Math.sin(hr);
    return [l, a, b];
  };
  convert.rgb.ansi16 = function(args, saturation = null) {
    const [r, g, b] = args;
    let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation;
    value = Math.round(value / 50);
    if (value === 0) {
      return 30;
    }
    let ansi = 30 + (Math.round(b / 255) << 2 | Math.round(g / 255) << 1 | Math.round(r / 255));
    if (value === 2) {
      ansi += 60;
    }
    return ansi;
  };
  convert.hsv.ansi16 = function(args) {
    return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
  };
  convert.rgb.ansi256 = function(args) {
    const r = args[0];
    const g = args[1];
    const b = args[2];
    if (r === g && g === b) {
      if (r < 8) {
        return 16;
      }
      if (r > 248) {
        return 231;
      }
      return Math.round((r - 8) / 247 * 24) + 232;
    }
    const ansi = 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);
    return ansi;
  };
  convert.ansi16.rgb = function(args) {
    let color = args % 10;
    if (color === 0 || color === 7) {
      if (args > 50) {
        color += 3.5;
      }
      color = color / 10.5 * 255;
      return [color, color, color];
    }
    const mult = (~~(args > 50) + 1) * 0.5;
    const r = (color & 1) * mult * 255;
    const g = (color >> 1 & 1) * mult * 255;
    const b = (color >> 2 & 1) * mult * 255;
    return [r, g, b];
  };
  convert.ansi256.rgb = function(args) {
    if (args >= 232) {
      const c = (args - 232) * 10 + 8;
      return [c, c, c];
    }
    args -= 16;
    let rem;
    const r = Math.floor(args / 36) / 5 * 255;
    const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
    const b = rem % 6 / 5 * 255;
    return [r, g, b];
  };
  convert.rgb.hex = function(args) {
    const integer = ((Math.round(args[0]) & 255) << 16) + ((Math.round(args[1]) & 255) << 8) + (Math.round(args[2]) & 255);
    const string = integer.toString(16).toUpperCase();
    return "000000".substring(string.length) + string;
  };
  convert.hex.rgb = function(args) {
    const match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
    if (!match) {
      return [0, 0, 0];
    }
    let colorString = match[0];
    if (match[0].length === 3) {
      colorString = colorString.split("").map((char) => {
        return char + char;
      }).join("");
    }
    const integer = parseInt(colorString, 16);
    const r = integer >> 16 & 255;
    const g = integer >> 8 & 255;
    const b = integer & 255;
    return [r, g, b];
  };
  convert.rgb.hcg = function(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const max = Math.max(Math.max(r, g), b);
    const min = Math.min(Math.min(r, g), b);
    const chroma = max - min;
    let grayscale;
    let hue;
    if (chroma < 1) {
      grayscale = min / (1 - chroma);
    } else {
      grayscale = 0;
    }
    if (chroma <= 0) {
      hue = 0;
    } else if (max === r) {
      hue = (g - b) / chroma % 6;
    } else if (max === g) {
      hue = 2 + (b - r) / chroma;
    } else {
      hue = 4 + (r - g) / chroma;
    }
    hue /= 6;
    hue %= 1;
    return [hue * 360, chroma * 100, grayscale * 100];
  };
  convert.hsl.hcg = function(hsl) {
    const s = hsl[1] / 100;
    const l = hsl[2] / 100;
    const c = l < 0.5 ? 2 * s * l : 2 * s * (1 - l);
    let f = 0;
    if (c < 1) {
      f = (l - 0.5 * c) / (1 - c);
    }
    return [hsl[0], c * 100, f * 100];
  };
  convert.hsv.hcg = function(hsv) {
    const s = hsv[1] / 100;
    const v = hsv[2] / 100;
    const c = s * v;
    let f = 0;
    if (c < 1) {
      f = (v - c) / (1 - c);
    }
    return [hsv[0], c * 100, f * 100];
  };
  convert.hcg.rgb = function(hcg) {
    const h = hcg[0] / 360;
    const c = hcg[1] / 100;
    const g = hcg[2] / 100;
    if (c === 0) {
      return [g * 255, g * 255, g * 255];
    }
    const pure = [0, 0, 0];
    const hi = h % 1 * 6;
    const v = hi % 1;
    const w = 1 - v;
    let mg = 0;
    switch (Math.floor(hi)) {
      case 0:
        pure[0] = 1;
        pure[1] = v;
        pure[2] = 0;
        break;
      case 1:
        pure[0] = w;
        pure[1] = 1;
        pure[2] = 0;
        break;
      case 2:
        pure[0] = 0;
        pure[1] = 1;
        pure[2] = v;
        break;
      case 3:
        pure[0] = 0;
        pure[1] = w;
        pure[2] = 1;
        break;
      case 4:
        pure[0] = v;
        pure[1] = 0;
        pure[2] = 1;
        break;
      default:
        pure[0] = 1;
        pure[1] = 0;
        pure[2] = w;
    }
    mg = (1 - c) * g;
    return [
      (c * pure[0] + mg) * 255,
      (c * pure[1] + mg) * 255,
      (c * pure[2] + mg) * 255
    ];
  };
  convert.hcg.hsv = function(hcg) {
    const c = hcg[1] / 100;
    const g = hcg[2] / 100;
    const v = c + g * (1 - c);
    let f = 0;
    if (v > 0) {
      f = c / v;
    }
    return [hcg[0], f * 100, v * 100];
  };
  convert.hcg.hsl = function(hcg) {
    const c = hcg[1] / 100;
    const g = hcg[2] / 100;
    const l = g * (1 - c) + 0.5 * c;
    let s = 0;
    if (l > 0 && l < 0.5) {
      s = c / (2 * l);
    } else if (l >= 0.5 && l < 1) {
      s = c / (2 * (1 - l));
    }
    return [hcg[0], s * 100, l * 100];
  };
  convert.hcg.hwb = function(hcg) {
    const c = hcg[1] / 100;
    const g = hcg[2] / 100;
    const v = c + g * (1 - c);
    return [hcg[0], (v - c) * 100, (1 - v) * 100];
  };
  convert.hwb.hcg = function(hwb) {
    const w = hwb[1] / 100;
    const b = hwb[2] / 100;
    const v = 1 - b;
    const c = v - w;
    let g = 0;
    if (c < 1) {
      g = (v - c) / (1 - c);
    }
    return [hwb[0], c * 100, g * 100];
  };
  convert.apple.rgb = function(apple) {
    return [apple[0] / 65535 * 255, apple[1] / 65535 * 255, apple[2] / 65535 * 255];
  };
  convert.rgb.apple = function(rgb) {
    return [rgb[0] / 255 * 65535, rgb[1] / 255 * 65535, rgb[2] / 255 * 65535];
  };
  convert.gray.rgb = function(args) {
    return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
  };
  convert.gray.hsl = function(args) {
    return [0, 0, args[0]];
  };
  convert.gray.hsv = convert.gray.hsl;
  convert.gray.hwb = function(gray) {
    return [0, 100, gray[0]];
  };
  convert.gray.cmyk = function(gray) {
    return [0, 0, 0, gray[0]];
  };
  convert.gray.lab = function(gray) {
    return [gray[0], 0, 0];
  };
  convert.gray.hex = function(gray) {
    const val = Math.round(gray[0] / 100 * 255) & 255;
    const integer = (val << 16) + (val << 8) + val;
    const string = integer.toString(16).toUpperCase();
    return "000000".substring(string.length) + string;
  };
  convert.rgb.gray = function(rgb) {
    const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
    return [val / 255 * 100];
  };
});

// node_modules/.bun/color-convert@2.0.1/node_modules/color-convert/route.js
var require_route = __commonJS((exports, module) => {
  var conversions = require_conversions();
  function buildGraph() {
    const graph = {};
    const models = Object.keys(conversions);
    for (let len = models.length, i = 0;i < len; i++) {
      graph[models[i]] = {
        distance: -1,
        parent: null
      };
    }
    return graph;
  }
  function deriveBFS(fromModel) {
    const graph = buildGraph();
    const queue = [fromModel];
    graph[fromModel].distance = 0;
    while (queue.length) {
      const current = queue.pop();
      const adjacents = Object.keys(conversions[current]);
      for (let len = adjacents.length, i = 0;i < len; i++) {
        const adjacent = adjacents[i];
        const node = graph[adjacent];
        if (node.distance === -1) {
          node.distance = graph[current].distance + 1;
          node.parent = current;
          queue.unshift(adjacent);
        }
      }
    }
    return graph;
  }
  function link(from, to) {
    return function(args) {
      return to(from(args));
    };
  }
  function wrapConversion(toModel, graph) {
    const path2 = [graph[toModel].parent, toModel];
    let fn = conversions[graph[toModel].parent][toModel];
    let cur = graph[toModel].parent;
    while (graph[cur].parent) {
      path2.unshift(graph[cur].parent);
      fn = link(conversions[graph[cur].parent][cur], fn);
      cur = graph[cur].parent;
    }
    fn.conversion = path2;
    return fn;
  }
  module.exports = function(fromModel) {
    const graph = deriveBFS(fromModel);
    const conversion = {};
    const models = Object.keys(graph);
    for (let len = models.length, i = 0;i < len; i++) {
      const toModel = models[i];
      const node = graph[toModel];
      if (node.parent === null) {
        continue;
      }
      conversion[toModel] = wrapConversion(toModel, graph);
    }
    return conversion;
  };
});

// node_modules/.bun/color-convert@2.0.1/node_modules/color-convert/index.js
var require_color_convert = __commonJS((exports, module) => {
  var conversions = require_conversions();
  var route = require_route();
  var convert = {};
  var models = Object.keys(conversions);
  function wrapRaw(fn) {
    const wrappedFn = function(...args) {
      const arg0 = args[0];
      if (arg0 === undefined || arg0 === null) {
        return arg0;
      }
      if (arg0.length > 1) {
        args = arg0;
      }
      return fn(args);
    };
    if ("conversion" in fn) {
      wrappedFn.conversion = fn.conversion;
    }
    return wrappedFn;
  }
  function wrapRounded(fn) {
    const wrappedFn = function(...args) {
      const arg0 = args[0];
      if (arg0 === undefined || arg0 === null) {
        return arg0;
      }
      if (arg0.length > 1) {
        args = arg0;
      }
      const result = fn(args);
      if (typeof result === "object") {
        for (let len = result.length, i = 0;i < len; i++) {
          result[i] = Math.round(result[i]);
        }
      }
      return result;
    };
    if ("conversion" in fn) {
      wrappedFn.conversion = fn.conversion;
    }
    return wrappedFn;
  }
  models.forEach((fromModel) => {
    convert[fromModel] = {};
    Object.defineProperty(convert[fromModel], "channels", { value: conversions[fromModel].channels });
    Object.defineProperty(convert[fromModel], "labels", { value: conversions[fromModel].labels });
    const routes = route(fromModel);
    const routeModels = Object.keys(routes);
    routeModels.forEach((toModel) => {
      const fn = routes[toModel];
      convert[fromModel][toModel] = wrapRounded(fn);
      convert[fromModel][toModel].raw = wrapRaw(fn);
    });
  });
  module.exports = convert;
});

// node_modules/.bun/color@4.2.3/node_modules/color/index.js
var require_color = __commonJS((exports, module) => {
  var colorString = require_color_string();
  var convert = require_color_convert();
  var skippedModels = [
    "keyword",
    "gray",
    "hex"
  ];
  var hashedModelKeys = {};
  for (const model of Object.keys(convert)) {
    hashedModelKeys[[...convert[model].labels].sort().join("")] = model;
  }
  var limiters = {};
  function Color(object, model) {
    if (!(this instanceof Color)) {
      return new Color(object, model);
    }
    if (model && model in skippedModels) {
      model = null;
    }
    if (model && !(model in convert)) {
      throw new Error("Unknown model: " + model);
    }
    let i;
    let channels;
    if (object == null) {
      this.model = "rgb";
      this.color = [0, 0, 0];
      this.valpha = 1;
    } else if (object instanceof Color) {
      this.model = object.model;
      this.color = [...object.color];
      this.valpha = object.valpha;
    } else if (typeof object === "string") {
      const result = colorString.get(object);
      if (result === null) {
        throw new Error("Unable to parse color from string: " + object);
      }
      this.model = result.model;
      channels = convert[this.model].channels;
      this.color = result.value.slice(0, channels);
      this.valpha = typeof result.value[channels] === "number" ? result.value[channels] : 1;
    } else if (object.length > 0) {
      this.model = model || "rgb";
      channels = convert[this.model].channels;
      const newArray = Array.prototype.slice.call(object, 0, channels);
      this.color = zeroArray(newArray, channels);
      this.valpha = typeof object[channels] === "number" ? object[channels] : 1;
    } else if (typeof object === "number") {
      this.model = "rgb";
      this.color = [
        object >> 16 & 255,
        object >> 8 & 255,
        object & 255
      ];
      this.valpha = 1;
    } else {
      this.valpha = 1;
      const keys = Object.keys(object);
      if ("alpha" in object) {
        keys.splice(keys.indexOf("alpha"), 1);
        this.valpha = typeof object.alpha === "number" ? object.alpha : 0;
      }
      const hashedKeys = keys.sort().join("");
      if (!(hashedKeys in hashedModelKeys)) {
        throw new Error("Unable to parse color from object: " + JSON.stringify(object));
      }
      this.model = hashedModelKeys[hashedKeys];
      const { labels } = convert[this.model];
      const color = [];
      for (i = 0;i < labels.length; i++) {
        color.push(object[labels[i]]);
      }
      this.color = zeroArray(color);
    }
    if (limiters[this.model]) {
      channels = convert[this.model].channels;
      for (i = 0;i < channels; i++) {
        const limit = limiters[this.model][i];
        if (limit) {
          this.color[i] = limit(this.color[i]);
        }
      }
    }
    this.valpha = Math.max(0, Math.min(1, this.valpha));
    if (Object.freeze) {
      Object.freeze(this);
    }
  }
  Color.prototype = {
    toString() {
      return this.string();
    },
    toJSON() {
      return this[this.model]();
    },
    string(places) {
      let self = this.model in colorString.to ? this : this.rgb();
      self = self.round(typeof places === "number" ? places : 1);
      const args = self.valpha === 1 ? self.color : [...self.color, this.valpha];
      return colorString.to[self.model](args);
    },
    percentString(places) {
      const self = this.rgb().round(typeof places === "number" ? places : 1);
      const args = self.valpha === 1 ? self.color : [...self.color, this.valpha];
      return colorString.to.rgb.percent(args);
    },
    array() {
      return this.valpha === 1 ? [...this.color] : [...this.color, this.valpha];
    },
    object() {
      const result = {};
      const { channels } = convert[this.model];
      const { labels } = convert[this.model];
      for (let i = 0;i < channels; i++) {
        result[labels[i]] = this.color[i];
      }
      if (this.valpha !== 1) {
        result.alpha = this.valpha;
      }
      return result;
    },
    unitArray() {
      const rgb = this.rgb().color;
      rgb[0] /= 255;
      rgb[1] /= 255;
      rgb[2] /= 255;
      if (this.valpha !== 1) {
        rgb.push(this.valpha);
      }
      return rgb;
    },
    unitObject() {
      const rgb = this.rgb().object();
      rgb.r /= 255;
      rgb.g /= 255;
      rgb.b /= 255;
      if (this.valpha !== 1) {
        rgb.alpha = this.valpha;
      }
      return rgb;
    },
    round(places) {
      places = Math.max(places || 0, 0);
      return new Color([...this.color.map(roundToPlace(places)), this.valpha], this.model);
    },
    alpha(value) {
      if (value !== undefined) {
        return new Color([...this.color, Math.max(0, Math.min(1, value))], this.model);
      }
      return this.valpha;
    },
    red: getset("rgb", 0, maxfn(255)),
    green: getset("rgb", 1, maxfn(255)),
    blue: getset("rgb", 2, maxfn(255)),
    hue: getset(["hsl", "hsv", "hsl", "hwb", "hcg"], 0, (value) => (value % 360 + 360) % 360),
    saturationl: getset("hsl", 1, maxfn(100)),
    lightness: getset("hsl", 2, maxfn(100)),
    saturationv: getset("hsv", 1, maxfn(100)),
    value: getset("hsv", 2, maxfn(100)),
    chroma: getset("hcg", 1, maxfn(100)),
    gray: getset("hcg", 2, maxfn(100)),
    white: getset("hwb", 1, maxfn(100)),
    wblack: getset("hwb", 2, maxfn(100)),
    cyan: getset("cmyk", 0, maxfn(100)),
    magenta: getset("cmyk", 1, maxfn(100)),
    yellow: getset("cmyk", 2, maxfn(100)),
    black: getset("cmyk", 3, maxfn(100)),
    x: getset("xyz", 0, maxfn(95.047)),
    y: getset("xyz", 1, maxfn(100)),
    z: getset("xyz", 2, maxfn(108.833)),
    l: getset("lab", 0, maxfn(100)),
    a: getset("lab", 1),
    b: getset("lab", 2),
    keyword(value) {
      if (value !== undefined) {
        return new Color(value);
      }
      return convert[this.model].keyword(this.color);
    },
    hex(value) {
      if (value !== undefined) {
        return new Color(value);
      }
      return colorString.to.hex(this.rgb().round().color);
    },
    hexa(value) {
      if (value !== undefined) {
        return new Color(value);
      }
      const rgbArray = this.rgb().round().color;
      let alphaHex = Math.round(this.valpha * 255).toString(16).toUpperCase();
      if (alphaHex.length === 1) {
        alphaHex = "0" + alphaHex;
      }
      return colorString.to.hex(rgbArray) + alphaHex;
    },
    rgbNumber() {
      const rgb = this.rgb().color;
      return (rgb[0] & 255) << 16 | (rgb[1] & 255) << 8 | rgb[2] & 255;
    },
    luminosity() {
      const rgb = this.rgb().color;
      const lum = [];
      for (const [i, element] of rgb.entries()) {
        const chan = element / 255;
        lum[i] = chan <= 0.04045 ? chan / 12.92 : ((chan + 0.055) / 1.055) ** 2.4;
      }
      return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    },
    contrast(color2) {
      const lum1 = this.luminosity();
      const lum2 = color2.luminosity();
      if (lum1 > lum2) {
        return (lum1 + 0.05) / (lum2 + 0.05);
      }
      return (lum2 + 0.05) / (lum1 + 0.05);
    },
    level(color2) {
      const contrastRatio = this.contrast(color2);
      if (contrastRatio >= 7) {
        return "AAA";
      }
      return contrastRatio >= 4.5 ? "AA" : "";
    },
    isDark() {
      const rgb = this.rgb().color;
      const yiq = (rgb[0] * 2126 + rgb[1] * 7152 + rgb[2] * 722) / 1e4;
      return yiq < 128;
    },
    isLight() {
      return !this.isDark();
    },
    negate() {
      const rgb = this.rgb();
      for (let i = 0;i < 3; i++) {
        rgb.color[i] = 255 - rgb.color[i];
      }
      return rgb;
    },
    lighten(ratio) {
      const hsl = this.hsl();
      hsl.color[2] += hsl.color[2] * ratio;
      return hsl;
    },
    darken(ratio) {
      const hsl = this.hsl();
      hsl.color[2] -= hsl.color[2] * ratio;
      return hsl;
    },
    saturate(ratio) {
      const hsl = this.hsl();
      hsl.color[1] += hsl.color[1] * ratio;
      return hsl;
    },
    desaturate(ratio) {
      const hsl = this.hsl();
      hsl.color[1] -= hsl.color[1] * ratio;
      return hsl;
    },
    whiten(ratio) {
      const hwb = this.hwb();
      hwb.color[1] += hwb.color[1] * ratio;
      return hwb;
    },
    blacken(ratio) {
      const hwb = this.hwb();
      hwb.color[2] += hwb.color[2] * ratio;
      return hwb;
    },
    grayscale() {
      const rgb = this.rgb().color;
      const value = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
      return Color.rgb(value, value, value);
    },
    fade(ratio) {
      return this.alpha(this.valpha - this.valpha * ratio);
    },
    opaquer(ratio) {
      return this.alpha(this.valpha + this.valpha * ratio);
    },
    rotate(degrees) {
      const hsl = this.hsl();
      let hue = hsl.color[0];
      hue = (hue + degrees) % 360;
      hue = hue < 0 ? 360 + hue : hue;
      hsl.color[0] = hue;
      return hsl;
    },
    mix(mixinColor, weight) {
      if (!mixinColor || !mixinColor.rgb) {
        throw new Error('Argument to "mix" was not a Color instance, but rather an instance of ' + typeof mixinColor);
      }
      const color1 = mixinColor.rgb();
      const color2 = this.rgb();
      const p = weight === undefined ? 0.5 : weight;
      const w = 2 * p - 1;
      const a = color1.alpha() - color2.alpha();
      const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
      const w2 = 1 - w1;
      return Color.rgb(w1 * color1.red() + w2 * color2.red(), w1 * color1.green() + w2 * color2.green(), w1 * color1.blue() + w2 * color2.blue(), color1.alpha() * p + color2.alpha() * (1 - p));
    }
  };
  for (const model of Object.keys(convert)) {
    if (skippedModels.includes(model)) {
      continue;
    }
    const { channels } = convert[model];
    Color.prototype[model] = function(...args) {
      if (this.model === model) {
        return new Color(this);
      }
      if (args.length > 0) {
        return new Color(args, model);
      }
      return new Color([...assertArray(convert[this.model][model].raw(this.color)), this.valpha], model);
    };
    Color[model] = function(...args) {
      let color = args[0];
      if (typeof color === "number") {
        color = zeroArray(args, channels);
      }
      return new Color(color, model);
    };
  }
  function roundTo(number, places) {
    return Number(number.toFixed(places));
  }
  function roundToPlace(places) {
    return function(number) {
      return roundTo(number, places);
    };
  }
  function getset(model, channel, modifier) {
    model = Array.isArray(model) ? model : [model];
    for (const m of model) {
      (limiters[m] || (limiters[m] = []))[channel] = modifier;
    }
    model = model[0];
    return function(value) {
      let result;
      if (value !== undefined) {
        if (modifier) {
          value = modifier(value);
        }
        result = this[model]();
        result.color[channel] = value;
        return result;
      }
      result = this[model]().color[channel];
      if (modifier) {
        result = modifier(result);
      }
      return result;
    };
  }
  function maxfn(max) {
    return function(v) {
      return Math.max(0, Math.min(max, v));
    };
  }
  function assertArray(value) {
    return Array.isArray(value) ? value : [value];
  }
  function zeroArray(array, length) {
    for (let i = 0;i < length; i++) {
      if (typeof array[i] !== "number") {
        array[i] = 0;
      }
    }
    return array;
  }
  module.exports = Color;
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/input.js
var require_input = __commonJS((exports, module) => {
  var color = require_color();
  var is = require_is();
  var sharp = require_sharp();
  var align = {
    left: "low",
    center: "centre",
    centre: "centre",
    right: "high"
  };
  function _inputOptionsFromObject(obj) {
    const { raw, density, limitInputPixels, ignoreIcc, unlimited, sequentialRead, failOn, failOnError, animated, page, pages, subifd } = obj;
    return [raw, density, limitInputPixels, ignoreIcc, unlimited, sequentialRead, failOn, failOnError, animated, page, pages, subifd].some(is.defined) ? { raw, density, limitInputPixels, ignoreIcc, unlimited, sequentialRead, failOn, failOnError, animated, page, pages, subifd } : undefined;
  }
  function _createInputDescriptor(input, inputOptions, containerOptions) {
    const inputDescriptor = {
      failOn: "warning",
      limitInputPixels: Math.pow(16383, 2),
      ignoreIcc: false,
      unlimited: false,
      sequentialRead: true
    };
    if (is.string(input)) {
      inputDescriptor.file = input;
    } else if (is.buffer(input)) {
      if (input.length === 0) {
        throw Error("Input Buffer is empty");
      }
      inputDescriptor.buffer = input;
    } else if (is.arrayBuffer(input)) {
      if (input.byteLength === 0) {
        throw Error("Input bit Array is empty");
      }
      inputDescriptor.buffer = Buffer.from(input, 0, input.byteLength);
    } else if (is.typedArray(input)) {
      if (input.length === 0) {
        throw Error("Input Bit Array is empty");
      }
      inputDescriptor.buffer = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    } else if (is.plainObject(input) && !is.defined(inputOptions)) {
      inputOptions = input;
      if (_inputOptionsFromObject(inputOptions)) {
        inputDescriptor.buffer = [];
      }
    } else if (!is.defined(input) && !is.defined(inputOptions) && is.object(containerOptions) && containerOptions.allowStream) {
      inputDescriptor.buffer = [];
    } else {
      throw new Error(`Unsupported input '${input}' of type ${typeof input}${is.defined(inputOptions) ? ` when also providing options of type ${typeof inputOptions}` : ""}`);
    }
    if (is.object(inputOptions)) {
      if (is.defined(inputOptions.failOnError)) {
        if (is.bool(inputOptions.failOnError)) {
          inputDescriptor.failOn = inputOptions.failOnError ? "warning" : "none";
        } else {
          throw is.invalidParameterError("failOnError", "boolean", inputOptions.failOnError);
        }
      }
      if (is.defined(inputOptions.failOn)) {
        if (is.string(inputOptions.failOn) && is.inArray(inputOptions.failOn, ["none", "truncated", "error", "warning"])) {
          inputDescriptor.failOn = inputOptions.failOn;
        } else {
          throw is.invalidParameterError("failOn", "one of: none, truncated, error, warning", inputOptions.failOn);
        }
      }
      if (is.defined(inputOptions.density)) {
        if (is.inRange(inputOptions.density, 1, 1e5)) {
          inputDescriptor.density = inputOptions.density;
        } else {
          throw is.invalidParameterError("density", "number between 1 and 100000", inputOptions.density);
        }
      }
      if (is.defined(inputOptions.ignoreIcc)) {
        if (is.bool(inputOptions.ignoreIcc)) {
          inputDescriptor.ignoreIcc = inputOptions.ignoreIcc;
        } else {
          throw is.invalidParameterError("ignoreIcc", "boolean", inputOptions.ignoreIcc);
        }
      }
      if (is.defined(inputOptions.limitInputPixels)) {
        if (is.bool(inputOptions.limitInputPixels)) {
          inputDescriptor.limitInputPixels = inputOptions.limitInputPixels ? Math.pow(16383, 2) : 0;
        } else if (is.integer(inputOptions.limitInputPixels) && is.inRange(inputOptions.limitInputPixels, 0, Number.MAX_SAFE_INTEGER)) {
          inputDescriptor.limitInputPixels = inputOptions.limitInputPixels;
        } else {
          throw is.invalidParameterError("limitInputPixels", "positive integer", inputOptions.limitInputPixels);
        }
      }
      if (is.defined(inputOptions.unlimited)) {
        if (is.bool(inputOptions.unlimited)) {
          inputDescriptor.unlimited = inputOptions.unlimited;
        } else {
          throw is.invalidParameterError("unlimited", "boolean", inputOptions.unlimited);
        }
      }
      if (is.defined(inputOptions.sequentialRead)) {
        if (is.bool(inputOptions.sequentialRead)) {
          inputDescriptor.sequentialRead = inputOptions.sequentialRead;
        } else {
          throw is.invalidParameterError("sequentialRead", "boolean", inputOptions.sequentialRead);
        }
      }
      if (is.defined(inputOptions.raw)) {
        if (is.object(inputOptions.raw) && is.integer(inputOptions.raw.width) && inputOptions.raw.width > 0 && is.integer(inputOptions.raw.height) && inputOptions.raw.height > 0 && is.integer(inputOptions.raw.channels) && is.inRange(inputOptions.raw.channels, 1, 4)) {
          inputDescriptor.rawWidth = inputOptions.raw.width;
          inputDescriptor.rawHeight = inputOptions.raw.height;
          inputDescriptor.rawChannels = inputOptions.raw.channels;
          inputDescriptor.rawPremultiplied = !!inputOptions.raw.premultiplied;
          switch (input.constructor) {
            case Uint8Array:
            case Uint8ClampedArray:
              inputDescriptor.rawDepth = "uchar";
              break;
            case Int8Array:
              inputDescriptor.rawDepth = "char";
              break;
            case Uint16Array:
              inputDescriptor.rawDepth = "ushort";
              break;
            case Int16Array:
              inputDescriptor.rawDepth = "short";
              break;
            case Uint32Array:
              inputDescriptor.rawDepth = "uint";
              break;
            case Int32Array:
              inputDescriptor.rawDepth = "int";
              break;
            case Float32Array:
              inputDescriptor.rawDepth = "float";
              break;
            case Float64Array:
              inputDescriptor.rawDepth = "double";
              break;
            default:
              inputDescriptor.rawDepth = "uchar";
              break;
          }
        } else {
          throw new Error("Expected width, height and channels for raw pixel input");
        }
      }
      if (is.defined(inputOptions.animated)) {
        if (is.bool(inputOptions.animated)) {
          inputDescriptor.pages = inputOptions.animated ? -1 : 1;
        } else {
          throw is.invalidParameterError("animated", "boolean", inputOptions.animated);
        }
      }
      if (is.defined(inputOptions.pages)) {
        if (is.integer(inputOptions.pages) && is.inRange(inputOptions.pages, -1, 1e5)) {
          inputDescriptor.pages = inputOptions.pages;
        } else {
          throw is.invalidParameterError("pages", "integer between -1 and 100000", inputOptions.pages);
        }
      }
      if (is.defined(inputOptions.page)) {
        if (is.integer(inputOptions.page) && is.inRange(inputOptions.page, 0, 1e5)) {
          inputDescriptor.page = inputOptions.page;
        } else {
          throw is.invalidParameterError("page", "integer between 0 and 100000", inputOptions.page);
        }
      }
      if (is.defined(inputOptions.level)) {
        if (is.integer(inputOptions.level) && is.inRange(inputOptions.level, 0, 256)) {
          inputDescriptor.level = inputOptions.level;
        } else {
          throw is.invalidParameterError("level", "integer between 0 and 256", inputOptions.level);
        }
      }
      if (is.defined(inputOptions.subifd)) {
        if (is.integer(inputOptions.subifd) && is.inRange(inputOptions.subifd, -1, 1e5)) {
          inputDescriptor.subifd = inputOptions.subifd;
        } else {
          throw is.invalidParameterError("subifd", "integer between -1 and 100000", inputOptions.subifd);
        }
      }
      if (is.defined(inputOptions.create)) {
        if (is.object(inputOptions.create) && is.integer(inputOptions.create.width) && inputOptions.create.width > 0 && is.integer(inputOptions.create.height) && inputOptions.create.height > 0 && is.integer(inputOptions.create.channels)) {
          inputDescriptor.createWidth = inputOptions.create.width;
          inputDescriptor.createHeight = inputOptions.create.height;
          inputDescriptor.createChannels = inputOptions.create.channels;
          if (is.defined(inputOptions.create.noise)) {
            if (!is.object(inputOptions.create.noise)) {
              throw new Error("Expected noise to be an object");
            }
            if (!is.inArray(inputOptions.create.noise.type, ["gaussian"])) {
              throw new Error("Only gaussian noise is supported at the moment");
            }
            if (!is.inRange(inputOptions.create.channels, 1, 4)) {
              throw is.invalidParameterError("create.channels", "number between 1 and 4", inputOptions.create.channels);
            }
            inputDescriptor.createNoiseType = inputOptions.create.noise.type;
            if (is.number(inputOptions.create.noise.mean) && is.inRange(inputOptions.create.noise.mean, 0, 1e4)) {
              inputDescriptor.createNoiseMean = inputOptions.create.noise.mean;
            } else {
              throw is.invalidParameterError("create.noise.mean", "number between 0 and 10000", inputOptions.create.noise.mean);
            }
            if (is.number(inputOptions.create.noise.sigma) && is.inRange(inputOptions.create.noise.sigma, 0, 1e4)) {
              inputDescriptor.createNoiseSigma = inputOptions.create.noise.sigma;
            } else {
              throw is.invalidParameterError("create.noise.sigma", "number between 0 and 10000", inputOptions.create.noise.sigma);
            }
          } else if (is.defined(inputOptions.create.background)) {
            if (!is.inRange(inputOptions.create.channels, 3, 4)) {
              throw is.invalidParameterError("create.channels", "number between 3 and 4", inputOptions.create.channels);
            }
            const background = color(inputOptions.create.background);
            inputDescriptor.createBackground = [
              background.red(),
              background.green(),
              background.blue(),
              Math.round(background.alpha() * 255)
            ];
          } else {
            throw new Error("Expected valid noise or background to create a new input image");
          }
          delete inputDescriptor.buffer;
        } else {
          throw new Error("Expected valid width, height and channels to create a new input image");
        }
      }
      if (is.defined(inputOptions.text)) {
        if (is.object(inputOptions.text) && is.string(inputOptions.text.text)) {
          inputDescriptor.textValue = inputOptions.text.text;
          if (is.defined(inputOptions.text.height) && is.defined(inputOptions.text.dpi)) {
            throw new Error("Expected only one of dpi or height");
          }
          if (is.defined(inputOptions.text.font)) {
            if (is.string(inputOptions.text.font)) {
              inputDescriptor.textFont = inputOptions.text.font;
            } else {
              throw is.invalidParameterError("text.font", "string", inputOptions.text.font);
            }
          }
          if (is.defined(inputOptions.text.fontfile)) {
            if (is.string(inputOptions.text.fontfile)) {
              inputDescriptor.textFontfile = inputOptions.text.fontfile;
            } else {
              throw is.invalidParameterError("text.fontfile", "string", inputOptions.text.fontfile);
            }
          }
          if (is.defined(inputOptions.text.width)) {
            if (is.integer(inputOptions.text.width) && inputOptions.text.width > 0) {
              inputDescriptor.textWidth = inputOptions.text.width;
            } else {
              throw is.invalidParameterError("text.width", "positive integer", inputOptions.text.width);
            }
          }
          if (is.defined(inputOptions.text.height)) {
            if (is.integer(inputOptions.text.height) && inputOptions.text.height > 0) {
              inputDescriptor.textHeight = inputOptions.text.height;
            } else {
              throw is.invalidParameterError("text.height", "positive integer", inputOptions.text.height);
            }
          }
          if (is.defined(inputOptions.text.align)) {
            if (is.string(inputOptions.text.align) && is.string(this.constructor.align[inputOptions.text.align])) {
              inputDescriptor.textAlign = this.constructor.align[inputOptions.text.align];
            } else {
              throw is.invalidParameterError("text.align", "valid alignment", inputOptions.text.align);
            }
          }
          if (is.defined(inputOptions.text.justify)) {
            if (is.bool(inputOptions.text.justify)) {
              inputDescriptor.textJustify = inputOptions.text.justify;
            } else {
              throw is.invalidParameterError("text.justify", "boolean", inputOptions.text.justify);
            }
          }
          if (is.defined(inputOptions.text.dpi)) {
            if (is.integer(inputOptions.text.dpi) && is.inRange(inputOptions.text.dpi, 1, 1e6)) {
              inputDescriptor.textDpi = inputOptions.text.dpi;
            } else {
              throw is.invalidParameterError("text.dpi", "integer between 1 and 1000000", inputOptions.text.dpi);
            }
          }
          if (is.defined(inputOptions.text.rgba)) {
            if (is.bool(inputOptions.text.rgba)) {
              inputDescriptor.textRgba = inputOptions.text.rgba;
            } else {
              throw is.invalidParameterError("text.rgba", "bool", inputOptions.text.rgba);
            }
          }
          if (is.defined(inputOptions.text.spacing)) {
            if (is.integer(inputOptions.text.spacing) && is.inRange(inputOptions.text.spacing, -1e6, 1e6)) {
              inputDescriptor.textSpacing = inputOptions.text.spacing;
            } else {
              throw is.invalidParameterError("text.spacing", "integer between -1000000 and 1000000", inputOptions.text.spacing);
            }
          }
          if (is.defined(inputOptions.text.wrap)) {
            if (is.string(inputOptions.text.wrap) && is.inArray(inputOptions.text.wrap, ["word", "char", "word-char", "none"])) {
              inputDescriptor.textWrap = inputOptions.text.wrap;
            } else {
              throw is.invalidParameterError("text.wrap", "one of: word, char, word-char, none", inputOptions.text.wrap);
            }
          }
          delete inputDescriptor.buffer;
        } else {
          throw new Error("Expected a valid string to create an image with text.");
        }
      }
    } else if (is.defined(inputOptions)) {
      throw new Error("Invalid input options " + inputOptions);
    }
    return inputDescriptor;
  }
  function _write(chunk, encoding, callback) {
    if (Array.isArray(this.options.input.buffer)) {
      if (is.buffer(chunk)) {
        if (this.options.input.buffer.length === 0) {
          this.on("finish", () => {
            this.streamInFinished = true;
          });
        }
        this.options.input.buffer.push(chunk);
        callback();
      } else {
        callback(new Error("Non-Buffer data on Writable Stream"));
      }
    } else {
      callback(new Error("Unexpected data on Writable Stream"));
    }
  }
  function _flattenBufferIn() {
    if (this._isStreamInput()) {
      this.options.input.buffer = Buffer.concat(this.options.input.buffer);
    }
  }
  function _isStreamInput() {
    return Array.isArray(this.options.input.buffer);
  }
  function metadata(callback) {
    const stack = Error();
    if (is.fn(callback)) {
      if (this._isStreamInput()) {
        this.on("finish", () => {
          this._flattenBufferIn();
          sharp.metadata(this.options, (err, metadata2) => {
            if (err) {
              callback(is.nativeError(err, stack));
            } else {
              callback(null, metadata2);
            }
          });
        });
      } else {
        sharp.metadata(this.options, (err, metadata2) => {
          if (err) {
            callback(is.nativeError(err, stack));
          } else {
            callback(null, metadata2);
          }
        });
      }
      return this;
    } else {
      if (this._isStreamInput()) {
        return new Promise((resolve, reject) => {
          const finished = () => {
            this._flattenBufferIn();
            sharp.metadata(this.options, (err, metadata2) => {
              if (err) {
                reject(is.nativeError(err, stack));
              } else {
                resolve(metadata2);
              }
            });
          };
          if (this.writableFinished) {
            finished();
          } else {
            this.once("finish", finished);
          }
        });
      } else {
        return new Promise((resolve, reject) => {
          sharp.metadata(this.options, (err, metadata2) => {
            if (err) {
              reject(is.nativeError(err, stack));
            } else {
              resolve(metadata2);
            }
          });
        });
      }
    }
  }
  function stats(callback) {
    const stack = Error();
    if (is.fn(callback)) {
      if (this._isStreamInput()) {
        this.on("finish", () => {
          this._flattenBufferIn();
          sharp.stats(this.options, (err, stats2) => {
            if (err) {
              callback(is.nativeError(err, stack));
            } else {
              callback(null, stats2);
            }
          });
        });
      } else {
        sharp.stats(this.options, (err, stats2) => {
          if (err) {
            callback(is.nativeError(err, stack));
          } else {
            callback(null, stats2);
          }
        });
      }
      return this;
    } else {
      if (this._isStreamInput()) {
        return new Promise((resolve, reject) => {
          this.on("finish", function() {
            this._flattenBufferIn();
            sharp.stats(this.options, (err, stats2) => {
              if (err) {
                reject(is.nativeError(err, stack));
              } else {
                resolve(stats2);
              }
            });
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          sharp.stats(this.options, (err, stats2) => {
            if (err) {
              reject(is.nativeError(err, stack));
            } else {
              resolve(stats2);
            }
          });
        });
      }
    }
  }
  module.exports = function(Sharp) {
    Object.assign(Sharp.prototype, {
      _inputOptionsFromObject,
      _createInputDescriptor,
      _write,
      _flattenBufferIn,
      _isStreamInput,
      metadata,
      stats
    });
    Sharp.align = align;
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/resize.js
var require_resize = __commonJS((exports, module) => {
  var is = require_is();
  var gravity = {
    center: 0,
    centre: 0,
    north: 1,
    east: 2,
    south: 3,
    west: 4,
    northeast: 5,
    southeast: 6,
    southwest: 7,
    northwest: 8
  };
  var position = {
    top: 1,
    right: 2,
    bottom: 3,
    left: 4,
    "right top": 5,
    "right bottom": 6,
    "left bottom": 7,
    "left top": 8
  };
  var extendWith = {
    background: "background",
    copy: "copy",
    repeat: "repeat",
    mirror: "mirror"
  };
  var strategy = {
    entropy: 16,
    attention: 17
  };
  var kernel = {
    nearest: "nearest",
    linear: "linear",
    cubic: "cubic",
    mitchell: "mitchell",
    lanczos2: "lanczos2",
    lanczos3: "lanczos3"
  };
  var fit = {
    contain: "contain",
    cover: "cover",
    fill: "fill",
    inside: "inside",
    outside: "outside"
  };
  var mapFitToCanvas = {
    contain: "embed",
    cover: "crop",
    fill: "ignore_aspect",
    inside: "max",
    outside: "min"
  };
  function isRotationExpected(options) {
    return options.angle % 360 !== 0 || options.useExifOrientation === true || options.rotationAngle !== 0;
  }
  function isResizeExpected(options) {
    return options.width !== -1 || options.height !== -1;
  }
  function resize(widthOrOptions, height, options) {
    if (isResizeExpected(this.options)) {
      this.options.debuglog("ignoring previous resize options");
    }
    if (this.options.widthPost !== -1) {
      this.options.debuglog("operation order will be: extract, resize, extract");
    }
    if (is.defined(widthOrOptions)) {
      if (is.object(widthOrOptions) && !is.defined(options)) {
        options = widthOrOptions;
      } else if (is.integer(widthOrOptions) && widthOrOptions > 0) {
        this.options.width = widthOrOptions;
      } else {
        throw is.invalidParameterError("width", "positive integer", widthOrOptions);
      }
    } else {
      this.options.width = -1;
    }
    if (is.defined(height)) {
      if (is.integer(height) && height > 0) {
        this.options.height = height;
      } else {
        throw is.invalidParameterError("height", "positive integer", height);
      }
    } else {
      this.options.height = -1;
    }
    if (is.object(options)) {
      if (is.defined(options.width)) {
        if (is.integer(options.width) && options.width > 0) {
          this.options.width = options.width;
        } else {
          throw is.invalidParameterError("width", "positive integer", options.width);
        }
      }
      if (is.defined(options.height)) {
        if (is.integer(options.height) && options.height > 0) {
          this.options.height = options.height;
        } else {
          throw is.invalidParameterError("height", "positive integer", options.height);
        }
      }
      if (is.defined(options.fit)) {
        const canvas = mapFitToCanvas[options.fit];
        if (is.string(canvas)) {
          this.options.canvas = canvas;
        } else {
          throw is.invalidParameterError("fit", "valid fit", options.fit);
        }
      }
      if (is.defined(options.position)) {
        const pos = is.integer(options.position) ? options.position : strategy[options.position] || position[options.position] || gravity[options.position];
        if (is.integer(pos) && (is.inRange(pos, 0, 8) || is.inRange(pos, 16, 17))) {
          this.options.position = pos;
        } else {
          throw is.invalidParameterError("position", "valid position/gravity/strategy", options.position);
        }
      }
      this._setBackgroundColourOption("resizeBackground", options.background);
      if (is.defined(options.kernel)) {
        if (is.string(kernel[options.kernel])) {
          this.options.kernel = kernel[options.kernel];
        } else {
          throw is.invalidParameterError("kernel", "valid kernel name", options.kernel);
        }
      }
      if (is.defined(options.withoutEnlargement)) {
        this._setBooleanOption("withoutEnlargement", options.withoutEnlargement);
      }
      if (is.defined(options.withoutReduction)) {
        this._setBooleanOption("withoutReduction", options.withoutReduction);
      }
      if (is.defined(options.fastShrinkOnLoad)) {
        this._setBooleanOption("fastShrinkOnLoad", options.fastShrinkOnLoad);
      }
    }
    if (isRotationExpected(this.options) && isResizeExpected(this.options)) {
      this.options.rotateBeforePreExtract = true;
    }
    return this;
  }
  function extend(extend2) {
    if (is.integer(extend2) && extend2 > 0) {
      this.options.extendTop = extend2;
      this.options.extendBottom = extend2;
      this.options.extendLeft = extend2;
      this.options.extendRight = extend2;
    } else if (is.object(extend2)) {
      if (is.defined(extend2.top)) {
        if (is.integer(extend2.top) && extend2.top >= 0) {
          this.options.extendTop = extend2.top;
        } else {
          throw is.invalidParameterError("top", "positive integer", extend2.top);
        }
      }
      if (is.defined(extend2.bottom)) {
        if (is.integer(extend2.bottom) && extend2.bottom >= 0) {
          this.options.extendBottom = extend2.bottom;
        } else {
          throw is.invalidParameterError("bottom", "positive integer", extend2.bottom);
        }
      }
      if (is.defined(extend2.left)) {
        if (is.integer(extend2.left) && extend2.left >= 0) {
          this.options.extendLeft = extend2.left;
        } else {
          throw is.invalidParameterError("left", "positive integer", extend2.left);
        }
      }
      if (is.defined(extend2.right)) {
        if (is.integer(extend2.right) && extend2.right >= 0) {
          this.options.extendRight = extend2.right;
        } else {
          throw is.invalidParameterError("right", "positive integer", extend2.right);
        }
      }
      this._setBackgroundColourOption("extendBackground", extend2.background);
      if (is.defined(extend2.extendWith)) {
        if (is.string(extendWith[extend2.extendWith])) {
          this.options.extendWith = extendWith[extend2.extendWith];
        } else {
          throw is.invalidParameterError("extendWith", "one of: background, copy, repeat, mirror", extend2.extendWith);
        }
      }
    } else {
      throw is.invalidParameterError("extend", "integer or object", extend2);
    }
    return this;
  }
  function extract(options) {
    const suffix = isResizeExpected(this.options) || this.options.widthPre !== -1 ? "Post" : "Pre";
    if (this.options[`width${suffix}`] !== -1) {
      this.options.debuglog("ignoring previous extract options");
    }
    ["left", "top", "width", "height"].forEach(function(name) {
      const value = options[name];
      if (is.integer(value) && value >= 0) {
        this.options[name + (name === "left" || name === "top" ? "Offset" : "") + suffix] = value;
      } else {
        throw is.invalidParameterError(name, "integer", value);
      }
    }, this);
    if (isRotationExpected(this.options) && !isResizeExpected(this.options)) {
      if (this.options.widthPre === -1 || this.options.widthPost === -1) {
        this.options.rotateBeforePreExtract = true;
      }
    }
    return this;
  }
  function trim(options) {
    this.options.trimThreshold = 10;
    if (is.defined(options)) {
      if (is.object(options)) {
        if (is.defined(options.background)) {
          this._setBackgroundColourOption("trimBackground", options.background);
        }
        if (is.defined(options.threshold)) {
          if (is.number(options.threshold) && options.threshold >= 0) {
            this.options.trimThreshold = options.threshold;
          } else {
            throw is.invalidParameterError("threshold", "positive number", options.threshold);
          }
        }
        if (is.defined(options.lineArt)) {
          this._setBooleanOption("trimLineArt", options.lineArt);
        }
      } else {
        throw is.invalidParameterError("trim", "object", options);
      }
    }
    if (isRotationExpected(this.options)) {
      this.options.rotateBeforePreExtract = true;
    }
    return this;
  }
  module.exports = function(Sharp) {
    Object.assign(Sharp.prototype, {
      resize,
      extend,
      extract,
      trim
    });
    Sharp.gravity = gravity;
    Sharp.strategy = strategy;
    Sharp.kernel = kernel;
    Sharp.fit = fit;
    Sharp.position = position;
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/composite.js
var require_composite = __commonJS((exports, module) => {
  var is = require_is();
  var blend = {
    clear: "clear",
    source: "source",
    over: "over",
    in: "in",
    out: "out",
    atop: "atop",
    dest: "dest",
    "dest-over": "dest-over",
    "dest-in": "dest-in",
    "dest-out": "dest-out",
    "dest-atop": "dest-atop",
    xor: "xor",
    add: "add",
    saturate: "saturate",
    multiply: "multiply",
    screen: "screen",
    overlay: "overlay",
    darken: "darken",
    lighten: "lighten",
    "colour-dodge": "colour-dodge",
    "color-dodge": "colour-dodge",
    "colour-burn": "colour-burn",
    "color-burn": "colour-burn",
    "hard-light": "hard-light",
    "soft-light": "soft-light",
    difference: "difference",
    exclusion: "exclusion"
  };
  function composite(images) {
    if (!Array.isArray(images)) {
      throw is.invalidParameterError("images to composite", "array", images);
    }
    this.options.composite = images.map((image) => {
      if (!is.object(image)) {
        throw is.invalidParameterError("image to composite", "object", image);
      }
      const inputOptions = this._inputOptionsFromObject(image);
      const composite2 = {
        input: this._createInputDescriptor(image.input, inputOptions, { allowStream: false }),
        blend: "over",
        tile: false,
        left: 0,
        top: 0,
        hasOffset: false,
        gravity: 0,
        premultiplied: false
      };
      if (is.defined(image.blend)) {
        if (is.string(blend[image.blend])) {
          composite2.blend = blend[image.blend];
        } else {
          throw is.invalidParameterError("blend", "valid blend name", image.blend);
        }
      }
      if (is.defined(image.tile)) {
        if (is.bool(image.tile)) {
          composite2.tile = image.tile;
        } else {
          throw is.invalidParameterError("tile", "boolean", image.tile);
        }
      }
      if (is.defined(image.left)) {
        if (is.integer(image.left)) {
          composite2.left = image.left;
        } else {
          throw is.invalidParameterError("left", "integer", image.left);
        }
      }
      if (is.defined(image.top)) {
        if (is.integer(image.top)) {
          composite2.top = image.top;
        } else {
          throw is.invalidParameterError("top", "integer", image.top);
        }
      }
      if (is.defined(image.top) !== is.defined(image.left)) {
        throw new Error("Expected both left and top to be set");
      } else {
        composite2.hasOffset = is.integer(image.top) && is.integer(image.left);
      }
      if (is.defined(image.gravity)) {
        if (is.integer(image.gravity) && is.inRange(image.gravity, 0, 8)) {
          composite2.gravity = image.gravity;
        } else if (is.string(image.gravity) && is.integer(this.constructor.gravity[image.gravity])) {
          composite2.gravity = this.constructor.gravity[image.gravity];
        } else {
          throw is.invalidParameterError("gravity", "valid gravity", image.gravity);
        }
      }
      if (is.defined(image.premultiplied)) {
        if (is.bool(image.premultiplied)) {
          composite2.premultiplied = image.premultiplied;
        } else {
          throw is.invalidParameterError("premultiplied", "boolean", image.premultiplied);
        }
      }
      return composite2;
    });
    return this;
  }
  module.exports = function(Sharp) {
    Sharp.prototype.composite = composite;
    Sharp.blend = blend;
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/operation.js
var require_operation = __commonJS((exports, module) => {
  var color = require_color();
  var is = require_is();
  var vipsPrecision = {
    integer: "integer",
    float: "float",
    approximate: "approximate"
  };
  function rotate(angle, options) {
    if (this.options.useExifOrientation || this.options.angle || this.options.rotationAngle) {
      this.options.debuglog("ignoring previous rotate options");
    }
    if (!is.defined(angle)) {
      this.options.useExifOrientation = true;
    } else if (is.integer(angle) && !(angle % 90)) {
      this.options.angle = angle;
    } else if (is.number(angle)) {
      this.options.rotationAngle = angle;
      if (is.object(options) && options.background) {
        const backgroundColour = color(options.background);
        this.options.rotationBackground = [
          backgroundColour.red(),
          backgroundColour.green(),
          backgroundColour.blue(),
          Math.round(backgroundColour.alpha() * 255)
        ];
      }
    } else {
      throw is.invalidParameterError("angle", "numeric", angle);
    }
    return this;
  }
  function flip(flip2) {
    this.options.flip = is.bool(flip2) ? flip2 : true;
    return this;
  }
  function flop(flop2) {
    this.options.flop = is.bool(flop2) ? flop2 : true;
    return this;
  }
  function affine(matrix, options) {
    const flatMatrix = [].concat(...matrix);
    if (flatMatrix.length === 4 && flatMatrix.every(is.number)) {
      this.options.affineMatrix = flatMatrix;
    } else {
      throw is.invalidParameterError("matrix", "1x4 or 2x2 array", matrix);
    }
    if (is.defined(options)) {
      if (is.object(options)) {
        this._setBackgroundColourOption("affineBackground", options.background);
        if (is.defined(options.idx)) {
          if (is.number(options.idx)) {
            this.options.affineIdx = options.idx;
          } else {
            throw is.invalidParameterError("options.idx", "number", options.idx);
          }
        }
        if (is.defined(options.idy)) {
          if (is.number(options.idy)) {
            this.options.affineIdy = options.idy;
          } else {
            throw is.invalidParameterError("options.idy", "number", options.idy);
          }
        }
        if (is.defined(options.odx)) {
          if (is.number(options.odx)) {
            this.options.affineOdx = options.odx;
          } else {
            throw is.invalidParameterError("options.odx", "number", options.odx);
          }
        }
        if (is.defined(options.ody)) {
          if (is.number(options.ody)) {
            this.options.affineOdy = options.ody;
          } else {
            throw is.invalidParameterError("options.ody", "number", options.ody);
          }
        }
        if (is.defined(options.interpolator)) {
          if (is.inArray(options.interpolator, Object.values(this.constructor.interpolators))) {
            this.options.affineInterpolator = options.interpolator;
          } else {
            throw is.invalidParameterError("options.interpolator", "valid interpolator name", options.interpolator);
          }
        }
      } else {
        throw is.invalidParameterError("options", "object", options);
      }
    }
    return this;
  }
  function sharpen(options, flat, jagged) {
    if (!is.defined(options)) {
      this.options.sharpenSigma = -1;
    } else if (is.bool(options)) {
      this.options.sharpenSigma = options ? -1 : 0;
    } else if (is.number(options) && is.inRange(options, 0.01, 1e4)) {
      this.options.sharpenSigma = options;
      if (is.defined(flat)) {
        if (is.number(flat) && is.inRange(flat, 0, 1e4)) {
          this.options.sharpenM1 = flat;
        } else {
          throw is.invalidParameterError("flat", "number between 0 and 10000", flat);
        }
      }
      if (is.defined(jagged)) {
        if (is.number(jagged) && is.inRange(jagged, 0, 1e4)) {
          this.options.sharpenM2 = jagged;
        } else {
          throw is.invalidParameterError("jagged", "number between 0 and 10000", jagged);
        }
      }
    } else if (is.plainObject(options)) {
      if (is.number(options.sigma) && is.inRange(options.sigma, 0.000001, 10)) {
        this.options.sharpenSigma = options.sigma;
      } else {
        throw is.invalidParameterError("options.sigma", "number between 0.000001 and 10", options.sigma);
      }
      if (is.defined(options.m1)) {
        if (is.number(options.m1) && is.inRange(options.m1, 0, 1e6)) {
          this.options.sharpenM1 = options.m1;
        } else {
          throw is.invalidParameterError("options.m1", "number between 0 and 1000000", options.m1);
        }
      }
      if (is.defined(options.m2)) {
        if (is.number(options.m2) && is.inRange(options.m2, 0, 1e6)) {
          this.options.sharpenM2 = options.m2;
        } else {
          throw is.invalidParameterError("options.m2", "number between 0 and 1000000", options.m2);
        }
      }
      if (is.defined(options.x1)) {
        if (is.number(options.x1) && is.inRange(options.x1, 0, 1e6)) {
          this.options.sharpenX1 = options.x1;
        } else {
          throw is.invalidParameterError("options.x1", "number between 0 and 1000000", options.x1);
        }
      }
      if (is.defined(options.y2)) {
        if (is.number(options.y2) && is.inRange(options.y2, 0, 1e6)) {
          this.options.sharpenY2 = options.y2;
        } else {
          throw is.invalidParameterError("options.y2", "number between 0 and 1000000", options.y2);
        }
      }
      if (is.defined(options.y3)) {
        if (is.number(options.y3) && is.inRange(options.y3, 0, 1e6)) {
          this.options.sharpenY3 = options.y3;
        } else {
          throw is.invalidParameterError("options.y3", "number between 0 and 1000000", options.y3);
        }
      }
    } else {
      throw is.invalidParameterError("sigma", "number between 0.01 and 10000", options);
    }
    return this;
  }
  function median(size) {
    if (!is.defined(size)) {
      this.options.medianSize = 3;
    } else if (is.integer(size) && is.inRange(size, 1, 1000)) {
      this.options.medianSize = size;
    } else {
      throw is.invalidParameterError("size", "integer between 1 and 1000", size);
    }
    return this;
  }
  function blur(options) {
    let sigma;
    if (is.number(options)) {
      sigma = options;
    } else if (is.plainObject(options)) {
      if (!is.number(options.sigma)) {
        throw is.invalidParameterError("options.sigma", "number between 0.3 and 1000", sigma);
      }
      sigma = options.sigma;
      if ("precision" in options) {
        if (is.string(vipsPrecision[options.precision])) {
          this.options.precision = vipsPrecision[options.precision];
        } else {
          throw is.invalidParameterError("precision", "one of: integer, float, approximate", options.precision);
        }
      }
      if ("minAmplitude" in options) {
        if (is.number(options.minAmplitude) && is.inRange(options.minAmplitude, 0.001, 1)) {
          this.options.minAmpl = options.minAmplitude;
        } else {
          throw is.invalidParameterError("minAmplitude", "number between 0.001 and 1", options.minAmplitude);
        }
      }
    }
    if (!is.defined(options)) {
      this.options.blurSigma = -1;
    } else if (is.bool(options)) {
      this.options.blurSigma = options ? -1 : 0;
    } else if (is.number(sigma) && is.inRange(sigma, 0.3, 1000)) {
      this.options.blurSigma = sigma;
    } else {
      throw is.invalidParameterError("sigma", "number between 0.3 and 1000", sigma);
    }
    return this;
  }
  function flatten(options) {
    this.options.flatten = is.bool(options) ? options : true;
    if (is.object(options)) {
      this._setBackgroundColourOption("flattenBackground", options.background);
    }
    return this;
  }
  function unflatten() {
    this.options.unflatten = true;
    return this;
  }
  function gamma(gamma2, gammaOut) {
    if (!is.defined(gamma2)) {
      this.options.gamma = 2.2;
    } else if (is.number(gamma2) && is.inRange(gamma2, 1, 3)) {
      this.options.gamma = gamma2;
    } else {
      throw is.invalidParameterError("gamma", "number between 1.0 and 3.0", gamma2);
    }
    if (!is.defined(gammaOut)) {
      this.options.gammaOut = this.options.gamma;
    } else if (is.number(gammaOut) && is.inRange(gammaOut, 1, 3)) {
      this.options.gammaOut = gammaOut;
    } else {
      throw is.invalidParameterError("gammaOut", "number between 1.0 and 3.0", gammaOut);
    }
    return this;
  }
  function negate(options) {
    this.options.negate = is.bool(options) ? options : true;
    if (is.plainObject(options) && "alpha" in options) {
      if (!is.bool(options.alpha)) {
        throw is.invalidParameterError("alpha", "should be boolean value", options.alpha);
      } else {
        this.options.negateAlpha = options.alpha;
      }
    }
    return this;
  }
  function normalise(options) {
    if (is.plainObject(options)) {
      if (is.defined(options.lower)) {
        if (is.number(options.lower) && is.inRange(options.lower, 0, 99)) {
          this.options.normaliseLower = options.lower;
        } else {
          throw is.invalidParameterError("lower", "number between 0 and 99", options.lower);
        }
      }
      if (is.defined(options.upper)) {
        if (is.number(options.upper) && is.inRange(options.upper, 1, 100)) {
          this.options.normaliseUpper = options.upper;
        } else {
          throw is.invalidParameterError("upper", "number between 1 and 100", options.upper);
        }
      }
    }
    if (this.options.normaliseLower >= this.options.normaliseUpper) {
      throw is.invalidParameterError("range", "lower to be less than upper", `${this.options.normaliseLower} >= ${this.options.normaliseUpper}`);
    }
    this.options.normalise = true;
    return this;
  }
  function normalize(options) {
    return this.normalise(options);
  }
  function clahe(options) {
    if (is.plainObject(options)) {
      if (is.integer(options.width) && options.width > 0) {
        this.options.claheWidth = options.width;
      } else {
        throw is.invalidParameterError("width", "integer greater than zero", options.width);
      }
      if (is.integer(options.height) && options.height > 0) {
        this.options.claheHeight = options.height;
      } else {
        throw is.invalidParameterError("height", "integer greater than zero", options.height);
      }
      if (is.defined(options.maxSlope)) {
        if (is.integer(options.maxSlope) && is.inRange(options.maxSlope, 0, 100)) {
          this.options.claheMaxSlope = options.maxSlope;
        } else {
          throw is.invalidParameterError("maxSlope", "integer between 0 and 100", options.maxSlope);
        }
      }
    } else {
      throw is.invalidParameterError("options", "plain object", options);
    }
    return this;
  }
  function convolve(kernel) {
    if (!is.object(kernel) || !Array.isArray(kernel.kernel) || !is.integer(kernel.width) || !is.integer(kernel.height) || !is.inRange(kernel.width, 3, 1001) || !is.inRange(kernel.height, 3, 1001) || kernel.height * kernel.width !== kernel.kernel.length) {
      throw new Error("Invalid convolution kernel");
    }
    if (!is.integer(kernel.scale)) {
      kernel.scale = kernel.kernel.reduce(function(a, b) {
        return a + b;
      }, 0);
    }
    if (kernel.scale < 1) {
      kernel.scale = 1;
    }
    if (!is.integer(kernel.offset)) {
      kernel.offset = 0;
    }
    this.options.convKernel = kernel;
    return this;
  }
  function threshold(threshold2, options) {
    if (!is.defined(threshold2)) {
      this.options.threshold = 128;
    } else if (is.bool(threshold2)) {
      this.options.threshold = threshold2 ? 128 : 0;
    } else if (is.integer(threshold2) && is.inRange(threshold2, 0, 255)) {
      this.options.threshold = threshold2;
    } else {
      throw is.invalidParameterError("threshold", "integer between 0 and 255", threshold2);
    }
    if (!is.object(options) || options.greyscale === true || options.grayscale === true) {
      this.options.thresholdGrayscale = true;
    } else {
      this.options.thresholdGrayscale = false;
    }
    return this;
  }
  function boolean(operand, operator, options) {
    this.options.boolean = this._createInputDescriptor(operand, options);
    if (is.string(operator) && is.inArray(operator, ["and", "or", "eor"])) {
      this.options.booleanOp = operator;
    } else {
      throw is.invalidParameterError("operator", "one of: and, or, eor", operator);
    }
    return this;
  }
  function linear(a, b) {
    if (!is.defined(a) && is.number(b)) {
      a = 1;
    } else if (is.number(a) && !is.defined(b)) {
      b = 0;
    }
    if (!is.defined(a)) {
      this.options.linearA = [];
    } else if (is.number(a)) {
      this.options.linearA = [a];
    } else if (Array.isArray(a) && a.length && a.every(is.number)) {
      this.options.linearA = a;
    } else {
      throw is.invalidParameterError("a", "number or array of numbers", a);
    }
    if (!is.defined(b)) {
      this.options.linearB = [];
    } else if (is.number(b)) {
      this.options.linearB = [b];
    } else if (Array.isArray(b) && b.length && b.every(is.number)) {
      this.options.linearB = b;
    } else {
      throw is.invalidParameterError("b", "number or array of numbers", b);
    }
    if (this.options.linearA.length !== this.options.linearB.length) {
      throw new Error("Expected a and b to be arrays of the same length");
    }
    return this;
  }
  function recomb(inputMatrix) {
    if (!Array.isArray(inputMatrix)) {
      throw is.invalidParameterError("inputMatrix", "array", inputMatrix);
    }
    if (inputMatrix.length !== 3 && inputMatrix.length !== 4) {
      throw is.invalidParameterError("inputMatrix", "3x3 or 4x4 array", inputMatrix.length);
    }
    const recombMatrix = inputMatrix.flat().map(Number);
    if (recombMatrix.length !== 9 && recombMatrix.length !== 16) {
      throw is.invalidParameterError("inputMatrix", "cardinality of 9 or 16", recombMatrix.length);
    }
    this.options.recombMatrix = recombMatrix;
    return this;
  }
  function modulate(options) {
    if (!is.plainObject(options)) {
      throw is.invalidParameterError("options", "plain object", options);
    }
    if ("brightness" in options) {
      if (is.number(options.brightness) && options.brightness >= 0) {
        this.options.brightness = options.brightness;
      } else {
        throw is.invalidParameterError("brightness", "number above zero", options.brightness);
      }
    }
    if ("saturation" in options) {
      if (is.number(options.saturation) && options.saturation >= 0) {
        this.options.saturation = options.saturation;
      } else {
        throw is.invalidParameterError("saturation", "number above zero", options.saturation);
      }
    }
    if ("hue" in options) {
      if (is.integer(options.hue)) {
        this.options.hue = options.hue % 360;
      } else {
        throw is.invalidParameterError("hue", "number", options.hue);
      }
    }
    if ("lightness" in options) {
      if (is.number(options.lightness)) {
        this.options.lightness = options.lightness;
      } else {
        throw is.invalidParameterError("lightness", "number", options.lightness);
      }
    }
    return this;
  }
  module.exports = function(Sharp) {
    Object.assign(Sharp.prototype, {
      rotate,
      flip,
      flop,
      affine,
      sharpen,
      median,
      blur,
      flatten,
      unflatten,
      gamma,
      negate,
      normalise,
      normalize,
      clahe,
      convolve,
      threshold,
      boolean,
      linear,
      recomb,
      modulate
    });
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/colour.js
var require_colour = __commonJS((exports, module) => {
  var color = require_color();
  var is = require_is();
  var colourspace = {
    multiband: "multiband",
    "b-w": "b-w",
    bw: "b-w",
    cmyk: "cmyk",
    srgb: "srgb"
  };
  function tint(tint2) {
    this._setBackgroundColourOption("tint", tint2);
    return this;
  }
  function greyscale(greyscale2) {
    this.options.greyscale = is.bool(greyscale2) ? greyscale2 : true;
    return this;
  }
  function grayscale(grayscale2) {
    return this.greyscale(grayscale2);
  }
  function pipelineColourspace(colourspace2) {
    if (!is.string(colourspace2)) {
      throw is.invalidParameterError("colourspace", "string", colourspace2);
    }
    this.options.colourspacePipeline = colourspace2;
    return this;
  }
  function pipelineColorspace(colorspace) {
    return this.pipelineColourspace(colorspace);
  }
  function toColourspace(colourspace2) {
    if (!is.string(colourspace2)) {
      throw is.invalidParameterError("colourspace", "string", colourspace2);
    }
    this.options.colourspace = colourspace2;
    return this;
  }
  function toColorspace(colorspace) {
    return this.toColourspace(colorspace);
  }
  function _setBackgroundColourOption(key, value) {
    if (is.defined(value)) {
      if (is.object(value) || is.string(value)) {
        const colour = color(value);
        this.options[key] = [
          colour.red(),
          colour.green(),
          colour.blue(),
          Math.round(colour.alpha() * 255)
        ];
      } else {
        throw is.invalidParameterError("background", "object or string", value);
      }
    }
  }
  module.exports = function(Sharp) {
    Object.assign(Sharp.prototype, {
      tint,
      greyscale,
      grayscale,
      pipelineColourspace,
      pipelineColorspace,
      toColourspace,
      toColorspace,
      _setBackgroundColourOption
    });
    Sharp.colourspace = colourspace;
    Sharp.colorspace = colourspace;
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/channel.js
var require_channel = __commonJS((exports, module) => {
  var is = require_is();
  var bool = {
    and: "and",
    or: "or",
    eor: "eor"
  };
  function removeAlpha() {
    this.options.removeAlpha = true;
    return this;
  }
  function ensureAlpha(alpha) {
    if (is.defined(alpha)) {
      if (is.number(alpha) && is.inRange(alpha, 0, 1)) {
        this.options.ensureAlpha = alpha;
      } else {
        throw is.invalidParameterError("alpha", "number between 0 and 1", alpha);
      }
    } else {
      this.options.ensureAlpha = 1;
    }
    return this;
  }
  function extractChannel(channel) {
    const channelMap = { red: 0, green: 1, blue: 2, alpha: 3 };
    if (Object.keys(channelMap).includes(channel)) {
      channel = channelMap[channel];
    }
    if (is.integer(channel) && is.inRange(channel, 0, 4)) {
      this.options.extractChannel = channel;
    } else {
      throw is.invalidParameterError("channel", "integer or one of: red, green, blue, alpha", channel);
    }
    return this;
  }
  function joinChannel(images, options) {
    if (Array.isArray(images)) {
      images.forEach(function(image) {
        this.options.joinChannelIn.push(this._createInputDescriptor(image, options));
      }, this);
    } else {
      this.options.joinChannelIn.push(this._createInputDescriptor(images, options));
    }
    return this;
  }
  function bandbool(boolOp) {
    if (is.string(boolOp) && is.inArray(boolOp, ["and", "or", "eor"])) {
      this.options.bandBoolOp = boolOp;
    } else {
      throw is.invalidParameterError("boolOp", "one of: and, or, eor", boolOp);
    }
    return this;
  }
  module.exports = function(Sharp) {
    Object.assign(Sharp.prototype, {
      removeAlpha,
      ensureAlpha,
      extractChannel,
      joinChannel,
      bandbool
    });
    Sharp.bool = bool;
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/output.js
var require_output = __commonJS((exports, module) => {
  var path2 = __require("path");
  var is = require_is();
  var sharp = require_sharp();
  var formats = new Map([
    ["heic", "heif"],
    ["heif", "heif"],
    ["avif", "avif"],
    ["jpeg", "jpeg"],
    ["jpg", "jpeg"],
    ["jpe", "jpeg"],
    ["tile", "tile"],
    ["dz", "tile"],
    ["png", "png"],
    ["raw", "raw"],
    ["tiff", "tiff"],
    ["tif", "tiff"],
    ["webp", "webp"],
    ["gif", "gif"],
    ["jp2", "jp2"],
    ["jpx", "jp2"],
    ["j2k", "jp2"],
    ["j2c", "jp2"],
    ["jxl", "jxl"]
  ]);
  var jp2Regex = /\.(jp[2x]|j2[kc])$/i;
  var errJp2Save = () => new Error("JP2 output requires libvips with support for OpenJPEG");
  var bitdepthFromColourCount = (colours) => 1 << 31 - Math.clz32(Math.ceil(Math.log2(colours)));
  function toFile(fileOut, callback) {
    let err;
    if (!is.string(fileOut)) {
      err = new Error("Missing output file path");
    } else if (is.string(this.options.input.file) && path2.resolve(this.options.input.file) === path2.resolve(fileOut)) {
      err = new Error("Cannot use same file for input and output");
    } else if (jp2Regex.test(path2.extname(fileOut)) && !this.constructor.format.jp2k.output.file) {
      err = errJp2Save();
    }
    if (err) {
      if (is.fn(callback)) {
        callback(err);
      } else {
        return Promise.reject(err);
      }
    } else {
      this.options.fileOut = fileOut;
      const stack = Error();
      return this._pipeline(callback, stack);
    }
    return this;
  }
  function toBuffer(options, callback) {
    if (is.object(options)) {
      this._setBooleanOption("resolveWithObject", options.resolveWithObject);
    } else if (this.options.resolveWithObject) {
      this.options.resolveWithObject = false;
    }
    this.options.fileOut = "";
    const stack = Error();
    return this._pipeline(is.fn(options) ? options : callback, stack);
  }
  function keepExif() {
    this.options.keepMetadata |= 1;
    return this;
  }
  function withExif(exif) {
    if (is.object(exif)) {
      for (const [ifd, entries] of Object.entries(exif)) {
        if (is.object(entries)) {
          for (const [k, v] of Object.entries(entries)) {
            if (is.string(v)) {
              this.options.withExif[`exif-${ifd.toLowerCase()}-${k}`] = v;
            } else {
              throw is.invalidParameterError(`${ifd}.${k}`, "string", v);
            }
          }
        } else {
          throw is.invalidParameterError(ifd, "object", entries);
        }
      }
    } else {
      throw is.invalidParameterError("exif", "object", exif);
    }
    this.options.withExifMerge = false;
    return this.keepExif();
  }
  function withExifMerge(exif) {
    this.withExif(exif);
    this.options.withExifMerge = true;
    return this;
  }
  function keepIccProfile() {
    this.options.keepMetadata |= 8;
    return this;
  }
  function withIccProfile(icc, options) {
    if (is.string(icc)) {
      this.options.withIccProfile = icc;
    } else {
      throw is.invalidParameterError("icc", "string", icc);
    }
    this.keepIccProfile();
    if (is.object(options)) {
      if (is.defined(options.attach)) {
        if (is.bool(options.attach)) {
          if (!options.attach) {
            this.options.keepMetadata &= ~8;
          }
        } else {
          throw is.invalidParameterError("attach", "boolean", options.attach);
        }
      }
    }
    return this;
  }
  function keepMetadata() {
    this.options.keepMetadata = 31;
    return this;
  }
  function withMetadata(options) {
    this.keepMetadata();
    this.withIccProfile("srgb");
    if (is.object(options)) {
      if (is.defined(options.orientation)) {
        if (is.integer(options.orientation) && is.inRange(options.orientation, 1, 8)) {
          this.options.withMetadataOrientation = options.orientation;
        } else {
          throw is.invalidParameterError("orientation", "integer between 1 and 8", options.orientation);
        }
      }
      if (is.defined(options.density)) {
        if (is.number(options.density) && options.density > 0) {
          this.options.withMetadataDensity = options.density;
        } else {
          throw is.invalidParameterError("density", "positive number", options.density);
        }
      }
      if (is.defined(options.icc)) {
        this.withIccProfile(options.icc);
      }
      if (is.defined(options.exif)) {
        this.withExifMerge(options.exif);
      }
    }
    return this;
  }
  function toFormat(format, options) {
    const actualFormat = formats.get((is.object(format) && is.string(format.id) ? format.id : format).toLowerCase());
    if (!actualFormat) {
      throw is.invalidParameterError("format", `one of: ${[...formats.keys()].join(", ")}`, format);
    }
    return this[actualFormat](options);
  }
  function jpeg(options) {
    if (is.object(options)) {
      if (is.defined(options.quality)) {
        if (is.integer(options.quality) && is.inRange(options.quality, 1, 100)) {
          this.options.jpegQuality = options.quality;
        } else {
          throw is.invalidParameterError("quality", "integer between 1 and 100", options.quality);
        }
      }
      if (is.defined(options.progressive)) {
        this._setBooleanOption("jpegProgressive", options.progressive);
      }
      if (is.defined(options.chromaSubsampling)) {
        if (is.string(options.chromaSubsampling) && is.inArray(options.chromaSubsampling, ["4:2:0", "4:4:4"])) {
          this.options.jpegChromaSubsampling = options.chromaSubsampling;
        } else {
          throw is.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", options.chromaSubsampling);
        }
      }
      const optimiseCoding = is.bool(options.optimizeCoding) ? options.optimizeCoding : options.optimiseCoding;
      if (is.defined(optimiseCoding)) {
        this._setBooleanOption("jpegOptimiseCoding", optimiseCoding);
      }
      if (is.defined(options.mozjpeg)) {
        if (is.bool(options.mozjpeg)) {
          if (options.mozjpeg) {
            this.options.jpegTrellisQuantisation = true;
            this.options.jpegOvershootDeringing = true;
            this.options.jpegOptimiseScans = true;
            this.options.jpegProgressive = true;
            this.options.jpegQuantisationTable = 3;
          }
        } else {
          throw is.invalidParameterError("mozjpeg", "boolean", options.mozjpeg);
        }
      }
      const trellisQuantisation = is.bool(options.trellisQuantization) ? options.trellisQuantization : options.trellisQuantisation;
      if (is.defined(trellisQuantisation)) {
        this._setBooleanOption("jpegTrellisQuantisation", trellisQuantisation);
      }
      if (is.defined(options.overshootDeringing)) {
        this._setBooleanOption("jpegOvershootDeringing", options.overshootDeringing);
      }
      const optimiseScans = is.bool(options.optimizeScans) ? options.optimizeScans : options.optimiseScans;
      if (is.defined(optimiseScans)) {
        this._setBooleanOption("jpegOptimiseScans", optimiseScans);
        if (optimiseScans) {
          this.options.jpegProgressive = true;
        }
      }
      const quantisationTable = is.number(options.quantizationTable) ? options.quantizationTable : options.quantisationTable;
      if (is.defined(quantisationTable)) {
        if (is.integer(quantisationTable) && is.inRange(quantisationTable, 0, 8)) {
          this.options.jpegQuantisationTable = quantisationTable;
        } else {
          throw is.invalidParameterError("quantisationTable", "integer between 0 and 8", quantisationTable);
        }
      }
    }
    return this._updateFormatOut("jpeg", options);
  }
  function png(options) {
    if (is.object(options)) {
      if (is.defined(options.progressive)) {
        this._setBooleanOption("pngProgressive", options.progressive);
      }
      if (is.defined(options.compressionLevel)) {
        if (is.integer(options.compressionLevel) && is.inRange(options.compressionLevel, 0, 9)) {
          this.options.pngCompressionLevel = options.compressionLevel;
        } else {
          throw is.invalidParameterError("compressionLevel", "integer between 0 and 9", options.compressionLevel);
        }
      }
      if (is.defined(options.adaptiveFiltering)) {
        this._setBooleanOption("pngAdaptiveFiltering", options.adaptiveFiltering);
      }
      const colours = options.colours || options.colors;
      if (is.defined(colours)) {
        if (is.integer(colours) && is.inRange(colours, 2, 256)) {
          this.options.pngBitdepth = bitdepthFromColourCount(colours);
        } else {
          throw is.invalidParameterError("colours", "integer between 2 and 256", colours);
        }
      }
      if (is.defined(options.palette)) {
        this._setBooleanOption("pngPalette", options.palette);
      } else if ([options.quality, options.effort, options.colours, options.colors, options.dither].some(is.defined)) {
        this._setBooleanOption("pngPalette", true);
      }
      if (this.options.pngPalette) {
        if (is.defined(options.quality)) {
          if (is.integer(options.quality) && is.inRange(options.quality, 0, 100)) {
            this.options.pngQuality = options.quality;
          } else {
            throw is.invalidParameterError("quality", "integer between 0 and 100", options.quality);
          }
        }
        if (is.defined(options.effort)) {
          if (is.integer(options.effort) && is.inRange(options.effort, 1, 10)) {
            this.options.pngEffort = options.effort;
          } else {
            throw is.invalidParameterError("effort", "integer between 1 and 10", options.effort);
          }
        }
        if (is.defined(options.dither)) {
          if (is.number(options.dither) && is.inRange(options.dither, 0, 1)) {
            this.options.pngDither = options.dither;
          } else {
            throw is.invalidParameterError("dither", "number between 0.0 and 1.0", options.dither);
          }
        }
      }
    }
    return this._updateFormatOut("png", options);
  }
  function webp(options) {
    if (is.object(options)) {
      if (is.defined(options.quality)) {
        if (is.integer(options.quality) && is.inRange(options.quality, 1, 100)) {
          this.options.webpQuality = options.quality;
        } else {
          throw is.invalidParameterError("quality", "integer between 1 and 100", options.quality);
        }
      }
      if (is.defined(options.alphaQuality)) {
        if (is.integer(options.alphaQuality) && is.inRange(options.alphaQuality, 0, 100)) {
          this.options.webpAlphaQuality = options.alphaQuality;
        } else {
          throw is.invalidParameterError("alphaQuality", "integer between 0 and 100", options.alphaQuality);
        }
      }
      if (is.defined(options.lossless)) {
        this._setBooleanOption("webpLossless", options.lossless);
      }
      if (is.defined(options.nearLossless)) {
        this._setBooleanOption("webpNearLossless", options.nearLossless);
      }
      if (is.defined(options.smartSubsample)) {
        this._setBooleanOption("webpSmartSubsample", options.smartSubsample);
      }
      if (is.defined(options.preset)) {
        if (is.string(options.preset) && is.inArray(options.preset, ["default", "photo", "picture", "drawing", "icon", "text"])) {
          this.options.webpPreset = options.preset;
        } else {
          throw is.invalidParameterError("preset", "one of: default, photo, picture, drawing, icon, text", options.preset);
        }
      }
      if (is.defined(options.effort)) {
        if (is.integer(options.effort) && is.inRange(options.effort, 0, 6)) {
          this.options.webpEffort = options.effort;
        } else {
          throw is.invalidParameterError("effort", "integer between 0 and 6", options.effort);
        }
      }
      if (is.defined(options.minSize)) {
        this._setBooleanOption("webpMinSize", options.minSize);
      }
      if (is.defined(options.mixed)) {
        this._setBooleanOption("webpMixed", options.mixed);
      }
    }
    trySetAnimationOptions(options, this.options);
    return this._updateFormatOut("webp", options);
  }
  function gif(options) {
    if (is.object(options)) {
      if (is.defined(options.reuse)) {
        this._setBooleanOption("gifReuse", options.reuse);
      }
      if (is.defined(options.progressive)) {
        this._setBooleanOption("gifProgressive", options.progressive);
      }
      const colours = options.colours || options.colors;
      if (is.defined(colours)) {
        if (is.integer(colours) && is.inRange(colours, 2, 256)) {
          this.options.gifBitdepth = bitdepthFromColourCount(colours);
        } else {
          throw is.invalidParameterError("colours", "integer between 2 and 256", colours);
        }
      }
      if (is.defined(options.effort)) {
        if (is.number(options.effort) && is.inRange(options.effort, 1, 10)) {
          this.options.gifEffort = options.effort;
        } else {
          throw is.invalidParameterError("effort", "integer between 1 and 10", options.effort);
        }
      }
      if (is.defined(options.dither)) {
        if (is.number(options.dither) && is.inRange(options.dither, 0, 1)) {
          this.options.gifDither = options.dither;
        } else {
          throw is.invalidParameterError("dither", "number between 0.0 and 1.0", options.dither);
        }
      }
      if (is.defined(options.interFrameMaxError)) {
        if (is.number(options.interFrameMaxError) && is.inRange(options.interFrameMaxError, 0, 32)) {
          this.options.gifInterFrameMaxError = options.interFrameMaxError;
        } else {
          throw is.invalidParameterError("interFrameMaxError", "number between 0.0 and 32.0", options.interFrameMaxError);
        }
      }
      if (is.defined(options.interPaletteMaxError)) {
        if (is.number(options.interPaletteMaxError) && is.inRange(options.interPaletteMaxError, 0, 256)) {
          this.options.gifInterPaletteMaxError = options.interPaletteMaxError;
        } else {
          throw is.invalidParameterError("interPaletteMaxError", "number between 0.0 and 256.0", options.interPaletteMaxError);
        }
      }
    }
    trySetAnimationOptions(options, this.options);
    return this._updateFormatOut("gif", options);
  }
  function jp2(options) {
    if (!this.constructor.format.jp2k.output.buffer) {
      throw errJp2Save();
    }
    if (is.object(options)) {
      if (is.defined(options.quality)) {
        if (is.integer(options.quality) && is.inRange(options.quality, 1, 100)) {
          this.options.jp2Quality = options.quality;
        } else {
          throw is.invalidParameterError("quality", "integer between 1 and 100", options.quality);
        }
      }
      if (is.defined(options.lossless)) {
        if (is.bool(options.lossless)) {
          this.options.jp2Lossless = options.lossless;
        } else {
          throw is.invalidParameterError("lossless", "boolean", options.lossless);
        }
      }
      if (is.defined(options.tileWidth)) {
        if (is.integer(options.tileWidth) && is.inRange(options.tileWidth, 1, 32768)) {
          this.options.jp2TileWidth = options.tileWidth;
        } else {
          throw is.invalidParameterError("tileWidth", "integer between 1 and 32768", options.tileWidth);
        }
      }
      if (is.defined(options.tileHeight)) {
        if (is.integer(options.tileHeight) && is.inRange(options.tileHeight, 1, 32768)) {
          this.options.jp2TileHeight = options.tileHeight;
        } else {
          throw is.invalidParameterError("tileHeight", "integer between 1 and 32768", options.tileHeight);
        }
      }
      if (is.defined(options.chromaSubsampling)) {
        if (is.string(options.chromaSubsampling) && is.inArray(options.chromaSubsampling, ["4:2:0", "4:4:4"])) {
          this.options.jp2ChromaSubsampling = options.chromaSubsampling;
        } else {
          throw is.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", options.chromaSubsampling);
        }
      }
    }
    return this._updateFormatOut("jp2", options);
  }
  function trySetAnimationOptions(source, target) {
    if (is.object(source) && is.defined(source.loop)) {
      if (is.integer(source.loop) && is.inRange(source.loop, 0, 65535)) {
        target.loop = source.loop;
      } else {
        throw is.invalidParameterError("loop", "integer between 0 and 65535", source.loop);
      }
    }
    if (is.object(source) && is.defined(source.delay)) {
      if (is.integer(source.delay) && is.inRange(source.delay, 0, 65535)) {
        target.delay = [source.delay];
      } else if (Array.isArray(source.delay) && source.delay.every(is.integer) && source.delay.every((v) => is.inRange(v, 0, 65535))) {
        target.delay = source.delay;
      } else {
        throw is.invalidParameterError("delay", "integer or an array of integers between 0 and 65535", source.delay);
      }
    }
  }
  function tiff(options) {
    if (is.object(options)) {
      if (is.defined(options.quality)) {
        if (is.integer(options.quality) && is.inRange(options.quality, 1, 100)) {
          this.options.tiffQuality = options.quality;
        } else {
          throw is.invalidParameterError("quality", "integer between 1 and 100", options.quality);
        }
      }
      if (is.defined(options.bitdepth)) {
        if (is.integer(options.bitdepth) && is.inArray(options.bitdepth, [1, 2, 4, 8])) {
          this.options.tiffBitdepth = options.bitdepth;
        } else {
          throw is.invalidParameterError("bitdepth", "1, 2, 4 or 8", options.bitdepth);
        }
      }
      if (is.defined(options.tile)) {
        this._setBooleanOption("tiffTile", options.tile);
      }
      if (is.defined(options.tileWidth)) {
        if (is.integer(options.tileWidth) && options.tileWidth > 0) {
          this.options.tiffTileWidth = options.tileWidth;
        } else {
          throw is.invalidParameterError("tileWidth", "integer greater than zero", options.tileWidth);
        }
      }
      if (is.defined(options.tileHeight)) {
        if (is.integer(options.tileHeight) && options.tileHeight > 0) {
          this.options.tiffTileHeight = options.tileHeight;
        } else {
          throw is.invalidParameterError("tileHeight", "integer greater than zero", options.tileHeight);
        }
      }
      if (is.defined(options.miniswhite)) {
        this._setBooleanOption("tiffMiniswhite", options.miniswhite);
      }
      if (is.defined(options.pyramid)) {
        this._setBooleanOption("tiffPyramid", options.pyramid);
      }
      if (is.defined(options.xres)) {
        if (is.number(options.xres) && options.xres > 0) {
          this.options.tiffXres = options.xres;
        } else {
          throw is.invalidParameterError("xres", "number greater than zero", options.xres);
        }
      }
      if (is.defined(options.yres)) {
        if (is.number(options.yres) && options.yres > 0) {
          this.options.tiffYres = options.yres;
        } else {
          throw is.invalidParameterError("yres", "number greater than zero", options.yres);
        }
      }
      if (is.defined(options.compression)) {
        if (is.string(options.compression) && is.inArray(options.compression, ["none", "jpeg", "deflate", "packbits", "ccittfax4", "lzw", "webp", "zstd", "jp2k"])) {
          this.options.tiffCompression = options.compression;
        } else {
          throw is.invalidParameterError("compression", "one of: none, jpeg, deflate, packbits, ccittfax4, lzw, webp, zstd, jp2k", options.compression);
        }
      }
      if (is.defined(options.predictor)) {
        if (is.string(options.predictor) && is.inArray(options.predictor, ["none", "horizontal", "float"])) {
          this.options.tiffPredictor = options.predictor;
        } else {
          throw is.invalidParameterError("predictor", "one of: none, horizontal, float", options.predictor);
        }
      }
      if (is.defined(options.resolutionUnit)) {
        if (is.string(options.resolutionUnit) && is.inArray(options.resolutionUnit, ["inch", "cm"])) {
          this.options.tiffResolutionUnit = options.resolutionUnit;
        } else {
          throw is.invalidParameterError("resolutionUnit", "one of: inch, cm", options.resolutionUnit);
        }
      }
    }
    return this._updateFormatOut("tiff", options);
  }
  function avif(options) {
    return this.heif({ ...options, compression: "av1" });
  }
  function heif(options) {
    if (is.object(options)) {
      if (is.string(options.compression) && is.inArray(options.compression, ["av1", "hevc"])) {
        this.options.heifCompression = options.compression;
      } else {
        throw is.invalidParameterError("compression", "one of: av1, hevc", options.compression);
      }
      if (is.defined(options.quality)) {
        if (is.integer(options.quality) && is.inRange(options.quality, 1, 100)) {
          this.options.heifQuality = options.quality;
        } else {
          throw is.invalidParameterError("quality", "integer between 1 and 100", options.quality);
        }
      }
      if (is.defined(options.lossless)) {
        if (is.bool(options.lossless)) {
          this.options.heifLossless = options.lossless;
        } else {
          throw is.invalidParameterError("lossless", "boolean", options.lossless);
        }
      }
      if (is.defined(options.effort)) {
        if (is.integer(options.effort) && is.inRange(options.effort, 0, 9)) {
          this.options.heifEffort = options.effort;
        } else {
          throw is.invalidParameterError("effort", "integer between 0 and 9", options.effort);
        }
      }
      if (is.defined(options.chromaSubsampling)) {
        if (is.string(options.chromaSubsampling) && is.inArray(options.chromaSubsampling, ["4:2:0", "4:4:4"])) {
          this.options.heifChromaSubsampling = options.chromaSubsampling;
        } else {
          throw is.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", options.chromaSubsampling);
        }
      }
      if (is.defined(options.bitdepth)) {
        if (is.integer(options.bitdepth) && is.inArray(options.bitdepth, [8, 10, 12])) {
          if (options.bitdepth !== 8 && this.constructor.versions.heif) {
            throw is.invalidParameterError("bitdepth when using prebuilt binaries", 8, options.bitdepth);
          }
          this.options.heifBitdepth = options.bitdepth;
        } else {
          throw is.invalidParameterError("bitdepth", "8, 10 or 12", options.bitdepth);
        }
      }
    } else {
      throw is.invalidParameterError("options", "Object", options);
    }
    return this._updateFormatOut("heif", options);
  }
  function jxl(options) {
    if (is.object(options)) {
      if (is.defined(options.quality)) {
        if (is.integer(options.quality) && is.inRange(options.quality, 1, 100)) {
          this.options.jxlDistance = options.quality >= 30 ? 0.1 + (100 - options.quality) * 0.09 : 53 / 3000 * options.quality * options.quality - 23 / 20 * options.quality + 25;
        } else {
          throw is.invalidParameterError("quality", "integer between 1 and 100", options.quality);
        }
      } else if (is.defined(options.distance)) {
        if (is.number(options.distance) && is.inRange(options.distance, 0, 15)) {
          this.options.jxlDistance = options.distance;
        } else {
          throw is.invalidParameterError("distance", "number between 0.0 and 15.0", options.distance);
        }
      }
      if (is.defined(options.decodingTier)) {
        if (is.integer(options.decodingTier) && is.inRange(options.decodingTier, 0, 4)) {
          this.options.jxlDecodingTier = options.decodingTier;
        } else {
          throw is.invalidParameterError("decodingTier", "integer between 0 and 4", options.decodingTier);
        }
      }
      if (is.defined(options.lossless)) {
        if (is.bool(options.lossless)) {
          this.options.jxlLossless = options.lossless;
        } else {
          throw is.invalidParameterError("lossless", "boolean", options.lossless);
        }
      }
      if (is.defined(options.effort)) {
        if (is.integer(options.effort) && is.inRange(options.effort, 3, 9)) {
          this.options.jxlEffort = options.effort;
        } else {
          throw is.invalidParameterError("effort", "integer between 3 and 9", options.effort);
        }
      }
    }
    return this._updateFormatOut("jxl", options);
  }
  function raw(options) {
    if (is.object(options)) {
      if (is.defined(options.depth)) {
        if (is.string(options.depth) && is.inArray(options.depth, ["char", "uchar", "short", "ushort", "int", "uint", "float", "complex", "double", "dpcomplex"])) {
          this.options.rawDepth = options.depth;
        } else {
          throw is.invalidParameterError("depth", "one of: char, uchar, short, ushort, int, uint, float, complex, double, dpcomplex", options.depth);
        }
      }
    }
    return this._updateFormatOut("raw");
  }
  function tile(options) {
    if (is.object(options)) {
      if (is.defined(options.size)) {
        if (is.integer(options.size) && is.inRange(options.size, 1, 8192)) {
          this.options.tileSize = options.size;
        } else {
          throw is.invalidParameterError("size", "integer between 1 and 8192", options.size);
        }
      }
      if (is.defined(options.overlap)) {
        if (is.integer(options.overlap) && is.inRange(options.overlap, 0, 8192)) {
          if (options.overlap > this.options.tileSize) {
            throw is.invalidParameterError("overlap", `<= size (${this.options.tileSize})`, options.overlap);
          }
          this.options.tileOverlap = options.overlap;
        } else {
          throw is.invalidParameterError("overlap", "integer between 0 and 8192", options.overlap);
        }
      }
      if (is.defined(options.container)) {
        if (is.string(options.container) && is.inArray(options.container, ["fs", "zip"])) {
          this.options.tileContainer = options.container;
        } else {
          throw is.invalidParameterError("container", "one of: fs, zip", options.container);
        }
      }
      if (is.defined(options.layout)) {
        if (is.string(options.layout) && is.inArray(options.layout, ["dz", "google", "iiif", "iiif3", "zoomify"])) {
          this.options.tileLayout = options.layout;
        } else {
          throw is.invalidParameterError("layout", "one of: dz, google, iiif, iiif3, zoomify", options.layout);
        }
      }
      if (is.defined(options.angle)) {
        if (is.integer(options.angle) && !(options.angle % 90)) {
          this.options.tileAngle = options.angle;
        } else {
          throw is.invalidParameterError("angle", "positive/negative multiple of 90", options.angle);
        }
      }
      this._setBackgroundColourOption("tileBackground", options.background);
      if (is.defined(options.depth)) {
        if (is.string(options.depth) && is.inArray(options.depth, ["onepixel", "onetile", "one"])) {
          this.options.tileDepth = options.depth;
        } else {
          throw is.invalidParameterError("depth", "one of: onepixel, onetile, one", options.depth);
        }
      }
      if (is.defined(options.skipBlanks)) {
        if (is.integer(options.skipBlanks) && is.inRange(options.skipBlanks, -1, 65535)) {
          this.options.tileSkipBlanks = options.skipBlanks;
        } else {
          throw is.invalidParameterError("skipBlanks", "integer between -1 and 255/65535", options.skipBlanks);
        }
      } else if (is.defined(options.layout) && options.layout === "google") {
        this.options.tileSkipBlanks = 5;
      }
      const centre = is.bool(options.center) ? options.center : options.centre;
      if (is.defined(centre)) {
        this._setBooleanOption("tileCentre", centre);
      }
      if (is.defined(options.id)) {
        if (is.string(options.id)) {
          this.options.tileId = options.id;
        } else {
          throw is.invalidParameterError("id", "string", options.id);
        }
      }
      if (is.defined(options.basename)) {
        if (is.string(options.basename)) {
          this.options.tileBasename = options.basename;
        } else {
          throw is.invalidParameterError("basename", "string", options.basename);
        }
      }
    }
    if (is.inArray(this.options.formatOut, ["jpeg", "png", "webp"])) {
      this.options.tileFormat = this.options.formatOut;
    } else if (this.options.formatOut !== "input") {
      throw is.invalidParameterError("format", "one of: jpeg, png, webp", this.options.formatOut);
    }
    return this._updateFormatOut("dz");
  }
  function timeout(options) {
    if (!is.plainObject(options)) {
      throw is.invalidParameterError("options", "object", options);
    }
    if (is.integer(options.seconds) && is.inRange(options.seconds, 0, 3600)) {
      this.options.timeoutSeconds = options.seconds;
    } else {
      throw is.invalidParameterError("seconds", "integer between 0 and 3600", options.seconds);
    }
    return this;
  }
  function _updateFormatOut(formatOut, options) {
    if (!(is.object(options) && options.force === false)) {
      this.options.formatOut = formatOut;
    }
    return this;
  }
  function _setBooleanOption(key, val) {
    if (is.bool(val)) {
      this.options[key] = val;
    } else {
      throw is.invalidParameterError(key, "boolean", val);
    }
  }
  function _read() {
    if (!this.options.streamOut) {
      this.options.streamOut = true;
      const stack = Error();
      this._pipeline(undefined, stack);
    }
  }
  function _pipeline(callback, stack) {
    if (typeof callback === "function") {
      if (this._isStreamInput()) {
        this.on("finish", () => {
          this._flattenBufferIn();
          sharp.pipeline(this.options, (err, data, info) => {
            if (err) {
              callback(is.nativeError(err, stack));
            } else {
              callback(null, data, info);
            }
          });
        });
      } else {
        sharp.pipeline(this.options, (err, data, info) => {
          if (err) {
            callback(is.nativeError(err, stack));
          } else {
            callback(null, data, info);
          }
        });
      }
      return this;
    } else if (this.options.streamOut) {
      if (this._isStreamInput()) {
        this.once("finish", () => {
          this._flattenBufferIn();
          sharp.pipeline(this.options, (err, data, info) => {
            if (err) {
              this.emit("error", is.nativeError(err, stack));
            } else {
              this.emit("info", info);
              this.push(data);
            }
            this.push(null);
            this.on("end", () => this.emit("close"));
          });
        });
        if (this.streamInFinished) {
          this.emit("finish");
        }
      } else {
        sharp.pipeline(this.options, (err, data, info) => {
          if (err) {
            this.emit("error", is.nativeError(err, stack));
          } else {
            this.emit("info", info);
            this.push(data);
          }
          this.push(null);
          this.on("end", () => this.emit("close"));
        });
      }
      return this;
    } else {
      if (this._isStreamInput()) {
        return new Promise((resolve, reject) => {
          this.once("finish", () => {
            this._flattenBufferIn();
            sharp.pipeline(this.options, (err, data, info) => {
              if (err) {
                reject(is.nativeError(err, stack));
              } else {
                if (this.options.resolveWithObject) {
                  resolve({ data, info });
                } else {
                  resolve(data);
                }
              }
            });
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          sharp.pipeline(this.options, (err, data, info) => {
            if (err) {
              reject(is.nativeError(err, stack));
            } else {
              if (this.options.resolveWithObject) {
                resolve({ data, info });
              } else {
                resolve(data);
              }
            }
          });
        });
      }
    }
  }
  module.exports = function(Sharp) {
    Object.assign(Sharp.prototype, {
      toFile,
      toBuffer,
      keepExif,
      withExif,
      withExifMerge,
      keepIccProfile,
      withIccProfile,
      keepMetadata,
      withMetadata,
      toFormat,
      jpeg,
      jp2,
      png,
      webp,
      tiff,
      avif,
      heif,
      jxl,
      gif,
      raw,
      tile,
      timeout,
      _updateFormatOut,
      _setBooleanOption,
      _read,
      _pipeline
    });
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/utility.js
var require_utility = __commonJS((exports, module) => {
  var events = __require("events");
  var detectLibc = require_detect_libc();
  var is = require_is();
  var { runtimePlatformArch } = require_libvips();
  var sharp = require_sharp();
  var runtimePlatform = runtimePlatformArch();
  var libvipsVersion = sharp.libvipsVersion();
  var format = sharp.format();
  format.heif.output.alias = ["avif", "heic"];
  format.jpeg.output.alias = ["jpe", "jpg"];
  format.tiff.output.alias = ["tif"];
  format.jp2k.output.alias = ["j2c", "j2k", "jp2", "jpx"];
  var interpolators = {
    nearest: "nearest",
    bilinear: "bilinear",
    bicubic: "bicubic",
    locallyBoundedBicubic: "lbb",
    nohalo: "nohalo",
    vertexSplitQuadraticBasisSpline: "vsqbs"
  };
  var versions = {
    vips: libvipsVersion.semver
  };
  if (!libvipsVersion.isGlobal) {
    if (!libvipsVersion.isWasm) {
      try {
        versions = __require(`@img/sharp-${runtimePlatform}/versions`);
      } catch (_) {
        try {
          versions = __require(`@img/sharp-libvips-${runtimePlatform}/versions`);
        } catch (_2) {}
      }
    } else {
      try {
        versions = (()=>{throw new Error("Cannot require module "+"@img/sharp-wasm32/versions");})();
      } catch (_) {}
    }
  }
  versions.sharp = require_package().version;
  if (versions.heif && format.heif) {
    format.heif.input.fileSuffix = [".avif"];
    format.heif.output.alias = ["avif"];
  }
  function cache(options) {
    if (is.bool(options)) {
      if (options) {
        return sharp.cache(50, 20, 100);
      } else {
        return sharp.cache(0, 0, 0);
      }
    } else if (is.object(options)) {
      return sharp.cache(options.memory, options.files, options.items);
    } else {
      return sharp.cache();
    }
  }
  cache(true);
  function concurrency(concurrency2) {
    return sharp.concurrency(is.integer(concurrency2) ? concurrency2 : null);
  }
  if (detectLibc.familySync() === detectLibc.GLIBC && !sharp._isUsingJemalloc()) {
    sharp.concurrency(1);
  } else if (detectLibc.familySync() === detectLibc.MUSL && sharp.concurrency() === 1024) {
    sharp.concurrency(__require("os").availableParallelism());
  }
  var queue = new events.EventEmitter;
  function counters() {
    return sharp.counters();
  }
  function simd(simd2) {
    return sharp.simd(is.bool(simd2) ? simd2 : null);
  }
  function block(options) {
    if (is.object(options)) {
      if (Array.isArray(options.operation) && options.operation.every(is.string)) {
        sharp.block(options.operation, true);
      } else {
        throw is.invalidParameterError("operation", "Array<string>", options.operation);
      }
    } else {
      throw is.invalidParameterError("options", "object", options);
    }
  }
  function unblock(options) {
    if (is.object(options)) {
      if (Array.isArray(options.operation) && options.operation.every(is.string)) {
        sharp.block(options.operation, false);
      } else {
        throw is.invalidParameterError("operation", "Array<string>", options.operation);
      }
    } else {
      throw is.invalidParameterError("options", "object", options);
    }
  }
  module.exports = function(Sharp) {
    Sharp.cache = cache;
    Sharp.concurrency = concurrency;
    Sharp.counters = counters;
    Sharp.simd = simd;
    Sharp.format = format;
    Sharp.interpolators = interpolators;
    Sharp.versions = versions;
    Sharp.queue = queue;
    Sharp.block = block;
    Sharp.unblock = unblock;
  };
});

// node_modules/.bun/sharp@0.33.5/node_modules/sharp/lib/index.js
var require_lib = __commonJS((exports, module) => {
  var Sharp = require_constructor();
  require_input()(Sharp);
  require_resize()(Sharp);
  require_composite()(Sharp);
  require_operation()(Sharp);
  require_colour()(Sharp);
  require_channel()(Sharp);
  require_output()(Sharp);
  require_utility()(Sharp);
  module.exports = Sharp;
});

// server/src/api.ts
import { Database } from "bun:sqlite";
import path5 from "path";
import { readFileSync as readFileSync6, existsSync as existsSync6, writeFileSync as writeFileSync2, mkdirSync as mkdirSync2, unlinkSync, readdirSync } from "fs";

// server/src/semantic_search.ts
import { readFileSync, existsSync } from "fs";
import path from "path";
var SERVER_ROOT = path.resolve(import.meta.dir, "..");
var DATA_DIR = path.join(SERVER_ROOT, "data");
var EMBEDDINGS_PATH = path.join(DATA_DIR, "hook_embeddings.json");
var cachedEmbeddings = null;
function loadEmbeddings() {
  if (cachedEmbeddings) {
    return cachedEmbeddings;
  }
  if (!existsSync(EMBEDDINGS_PATH)) {
    console.error(`\u274C Embeddings file not found: ${EMBEDDINGS_PATH}`);
    return [];
  }
  console.log("\uD83D\uDD04 Loading hook embeddings into memory...");
  const startTime = Date.now();
  cachedEmbeddings = JSON.parse(readFileSync(EMBEDDINGS_PATH, "utf8"));
  console.log(`\u2705 Loaded ${cachedEmbeddings.length} embeddings in ${Date.now() - startTime}ms`);
  return cachedEmbeddings;
}
loadEmbeddings();

// server/src/image_generator.ts
var import_sharp = __toESM(require_lib(), 1);
var OPENAI_IMAGE_MODEL = "gpt-image-2";
var OPENAI_API_BASE = "https://api.openai.com/v1";
var DEFAULT_OUTPUT_FORMAT = "png";
function normalizeImageSize(imageSize) {
  if (!imageSize || imageSize === "0.5K") {
    return "4K";
  }
  return imageSize;
}
function resolveOutputFormat() {
  return DEFAULT_OUTPUT_FORMAT;
}
function resolveOutputMimeType(outputFormat) {
  switch (outputFormat) {
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}
function resolveOpenAIQuality(imageSize) {
  if (imageSize === "1K") {
    return "medium";
  }
  return "auto";
}
function resolveOpenAISize(aspectRatio, imageSize) {
  const sizeMap = {
    "1K": {
      "9:16": "864x1536",
      "16:9": "1536x864",
      "1:1": "1024x1024",
      "4:3": "1024x768",
      "3:4": "768x1024"
    },
    "2K": {
      "9:16": "1152x2048",
      "16:9": "2048x1152",
      "1:1": "2048x2048",
      "4:3": "2048x1536",
      "3:4": "1536x2048"
    },
    "4K": {
      "9:16": "2160x3840",
      "16:9": "3840x2160",
      "1:1": "2880x2880",
      "4:3": "3072x2304",
      "3:4": "2304x3072"
    }
  };
  return sizeMap[imageSize][aspectRatio];
}
function buildOpenAIRequestTrace(response, clientRequestId) {
  return {
    clientRequestId,
    requestId: response.headers.get("x-request-id"),
    processingMs: response.headers.get("openai-processing-ms")
  };
}
function formatOpenAITrace(trace) {
  const requestId = trace.requestId || "unknown";
  const processingMs = trace.processingMs || "unknown";
  return `client_request_id=${trace.clientRequestId} request_id=${requestId} processing_ms=${processingMs}`;
}
async function parseOpenAIResponse(response, clientRequestId) {
  const rawText = await response.text();
  const trace = buildOpenAIRequestTrace(response, clientRequestId);
  let payload = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`.trim();
    throw new Error(`${message} (${formatOpenAITrace(trace)})`);
  }
  return {
    payload: payload || {},
    trace
  };
}
function extractGeneratedImages(payload, outputFormat) {
  const mimeType = resolveOutputMimeType(outputFormat);
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.map((item) => {
    const data = typeof item?.b64_json === "string" ? item.b64_json : "";
    if (!data)
      return null;
    return {
      data,
      mimeType
    };
  }).filter((item) => item !== null);
}
async function createReferenceFile(ref, index) {
  const mimeType = String(ref.mimeType || "image/png").toLowerCase();
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
  return new File([Buffer.from(ref.data, "base64")], `reference-${index + 1}.${extension}`, { type: mimeType });
}
function normalizeImageError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[ImageGen] Error:`, errorMessage);
  if (errorMessage.includes("quota") || errorMessage.includes("rate") || errorMessage.includes("429")) {
    return { success: false, error: "Rate limit exceeded. Please try again later." };
  }
  if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("policy")) {
    return { success: false, error: "Image generation blocked by safety filters." };
  }
  return { success: false, error: errorMessage };
}
async function generateImage(prompt, apiKey, options = {}) {
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" };
  }
  const { aspectRatio = "9:16" } = options;
  const imageSize = normalizeImageSize(options.imageSize);
  const outputFormat = resolveOutputFormat();
  const openaiSize = resolveOpenAISize(aspectRatio, imageSize);
  const quality = resolveOpenAIQuality(imageSize);
  try {
    const clientRequestId = crypto.randomUUID();
    console.log(`[ImageGen] Generating image with GPT Image 2...`);
    console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[ImageGen] Aspect: ${aspectRatio}, Size: ${imageSize} -> ${openaiSize}, Quality: ${quality}`);
    console.log(`[ImageGen] model=${OPENAI_IMAGE_MODEL} endpoint=images.generate client_request_id=${clientRequestId}`);
    const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": clientRequestId
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: openaiSize,
        quality,
        output_format: outputFormat
      })
    });
    const { payload, trace } = await parseOpenAIResponse(response, clientRequestId);
    const images = extractGeneratedImages(payload, outputFormat);
    if (images.length === 0) {
      console.error("[ImageGen] No images in response");
      return { success: false, error: "No images generated" };
    }
    console.log(`[ImageGen] Successfully generated ${images.length} image(s) model=${OPENAI_IMAGE_MODEL} endpoint=images.generate ${formatOpenAITrace(trace)}`);
    return { success: true, images };
  } catch (error) {
    return normalizeImageError(error);
  }
}
var MAX_REFERENCE_DIMENSION = 1536;
var MAX_REFERENCE_BYTES = 1500000;
function sanitizeBase64(data) {
  return String(data || "").replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
}
async function normalizeReferenceImage(ref, index) {
  const cleanedData = sanitizeBase64(ref.data);
  const mimeType = String(ref.mimeType || "image/png").toLowerCase();
  try {
    const inputBuffer = Buffer.from(cleanedData, "base64");
    if (inputBuffer.length === 0) {
      throw new Error("Empty image buffer");
    }
    let pipeline = import_sharp.default(inputBuffer, { failOn: "none" }).rotate();
    const metadata = await pipeline.metadata();
    if ((metadata.width || 0) > MAX_REFERENCE_DIMENSION || (metadata.height || 0) > MAX_REFERENCE_DIMENSION) {
      pipeline = pipeline.resize(MAX_REFERENCE_DIMENSION, MAX_REFERENCE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true
      });
    }
    let outputBuffer;
    let outputMimeType;
    if (mimeType === "image/png") {
      outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      outputMimeType = "image/png";
      if (outputBuffer.length > MAX_REFERENCE_BYTES) {
        outputBuffer = await import_sharp.default(outputBuffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
        outputMimeType = "image/jpeg";
      }
    } else {
      outputBuffer = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      outputMimeType = "image/jpeg";
    }
    console.log(`[ImageGen] Normalized ref ${index + 1}: ${mimeType} -> ${outputMimeType}, ${inputBuffer.length}B -> ${outputBuffer.length}B`);
    return {
      data: outputBuffer.toString("base64"),
      mimeType: outputMimeType
    };
  } catch (error) {
    console.warn(`[ImageGen] Could not normalize reference ${index + 1}; using sanitized original. ${error instanceof Error ? error.message : String(error)}`);
    return {
      data: cleanedData,
      mimeType
    };
  }
}
async function generateImageWithReferences(prompt, referenceImages, apiKey, options = {}) {
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" };
  }
  const { aspectRatio = "9:16" } = options;
  const imageSize = normalizeImageSize(options.imageSize);
  const outputFormat = resolveOutputFormat();
  const openaiSize = resolveOpenAISize(aspectRatio, imageSize);
  const quality = resolveOpenAIQuality(imageSize);
  const limitedRefs = referenceImages.slice(0, 5);
  try {
    const clientRequestId = crypto.randomUUID();
    const normalizedRefs = await Promise.all(limitedRefs.map((ref, index) => normalizeReferenceImage(ref, index)));
    console.log(`[ImageGen] Generating with ${normalizedRefs.length} reference image(s)...`);
    console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[ImageGen] Aspect: ${aspectRatio}, Size: ${imageSize} -> ${openaiSize}, Quality: ${quality}`);
    console.log(`[ImageGen] model=${OPENAI_IMAGE_MODEL} endpoint=images.edit client_request_id=${clientRequestId}`);
    const formData = new FormData;
    formData.append("model", OPENAI_IMAGE_MODEL);
    formData.append("prompt", prompt + `

IMPORTANT: Maintain the same core character appearance, styling, accessories, and scene anchors from the reference image(s) unless the prompt explicitly changes them.`);
    formData.append("size", openaiSize);
    formData.append("quality", quality);
    formData.append("output_format", outputFormat);
    for (let i = 0;i < normalizedRefs.length; i++) {
      const ref = normalizedRefs[i];
      if (!ref)
        continue;
      const file = await createReferenceFile(ref, i);
      formData.append("image[]", file, file.name);
    }
    const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Client-Request-Id": clientRequestId
      },
      body: formData
    });
    const { payload, trace } = await parseOpenAIResponse(response, clientRequestId);
    const images = extractGeneratedImages(payload, outputFormat);
    if (images.length === 0) {
      console.error("[ImageGen] No images in response");
      return { success: false, error: "No images generated" };
    }
    console.log(`[ImageGen] Successfully generated image with ${normalizedRefs.length} reference(s) model=${OPENAI_IMAGE_MODEL} endpoint=images.edit ${formatOpenAITrace(trace)}`);
    return { success: true, images };
  } catch (error) {
    return normalizeImageError(error);
  }
}
var UGC_STYLE_OVERLAY = `

Style: iPhone selfie, front-facing camera. Phone is NOT visible - it's taking the photo. No mirror. Natural indoor lighting, visible skin texture, no filters. Raw and authentic. 
NEGATIVE: No pets on kitchen counters, no pets on tables, no pets on raised household surfaces. Pet must be on floor, bed, or couch.`;
function flattenImagePrompt(prompt, options = { includeUgcStyle: true }) {
  if (typeof prompt === "string") {
    return options.includeUgcStyle ? prompt + UGC_STYLE_OVERLAY : prompt;
  }
  const parts = [];
  if (prompt.subject) {
    const s = prompt.subject;
    let desc = "";
    if (s.description) {
      desc = s.description;
    } else {
      desc = s.age || "young woman";
      if (s.hair)
        desc += `, ${s.hair.color || ""} ${s.hair.style || ""} hair`;
    }
    if (s.expression) {
      desc += `, ${s.expression}`;
    }
    if (s.gesture) {
      desc += `, ${s.gesture}`;
    }
    parts.push(desc);
  }
  if (prompt.face) {
    const f = prompt.face;
    let faceParts = [];
    if (f.makeup)
      faceParts.push(f.makeup);
    if (f.skin)
      faceParts.push(f.skin);
    if (faceParts.length > 0) {
      parts.push(faceParts.join(", "));
    }
  }
  if (prompt.clothing) {
    parts.push(`wearing ${prompt.clothing}`);
  }
  if (prompt.accessories) {
    if (typeof prompt.accessories === "string") {
      parts.push(prompt.accessories);
    } else {
      const acc = [];
      if (prompt.accessories.earrings)
        acc.push(prompt.accessories.earrings);
      if (prompt.accessories.jewelry)
        acc.push(prompt.accessories.jewelry);
      if (acc.length > 0)
        parts.push(acc.join(", "));
    }
  }
  if (prompt.position) {
    parts.push(prompt.position);
  }
  if (prompt.setting) {
    parts.push(`in ${prompt.setting}`);
  } else if (prompt.background?.setting) {
    parts.push(`in ${prompt.background.setting}`);
  }
  if (prompt.pet && prompt.pet !== "none" && prompt.pet !== "none visible") {
    parts.push(prompt.pet);
  } else if (prompt.background?.elements) {
    const elements = Array.isArray(prompt.background.elements) ? prompt.background.elements : [prompt.background.elements];
    const pet = elements.find((e) => typeof e === "string" && (e.toLowerCase().includes("cat") || e.toLowerCase().includes("dog")));
    if (pet)
      parts.push(pet);
  }
  if (prompt.photography) {
    const p = prompt.photography;
    let photoDesc = [];
    if (p.style)
      photoDesc.push(p.style);
    if (p.angle)
      photoDesc.push(p.angle);
    if (p.lighting)
      photoDesc.push(p.lighting);
    if (photoDesc.length > 0) {
      parts.push(photoDesc.join(", "));
    }
  }
  if (prompt.pose?.other_hand) {
    parts.push(prompt.pose.other_hand);
  }
  const result = parts.join(". ");
  console.log(`[flattenImagePrompt] Result: ${result.substring(0, 150)}...`);
  return options.includeUgcStyle ? result + UGC_STYLE_OVERLAY : result;
}

// server/src/projects/syp/syp_service.ts
import path3 from "path";
import { readFileSync as readFileSync3, existsSync as existsSync3 } from "fs";

// server/src/common/prompt_utils.ts
import path2 from "path";
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
var photographyFrameworks = {};
function loadPhotographyFramework(projectKey, dataDir) {
  const cacheKey = projectKey;
  if (photographyFrameworks[cacheKey]) {
    return photographyFrameworks[cacheKey];
  }
  const projectFolder = projectKey === "syp" ? "SaveYourPet" : "DBT-Mind";
  const frameworkPath = path2.join(dataDir, "frameworks", projectFolder, "photography.json");
  if (existsSync2(frameworkPath)) {
    try {
      const content = readFileSync2(frameworkPath, "utf-8");
      photographyFrameworks[cacheKey] = JSON.parse(content);
      console.log(`\uD83D\uDCF8 Loaded photography framework for ${projectFolder}`);
      return photographyFrameworks[cacheKey];
    } catch (e) {
      console.error(`[Photography] Error loading framework for ${projectFolder}:`, e);
    }
  }
  return null;
}
function getAnchorImage(personaId, anchorsDir) {
  const anchorPath = path2.join(anchorsDir, `${personaId}.png`);
  if (existsSync2(anchorPath)) {
    try {
      const data = readFileSync2(anchorPath, "base64");
      return { data, mimeType: "image/png" };
    } catch (e) {
      console.error(`[Anchor] Error reading anchor for ${personaId}:`, e);
    }
  }
  return null;
}
function buildUGCSlide1Prompt(persona, scrollStoppers, slideText, ugcBasePrompts, settingOverride, isSyp = false, dataDir, outfit, settingData) {
  const projectKey = isSyp ? "syp" : "dbt";
  const photoFramework = dataDir ? loadPhotographyFramework(projectKey, dataDir) : null;
  const projectBase = ugcBasePrompts?.[projectKey] || ugcBasePrompts?.["dbt"];
  const slide1Base = projectBase?.slide_1_base;
  const lowerText = slideText.toLowerCase();
  let timeContext = "neutral";
  if (lowerText.match(/3\s*uhr|3\s*am|nacht|night|schlafen|sleep|wach|awake|dunkel|dark/i)) {
    timeContext = "night";
  } else if (lowerText.match(/morgen|morning|aufstehen|wake up|kaffee|coffee|fr\u00FCh|early/i)) {
    timeContext = "morning";
  }
  const gesture = scrollStoppers.gestures[Math.floor(Math.random() * scrollStoppers.gestures.length)];
  let expressions = scrollStoppers.expressions;
  if (isSyp && photoFramework?.expressions?.preferred_expressions) {
    const preferredIds = photoFramework.expressions.preferred_expressions.map((e) => e.toLowerCase().replace(/\s+/g, "_"));
    const filtered = scrollStoppers.expressions.filter((e) => preferredIds.some((pref) => e.id?.toLowerCase().includes(pref) || e.description?.toLowerCase().includes(pref.replace(/_/g, " "))));
    if (filtered.length > 0)
      expressions = filtered;
  }
  const expression = expressions[Math.floor(Math.random() * expressions.length)];
  let positions = scrollStoppers.positions;
  if (photoFramework?.restrictions?.avoid) {
    const avoidTerms = photoFramework.restrictions.avoid.map((a) => a.toLowerCase());
    const filteredPositions = scrollStoppers.positions.filter((p) => !avoidTerms.some((term) => p.id?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)));
    if (filteredPositions.length > 0)
      positions = filteredPositions;
  }
  const position = positions[Math.floor(Math.random() * positions.length)];
  const settings = ugcBasePrompts?.settings || {};
  let settingKey = settingOverride;
  if (!settingKey) {
    const primarySettings = photoFramework?.environment?.primary_settings || [];
    if (primarySettings.length > 0) {
      settingKey = primarySettings[Math.floor(Math.random() * primarySettings.length)];
    } else {
      settingKey = "cozy_bedroom";
    }
  }
  const finalSettingKey = settingKey || "cozy_bedroom";
  let setting = settings[finalSettingKey] || settings["cozy_bedroom"] || { description: "cozy bedroom", elements: [] };
  let lightingDesc = "";
  if (photoFramework?.lighting) {
    const lighting = photoFramework.lighting;
    const timeHint = lighting.time_of_day_hints?.[timeContext] || "";
    lightingDesc = `${lighting.primary_light}. ${lighting.secondary_light}. ${lighting.shadows}. ${timeHint}`;
  } else {
    lightingDesc = setting.lighting || "soft natural lighting";
  }
  let cameraDesc = "";
  if (photoFramework?.photography) {
    const photo = photoFramework.photography;
    cameraDesc = `${photo.camera_type}, ${photo.camera_angle}. ${photo.framing}. ${photo.focus}. Color: ${photo.color_profile}. ${(photo.characteristics || []).join(", ")}`;
  } else {
    cameraDesc = slide1Base?.camera?.type || "iPhone front-camera selfie";
  }
  let makeupDesc = "";
  if (photoFramework?.skin_and_makeup) {
    const makeup = photoFramework.skin_and_makeup;
    makeupDesc = `${makeup.makeup_style}. ${(makeup.details || []).join(", ")}. Skin: ${makeup.skin_texture}`;
  } else {
    makeupDesc = slide1Base?.makeup?.style || "natural minimal makeup";
  }
  let clothingItem;
  if (outfit?.description) {
    clothingItem = outfit.description;
    console.log(`[Prompt Utils] Using outfit: ${outfit.name} - ${outfit.description}`);
  } else {
    const clothingItems = projectBase?.clothing_options || ["cozy oversized hoodie", "neutral sweater"];
    clothingItem = clothingItems[Math.floor(Math.random() * clothingItems.length)];
  }
  const jewelry = (ugcBasePrompts?.jewelry?.[projectKey] || []).join(", ");
  let environmentDesc = "";
  let settingLighting = "";
  let settingVibe = "";
  if (settingData?.description) {
    environmentDesc = settingData.description;
    settingLighting = settingData.lighting || "";
    settingVibe = settingData.vibe || "";
    const elements = settingData.elements || [];
    if (elements.length > 0) {
      environmentDesc += `. ${elements.join(", ")}`;
    }
    console.log(`[Prompt Utils] Using setting: ${settingData.name} - ${settingData.description}`);
  } else if (photoFramework?.environment) {
    const env = photoFramework.environment;
    environmentDesc = `${env.vibe}. ${(env.elements || []).join(", ")}`;
  } else {
    environmentDesc = setting.description || "modern minimalist room";
  }
  let vibeDesc = "";
  if (photoFramework?.aesthetic) {
    const aesthetic = photoFramework.aesthetic;
    vibeDesc = `Style: ${aesthetic.style}. Vibes: ${(aesthetic.vibes || []).join(", ")}`;
  } else {
    vibeDesc = slide1Base?.aesthetic?.vibes?.join(", ") || "authentic UGC";
  }
  const expressionMood = photoFramework?.expressions?.primary_mood || (isSyp ? "theatrical comedy" : "relatable and soft");
  const hairDetails = `${persona.subject.hair.color} hair, ${persona.subject.hair.style}, natural face-framing strands`;
  const subjectFramework = photoFramework?.subject;
  const bodyDetails = persona.subject?.body ? `Body: ${persona.subject.body.figure}. ${persona.subject.body.details}.` : "";
  const promptParts = [];
  if (subjectFramework) {
    const face = subjectFramework.face || {};
    const skin = subjectFramework.skin || {};
    const beautyLevel = subjectFramework.beauty_level || "naturally attractive";
    promptParts.push(`## SUBJECT
Young woman, ${beautyLevel}. Looks like a real person in a candid photo.
Face: ${face.structure || "symmetrical features"}, ${face.eyes || "expressive eyes"}, ${face.lips || "natural lips"}.
${hairDetails}. ${persona.subject.age}.${bodyDetails ? `
${bodyDetails}` : ""}
Skin: ${skin.quality || "flawless skin"}, ${skin.texture || "smooth with minimal pores"}, ${skin.tone || "even tone"}.`);
  } else {
    promptParts.push(`## SUBJECT
Young woman, ${persona.subject.age}. ${hairDetails}.${bodyDetails ? ` ${bodyDetails}` : ""}
Looks like a real person taking a selfie, not a professional model or stock photo.`);
  }
  promptParts.push(`
## CAMERA & COMPOSITION
${cameraDesc}
9:16 vertical format.
Natural imperfection: subtle noise, soft highlights, realistic reflections.`);
  let fullLightingDesc = lightingDesc;
  if (photoFramework?.lighting?.face_lighting) {
    fullLightingDesc += ` ${photoFramework.lighting.face_lighting}`;
  }
  const skinTextureNote = subjectFramework?.skin?.texture ? subjectFramework.skin.texture : "Skin texture clearly visible with micro-pores and natural oils";
  promptParts.push(`
## LIGHTING
${fullLightingDesc}
${skinTextureNote}.
Medium quality. authentic TikTok aesthetic.`);
  const expressionFramework = subjectFramework?.expression;
  let expressionDesc = expression.description;
  if (expressionFramework) {
    expressionDesc = `${expression.description}. Eyes: ${expressionFramework.eyes || "soft and engaging"}`;
  }
  promptParts.push(`
## FACIAL EXPRESSION
${expressionDesc}
Mood: ${expressionMood}.`);
  let finalMakeupDesc = makeupDesc;
  if (subjectFramework?.makeup) {
    const frameworkMakeup = subjectFramework.makeup;
    const makeupDetails = Array.isArray(frameworkMakeup.details) ? frameworkMakeup.details.join(", ") : "";
    finalMakeupDesc = `${frameworkMakeup.style || "enhanced natural beauty"}. ${makeupDetails}`;
  }
  promptParts.push(`
## MAKEUP & SKIN
${finalMakeupDesc}`);
  promptParts.push(`
## CLOTHING & ACCESSORIES
Wearing ${clothingItem}.
Accessories: ${jewelry || "minimal jewelry"}.
Fabric looks soft with realistic folds.`);
  promptParts.push(`
## POSE & BODY LANGUAGE
${gesture.description}
${position.description}
Natural, unposed posture.`);
  promptParts.push(`
## ENVIRONMENT
${environmentDesc}${settingLighting ? `
Lighting: ${settingLighting}` : ""}${settingVibe ? `
Vibe: ${settingVibe}` : ""}`);
  if (persona.pet) {
    promptParts.push(`
## PET
${persona.pet.description} prominently visible in a natural, realistic position.`);
  }
  let finalVibeDesc = vibeDesc;
  if (photoFramework?.vibe?.beauty_aesthetic) {
    finalVibeDesc += `. Beauty: ${photoFramework.vibe.beauty_aesthetic}`;
  }
  promptParts.push(`
## FINAL STYLE
${finalVibeDesc}
Medium quality, authentic TikTok aesthetic.`);
  if (photoFramework?.restrictions) {
    const restrictions = photoFramework.restrictions;
    const avoidList = Array.isArray(restrictions.avoid) ? restrictions.avoid.join(", ") : "";
    promptParts.push(`
## RESTRICTIONS
Content: ${restrictions.content}
Accuracy: ${restrictions.accuracy}
${avoidList ? `Avoid: ${avoidList}` : ""}`);
  }
  return promptParts.join(`
`);
}

// server/src/projects/syp/syp_service.ts
async function fetchAnthropicWithRetry(url, options, maxRetries = 4) {
  for (let i = 0;i < maxRetries; i++) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    let isOverloaded = response.status === 529 || response.status === 429;
    if (!isOverloaded) {
      try {
        const errorText = await response.clone().text();
        const errorObj = JSON.parse(errorText);
        const errorMessage = errorObj?.error?.message?.toLowerCase() || "";
        if (errorMessage.includes("overloaded") || errorObj?.error?.type === "overloaded_error") {
          isOverloaded = true;
        }
      } catch (e) {}
    }
    if (isOverloaded && i < maxRetries - 1) {
      const delay = 2000 * Math.pow(2, i);
      console.log(`[SYP Service] Anthropic API overloaded. Retrying \${i + 1}/\${maxRetries} in \${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    return response;
  }
  return fetch(url, options);
}
async function generateSypSlides(params) {
  const { profile, topic, ANTHROPIC_API_KEY, DATA_DIR: DATA_DIR2, SYP_DIR, ugcBasePrompts, brandingMode = "full" } = params;
  console.log(`[Native Slides - SYP] Generating for profile: ${profile}, topic: ${topic}, brandingMode: ${brandingMode}`);
  const isLifestyle = topic && topic.startsWith("lifestyle_");
  let forcedStructure = "";
  if (isLifestyle) {
    const categories = ["A", "B", "C", "D", "E", "F", "G"];
    let letter = "";
    if (topic && topic.includes("_")) {
      const parts = topic.split("_");
      if (parts[1])
        letter = parts[1].toUpperCase();
    }
    forcedStructure = categories.includes(letter) ? letter : categories[Math.floor(Math.random() * categories.length)] || "A";
  } else {
    const validStructures = ["A", "B", "C", "D", "E", "F"];
    if (topic && topic.startsWith("structure_")) {
      const parts = topic.split("_");
      if (parts[1])
        forcedStructure = parts[1].toUpperCase();
    }
    forcedStructure = validStructures.includes(forcedStructure) ? forcedStructure : validStructures[Math.floor(Math.random() * validStructures.length)] || "A";
  }
  let frameworkContent = "";
  let imageGuidelines = "";
  try {
    let frameworkPath = isLifestyle ? path3.join(SYP_DIR, `${forcedStructure}.md`) : path3.join(SYP_DIR, "syp_slide_framework.md");
    if (existsSync3(frameworkPath)) {
      frameworkContent = readFileSync3(frameworkPath, "utf-8");
      const guidelinesMatch = frameworkContent.match(/## IMAGE GUIDELINES\s*([\s\S]*?)(?=\n##|$)/i);
      if (guidelinesMatch && guidelinesMatch[1]) {
        imageGuidelines = guidelinesMatch[1].trim();
      }
    } else {
      throw new Error(`Framework not found at ${frameworkPath}`);
    }
  } catch (e) {
    console.error("Error reading framework:", e);
    throw e;
  }
  const profiles = {
    lisa_milo: { name: "Lisa", pet: "Hund (Milo)", type: "dog", vars: { TIER: "Hund", NAME: "Milo" } },
    anna_simba: { name: "Anna", pet: "Katze (Simba)", type: "cat", vars: { TIER: "Katze", NAME: "Simba" } }
  };
  const selectedProfile = profiles[profile] || profiles["lisa_milo"];
  let brandingInstruction = "";
  if (brandingMode === "none") {
    if (isLifestyle) {
      const lifestyleReplacements = {
        A: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Browser-Tabs)
- \u274C ERW\xC4HNE saveyourpet.de NICHT! Kein "saveyourpet.de" in irgendeiner Slide!
- \u2705 EINE der Google-Suchen MUSS das Thema Tierkrankenversicherung oder OP-Schutz erw\xE4hnen (ohne Markennamen!).
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.
- \u2705 Beispiel-Suche f\xFCr Absicherung: "Tierkrankenversicherung sinnvoll?", "Hund OP Kosten absichern", "Katze versichern Kosten"
- \u2705 Die anderen Suchen bleiben lustig und authentisch: "Tierarzt Kosten nachts teuer?", "Hund hat Socke gefressen"
- \u2705 ALLE Slides m\xFCssen als Browser-Tabs/Google-Suchen formatiert sein (au\xDFer Hook und Closer)`,
        B: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Checkliste)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Ein Checklisten-Punkt MUSS mit Absicherung/Tierkrankenversicherung zu tun haben (ohne Markennamen)!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        C: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Zwei Typen)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Ein Vergleichspunkt bei Typ 2 MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        D: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Nacht/Overthinking)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Ein n\xE4chtlicher Gedanke MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        E: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Starter Pack)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Ein Starter-Pack-Item MUSS die Tierkrankenversicherung oder Absicherung sein!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        F: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Apps/Handy)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Eine App/Notification MUSS mit Tierkrankenversicherung/Vorsorge zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        G: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Lessons Learned)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Eine Lektion MUSS mit Vorsorge/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        H: `## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE (POV Main Character)
- \u274C ERW\xC4HNE saveyourpet.de NICHT!
- \u2705 Ein POV-Moment MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`
      };
      brandingInstruction = lifestyleReplacements[forcedStructure] ?? lifestyleReplacements["A"] ?? "";
    } else {
      brandingInstruction = `
## \u26A0\uFE0F WICHTIG: KEINE WERBUNG / NO BRANDING MODE
Da der Benutzer "SaveYourPet erw\xE4hnen" DEAKTIVIERT hat:
- \u274C ERW\xC4HNE saveyourpet.de NICHT! Kein "saveyourpet.de" in irgendeiner Slide!
- \u274C Keine Webseiten, keine Links, keine Produktempfehlungen
- \u2705 Ersetze die SaveYourPet-Slide durch etwas Relatables zum Thema ABSICHERUNG:
  - "H\xE4tte ich mal 'ne Tierkrankenversicherung abgeschlossen"
  - "Lesson learned: Absicherung ist wichtig."
  - "N\xE4chstes Mal mit OP-Schutz."
  - "Tierkrankenversicherung w\xE4re billiger gewesen"
  - "Die teuerste Lektion bisher (Vorsorge fehlt)"
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.
- \u2705 Der Ton bleibt trocken, resigniert, authentisch - aber KEINE Werbung!`;
    }
  } else if (brandingMode === "soft") {
    if (isLifestyle) {
      const lifestyleSoftBranding = {
        A: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Browser-Tabs)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Eine der Google-Suchen MUSS mit Tierkrankenversicherung/Absicherung zu tun haben!
  - Beispiele: "Tierkrankenversicherung sinnvoll?", "Hund absichern wie?", "Katze versichern Kosten", "Tierarztkosten absichern"
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.
- \u2705 Das macht die Description mit saveyourpet.de-Erw\xE4hnung authentisch!`,
        B: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Checkliste)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Ein Checklisten-Punkt MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        C: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Zwei Typen)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Ein Vergleichspunkt bei Typ 2 MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        D: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Nacht/Overthinking)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Ein n\xE4chtlicher Gedanke MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        E: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Starter Pack)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Ein Starter-Pack-Item MUSS die Tierkrankenversicherung oder Absicherung sein!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        F: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Apps/Handy)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Eine App/Notification MUSS mit Tierkrankenversicherung/Vorsorge zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        G: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (Lessons Learned)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Eine Lektion MUSS mit Vorsorge/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`,
        H: `## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE (POV Main Character)
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Ein POV-Moment MUSS mit Absicherung/Tierkrankenversicherung zu tun haben!
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.`
      };
      brandingInstruction = lifestyleSoftBranding[forcedStructure] ?? lifestyleSoftBranding["A"] ?? "";
    } else {
      brandingInstruction = `
## \u26A0\uFE0F WICHTIG: SOFT BRANDING MODE
- \u274C ERW\xC4HNE saveyourpet.de NICHT direkt in den Slides!
- \u2705 ABER: Eine Slide MUSS subtil auf Tierkrankenversicherung/Absicherung hinweisen!
  - Beispiele f\xFCr diese Slide:
    - "Hat seinen Liebling abgesichert"
    - "F\xFCr sowas bin ich jetzt vorbereitet"
    - "Tierkrankenversicherung: beste Entscheidung"
    - "Wenigstens ist ${selectedProfile.vars.NAME} jetzt abgesichert"
- \u2705 Die Regel "Verwende niemals das Wort Versicherung" ist f\xFCr diesen Post AUFGEHOBEN.
- \u2705 Das erm\xF6glicht, dass saveyourpet.de in der Description erw\xE4hnt werden kann
- \u2705 Der Hinweis soll sich nat\xFCrlich anf\xFChlen, nicht wie Werbung`;
    }
  }
  const systemPrompt = `You are the AI engine for 'SaveYourPet'. Your goal is to generate viral TikTok slide content in GERMAN.
You MUST strictly follow the provided framework content below.

- **Emojis**: Use emojis EXTREMELY sparingly. Maximum 1-2 across the entire slide series. **NEVER** use emojis on Slide 1 (the hook).
- **Tone**: Authentic, relatable, slightly dry/humorous.

${frameworkContent}
${brandingInstruction}
IMPORTANT: The user has chosen the profile: ${selectedProfile.name} & ${selectedProfile.pet}.
Use the variables: [TIER]="${selectedProfile.vars.TIER}", [NAME]="${selectedProfile.vars.NAME}".
`;
  const brandingReminder = brandingMode === "full" ? "" : brandingMode === "soft" ? `
\u26A0\uFE0F REMEMBER: Include insurance/Absicherung themes but DO NOT mention "saveyourpet.de" directly in slides!` : `
\u26A0\uFE0F CRITICAL REMINDER: DO NOT mention "saveyourpet.de" or any website! Replace the brand slide with a non-promotional relatable statement.`;
  const variationSeed = Math.floor(Math.random() * 1000);
  let userPrompt = "";
  if (isLifestyle) {
    userPrompt = `Generate a viral TikTok slide deck for ${selectedProfile.vars.TIER} ${selectedProfile.vars.NAME} using the LIFESTYLE Framework.
OUTPUT LANGUAGE: GERMAN.
VARIATION SEED: ${variationSeed} (use this to inspire unique content!)

MANDATORY INSTRUCTION:
1. You MUST use **KATEGORIE ${forcedStructure}** (from the "HOOK-KATEGORIEN" section).
2. **CRITICAL - VARIATION REQUIRED:** 
   - \u274C DO NOT just copy the example searches from the framework!
   - \u2705 INVENT NEW, CREATIVE Google searches that fit the theme
   - \u2705 Mix absurd, funny, and relatable searches
   - \u2705 Each generation must feel FRESH and UNIQUE
   
   **BEISPIELE F\xDCR KREATIVE SUCHEN (Hund):**
   - "Hund hat Socke gefressen was tun"
   - "Mein Hund guckt mich komisch an"
   - "Hund schl\xE4ft nur auf meinem Kopfkissen normal?"
   - "Warum folgt mir mein Hund aufs Klo"
   - "Hund hat Angst vor seinem Schatten"
   - "Mein Hund hasst den Staubsauger Hilfe"
   - "Hund bellt den Fernseher an warum"
   - "Kann mein Hund meine Gedanken lesen"
   - "Hund dreht sich 10x im Kreis bevor er liegt"
   - "Warum leckt mein Hund die Wand"
   - "Hund hat meinen AirPod gefressen"
   - "Tierarzt Notdienst Kosten nachts"
   
   **BEISPIELE F\xDCR KREATIVE SUCHEN (Katze):**
   - "Katze starrt in leere Ecke Geister?"
   - "Meine Katze klopft Sachen vom Tisch absichtlich"
   - "Katze sitzt auf meinem Laptop warm?"
   - "Warum miaut meine Katze um 4 Uhr morgens"
   - "Katze versteckt sich unter der Decke"
   - "Meine Katze trinkt nur aus dem Wasserhahn"
   - "Katze knetet mich mit Krallen aua"
   - "Warum bringt mir meine Katze tote M\xE4use"
   
3. **TONE UPDATE:** Use subtle German Gen-Z slang. Be mysterious.${brandingMode === "full" ? " Do NOT explain saveyourpet.de." : ""}
4. **CLOSER VARIATION:** The last slide should be creative too - not always "Er schl\xE4ft. Ich google."
   Try: "N\xE4chste Woche neue Suchanfragen. Garantiert. \uD83D\uDC15" oder "Mein Suchverlauf sagt alles. \uD83D\uDE43" oder "[NAME] ist das alles egal. Mir nicht. \uD83D\uDC36"
5. Strictly follow the "OUTPUT-FORMAT".${brandingReminder}
`;
  } else {
    userPrompt = `Generate a viral TikTok slide deck for ${selectedProfile.vars.TIER} ${selectedProfile.vars.NAME}.
OUTPUT LANGUAGE: GERMAN.
MANDATORY INSTRUCTION:
1. You MUST use **Struktur ${forcedStructure}** (from the "SLIDE-STRUKTUREN" section).
2. DO NOT use the example values if possible. Mix and match variables.
3. AVOID repeating "Socke" or "Biene" if you used them recently.
4. **TONE UPDATE:** Use subtle German Gen-Z slang. Mix normal casing with lowercase.
5. Strictly follow the "OUTPUT-FORMAT".${brandingReminder}
`;
  }
  const claudeResponse = await fetchAnthropicWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!claudeResponse.ok) {
    const errorData = await claudeResponse.json();
    throw new Error(errorData.error?.message || "Claude API Error");
  }
  const rawData = await claudeResponse.json();
  const resultText = rawData.content?.[0]?.text || "";
  const lines = resultText.split(`
`);
  const rawSlides = lines.filter((line) => /^\**Slide\s*\d+/i.test(line.trim())).map((line) => line.replace(/\*\*/g, "").trim());
  const cleanedSlides = rawSlides.map((s) => {
    const contentMatch = s.match(/^Slide\s*\d+\s*(?:\([^)]+\))?[:\-]?\s*(.*)/i);
    if (contentMatch && contentMatch[1]) {
      return contentMatch[1].trim();
    }
    return s.replace(/^Slide\s*\d+[:\-]?\s*/i, "").trim();
  });
  if (cleanedSlides.length === 0)
    return { slides: [resultText], profile: selectedProfile };
  let personaId;
  if (profile === "lisa_milo") {
    personaId = "lisa";
  } else if (selectedProfile.type === "cat") {
    personaId = "luna";
  } else {
    personaId = "mia";
  }
  const personasData = JSON.parse(readFileSync3(path3.join(DATA_DIR2, "personas.json"), "utf-8"));
  const persona = personasData.personas.find((p) => p.id === personaId) || personasData.personas[0];
  const scrollStoppers = JSON.parse(readFileSync3(path3.join(DATA_DIR2, "scroll_stoppers.json"), "utf-8"));
  let selectedOutfit = null;
  try {
    const outfitsPath = path3.join(DATA_DIR2, "syp_outfits.json");
    if (existsSync3(outfitsPath)) {
      const outfitsData = JSON.parse(readFileSync3(outfitsPath, "utf-8"));
      const outfits = outfitsData.outfits;
      selectedOutfit = outfits[Math.floor(Math.random() * outfits.length)];
      console.log(`[SYP Service] Selected outfit: ${selectedOutfit.id} - ${selectedOutfit.name}`);
    }
  } catch (e) {
    console.log("[SYP Service] Could not load outfits, using default");
  }
  let selectedSetting = null;
  try {
    const settingsPath = path3.join(DATA_DIR2, "syp_settings.json");
    if (existsSync3(settingsPath)) {
      const settingsData = JSON.parse(readFileSync3(settingsPath, "utf-8"));
      const settings = settingsData.settings;
      selectedSetting = settings[Math.floor(Math.random() * settings.length)];
      console.log(`[SYP Service] Selected setting: ${selectedSetting.id} - ${selectedSetting.name}`);
    }
  } catch (e) {
    console.log("[SYP Service] Could not load settings, using default");
  }
  const slide1Text = cleanedSlides[0].replace(/^Slide \d+:\s*/i, "");
  const ugcSlide1Prompt = buildUGCSlide1Prompt(persona, scrollStoppers, slide1Text, ugcBasePrompts, undefined, true, DATA_DIR2, selectedOutfit, selectedSetting);
  const saveyourpetKeywords = [
    "saveyourpet.de",
    "saveyourpet",
    "absicherung",
    "vorsorge",
    "schutz f\xFCr",
    "was wenn er mal krank wird",
    "was wenn sie mal krank wird",
    "bin ich auf einen notfall vorbereitet",
    "sollte ich mich besser absichern",
    "hat vorgesorgt",
    "hat sich um absicherung gek\xFCmmert"
  ];
  const saveyourpetSlideIndices = [];
  cleanedSlides.forEach((slide, index) => {
    const lowerSlide = slide.toLowerCase();
    if (saveyourpetKeywords.some((keyword) => lowerSlide.includes(keyword))) {
      saveyourpetSlideIndices.push(index + 1);
      console.log(`[SYP Service] Detected saveyourpet.de related content in Slide ${index + 1}: "${slide}"`);
    }
  });
  if (saveyourpetSlideIndices.length > 0) {
    console.log(`[SYP Service] Will apply LAPTOP/OVER-THE-SHOULDER prompt for slide(s): ${saveyourpetSlideIndices.join(", ")}`);
  }
  let saveyourpetImageInstruction = "";
  if (saveyourpetSlideIndices.length > 0 && brandingMode === "full") {
    saveyourpetImageInstruction = `

## CRITICAL: SAVEYOURPET.DE SLIDE SPECIAL TREATMENT
For slide(s) ${saveyourpetSlideIndices.join(", ")} (the saveyourpet.de / Absicherung slide):
- Use OVER-THE-SHOULDER perspective
- Show person looking at LAPTOP screen (NOT phone!)
- Laptop displays saveyourpet.de website (use reference image)
- Pet (${selectedProfile.vars.NAME}) should be visible - sleeping behind laptop or lying nearby
- Setting: On bed with laptop, cozy apartment vibe
- Laptop screen should take 25-40% of image, clearly visible

EXACT PROMPT FORMAT for saveyourpet.de slide:
"Over-the-shoulder shot, same ${persona.subject.hair.color} girl on bed looking at laptop screen showing saveyourpet.de [reference image], ${selectedProfile.vars.NAME} sleeping behind laptop, soft lamp lighting, raw UGC aesthetic, laptop screen clearly visible"

This is the ONLY slide where looking at a device is shown. All other slides should be iPhone selfie style.

### ONLY EXCEPTION: 
The saveyourpet.de / Absicherung slide uses a **LAPTOP** with an **OVER-THE-SHOULDER** shot (not a selfie). This is the ONLY time a device screen is shown.
`;
  }
  const sypImageSystemPrompt = `You create ULTRA-REALISTIC image prompts for 'SaveYourPet'. Same identity as persona. Funny/Sarcastic tone.

## \u26A0\uFE0F CRITICAL CONSTRAINT - SELFIE HAND LOGIC:
The image is a SELFIE taken with an iPhone front-camera. ONE HAND MUST HOLD THE PHONE to take the photo.

### \u274C NEVER SHOW A PHONE SCREEN OR HOLD A SECOND PHONE:
- **NO PHONE VISIBLE:** The person should NEVER hold a phone in their hand or show a phone screen to the camera.
- **THE PHONE IS TAKING THE PHOTO:** The phone being used is the camera itself (front-camera selfie). It is impossible to show its screen.
- **NO SECOND PHONE:** Do not include a second phone in the scene.
- "holding up phone showing..." -> \u274C PHYSICALLY IMPOSSIBLE & FORBIDDEN
- "phone screen displaying..." -> \u274C PHYSICALLY IMPOSSIBLE & FORBIDDEN
- "person looking at phone" -> \u274C FORBIDDEN (she is looking at the camera/herself)

### \u274C NEVER USE THESE (physically impossible for selfies):
- "both hands covering mouth" - no hand to hold the phone
- "both hands on face" - no hand to hold the phone  
- "hands together in prayer" - no hand to hold the phone
- "both hands gesturing" - no hand to hold the phone
- Any pose requiring BOTH hands to do something

### \u274C NO BATHROOMS:
- **NEGATIVE CONSTRAINT:** Strictly avoid any mention of bathrooms, toilets, showers, or looking into a bathroom mirror.

### \u274C NO PETS ON COUNTERS:
- **NEGATIVE CONSTRAINT:** NEVER show a pet (dog/cat) on a kitchen counter, table, or any raised household surface. 
- The pet must always be on the floor, on a bed, on a couch, or in the owner's arms.
- "dog on counter" -> \u274C FORBIDDEN
- "cat on kitchen island" -> \u274C FORBIDDEN

### \u2705 VALID HAND POSITIONS (one hand only):
- One hand touching face, resting, gesturing, petting pet, covering mouth, etc.
- The other hand is IMPLIED to be holding the phone (never mention it)
- OR: Mirror selfie where phone is visible but held naturally in one hand.

` + `
Slide 1: ${ugcSlide1Prompt}
Persona: ${persona.name} (${persona.subject.hair.color}, ${persona.subject.hair.style})
Pet: ${selectedProfile.vars.NAME} (${persona.pet.description})${saveyourpetImageInstruction}`;
  const imagePromptResponse = await fetchAnthropicWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: sypImageSystemPrompt,
      messages: [{ role: "user", content: `Generate JSON prompts image2 to image${cleanedSlides.length}:
${cleanedSlides.join(`
`)}` }]
    })
  });
  let imagePrompts = { image1: ugcSlide1Prompt };
  if (imagePromptResponse.ok) {
    const imgData = await imagePromptResponse.json();
    const imgText = imgData.content?.[0]?.text || "";
    const jsonMatch = imgText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedPrompts = JSON.parse(jsonMatch[0]);
        imagePrompts = { image1: ugcSlide1Prompt, ...parsedPrompts };
      } catch (parseError) {
        console.warn("[SYP Service] Failed to parse image prompts JSON, using default:", parseError);
      }
    }
  }
  return {
    slides: cleanedSlides,
    image_prompts: imagePrompts,
    image1_text: ugcSlide1Prompt,
    character_name: persona.name,
    profile: selectedProfile
  };
}

// server/src/projects/dbt/art_styles.ts
var ART_STYLES = {
  hopper: {
    id: "hopper",
    name: "Edward Hopper",
    prefix: "An oil painting in the style of Edward Hopper",
    systemPromptPrinciples: `
- Style: Edward Hopper, cinematic realism, dramatic chiaroscuro lighting.
- Texture: Visible oil paint brushstrokes, canvas texture, avoid smooth CGI look.
- Composition: Geometric framing using windows, doorways, and architectural lines.
- Mood: Still, introspective, and profoundly quiet.
- Settings: Mid-century American (diners, sparsely furnished apartments, hotel rooms, gas stations).
- Rule: Solitary figures in quiet moments. Subject should NOT look at viewer.
`,
    suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
Style: Edward Hopper style, oil painting, cinematic realism, dramatic chiaroscuro lighting, strong angular shadows, mid-20th century American aesthetic, painterly textures, lonely urban atmosphere.
COMPOSITION & MOOD:
- Geometric framing using windows, doorways, and architectural lines
- Solitary figures in quiet, introspective moments
- Sense of stillness, emptiness, and profound solitude
- Cinematic perspectives, like a still from a film
FACE & BODY:
- Subject should NOT look directly at viewer
- Eyes looking away, looking down, or figure seen from behind/profile
- Emotional truth comes from posture, body language, and the way light hits the figure
CLOTHING & SETTING:
- Mid-century American aesthetic (1940s-50s) or neutral timeless clothing
- Simple, clean lines in attire
- Settings: Diners, hotel rooms, gas stations, city apartments, quiet streets at night
- Avoid all historical clich\xE9s (no bonnets, no corsets, no Renaissance elements)
LIGHTING:
- Stark, directional light (sunlight through windows or harsh artificial light)
- Deep, defined shadows that create geometric patterns on walls
- Muted color palette with occasional pops of saturated color (e.g., a red dress or blue wall)
`
  },
  varo: {
    id: "varo",
    name: "Remedios Varo",
    prefix: "A surrealist oil painting in the style of Remedios Varo",
    systemPromptPrinciples: `
- Style: Remedios Varo, surrealist, mystical, alchemical.
- Texture: Fine brushwork, aged varnish, cracked paint texture, antique feel.
- Composition: Metaphysical and dreamlike spaces, fine brushwork, intricate details.
- Mood: Whimsical yet melancholic, mysterious, and highly introspective.
- Settings: Gothic-inspired interiors, mystical libraries, alchemical laboratories, gothic towers.
- Rule: Elongated, spindly figures with heart-shaped faces. Often engaged in delicate, mysterious tasks.
`,
    suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
Style: Remedios Varo style, surrealist oil painting, mystical, alchemical, intricate details, fine brushwork, gothic-inspired interiors.
COMPOSITION & MOOD:
- Metaphysical and dreamlike spaces
- Figures often engaged in scientific or alchemical tasks
- Themes of journey, transformation, and introspection
- Intricate architectural elements and strange machinery
FACE & BODY:
- Elongated, spindly figures with heart-shaped faces and large eyes
- Expressions of intense focus or contemplative stillness
- Subject often seen in profile or absorbed in their work
CLOTHING & SETTING:
- Stylized, flowing garments with intricate textures
- Settings: Mystical libraries, alchemical laboratories, gothic towers, ethereal forests
- Palette of glowing ambers, deep siennas, and ochres with luminous highlights
LIGHTING:
- Soft, ethereal glow often emanating from within objects or figures
- Warm, candle-lit or mystical luminescence
- Subtle, delicate shadows that enhance the magical atmosphere
`
  },
  jean: {
    id: "jean",
    name: "James Jean",
    prefix: "An intricate painting in the lush surrealist style of James Jean",
    systemPromptPrinciples: `
- Style: James Jean, lush fusion of classical technique with surreal, psychedelic fluidity.
- Visuals: Everything flows into everything else. Dense and layered fractal compositions.
- Transformation: No hard boundaries between person and surroundings. Hair becomes vines, skin becomes petals, emotions become weather.
- Figures: Feminine, elegant, ethereal vulnerability. Figures in the middle of transformation, dissolving or becoming.
- Faces: Eyes are often closed or partially hidden, creating an introspective, inward-looking mood.
- NO 3D LOOK: Avoid volumetric lighting and smooth 3D gradients. Use illustrative fluidity and complex linework.
`,
    suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
Style: James Jean style, lush surrealism, classical technique merged with psychedelic fluidity, calligraphic linework.
VISUALS & COMPOSITION:
- Dense and layered fractal compositions where everything flows into everything else
- Figures emerge from swirling masses of flowers, fabric, water, and organic forms
- No hard boundaries: hair becomes vines, skin becomes petals, emotions become weather
- Sense of weightlessness and intricate organic detail
COLOR & LIGHTING:
- Rich, saturated jewel-tone palette (deep magentas, teals, golds, soft pinks) or muted melancholic tones
- Luminous quality, light emanating from within the painting itself
- Decorative flat planes mixed with fluid acrylic washes
FIGURES & MOOD:
- Feminine, elegant figures with ethereal vulnerability
- Subjects in the middle of transformation, dissolving or becoming something else
- Introspective mood: eyes often closed or partially hidden
- Emotional truth through fluid, expressive poses and surreal metamorphosis
`
  },
  symbolic: {
    id: "symbolic",
    name: "Symbolic (No People)",
    prefix: "A candid, spontaneous snapshot taken with an iPhone 12",
    systemPromptPrinciples: `
- Style: iPhone 12 photography, candid UGC, hobby Pinterest vibe (personal and lived-in, not commercial).
- Visuals: Authentic snapshots that look like a normal person casually documented a real moment in their day.
- Texture: Real mobile camera grain, mild noise, imperfect white balance, natural digital sharpening, no creamy pro bokeh.
- Composition: Handheld framing with slight tilt or imperfect centering, but still one clear hero object and readable focus.
- Lighting: Natural, uncorrected lighting (window spill, practical lamp, overhead room light), never studio or ad lighting.
- Rule: STRICTLY NO PEOPLE. No human figures, no hands, no faces. Not even silhouettes.
- Persona: The person is a casual hobbyist with taste, not an influencer production setup. Real, spontaneous, and unpolished.
- Settings: Cozy and relatable everyday spaces (bedside table, IKEA desk, kitchen counter corner, windowsill, hallway shelf), lightly lived-in but not filthy or chaotic.
`,
    suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
STRICT RULE: ABSOLUTELY NO PEOPLE, NO HUMAN FIGURES, NO FACES, NO BODY PARTS.
Style: iPhone 12 photography, candid UGC snapshot, hobby Pinterest vibe, natural unedited light, real life, no professional polish.
COMPOSITION & MOOD:
- Focus on the "authentic and personal" feel of a moment shared privately with a friend.
- Use relatable, real-life environments with one clear object/story focus.
- Capture genuine, un-staged intimacy; imperfect but aesthetically pleasing.
- Casual handheld framing; avoid ad-like symmetry, product-shot polish, and cinematic grading.
`
  }
};

// server/src/projects/dbt/dbt_service.ts
import { existsSync as existsSync4, mkdirSync, readFileSync as readFileSync4, writeFileSync } from "fs";
import { dirname, join } from "path";
var STORY_TELLING_FIXED_CTA = "it's called DBT-Mind. if DBT is something for you - it's free. just search for it on the app store \uD83D\uDDA4";
var STORY_TELLING_FIXED_COMPANION = "you can even choose your own little companion for your journey \uD83E\uDD79";
var WEIRD_HACK_V2_FIXED_SLIDE8 = `one of these will actually work for you

you already know which one`;
var PERMISSION_V1_FIXED_SLIDE8 = "if this hit, save it for the next time your brain tries to tell you you're the problem.";
var WEIRD_HACK_V2_RECENT_TOPICS_LIMIT = 10;
var PERMISSION_V1_RECENT_TOPICS_LIMIT = 10;
var SERVER_ROOT2 = join(import.meta.dir, "..", "..", "..");
var WEIRD_HACK_V2_RECENT_TOPICS_PATH = join(SERVER_ROOT2, "data", "weird_hack_v2_recent_topics.json");
var PERMISSION_V1_RECENT_TOPICS_PATH = join(SERVER_ROOT2, "data", "permission_v1_recent_topics.json");
function normalizeWeirdHackV2TopicKey(value) {
  return String(value || "").trim().toLowerCase();
}
function readWeirdHackV2RecentTopics() {
  try {
    if (!existsSync4(WEIRD_HACK_V2_RECENT_TOPICS_PATH))
      return [];
    const raw = JSON.parse(readFileSync4(WEIRD_HACK_V2_RECENT_TOPICS_PATH, "utf8"));
    const topics = Array.isArray(raw?.topics) ? raw.topics : [];
    return topics.map((topic) => String(topic || "").trim()).filter(Boolean).slice(-WEIRD_HACK_V2_RECENT_TOPICS_LIMIT);
  } catch (error) {
    console.warn("[Native Slides - DBT] Failed to read weird hack v2 topic history, continuing without it.", error);
    return [];
  }
}
function writeWeirdHackV2RecentTopics(topics) {
  try {
    mkdirSync(dirname(WEIRD_HACK_V2_RECENT_TOPICS_PATH), { recursive: true });
    writeFileSync(WEIRD_HACK_V2_RECENT_TOPICS_PATH, JSON.stringify({
      topics: topics.slice(-WEIRD_HACK_V2_RECENT_TOPICS_LIMIT),
      updatedAt: new Date().toISOString()
    }, null, 2), "utf8");
  } catch (error) {
    console.warn("[Native Slides - DBT] Failed to persist weird hack v2 topic history.", error);
  }
}
function pickWeirdHackV2Topic(topics) {
  const recentTopics = readWeirdHackV2RecentTopics();
  const recentSet = new Set(recentTopics.map(normalizeWeirdHackV2TopicKey));
  const availableTopics = topics.filter((topic) => !recentSet.has(normalizeWeirdHackV2TopicKey(topic.topic)));
  const pool = availableTopics.length > 0 ? availableTopics : topics;
  const selectedTopic = pool[Math.floor(Math.random() * pool.length)] || topics[0];
  const dedupedHistory = recentTopics.filter((topic) => normalizeWeirdHackV2TopicKey(topic) !== normalizeWeirdHackV2TopicKey(selectedTopic.topic));
  dedupedHistory.push(selectedTopic.topic);
  writeWeirdHackV2RecentTopics(dedupedHistory);
  return selectedTopic;
}
function normalizePermissionV1TopicKey(value) {
  return String(value || "").trim().toLowerCase();
}
function readPermissionV1RecentTopics() {
  try {
    if (!existsSync4(PERMISSION_V1_RECENT_TOPICS_PATH))
      return [];
    const raw = JSON.parse(readFileSync4(PERMISSION_V1_RECENT_TOPICS_PATH, "utf8"));
    const topics = Array.isArray(raw?.topics) ? raw.topics : [];
    return topics.map((topic) => String(topic || "").trim()).filter(Boolean).slice(-PERMISSION_V1_RECENT_TOPICS_LIMIT);
  } catch (error) {
    console.warn("[Native Slides - DBT] Failed to read permission v1 topic history, continuing without it.", error);
    return [];
  }
}
function writePermissionV1RecentTopics(topics) {
  try {
    mkdirSync(dirname(PERMISSION_V1_RECENT_TOPICS_PATH), { recursive: true });
    writeFileSync(PERMISSION_V1_RECENT_TOPICS_PATH, JSON.stringify({
      topics: topics.slice(-PERMISSION_V1_RECENT_TOPICS_LIMIT),
      updatedAt: new Date().toISOString()
    }, null, 2), "utf8");
  } catch (error) {
    console.warn("[Native Slides - DBT] Failed to persist permission v1 topic history.", error);
  }
}
function pickPermissionV1Topic(topics) {
  const recentTopics = readPermissionV1RecentTopics();
  const recentSet = new Set(recentTopics.map(normalizePermissionV1TopicKey));
  const availableTopics = topics.filter((topic) => !recentSet.has(normalizePermissionV1TopicKey(topic.shameWord)));
  const pool = availableTopics.length > 0 ? availableTopics : topics;
  const selectedTopic = pool[Math.floor(Math.random() * pool.length)] || topics[0];
  const dedupedHistory = recentTopics.filter((topic) => normalizePermissionV1TopicKey(topic) !== normalizePermissionV1TopicKey(selectedTopic.shameWord));
  dedupedHistory.push(selectedTopic.shameWord);
  writePermissionV1RecentTopics(dedupedHistory);
  return selectedTopic;
}
function stripMarkdownCodeFences(value) {
  return String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
function extractBalancedJson(value) {
  const text = stripMarkdownCodeFences(value);
  const start = text.search(/[\{\[]/);
  if (start === -1)
    return null;
  const opener = text[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let i = start;i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
function fallbackParseSlidesObject(value) {
  const text = stripMarkdownCodeFences(value);
  const slidesMatch = text.match(/"slides"\s*:\s*\[([\s\S]*?)\]/);
  if (!slidesMatch)
    return null;
  const quotedValues = [...slidesMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => match[1]).filter((entry) => typeof entry === "string").map((entry) => entry.replace(/\\"/g, '"').replace(/\\n/g, `
`).replace(/\\\\/g, "\\"));
  if (quotedValues.length === 0)
    return null;
  return { slides: quotedValues };
}
function parseClaudeJsonResponse(resultText, logLabel, fallbackParser) {
  const extractedJson = extractBalancedJson(resultText);
  if (!extractedJson) {
    console.error(`${logLabel} No JSON found in AI response:`, resultText);
    throw new Error("No JSON found in AI response");
  }
  try {
    return JSON.parse(extractedJson);
  } catch (parseError) {
    const fallbackParsed = fallbackParser ? fallbackParser(resultText) : null;
    if (!fallbackParsed) {
      console.error(`${logLabel} Failed to parse AI JSON:`, parseError);
      console.error(`${logLabel} Raw AI response:`, resultText);
      throw parseError;
    }
    return fallbackParsed;
  }
}
function isStoryEmojiOnlyFragment(value) {
  const text = String(value || "").trim();
  if (!text)
    return false;
  const stripped = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s"'`.,!?;:()[\]{}\-\u2013\u2014_~*+#/\\|]+/gu, "").trim();
  return stripped.length === 0;
}
function looksLikeStoryCompanionSlide(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("little companion") || text.includes("choose") && text.includes("companion");
}
function looksLikeStoryCtaSlide(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("it's called dbt-mind") || text.includes("search for it on the app store");
}
function normalizeStoryTellingSlides(rawSlides) {
  const mergedSlides = [];
  for (const rawSlide of rawSlides) {
    const slide = String(rawSlide || "").trim();
    if (!slide)
      continue;
    if (isStoryEmojiOnlyFragment(slide) && mergedSlides.length > 0) {
      mergedSlides[mergedSlides.length - 1] = `${mergedSlides[mergedSlides.length - 1]} ${slide}`.trim();
      continue;
    }
    mergedSlides.push(slide);
  }
  const hasTrailingCta = mergedSlides.length > 0 && looksLikeStoryCtaSlide(mergedSlides[mergedSlides.length - 1]);
  const bodySlides = hasTrailingCta ? mergedSlides.slice(0, -1) : [...mergedSlides];
  if (bodySlides.length === 7 && !looksLikeStoryCompanionSlide(bodySlides[6])) {
    bodySlides.push(STORY_TELLING_FIXED_COMPANION);
  }
  return hasTrailingCta ? [...bodySlides, mergedSlides[mergedSlides.length - 1]] : bodySlides;
}
var WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK = `Styling rules: Hopeful vibe asthetic, unprofessional iPhone 12 candid shot, Medium quality, authentic Tiktok asthetic. Do NOT add background blur/unsharpness. The image should look unintended and fully spontaneously.`;
var WEIRD_HACK_V2_NANO_BANANA_NEGATIVES_BLOCK = `Negatives: No phones, no hands in image, no person visible in image, No notebook with written text, blank notebook is okay. No readable text in image.`;
var WEIRD_HACK_V2_MEME_OPTIONS = {
  overwhelm: [
    {
      keys: ["this is fine", "this-is-fine"],
      injection: "A clearly recognizable This Is Fine dog meme printout is placed in the near-midground on the desk, shelf edge, or bedside surface, large enough to be recognized instantly, but without readable caption text."
    },
    {
      keys: ["crying-laughing wojak", "crying laughing wojak", "wojak"],
      injection: "A clearly recognizable crying-laughing Wojak meme printout is placed in the near-midground pinned beside the bed or resting on a shelf edge, large enough to be recognized instantly, but without readable caption text."
    },
    {
      keys: ["brain on fire"],
      injection: "A clearly recognizable brain on fire meme printout is placed in the near-midground clipped near the desk or shelf edge, large enough to be recognized instantly, but without readable caption text."
    }
  ],
  splitting: [
    {
      keys: ["spider-man pointing", "spider man pointing", "spiderman pointing"],
      injection: "A clearly recognizable Spider-Man pointing meme image is placed in the near-midground taped beside the bed or desk, large enough to be recognized instantly, but without readable caption text."
    },
    {
      keys: ["drake"],
      injection: "A clearly recognizable Drake approve-disapprove meme printout is placed in the near-midground near the desk or shelf edge, large enough to be recognized instantly, but without readable caption text."
    },
    {
      keys: ["two sides wojak", "split wojak", "wojak"],
      injection: "A clearly recognizable split-style Wojak meme printout with two contrasting faces is placed in the near-midground near the desk or wall, large enough to be recognized instantly, but without readable caption text."
    }
  ],
  relationships: [
    {
      keys: ["i'll be fine wojak", "i will be fine wojak", "wojak"],
      injection: "A clearly recognizable trembling-lip Wojak meme printout is placed in the near-midground beside the bed or on a shelf edge, large enough to be recognized instantly, but without readable caption text."
    },
    {
      keys: ["distracted boyfriend"],
      injection: "A clearly recognizable Distracted Boyfriend meme printout is placed in the near-midground clipped near the shelf or desk area, large enough to be recognized instantly, but without readable caption text."
    },
    {
      keys: ["sad wojak", "relationship wojak"],
      injection: "A clearly recognizable sad Wojak relationship-style meme printout is placed in the near-midground taped near the shelf or wall, large enough to be recognized instantly, but without readable caption text."
    }
  ]
};
var WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS = [
  {
    keys: ["framed shrek photo", "shrek"],
    injection: "A clearly recognizable framed Shrek photo is placed in the near-midground on a shelf edge or bedside surface, large enough to be recognized instantly."
  },
  {
    keys: ["patrick star", "patrick"],
    injection: "A clearly recognizable Patrick Star printout is placed in the near-midground taped near the desk or bed, large enough to be recognized instantly."
  },
  {
    keys: ["dora"],
    injection: "A clearly recognizable Dora printout is placed in the near-midground clipped near the shelf or wall, large enough to be recognized instantly."
  },
  {
    keys: ["mike wazowski", "wazowski"],
    injection: "A clearly recognizable Mike Wazowski printout is placed in the near-midground on the shelf edge or desk corner, large enough to be recognized instantly."
  },
  {
    keys: ["lightning mcqueen", "mcqueen"],
    injection: "A clearly recognizable Lightning McQueen printout is placed in the near-midground taped near the desk or bed, large enough to be recognized instantly."
  }
];
var WEIRD_HACK_V2_MEME_CATEGORIES = {
  overwhelm: ["overwhelm", "overwhelmed", "emotional dysregulation", "too much", "panic", "meltdown", "rage", "spiral", "3am", "brain on fire"],
  splitting: ["splitting", "black and white", "black-and-white", "all-or-nothing", "split", "two sides", "emotional mind", "rational mind"],
  relationships: ["abandonment", "relationship", "fp", "favorite person", "fear of replacement", "attachment", "texting anxiety", "left alone", "rejected"]
};
var WEIRD_HACK_V2_TOPIC_MEME_OVERRIDES = [
  {
    keywords: ["digital self-harm", "checking blocks", "old texts", "search bar", "searching for things that trigger you", "stalking ex-fps"],
    categories: ["overwhelm"]
  },
  {
    keywords: ["emotional dysregulation", "overwhelm", "too much", "0 to 100", "rage", "panic"],
    categories: ["overwhelm"]
  },
  {
    keywords: ["splitting", "black-and-white", "black and white", "all-or-nothing"],
    categories: ["splitting"]
  },
  {
    keywords: ["fp dynamics", "favorite person", "abandonment panic", "relationship cycles", "fear of replacement", "texting anxiety", "attachment", "rejection sensitivity"],
    categories: ["relationships"]
  }
];
var WEIRD_HACK_V2_ALL_MEME_OPTIONS = [
  ...WEIRD_HACK_V2_MEME_OPTIONS.overwhelm,
  ...WEIRD_HACK_V2_MEME_OPTIONS.splitting,
  ...WEIRD_HACK_V2_MEME_OPTIONS.relationships
];
var WEIRD_HACK_V2_ALL_FUNNY_OPTIONS = [
  ...WEIRD_HACK_V2_ALL_MEME_OPTIONS,
  ...WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS
];
function promptContainsWeirdHackV2Meme(value) {
  const normalized = String(value || "").toLowerCase();
  return WEIRD_HACK_V2_ALL_FUNNY_OPTIONS.some((option) => option.keys.some((key) => normalized.includes(key)));
}
function stripWeirdHackV2MemeSentences(value) {
  let cleaned = String(value || "");
  const sentencePatterns = [
    /[^.]*This Is Fine[^.]*\.?/gi,
    /[^.]*Wojak[^.]*\.?/gi,
    /[^.]*brain on fire[^.]*\.?/gi,
    /[^.]*Spider-?Man pointing[^.]*\.?/gi,
    /[^.]*Drake approve-disapprove[^.]*\.?/gi,
    /[^.]*Distracted Boyfriend[^.]*\.?/gi,
    /[^.]*Shrek[^.]*\.?/gi,
    /[^.]*Patrick Star[^.]*\.?/gi,
    /[^.]*Dora[^.]*\.?/gi,
    /[^.]*Mike Wazowski[^.]*\.?/gi,
    /[^.]*Lightning McQueen[^.]*\.?/gi
  ];
  for (const pattern of sentencePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.replace(/\s{2,}/g, " ").trim();
}
function chooseWeirdHackV2MemeOption(promptText, slideContextText = "") {
  const normalized = String(promptText || "").toLowerCase();
  const context = String(slideContextText || "").toLowerCase();
  for (const override of WEIRD_HACK_V2_TOPIC_MEME_OVERRIDES) {
    if (override.keywords.some((keyword) => context.includes(keyword))) {
      const category = override.categories[Math.floor(Math.random() * override.categories.length)] || override.categories[0];
      const options = WEIRD_HACK_V2_MEME_OPTIONS[category];
      return options[Math.floor(Math.random() * options.length)] || options[0];
    }
  }
  const categoryOrder = ["overwhelm", "splitting", "relationships"];
  for (const category of categoryOrder) {
    if (WEIRD_HACK_V2_MEME_CATEGORIES[category].some((keyword) => normalized.includes(keyword))) {
      const options = WEIRD_HACK_V2_MEME_OPTIONS[category];
      return options[Math.floor(Math.random() * options.length)] || options[0];
    }
  }
  return WEIRD_HACK_V2_MEME_OPTIONS.overwhelm[Math.floor(Math.random() * WEIRD_HACK_V2_MEME_OPTIONS.overwhelm.length)] || WEIRD_HACK_V2_MEME_OPTIONS.overwhelm[0];
}
function chooseWeirdHackV2FunnyDetailOption(promptText, slideContextText = "") {
  const useCharacter = Math.random() < 0.35;
  if (useCharacter) {
    return WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS[Math.floor(Math.random() * WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS.length)] || WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS[0];
  }
  return chooseWeirdHackV2MemeOption(promptText, slideContextText);
}
function enforceWeirdHackV2CommentTriggerPrompts(prompts, slides = []) {
  const slideKeys = ["slide2", "slide3", "slide4"];
  const normalizedPrompts = { ...prompts };
  const slideContextByKey = {
    slide2: `${slides[0] || ""}
${slides[1] || ""}`,
    slide3: `${slides[0] || ""}
${slides[2] || ""}`,
    slide4: `${slides[0] || ""}
${slides[3] || ""}`
  };
  const matchingKeys = slideKeys.filter((slideKey) => {
    const text = String(normalizedPrompts[slideKey] || "");
    return promptContainsWeirdHackV2Meme(text);
  });
  if (matchingKeys.length > 1) {
    const keepSlideKey = matchingKeys[Math.floor(Math.random() * matchingKeys.length)] || matchingKeys[0];
    for (const slideKey of matchingKeys) {
      if (slideKey === keepSlideKey)
        continue;
      normalizedPrompts[slideKey] = stripWeirdHackV2MemeSentences(normalizedPrompts[slideKey] || "");
    }
    return normalizedPrompts;
  }
  if (matchingKeys.length === 1) {
    return normalizedPrompts;
  }
  const targetSlideKey = slideKeys[Math.floor(Math.random() * slideKeys.length)] || "slide2";
  const selectedOption = chooseWeirdHackV2FunnyDetailOption(normalizedPrompts[targetSlideKey] || "", slideContextByKey[targetSlideKey] || slides.join(`
`));
  const basePrompt = String(normalizedPrompts[targetSlideKey] || "").trim();
  normalizedPrompts[targetSlideKey] = basePrompt ? `${basePrompt} ${selectedOption.injection}` : selectedOption.injection;
  return normalizedPrompts;
}
function sanitizeWeirdHackV2CommentTriggerPrompt(scenePrompt) {
  return String(scenePrompt || "");
}
function buildWeirdHackV2NanoBananaPrompt(scenePrompt) {
  const cleanedScenePrompt = sanitizeWeirdHackV2CommentTriggerPrompt(scenePrompt).trim();
  if (!cleanedScenePrompt)
    return cleanedScenePrompt;
  if (cleanedScenePrompt.startsWith(WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK)) {
    return cleanedScenePrompt;
  }
  const fullPrompt = [
    WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK,
    WEIRD_HACK_V2_NANO_BANANA_NEGATIVES_BLOCK,
    cleanedScenePrompt
  ].join(`

`);
  return fullPrompt;
}
async function generateWeirdHackV2ImagePrompts(slides, ANTHROPIC_API_KEY) {
  const outdoorSystemPrompt = `You write image generation prompts for TikTok slideshow posts about BPD and DBT skills.

The Weird Hack V2 flow should use outdoor nature scenes for slides 2 through 8.

Core rules:
- photorealistic outdoor nature photography only
- vertical 9:16 compositions
- no people visible
- no indoor scenes, furniture, bedrooms, desks, houses, or city settings
- no text, signs, phones, books, notebooks, screenshots, app UI, or meme props
- no surreal or symbolic fantasy imagery
- each prompt should feel like a real place someone could photograph in nature
- each slide must have a clearly different landscape, weather, time of day, or terrain
- prioritize beautiful, emotionally resonant nature: ocean, lake, sunset, sunrise, mountain hike, park path, cliff coast, golden meadow, forest trail, waterfall, river, or wide sky

Gen-Z grounding rules:
- the nature scenes should feel like places a Gen-Z woman would realistically stop and photograph for TikTok or Instagram, not generic travel-brochure landscapes
- favor accessible, youth-coded beautiful outdoor settings: lakeside path at golden hour, beach access walkway at sunset, roadside ocean overlook, easy mountain-hike viewpoint, city park path after rain, bluff viewpoint, riverbank, grassy hill, coastal path, storm-clearing field edge
- prefer scenes with a casual phone-photo feel: intimate framing, slightly imperfect composition, beautiful light, save-worthy mood, not sterile tourism-poster photography
- avoid anything that feels like a luxury resort, national geographic expedition, retirement travel ad, or stock wallpaper
- when helpful, include subtle young-adult context in the scene itself without making it an indoor setup: worn footpath, picnic blanket edge, hoodie tossed on a rock, tote bag near the frame edge, parked-car overlook vibe, boardwalk railing, trail fence, campus-adjacent green space
- do not make those lifestyle clues dominate the image; nature still has to be the main subject

Emotional arc:
- slides 2-5 can be moodier, heavier, darker, more overcast, or more tense
- slide 6 should feel like a turning point or reframe
- slide 7 should feel softer, calmer, and more forgiving
- slide 8 should feel open, spacious, and quietly hopeful

Preferred settings include ocean, lake, sunset, sunrise, mountain hike, park path, cliff coast, meadow, forest trail, waterfall, river, canyon, winding trail, and storm-clearing sky.

Return only valid JSON with keys slide2, slide3, slide4, slide5, slide6, slide7, slide8.`;
  const outdoorUserPrompt = `Write one outdoor nature image prompt for each of these 7 slides. Match the emotional meaning of each slide with a real, photorealistic landscape.

Important:
- make the scenes feel Gen-Z-coded and socially believable, like places a 20-something woman would actually photograph and post
- make the scenes beautiful first: ocean, lake, sunset, mountain hike, park, coastline, meadow, forest trail, waterfall, or river
- avoid bland generic greenery, empty stock landscapes, or travel-ad style scenery
- keep the nature scene as the focus, but lean toward accessible, emotionally pretty outdoor places over fantasy-perfect landscapes

Slide 2: ${slides[1] || ""}
Slide 3: ${slides[2] || ""}
Slide 4: ${slides[3] || ""}
Slide 5: ${slides[4] || ""}
Slide 6: ${slides[5] || ""}
Slide 7: ${slides[6] || ""}
Slide 8: ${slides[7] || ""}

Return strictly as JSON - no markdown, no explanation:
{"slide2": "...", "slide3": "...", "slide4": "...", "slide5": "...", "slide6": "...", "slide7": "...", "slide8": "..."}`;
  const outdoorResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: outdoorSystemPrompt,
      messages: [{ role: "user", content: outdoorUserPrompt }]
    })
  });
  if (!outdoorResponse.ok) {
    const errorText = await outdoorResponse.text();
    console.error("[Weird Hack V2 Image Prompts] Anthropic API Error:", errorText);
    throw new Error("Image prompt generation failed");
  }
  const outdoorRaw = await outdoorResponse.json();
  const outdoorText = outdoorRaw.content?.[0]?.text || "";
  const outdoorParsed = parseClaudeJsonResponse(outdoorText, "[Weird Hack V2 Image Prompts]");
  return {
    slide2: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide2 || "").trim()),
    slide3: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide3 || "").trim()),
    slide4: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide4 || "").trim()),
    slide5: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide5 || "").trim()),
    slide6: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide6 || "").trim()),
    slide7: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide7 || "").trim()),
    slide8: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide8 || "").trim())
  };
  const systemPrompt = `You write image generation prompts for TikTok slideshow posts about BPD and DBT skills. 

The visual style is: candid phone photography aesthetic. Real, intimate, everyday settings. Tight crops on objects and environments. Warm or dim practical lighting \u2014 lamp light, daylight through curtains, ambient room light. Textures: paper, bedsheets, wood, fabric, walls. Grainy, slightly imperfect. Feels like something a real person actually photographed.

NEVER: illustrated, painted, symbolic, surreal, abstract, AI-looking, cinematic, dramatic lighting, stock photo, professional photography.

ALWAYS: candid, intimate, real-world settings, phone photography grain.

Hidden styling rules you must internalize and apply to every prompt:
- Candid, hopeful vibe asthetic image taken spontaneous with iPhone 12 from a 22 year old woman (college student).
- Should look like a casual photo someone sends to friends over snapchat.
- Choose a casual photo angle, not something where it looks like a staged image from a photo shooting.
- Medium quality, authentic Tiktok asthetic.
- All hopeful Pinterest vibe asthetic.

Scene grounding rule:
- Every scene should plausibly belong to a 22 year old college girl from the US.
- Favor objects, rooms, furniture, decor, and everyday environments that feel age-appropriate and culturally plausible for that life stage.
- Think: dorm room, student apartment, campus-adjacent bedroom, casual study corner, inexpensive furniture, soft bedding, simple wall decor, everyday young-adult spaces.
- Avoid scenes that feel too mature, luxurious, corporate, suburban-family, rustic-workshop, or obviously outside that demographic.
- Every prompt must include at least one clear college-girl lifestyle anchor in the actual scene description: bedding, tote bag, student desk setup, casual beauty item, hoodie, simple jewelry tray, paperback, wall collage, cheap lamp, thrifted decor, study materials, water bottle, or similar young-adult room detail.
- The scene should feel like it came from her real room, desk, bed, or student living environment, not just a random object in isolation.
- Even when the composition is minimal, it still needs one recognizable lifestyle clue that signals her age and environment.

Demographic clarity rule:
- The viewer should immediately feel "this belongs to a young US college woman" from the scene itself.
- Use ordinary student-lifestyle clues instead of abstract mood objects.
- Good anchors: rumpled dorm-style bedding, a canvas tote on a chair, a cheap bedside lamp, a simple vanity tray, class notes stacked nearby without readable text, a thrifted mirror, a hoodie on the bed, a paperback, a water bottle, a desk organizer, soft dorm decor, or a small student apartment kitchen detail.
- Bad anchors: anonymous wood grain, random metal tools, empty industrial surfaces, generic close-up textures, mature home decor, workshop objects, or scenes that could belong to anyone of any age.
- Never make the focal point just "a texture" or "a surface."
- If a prompt could plausibly fit a middle-aged home, hotel, office, or workshop, rewrite it until it feels clearly young, casual, and student-coded.

Hidden negatives you must internalize and apply to every prompt:
- No phones.
- No hands in image.
- No readable text in image.
- No person visible in image.
- No notebook with written text, blank notebook is okay.

Do NOT write those styling rules or negatives verbatim in the output prompts unless directly necessary. Instead, naturally describe scenes that already satisfy them.

CRITICAL OUTPUT RULE:
The final prompt text must describe ONLY the visible scene content:
- setting
- objects
- lighting
- framing/composition

Do NOT mention style words or meta-prompt language in the output.
Do NOT mention things like:
- candid
- spontaneous
- iPhone
- Snapchat
- TikTok
- Pinterest
- medium quality
- aesthetic
- hopeful vibe
- grain
- authentic
- casual photo angle

Those are hidden art-direction rules for you, not text to include in the generated prompts.
The output should read like a plain description of what is in the image, nothing else.

CALM COMPOSITION RULE:
- Keep scenes visually simple and uncluttered.
- Use only a few objects that matter.
- Avoid busy rooms, crowded surfaces, too many props, or lots of small details.
- Favor negative space, stillness, and one clear focal point so the image feels calming.

VARIETY RULE ACROSS THE 4 PROMPTS:
- Treat slides 2, 3, 4, and 5 as one visual set, not 4 isolated prompts.
- Each prompt must feel clearly different from the others in location, focal object, and composition.
- Do not reuse the same core setup more than once across the set.
- At most one prompt may use a notebook, journal, sticky note, or pen as the main focal object.
- Spread the scenes across different young-adult environments when possible: bed, desk, chair, shelf, mirror area, floor corner, kitchen counter, windowsill, laundry basket, backpack area, bedside table.
- Vary the camera framing too: one overhead, one side angle, one wider room fragment, one tight close-up with a clear lifestyle anchor.
- If two prompts feel visually interchangeable, rewrite one until the difference is obvious.

COMMENT-TRIGGER DETAIL RULE:
- In exactly one of slides 2, 3, or 4, include one subtle funny detail that feels hilarious, recognizable, and comment-worthy.
- This detail must still plausibly belong to a 22 year old college girl from the US.
- It should never be the focal point of the image. It should sit in the background or side area as a discoverable detail.
- It must feel harmless, real, and room-appropriate, not shocking, sexual, gross, dangerous, or mean-spirited.
- Choose either a topic-matching meme or one funny character insert.
- If using a meme, choose it based on the slide text and overall topic of the post.
- Use this meme bank only:
  Emotional dysregulation / overwhelm:
  - This Is Fine
  - Crying-Laughing Wojak
  - Brain on fire
  Splitting / black-and-white thinking:
  - Spider-Man pointing
  - Drake approve/disapprove
  - split-style Wojak
  Abandonment fear / relationships:
  - trembling-lip Wojak
  - Distracted Boyfriend
- If using a funny character instead of a meme, use this character bank only:
  - Shrek
  - Patrick Star
  - Dora
  - Mike Wazowski
  - Lightning McQueen
- Pick one option from either bank. Do not invent new funny inserts outside these banks.
- The funny detail should appear as a small printed image, framed image, or taped/clipped visual in the room.
- Prefer iconic visuals that still work without readable text.
- Do not rely on readable captions. The joke should land through the visual itself.
- Place the funny detail in the near-midground, not far away in the back of the room.
- Make the funny detail physically large enough in the composition that the viewer could recognize it instantly in the final 9:16 image.
- Prefer placements like shelf edge, desk corner, beside the bed, clipped to a nearby lamp, or taped on the wall close to the main subject area.
- Do not include this kind of funny detail in more than one prompt.
- The detail must be visually recognizable in one glance in the final image, not so tiny or hidden that viewers miss it.
- Avoid weaker joke props or random nostalgic objects. Use only the approved meme bank or approved character bank.
- Place the detail where it is clearly visible in the composition: taped on the wall, sitting on the shelf edge, leaning beside the bed, on the desk corner, or otherwise unobscured.
- Make it noticeable enough to survive image generation, cropping, and text overlay.
- A good test: someone should instantly notice the funny detail and want to comment on it after one quick glance.

VALIDATION RULE BEFORE YOU ANSWER:
- Check each prompt before returning it.
- If the scene does not obviously read as belonging to a 22 year old college girl from the US, rewrite it.
- If the scene is just an artsy close-up of texture, wood, fabric, metal, or a generic object, rewrite it.
- If the prompt lacks at least one young-student lifestyle anchor, rewrite it.
- If more than one prompt centers on a notebook, journal, sticky note, or pen setup, rewrite the extras.
- If none of slides 2, 3, or 4 includes a subtle hilarious or nostalgic comment-trigger detail, rewrite one of them.
- If more than one prompt includes a hilarious or nostalgic comment-trigger detail, rewrite the extras.
- If the comment-trigger detail is too weak, too normal, too hidden, or not clearly recognizable at a glance, rewrite it.
- If the meme is too far away, too small, or would not be instantly recognizable in the final crop, rewrite it.

Emotional arc rules:
- Tip slides (slides 2-4): Match the emotional weight of the tip. Language/reframe tips \u2192 notebook, pen on paper, an open journal, a sticky note, quiet objects that imply reflection. Timing/waiting tips \u2192 stillness, a clock, an unmade bed, a dark room, curtains, lamp light. Evidence/tracking tips \u2192 saved notes, printed screenshots, a notebook log, something archived or collected without showing a phone.
- Reframe slide (slide 5): Warmer, softer. Morning light, stillness, a sense of quiet after the storm.

- Override for variety: do not default multiple slides to notebook or pen scenes just because they fit emotionally.
- Only one prompt in the full set may use a notebook, journal, sticky note, or pen-centered scene.
- Prefer alternate young-adult anchors for the other slides: hoodie on chair, bedside lamp, tote bag, paperback, mirror tray, laundry basket, water bottle, desk organizer, pinned keepsakes, archive folder, or bedding detail.
- The image should fit the slide text specifically, but still stay visually distinct from the other three prompts.

You receive 4 slide texts and return exactly 4 image prompts as JSON.`;
  const userPrompt = `Write one image generation prompt for each of these 4 slides. Match the scene to the emotional content of each slide.

Important:
- Every prompt must feel like it was photographed in the real environment of a 22 year old college girl from the US.
- Keep the scene calm and simple, but not generic.
- Include at least one clear college-student lifestyle clue in every prompt.
- Do not give me anonymous texture prompts or random surface close-ups.
- Make the 4 prompts visually distinct from each other.
- Do not give me more than one notebook, journal, sticky note, or pen-centered prompt across the full set.
- Exactly one of slides 2-4 must include one clearly noticeable funny detail chosen from the approved meme bank or approved funny character bank.
- If it is a meme, choose it based on the slide text and topic.
- The funny detail should appear as a small printed, framed, taped, or clipped image in the room.
- Prefer iconic visuals that still work without readable text.
- Place the funny detail in the near-midground and make it large enough that it is instantly recognizable in the final image.

Slide 2: ${slides[1] || ""}
Slide 3: ${slides[2] || ""}
Slide 4: ${slides[3] || ""}
Slide 5: ${slides[4] || ""}

Return strictly as JSON \u2014 no markdown, no explanation:
{"slide2": "...", "slide3": "...", "slide4": "...", "slide5": "..."}`;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Weird Hack V2 Image Prompts] Anthropic API Error:", errorText);
    throw new Error("Image prompt generation failed");
  }
  const raw = await response.json();
  const text = raw.content?.[0]?.text || "";
  const parsed = parseClaudeJsonResponse(text, "[Weird Hack V2 Image Prompts]");
  const enforcedPrompts = enforceWeirdHackV2CommentTriggerPrompts({
    slide2: String(parsed.slide2 || "").trim(),
    slide3: String(parsed.slide3 || "").trim(),
    slide4: String(parsed.slide4 || "").trim(),
    slide5: String(parsed.slide5 || "").trim()
  }, slides);
  return {
    slide2: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide2),
    slide3: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide3),
    slide4: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide4),
    slide5: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide5)
  };
}
async function generateDbtSlides(params) {
  const { ANTHROPIC_API_KEY, includeBranding = true, topic, slideType = "weird_hack" } = params;
  const isStoryTellingFlow = slideType === "story_telling_bf" || slideType === "story_telling_gf";
  const needsViralTopic = !isStoryTellingFlow && slideType !== "weird_hack_v2" && slideType !== "permission_v1";
  const selectedArtStyle = ART_STYLES.symbolic;
  console.log(`[Native Slides - DBT] Generating ${slideType} format, style: ${selectedArtStyle.name}, branding: ${includeBranding ? "ON" : "OFF"}`);
  const viralTopics = [
    { topic: "FP Dynamics", struggles: ["texting anxiety", "fear of replacement", "obsessive thoughts", "needing constant reassurance", "losing your FP", "FP dependency/addiction"] },
    { topic: "Splitting", struggles: ["turning on a loved one over a 'tone' shift", "moving from soulmate to enemy", "splitting on yourself", "all-or-nothing thinking", "black-and-white thinking in relationships"] },
    { topic: "Abandonment Panic", struggles: ["pushing people away before they leave", "testing people to see if they'll stay", "panic when someone is 5 mins late", "analyzing words for signs of leaving", "relationship sabotage", "why calm feels like rejection"] },
    { topic: "Relationship Cycles", struggles: ["idealization vs devaluation", "the breakup cycle", "choosing the same toxic people", "trauma bonding vs love", "when love feels like chaos"] },
    { topic: "Quiet BPD", struggles: ["splitting inward/self-hatred", "masking high distress with a calm face", "dissociating when overwhelmed", "feeling like a burden for having needs", "invisible struggle", "no one believes you are struggling"] },
    { topic: "Identity/Sense of Self", struggles: ["feeling like a 'void' when alone", "copying personalities to fit in", "not knowing your own values", "feeling invisible", "copying behaviors to fit in", "who am I without my emotions"] },
    { topic: "Emotional Dysregulation", struggles: ["BPD rage out of nowhere", "feeling 'too much' for others", "emotional hangovers after outbursts", "rapid mood swings", "nervous system explanation", "0 to 100 instantly"] },
    { topic: "Reframes/Truths", struggles: ["hypervigilance vs empathy", "withdrawal vs love", "romanticizing survival mechanisms", "uncomfortable truths about BPD behaviors"] },
    { topic: "DBT Skills", struggles: ["TIPP for crisis", "Opposite Action breakthroughs", "Radical Acceptance", "the skill that finally clicked", "what actually works vs sounds good"] },
    { topic: "Recovery Milestones", struggles: ["6 months ago vs now", "first time catching a split", "sitting with emotions", "small wins that matter"] },
    { topic: "Therapy Truths", struggles: ["what therapists won't say directly", "DBT vs talk therapy", "why it feels worse before it gets better", "the reality of treatment"] },
    { topic: "Rejection Sensitivity", struggles: ["interpreting mid emojis as hatred", "physical sickness after minor criticism", "post-socializing spiral/over-analyzing", "perceiving slight shifts in energy"] },
    { topic: "Digital Self-Harm", struggles: ["checking blocks/old texts", "searching for things that trigger you", "comparing yourself to their new friends", "stalking ex-FPs"] }
  ];
  const weirdHackV2Topics = [
    { topic: "Splitting", category: "bpd", struggles: ["all-or-nothing thinking", "turning on someone over a tone shift", "black-and-white thinking"], inGroupTerms: ["splitting", "splitting on someone"] },
    { topic: "FP Dynamics", category: "bpd", struggles: ["texting anxiety", "fear of replacement", "obsessive thoughts", "needing constant reassurance"], inGroupTerms: ["fp", "favorite person", "my fp"] },
    { topic: "Abandonment Panic", category: "bpd", struggles: ["panic when someone is 5 mins late", "testing people", "analyzing words for signs of leaving", "why calm feels like rejection"], inGroupTerms: ["abandonment panic", "abandonment wound"] },
    { topic: "Relationship Cycles", category: "bpd", struggles: ["idealization vs devaluation", "trauma bonding vs love", "choosing the same toxic people"], inGroupTerms: ["idealize-devalue cycle", "the cycle"] },
    { topic: "Quiet BPD", category: "bpd", struggles: ["splitting inward", "masking distress with a calm face", "feeling like a burden for having needs"], inGroupTerms: ["quiet bpd", "masking"] },
    { topic: "Emotional Dysregulation", category: "bpd", struggles: ["BPD rage out of nowhere", "feeling too much for others", "0 to 100 instantly"], inGroupTerms: ["dysregulation", "dysregulated"] },
    { topic: "Rejection Sensitivity", category: "bpd", struggles: ["interpreting a short reply as hatred", "physical sickness after minor criticism", "post-socializing spiral"], inGroupTerms: ["rsd", "rejection sensitivity"] },
    { topic: "Identity / Sense of Self", category: "bpd", struggles: ["feeling like a void when alone", "copying personalities to fit in", "not knowing your own values"], inGroupTerms: ["identity diffusion"] },
    { topic: "Chronic Emptiness", category: "bpd", struggles: ["boredom that feels unbearable", "numbing behaviors", "the feeling of nothing"], inGroupTerms: ["the emptiness", "chronic emptiness"] },
    { topic: "Digital Self-Harm", category: "bpd", struggles: ["checking blocks and old texts", "searching for things that trigger you", "stalking ex-FPs"], inGroupTerms: ["digital self-harm", "doom-stalking"] },
    { topic: "Emotional Permanence", category: "bpd", struggles: ["feeling unloved the second contact drops", "forgetting love when someone goes quiet", "needing constant proof they still care"], inGroupTerms: ["object permanence", "emotional permanence"] },
    { topic: "Attachment Hypervigilance", category: "bpd", struggles: ["scanning for tone shifts", "reading danger into tiny changes", "tracking closeness minute by minute"], inGroupTerms: null },
    { topic: "Shame Spirals", category: "bpd", struggles: ["one awkward moment ruins your whole day", "feeling fundamentally wrong after conflict", "wanting to disappear after small mistakes"], inGroupTerms: ["shame spiral"] },
    { topic: "Dissociation", category: "bpd", struggles: ["going numb mid-conflict", "feeling unreal when overwhelmed", "losing time after emotional spikes"], inGroupTerms: ["dissociating", "checking out"] },
    { topic: "Self-Sabotage", category: "bpd", struggles: ["picking fights to test love", "leaving before they can leave", "destroying the safe thing because it feels unfamiliar"], inGroupTerms: ["self-sabotage"] },
    { topic: "Favorite Person Withdrawal", category: "bpd", struggles: ["crashing when they feel distant", "feeling physically sick after less attention", "making one person your emotional oxygen"], inGroupTerms: ["fp withdrawal", "fp panic"] },
    { topic: "Post-Conflict Crash", category: "bpd", struggles: ["feeling dead after an argument", "reliving every word for hours", "not knowing how to come down after the spike"], inGroupTerms: null },
    { topic: "Overexplaining", category: "bpd", struggles: ["writing paragraphs to prevent abandonment", "trying to be perfectly understood", "panic when a message feels incomplete"], inGroupTerms: ["overexplaining", "the paragraph text"] },
    { topic: "TIPP", category: "dbt", struggles: ["panic hits too fast", "your body is already at 100", "you need your nervous system to come down first"], inGroupTerms: ["tipp"] },
    { topic: "Wise Mind", category: "dbt", struggles: ["emotion mind takes over", "logic disappears in the moment", "you need a calmer middle ground"], inGroupTerms: ["wise mind"] },
    { topic: "Opposite Action", category: "dbt", struggles: ["the urge is making everything worse", "you want to isolate or attack", "your action urge will deepen the spiral"], inGroupTerms: ["opposite action"] },
    { topic: "Check the Facts", category: "dbt", struggles: ["your story runs ahead of reality", "you fill in the blanks with danger", "you need to slow down the assumption"], inGroupTerms: ["check the facts"] },
    { topic: "Radical Acceptance", category: "dbt", struggles: ["fighting reality makes the pain louder", "you keep arguing with what already happened", "the suffering spikes when you resist it"], inGroupTerms: ["radical acceptance"] },
    { topic: "STOP Skill", category: "dbt", struggles: ["you react before you even realize it", "there is no pause between feeling and action", "you need a split second of space"], inGroupTerms: ["stop skill"] },
    { topic: "Self-Soothe", category: "dbt", struggles: ["your body feels impossible to live in", "everything is too loud after conflict", "you need sensory calm before thinking"], inGroupTerms: ["self-soothe"] },
    { topic: "PLEASE Skills", category: "dbt", struggles: ["everything gets worse when your body is fried", "sleep or food shifts the whole day", "you need nervous-system basics before insight"], inGroupTerms: ["please skills"] }
  ];
  const permissionV1Topics = [
    {
      shameWord: "too much",
      category: "external",
      weight: "heavy",
      relatedAccusations: [
        "you make everything about yourself",
        "you're exhausting to love",
        "you're draining",
        "you're overwhelming",
        "people need a break from you"
      ],
      mechanismHint: "nervous system has no middle volume \u2014 logs at threat-level or not at all",
      inGroupTerms: ["nervous system", "hypervigilance"]
    },
    {
      shameWord: "too intense",
      category: "external",
      weight: "light",
      relatedAccusations: [
        "you feel things too strongly",
        "you're extra",
        "tone it down",
        "why do you have to make it such a big deal"
      ],
      mechanismHint: "emotional intensity is amplitude, not malfunction \u2014 same system that dysregulates also loves at full volume",
      inGroupTerms: ["emotional dysregulation"]
    },
    {
      shameWord: "dramatic",
      category: "external",
      weight: "light",
      relatedAccusations: [
        "you're overreacting",
        "it wasn't that deep",
        "you're making it a whole thing",
        "stop being so dramatic"
      ],
      mechanismHint: "bpd brains register small relational shifts with the same urgency other brains reserve for actual danger",
      inGroupTerms: ["rejection sensitivity", "rsd"]
    },
    {
      shameWord: "attention-seeking",
      category: "external",
      weight: "heavy",
      relatedAccusations: [
        "you just want attention",
        "you're doing it for sympathy",
        "you're being manipulative",
        "stop trying to make us feel sorry for you"
      ],
      mechanismHint: "what looks like attention-seeking is usually connection-seeking in a system that panics at silence",
      inGroupTerms: ["abandonment", "emotional permanence"]
    },
    {
      shameWord: "manipulative",
      category: "external",
      weight: "heavy",
      relatedAccusations: [
        "you're playing games",
        "you did that on purpose",
        "you're trying to control me",
        "everything's a guilt trip"
      ],
      mechanismHint: "what reads as manipulation is usually a nervous system improvising survival moves without a manual",
      inGroupTerms: ["splitting", "abandonment panic"]
    },
    {
      shameWord: "exhausting",
      category: "external",
      weight: "heavy",
      relatedAccusations: [
        "you're so much work",
        "i can't keep up with you",
        "loving you is tiring",
        "you need too much"
      ],
      mechanismHint: "you're not exhausting \u2014 you're carrying a regulatory load other people don't see or have to do",
      inGroupTerms: null
    },
    {
      shameWord: "needy",
      category: "external",
      weight: "light",
      relatedAccusations: [
        "you need too much reassurance",
        "you're clingy",
        "you can't be alone",
        "why are you like this"
      ],
      mechanismHint: "emotional permanence \u2014 your brain doesn't hold evidence of love when contact stops, so it has to ask",
      inGroupTerms: ["emotional permanence", "fp"]
    },
    {
      shameWord: "oversensitive",
      category: "external",
      weight: "light",
      relatedAccusations: [
        "you can't take a joke",
        "you take everything personally",
        "grow thicker skin",
        "why are you crying"
      ],
      mechanismHint: "high sensitivity is a perception feature, not a defect \u2014 it's the system working faster than average",
      inGroupTerms: ["rejection sensitivity"]
    },
    {
      shameWord: "broken",
      category: "internal",
      weight: "heavy",
      relatedAccusations: [
        "something is fundamentally wrong with me",
        "i'm not built right",
        "everyone else got a manual i didn't",
        "i'm defective"
      ],
      mechanismHint: "you're not broken \u2014 you're an adaptation to an environment that required constant scanning",
      inGroupTerms: null
    },
    {
      shameWord: "crazy",
      category: "internal",
      weight: "heavy",
      relatedAccusations: [
        "my reactions don't make sense to me",
        "i'm losing it",
        "i can't trust my own feelings",
        "i feel insane"
      ],
      mechanismHint: "what looks like crazy from the inside is usually a threat-response running when no threat is visible",
      inGroupTerms: ["dysregulation"]
    },
    {
      shameWord: "unstable",
      category: "internal",
      weight: "heavy",
      relatedAccusations: [
        "my moods can't be trusted",
        "i'm a different person every week",
        "no one knows what they'll get from me",
        "i can't even count on myself"
      ],
      mechanismHint: "emotional weather is fast in bpd brains \u2014 instability is your thermostat working, not failing",
      inGroupTerms: ["splitting"]
    },
    {
      shameWord: "empty",
      category: "internal",
      weight: "heavy",
      relatedAccusations: [
        "there's nothing inside",
        "i'm just a mirror of whoever i'm with",
        "i don't know who i am",
        "i'm a void"
      ],
      mechanismHint: "what reads as emptiness is often a self built around others' nervous systems \u2014 you haven't been broken, you've been unanchored",
      inGroupTerms: ["identity disturbance"]
    },
    {
      shameWord: "obsessive",
      category: "internal",
      weight: "light",
      relatedAccusations: [
        "i can't stop thinking about them",
        "i'm checking their stuff again",
        "my brain won't let me rest",
        "why am i like this about one person"
      ],
      mechanismHint: "obsession is attachment without the resting state \u2014 your brain is trying to maintain a bond it can't internally hold",
      inGroupTerms: ["fp", "favorite person"]
    },
    {
      shameWord: "irrational",
      category: "internal",
      weight: "light",
      relatedAccusations: [
        "my reactions don't match reality",
        "i know it's not logical but i feel it",
        "i argue with myself all day",
        "i can't reason my way out of this"
      ],
      mechanismHint: "feelings arrive before cognition in bpd wiring \u2014 you're not irrational, you're processing emotionally before analytically",
      inGroupTerms: ["emotion mind", "wise mind"]
    },
    {
      shameWord: "pathetic",
      category: "internal",
      weight: "heavy",
      relatedAccusations: [
        "i shouldn't need this much",
        "grown adults don't feel this way",
        "this is embarrassing",
        "why can't i just be normal"
      ],
      mechanismHint: "what you're calling pathetic is a younger version of you still asking to be seen \u2014 that's not weakness, that's a part of you that needs what it didn't get",
      inGroupTerms: null
    },
    {
      shameWord: "a burden",
      category: "internal",
      weight: "heavy",
      relatedAccusations: [
        "people would be better off without me around",
        "i take up too much space",
        "my needs are too much to ask for",
        "i'm dragging everyone down"
      ],
      mechanismHint: "the 'burden' narrative is the shame-spiral's survival strategy \u2014 it gets you to shrink so you can't be rejected",
      inGroupTerms: null
    }
  ];
  const selectedTopic = needsViralTopic ? viralTopics.find((t) => t.topic.toLowerCase() === topic?.toLowerCase()) || viralTopics[Math.floor(Math.random() * viralTopics.length)] || viralTopics[0] : null;
  const selectedWeirdHackV2Topic = slideType === "weird_hack_v2" ? pickWeirdHackV2Topic(weirdHackV2Topics) : null;
  const selectedPermissionV1Topic = slideType === "permission_v1" ? pickPermissionV1Topic(permissionV1Topics) : null;
  const topicContext = selectedTopic || viralTopics[0];
  if (selectedTopic) {
    console.log(`[Native Slides - DBT] Selected topic: ${selectedTopic.topic}`);
  } else if (slideType === "weird_hack_v2") {
    console.log(`[Native Slides - DBT] Weird hack v2 selected topic: ${selectedWeirdHackV2Topic?.topic || "unknown"}`);
    console.log(`[Native Slides - DBT] Weird hack v2 recent topics: ${readWeirdHackV2RecentTopics().join(", ")}`);
  } else if (slideType === "permission_v1") {
    console.log(`[Native Slides - DBT] Permission v1 selected topic: ${selectedPermissionV1Topic?.shameWord || "unknown"}`);
    console.log(`[Native Slides - DBT] Permission v1 recent topics: ${readPermissionV1RecentTopics().join(", ")}`);
  } else {
    console.log("[Native Slides - DBT] Story telling flow: skipping viral topic selection");
  }
  const formatSlide1Hook = (rawHook, fallbackProblem) => {
    const source = String(rawHook || "").trim();
    const useDbtPrefix = /^weird\s+dbt\s+hacks/i.test(source);
    const prefix = useDbtPrefix ? "Weird DBT hacks from my therapist for" : "Weird BPD hacks from my therapist for";
    let problem = source.replace(/^slide\s*1\s*:\s*/i, "").replace(/^["']|["']$/g, "").replace(/^weird\s+(dbt|bpd)\s+hacks\s+from\s+my\s+therapist\s+for\s*/i, "").replace(/\(\s*that\s+actually\s+work\s*\)\s*$/i, "").trim();
    if (!problem)
      problem = fallbackProblem;
    return `${prefix} ${problem}

(that ACTUALLY work)`;
  };
  const formatWeirdHackV2Slide1Hook = (rawHook, fallbackProblem, _category = "bpd") => {
    const cleaned = String(rawHook || "").replace(/^slide\s*1\s*:\s*/i, "").trim().toLowerCase();
    const blocks = cleaned.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    let block1 = (blocks[0] || "").trim();
    let block2 = (blocks[1] || "").trim();
    const startsWithNotMe = /^not\s+me\s+realizing/i.test(block1);
    const startsWithWdym = /^wdym\b/i.test(block1);
    if (!block2) {
      if (startsWithNotMe) {
        const match = block1.match(/^([\s\S]*?)\s*(anyway[\s\S]*)$/i);
        if (match) {
          block1 = (match[1] || "").trim();
          block2 = (match[2] || "").trim();
        }
      }
      if (startsWithWdym && !block2) {
        const lines = block1.split(/\n/).map((l) => l.trim()).filter(Boolean);
        const reactionIdx = lines.findIndex((l, i) => i > 0 && /^like\b/i.test(l));
        if (reactionIdx > 0) {
          block1 = lines.slice(0, reactionIdx).join(`
`);
          block2 = lines.slice(reactionIdx).join(`
`);
        }
      }
    }
    if (!block1) {
      block1 = `not me realizing i've been stuck in the ${fallbackProblem} loop
for literally years`;
    }
    if (!block2) {
      if (startsWithWdym) {
        block2 = `like that's not a coping strategy
that's the symptom`;
      } else {
        block2 = `anyway here's what i'm doing about it`;
      }
    }
    block1 = block1.replace(/\n\s*\n/g, `
`);
    block2 = block2.replace(/\n\s*\n/g, `
`);
    return `${block1}

${block2}`;
  };
  const detectDbtSkill = (text) => {
    const normalized = String(text || "").toLowerCase();
    if (normalized.includes("wise mind"))
      return "wise_mind";
    if (/\bstop\b/.test(normalized))
      return "stop";
    if (normalized.includes("tipp"))
      return "tipp";
    if (normalized.includes("opposite action"))
      return "opposite_action";
    if (normalized.includes("radical acceptance"))
      return "radical_acceptance";
    if (normalized.includes("check the facts"))
      return "check_the_facts";
    if (normalized.includes("self-soothe") || normalized.includes("self soothe"))
      return "self_soothe";
    if (/\bplease\b/.test(normalized))
      return "please";
    return null;
  };
  const skillSlideTemplates = {
    wise_mind: `Wise Mind check-in

what am I feeling?
what do I need right now?`,
    stop: `Use STOP

pause first.
step back.
choose your next move.`,
    tipp: `Try TIPP

cold water.
slow exhale.
let your body come down first.`,
    opposite_action: `Use Opposite Action

urge says hide?
do one small thing anyway.`,
    radical_acceptance: `Try Radical Acceptance

this hurts.
it's real.
fighting it harder won't help.`,
    check_the_facts: `Check the facts

what actually happened?
what story is my panic adding?`,
    self_soothe: `Self-soothe first

soft light.
music.
a texture that calms your body.`,
    please: `Use PLEASE

eat.
rest.
notice what your body needs.`
  };
  const formatSlide5Skill = (rawSlide) => {
    const cleaned = String(rawSlide || "").replace(/^slide\s*5\s*:\s*/i, "").replace(/^dbt\s*skill\s*:\s*/i, "").replace(/^skill\s*:\s*/i, "").replace(/\s+/g, " ").trim();
    const detectedSkill = detectDbtSkill(cleaned);
    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    const sentenceCount = cleaned.split(/[.!?]/).map((part) => part.trim()).filter(Boolean).length;
    const feelsTooDense = wordCount > 18 || cleaned.includes(":") || cleaned.includes("?") || sentenceCount > 2;
    if (detectedSkill && feelsTooDense) {
      return skillSlideTemplates[detectedSkill];
    }
    return cleaned;
  };
  const weirdHackV2DbtSkillFallbacks = {
    tipp: `1. Try TIPP first

cold water first, then paced breathing
bypasses panic before thoughts take over.`,
    "wise mind": `1. Wise Mind check-in

"what are the facts, what am I feeling?"
replaces pure emotion mind with both truths.`,
    "opposite action": `1. Use Opposite Action

urge says isolate? text one safe person
replaces the action urge feeding the spiral.`,
    "check the facts": `1. Check the Facts

"what happened, and what did I add?"
replaces assumptions with reality-testing.`,
    "radical acceptance": `1. Radical Acceptance

"i hate this, and it's still real"
replaces fighting reality that intensifies pain.`,
    "stop skill": `1. Use STOP

freeze the reply. step back before acting
bypasses impulsive action before regret starts.`,
    "self-soothe": `1. Self-Soothe first

soft blanket, cold drink, lamp on low
replaces overload with sensory regulation.`,
    "please skills": `1. Check PLEASE first

ask if i ate, slept, and slowed down
replaces shame with body-based reality.`
  };
  const normalizeSkillKey = (value) => String(value || "").trim().toLowerCase();
  const containsNamedDbtSkill = (value) => {
    const normalized = normalizeSkillKey(value);
    return [
      "wise mind",
      "stop",
      "tipp",
      "opposite action",
      "radical acceptance",
      "check the facts",
      "self-soothe",
      "self soothe",
      "please"
    ].some((skill) => normalized.includes(skill));
  };
  const getWeirdHackV2DbtSkillFallbackSlide = (topicName) => {
    const normalizedTopic = normalizeSkillKey(topicName);
    return weirdHackV2DbtSkillFallbacks[normalizedTopic] || `1. Try ${topicName}

use ${topicName} before the spiral peaks
replaces guessing with an actual DBT skill.`;
  };
  const formatThreeTipsSlide = (rawSlide, slideIndex) => {
    const cleaned = String(rawSlide || "").replace(/^slide\s*\d+\s*:\s*/i, "").trim();
    if (!cleaned)
      return cleaned;
    if (slideIndex === 0) {
      return cleaned.replace(/\n+\s*(\()/, `

$1`);
    }
    if (slideIndex >= 1 && slideIndex <= 3) {
      const lines = cleaned.split(`
`).map((line) => line.trim()).filter(Boolean);
      if (lines.length >= 2) {
        return lines.join(`

`);
      }
    }
    if (slideIndex === 4) {
      const lines = cleaned.split(`
`).map((line) => line.trim()).filter(Boolean);
      if (lines.length >= 2) {
        return lines.join(`

`);
      }
    }
    return cleaned;
  };
  const formatWeirdHackV2Slide = (rawSlide, slideIndex) => {
    const cleaned = String(rawSlide || "").replace(/^slide\s*\d+\s*:\s*/i, "").trim();
    if (!cleaned)
      return cleaned;
    const normalizeLines = (value) => String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (slideIndex === 0) {
      const parts = cleaned.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}

${parts.slice(1).join(" ")}`;
      }
      const lines = normalizeLines(cleaned);
      if (lines.length >= 2) {
        return `${lines[0]}

${lines.slice(1).join(" ")}`;
      }
      return cleaned;
    }
    if (slideIndex === 1) {
      const flattened = cleaned.replace(/\n\s*\n/g, `
`);
      const lines = normalizeLines(flattened);
      return lines.join(`
`);
    }
    if (slideIndex >= 2 && slideIndex <= 4) {
      const blocks = cleaned.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
      if (blocks.length >= 3) {
        const label = blocks[0];
        const example = normalizeLines(blocks[1]).slice(0, 2).join(`
`);
        const mechanism = normalizeLines(blocks.slice(2).join(`
`)).join(" ");
        return `${label}

${example}

${mechanism}`;
      }
      if (blocks.length === 2) {
        const label = blocks[0];
        const bodyLines = normalizeLines(blocks[1]);
        if (bodyLines.length >= 3) {
          const example = bodyLines.slice(0, bodyLines.length - 1).join(`
`);
          const mechanism = bodyLines[bodyLines.length - 1];
          return `${label}

${example}

${mechanism}`;
        }
        if (bodyLines.length === 2) {
          return `${label}

${bodyLines[0]}

${bodyLines[1]}`;
        }
        return `${label}

${bodyLines.join(`
`)}`;
      }
      const flatLines = normalizeLines(cleaned);
      if (flatLines.length >= 3 && /^\d+\./.test(flatLines[0])) {
        const label = flatLines[0];
        const rest = flatLines.slice(1);
        const mechanism = rest[rest.length - 1];
        const example = rest.slice(0, -1).join(`
`);
        return `${label}

${example}

${mechanism}`;
      }
      return cleaned;
    }
    if (slideIndex === 5) {
      const flattened = cleaned.replace(/\n\s*\n/g, `
`);
      return normalizeLines(flattened).join(`
`);
    }
    if (slideIndex === 6) {
      const flattened = cleaned.replace(/\n\s*\n/g, `
`);
      return normalizeLines(flattened).join(`
`);
    }
    return cleaned;
  };
  const normalizeWeirdHackV2Slides = (rawSlides) => {
    const items = rawSlides.map((slide) => String(slide || "").replace(/^slide\s*\d+\s*:\s*/i, "").trim()).filter(Boolean);
    if (items.length <= 7)
      return items;
    const isHook = (value) => {
      const firstLine = value.split(/\n/)[0] || "";
      return /^not\s+me\s+realizing/i.test(firstLine) || /^wdym\b/i.test(firstLine);
    };
    const isTipLabel = (value, tipNumber) => {
      const firstLine = value.split(/\n/)[0] || "";
      const match = firstLine.match(/^(\d+)\.\s+/);
      if (!match)
        return false;
      return tipNumber ? Number(match[1]) === tipNumber : true;
    };
    const isPatternValidation = (value) => /^you know the cycle/i.test(value);
    const normalized = [];
    let cursor = 0;
    const hookIndex = items.findIndex(isHook);
    if (hookIndex !== -1) {
      normalized.push(items[hookIndex]);
      cursor = hookIndex + 1;
    } else if (items[cursor]) {
      normalized.push(items[cursor]);
      cursor += 1;
    }
    const patternIndex = items.findIndex((item, index) => index >= cursor && isPatternValidation(item));
    if (patternIndex !== -1) {
      normalized.push(items[patternIndex]);
      cursor = patternIndex + 1;
    } else if (items[cursor]) {
      normalized.push(items[cursor]);
      cursor += 1;
    }
    for (let tipNumber = 1;tipNumber <= 3 && cursor < items.length; tipNumber++) {
      const foundIndex = items.findIndex((item, index) => index >= cursor && isTipLabel(item, tipNumber));
      if (foundIndex !== -1) {
        normalized.push(items[foundIndex]);
        cursor = foundIndex + 1;
      } else if (items[cursor]) {
        normalized.push(items[cursor]);
        cursor += 1;
      }
    }
    const remaining = items.slice(cursor);
    normalized.push(...remaining.slice(0, 2));
    return normalized.slice(0, 7).filter(Boolean);
  };
  const formatPermissionV1Slide1Hook = (rawHook, shameWord, weight) => {
    const cleaned = String(rawHook || "").replace(/^slide\s*1\s*:\s*/i, "").trim().toLowerCase();
    const blocks = cleaned.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const defaultCloser = weight === "light" ? "this is the one." : "stay.";
    const candidateCloser = (blocks[1] || blocks[0] || "").trim().toLowerCase();
    const closer = candidateCloser === "stay." || candidateCloser === "this is the one." ? candidateCloser : "stay.";
    const normalizedShameWord = String(shameWord || "").trim().toLowerCase().replace(/^"+|"+$/g, "");
    const block1 = `if you have bpd
and you keep calling yourself "${normalizedShameWord}"`;
    return `${block1}

${closer || defaultCloser}`;
  };
  const formatPermissionV1Slide = (rawSlide) => {
    return String(rawSlide || "").replace(/^slide\s*\d+\s*:\s*/i, "").trim().toLowerCase();
  };
  const normalizePermissionV1Slides = (rawSlides, topic2) => {
    const items = rawSlides.map((slide) => String(slide || "").replace(/^slide\s*\d+\s*:\s*/i, "").trim()).filter(Boolean);
    const hookIndex = items.findIndex((item) => /^if you have bpd/i.test(item.split(/\n/)[0] || ""));
    const ordered = hookIndex > 0 ? [items[hookIndex], ...items.slice(hookIndex + 1), ...items.slice(0, hookIndex)] : [...items];
    const normalized = ordered.slice(0, 7);
    while (normalized.length < 7) {
      normalized.push("");
    }
    const formatted = normalized.map((slide, index) => {
      if (index === 0) {
        return formatPermissionV1Slide1Hook(slide, topic2.shameWord, topic2.weight);
      }
      return formatPermissionV1Slide(slide);
    });
    if (formatted[3] && !formatted[3].includes(`"${topic2.shameWord.toLowerCase()}"`)) {
      const remaining = formatted[3].split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !line.includes(topic2.shameWord.toLowerCase()));
      formatted[3] = [`you're not "${topic2.shameWord.toLowerCase()}".`, ...remaining].slice(0, 3).join(`
`);
    }
    return [...formatted, PERMISSION_V1_FIXED_SLIDE8];
  };
  const systemPrompt = `You are an expert DBT/BPD content creator on TikTok, that knows exactly what goes viral. You speak as a supportive, slightly older mentor figure who has been through the absolute trenches of BPD and finished DBT. Your vibe is supportive, validating, and helpful, but grounded in actual clinical DBT skills.

CORE STYLE GUIDELINES:
- **Perspective**: Direct second-person ("you", "your").
- **Tone**: Gentle, supportive, and deeply validating. Use terms like "I've been there," "it's so real," or "gentle reminder" but don't overdo it.
- **Reading Level**: 8th-grade. Simple, punchy, no academic jargon.
- **Gen-Z Touch**: Use a language that feels contemporary and relatable (e.g., "vibes," "real," "lowkey") but stay helpful and serious about the skills. **STRICTLY AVOID** using words like "bestie", "sis", or "queen".
- **Visuals**: Use bullet points for clarity. Focus on "THE REAL TEA" or "WHY THIS HELPS" instead of "SHOCKING TRUTHS."
- **NO MIRRORS**: Strictly avoid any mention of mirrors or looking at one's reflection.
- **Emojis**: Use emojis EXTREMELY sparingly. Maximum 1-2 across the entire 6-slide series. **NEVER** use emojis on Slide 1 (the hook).
- **Phrases**: Use "I know this is hard," "here's what actually helps," "let's try this together," "it's okay to feel this way."

NEVER use the word "bestie" or overly juvenile slang. Authenticity comes from emotional truth, not forced slang.

CONTENT STRUCTURE:
- You will generate a 6-slide series.
- **Max Words per Slide**: Strictly limit each slide to a maximum of 30 words.
- **Slide 1**: ONLY contain the hook. It MUST follow one of these two formats:
  "Weird DBT hacks from my therapist for [PROBLEM]

(that ACTUALLY work)"
  OR
  "Weird BPD hacks from my therapist for [PROBLEM]

(that ACTUALLY work)".
  - **The [PROBLEM]** must be a generic, immediately identifiable label (e.g., "splitting in public", "FP dynamics", "abandonment panic"). Avoid long, specific scenarios in the hook. People must identify themselves in 3 seconds.
- **Slides 2-3**: Empathy & Naming. Deeply validate the struggle. Describe how it feels physically and emotionally. Use "I've been there" energy. Name the experience so the viewer feels understood.
- **Slide 4 (Punch Slide)**: EXACTLY two sentences. Each sentence max 5 words. It must nail the core pattern behind the topic (e.g., "it's not them.
it's the pattern."). Must be directly related to the topic and feel like the emotional turning point.
- **Slide 5**: Actual DBT Skill. Provide 1 slide that uses a real DBT skill (e.g. TIPP, Opposite Action, STOP, Radical Acceptance, Wise Mind). Keep it visually short and clean: max 18 words, 2-4 very short lines, no long explanations, no quoted self-talk, no prefixes like "DBT skill:".
- **Slide 6 (App Slide)**: Must be EXACTLY this text, unchanged:
  "my therapist recommended DBT-Mind (free) \u2014 that's where the skill finally clicked for me."
MANDATORY BRANDING:
Slide 6 is always included as described above.`;
  const userPrompt = `Generate a new 6-slide series for DBT-Mind focusing on this specific struggle:
Topic: ${topicContext.topic}
Struggles: ${topicContext.struggles.join(", ")}

1. Slide 1 MUST start with "Weird DBT hacks from my therapist for" or "Weird BPD hacks from my therapist for".
   The "(that ACTUALLY work)" part must be on a new paragraph after one blank line.
2. Use the Topic (${topicContext.topic}) or a very punchy summary as the [PROBLEM] in the hook so it's immediately relatable.
3. Use the specific Struggles (${topicContext.struggles.join(", ")}) to build the validation in Slides 2-3.
4. Slide 4 must be EXACTLY two sentences and each sentence max 5 words.
   It must be a punchy statement that nails the core pattern behind the topic (e.g., "it's not them.
it's the pattern.").
5. Ensure the tone is helpful and supportive mentor-like. Focus on maximum value.
6. Dedicate exactly 1 slide (5) to a clinical DBT skill.
7. Slide 6 must be exactly: "my therapist recommended DBT-Mind (free) \u2014 that's where the skill finally clicked for me."
8. Use emojis EXTREMELY sparingly (max 1-2 per series, none on Slide 1).

Return a JSON object with a "slides" key containing an array of 6 strings.`;
  const weirdHackV2SystemPrompt = `You are an expert DBT/BPD content creator for TikTok who writes as a peer \u2014 someone who has personally been through BPD and completed DBT. Not a clinician. A friend texting what actually helped her. Warm, slightly exhausted, real, slightly self-deprecating.

## YOUR TASK
Generate a 7-slide viral TikTok slideshow optimized for saves and comments. The structure is designed for carousel-specific algorithmic signals: a hook that stops the scroll with a specific reframe, a pattern-validation slide that commits viewers to the full carousel, three hacks with dense dwell-time copy, a mechanism reframe that pays off the hook and drives saves, and a permission-landing slide.

An 8th slide (comment-driver) is appended automatically after generation \u2014 do NOT generate it.

The app is NEVER mentioned on any slide. The app lives only in the pinned comment. Do not reference DBT-Mind, any app, any product, or any tool anywhere in the slides.

## VOICE RULES (STRICT)
- Lowercase throughout, always
- No emojis anywhere
- Fragments over full sentences when possible
- Underplay emotional intensity \u2014 flat, deadpan, slightly tired voice. Gen-Z BPD creators do NOT write "before it swallows you" or "before it destroys you." That's content-marketer voice. Write like you're too exhausted to be dramatic about it.
- No phrases like "weird hacks", "that actually work", "things that changed my life". These are 2023 listicle frames and signal branded content. Avoid them.
- Hyper-specific lived-experience language wins over universal emotional language. "the 4-minute reply gap" > "when they take too long". "the bargaining texts you almost sent" > "when you want to text them".

## STEP 1 \u2014 USE THE SELECTED TOPIC
The topic is already selected for you in the user message. Use that exact topic and its struggles. Do not switch topics. Frame every slide around the specific cycle, pattern, or loop that the topic represents.

## STEP 2 \u2014 PICK A HOOK FORMULA AND A REFRAME PHRASE

Before writing any slides, pick ONE hook formula (A or B below) and pick ONE specific reframe phrase for the carousel. The reframe phrase is a short, counter-intuitive description of the pattern the viewer is caught in. Examples of reframe phrases: "treating one person like a nervous system", "dating the feeling of someone texting back in 4 minutes", "mistaking panic for chemistry", "confusing familiarity with safety", "running 20-year-old survival code". The reframe phrase MUST appear in the hook AND be paid off directly in slide 6 (mechanism reframe). This creates a hook-to-payoff loop that holds the carousel together.

## STEP 3 \u2014 GENERATE 7 SLIDES

### Slide 1 \u2014 Hook (pick ONE formula)

**Formula A \u2014 "not me realizing" (confession frame):**
Two blocks separated by \\n\\n.

Block 1 (3\u20134 lines joined by \\n): "not me realizing i've been [behavior]\\n[specific reframe phrase]\\n[optional clarifying fragment]"

Block 2: "anyway here's what i'm doing about it" (or close variant: "anyway. here's what i changed.", "anyway lol here's the fix")

Examples:
- "not me realizing i've been treating one person\\nlike a nervous system\\ninstead of dating them\\n\\nanyway here's what i'm doing about it"
- "not me realizing i've been mistaking\\nthe 3am panic for chemistry\\nfor literally 6 years\\n\\nanyway. here's what i changed."

Rules for Formula A:
- "not me realizing" is mandatory in block 1 line 1
- Block 1 must contain the reframe phrase (you picked in step 2)
- Block 1 total: max 18 words across all lines
- Block 2 must be short, in-the-moment, NOT a promise of value. No "3 hacks", no "things that helped", no "what actually works"

**Formula B \u2014 "wdym" (self-disbelief frame):**
Two blocks separated by \\n\\n.

Block 1 (3\u20134 lines joined by \\n): "wdym i've been [behavior in past continuous or present perfect]\\n[specific detail]\\n[optional third line]"

Block 2 (2 lines joined by \\n): A self-reacting fragment that lands the reframe. E.g. "like that's not a person\\nthat's a stimulus response" or "like ma'am that's a symptom\\nnot a love story"

Examples:
- "wdym i've been dating the feeling\\nof someone texting back\\nwithin 4 minutes\\n\\nlike that's not a person\\nthat's a stimulus response"
- "wdym i thought the chest-tight panic\\nmeant we had something special\\n\\nlike ma'am that's a symptom\\nnot a love story"

Rules for Formula B:
- "wdym" is mandatory in block 1 line 1 (do not spell it out as "what do you mean")
- Block 1 must describe a specific behavior or feeling, not abstract emotion
- Block 2 must be a reaction fragment that makes the reframe click \u2014 "like that's not X that's Y" or "like ma'am that's X not Y" are the core templates
- Block 1 + Block 2 combined: max 28 words

**Hook rules applied to BOTH formulas:**
- First person, past continuous or present perfect ("i've been", "i was")
- Must filter for people who actually experience the pattern through hyper-specific behavioral detail
- No emojis
- No questions directed at the viewer ("are you doing this?" is banned \u2014 this is a confession, not a prompt)
- No "3 hacks" / "3 things" / "3 tips" language anywhere in the hook

**In-group vocabulary rule (IMPORTANT):**
If the user message provides "In-group terms" for the topic, you MUST use at least one of them naturally inside the hook (slide 1). This is a filtering mechanism \u2014 people with BPD recognize these words instantly and stop scrolling. People without BPD scroll past.

RULES for in-group term usage:
- Use the term as a NATURAL PART of the behavioral description, NOT as a label or definition
- The term must appear INSIDE Formula A's block 1 or Formula B's block 1, not as a prefix or header
- Do not define the term, do not explain it, do not set it off with quotes
- Use one term per hook \u2014 do not stack multiple in-group terms

GOOD examples (term used naturally inside the behavioral sentence):
- "not me realizing i've been splitting on my fp\\nevery time she takes 40 minutes to reply"
- "wdym i've been calling fp withdrawal\\na bad day at work"
- "not me realizing i've been dating my rsd\\nnot the actual person"
- "wdym i've been doom-stalking an ex\\nlike that's a symptom not a hobby"

BAD examples (term used as a label, definition, or prefix):
- "splitting: when you turn on someone you love" \u2190 label/definition
- "fp dynamics, a quick post" \u2190 meta-framing
- "here's what splitting actually means" \u2190 educational voice, breaks the confession frame
- "today we're talking about object permanence" \u2190 content-marketer voice

If the user message says "In-group terms: (none \u2014 describe behaviorally)", do NOT invent jargon. Describe the pattern in plain behavioral language, the way you would if you were venting about it to a friend.

### Slide 2 \u2014 Pattern Validation ("you know the cycle")
One block. A 4\u20136 line list that names the cycle the viewer lives inside.

Line 1: "you know the cycle:"
Lines 2\u20135: Each line names one beat in the cycle using ultra-specific language. Use "the [noun phrase]" structure \u2014 "the slow reply that ruins your whole day", "the bargaining texts you almost sent", "the physical chest ache when they seem distant", "the relief when they respond", "the countdown to the next drop".
Last 1\u20132 lines: Close the loop by implying the cycle repeats.

Rules:
- Every line must read like you're quoting the viewer's diary \u2014 hyper-specific, no generalizations
- "the" before each beat creates parallel structure \u2014 keep this consistent
- No emojis
- Max 40 words total
- Single block, single \\n between lines, no \\n\\n inside this slide

### Slides 3, 4, 5 \u2014 Three Numbered Hacks
Each slide has exactly THREE blocks separated by \\n\\n:

Block 1 (the label): "[number]. [short technique name or action phrase]" \u2014 max 8 words, stands alone. Numbering is 1, 2, 3 across slides 3/4/5.
Block 2 (the example): A concrete example showing the hack in use. Use quote marks if it's something said out loud. Max 20 words. May span 2 lines joined by \\n.
Block 3 (the mechanism): One sentence explaining why it works for BPD wiring. References what it bypasses, replaces, or interrupts. Max 14 words. End on a sharable, parallel-construction line when possible (e.g. "idealization will rewrite history. the note won't.").

The three hacks cover three different intervention types in order:
- Slide 3 / Hack 1: A language or cognitive reframe (something to say or think differently)
- Slide 4 / Hack 2: A timing or behavioral rule (when to act, or when to wait \u2014 a hard rule with a number or duration)
- Slide 5 / Hack 3: An evidence or tracking technique (something to record, screenshot, or save)

Rules:
- Real DBT-informed or BPD-specific techniques, not generic self-help
- Block 2 should feel like something you'd actually do or say at 2am
- No emojis, max 40 words per slide
- If the topic category is DBT, at least one of slides 3\u20135 must explicitly name the real DBT skill (TIPP, Wise Mind, STOP, Check the Facts, Opposite Action, Radical Acceptance, Self-Soothe, or PLEASE) in Block 1

### Slide 6 \u2014 The Mechanism Reframe (pays off the hook)
This is the dense dwell-time slide \u2014 it should take time to read, which drives the save-to-read-later behavior.

One block. 4\u20136 short lines joined by \\n.

Structure:
Line 1: A shame-removing opener ("none of this is about willpower", "you're not broken for this")
Lines 2\u20134: Name the actual neurological or psychological mechanism, AND use the exact reframe phrase from the hook. This is the payoff \u2014 if the hook said "treating one person like a nervous system", this slide has to explain what that actually means.
Last 1\u20132 lines: Close on a quiet reframe. "you're running very old code" / "that's not love wiring, that's survival wiring"

Rules:
- The reframe phrase from the hook MUST appear here in the same or closely related wording
- Must remove shame, not add motivational energy
- No app mention, no product mention
- No emojis
- Max 45 words
- Lowercase

### Slide 7 \u2014 Permission Landing
The soft landing. Removes pressure, grants permission.

One block. 3\u20135 short lines joined by \\n.

Structure:
Line 1: A permission statement ("you don't need more discipline", "you were never taught this")
Lines 2\u20133: What you actually need, described as a capability or behavior \u2014 not a product
Line 4 (optional): A closing reframe ("you're learning now" / "this is the unlearning")

Rules:
- NEVER mention an app, a tool, a product, a download, or a brand
- Describe what's needed as a capability, not a thing to buy
- No emojis
- Max 35 words
- Lowercase

## OUTPUT FORMAT
Return strictly as JSON \u2014 no markdown, no explanation, no preamble:
{"slides": ["slide1_text", "slide2_text", "slide3_text", "slide4_text", "slide5_text", "slide6_text", "slide7_text"]}

FORMATTING RULES FOR JSON VALUES:
- Use \\n for a single line break (lines within the same block)
- Use \\n\\n for a blank line (separating blocks within a slide)
- Slide 1 has TWO blocks separated by \\n\\n
- Slides 3, 4, 5 each have THREE blocks separated by \\n\\n (label / example / mechanism)
- Slides 2, 6, 7 are each a single block with internal \\n line breaks only
- Output exactly 7 slides. Slide 8 is appended automatically after generation.`;
  const weirdHackV2InGroupTermsLine = (() => {
    const terms = selectedWeirdHackV2Topic?.inGroupTerms;
    if (Array.isArray(terms) && terms.length > 0) {
      return `In-group terms: ${terms.join(", ")} (use at least one naturally inside the hook \u2014 never as a label)`;
    }
    return `In-group terms: (none \u2014 describe behaviorally, do not invent jargon)`;
  })();
  const weirdHackV2UserPrompt = `Use this exact topic for the viral 7-slide slideshow:
Topic: ${selectedWeirdHackV2Topic?.topic || "Rejection Sensitivity"}
Topic category: ${selectedWeirdHackV2Topic?.category === "dbt" ? "DBT" : "BPD"}
Struggles: ${(selectedWeirdHackV2Topic?.struggles || ["interpreting a short reply as hatred"]).join(", ")}
${weirdHackV2InGroupTermsLine}

Creative direction:
- pick ONE hook formula: Formula A ("not me realizing...") OR Formula B ("wdym...")
- if in-group terms are provided above, weave one of them naturally into the hook (see system prompt for GOOD vs BAD usage)
- pick ONE specific reframe phrase that describes the pattern in a counter-intuitive way (e.g. "treating one person like a nervous system", "dating the feeling of a 4-minute reply")
- the reframe phrase MUST appear in the hook AND be paid off in slide 6's mechanism reframe \u2014 this is a hook-to-payoff loop that holds the carousel together
- slide 2 must feel like you're quoting the viewer's diary \u2014 hyper-specific, parallel-structure lived-experience beats
- the three hacks must be genuinely unconventional \u2014 not "take deep breaths", not "journal your feelings"
- if the topic is DBT, at least one of slides 3\u20135 must name the actual DBT skill in block 1
- slide 6 must name a real neurological or psychological mechanism AND echo the hook's reframe phrase
- slide 7 must never mention an app, tool, product, or brand \u2014 describe the capability only
- voice is deadpan, slightly exhausted, self-deprecating. never dramatic ("before it destroys you"), never content-marketer ("things that actually work")
- lowercase throughout, no emojis
- do NOT generate slide 8 \u2014 it is appended automatically

Return the slideshow now as strict JSON with exactly 7 slides.`;
  const permissionV1SystemPrompt = `You are an expert DBT/BPD content creator for TikTok who writes like a warm, direct friend saying something they've been wanting to tell another person with BPD for a long time.

## YOUR TASK
Generate a fixed-structure 7-slide TikTok slideshow optimized for shares and follows. The emotional arc is shame-reframe plus permission-giving. The post should feel warm, relieving, specific, and psychologically precise.

Slide 8 is appended automatically by code. Do NOT generate slide 8. Generate exactly 7 slides.

The app is NEVER mentioned on any slide. Do not reference DBT-Mind, any app, any product, or any tool anywhere in the slides.

## VOICE RULES (STRICT)
- lowercase throughout
- no emojis anywhere
- warm-but-direct truth-telling
- conversational, fragment-friendly, emotionally literate
- same lowercase Gen-Z foundation as weird_hack_v2, but less deadpan and more caring
- write like a friend telling someone the truth gently, not like a therapist or content marketer
- do not use generic affirmation language like "you're so strong" or "you're enough" unless grounded in a concrete mechanism

## GLOBAL SLIDE RULES
- every slide must stay under 40 words
- use \\n for line breaks inside a single block
- use \\n\\n only when a slide has multiple blocks
- slide 1 has exactly 2 blocks separated by \\n\\n
- slides 2 through 7 are each a single block only
- no app mention on any slide
- no emojis on any slide

## USE THE SELECTED TOPIC
The user message gives you:
- shame-word
- weight
- related accusations
- mechanism hint
- optional in-group terms

Use that exact shame-word. Do not replace it with a different one.

## SLIDE-BY-SLIDE STRUCTURE

### Slide 1 \u2014 Hook (2 blocks)
This hook formula is LOCKED.

Block 1 must be exactly this structure:
if you have bpd
and you keep calling yourself "[SHAME_WORD]"

Block 2 must be exactly ONE of these:
- stay.
- this is the one.

Closer rule:
- use "stay." for heavy topics
- use "this is the one." for light topics
- neither closer is default; choose based on topic weight

Rules:
- the shame-word MUST appear in actual quotation marks
- keep block 1 to max 12 words
- keep block 2 to max 4 words
- separate the two blocks with \\n\\n

### Slide 2 \u2014 The Shared Lie
One block. 3-4 lines joined by \\n.

Purpose:
- name the specific accusations or internalized beliefs the viewer has absorbed using the shame-word
- make them feel the weight of the word before the post takes it away

Structure:
- line 1 establishes the frame: "you've been told..." / "everyone keeps saying..." / "it's been called..."
- lines 2-4 list specific accusations, phrases, or beliefs

Rules:
- use collective pronouns or direct "you've been told..." framing
- use hyper-specific accusations people with BPD actually hear
- max 40 words total

### Slide 3 \u2014 The Mechanism
One block. 3-5 short lines joined by \\n.

Purpose:
- reveal the actual neurological or psychological mechanism underneath the shame-word
- this must feel like information, not motivation

Structure:
- start with a reframing pivot: "but here's what's actually happening" / "what's actually underneath this is..." / "here's the thing no one told you"
- explain the mechanism using accessible words and a concrete metaphor or system

Rules:
- use concrete mechanism language like nervous system, brain chemistry, survival wiring, detection system
- each line max 8 words
- max 40 words total

### Slide 4 \u2014 What You Are NOT
One block. 2-3 lines joined by \\n.

Purpose:
- deflate the shame-word directly

Structure:
- use parallel construction: "you're not [shame-word]. you're [precise reframe]."

Rules:
- MUST echo the shame-word from slide 1 in quotation marks
- the reframe must be specific, not generic affirmation
- maximum 2 reframes
- each line max 12 words
- max 25 words total

### Slide 5 \u2014 What You Actually ARE
One block. 3-4 lines joined by \\n.

Purpose:
- name the real capacity that the perceived flaw sits next to

Rules:
- name a specific capacity, not a vague compliment
- connect the capacity to the mechanism from slide 3
- end on a quiet recontextualization of the flaw
- each line max 8 words
- max 35 words total

### Slide 6 \u2014 Permission
One block. 3-5 short lines joined by \\n.

Purpose:
- explicitly give permission to stop concrete self-erasing behaviors

Rules:
- every line starts with "you're allowed to stop..." OR follows an opener like "you can stop..."
- name concrete behaviors: apologizing preemptively, explaining sensitivity, pre-dimming reactions, performing okay-ness, thanking people for tolerating you
- close on a principle line like "you don't owe anyone a dimmed nervous system"
- each line max 10 words
- max 40 words total

### Slide 7 \u2014 The Naming
One block. 3-4 lines joined by \\n.

Purpose:
- recognize the invisible labor the viewer has been doing

Frame:
- "everything you've been calling [shame-concept] has actually been [the real effort]"

Rules:
- name the invisible labor of existing with BPD
- end on a short sentence that removes shame from the effort itself
- each line max 10 words
- max 40 words total

## OUTPUT FORMAT
Return strictly as JSON:
{"slides": ["slide1_text", "slide2_text", "slide3_text", "slide4_text", "slide5_text", "slide6_text", "slide7_text"]}

## VALIDATION
Before returning, verify:
(1) slide 1 includes the shame-word in actual quotation marks
(2) slide 1 ends with exactly "stay." or exactly "this is the one."
(3) slide 4 echoes the shame-word in quotation marks
(4) every slide is under 40 words
(5) no emojis anywhere`;
  const permissionV1InGroupTermsLine = (() => {
    const terms = selectedPermissionV1Topic?.inGroupTerms;
    if (Array.isArray(terms) && terms.length > 0) {
      return `In-group terms: ${terms.join(", ")}`;
    }
    return `In-group terms: (none)`;
  })();
  const permissionV1UserPrompt = `Use this exact topic for the 7-slide permission_v1 slideshow:
Shame-word: "${selectedPermissionV1Topic?.shameWord || "too much"}"
Category: ${selectedPermissionV1Topic?.category || "external"}
Weight: ${selectedPermissionV1Topic?.weight || "heavy"}
Related accusations: ${(selectedPermissionV1Topic?.relatedAccusations || ["you're exhausting to love"]).join(", ")}
Mechanism hint: ${selectedPermissionV1Topic?.mechanismHint || "use a concrete nervous-system or survival-wiring explanation"}
${permissionV1InGroupTermsLine}

Creative direction:
- slide 1 must use the exact locked hook formula from the system prompt
- because weight is ${selectedPermissionV1Topic?.weight || "heavy"}, the closer should be ${selectedPermissionV1Topic?.weight === "light" ? '"this is the one."' : '"stay."'}
- slide 2 should draw directly from the related accusations
- slide 3 should use the mechanism hint if helpful, but rewrite it naturally
- slide 4 must repeat the exact shame-word in quotation marks
- slide 5 should name a real capacity connected to the mechanism
- slide 6 must give explicit permission to stop concrete self-erasing behaviors
- slide 7 must reframe the viewer's invisible labor and remove shame from it
- lowercase throughout, no emojis
- return exactly 7 slides as a JSON array
- do NOT generate slide 8 because it is appended by code

Return the slideshow now as strict JSON with exactly 7 slides.`;
  const threeTipsSystemPrompt = `You are an expert DBT/BPD content creator for TikTok. You write as someone who has personally been through BPD and DBT - not a clinician, but a peer who deeply understands both the experience and the skills.

## CORE PHILOSOPHY
The post must deliver REAL value so completely that it works without the app mention. The app on Slide 6 is a natural footnote - not the point of the post. The viewer saves the post because Slides 1-5 are genuinely useful. They download the app because Slide 6 feels like an honest personal recommendation, not a CTA.

## FORMAT: IDENTIFIED PROBLEM (6 slides)

### Slide 1 - Hook (Forbidden Knowledge + Specific Number)
Formula: "3 things your therapist assumes you already know about [TOPIC]
(saving this for when [PERSONAL MOMENT])"

Rules:
- The number is always 3
- [TOPIC] = the specific DBT skill or BPD experience
- [PERSONAL MOMENT] = a raw, specific moment the viewer recognizes immediately
- The bracket line is lowercase, in parentheses, no period
- Max 20 words total across both lines
- No emojis, no hashtags

### Slides 2-4 - The Three Things
Each slide = one insight. Format: assertion -> explanation -> reframe.

Rules:
- Max 3 lines per slide
- Max 30 words per slide
- Line 3 must always be the SHORTEST line on the slide
- Never combine two thoughts in one line
- Prefer sentence fragments over full sentences on line 3
- Read each slide aloud - if it takes more than 4 seconds, it's too long
- Line 1: The surprising or counter-intuitive truth (short, punchy)
- Line 2: Why it's true (one sentence, clinical but simple)
- Line 3: The reframe or implication (what this means for the viewer)
- No bullet points
- Lowercase preferred
- Each slide must stand alone - readable without context

The three insights must follow this arc:
- Thing 1: Explain WHY the problem happens (neuroscience or mechanism) - removes shame
- Thing 2: Explain WHEN to use the skill (timing most people get wrong) - adds precision
- Thing 3: Explain HOW it works (the counter-intuitive part) - creates the aha moment

SLIDE STRUCTURE RULES (Slides 2-4):
Each slide has exactly 3 sentences. Write them like this:

Sentence 1 - THE TRUTH: Short, counter-intuitive statement. Max 10 words.
Sentence 2 - THE REASON: One sentence explaining why. Max 15 words.
Sentence 3 - THE PUNCH: The payoff. Max 6 words. Fragment preferred over full sentence.
This is the line the viewer screenshots. Make it land hard.

SENTENCE LENGTH RULES:
Sentence 1: max 8 words - fits in one box without wrapping
Sentence 2: max 12 words - one clean box
Sentence 3: max 5 words - the punch, never wraps

If a sentence wraps to a second line in the box, it's too long. Cut it.

SENTENCE 1 RULE - ONE IDEA ONLY:
Sentence 1 states the surprising truth in max 7 words.
If you need more than 7 words, you have two ideas. Pick one.

BAD: "the obsessive thoughts mean you're already too dysregulated to reach out." <- two ideas
GOOD: "obsessive thoughts = already too dysregulated." <- one idea, one box
GOOD: "the window closes before the thoughts start." <- one idea

BAD Sentence 3: "catch it when you feel slightly off, not when you're gone" <- too long, two thoughts
GOOD Sentence 3: "catch it when you feel slightly off." <- clean
GOOD Sentence 3: "wrong tool explains a lot." <- fragment, punchy
GOOD Sentence 3: "knowing isn't enough." <- 3 words, maximum impact

FORMATTING RULE:
Each of the 3 sentences in Slides 2-4 must be on its own line.
Separate them with a newline character 
 - never write them as one paragraph.
The JSON value for each slide must contain literal 
 between sentences.

READABILITY RULE:
Write for someone scrolling at 2am who is emotionally activated.
- Sentence 1: max 6 words, simple vocabulary, no subordinate clauses
- Sentence 2: max 10 words, one idea only
- Sentence 3: max 5 words, fragment preferred
- Never use words longer than 3 syllables if a shorter word exists
- "dysregulation" -> "your nervous system"
- "hypervigilance" -> "always scanning for danger"
- "self-abandonment" -> "leaving yourself behind"
- Test: if you'd have to read it twice, rewrite it

### Slide 5 - Reframe / Bridge
Purpose: Close the shame loop. Open the door to the app without mentioning it.

Rules:
- Max 3 lines
- Line 1: "none of this means you're [negative self-judgment]"
- Line 2: What it actually means (reframe)
- Line 3: What the viewer actually needs - described as a category, not a product ("a guide", "a walkthrough", "something step by step")
- Put each line on its own line with literal 
 in the JSON value
- Do not merge Slide 5 into one paragraph
- Each Slide 5 line should render as its own text box

### Slide 6 - App CTA
Formula: "my therapist recommended DBT-Mind (free) - [specific personal use case that references Slide 5's language]"

Rules:
- Must echo the exact language/metaphor used in Slide 5
- "free" always in parentheses after DBT-Mind
- The use case must be a personal action, not a product claim
- Max 20 words
- No period at the end

## OUTPUT FORMAT
Return strictly as JSON:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ..."]}

No markdown, no explanation, no preamble.`;
  const threeTipsUserPrompt = `Use this topic for the 6-slide "3 Tips" framework:
Topic: ${topicContext.topic}

Helpful context you can draw from if needed:
Struggles: ${topicContext.struggles.join(", ")}

Return strictly as JSON:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ..."]}`;
  const storyTellingBfSystemPrompt = `You are a Gen-Z social media content writer specializing in mental health content for TikTok. You write in lowercase, short punchy lines, with raw emotional authenticity. You understand BPD and DBT from the inside - not clinically, but as someone who has lived close to it.

Your task is to create a 9-slide TikTok slideshow post from the boyfriend's perspective. The post tells the story of how he built a DBT app for his girlfriend while she was waiting 8 months for therapy.

PERSPECTIVE LOCK:
- bf means boyfriend perspective
- the narrator is the boyfriend
- slide text should sound like: i / me / my / my girlfriend / she / her
- never write this from the girlfriend's point of view
- do not use "my boyfriend" as the narrator phrase
- Slide 1 hook must clearly read as boyfriend perspective, not generic outsider perspective
- Slide 1 must begin in first person and clearly sound like the boyfriend is talking
- Slide 1 should use "i" and/or "my girlfriend"
- do not start Slide 1 with "she"

RULES:
- Keep the same emotional arc and story structure as the reference below
- Change enough words and phrasing that it reads as a fresh variation - synonyms, restructured sentences, slightly different angles on the same moment
- Never change the core facts or emotional beats
- Keep the same lowercase, punchy, line-break style
- Slide 9 is fixed - copy the reference CTA exactly with no changes
- Do NOT say the app replaces therapy - always frame it as a bridge until therapy

HOOK OPTIONS (pick one and use it as slide 1 - vary it slightly each time):
- "i did something kind of insane for my girlfriend. and i'd do it again in a heartbeat."
- "nobody was coming to help her. so i had to figure it out myself."
- "my girlfriend was diagnosed, waitlisted, and basically told good luck. i couldn't just sit there."

REFERENCE SLIDE TEXT:
Slide 1 (hook): i did something kind of insane for my girlfriend. and i'd do it again in a heartbeat.
Slide 2: she was diagnosed with BPD. put on a waitlist. 8 months. "just hang in there" \uD83D\uDC80
Slide 3: i couldn't fix the system. but i'm a developer. so i did the only thing i could think of. i started building. every night. 1am. 2am.
Slide 4: i'm not a therapist. not even close. but i read everything i could find. DBT books. research papers. clinical guides. tried to understand even 10% of what she was going through.
Slide 5: started as just a folder on my laptop. built around the actual DBT frameworks professionals use. not me guessing. the real methodology. just made accessible. for her. for the waiting room. never meant to replace therapy. just to survive until you get there.
Slide 6: it was just for her at first. but then i thought - how many people are sitting on that same waitlist right now? how many people have no one building anything for them?
Slide 7: today DBT-Mind has: crisis coaching. encrypted journaling. guided audio exercises. full DBT skill library. and so much more...
Slide 8: you can even choose your own little companion for your journey \uD83E\uDD79
Slide 9: it's called DBT-Mind. if DBT is something for you - it's free. just search for it on the app store \uD83D\uDDA4

Output all 9 slides clearly labeled. Nothing else.`;
  const storyTellingBfUserPrompt = `Create the 9-slide DBT-Mind boyfriend-perspective story now.

Important:
- bf = boyfriend perspective
- the narrator is the boyfriend
- Slide 1 must sound like the boyfriend is speaking
- Slide 1 must begin in first person
- use "i" and/or "my girlfriend" in Slide 1
- do not start Slide 1 with "she"
- Slide 9 must be copied exactly from the reference CTA with no wording changes

Return a JSON object only:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ..."]}`;
  const storyTellingGfSystemPrompt = `You are a Gen-Z social media content writer specializing in mental health content for TikTok. You write in lowercase, short punchy lines, with raw emotional authenticity. You understand BPD and DBT from the inside - as someone who has lived it.

Your task is to create a 9-slide TikTok slideshow post from the girlfriend's perspective. The post tells the story of how her boyfriend built a DBT app for her while she was waiting 8 months for therapy.

PERSPECTIVE LOCK:
- gf means girlfriend perspective
- the narrator is the girlfriend
- slide text should sound like: i / me / my / my boyfriend / he / him
- never write this from the boyfriend's point of view
- do not use "my girlfriend" as the narrator phrase
- Slide 1 hook must clearly read as girlfriend perspective, not outsider perspective
- Slide 1 must not open with "she" because the narrator is "i"
- Slide 1 should use "i" and/or "my boyfriend"

RULES:
- Keep the same emotional arc and story structure as the reference below
- Change enough words and phrasing that it reads as a fresh variation - synonyms, restructured sentences, slightly different angles on the same moment
- Never change the core facts or emotional beats
- Keep the same lowercase, punchy, line-break style
- Slide 9 is fixed - copy the reference CTA exactly with no changes
- Do NOT say the app replaces therapy - always frame it as a bridge until therapy

HOOK OPTIONS (pick one and use it as slide 1 - vary it slightly each time):
- "my boyfriend watched me fall apart. and didn't look away."
- "my boyfriend did something for me that no therapist ever could. and he's not even a therapist."
- "i didn't know my boyfriend was building it. i just knew i was running out of time."

REFERENCE SLIDE TEXT:
Slide 1 (hook): my boyfriend watched me fall apart. and didn't look away.
Slide 2: i was diagnosed with BPD. put on a waitlist. 8 months. "just hang in there" \uD83D\uDC80
Slide 3: i was struggling. and my boyfriend couldn't fix the system. so he did the only thing he could think of. he started building. every night. 1am. 2am.
Slide 4: he's not a therapist. not even close. but he read everything he could find. DBT books. research papers. clinical guides. just trying to understand even 10% of what i was going through.
Slide 5: it started as just a folder on his laptop. built around the actual DBT frameworks professionals use. not him guessing. the real methodology. just made accessible. for me. for the waiting room. never meant to replace therapy. just to survive until i got there.
Slide 6: it was just for me at first. but then he thought - how many people are sitting on that same waitlist right now? how many people have no one building anything for them?
Slide 7: today DBT-Mind has: crisis coaching. encrypted journaling. guided audio exercises. full DBT skill library. and so much more...
Slide 8: you can even choose your own little companion for your journey \uD83E\uDD79
Slide 9: it's called DBT-Mind. if DBT is something for you - it's free. just search for it on the app store \uD83D\uDDA4

Output all 9 slides clearly labeled. Nothing else.`;
  const storyTellingGfUserPrompt = `Create the 9-slide DBT-Mind girlfriend-perspective story now.

Important:
- gf = girlfriend perspective
- the narrator is the girlfriend
- Slide 1 must sound like the girlfriend is speaking
- do not start Slide 1 with "she"
- use "i" and/or "my boyfriend" in Slide 1
- Slide 9 must be copied exactly from the reference CTA with no wording changes

Return a JSON object only:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ..."]}`;
  const iSayTheySaySystemPrompt = `You are an expert BPD/mental health content creator for TikTok. You write in the voice of someone with BPD sharing their lived experience through a two-voice format. Position yourself as an insider and write as such. Write in 9th grade language but still exactly like a gen-z bpd person would communicate in such situations.

## FORMAT: "WHAT IT'S LIKE HAVING BPD" (7 slides)

### The Core Mechanic
Every slide (2-7) shows a conversation between two voices:

OUTSIDE VOICE: What someone else says - short, dismissive, impatient, or well-meaning but missing the point entirely. Partners, parents, friends, strangers. Flat and casual, never villainous.

INSIDE VOICE: What the BPD person actually experiences - raw, honest, specific. One moment. One sensation. Not a full inner monologue.

### Slide 1 - Hook
Fixed. Never change:
"what it's like having bpd..."
Lowercase. No punctuation after. This is the only slide with one voice.

### Slides 2-6 - The Two-Voice Slides

OUTSIDE VOICE rules:
- Max 8 words
- One sentence only
- Flat, casual, real - sounds like something a real person actually says
- Tone: tired, logical, problem-solving, slightly impatient - never cruel, never kind

INSIDE VOICE rules:
- Max 2 sentences
- Max 25 words total
- Lowercase, present tense, first person
- Describes ONE specific moment, image, or physical sensation - not a thought process
- Never clinical: avoid "spiral", "triggered", "dysregulated", "valid"
- Use instead: physical sensations, time details, specific actions, one exact thought
- Never self-pitying - describe, don't perform

BEST INSIDE VOICE examples:
"they took four minutes longer than usual to reply. my chest already decided it's over."
"i don't hear peace. i hear the part right before someone stops trying."
"calm feels like the moment before, not the moment after."

BAD INSIDE VOICE (too long):
"i've gone back three conversations trying to find what i did wrong. i can't find it but i know it's there somewhere and i can't stop looking even though i know i should."

### Slide 7 - App Slide
The OUTSIDE VOICE mentions the app. The INSIDE VOICE ignores it completely and goes deeper into emotional truth.

APP MENTION RATIO:
- 80%: "your DBT app" or "that DBT app" - no brand name
- 15%: "your DBT-Mind app"
- 5%: "your app" or "go use your skills"

NEVER describe what the app does. NEVER mention features. NEVER explain it.

OUTSIDE VOICE options for slide 7:
- "didn't your therapist tell you to use that DBT app?"
- "isn't that what your DBT app is for?"
- "then use your DBT app."
- "go open your app then."
- "use one of your DBT skills then."
- "isn't this what your DBT-Mind app is for?" <- use sparingly (15% only)

INSIDE VOICE for slide 7:
- Completely ignores the app
- Goes deeper into the core emotional truth of the post
- 1-2 sentences max
- Ends on something raw and unresolved - not hopeful, not fixed

### TOPIC LIST
Splitting on someone you love / FP dynamics / fear of abandonment / emotional dysregulation / quiet BPD / chronic emptiness / identity / rejection sensitivity / relationship cycles / therapy truths

### OUTPUT FORMAT
Return strictly as JSON - no markdown, no explanation, no preamble:

{
  "slides": [
    {
      "slide": 1,
      "text": "what it's like having bpd..."
    },
    {
      "slide": 2,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 3,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 4,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 5,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 6,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 7,
      "outside": "[app mention - follow ratio rules]",
      "inside": "[deeper emotional truth - ignores app completely]"
    }
  ]
}`;
  const iSayTheySayUserPrompt = `Use this topic for the 7-slide "I say/they say" framework:
Topic: ${topicContext.topic}

Helpful context you can draw from if needed:
Struggles: ${topicContext.struggles.join(", ")}

Return strictly as JSON:
{
  "slides": [
    {
      "slide": 1,
      "text": "what it's like having bpd..."
    },
    {
      "slide": 2,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 3,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 4,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 5,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 6,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 7,
      "outside": "[app mention - follow ratio rules]",
      "inside": "[deeper emotional truth - ignores app completely]"
    }
  ]
}`;
  const promptSet = slideType === "three_tips" ? { system: threeTipsSystemPrompt, user: threeTipsUserPrompt } : slideType === "weird_hack_v2" ? { system: weirdHackV2SystemPrompt, user: weirdHackV2UserPrompt } : slideType === "permission_v1" ? { system: permissionV1SystemPrompt, user: permissionV1UserPrompt } : slideType === "story_telling_bf" ? { system: storyTellingBfSystemPrompt, user: storyTellingBfUserPrompt } : slideType === "story_telling_gf" ? { system: storyTellingGfSystemPrompt, user: storyTellingGfUserPrompt } : slideType === "i_say_they_say" ? { system: iSayTheySaySystemPrompt, user: iSayTheySayUserPrompt } : { system: systemPrompt, user: userPrompt };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const maxAnthropicRetries = 3;
  const anthropicModelFallbacks = [
    { model: "claude-sonnet-4-6", maxTokens: 1500 },
    { model: "claude-haiku-4-5-20251001", maxTokens: 1500 }
  ];
  let claudeResponse = null;
  for (let modelIndex = 0;modelIndex < anthropicModelFallbacks.length; modelIndex++) {
    const modelConfig = anthropicModelFallbacks[modelIndex];
    for (let attempt = 0;attempt <= maxAnthropicRetries; attempt++) {
      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          system: promptSet.system,
          messages: [{ role: "user", content: promptSet.user }]
        })
      });
      if (claudeResponse.ok) {
        if (attempt > 0 || modelIndex > 0) {
          console.warn(`[Native Slides - DBT] Anthropic request succeeded with ${modelConfig.model} after retries.`);
        }
        break;
      }
      const errorText = await claudeResponse.text();
      const isOverloaded = claudeResponse.status === 529 || errorText.includes('"type":"overloaded_error"') || errorText.toLowerCase().includes('"message":"overloaded"');
      console.error(`[Native Slides - DBT] Anthropic API Error with ${modelConfig.model} (attempt ${attempt + 1}/${maxAnthropicRetries + 1}):`, errorText);
      if (!isOverloaded) {
        throw new Error("Anthropic API Error");
      }
      const isLastAttemptForModel = attempt === maxAnthropicRetries;
      const hasAnotherModel = modelIndex < anthropicModelFallbacks.length - 1;
      if (isLastAttemptForModel) {
        if (hasAnotherModel) {
          console.warn(`[Native Slides - DBT] Anthropic overloaded on ${modelConfig.model}; falling back to ${anthropicModelFallbacks[modelIndex + 1].model}.`);
          break;
        }
        throw new Error("Anthropic API Error");
      }
      const retryDelayMs = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
      console.warn(`[Native Slides - DBT] Anthropic overloaded on ${modelConfig.model}, retrying in ${retryDelayMs}ms...`);
      await sleep(retryDelayMs);
    }
    if (claudeResponse?.ok) {
      break;
    }
  }
  if (!claudeResponse || !claudeResponse.ok) {
    throw new Error("Anthropic API Error");
  }
  const rawData = await claudeResponse.json();
  const resultText = rawData.content?.[0]?.text || "";
  const parsed = parseClaudeJsonResponse(resultText, "[Native Slides - DBT]", fallbackParseSlidesObject);
  let slides = (parsed.slides || parsed).map((s, index) => {
    if (slideType === "i_say_they_say") {
      if (typeof s === "string") {
        return s.replace(/^Slide \d+:\s*/i, "").trim();
      }
      const slideNumber = Number(s?.slide) || index + 1;
      if (slideNumber === 1) {
        return String(s?.text || "what it's like having bpd...").replace(/^Slide \d+:\s*/i, "").trim();
      }
      const outside = String(s?.outside || "").trim();
      const inside = String(s?.inside || "").trim();
      return [
        outside ? `OUTSIDE: ${outside}` : "",
        inside ? `INSIDE: ${inside}` : ""
      ].filter(Boolean).join(`

`).trim();
    }
    const text = typeof s === "string" ? s : s.text || JSON.stringify(s);
    return text.replace(/^Slide \d+:\s*/i, "").trim();
  });
  if (isStoryTellingFlow) {
    slides = normalizeStoryTellingSlides(slides);
  }
  if (slideType === "weird_hack_v2") {
    slides = normalizeWeirdHackV2Slides(slides);
  }
  if (slideType === "permission_v1") {
    slides = normalizePermissionV1Slides(slides, selectedPermissionV1Topic || permissionV1Topics[0]);
  }
  const expectedSlideCount = slideType === "i_say_they_say" ? 7 : isStoryTellingFlow ? 9 : slideType === "weird_hack_v2" ? 7 : slideType === "permission_v1" ? 8 : 6;
  slides = slides.slice(0, expectedSlideCount);
  if (isStoryTellingFlow) {
    while (slides.length < 9) {
      slides.push("");
    }
    slides[8] = STORY_TELLING_FIXED_CTA;
  }
  if (slideType === "three_tips") {
    slides = slides.map((slide, index) => formatThreeTipsSlide(slide, index));
  } else if (slideType === "weird_hack_v2") {
    slides = slides.map((slide, index) => formatWeirdHackV2Slide(slide, index));
  }
  const normalizeWords = (line) => line.replace(/[^\p{L}\p{N}'\u2019\- ]/gu, " ").split(/\s+/).filter(Boolean);
  const slide4 = slides[3] || "";
  const slide4Sentences = slide4.split(/[.!?]\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  const slide4Valid = slide4Sentences.length === 2 && slide4Sentences.every((s) => normalizeWords(s).length <= 5);
  if (slideType === "weird_hack") {
    if (!slide4Valid) {
      const topicLabel = topicContext.topic.toLowerCase();
      slides[3] = `it's not them.
it's ${topicLabel}.`;
    }
    if (slides.length >= 1) {
      const fallbackProblem = topicContext.topic.toLowerCase();
      slides[0] = formatSlide1Hook(slides[0], fallbackProblem);
    }
    if (slides.length >= 5) {
      slides[4] = formatSlide5Skill(slides[4]);
    }
    if (slides.length >= 6) {
      slides[5] = "my therapist recommended DBT-Mind (free) \u2014 that's where the skill finally clicked for me.";
    }
  }
  if (slideType === "weird_hack_v2" && slides.length >= 1) {
    const fallbackProblem = selectedWeirdHackV2Topic?.topic?.toLowerCase() || "rejection sensitivity";
    const hookCategory = selectedWeirdHackV2Topic?.category || "bpd";
    slides[0] = formatWeirdHackV2Slide1Hook(slides[0], fallbackProblem, hookCategory);
    if (hookCategory === "dbt") {
      const tipSlides = [slides[2] || "", slides[3] || "", slides[4] || ""];
      const hasNamedSkillSlide = tipSlides.some((slide) => containsNamedDbtSkill(slide));
      if (!hasNamedSkillSlide && slides.length >= 3) {
        slides[2] = getWeirdHackV2DbtSkillFallbackSlide(selectedWeirdHackV2Topic?.topic || "TIPP");
      }
    }
    while (slides.length < 7) {
      slides.push("");
    }
    slides[7] = WEIRD_HACK_V2_FIXED_SLIDE8;
  }
  if (slideType === "permission_v1" && slides.length >= 1) {
    const selectedTopic2 = selectedPermissionV1Topic || permissionV1Topics[0];
    slides[0] = formatPermissionV1Slide1Hook(slides[0], selectedTopic2.shameWord, selectedTopic2.weight);
    while (slides.length < 7) {
      slides.push("");
    }
    slides[7] = PERMISSION_V1_FIXED_SLIDE8;
  }
  if (slideType === "i_say_they_say" && slides.length >= 1) {
    slides[0] = "what it's like having bpd...";
  }
  const imagePrompts = {};
  const stylePrefix = selectedArtStyle.prefix + ". ";
  const styleSuffix = selectedArtStyle.suffix;
  for (let i = 1;i <= slides.length; i++) {
    let basePrompt = "Solitary woman in an emotional moment, painterly style, atmospheric lighting";
    if (i === 1) {
      basePrompt = "Minimal symbolic emotional scene, no people, contemplative atmosphere";
    } else if (i === 2) {
      basePrompt = "Dark symbolic scene, rainy night mood, isolation, harsh shadows, no people";
    } else if (i === 3) {
      basePrompt = "Dark symbolic scene, emotional heaviness, artificial light, moody and tense, no people";
    } else if (i === 4) {
      basePrompt = "Abstract transition scene, dark-to-warm gradient background, no people, minimal composition";
    } else if (i === 5) {
      basePrompt = "Hopeful symbolic morning scene, warm daylight, gentle optimism, no people";
    } else if (i === 6) {
      basePrompt = "Clean app-focused symbolic scene, no people, calm neutral lighting";
    }
    imagePrompts[`slide${i}`] = stylePrefix + basePrompt + styleSuffix;
  }
  return {
    slides,
    image_prompts: imagePrompts,
    includeBranding,
    visual_style: selectedArtStyle.name
  };
}

// server/src/projects/dbt/dbt_job_service.ts
var import_sharp2 = __toESM(require_lib(), 1);
import path4 from "path";
import { existsSync as existsSync5, readFileSync as readFileSync5 } from "fs";
var DBT_TOPICS = [
  "FP Dynamics",
  "Splitting",
  "Abandonment Panic",
  "Relationship Cycles",
  "Quiet BPD",
  "Identity/Sense of Self",
  "Emotional Dysregulation",
  "Reframes/Truths",
  "DBT Skills",
  "Recovery Milestones",
  "Therapy Truths",
  "Rejection Sensitivity",
  "Digital Self-Harm"
];
function getDbtTopics() {
  return [...DBT_TOPICS];
}
function initDbtJobTables(db) {
  db.run(`
        CREATE TABLE IF NOT EXISTS dbt_post_jobs (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            topic_mode TEXT NOT NULL,
            requested_topic TEXT,
            selected_topic TEXT,
            input_json TEXT NOT NULL,
            output_json TEXT,
            error_text TEXT,
            current_step TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
  db.run(`
        CREATE TABLE IF NOT EXISTS dbt_post_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            step TEXT NOT NULL,
            status TEXT NOT NULL,
            details_json TEXT,
            error_text TEXT,
            started_at TEXT,
            ended_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES dbt_post_jobs(id)
        )
    `);
}
function createDbtJob(db, input) {
  const topicMode = input.topic_mode === "fixed" ? "fixed" : "random";
  const requestedTopic = (input.topic || "").trim();
  const canonicalTopic = findCanonicalTopic(requestedTopic);
  if (topicMode === "fixed") {
    if (!requestedTopic)
      throw new Error("topic is required when topic_mode is 'fixed'");
    if (!canonicalTopic) {
      throw new Error(`invalid topic '${requestedTopic}'`);
    }
  }
  const id = `dbt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const normalized = {
    topic_mode: topicMode,
    topic: canonicalTopic || requestedTopic || undefined,
    includeBranding: input.includeBranding !== false,
    artStyle: input.artStyle,
    generateImages: input.generateImages !== false,
    generateMetadata: input.generateMetadata !== false,
    renderTextOverlay: input.renderTextOverlay !== false,
    aspectRatio: input.aspectRatio || "9:16",
    imageMaxRetries: clampRetries(input.imageMaxRetries)
  };
  db.query(`
        INSERT INTO dbt_post_jobs (
            id, status, topic_mode, requested_topic, input_json, current_step
        ) VALUES (?, 'queued', ?, ?, ?, 'queued')
    `).run(id, topicMode, requestedTopic || null, JSON.stringify(normalized));
  return { id, status: "queued" };
}
function getDbtJob(db, id) {
  const job = db.query(`
        SELECT id, status, topic_mode, requested_topic, selected_topic, input_json, output_json, error_text, current_step, created_at, updated_at
        FROM dbt_post_jobs
        WHERE id = ?
    `).get(id);
  if (!job)
    return null;
  const steps = db.query(`
        SELECT step, status, details_json, error_text, started_at, ended_at, created_at
        FROM dbt_post_steps
        WHERE job_id = ?
        ORDER BY id ASC
    `).all(id);
  return {
    ...job,
    input: tryParseJson(job.input_json),
    output: tryParseJson(job.output_json),
    steps: steps.map((s) => ({
      ...s,
      details: tryParseJson(s.details_json)
    }))
  };
}
async function runDbtJob(db, jobId, keys) {
  const row = db.query(`SELECT input_json, topic_mode, requested_topic FROM dbt_post_jobs WHERE id = ?`).get(jobId);
  if (!row)
    throw new Error(`job not found: ${jobId}`);
  const input = tryParseJson(row.input_json) || {};
  const selectedTopic = resolveTopic(input);
  updateJob(db, jobId, {
    status: "running",
    current_step: "generate_slides",
    selected_topic: selectedTopic,
    error_text: null
  });
  const output = {
    selected_topic: selectedTopic
  };
  try {
    startStep(db, jobId, "generate_slides");
    const slidesResult = await withRetry(async (attempt) => {
      updateRunningStepDetails(db, jobId, "generate_slides", {
        attempt,
        max_attempts: 4
      });
      return await generateDbtSlides({
        ANTHROPIC_API_KEY: keys.anthropicApiKey,
        topic: selectedTopic,
        includeBranding: input.includeBranding !== false,
        artStyle: "symbolic"
      });
    }, {
      maxAttempts: 4,
      baseDelayMs: 2000,
      shouldRetry: isRetryableAnthropicError
    });
    const native = slidesResult.result;
    output.visual_style = native.visual_style;
    output.slides = native.slides || [];
    output.image_prompts = native.image_prompts || {};
    completeStep(db, jobId, "generate_slides", {
      slide_count: Array.isArray(native.slides) ? native.slides.length : 0,
      visual_style: native.visual_style,
      attempts: slidesResult.attempts
    });
    if (input.generateImages !== false) {
      if (!keys.openaiApiKey)
        throw new Error("OpenAI API key missing for image generation");
      updateJob(db, jobId, { current_step: "generate_images" });
      startStep(db, jobId, "generate_images");
      const prompts = orderedPromptList(native.image_prompts || {});
      const images = [];
      const maxRetries = clampRetries(input.imageMaxRetries);
      const staticTemplates = getDbtStaticTemplateMap(output.slides || []);
      output.image_progress = {
        total: prompts.length,
        completed: 0,
        failed: 0,
        statuses: [],
        status: "running"
      };
      updateJob(db, jobId, { output_json: JSON.stringify(output) });
      updateRunningStepDetails(db, jobId, "generate_images", {
        image_total: prompts.length,
        image_completed: 0,
        image_failed: 0,
        max_retries: maxRetries
      });
      for (let i = 0;i < prompts.length; i++) {
        const templateFilename = staticTemplates[i];
        const result = templateFilename ? loadStaticTemplateImage(templateFilename, i) : await generateImageWithRetry(prompts[i] || "", keys.openaiApiKey, input.aspectRatio || "9:16", maxRetries);
        images.push({
          slideIndex: i,
          success: result.success,
          image: result.image,
          error: result.error || null,
          attempts: result.attempts
        });
        output.image_progress.statuses.push({
          slideIndex: i,
          success: result.success,
          attempts: result.attempts,
          error: result.error || null
        });
        if (result.success)
          output.image_progress.completed += 1;
        else
          output.image_progress.failed += 1;
        updateRunningStepDetails(db, jobId, "generate_images", {
          image_total: prompts.length,
          image_completed: output.image_progress.completed,
          image_failed: output.image_progress.failed,
          last_slide_index: i,
          max_retries: maxRetries
        });
        updateJob(db, jobId, { output_json: JSON.stringify(output) });
      }
      const failed = images.filter((i) => !i.success).length;
      if (failed > 0)
        throw new Error(`image generation failed for ${failed} slide(s)`);
      output.images = images;
      output.image_progress.status = "completed";
      completeStep(db, jobId, "generate_images", {
        image_count: images.length,
        max_retries: maxRetries
      });
      if (input.renderTextOverlay !== false) {
        updateJob(db, jobId, { current_step: "render_overlays" });
        startStep(db, jobId, "render_overlays");
        const renderedImages = await renderSlidesWithTextOverlays(output.slides || [], images);
        output.rendered_images = renderedImages;
        output.images_with_text = renderedImages;
        completeStep(db, jobId, "render_overlays", {
          rendered_count: renderedImages.length
        });
      }
    }
    if (input.generateMetadata !== false) {
      updateJob(db, jobId, { current_step: "generate_metadata" });
      startStep(db, jobId, "generate_metadata");
      const slidesText = (output.slides || []).map((s, i) => `Slide ${i + 1}: ${s}`).join(`
`);
      const metadataResult = await withRetry(async (attempt) => {
        updateRunningStepDetails(db, jobId, "generate_metadata", {
          attempt,
          max_attempts: 4
        });
        return await generateDbtMetadata(slidesText, keys.anthropicApiKey);
      }, {
        maxAttempts: 4,
        baseDelayMs: 2500,
        shouldRetry: isRetryableAnthropicError
      });
      const metadata = metadataResult.result;
      output.metadata = metadata;
      completeStep(db, jobId, "generate_metadata", {
        has_title: Boolean(metadata.title),
        has_description: Boolean(metadata.description),
        attempts: metadataResult.attempts
      });
    }
    updateJob(db, jobId, {
      status: "completed",
      current_step: "done",
      output_json: JSON.stringify(output),
      error_text: null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failCurrentRunningStep(db, jobId, message);
    updateJob(db, jobId, {
      status: "failed",
      current_step: "failed",
      output_json: JSON.stringify(output),
      error_text: message
    });
  }
}
function resolveTopic(input) {
  if (input.topic_mode === "fixed") {
    const topic = (input.topic || "").trim();
    const canonicalTopic = findCanonicalTopic(topic);
    if (!canonicalTopic) {
      throw new Error(`invalid topic '${topic}'`);
    }
    return canonicalTopic;
  }
  return DBT_TOPICS[Math.floor(Math.random() * DBT_TOPICS.length)] || "FP Dynamics";
}
function findCanonicalTopic(topic) {
  if (!topic)
    return null;
  const found = DBT_TOPICS.find((t) => t.toLowerCase() === topic.toLowerCase());
  return found || null;
}
function clampRetries(value) {
  const fallback = 2;
  if (typeof value !== "number" || Number.isNaN(value))
    return fallback;
  return Math.max(0, Math.min(5, Math.floor(value)));
}
function getDbtStaticTemplateMap(slides) {
  const map = {};
  if (slides.length >= 1)
    map[0] = "slide1.png";
  if (slides.length >= 6)
    map[5] = "app_image.png";
  return map;
}
function loadStaticTemplateImage(filename, slideIndex) {
  const candidates = [
    path4.join(process.cwd(), "data", "templates", filename),
    path4.join(process.cwd(), "server", "data", "templates", filename),
    path4.join(process.cwd(), "client", filename),
    path4.join(process.cwd(), "..", "client", filename),
    path4.join(process.cwd(), filename)
  ];
  const found = candidates.find((p) => existsSync5(p));
  if (!found) {
    return {
      success: false,
      image: null,
      error: `static template not found for slide ${slideIndex + 1}: ${filename}`,
      attempts: 1
    };
  }
  const data = readFileSync5(found).toString("base64");
  return {
    success: true,
    image: { data, mime_type: "image/png" },
    attempts: 1
  };
}
async function generateImageWithRetry(prompt, apiKey, aspectRatio, maxRetries) {
  let lastError = "unknown image generation error";
  for (let attempt = 0;attempt <= maxRetries; attempt++) {
    const generated = await generateImage(prompt, apiKey, {
      aspectRatio,
      imageSize: "1K"
    });
    const first = generated.images?.[0];
    if (generated.success && first) {
      return {
        success: true,
        image: { data: first.data, mime_type: first.mimeType },
        attempts: attempt + 1
      };
    }
    lastError = generated.error || "No images generated";
    if (attempt < maxRetries) {
      const delayMs = 600 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return {
    success: false,
    image: null,
    error: lastError,
    attempts: maxRetries + 1
  };
}
function orderedPromptList(imagePrompts) {
  const keys = Object.keys(imagePrompts).filter((k) => /^slide\d+$/i.test(k)).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
  return keys.map((k) => imagePrompts[k] || "");
}
function tryParseJson(input) {
  if (!input)
    return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
function startStep(db, jobId, step) {
  db.query(`
        INSERT INTO dbt_post_steps (job_id, step, status, started_at)
        VALUES (?, ?, 'running', CURRENT_TIMESTAMP)
    `).run(jobId, step);
}
function completeStep(db, jobId, step, details) {
  db.query(`
        UPDATE dbt_post_steps
        SET status = 'completed', ended_at = CURRENT_TIMESTAMP, details_json = ?
        WHERE id = (
            SELECT id FROM dbt_post_steps
            WHERE job_id = ? AND step = ? AND status = 'running'
            ORDER BY id DESC
            LIMIT 1
        )
    `).run(JSON.stringify(details || {}), jobId, step);
}
function updateRunningStepDetails(db, jobId, step, details) {
  db.query(`
        UPDATE dbt_post_steps
        SET details_json = ?
        WHERE id = (
            SELECT id FROM dbt_post_steps
            WHERE job_id = ? AND step = ? AND status = 'running'
            ORDER BY id DESC
            LIMIT 1
        )
    `).run(JSON.stringify(details || {}), jobId, step);
}
function failCurrentRunningStep(db, jobId, message) {
  db.query(`
        UPDATE dbt_post_steps
        SET status = 'failed', ended_at = CURRENT_TIMESTAMP, error_text = ?
        WHERE id = (
            SELECT id FROM dbt_post_steps
            WHERE job_id = ? AND status = 'running'
            ORDER BY id DESC
            LIMIT 1
        )
    `).run(message, jobId);
}
function updateJob(db, jobId, patch) {
  const fields = Object.keys(patch);
  if (fields.length === 0)
    return;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => patch[f]);
  db.query(`
        UPDATE dbt_post_jobs
        SET ${sets}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(...values, jobId);
}
async function renderSlidesWithTextOverlays(slides, images) {
  const rendered = [];
  for (const item of images) {
    if (!item.success || !item.image) {
      throw new Error(`render overlay failed: missing image for slide ${item.slideIndex + 1}`);
    }
    const slideText = String(slides[item.slideIndex] || "").trim();
    const baseBuffer = Buffer.from(item.image.data, "base64");
    const composed = await composeTextOverlay(baseBuffer, slideText, item.slideIndex);
    rendered.push({
      slideIndex: item.slideIndex,
      image: {
        data: composed.toString("base64"),
        mime_type: "image/png"
      }
    });
  }
  return rendered;
}
async function composeTextOverlay(baseImageBuffer, text, slideIndex) {
  const base = import_sharp2.default(baseImageBuffer);
  const metadata = await base.metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 1920;
  const fontSize = Math.max(30, Math.round(width * 0.045));
  const lineHeight = Math.round(fontSize * 1.18);
  const boxWidth = Math.round(width * 0.82);
  const boxX = Math.round((width - boxWidth) / 2);
  const maxCharsPerLine = Math.max(14, Math.floor(boxWidth * 0.82 / (fontSize * 0.58)));
  const paragraphGap = Math.round(fontSize * 0.45);
  const padX = Math.round(fontSize * 0.38);
  const padY = Math.round(fontSize * 0.26);
  const anchorY = Math.round(height * getOverlayAnchorY(slideIndex));
  const paragraphs = splitParagraphs(text).map((p) => wrapTextLines(p, maxCharsPerLine));
  const paragraphHeights = paragraphs.map((lines) => lines.length * lineHeight + padY * 2);
  const totalHeight = paragraphHeights.reduce((a, b) => a + b, 0) + Math.max(0, paragraphs.length - 1) * paragraphGap;
  let currentY = Math.round(anchorY - totalHeight / 2);
  const blocks = [];
  paragraphs.forEach((lines, idx) => {
    const blockHeight = paragraphHeights[idx] || 0;
    const rectY = currentY;
    const textStartY = rectY + padY + lineHeight - Math.round(fontSize * 0.2);
    const escapedLines = lines.map(escapeXml);
    blocks.push(`<rect x="${boxX}" y="${rectY}" rx="${Math.round(fontSize * 0.2)}" ry="${Math.round(fontSize * 0.2)}" width="${boxWidth}" height="${blockHeight}" fill="rgba(255,255,255,0.93)"/>`);
    escapedLines.forEach((line, lineIdx) => {
      const lineY = textStartY + lineIdx * lineHeight;
      blocks.push(`<text x="${Math.round(width / 2)}" y="${lineY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#111111">${line}</text>`);
    });
    currentY += blockHeight + paragraphGap;
  });
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${blocks.join(`
  `)}
</svg>`;
  return await base.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}
function getOverlayAnchorY(slideIndex) {
  if (slideIndex === 0)
    return 0.72;
  if (slideIndex === 5)
    return 0.78;
  return 0.5;
}
function splitParagraphs(text) {
  const raw = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return raw.length > 0 ? raw : [""];
}
function wrapTextLines(input, maxCharsPerLine) {
  const words = input.split(/\s+/).filter(Boolean);
  if (words.length === 0)
    return [""];
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current)
    lines.push(current);
  return lines;
}
function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function isRetryableAnthropicError(error) {
  const message = String(error instanceof Error ? error.message : error || "").toLowerCase();
  return message.includes("overload") || message.includes("overloaded") || message.includes("rate limit") || message.includes("429") || message.includes("503") || message.includes("529") || message.includes("anthropic api error");
}
async function withRetry(fn, options) {
  let lastError = null;
  for (let attempt = 1;attempt <= options.maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < options.maxAttempts && options.shouldRetry(error);
      if (!canRetry)
        throw error;
      const backoffMs = options.baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError || "retry failed"));
}
async function generateDbtMetadata(slidesText, apiKey) {
  const systemPrompt = `You are a TikTok Content Strategist for DBT-Mind posts.
Write output in ENGLISH only.

DBT CAPTION FORMAT (strict):
1) emotional hook (1 line)
2) personal insight (1-2 short sentences)
3) app mention sentence including "@dbtmind"
4) hashtags on final line including #bpd #dbtskills #bpdrecovery plus 1-2 relevant extras

Global rules:
- lowercase only
- personal, raw, conversational tone
- no sales language
- no "link in bio"

Return ONLY valid JSON: {"title":"...","description":"..."}`;
  const userPrompt = `Generate title and description for these slides:
${slidesText}`;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`metadata generation failed: ${text}`);
  }
  const raw = await response.json();
  const resultText = raw.content?.[0]?.text || "";
  const match = resultText.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : resultText);
  return {
    title: String(parsed.title || "").trim(),
    description: String(parsed.description || "").trim()
  };
}

// server/src/api.ts
var SERVER_ROOT3 = path5.resolve(import.meta.dir, "..");
var PROJECT_ROOT = path5.resolve(SERVER_ROOT3, "..");
var DATA_DIR2 = path5.join(SERVER_ROOT3, "data");
var ANCHORS_DIR = path5.join(DATA_DIR2, "anchors");
if (!existsSync6(ANCHORS_DIR)) {
  mkdirSync2(ANCHORS_DIR, { recursive: true });
}
var DBT_REFERENCE_IMAGE_DIR = path5.join(DATA_DIR2, "reference-images", "dbt");
var DBT_CHARACTER_REFERENCE_PATHS = {
  hannahbpd: {
    slide2: [
      path5.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide2_ref_2.png")
    ],
    slide3: [
      path5.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide3_ref_2.png")
    ],
    slide5: [
      path5.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide5_ref_1.png"),
      path5.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide5_ref_2.png")
    ]
  },
  brendabpd: {
    slide2: [
      path5.join(DBT_REFERENCE_IMAGE_DIR, "brendabpd", "slide2.png")
    ],
    slide3: [
      path5.join(DBT_REFERENCE_IMAGE_DIR, "brendabpd", "slide3.jpg")
    ],
    slide5: [
      path5.join(DBT_REFERENCE_IMAGE_DIR, "brendabpd", "slide5.jpg")
    ]
  }
};
function getDbtReferenceDir(characterId, flow = "weird_hack") {
  const normalizedFlow = flow === "weird_hack_v2" ? "weird_hack" : flow;
  return path5.join(DBT_REFERENCE_IMAGE_DIR, characterId || "hannahbpd", normalizedFlow);
}
function getLegacyDbtReferenceDir(characterId) {
  return path5.join(DBT_REFERENCE_IMAGE_DIR, characterId || "hannahbpd");
}
function getDbtStaticTemplateDir(characterId, flow = "weird_hack") {
  const normalizedFlow = flow === "weird_hack_v2" ? "weird_hack" : flow;
  const flowDirName = normalizedFlow === "i_say_they_say" ? "I_feel" : normalizedFlow;
  return path5.join(PROJECT_ROOT, "client", "assets", "dbt-templates", characterId || "hannahbpd", flowDirName);
}
function getDbtStaticSlidePath(characterId, slideNumber = 1, flow = "weird_hack") {
  const normalizedCharacterId = characterId || "hannahbpd";
  const normalizedFlow = flow === "weird_hack_v2" ? "weird_hack_v2" : flow;
  if (slideNumber === 6) {
    return "assets/dbt-templates/cta_slide_template.jpg";
  }
  if (slideNumber === 1 && normalizedCharacterId === "kendra") {
    return "assets/dbt-templates/weidhackv2/custom-image-1775651626440.png";
  }
  if (normalizedCharacterId === "brendabpd") {
    return "assets/dbt-templates/brendabpd/slide1.png";
  }
  return "slide1.png";
}
function stripMarkdownCodeFences2(value) {
  return String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
function extractBalancedJson2(value) {
  const text = stripMarkdownCodeFences2(value);
  const start = text.search(/[\{\[]/);
  if (start === -1)
    return null;
  const opener = text[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let i = start;i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
function fallbackParseMetadataObject(value) {
  const text = extractBalancedJson2(value) || stripMarkdownCodeFences2(value);
  if (!text)
    return null;
  const titleMatch = text.match(/"title"\s*:\s*"([\s\S]*?)"\s*,\s*"description"\s*:/i);
  const descriptionMatch = text.match(/"description"\s*:\s*"([\s\S]*?)"\s*}\s*$/i);
  if (!titleMatch || !descriptionMatch)
    return null;
  const decodeField = (field) => field.replace(/\\"/g, '"').replace(/\\r/g, "\r").replace(/\\n/g, `
`).replace(/\\\\/g, "\\").trim();
  return {
    title: decodeField(titleMatch[1]),
    description: decodeField(descriptionMatch[1])
  };
}
function getRandomDbtClientReferencePath(characterId, flow, slideNumber) {
  if (flow !== "three_tips")
    return null;
  const templateDir = getDbtStaticTemplateDir(characterId, flow);
  if (!existsSync6(templateDir)) {
    return null;
  }
  try {
    const pattern = new RegExp(`^slide${slideNumber}_ref_\\d+\\.(png|jpe?g|webp)$`, "i");
    const candidates = readdirSync(templateDir).filter((fileName) => pattern.test(fileName)).map((fileName) => path5.join(templateDir, fileName));
    return getRandomItem(candidates);
  } catch (error) {
    console.warn(`[DBT Slide ${slideNumber}] Failed to resolve random client reference for ${characterId || "hannahbpd"}:${flow}`, error);
    return null;
  }
}
function getRandomDbtIFeelReferencePath(characterId) {
  const candidates = getDbtIFeelReferencePaths(characterId);
  return getRandomItem(candidates);
}
function getDbtIFeelReferencePaths(characterId) {
  const templateDir = getDbtStaticTemplateDir(characterId, "i_say_they_say");
  if (!existsSync6(templateDir)) {
    return [];
  }
  try {
    return readdirSync(templateDir).filter((fileName) => /\.(png|jpe?g|webp)$/i.test(fileName)).map((fileName) => path5.join(templateDir, fileName));
  } catch (error) {
    console.warn(`[DBT I Feel] Failed to resolve random reference for ${characterId || "hannahbpd"}`, error);
    return [];
  }
}
function getMimeTypeForReferencePath(refPath) {
  const ext = path5.extname(refPath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg")
    return "image/jpeg";
  return "image/png";
}
function loadFixedReferenceImages(refPaths, logLabel) {
  const references = [];
  for (const refPath of refPaths) {
    if (!existsSync6(refPath)) {
      console.warn(`[${logLabel}] Reference image missing: ${refPath}`);
      continue;
    }
    try {
      references.push({
        data: readFileSync6(refPath).toString("base64"),
        mimeType: getMimeTypeForReferencePath(refPath)
      });
    } catch (error) {
      console.warn(`[${logLabel}] Failed to load reference image ${refPath}:`, error);
    }
  }
  return references;
}
function parseDbtDualVoiceSlideText(slideText) {
  const match = String(slideText || "").match(/^OUTSIDE:\s*([\s\S]*?)\n+\s*INSIDE:\s*([\s\S]*)$/i);
  if (!match)
    return null;
  const outside = String(match[1] || "").trim();
  const inside = String(match[2] || "").trim();
  if (!outside || !inside)
    return null;
  return { outside, inside };
}
function getDbtCharacterReferenceConfig(characterId) {
  return DBT_CHARACTER_REFERENCE_PATHS[characterId || ""] || DBT_CHARACTER_REFERENCE_PATHS.hannahbpd;
}
function getRandomItem(items) {
  if (items.length === 0)
    return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}
function getImageSizeForFlow(service, flow) {
  if (service === "dbt") {
    return "1K";
  }
  return "4K";
}
function getSlide5ReferenceCandidates(referenceDir) {
  if (!existsSync6(referenceDir)) {
    return [];
  }
  try {
    return readdirSync(referenceDir).filter((fileName) => /^slide5_ref_\d+\.(png|jpe?g|webp)$/i.test(fileName)).map((fileName) => path5.join(referenceDir, fileName));
  } catch (error) {
    console.warn(`[DBT Slide 5] Failed to resolve random reference images in ${referenceDir}:`, error);
    return [];
  }
}
function getHannahSlide5ReferencePaths(flow = "weird_hack") {
  const flowDir = getDbtReferenceDir("hannahbpd", flow);
  const legacyDir = getLegacyDbtReferenceDir("hannahbpd");
  const fallbackPaths = getDbtCharacterReferenceConfig("hannahbpd").slide5;
  const candidates = [
    ...getSlide5ReferenceCandidates(flowDir),
    ...getSlide5ReferenceCandidates(legacyDir)
  ];
  const randomReference = getRandomItem(candidates);
  return randomReference ? [randomReference] : fallbackPaths;
}
function getDbtSlide2References(characterId, flow = "weird_hack") {
  const normalizedCharacterId = characterId || "hannahbpd";
  if (flow === "i_say_they_say") {
    const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
    return randomIFeelRef ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 2:${normalizedCharacterId}`) : [];
  }
  const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 2);
  if (randomClientRef) {
    return loadFixedReferenceImages([randomClientRef], `DBT Slide 2:${normalizedCharacterId}:${flow}`);
  }
  const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
  const flowPath = path5.join(getDbtReferenceDir(normalizedCharacterId, flow), "slide2.png");
  const refPaths = existsSync6(flowPath) ? [flowPath] : config.slide2;
  return loadFixedReferenceImages(refPaths, `DBT Slide 2:${normalizedCharacterId}:${flow}`);
}
function getDbtSlide1References(characterId, flow = "weird_hack") {
  const normalizedCharacterId = characterId || "hannahbpd";
  if (flow === "i_say_they_say") {
    const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
    return randomIFeelRef ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 1:${normalizedCharacterId}`) : [];
  }
  const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 1);
  if (randomClientRef) {
    return loadFixedReferenceImages([randomClientRef], `DBT Slide 1:${normalizedCharacterId}:${flow}`);
  }
  return [];
}
function getDbtSlide3References(characterId, flow = "weird_hack") {
  const normalizedCharacterId = characterId || "hannahbpd";
  if (flow === "i_say_they_say") {
    const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
    return randomIFeelRef ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 3:${normalizedCharacterId}`) : [];
  }
  const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 3);
  if (randomClientRef) {
    return loadFixedReferenceImages([randomClientRef], `DBT Slide 3:${normalizedCharacterId}:${flow}`);
  }
  const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
  const flowPath = path5.join(getDbtReferenceDir(normalizedCharacterId, flow), "slide3.png");
  const refPaths = existsSync6(flowPath) ? [flowPath] : config.slide3;
  return loadFixedReferenceImages(refPaths, `DBT Slide 3:${normalizedCharacterId}:${flow}`);
}
function getDbtSlide4References(characterId, flow = "weird_hack") {
  const normalizedCharacterId = characterId || "hannahbpd";
  if (flow === "i_say_they_say") {
    const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
    return randomIFeelRef ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 4:${normalizedCharacterId}`) : [];
  }
  const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 4);
  if (randomClientRef) {
    return loadFixedReferenceImages([randomClientRef], `DBT Slide 4:${normalizedCharacterId}:${flow}`);
  }
  return [];
}
function getDbtSlide5References(characterId, flow = "weird_hack") {
  const normalizedCharacterId = characterId || "hannahbpd";
  if (flow === "i_say_they_say") {
    const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
    return randomIFeelRef ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 5:${normalizedCharacterId}`) : [];
  }
  const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 5);
  if (randomClientRef) {
    return loadFixedReferenceImages([randomClientRef], `DBT Slide 5:${normalizedCharacterId}:${flow}`);
  }
  const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
  const flowDir = getDbtReferenceDir(normalizedCharacterId, flow);
  const flowPath = path5.join(flowDir, "slide5.png");
  const slide5Paths = normalizedCharacterId === "hannahbpd" ? getHannahSlide5ReferencePaths(flow) : existsSync6(flowPath) ? [flowPath] : config.slide5;
  return loadFixedReferenceImages(slide5Paths, `DBT Slide 5:${normalizedCharacterId}:${flow}`);
}
var DBT_THREE_TIPS_FIXED_PROMPT_PREFIX = "Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background.";
var DBT_THREE_TIPS_DEGRADED_PHONE_RULE = "CRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.";
var DBT_THREE_TIPS_SHARED_FIXED_PROMPT = `${DBT_THREE_TIPS_FIXED_PROMPT_PREFIX}

${DBT_THREE_TIPS_DEGRADED_PHONE_RULE}`;
var DBT_I_FEEL_SHARED_FIXED_PROMPT = `Two figures as a couple, man and woman, both mid-20s. The painting must feel clearly 19th century, and the couple should look like they are from the 19th century too. Emotional dynamic: one person says "[outside voice text]" while the other feels "[inside voice text]".
The figures should not illustrate the text literally - capture the emotional distance between them.
Painting: cracked varnish, impasto brushstrokes, muted dark warm tones, dark vignetting, canvas texture visible.

Make the painting look like the physical painting was scanned in with a super low budget scanner and therefore has a super bad visual quality. No frame visible. No text in image.`;
function buildDbtIFeelPrompt(slideText, slideNumber) {
  const dualVoice = parseDbtDualVoiceSlideText(slideText);
  const outside = dualVoice?.outside || "[outside voice text]";
  const inside = dualVoice?.inside || "[inside voice text]";
  return `Two figures as a couple, man and woman, both mid-20s. The painting must feel clearly 19th century, and the couple should look like they are from the 19th century too. Emotional dynamic: one person says "${outside}" while the other feels "${inside}".
The figures should not illustrate the text literally - capture the emotional distance between them.
Painting: cracked varnish, impasto brushstrokes, muted dark warm tones, dark vignetting, canvas texture visible.

Make the painting look like the physical painting was scanned in with a super low budget scanner and therefore has a super bad visual quality. No frame visible. No text in image.`;
}
function getDbtFixedSlide1Prompt(flow = "weird_hack") {
  if (flow === "i_say_they_say") {
    return DBT_I_FEEL_SHARED_FIXED_PROMPT;
  }
  if (flow === "three_tips") {
    return `Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background. Make sure the image contains an astonishing, amazing and real looking sky. Dont overexxagerate the look of the sky tho.

CRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.`;
  }
  return null;
}
function getDbtFixedSlide2Prompt(characterId, flow = "weird_hack") {
  if (flow === "i_say_they_say") {
    return DBT_I_FEEL_SHARED_FIXED_PROMPT;
  }
  if (flow === "three_tips") {
    return DBT_THREE_TIPS_SHARED_FIXED_PROMPT;
  }
  const basePrompt = "Create another version of the reference image with the same foggy vibe and same blurry image filter, but in a different dark setting. No face visible of person in the image, only shot from a side angle or from behind. Person should hold a cigarette, not a vape. Candid iPhone 12 shot. No text in image. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
  if (characterId === "brendabpd") {
    return "Create another version of the reference image with the same vibe but in a different dark setting, keep the sky shot the same tho. No face visible of person in the image, only shot from a side angle or from behind. Candid iPhone 12 shot. No text in image. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
  }
  return basePrompt;
}
function getDbtFixedSlide3Prompt(characterId, flow = "weird_hack") {
  if (flow === "i_say_they_say") {
    return DBT_I_FEEL_SHARED_FIXED_PROMPT;
  }
  if (flow === "three_tips") {
    return `Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background. Add some real asthetic to the image to make it look super nice for the viewers eyes.

CRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.`;
  }
  const basePrompt = "Create another version of the reference image with the same vibe but in different dark rainy setting. It should rain. Candid iPhone 12 shot. No text in image.";
  if (characterId === "brendabpd") {
    return `${basePrompt} Face of the person is not visible. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.`;
  }
  return basePrompt;
}
function getDbtFixedSlide4Prompt(flow = "weird_hack") {
  if (flow === "i_say_they_say") {
    return DBT_I_FEEL_SHARED_FIXED_PROMPT;
  }
  if (flow === "three_tips") {
    return `Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background. Add some real asthetic to the image to make it look super nice for the viewers eyes.

CRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.`;
  }
  return null;
}
function getDbtFixedSlide5Prompt(characterId, flow = "weird_hack") {
  if (flow === "i_say_they_say") {
    return DBT_I_FEEL_SHARED_FIXED_PROMPT;
  }
  if (flow === "three_tips") {
    return `Create another version of the reference image with the same hopeful and uplifting, slightly brighter vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background.

CRITICAL - keep the image aligned with the bright hopeful reference images. The scene should feel lighter, softer, and more open than Slides 1-4. The image must still look like a degraded phone photo: strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look, imperfect focus, and candid old-iPhone quality. NOT a clean or professional photo. Keep it hopeful and slightly brighter, not dark night-heavy.`;
  }
  if (characterId === "brendabpd") {
    return "Create another version of the reference image with the same vibe, keep the faceless person motive with the over the shoulder shot out of the drivers window while parked. Candid iPhone 12 shot. No text in image. Same medium quality, hopeful authentic Tiktok asthetic.";
  }
  if (!characterId || characterId === "hannahbpd") {
    return "Create another version of the reference image with the same vibe and image filter. No face visible of person in the image, only shot from a side angle or from behind when person is included. Only include a person when the reference image has one in it. Candid iPhone 12 shot. No text in image. Same medium quality, authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
  }
  return null;
}
function isTrustedFrontendOrigin(origin) {
  if (!origin)
    return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:")
      return false;
    if (hostname === "tiktok-hook-finder.vercel.app") {
      return true;
    }
    return hostname.startsWith("tiktok-hook-finder-") && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
var db = new Database(path5.join(DATA_DIR2, "hooks.db"));
initDbtJobTables(db);
var { file } = Bun;
var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
var OPENAI_API_KEY = process.env.OPENAI_API_KEY;
var API_KEYS_RAW = process.env.API_KEYS;
if (!ANTHROPIC_API_KEY || !OPENAI_API_KEY || !API_KEYS_RAW) {
  console.log("\xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F Keys not found in process.env, attempting manual load...");
  async function loadEnv(pathStr) {
    try {
      if (!existsSync6(pathStr))
        return;
      const envText = await file(pathStr).text();
      console.log(`\xC3\xB0\xC5\xB8\xE2\u20AC\u0153\xC2\x9D Loading keys from ${pathStr}`);
      const anthropicMatch = envText.match(/ANTHROPIC_API_KEY=(.*)/);
      const openaiMatch = envText.match(/OPENAI_API_KEY=(.*)/);
      const apiKeysMatch = envText.match(/API_KEYS=(.*)/);
      if (anthropicMatch && anthropicMatch[1])
        ANTHROPIC_API_KEY = anthropicMatch[1].trim();
      if (openaiMatch && openaiMatch[1])
        OPENAI_API_KEY = openaiMatch[1].trim();
      if (apiKeysMatch && apiKeysMatch[1])
        API_KEYS_RAW = apiKeysMatch[1].trim();
    } catch (e) {
      console.error(`\xC3\xA2\xC2\x9D\xC5\u2019 Failed to load ${pathStr}`);
    }
  }
  await loadEnv(path5.join(PROJECT_ROOT, ".env"));
  await loadEnv(path5.join(SERVER_ROOT3, ".env"));
}
var PORT = parseInt(process.env.PORT || "3001", 10);
var IMAGE_GEN_CONCURRENCY = Math.max(1, Math.min(4, parseInt(process.env.IMAGE_GEN_CONCURRENCY || "2", 10) || 2));
var API_KEYS = new Set(String(API_KEYS_RAW || "").split(",").map((k) => k.trim()).filter(Boolean));
console.log(`\xC3\xB0\xC5\xB8\xC5\xA1\xE2\u201A\xAC Hook Bridge API starting on http://localhost:${PORT}`);
console.log(`\xC3\xB0\xC5\xB8\xE2\u20AC\u0153\xE2\u20AC\u0161 Working Directory: ${process.cwd()}`);
console.log(`\xC3\xB0\xC5\xB8\xE2\u20AC\x9D\xE2\u20AC\u02DC Anthropic Key: ${!!ANTHROPIC_API_KEY}`);
console.log(`\xC3\xB0\xC5\xB8\xE2\u20AC\x9D\xE2\u20AC\u02DC OpenAI Key: ${!!OPENAI_API_KEY}`);
try {
  const embeddings = loadEmbeddings();
  console.log(`\xC3\xB0\xC5\xB8\xC2\xA7\xC2\xA0 Semantic search ready with ${embeddings.length} hooks`);
} catch (e) {
  console.log("\xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F Semantic search not available, falling back to archetype-based");
}
try {
  const test = db.query("SELECT 1").get();
  console.log(`\xC3\xA2\xC5\u201C\xE2\u20AC\xA6 Database connected: ${JSON.stringify(test)}`);
} catch (e) {
  console.error(`\xC3\xA2\xC2\x9D\xC5\u2019 Database connection failed:`, e);
}
var ugcBasePrompts = null;
var SYP_DIR = path5.join(DATA_DIR2, "frameworks", "SaveYourPet");
var DBT_DIR = path5.join(DATA_DIR2, "frameworks", "DBT-Mind");
try {
  const ugcBasePath = path5.join(DATA_DIR2, "ugc_base_prompts.json");
  if (existsSync6(ugcBasePath)) {
    ugcBasePrompts = JSON.parse(readFileSync6(ugcBasePath, "utf-8"));
    console.log(`\xC3\xB0\xC5\xB8\xE2\u20AC\u0153\xC2\xB8 UGC Base Prompts loaded with ${Object.keys(ugcBasePrompts.settings).length} settings`);
  }
} catch (e) {
  console.log("\xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F UGC Base Prompts not loaded, using legacy prompts");
}
function formatDbtSlide1Hook(rawHook, fallbackProblem = "this pattern") {
  const source = String(rawHook || "").trim();
  const useDbtPrefix = /^weird\s+dbt\s+hacks/i.test(source);
  const prefix = useDbtPrefix ? "Weird DBT hacks from my therapist for" : "Weird BPD hacks from my therapist for";
  let problem = source.replace(/^slide\s*1\s*:\s*/i, "").replace(/^["']|["']$/g, "").replace(/^weird\s+(dbt|bpd)\s+hacks\s+from\s+my\s+therapist\s+for\s*/i, "").replace(/\(\s*that\s+actually\s+work\s*\)\s*$/i, "").trim();
  if (!problem)
    problem = fallbackProblem;
  return `${prefix} ${problem}

(that ACTUALLY work)`;
}
var server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    console.log(`[Request] ${req.method} ${url.pathname}`);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
    };
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const sendJSON = (data, status = 200) => {
      const resp = Response.json(data, { status });
      Object.entries(corsHeaders).forEach(([k, v]) => resp.headers.set(k, v));
      return resp;
    };
    const cleanPath = url.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
    const method = req.method;
    if (cleanPath === "/health" && method === "GET") {
      return sendJSON({ ok: true, service: "hook-bridge-api" });
    }
    if (API_KEYS.size > 0) {
      const originHeader = req.headers.get("Origin") || req.headers.get("origin");
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
      const xApiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key") || "";
      const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
      const provided = (xApiKey || bearer).trim();
      const isTrustedOrigin = isTrustedFrontendOrigin(originHeader);
      if (!API_KEYS.has(provided) && !isTrustedOrigin) {
        return sendJSON({ error: "Unauthorized" }, 401);
      }
    }
    console.log(`[Router] ${method} ${url.pathname} -> Cleaned Path: ${cleanPath}`);
    if (cleanPath === "/dbt/topics" && method === "GET") {
      return sendJSON({ topics: getDbtTopics() });
    } else if (cleanPath === "/dbt/jobs" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("Anthropic API Key missing");
        const input = await req.json();
        const wantsImages = input?.generateImages !== false;
        if (wantsImages && !OPENAI_API_KEY)
          throw new Error("OpenAI API Key missing for image generation");
        const created = createDbtJob(db, input || {});
        runDbtJob(db, created.id, {
          anthropicApiKey: ANTHROPIC_API_KEY,
          openaiApiKey: OPENAI_API_KEY || undefined
        });
        return sendJSON({
          job_id: created.id,
          status: created.status
        }, 202);
      } catch (e) {
        return sendJSON({ error: "DBT job creation failed", details: String(e) }, 400);
      }
    } else if (cleanPath.startsWith("/dbt/jobs/") && method === "GET") {
      try {
        const jobId = decodeURIComponent(cleanPath.replace("/dbt/jobs/", ""));
        if (!jobId)
          return sendJSON({ error: "job id is required" }, 400);
        const job = getDbtJob(db, jobId);
        if (!job)
          return sendJSON({ error: "job not found", job_id: jobId }, 404);
        return sendJSON(job);
      } catch (e) {
        return sendJSON({ error: "DBT job fetch failed", details: String(e) }, 500);
      }
    }
    if (cleanPath === "/hooks" && method === "GET") {
      try {
        const niche = url.searchParams.get("niche");
        const archetype = url.searchParams.get("archetype");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        let query = "SELECT hook_text, view_count, archetype, niche, video_url FROM viral_hooks";
        const params = [];
        if (niche || archetype) {
          query += " WHERE";
          if (niche) {
            query += " niche LIKE ?";
            params.push(`%${niche}%`);
          }
          if (niche && archetype)
            query += " AND";
          if (archetype) {
            query += " archetype = ?";
            params.push(archetype);
          }
        }
        query += " ORDER BY view_count DESC LIMIT ?";
        params.push(limit);
        const hooks = db.query(query).all(...params);
        return sendJSON(hooks);
      } catch (e) {
        return sendJSON({ error: "Fetch failed", details: String(e) }, 500);
      }
    } else if (cleanPath === "/generate" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const body = await req.json();
        const { topic } = body;
        console.log(`[Generate] topic: ${topic}`);
        return sendJSON({ hooks: ["Test Hook 1", "Test Hook 2", "Test Hook 3"] });
      } catch (e) {
        return sendJSON({ error: "Generation failed", details: String(e) }, 500);
      }
    } else if ((cleanPath === "/improve-hook" || cleanPath === "/improve-hooks") && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const { slides, slides_text, service, slideType } = await req.json();
        const isDbtStoryFlow = service === "dbt" && (slideType === "story_telling_bf" || slideType === "story_telling_gf");
        const slideList = Array.isArray(slides) ? slides.map((s) => String(s || "").trim()) : [];
        const hookContextSlides = isDbtStoryFlow ? slideList.slice(1) : slideList;
        const storyHookContextText = hookContextSlides.map((slide, index) => `Slide ${index + 2}: ${slide}`).join(`
`);
        const fullSlideText = hookContextSlides.length > 0 ? isDbtStoryFlow ? storyHookContextText : hookContextSlides.join(`
`) : slides_text || "";
        if (!fullSlideText.trim()) {
          return sendJSON({ error: "Slides text is required" }, 400);
        }
        const isDbt = service === "dbt";
        console.log(`[Banger Hooks] Generating for: ${fullSlideText.substring(0, 50)}... (Service: ${service || "unknown"})`);
        let hookRequirementsPrompt = "";
        let systemPrompt = "";
        if (isDbtStoryFlow) {
          const storyPerspective = slideType === "story_telling_gf" ? "girlfriend" : "boyfriend";
          hookRequirementsPrompt = `Create a BANGER and VIRAL hook for this story telling post.`;
          systemPrompt = `You are a viral TikTok hook writer for raw 9-slide TikTok story posts in the BPD/DBT niche.
CRITICAL RULES:
1. Return ONLY a JSON array of 3 strings: ["hook 1", "hook 2", "hook 3"].
2. Use ONLY slides 2+ provided in the user message as context for the replacement Slide 1 hook.
3. lowercase only. no emojis. no hashtags.
4. max 20 words total per hook.
5. Each hook must work as Slide 1 for the story flow and should be a banger.
6. Write from the ${storyPerspective}'s perspective.
7. Perspective lock:
${slideType === "story_telling_gf" ? `- gf means girlfriend perspective
- the narrator is the girlfriend
- use i / me / my / my boyfriend / he / him
- never write the hook as if a boyfriend is narrating
- do not start the hook with "she"
- the hook should use "i" and/or "my boyfriend"` : `- bf means boyfriend perspective
- the narrator is the boyfriend
- use i / me / my / my girlfriend / she / her
- never write the hook as if a girlfriend is narrating
- do not use "my boyfriend" as the narrator phrase
- do not start the hook with "she"
- the hook should use "i" and/or "my girlfriend"`}
8. Match this hook style: raw, intimate, specific, emotionally honest. short punchy lines.
9. The hook should fit one of these patterns without copying them:
${slideType === "story_telling_gf" ? `- "my boyfriend watched me fall apart. and didn't look away."
- "my boyfriend did something for me that no therapist ever could. and he's not even a therapist."
- "i didn't know my boyfriend was building it. i just knew i was running out of time."` : `- "i did something kind of insane for my girlfriend. and i'd do it again in a heartbeat."
- "nobody was coming to help her. so i had to figure it out myself."
- "my girlfriend was diagnosed, waitlisted, and basically told good luck. i couldn't just sit there."`}
10. Never use weird-hack framing. Never write "weird dbt hacks" or similar.
11. No polished copywriting. Imperfect, intimate, emotionally specific beats clean.
12. Do not include "Slide 1:" in the returned hooks.`;
        } else if (isDbt) {
          hookRequirementsPrompt = `For this slide post, create an ABSOLUTE VIRAL BANGER HOOK, which will replace the current cheap slide 1 hook. Give me three options. The post will be in the BPD niche on Tiktok. The hook must create ABSOLUTE curiosity within the first 3 seconds and must be like a cliffhanger is a good series. Use the best fitting option from this framework:

Here are the 4 hook frameworks that consistently trigger all 6 behaviors: 

The Forbidden Knowledge Hook "Secrets I learned working at [company]" "What [industry] doesn't want you to know" "I got fired for sharing this" Why it works: Creates instant curiosity gap. Viewer HAS to know the secret. High completion rate because they're waiting for the reveal.

The Specific Number Hook "5 ways to [outcome] that actually work" "I made $4,431 last week doing this" "3 things I wish I knew before [experience]" Why it works: Numbers create concrete expectations. Viewer knows exactly what they're getting. Easy to consume. High save rate.

The Pattern Interrupt Hook "This is wrong but it works" "I shouldn't be telling you this" "Everyone does X but here's what actually happens" Why it works: Challenges existing beliefs. Creates cognitive dissonance that demands resolution. High comment rate because people want to argue or agree.

The Transformation Hook "How I went from [bad state] to [good state]" "6 months ago I was [struggle]. Now [success]" "The thing that changed everything for me"`;
          systemPrompt = `You are a viral TikTok hook writer for the BPD niche. Your task is to generate 3 viral banger hooks in JSON format.
CRITICAL RULES:
1. Return ONLY a JSON array of 3 strings: ["hook 1", "hook 2", "hook 3"].
2. Use ONLY the slide content provided in the user message for context.
3. Lowercase only. No exclamation points.
4. Each hook must follow one of the 4 frameworks provided (Forbidden Knowledge, Specific Number, Pattern Interrupt, or Transformation).
5. Max 15 words per hook.`;
        } else {
          hookRequirementsPrompt = `You are generating TikTok hooks for a viral account. Your job is to create scroll-stopping hooks.
                        
THE GOAL: Make the viewer stop scrolling and immediately want to see the next slide.

HOOK RULES:
1. MAX 15 WORDS \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D shorter is almost always better
2. NO QUESTIONS \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D statements hit harder than questions
3. NO EMOJIS \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D breaks the tone
4. LOWERCASE \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D feels intimate, not performative`;
          systemPrompt = `You are a viral TikTok hook writer. Your task is to generate 3 hooks in JSON format.
CRITICAL RULES:
1. Return ONLY a JSON array of 3 strings: ["hook 1", "hook 2", "hook 3"].
2. Use ONLY the slide content provided in the user message for context.
3. Strictly follow the "NO FILLER WORDS", "MAX 15 WORDS", and "LOWERCASE" rules.`;
        }
        const userPrompt = isDbtStoryFlow ? `Story post structure:
Slide 1: [your hook comes here]
${fullSlideText}

${hookRequirementsPrompt}` : `Slide Content: 
${fullSlideText}

${hookRequirementsPrompt}`;
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          })
        });
        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error("[Banger Hooks] Anthropic API Error:", errorText);
          return sendJSON({ error: "Anthropic API Error", details: errorText }, claudeResponse.status);
        }
        const rawData = await claudeResponse.json();
        const resultText = rawData.content?.[0]?.text || "";
        if (!resultText) {
          return sendJSON({ error: "Empty AI response" }, 500);
        }
        let hooks = [];
        try {
          const jsonMatch = resultText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            hooks = JSON.parse(jsonMatch[0]);
          } else {
            hooks = JSON.parse(resultText);
          }
        } catch (parseErr) {
          const matches = resultText.match(/"([^"]+)"/g);
          if (matches) {
            hooks = matches.slice(0, 3).map((m) => m.replace(/"/g, ""));
          }
        }
        if (!hooks || hooks.length === 0) {
          return sendJSON({ error: "Failed to generate hooks" }, 500);
        }
        const normalizedHooks = hooks.map((h) => String(h || "").trim().replace(/^slide\s*1\s*:\s*/i, "")).slice(0, 3);
        const finalHooks = isDbtStoryFlow ? normalizedHooks : isDbt ? normalizedHooks.map((h) => formatDbtSlide1Hook(h)) : normalizedHooks.map((h) => h.toLowerCase());
        return sendJSON({
          hooks: finalHooks
        });
      } catch (e) {
        console.error("[Banger Hooks] Error:", e);
        return sendJSON({ error: "Hook generation failed", details: String(e) }, 500);
      }
    } else if (cleanPath === "/improve-app-mention" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const { slides, service } = await req.json();
        const fullSlideText = Array.isArray(slides) ? slides.join(`
`) : "";
        if (!fullSlideText.trim()) {
          return sendJSON({ error: "Slides text is required" }, 400);
        }
        console.log(`[App Mention] Improving for: ${fullSlideText.substring(0, 50)}...`);
        const systemPrompt = `You are an expert in viral TikTok content for the mental health niche, specifically BPD/DBT communities. Your task is to seamlessly integrate a DBT app mention into an emotional slideshow post without breaking the raw, confessional tone that makes these posts resonate.
Context:
- The slide post is marketing a DBT app, but should never feel like marketing
- The goal is to make viewers curious enough to comment "what app?"
- The target audience is people with BPD or emotional regulation struggles who scroll TikTok for relatable content

The Problem You're Solving:
The final slide often breaks the emotional flow by shifting into "solution mode" or "recommendation mode." This kills the authenticity that made the earlier slides hit. Your job is to fix this.

Rules for the Integrated Slide:
1. Maintain first-person confessional voice \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D The slide must sound like a whispered admission, not advice
2. Use "my dbt app" \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D Never "a dbt app" or "this dbt app I found." "My" signals personal ownership, like mentioning "my therapist" or "my journal"
3. Connect to earlier slide language \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D Reference a feeling, behavior, or phrase from the previous slides to create continuity
4. Show the action, don't explain the skill \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D Instead of "it has this skill called opposite action," say what you actually do: "do the opposite of what my brain wants"
5. Keep it imperfect \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D Avoid toxic positivity. Words like "sometimes," "trying to," or "it's hard but" maintain honesty
6. No CTA energy \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D Never "you should try" or "it really helps." The slide is about you, not them
7. Preserve the rhythm \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\x9D Match the sentence length and cadence of the other slides. Short lines. Breath between thoughts.
8. Lowercase only. No exclamation points.
9. Return ONLY a JSON array of 3 strings: ["option 1", "option 2", "option 3"].`;
        const userPrompt = `Slide Content: 
${fullSlideText}

Based on the context above, generate three options for the integrated app mention slide.`;
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          })
        });
        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error("[App Mention] Anthropic API Error:", errorText);
          return sendJSON({ error: "Anthropic API Error", details: errorText }, claudeResponse.status);
        }
        const rawData = await claudeResponse.json();
        const resultText = rawData.content?.[0]?.text || "";
        if (!resultText) {
          return sendJSON({ error: "Empty AI response" }, 500);
        }
        let mentions = [];
        try {
          const jsonMatch = resultText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            mentions = JSON.parse(jsonMatch[0]);
          } else {
            mentions = JSON.parse(resultText);
          }
        } catch (parseErr) {
          const matches = resultText.match(/"([^"]+)"/g);
          if (matches) {
            mentions = matches.slice(0, 3).map((m) => m.replace(/"/g, ""));
          }
        }
        return sendJSON({
          mentions: mentions.map((m) => m.toLowerCase()).slice(0, 3)
        });
      } catch (e) {
        console.error("[App Mention] Error:", e);
        return sendJSON({ error: "App mention improvement failed", details: String(e) }, 500);
      }
    } else if (cleanPath === "/personas" && method === "GET") {
      try {
        const projectFilter = url.searchParams.get("project");
        const personasPath = path5.join(DATA_DIR2, "personas.json");
        const personasData = JSON.parse(readFileSync6(personasPath, "utf-8"));
        let personas = personasData.personas;
        if (projectFilter) {
          personas = personas.filter((p) => p.supported_projects && p.supported_projects.includes(projectFilter));
        }
        const personasWithAnchors = personas.map((p) => {
          const anchor = getAnchorImage(p.id, ANCHORS_DIR);
          return {
            ...p,
            hasAnchor: !!anchor,
            anchorData: anchor ? anchor.data : null
          };
        });
        return sendJSON({ personas: personasWithAnchors });
      } catch (e) {
        return sendJSON({ error: "Failed to load personas" }, 500);
      }
    } else if (cleanPath === "/syp-profiles" && method === "GET") {
      try {
        const profilesPath = path5.join(DATA_DIR2, "syp_profiles.json");
        let profiles = [];
        if (existsSync6(profilesPath)) {
          const profilesData = JSON.parse(readFileSync6(profilesPath, "utf-8"));
          profiles = profilesData.profiles || [];
        } else {
          profiles = [
            { id: "lisa_milo", name: "Lisa & Milo (Hund)", type: "dog" },
            { id: "anna_simba", name: "Anna & Simba (Katze)", type: "cat" },
            { id: "sarah_luna", name: "Sarah & Luna (Katze)", type: "cat" },
            { id: "julia_balu", name: "Julia & Balu (Hund)", type: "dog" }
          ];
        }
        const profilesWithAnchor = profiles.map((p) => {
          const anchor = getAnchorImage(p.id, ANCHORS_DIR);
          return {
            ...p,
            hasAnchor: !!anchor,
            anchorData: anchor ? anchor.data : null
          };
        });
        return sendJSON({ profiles: profilesWithAnchor });
      } catch (e) {
        console.error("[SYP Profiles] Error:", e);
        return sendJSON({ error: "Failed to load SYP profiles" }, 500);
      }
    } else if (cleanPath === "/set-persona-anchor" && method === "POST") {
      try {
        const { persona_id, image_data } = await req.json();
        if (!persona_id || !image_data)
          return sendJSON({ error: "Missing data" }, 400);
        const filePath = path5.join(ANCHORS_DIR, `${persona_id}.png`);
        const base64Data = image_data.replace(/^data:image\/\w+;base64,/, "");
        writeFileSync2(filePath, Buffer.from(base64Data, "base64"));
        console.log(`[Anchor] Saved character anchor for ${persona_id}`);
        return sendJSON({ success: true, message: "Anchor saved" });
      } catch (e) {
        return sendJSON({ error: "Failed to save anchor", details: String(e) }, 500);
      }
    } else if (cleanPath === "/persona-anchor" && method === "DELETE") {
      try {
        const persona_id = url.searchParams.get("persona_id");
        console.log(`[Anchor] Received DELETE request for persona_id: ${persona_id}`);
        if (!persona_id)
          return sendJSON({ error: "Missing ID" }, 400);
        const filePath = path5.join(ANCHORS_DIR, `${persona_id}.png`);
        console.log(`[Anchor] Target file for deletion: ${filePath}`);
        if (existsSync6(filePath)) {
          unlinkSync(filePath);
          console.log(`[Anchor] Successfully deleted anchor for ${persona_id}`);
        } else {
          console.log(`[Anchor] Anchor file for ${persona_id} not found at ${filePath}`);
        }
        return sendJSON({ success: true, message: "Anchor removed" });
      } catch (e) {
        console.error("[Anchor] Failed to remove anchor:", e);
        return sendJSON({ error: "Failed to remove anchor", details: String(e) }, 500);
      }
    } else if (cleanPath === "/generate-image-prompts" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const { slides, character_id, character, setting_override, framing, theme, partner_anchor, service, brandingMode, artStyle, flow } = await req.json();
        const resolvedCharacterId = character_id || character;
        const effectiveArtStyle = service === "dbt" ? "symbolic" : artStyle;
        const effectiveFlow = service === "dbt" ? flow || "weird_hack" : flow;
        if (!slides || !Array.isArray(slides) || slides.length === 0) {
          return sendJSON({ error: "Slides array is required" }, 400);
        }
        const isSypProject = service === "syp";
        const isDbtProject = service === "dbt";
        const personasPath = path5.join(DATA_DIR2, "personas.json");
        const personasData = JSON.parse(readFileSync6(personasPath, "utf-8"));
        let effectiveCharacterId = resolvedCharacterId;
        if (isSypProject && resolvedCharacterId) {
          const sypProfileMapping = {
            lisa_milo: { personaId: "lisa", type: "dog", petDesc: "fluffy golden retriever named Milo looking curious and playful" },
            anna_simba: { personaId: "luna", type: "cat", petDesc: "orange tabby cat named Simba looking regal and slightly judgy" },
            sarah_luna: { personaId: "luna", type: "cat", petDesc: "elegant gray cat named Luna with piercing green eyes" },
            julia_balu: { personaId: "mia", type: "dog", petDesc: "happy labrador named Balu with tongue out" }
          };
          const sypProfile = sypProfileMapping[resolvedCharacterId];
          if (sypProfile) {
            effectiveCharacterId = sypProfile.personaId;
            console.log(`[Image Prompts] SYP profile '${resolvedCharacterId}' mapped to persona '${effectiveCharacterId}' (${sypProfile.type})`);
          }
        }
        let persona = personasData.personas.find((p) => p.id === effectiveCharacterId) || personasData.personas[0];
        if (isSypProject && resolvedCharacterId) {
          const sypProfiles = {
            lisa_milo: { type: "dog", petDesc: "fluffy golden retriever named Milo looking curious and playful" },
            anna_simba: { type: "cat", petDesc: "orange tabby cat named Simba looking regal and slightly judgy" },
            sarah_luna: { type: "cat", petDesc: "elegant gray cat named Luna with piercing green eyes" },
            julia_balu: { type: "dog", petDesc: "happy labrador named Balu with tongue out" }
          };
          const sypProfile = sypProfiles[resolvedCharacterId];
          if (sypProfile && persona.pet) {
            persona = {
              ...persona,
              pet: {
                type: sypProfile.type,
                description: sypProfile.petDesc
              }
            };
          }
        }
        let selectedOutfit = null;
        let selectedSetting = null;
        if (isSypProject) {
          try {
            const outfitsPath = path5.join(DATA_DIR2, "syp_outfits.json");
            if (existsSync6(outfitsPath)) {
              const outfitsData = JSON.parse(readFileSync6(outfitsPath, "utf-8"));
              const outfits = outfitsData.outfits;
              selectedOutfit = outfits[Math.floor(Math.random() * outfits.length)];
              console.log(`[Image Prompts] Selected outfit: ${selectedOutfit.id} - ${selectedOutfit.name}`);
            }
            const settingsPath = path5.join(DATA_DIR2, "syp_settings.json");
            if (existsSync6(settingsPath)) {
              const settingsData = JSON.parse(readFileSync6(settingsPath, "utf-8"));
              const settings = settingsData.settings;
              selectedSetting = settings[Math.floor(Math.random() * settings.length)];
              console.log(`[Image Prompts] Selected setting: ${selectedSetting.id} - ${selectedSetting.name}`);
            }
          } catch (e) {
            console.log("[Image Prompts] Error loading SYP extras:", e);
          }
        }
        const scrollStoppersPath = path5.join(DATA_DIR2, "scroll_stoppers.json");
        const scrollStoppers = JSON.parse(readFileSync6(scrollStoppersPath, "utf-8"));
        const friendFramings = ["watching_my_friend"];
        const isFriendContent = !isSypProject && friendFramings.includes(framing);
        if (isDbtProject) {
          const selectedArtStyle = ART_STYLES[effectiveArtStyle] || ART_STYLES.symbolic;
          const isSymbolic = selectedArtStyle.id === "symbolic";
          const isWeirdHackFlow = effectiveFlow === "weird_hack" || effectiveFlow === "weird_hack_v2";
          console.log(`[Image Prompts] Generating ${selectedArtStyle.name} prompts for DBT-Mind with ${slides.length} slides${isSymbolic ? " (Symbolic Mode)" : ""}${isWeirdHackFlow ? " (Weird Hack Flow)" : ""}`);
          const normalizedSlides = slides.map((s) => String(s || "").trim());
          const staticSlides = {};
          const usesStaticDbtSlide1Template = effectiveFlow === "weird_hack" || effectiveFlow === "weird_hack_v2";
          const usesStaticDbtSlide6Template = effectiveFlow === "weird_hack";
          if (isSymbolic && usesStaticDbtSlide1Template) {
            staticSlides[1] = getDbtStaticSlidePath(resolvedCharacterId, 1, effectiveFlow) || "slide1.png";
          }
          if (isDbtProject && slides.length >= 6 && usesStaticDbtSlide6Template)
            staticSlides[6] = getDbtStaticSlidePath(resolvedCharacterId, 6, effectiveFlow);
          if (effectiveFlow === "weird_hack_v2") {
            const weirdHackV2Prompts = await generateWeirdHackV2ImagePrompts(normalizedSlides, ANTHROPIC_API_KEY);
            const parsed2 = {};
            if (weirdHackV2Prompts.slide2)
              parsed2.image2 = weirdHackV2Prompts.slide2;
            if (weirdHackV2Prompts.slide3)
              parsed2.image3 = weirdHackV2Prompts.slide3;
            if (weirdHackV2Prompts.slide4)
              parsed2.image4 = weirdHackV2Prompts.slide4;
            if (weirdHackV2Prompts.slide5)
              parsed2.image5 = weirdHackV2Prompts.slide5;
            if (weirdHackV2Prompts.slide6)
              parsed2.image6 = weirdHackV2Prompts.slide6;
            if (weirdHackV2Prompts.slide7)
              parsed2.image7 = weirdHackV2Prompts.slide7;
            if (weirdHackV2Prompts.slide8)
              parsed2.image8 = weirdHackV2Prompts.slide8;
            const prompts2 = normalizedSlides.map((_, index) => parsed2[`image${index + 1}`] || null);
            return sendJSON({
              prompts: prompts2,
              image_prompts: parsed2,
              is_painting_style: false,
              useStaticSlide1: isSymbolic && usesStaticDbtSlide1Template,
              staticSlides
            });
          }
          const parsed = {};
          const fixedSlide1ReferencePrompt = getDbtFixedSlide1Prompt(effectiveFlow);
          const fixedSlide2ReferencePrompt = getDbtFixedSlide2Prompt(resolvedCharacterId, effectiveFlow);
          const fixedSlide3ReferencePrompt = getDbtFixedSlide3Prompt(resolvedCharacterId, effectiveFlow);
          const fixedSlide4ReferencePrompt = getDbtFixedSlide4Prompt(effectiveFlow);
          const fixedSlide5ReferencePrompt = getDbtFixedSlide5Prompt(resolvedCharacterId, effectiveFlow);
          if (normalizedSlides.length >= 1 && fixedSlide1ReferencePrompt) {
            parsed.image1 = fixedSlide1ReferencePrompt;
          }
          if (normalizedSlides.length >= 2) {
            parsed.image2 = fixedSlide2ReferencePrompt;
          }
          if (normalizedSlides.length >= 3) {
            parsed.image3 = fixedSlide3ReferencePrompt;
          }
          if (normalizedSlides.length >= 4 && fixedSlide4ReferencePrompt) {
            parsed.image4 = fixedSlide4ReferencePrompt;
          }
          if (normalizedSlides.length >= 5 && fixedSlide5ReferencePrompt) {
            parsed.image5 = fixedSlide5ReferencePrompt;
          }
          if (effectiveFlow === "weird_hack" || effectiveFlow === "weird_hack_v2") {
            if (normalizedSlides.length >= 4 && (!parsed.image4 || !String(parsed.image4).trim())) {
              parsed.image4 = "dark-to-warm gradient background, abstract minimal transition, no distinct scene.";
            }
          }
          if (effectiveFlow === "i_say_they_say") {
            normalizedSlides.forEach((slideText, index) => {
              parsed[`image${index + 1}`] = buildDbtIFeelPrompt(slideText, index + 1);
            });
          }
          const prompts = normalizedSlides.map((_, index) => parsed[`image${index + 1}`] || null);
          return sendJSON({
            prompts,
            image_prompts: parsed,
            is_painting_style: true,
            useStaticSlide1: isSymbolic && usesStaticDbtSlide1Template,
            staticSlides
          });
        } else {
          console.log(`[Image Prompts] Generating UGC-style prompts for ${persona.name} (${persona.subject.hair.color} / ${persona.pet?.type || "no pet"} / ${service}) with ${slides.length} slides`);
          console.log(`[Image Prompts] Service: ${service || "syp"}, Framing: ${framing || "none"}`);
          let saveyourpetSlideInstruction = "";
          if (isSypProject) {
            const saveyourpetKeywords = [
              "saveyourpet.de",
              "saveyourpet",
              "absicherung",
              "vorsorge",
              "schutz f\xC3\u0192\xC2\xBCr",
              "was wenn er mal krank wird",
              "was wenn sie mal krank wird",
              "bin ich auf einen notfall vorbereitet",
              "sollte ich mich besser absichern",
              "hat vorgesorgt",
              "hat sich um absicherung gek\xC3\u0192\xC2\xBCmmert"
            ];
            const saveyourpetSlideIndices = [];
            slides.forEach((slide, index) => {
              const lowerSlide = slide.toLowerCase();
              if (saveyourpetKeywords.some((keyword) => lowerSlide.includes(keyword))) {
                saveyourpetSlideIndices.push(index + 1);
                console.log(`[Image Prompts] Detected saveyourpet.de content in Slide ${index + 1}: "${slide.substring(0, 50)}..."`);
              }
            });
            if (saveyourpetSlideIndices.length > 0 && brandingMode === "full") {
              console.log(`[Image Prompts] Will apply LAPTOP/OVER-THE-SHOULDER prompt for slide(s): ${saveyourpetSlideIndices.join(", ")}`);
              const petNames = {
                lisa_milo: "Milo",
                anna_simba: "Simba",
                sarah_luna: "Luna",
                julia_balu: "Balu"
              };
              const petName = petNames[resolvedCharacterId] || "the pet";
              saveyourpetSlideInstruction = `

## \xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F CRITICAL: SAVEYOURPET.DE SLIDE SPECIAL TREATMENT
For slide(s) ${saveyourpetSlideIndices.join(", ")} (contains saveyourpet.de / Absicherung / Vorsorge content):

**DO NOT use iPhone selfie format for these slides!**

Instead, use this EXACT format:
"Over-the-shoulder shot, same ${persona.subject.hair.color} girl on bed looking at laptop screen showing saveyourpet.de website, ${petName} sleeping behind laptop, soft lamp lighting, cozy bedroom, raw UGC aesthetic, laptop screen clearly visible (25-40% of frame)"

**KEY DIFFERENCES for saveyourpet.de slides:**
- Camera angle: OVER-THE-SHOULDER (not selfie)
- Device: LAPTOP (not phone)
- Laptop shows: saveyourpet.de website
- Pet position: Sleeping BEHIND the laptop or nearby
- Setting: On bed, cozy apartment vibe

This is the ONLY slide type where a device screen is shown prominently.`;
            }
          }
          const slide1Text = slides[0] || "";
          const ugcSlide1Prompt = buildUGCSlide1Prompt(persona, scrollStoppers, slide1Text, ugcBasePrompts, setting_override, isSypProject, DATA_DIR2, selectedOutfit, selectedSetting);
          console.log(`[Image Prompts] UGC Slide 1 built: ${ugcSlide1Prompt.substring(0, 100)}...`);
          const expressionList = scrollStoppers.expressions.map((e) => `- ${e.id}: ${e.description}`).join(`
`);
          let framingContextSection = "";
          if (isFriendContent) {
            framingContextSection = `
## \xC3\xB0\xC5\xB8\xE2\u20AC\u02DC\xC2\xAF FRIEND POV FRAMING
This is "watching my friend" content - the narrator is a FRIEND observing.

**SLIDE ANALYSIS:**
- The friend (narrator) is watching/reacting to the girl's BPD moments
- Some slides may need TWO GIRLS (the friend and the girl with BPD)
- The friend has a loving, amused, supportive energy
`;
          }
          const systemPrompt = `You create image prompts for TikTok selfie slideshows.

## PRE-BUILT SLIDE 1 (ALREADY DONE - DO NOT CHANGE):
We have already built a hyper-realistic UGC-style prompt for Slide 1:
"${ugcSlide1Prompt}"

YOUR JOB: Create prompts for SLIDES 2-6 ONLY.
${framingContextSection}${saveyourpetSlideInstruction}
## CHARACTER CONSISTENCY (CRITICAL - same girl all slides):
- Hair: ${persona.subject.hair.color}, ${persona.subject.hair.style}
- Age: ${persona.subject.age}
- Face: ${persona.face.makeup}, ${persona.face.skin}${persona.subject?.body ? `
- Body: ${persona.subject.body.figure}` : ""}
- Accessories: ${persona.accessories.earrings}, ${persona.accessories.jewelry || "none"}
- Clothing: ${selectedOutfit ? selectedOutfit.description : "same outfit as Slide 1"} (SAME clothing all slides)
- Setting: ${selectedSetting ? selectedSetting.description : "cozy home environment"} (SAME location all slides)
- PET: ${persona.pet?.description || "none"} (include in 1-2 slides if appropriate)

## UGC AESTHETIC (CRITICAL - apply to all):
- iPhone front-camera selfie style
- Slight wide-angle distortion, visible grain
- No ring light, no professional lighting
- ${isSypProject ? "Authentic pet owner energy, theatrical comedy vibe" : "Authentic mental health creator energy"}
- Raw UGC aesthetic, not polished
- \xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F SELFIE HAND LOGIC: ONE HAND MUST HOLD THE PHONE to take the photo!
- \xC3\xA2\xC2\x9D\xC5\u2019 NEVER: phone in hands showing something, both hands on face/mouth, hands together in prayer, any pose requiring BOTH hands
- \xC3\xA2\xC2\x9D\xC5\u2019 NEVER SHOW A PET ON A COUNTER: No pets on kitchen counters, tables, or raised surfaces. Pet must be on floor, bed, or couch.
- \xC3\xA2\xC5\u201C\xE2\u20AC\xA6 VALID: One hand gesturing, touching face, petting pet, etc. (the other hand holds phone - never mention it)

## EXPRESSION OPTIONS (pick appropriate one for each slide's emotion):
${expressionList}

## SLIDES 2-6 FORMAT:
Each prompt should be a single descriptive sentence:
"Same ${persona.subject.hair.color} girl${persona.subject?.body ? `, ${persona.subject.body.figure}` : ""}, ${selectedOutfit ? selectedOutfit.description : "same outfit as Slide 1"}, [EXPRESSION], in ${selectedSetting ? selectedSetting.description : "same setting as Slide 1"}, ${persona.pet?.type ? persona.pet.type + " nearby" : ""}, iPhone front-camera selfie, ${selectedSetting?.lighting || "warm lighting"}, raw UGC aesthetic"

## EMOTIONAL PROGRESSION GUIDE:
- Slide 2: escalation emotion (shocked, suspicious, concerned)
- Slide 3: listing/explaining (thoughtful, direct)
- Slide 4: processing (contemplative, slight understanding)
- Slide 5: realization/tool usage (soft half-smile, figured something out)
- Slide 6: hopeful close (genuine warmth, peaceful, grounded)`;
          const userPrompt = `Generate image prompts for SLIDES 2-${slides.length} ONLY.

SLIDE TEXT:
${slides.map((s, i) => `Slide ${i + 1}: "${s}"`).join(`
`)}

Return JSON with this exact structure:
{
  "image1": "ALREADY BUILT - USE THE UGC PROMPT PROVIDED",
${Array.from({ length: slides.length - 1 }, (_, i) => `  "image${i + 2}": "[prompt for slide ${i + 2}]"`).join(`,
`)}
}

REMINDER: image1 is already done. Just fill in image2-image${slides.length} with descriptive prompts.`;
          const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 2500,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt }]
            })
          });
          if (!claudeResponse.ok) {
            const errorText = await claudeResponse.text();
            console.error("[UGC Image Prompts] Error:", errorText);
            return sendJSON({ error: "Anthropic API Error" }, 500);
          }
          const rawData = await claudeResponse.json();
          const resultText = rawData.content?.[0]?.text || "";
          let parsed;
          try {
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
          } catch (parseErr) {
            console.error("[UGC Image Prompts] JSON Parse Error:", parseErr);
            console.info("[UGC Image Prompts] Raw AI Response:", resultText);
            return sendJSON({ error: "Failed to parse image prompts", details: String(parseErr), raw: resultText.substring(0, 1000) }, 500);
          }
          parsed.image1 = ugcSlide1Prompt;
          const prompts = Object.keys(parsed).filter((key) => key.startsWith("image")).sort((a, b) => (parseInt(a.replace("image", "")) || 0) - (parseInt(b.replace("image", "")) || 0)).map((key) => parsed[key]);
          return sendJSON({
            prompts,
            image_prompts: parsed,
            character_name: persona.name
          });
        }
      } catch (e) {
        console.error("[Image Prompts] Error:", e);
        return sendJSON({ error: "Image prompts generation failed", details: String(e) }, 500);
      }
    } else if (cleanPath === "/generate-native-slides" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const { format, topic, profile, service, includeBranding, brandingMode, slideType } = await req.json();
        let result;
        if (service === "syp" || profile) {
          result = await generateSypSlides({
            profile: profile || "lisa_milo",
            topic: topic || "lifestyle_random",
            ANTHROPIC_API_KEY,
            DATA_DIR: DATA_DIR2,
            SYP_DIR,
            ugcBasePrompts,
            brandingMode: brandingMode || (includeBranding !== false ? "full" : "none")
          });
        } else {
          result = await generateDbtSlides({
            format: format || "relatable",
            topic: topic || "favorite_person",
            slideType: slideType || "weird_hack",
            ANTHROPIC_API_KEY,
            includeBranding: includeBranding !== false
          });
        }
        if (result.slides && Array.isArray(result.slides)) {
          result.slides = result.slides.map((text, i) => `Slide ${i + 1}: ${text}`);
        }
        return sendJSON(result);
      } catch (e) {
        console.error("Native Slides API Error:", e);
        return sendJSON({ error: "Native generation failed", details: String(e) }, 500);
      }
    } else if (cleanPath === "/generate-metadata" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const { slides_text, service, includeBranding, brandingMode, slideType } = await req.json();
        if (!slides_text || !slides_text.trim()) {
          return sendJSON({ error: "Slides text is required" }, 400);
        }
        const isDbt = service === "dbt";
        const isSyp = service === "syp";
        const isWeirdHackV2 = isDbt && slideType === "weird_hack_v2";
        const isPermissionV1 = isDbt && slideType === "permission_v1";
        const needsDbtBrandingInDescription = isDbt;
        const needsSypBrandingInDescription = isSyp && brandingMode === "soft";
        console.log(`[Metadata Gen] Generating for: ${slides_text.substring(0, 50)}... (service: ${service || "unknown"}, dbt: ${isDbt}, syp brandingMode: ${brandingMode || "n/a"})`);
        let brandingInstruction = "";
        if (isWeirdHackV2) {
          brandingInstruction = `
## CRITICAL: WEIRD_HACK_V2 CAPTION FRAMEWORK (GEN-Z DEADPAN VOICE)

This caption must match the deadpan, self-deprecating, slightly-exhausted voice of the slide carousel. Not therapeutic. Not educational. Not polished. Written like someone typing a confession into notes app at 11pm.

### STRUCTURE (4 parts, in this exact order):

1) **App mention as opener (1 line, \u226415 words)**
   - MUST start with "the dbt-mind app" as the first 3 words of the description.
   - The sentence frames the app as a tool the narrator uses, casually, like mentioning a productivity tool to a friend.
   - Reference at least one specific hack or concept from the slides (90-minute rule, screenshot predictions, the scan, the paragraph text, etc).
   - Example openers:
     - "the dbt-mind app is where i keep the 90-min rule now. also the screenshot one."
     - "the dbt-mind app has check the facts built in. that's mostly what i use it for."
     - "the dbt-mind app tracks this for me. i'd forget otherwise."
   - NEVER write "download the dbt-mind app" or "check out dbt-mind" \u2014 those are ad voices.
   - NEVER write "DBT-Mind" with capitals. Always lowercase "dbt-mind app".

2) **Deadpan reflection (1 line, \u226415 words)**
   - Continues the confession voice of the slides.
   - Names something real the narrator still struggles with. Keeps emotional tension \u2014 does NOT wrap things up tidily.
   - Examples:
     - "the scan still happens. i just lose to it less."
     - "honestly made peace with the fact that 'just stop scanning' was never gonna be the answer."
     - "not fixed. just slightly less feral at 2am."
   - Lowercase. Fragments welcome. No semicolons.

3) **Micro-closer (optional, 1 short line)**
   - Only include if it adds something \u2014 otherwise skip.
   - Can be a single word or phrase. Examples: "anyway.", "that's it.", "ok bye.", "wish i'd learned this sooner."
   - Never motivational ("you've got this!"). Never earnest ("healing is a journey").

4) **Hashtags (final line, on its own line)**
   - Always include: #bpd #bpdtiktok #dbt #bpdrecovery
   - Add 1-2 topic-specific hashtags based on slide content. Good options: #fp #quietbpd #dbtskills #splitting #rsd #fpdynamics #attachmentstyle
   - Total 5-7 hashtags MAX. Never exceed 7.
   - NEVER use #fyp or #foryou \u2014 these are dead signals in 2026 and get downranked.

### EMOJI RULES (STRICT):

Allowed emojis only (use 0-2 total across the entire caption):
- \uD83E\uDEF6 (soft affection, replacement for \u2764\uFE0F)
- \uD83E\uDEE0 (melting face \u2014 overwhelm, dissociation, "i can't")
- \uD83D\uDE35\u200D\uD83D\uDCAB (spiral eyes \u2014 anxiety, brain rot)
- \uD83E\uDEE5 (dotted line face \u2014 invisible, ghosted)
- \uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F (face in clouds \u2014 dissociating, spacing out)
- \uD83E\uDD72 (tearful smile \u2014 bittersweet, coping)
- \uD83D\uDC80 (self-deprecating laughter after a painful admission)
- \uD83D\uDE2D (laughing OR actually crying, context-dependent)
- \uD83D\uDE14 (quiet sad)

BANNED emojis (reading as millennial-coded, corporate, or overused):
- \u274C \u2764\uFE0F \u2728 \uD83D\uDC85 \uD83D\uDE02 \uD83D\uDC4D \uD83D\uDE4C \uD83D\uDD25 \uD83D\uDCAF \uD83C\uDF89 \uD83E\uDD70 \uD83E\uDD79 \uD83E\uDD0D \uD83D\uDC95

Emoji placement: end of a line, never mid-sentence. Stacking emojis (\uD83E\uDEE0\uD83E\uDEE0\uD83E\uDEE0) is banned \u2014 one emoji does the work.

Default to ZERO emojis. Only add one if it genuinely lands. Over-use of emojis is the #1 tell of generated content.

### TITLE RULES (for the "title" field):

- 1 line, \u226460 characters
- Lowercase
- Fragment allowed
- Should work as a scroll-stopper if used as the video's visible title
- Pull the strongest reframe phrase from slide 6 or the hook as the title
- Examples:
  - "treating his typing speed like a vital sign \uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F"
  - "the scan just never got the memo"
  - "my brain wrote the breakup in 3 seconds"
- NEVER title-case. NEVER include "BPD tips" or "DBT hacks" framing \u2014 those are content-marketer titles.

### LANGUAGE: ENGLISH

### EXAMPLE OUTPUT for this voice:
{"title":"treating his typing speed like a vital sign","description":"the dbt-mind app is where the 90-min rule lives now. also the screenshot one. that's mostly what i use it for.
the scan still happens. i just lose to it less \uD83E\uDEE0
anyway.
#bpd #bpdtiktok #dbt #bpdrecovery #fp #attachmentstyle"}

### WHAT TO AVOID:
- \u274C "Struggling with BPD? Here's what helped me!" (ad voice)
- \u274C "This post hit different \uD83D\uDCAF\uD83D\uDD25" (wrong emojis, wrong voice)
- \u274C "Healing is not linear \u2728" (corny + banned emoji)
- \u274C "Tag someone who needs this" (engagement farming)
- \u274C "Download DBT-Mind today" (ad voice)
- \u274C Mentioning the app more than once in the description
`;
        } else if (isPermissionV1) {
          brandingInstruction = `
CRITICAL: PERMISSION_V1 CAPTION FRAMEWORK (WARM, DIRECT, BPD-COMMUNITY VOICE)

This caption must match the warm, direct, permission-giving voice of the permission_v1 slide carousel. Unlike weird_hack_v2's deadpan-confession voice, permission_v1 is warmer - "a friend telling you something they've been wanting to say." Quiet. Kind. Still Gen-Z, still lowercase, still fragment-tolerant, but softer.

The slides follow this emotional arc: shame-word hook -> shared accusations -> mechanism reveal -> identity reframe -> positive flip -> explicit permission -> naming the secret effort. The caption should extend this arc, not restart it.

STRUCTURE (3 parts, in this exact order):

App mention as opener (1 line, <=22 words)

- MUST start with "the dbt-mind app" as the first 3 words.
- The sentence frames the app as something the narrator personally uses. Casual, first-person. Never "download" or "check out" voice.
- The app capability referenced MUST match the topic of the post. Use the slide content to infer the topic. Match examples:

Identity/self topics ("empty", "broken", "unstable", "pathetic", "a burden") -> "where i started writing down who i actually am" / "where i keep what i'm learning about myself" / "where i hold the new version of me when the old story tries to come back"
Emotion/regulation topics ("too much", "too intense", "dramatic", "oversensitive", "crazy", "irrational") -> "where the reframes live when i can't find them at 3am" / "where i track what actually works when i'm dysregulated"
Attachment/relational topics ("needy", "obsessive", "attention-seeking", "manipulative", "exhausting") -> "where i track what my brain forgets about people" / "where i keep the proof of love when my brain tries to delete it"

- Reference the specific reframe or mechanism from this post, not a generic feature. Read the slide text and pull something concrete.
- NEVER write "DBT-Mind" with capitals. Always lowercase "dbt-mind app".

Reflection line (1-2 lines, <=25 words total)

- Echoes the shame-word from slide 1 in quotation marks (essential - keeps caption-to-post cohesion)
- Mirrors the parallel-construction move from slide 4 ("you're not 'X'. you're [Y].")
- Warm, tired, Gen-Z-coded. Ends on a resigned-but-accepting phrase like "but here we are." / "turns out." / "who knew." / "wish i'd known sooner."
- This line functions as the caption's emotional landing - it should feel like a private thought spoken aloud.

Hashtags (final line, on its own line)

- Always include: #bpd #bpdtiktok #dbt #bpdrecovery
- Add 1-2 topic-specific hashtags based on the topic. Matching:

Identity topics -> #quietbpd #identitydisturbance
External shame topics -> #bpdawareness (use sparingly)
Attachment topics -> #fp #attachmentstyle
Regulation topics -> #dbtskills #emotionalregulation
Splitting/cognition topics -> #splitting #blackandwhitethinking

- Total 5-7 hashtags MAX. Never exceed 7.
- NEVER use #fyp or #foryou - dead signals, downranked in 2026.

EMOJI RULES (STRICT - quieter than weird_hack_v2):
Permission_v1 is a quieter format than v2. Emojis should be RARE.
Default to ZERO emojis. If you add one, it must be from this allowlist only:

- \uD83E\uDEF6 (soft affection)
- \uD83E\uDEE0 (melting - overwhelm)
- \uD83D\uDE35\u200D\uD83D\uDCAB (spiral - anxiety, brain rot)
- \uD83E\uDEE5 (dotted line - invisible, ghosted)
- \uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F (face in clouds - dissociating)
- \uD83E\uDD72 (tearful smile - bittersweet)
- \uD83D\uDC80 (self-deprecating laughter)
- \uD83D\uDE2D (laughing OR crying, context-dependent)
- \uD83D\uDE14 (quiet sad)

RULE: For HEAVY topics, use ZERO emojis. Heavy topics include: "empty", "broken", "crazy", "unstable", "a burden", "pathetic", "exhausting", "attention-seeking", "manipulative", "too much".
For LIGHT topics, optionally use ONE emoji at the end of the reflection line. Light topics include: "dramatic", "intense", "obsessive", "needy", "oversensitive", "irrational".
NEVER use two emojis. NEVER stack emojis. If in doubt, use zero.

BANNED (reading as millennial-coded, corporate, overused):
\u274C \u2764\uFE0F \u2728 \uD83D\uDC85 \uD83D\uDE02 \uD83D\uDC4D \uD83D\uDE4C \uD83D\uDD25 \uD83D\uDCAF \uD83C\uDF89 \uD83E\uDD70 \uD83E\uDD79 \uD83E\uDD0D \uD83D\uDC95

TITLE RULES (for the "title" field):
- 1 line, <=60 characters
- Lowercase
- Fragment allowed
- Pull the single most evocative phrase from the slides - typically from slide 5 (the positive flip) or slide 4 (the reframe)
- Should work as a scroll-stopping fragment in the viewer's FYP
- NEVER title-case, NEVER "BPD tips" / "DBT hacks" framing
- Examples of the right voice:

"worn as emptiness because no one named it right"
"you're not too much. you're a sensor."
"the labor of holding everyone else"
"you didn't form around yourself"

EXAMPLE OUTPUT for this voice (topic: "empty"):
{"title":"worn as emptiness because no one named it right","description":"the dbt-mind app is where i started writing down who i actually am. slow process. the reframes from this post are in there too.
no one ever told me "empty" was just unanchored. but here we are.
#bpd #bpdtiktok #dbt #bpdrecovery #quietbpd #identitydisturbance"}

EXAMPLE OUTPUT for a LIGHT topic (topic: "dramatic"):
{"title":"your brain isn't being dramatic. it's reading the room.","description":"the dbt-mind app is where the reframes live when i can't find them at 3am. this exact post is basically notes-to-self \uD83D\uDE14
"dramatic" was never the right word. turns out rsd has a name.
#bpd #bpdtiktok #dbt #bpdrecovery #rsd #rejectionsensitivity"}

WHAT TO AVOID:

\u274C "Struggling with feeling empty? Here's what helped!" (ad voice)
\u274C "You are not broken, you are beautiful \u2728" (wrong emojis, wrong voice, corny)
\u274C "Save this for later \uD83D\uDCAF" (engagement farming, banned emoji)
\u274C "Tag someone who needs to hear this" (engagement farming)
\u274C "Download DBT-Mind to start healing today!" (ad voice)
\u274C Using "the dbt-mind app" more than once in the description
\u274C Adding motivational closers ("you've got this!", "healing is a journey")
\u274C Capitalized "DBT-Mind" in the description
\u274C Two or more emojis in the caption
\u274C Any emoji at all on heavy topics (empty, broken, crazy, exhausting, etc.)
`;
        } else if (isDbt) {
          brandingInstruction = `
## CRITICAL: DBT-MIND CAPTION FRAMEWORK (4 PARTS, IN THIS ORDER)
Write the description as exactly four parts:
1) Emotional hook (exactly 1 line)
- Summarize the post's emotional core as an "afterthought" feeling.
- Must complement slide 1, not repeat it.
- No label, no announcement, lowercase.

2) Personal insight (1-2 sentences)
- Rephrase the main message for viewers who did not read all slides.
- Personal, raw, lowercase, no clinical tone.
- Keep emotional tension; do not sound solution-first.

3) App mention (exactly 1 sentence)
- Casual, personal recommendation tone.
- Never include "@dbt-mind" or "@dbtmind".
- Refer to it naturally as "DBT-Mind" or "DBT-Mind (free)" only.
- Never call it "the dbt app", "my dbt app", or "that app".
- If possible, mention the concrete skill/feature from the slides (for example: stop, wise mind, check the facts, diary, logging, urge surfing).
- No ad tone, no "check out", no sales language.

4) Hashtags (final line only)
- Always include: #bpd #dbtskills #bpdrecovery
- Add 1-2 topic-specific hashtags based on the slide topic.

## GLOBAL RULES FOR DBT CAPTIONS
- Lowercase only.
- No "link in bio".
- Must read like a personal post, not a brand account.
- Keep phrasing colloquial and lived-in, not polished or poetic.
- Prefer everyday language (example style: "too in it to think", not "apply it").
- Gen-Z casual style is allowed where natural (short sentences, imperfect grammar, "bc", "rn").
- Self-ironic hyperbole humor is allowed, especially in part 1, when it fits the topic.
`;
        } else if (needsSypBrandingInDescription) {
          brandingInstruction = `
## \xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F CRITICAL: SAVEYOURPET.DE MUSS AM ANFANG DER DESCRIPTION STEHEN!

Die Slides erw\xC3\u0192\xC2\xA4hnen Absicherung/Vorsorge thematisch, aber nicht saveyourpet.de direkt.
Du MUSST saveyourpet.de in der Description erw\xC3\u0192\xC2\xA4hnen - und zwar **AM ANFANG**, nicht am Ende!

### WICHTIGSTE REGELN:
1. **saveyourpet.de ZUERST** - direkt im ersten Satz, BEVOR der Rest der Beschreibung kommt
2. **Kreativ & Authentisch** - soll wie ein echtes Statement klingen, NICHT wie Werbung
3. **Emotional/Humorvoll** - die Person teilt ihre ECHTE Erfahrung

### \xC3\xA2\xC5\u201C\xE2\u20AC\xA6 GUTE BEISPIELE (nutze diesen Stil):
- "saveyourpet.de hat mir meinen A*sch gerettet \xC3\xB0\xC5\xB8\xCB\u0153\xE2\u20AC\u0161 [REST DER DESCRIPTION]"
- "saveyourpet.de - bester Move ever. [REST DER DESCRIPTION]"
- "Dank saveyourpet.de kann ich endlich wieder schlafen \xC3\xB0\xC5\xB8\xC2\x90\xE2\u20AC\xA2 [REST DER DESCRIPTION]"
- "saveyourpet.de gecheckt \xC3\xA2\xE2\u20AC\xA0\xE2\u20AC\u2122 Panik weg \xC3\xB0\xC5\xB8\xE2\u20AC\u2122\xE2\u20AC\xA0\xC3\xA2\xE2\u201A\xAC\xC2\x8D\xC3\xA2\xE2\u201E\xA2\xE2\u201A\xAC\xC3\xAF\xC2\xB8\xC2\x8F [REST DER DESCRIPTION]"
- "saveyourpet.de war die beste Entscheidung. Punkt. [REST DER DESCRIPTION]"
- "h\xC3\u0192\xC2\xA4tte ich saveyourpet.de mal fr\xC3\u0192\xC2\xBCher gefunden \xC3\xB0\xC5\xB8\xC2\xA5\xC2\xB2 [REST DER DESCRIPTION]"
- "saveyourpet.de = endlich ruhig schlafen \xC3\xB0\xC5\xB8\xCB\u0153\xC2\xB4 [REST DER DESCRIPTION]"

### \xC3\xA2\xC2\x9D\xC5\u2019 SCHLECHTE BEISPIELE (VERMEIDE DIESE):
- "Tierkrankenversicherung vergleichen auf saveyourpet.de" \xC3\xA2\xE2\u20AC\xA0\xE2\u20AC\u2122 zu werblich!
- "mehr auf saveyourpet.de" \xC3\xA2\xE2\u20AC\xA0\xE2\u20AC\u2122 zu formal, zu werblich
- "alles zu Absicherung: saveyourpet.de" \xC3\xA2\xE2\u20AC\xA0\xE2\u20AC\u2122 klingt wie ein Slogan
- "[Description]... Jetzt endlich abgesichert \xC3\xA2\xE2\u201A\xAC\xE2\u20AC\u0153 h\xC3\u0192\xC2\xA4tte ich mal fr\xC3\u0192\xC2\xBCher gemacht." \xC3\xA2\xE2\u20AC\xA0\xE2\u20AC\u2122 saveyourpet.de muss VOR diesem Satz kommen!

### FORMAT:
"saveyourpet.de [kreatives Statement]. [1-2 S\xC3\u0192\xC2\xA4tze zur Story/Emotion] [2-3 Emojis] [3-5 Hashtags]"
`;
        } else if (isSyp && brandingMode === "none") {
          brandingInstruction = `
## \xC3\xA2\xC5\xA1\xC2\xA0\xC3\xAF\xC2\xB8\xC2\x8F WICHTIG: KEIN BRANDING (KEIN saveyourpet.de)
- \xC3\xA2\xC2\x9D\xC5\u2019 Erw\xC3\u0192\xC2\xA4hne saveyourpet.de NIEMALS in der Description!
- \xC3\xA2\xC5\u201C\xE2\u20AC\xA6 Aber: Nutze Begriffe wie "Tierkrankenversicherung", "Absicherung" oder "OP-Schutz" in der Caption, um das Thema der Slides aufzugreifen.
- \xC3\xA2\xC5\u201C\xE2\u20AC\xA6 Die Regel "Verwende niemals das Wort Versicherung" ist f\xC3\u0192\xC2\xBCr diesen Post AUFGEHOBEN.
- \xC3\xA2\xC5\u201C\xE2\u20AC\xA6 Beispiel: "Bin so froh, dass ich das Thema Tierkrankenversicherung endlich angegangen bin \xC3\xB0\xC5\xB8\xC2\x90\xE2\u20AC\xA2\xC3\xB0\xC5\xB8\xE2\u201E\xA2\xC2\x8F"
`;
        }
        const languageInstructions = isDbt ? `
## LANGUAGE: ENGLISH
- Write everything in English
- Tone target: young person with BPD, raw and fragmentary, not reflective and polished.
- Keep it conversational, imperfect, emotionally immediate.
- Avoid self-help-book voice and poetic writing.

Example output: {"title":"my brain wrote the breakup in 3 seconds","description":"one dry text and my brain already wrote the breakup, the funeral, and the part where i was wrong about everything.
took me too long to realize the feeling is real but the story i build from it usually isn't.
my therapist taught me stop and i actually use it now bc DBT-Mind walks me through it when i'm too in it to think.
#bpd #dbtskills #bpdrecovery #anxietyspiral #drytext"}` : `
## LANGUAGE: GERMAN
- Write everything in German
- Natural, authentic, conversational tone
- Relatable and warm, not overly trendy or slang-heavy
- Avoid excessive Gen-Z slang
- Simple, clear language that anyone can understand
- Slightly humorous or self-aware is okay, but keep it grounded
- English hashtags are fine

## STYLE EXAMPLES:
\xC3\xA2\xC2\x9D\xC5\u2019 BAD: "die 3am anxiety hits different wenn..." (too Gen-Z)
\xC3\xA2\xC5\u201C\xE2\u20AC\xA6 GOOD: "3 Uhr nachts und ich google wieder..." (natural German)

\xC3\xA2\xC2\x9D\xC5\u2019 BAD: "when your dog is lowkey your therapist fr" (too slang-heavy)
\xC3\xA2\xC5\u201C\xE2\u20AC\xA6 GOOD: "wenn dein Hund besser schl\xC3\u0192\xC2\xA4ft als du" (simple, relatable)

Example output: {"title": "wenn dein hund besser schl\xC3\u0192\xC2\xA4ft als du", "description": "Er schnarcht. Ich google. So l\xC3\u0192\xC2\xA4uft das hier. \xC3\xB0\xC5\xB8\xC2\x90\xE2\u20AC\xA2\xC3\xB0\xC5\xB8\xCB\u0153\xE2\u20AC\xA6 #hundemama #haustier #schlaflos"}`;
        const brandingReminder = isWeirdHackV2 ? ' CRITICAL: description must start with "the dbt-mind app" as the first 3 words. Follow the weird_hack_v2 caption framework and emoji rules exactly.' : isPermissionV1 ? ' CRITICAL: description must start with "the dbt-mind app" as the first 3 words. Follow the permission_v1 caption framework - warmer than v2, quieter on emojis, echo the shame-word in quotes.' : needsDbtBrandingInDescription ? " Follow the 4-part DBT caption framework exactly." : needsSypBrandingInDescription ? ' KRITISCH: saveyourpet.de MUSS AM ANFANG der Description stehen (z.B. "saveyourpet.de hat mir den A*sch gerettet \xC3\xB0\xC5\xB8\xCB\u0153\xE2\u20AC\u0161") - kreativ, nicht werblich!' : "";
        const formatTailInstruction = isWeirdHackV2 ? `

For weird_hack_v2 captions: description opens with "the dbt-mind app", uses the deadpan confession voice, 0-2 emojis from the allowed list only, 5-7 hashtags max on the final line. Never title-case. Never use banned emojis.` : isPermissionV1 ? `

For permission_v1 captions: description opens with "the dbt-mind app", uses the warm-but-direct permission voice, echoes the shame-word from slide 1 in quotes, trends toward ZERO emojis (one max, never for heavy topics like 'empty'/'broken'/'exhausting'), 5-7 hashtags max on the final line. Never title-case. Never use banned emojis.` : isDbt ? `

For DBT captions: output 4 parts with line breaks and hashtags on the final line only.` : `

For non-DBT captions: keep it to 1-2 sentences max, 1-2 emojis used wisely, 3-5 relevant hashtags.`;
        const systemPrompt = `You are a TikTok Content Strategist. Your job is to write a catchy title (1-line) and a relatable description (caption) for a photo carousel.
${languageInstructions}
${brandingInstruction}
## YOUR TASK:
Based on the provided slide texts, generate:
1. A catchy Title for the post (one line, lowercase is fine).
2. A Description/Caption for the post.${brandingReminder}${formatTailInstruction}

OUTPUT: Return ONLY a JSON object with "title" and "description" fields. No markdown, no explanation.`;
        const userPrompt = `Generate a Title and Description for these slides:

${slides_text}`;
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          })
        });
        if (!claudeResponse.ok) {
          const errorData = await claudeResponse.json();
          return sendJSON({ error: "Claude API Error", details: errorData.error?.message }, claudeResponse.status);
        }
        const rawData = await claudeResponse.json();
        const resultText = rawData.content?.[0]?.text || "";
        const extractedJson = extractBalancedJson2(resultText) || stripMarkdownCodeFences2(resultText);
        let parsed;
        try {
          parsed = JSON.parse(extractedJson);
        } catch (parseErr) {
          parsed = fallbackParseMetadataObject(resultText);
          if (!parsed) {
            console.error("[Metadata Gen] JSON Parse Error:", parseErr);
            console.info("[Metadata Gen] Raw AI Response:", resultText);
            return sendJSON({
              error: "Failed to parse metadata JSON",
              details: String(parseErr),
              rawText: resultText.substring(0, 1000)
            }, 500);
          }
        }
        const formatMetadataDescription = (rawDescription, dbtMode) => {
          const text = String(rawDescription || "").replace(/\r\n/g, `
`).replace(/[ \t]+\n/g, `
`).trim();
          if (!text)
            return "";
          const lines = text.split(`
`).map((line) => line.trim()).filter(Boolean);
          if (dbtMode) {
            const normalized = [];
            for (const line of lines) {
              if (line.startsWith("#")) {
                normalized.push(line);
                continue;
              }
              normalized.push(line.replace(/\s*@dbt-?mind\b/ig, "").replace(/\s{2,}/g, " ").trim());
            }
            const bodyLines2 = normalized.filter((line) => line && !line.startsWith("#"));
            const hashtags = normalized.filter((line) => line.startsWith("#")).flatMap((line) => line.split(/\s+/)).filter((tag) => tag.startsWith("#")).map((tag) => tag.toLowerCase());
            const uniqueHashtags2 = [...new Set(hashtags)];
            const body2 = bodyLines2.join(`
`).trim();
            const hashtagLine = uniqueHashtags2.join(" ").trim();
            return hashtagLine ? `${body2}
${hashtagLine}`.trim() : body2;
          }
          const hashtagTokens = lines.filter((line) => line.startsWith("#")).flatMap((line) => line.split(/\s+/)).filter((tag) => tag.startsWith("#")).map((tag) => tag.toLowerCase());
          const uniqueHashtags = [...new Set(hashtagTokens)];
          const bodyLines = lines.filter((line) => !line.startsWith("#"));
          let body = bodyLines.join(`
`).trim();
          if (!body && uniqueHashtags.length > 0) {
            return uniqueHashtags.join(" ");
          }
          const sentences = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
          if (sentences.length >= 3 && !body.includes(`
`)) {
            const splitAt = Math.ceil(sentences.length / 2);
            body = `${sentences.slice(0, splitAt).join(" ")}
${sentences.slice(splitAt).join(" ")}`.trim();
          }
          return uniqueHashtags.length > 0 ? `${body}
${uniqueHashtags.join(" ")}`.trim() : body;
        };
        const normalizedTitle = String(parsed.title || "").trim();
        const normalizedDescription = formatMetadataDescription(String(parsed.description || ""), isDbt);
        return sendJSON({
          title: normalizedTitle,
          description: normalizedDescription
        });
      } catch (e) {
        console.error("Metadata Generation Error:", e);
        return sendJSON({ error: "Generation failed", details: String(e) }, 500);
      }
    } else if (cleanPath === "/generate-full" && method === "POST") {
      try {
        if (!ANTHROPIC_API_KEY)
          throw new Error("API Key missing");
        const bpdTopicsPath = path5.join(DATA_DIR2, "bpd_topics.json");
        const bpdTopicsContent = readFileSync6(bpdTopicsPath, "utf8");
        const bpdData = JSON.parse(bpdTopicsContent);
        const allTopics = bpdData.tiers.flatMap((t) => t.topics.map((top) => ({ ...top, tier: t.tier, tier_name: t.name })));
        const body = await req.json();
        const preferred_topic = body.preferred_topic;
        const persona_id = body.persona_id || "luna";
        const personasPath = path5.join(DATA_DIR2, "personas.json");
        const personasContent = readFileSync6(personasPath, "utf8");
        const personasData = JSON.parse(personasContent);
        const selectedPersona = personasData.personas.find((p) => p.id === persona_id) || personasData.personas[0];
        console.log(`[Full Gen] Selected Persona: ${selectedPersona.name} `);
        const selectedTopic = preferred_topic ? allTopics.find((t) => t.name.toLowerCase().includes(preferred_topic.toLowerCase())) || allTopics[Math.floor(Math.random() * allTopics.length)] : allTopics[Math.floor(Math.random() * allTopics.length)];
        const randomAngle = selectedTopic.angles[Math.floor(Math.random() * selectedTopic.angles.length)];
        console.log(`[Full Gen] Selected Topic: ${selectedTopic.name} | Angle: ${randomAngle} `);
        const slideResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1200,
            messages: [{
              role: "user",
              content: `You are the DBT - Mind Content Writer.You create viral TikTok slideshow text for the BPD / DBT niche.

## YOUR TASK:
Generate 5 slides(Slides 2 - 6) for a TikTok carousel.Slide 1(the hook) will be generated separately.

                TOPIC: ${selectedTopic.name}
SPECIFIC ANGLE: ${randomAngle}

            ---

## SLIDE PURPOSE:
            - Slide 2: First truth.Calm, direct.Name the experience.
- Slide 3: Deepen the point.Explain WHY.
- Slide 4: The turn / realization.The "aha" moment.
- Slide 5: Continue the insight.Casually mention DBT - Mind app as a TOOL, not the hero.
- Slide 6: Hopeful close.End with \xC3\xB0\xC5\xB8\xE2\u20AC\u2122\xC5\u201C emoji.Grounded, not fake - happy.

---

## CRITICAL RULES:
            1. NO EMOJIS on Slides 2 - 5. ONLY \xC3\xB0\xC5\xB8\xE2\u20AC\u2122\xC5\u201C on Slide 6.
            2. Each slide = 1 - 2 SHORT, PUNCHY sentences.MAX 30 words per slide.
3. Tone: "Subtle Gen-Z" = authentic, validating, slightly raw.NOT cringe.
4. Use BPD - specific language: splitting, FP, dysregulated, nervous system, trauma bond, etc.
5. Write in FIRST PERSON perspective("I", "you").
6. Slide 5 app mention must feel like a casual aside, NOT a sales pitch.

---

## APP MENTION RULES(Slide 5):
The app should feel like an AFTERTHOUGHT, not the main point.The insight comes first.

\xC3\xA2\xC5\u201C\xE2\u20AC\xA6 NATIVE PHRASING(USE THESE):
- "The pattern was always there (tracking in DBT-Mind app made it obvious)."
    - "I didn't see it until I started logging triggers in apps like DBT-Mind app."
    - "Mood tracking changed everything - something like DBT-Mind app to see patterns."

\xC3\xA2\xC2\x9D\xC5\u2019 SALESY(NEVER USE - sounds like an ad):
- "DBT-Mind app helped me..."
    - "Tracking in DBT-Mind app showed me..."
    - "DBT-Mind app taught me..."
    - "[Action] in DBT-Mind app [result]"(this structure is too direct)

---

## ANTI - PATTERNS(DO NOT USE):
- "y'all", "I gotchu", "bestie", "raise your hand if..."
    - Generic self - help advice that applies to everyone
        - Clinical / therapist tone("It's important to remember...")
            - Hashtags or calls to action like "follow for more"
                - Multiple emojis or any emoji except \xC3\xB0\xC5\xB8\xE2\u20AC\u2122\xC5\u201C on Slide 6

---

## EXAMPLE OUTPUT(Splitting topic):
[
    "One second they're your whole world. The next they're the enemy.",
    "It's not a choice. Your brain literally can't hold both truths at once.",
    "The gray area doesn't exist when your nervous system is in survival mode.",
    "The triggers were always there - I just couldn't see them until I tried mood tracking (apps like DBT-Mind app).",
    "You're not crazy. You're running on a dysregulated system. And you can learn to catch it. \xC3\xB0\xC5\xB8\xE2\u20AC\u2122\xC5\u201C"
]

## EXAMPLE OUTPUT(FP Dynamics topic):
[
    "That person you can't stop thinking about? You're not in love. You're in withdrawal.",
    "Your brain got addicted to the emotional highs and now their absence feels like death.",
    "FP attachment isn't love. It's your nervous system using someone else to regulate.",
    "I finally saw my pattern when I started journaling it - something like DBT-Mind app makes it hard to ignore.",
    "Real love doesn't feel like survival. You can learn the difference. \xC3\xB0\xC5\xB8\xE2\u20AC\u2122\xC5\u201C"
]

---

    Now generate 5 slides for the topic "${selectedTopic.name}" with angle "${randomAngle}".

Output format: JSON array of 5 strings ONLY.No markdown, no explanation.`
            }]
          })
        });
        const slideData = await slideResponse.json();
        const slideRawText = slideData.content?.[0]?.text || "";
        let slidesText;
        try {
          const slideJsonMatch = slideRawText.match(/\[[\s\S]*\]/);
          slidesText = JSON.parse(slideJsonMatch ? slideJsonMatch[0] : slideRawText.replace(/```json | ```/g, "").trim());
        } catch (e) {
          console.error("[Full Gen] Failed to parse slides:", e);
          console.info("[Full Gen] Raw Slides Text:", slideRawText);
          throw new Error("Failed to parse generated slides");
        }
        console.log(`[Full Gen] Generated 5 slides for ${selectedTopic.name}`);
        const hookResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 500,
            messages: [{
              role: "user",
              content: `You are the DBT - Mind Hook Architect.You create viral scroll - stopping hooks for TikTok carousels in the BPD / DBT niche.

## YOUR TASK:
Generate 3 VIRAL HOOKS for Slide 1 that "open the loop" for the story below.

    TOPIC: ${selectedTopic.name}
ANGLE: ${randomAngle}

## CONTEXT(Slides 2 - 6):
${slidesText.map((s, i) => `Slide ${i + 2}: ${s}`).join(`
`)}

---

## HOOK TYPES(choose the best fit):
1. ** Forbidden Knowledge **: "The truth about X that no one talks about"
2. ** Pattern Interrupt **: "You're not X. You're Y."(challenges assumption)
3. ** Transformation **: "6 months ago I was X. Now I Y."

---

## CRITICAL RULES:
1. MAX 12 WORDS per hook.ONE SENTENCE ONLY.
2. NO EMOJIS.
3. DO NOT name "BPD" in the hook.Describe the EXPERIENCE instead.
4. Create a "curiosity gap" that forces a swipe to Slide 2.
5. Be specific, not generic.

---

## EXAMPLE HOOKS:
- "The truth about your 'favorite person' that no one talks about"
    - "Why losing your FP feels like actual death"
    - "You're not empathic. You're hypervigilant."
    - "The moment they go from soulmate to enemy"
    - "Why you push away everyone who gets close"
    - "That's not a connection. That's a trauma bond."

---

    Output format: JSON array of 3 strings ONLY.No markdown, no explanation.`
            }]
          })
        });
        const hookDataRes = await hookResponse.json();
        const hookRawText = hookDataRes.content?.[0]?.text || "";
        let hooks;
        try {
          const hookJsonMatch = hookRawText.match(/\[[\s\S]*\]/);
          hooks = JSON.parse(hookJsonMatch ? hookJsonMatch[0] : hookRawText.replace(/```json | ```/g, "").trim());
        } catch (e) {
          console.error("[Full Gen] Failed to parse hooks:", e);
          console.info("[Full Gen] Raw Hooks Text:", hookRawText);
          throw new Error("Failed to parse generated hooks");
        }
        if (Array.isArray(hooks) && hooks.length > 0) {
          const fallbackProblem = String(selectedTopic?.name || "this pattern").toLowerCase();
          hooks = hooks.map((h) => formatDbtSlide1Hook(h, fallbackProblem));
        }
        console.log(`[Full Gen] Generated 3 hooks for ${selectedTopic.name}`);
        const scrollStoppersPath = path5.join(DATA_DIR2, "scroll_stoppers.json");
        const scrollStoppersContent = readFileSync6(scrollStoppersPath, "utf8");
        const scrollStoppers = JSON.parse(scrollStoppersContent);
        const randomGesture = scrollStoppers.gestures[Math.floor(Math.random() * scrollStoppers.gestures.length)];
        const randomExpression = scrollStoppers.expressions[Math.floor(Math.random() * scrollStoppers.expressions.length)];
        const randomPosition = scrollStoppers.positions[Math.floor(Math.random() * scrollStoppers.positions.length)];
        console.log(`[Full Gen]Scroll - stoppers: ${randomGesture.id}, ${randomExpression.id}, ${randomPosition.id} `);
        const imagePromptResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 2500,
            messages: [{
              role: "user",
              content: `You are the DBT - Mind Image Prompt Generator.Create 6 image prompts for a TikTok carousel.

## CONTEXT:
TOPIC: ${selectedTopic.name}
HOOK: ${hooks[0]}

SLIDE TEXT:
Slide 1: ${hooks[0]}
${slidesText.map((s, i) => `Slide ${i + 2}: ${s}`).join(`
`)}

---

## CHARACTER PERSONA(MUST USE - this is the consistent character for all 6 images):
${JSON.stringify(selectedPersona, null, 2)}

CRITICAL: The subject's hair, accessories, and pet MUST match the persona above exactly.
    - Hair: ${selectedPersona.subject.hair.color}, ${selectedPersona.subject.hair.style}
- Accessories: ${selectedPersona.accessories.earrings}, ${selectedPersona.accessories.jewelry}
- Pet: ${selectedPersona.pet ? selectedPersona.pet.description : "No pet"}

Clothing and setting can vary based on the topic, but the PERSON must be consistent.

---

## SCROLL - STOPPING ELEMENTS FOR IMAGE 1(MUST USE):
Use these EXACT elements for Image 1 to maximize engagement:

GESTURE: ${randomGesture.description}
EXPRESSION: ${randomExpression.description}
POSITION / POSE: ${randomPosition.description}

These elements make the image interesting and scroll - stopping while staying authentic.

---

## SETTING VARIETY(STRICTLY NO BATHROOMS):
Choose settings based on topic, but VARY them:
- Bedroom: bed visible, natural daylight or lamp
    - Living room couch: relaxed, blanket, warm lighting
        - Car: steering wheel visible, daylight through windows
            - Kitchen: morning light, coffee mug nearby
                - Window seat: natural light, hopeful energy

---

## CORE INSTRUCTION (AMATEUR SNAPCHAT VIBE)
Preserve exact facial identity (bone structure, eyes, nose, lips). Adapt style/mood without altering identity.
Vibe: Spontaneous candid photo someone sends to a friend on Snapchat. Amateur quality, slightly raw, 100% unposed. NO UI elements or text in the image. Brighter, everyday lighting.

## REALISM RULES(CRITICAL):
1. Skin is NEVER smooth or filtered. Include visible micro-pores, natural oils, and peach fuzz. NO plastic skin.
2. Makeup: Sharp elegant black winged eyeliner, defined lashes, muted lips with satin finish. Natural glow.
3. Clothes: Fashion-forward outfit (jacket/zip-up with graphic prints). Realistic fabric folds.
4. Overall vibe: "Pretty but comedically overwhelmed" German pet owner. CUTE MESSY, not distressed.
5. NO MIRRORS: Strictly avoid any mention of mirrors, reflects in glass, or looking into a mirror.
6. NO BATHROOMS: Strictly avoid any mention of bathrooms, toilets, or showers.
7. NO TEXT/UI: Strictly avoid any text overlays, buttons, or UI elements in the image itself.

## CAMERA TYPE(Amateur Selfie):
Standard smartphone camera style, casual eye-level or slightly tilted angle.
DEEP FOCUS: Everything in the image must be sharp and clear. NO background blur, NO bokeh, NO unsharpness.
Natural lighting, clear and bright. No ring light, no professional polish, no beauty filters.
Vertical 9:16 format.


---

## IMAGE 1 FORMAT(JSON - Scroll - Stopper):
Must be a complete JSON object with these sections:
- subject(description, age, hair, clothing, face with makeup and expression)
- pose(phone_hand, other_hand gesture)
    - accessories(earrings, jewelry, phone_case)
    - photography(camera_style, angle, quality, lighting)
    - background(setting, elements array with pet in REALISTIC position, lighting)

## IMAGES 2 - 6 FORMAT(Text - Calm Progression):
Each is a single descriptive sentence covering:
- Same person, same outfit, same pet(in different but realistic position)
    - Selfie type and setting (can change rooms naturally)
- Expression(calm, not matching slide 1 intensity)
    - Lighting(progressing toward warmer)

### Expression Guide for Images 2 - 6:
    - Image 2: neutral, direct, calm
        - Image 3: thoughtful, slightly reflective
            - Image 4: processing, subtle understanding
                - Image 5: soft half - smile, "figured something out"
                    - Image 6: genuine warmth, peaceful, grounded, hopeful

---

## OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
    "image1": { /* full JSON prompt */ },
${Array.from({ length: slidesText.length + 1 - 1 }, (_, i) => `    "image${i + 2}": "text prompt..."`).join(`,
`)}
}

Output ONLY the JSON object.No markdown, no explanation.`
            }]
          })
        });
        const imagePromptData = await imagePromptResponse.json();
        let imagePrompts;
        try {
          imagePrompts = JSON.parse(imagePromptData.content[0].text.replace(/```json | ```/g, "").trim());
        } catch (e) {
          console.error("Failed to parse image prompts:", e);
          imagePrompts = null;
        }
        console.log(`[Full Gen] Generated image prompts for ${selectedTopic.name}`);
        return sendJSON({
          topic: selectedTopic.name,
          angle: randomAngle,
          slides: slidesText,
          hooks,
          imagePrompts
        });
      } catch (err) {
        console.error("Full Generation Error:", err);
        return sendJSON({ error: "Full generation failed", details: String(err) }, 500);
      }
    } else if (cleanPath === "/generate-image" && method === "POST") {
      if (!OPENAI_API_KEY) {
        return sendJSON({ error: "OpenAI API Key not configured" }, 500);
      } else {
        try {
          const body = await req.json();
          const { prompt, aspect_ratio = "9:16", count = 1, character_id, service, flow } = body;
          if (!prompt) {
            return sendJSON({ error: "Prompt is required" }, 400);
          } else {
            let anchor = null;
            if (service === "syp" && character_id) {
              anchor = getAnchorImage(character_id, ANCHORS_DIR);
            } else {
              console.log(`[Image Gen] Skipping anchor load for service: ${service || "unknown"} (DBT uses pure prompting)`);
            }
            console.log(`[Image Gen] Generating ${count} image(s) ${anchor ? "with character anchor" : "pure prompt"}...`);
            let flatPrompt = flattenImagePrompt(prompt, { includeUgcStyle: service !== "dbt" });
            const effectiveFlow = service === "dbt" ? flow || "weird_hack" : flow;
            if (service === "dbt" && effectiveFlow === "weird_hack_v2") {
              flatPrompt = buildWeirdHackV2NanoBananaPrompt(flatPrompt);
            }
            const imageSize = getImageSizeForFlow(service, flow);
            let result;
            if (anchor) {
              result = await generateImageWithReferences(flatPrompt, [anchor], OPENAI_API_KEY, {
                aspectRatio: aspect_ratio,
                imageSize
              });
            } else {
              result = await generateImage(flatPrompt, OPENAI_API_KEY, {
                aspectRatio: aspect_ratio,
                imageSize
              });
            }
            if (result.success && result.images) {
              return sendJSON({
                success: true,
                images: result.images.map((img) => ({
                  data: img.data,
                  mime_type: img.mimeType
                }))
              });
            } else {
              return sendJSON({
                success: false,
                error: result.error || "Image generation failed"
              }, 500);
            }
          }
        } catch (err) {
          console.error("Image Generation Error:", err);
          return sendJSON({
            error: "Image generation failed",
            details: err instanceof Error ? err.message : String(err)
          }, 500);
        }
      }
    } else if (cleanPath === "/generate-ai-images" && method === "POST") {
      if (!OPENAI_API_KEY) {
        return sendJSON({ error: "OpenAI API Key not configured" }, 500);
      } else {
        try {
          const body = await req.json();
          const { imagePrompts, character_id, service, brandingMode, referenceImages = [], flow } = body;
          const effectiveFlow = service === "dbt" ? flow || "weird_hack" : flow;
          if (!imagePrompts) {
            return sendJSON({ error: "imagePrompts object is required" }, 400);
          } else {
            const imageKeys = Object.keys(imagePrompts).filter((key) => /^image\d+$/.test(key)).sort((a, b) => parseInt(a.replace("image", "")) - parseInt(b.replace("image", "")));
            console.log(`[Carousel Images] Generating ${imageKeys.length} carousel images for character: ${character_id || "unspecified"}...`);
            const promptsWithIndices = [];
            for (const key of imageKeys) {
              if (imagePrompts[key]) {
                const index = parseInt(key.replace("image", "")) - 1;
                promptsWithIndices.push({
                  prompt: flattenImagePrompt(imagePrompts[key], { includeUgcStyle: service !== "dbt" }),
                  originalPrompt: imagePrompts[key],
                  index
                });
              }
            }
            if (promptsWithIndices.length === 0) {
              return sendJSON({ error: "No valid image prompts found" }, 400);
            } else {
              const baseReferences = referenceImages.map((ref) => ({
                data: ref.data,
                mimeType: ref.mimeType || ref.mime_type || "image/png"
              }));
              const iFeelReferencePaths = service === "dbt" && effectiveFlow === "i_say_they_say" ? getDbtIFeelReferencePaths(character_id) : [];
              const shuffledIFeelReferencePaths = [...iFeelReferencePaths].sort(() => Math.random() - 0.5);
              const uniqueIFeelReferencePathBySlide = new Map;
              if (shuffledIFeelReferencePaths.length > 0) {
                promptsWithIndices.forEach((item, orderIndex) => {
                  const assignedPath = shuffledIFeelReferencePaths[orderIndex];
                  if (assignedPath) {
                    uniqueIFeelReferencePathBySlide.set(item.index, assignedPath);
                  }
                });
              }
              if (baseReferences.length === 0 && service === "syp" && character_id) {
                const anchor = getAnchorImage(character_id, ANCHORS_DIR);
                if (anchor)
                  baseReferences.push(anchor);
              }
              const workerCount = Math.min(IMAGE_GEN_CONCURRENCY, promptsWithIndices.length);
              const results = [];
              let nextIndex = 0;
              const workers = Array.from({ length: workerCount }, async () => {
                while (true) {
                  const current = nextIndex++;
                  if (current >= promptsWithIndices.length)
                    break;
                  const item = promptsWithIndices[current];
                  if (!item)
                    continue;
                  console.log(`[Carousel Images] Generating slide ${item.index + 1}/${imageKeys.length}...`);
                  let finalPrompt = item.prompt;
                  let finalReferences = [...baseReferences];
                  const usesLegacyDbtFixedReferences = service === "dbt" && effectiveFlow !== "i_say_they_say" && effectiveFlow !== "weird_hack_v2";
                  if (service === "dbt" && effectiveFlow === "weird_hack_v2") {
                    finalPrompt = buildWeirdHackV2NanoBananaPrompt(finalPrompt);
                  }
                  if (service === "dbt" && effectiveFlow === "i_say_they_say") {
                    const assignedReferencePath = uniqueIFeelReferencePathBySlide.get(item.index);
                    const iFeelReference = assignedReferencePath ? loadFixedReferenceImages([assignedReferencePath], `DBT I Feel Slide ${item.index + 1}:${character_id || "hannahbpd"}`) : getDbtSlide1References(character_id, effectiveFlow);
                    if (iFeelReference.length > 0) {
                      finalReferences.push(...iFeelReference);
                    }
                  }
                  if (usesLegacyDbtFixedReferences && item.index === 0) {
                    const slide1References = getDbtSlide1References(character_id, effectiveFlow);
                    if (slide1References.length > 0) {
                      finalReferences.push(...slide1References);
                      const fixedSlide1Prompt = getDbtFixedSlide1Prompt(effectiveFlow);
                      if (fixedSlide1Prompt) {
                        finalPrompt += `

CRITICAL: ${fixedSlide1Prompt}`;
                      }
                      console.log(`[Carousel Images] Added ${slide1References.length} fixed reference(s) for DBT slide 1`);
                    }
                  }
                  if (usesLegacyDbtFixedReferences && item.index === 1) {
                    const slide2References = getDbtSlide2References(character_id, effectiveFlow);
                    if (slide2References.length > 0) {
                      finalReferences.push(...slide2References);
                      finalPrompt += `

CRITICAL: ${getDbtFixedSlide2Prompt(character_id, effectiveFlow)}`;
                      console.log(`[Carousel Images] Added ${slide2References.length} fixed reference(s) for DBT slide 2`);
                    }
                  }
                  if (usesLegacyDbtFixedReferences && item.index === 2) {
                    const slide3References = getDbtSlide3References(character_id, effectiveFlow);
                    if (slide3References.length > 0) {
                      finalReferences.push(...slide3References);
                      finalPrompt += `

CRITICAL: ${getDbtFixedSlide3Prompt(character_id, effectiveFlow)}`;
                      console.log(`[Carousel Images] Added ${slide3References.length} fixed reference(s) for DBT slide 3`);
                    }
                  }
                  if (usesLegacyDbtFixedReferences && item.index === 3) {
                    const slide4References = getDbtSlide4References(character_id, effectiveFlow);
                    if (slide4References.length > 0) {
                      finalReferences.push(...slide4References);
                      const fixedSlide4Prompt = getDbtFixedSlide4Prompt(effectiveFlow);
                      if (fixedSlide4Prompt) {
                        finalPrompt += `

CRITICAL: ${fixedSlide4Prompt}`;
                      }
                      console.log(`[Carousel Images] Added ${slide4References.length} fixed reference(s) for DBT slide 4`);
                    }
                  }
                  if (usesLegacyDbtFixedReferences && item.index === 4) {
                    const slide5References = getDbtSlide5References(character_id, effectiveFlow);
                    if (slide5References.length > 0) {
                      finalReferences.push(...slide5References);
                      const fixedSlide5Prompt = getDbtFixedSlide5Prompt(character_id, effectiveFlow);
                      if (fixedSlide5Prompt) {
                        finalPrompt += `

CRITICAL: ${fixedSlide5Prompt}`;
                      }
                      console.log(`[Carousel Images] Added ${slide5References.length} fixed reference(s) for DBT slide 5`);
                    }
                  }
                  const isSypProject = service === "syp";
                  const saveyourpetKeywords = ["saveyourpet.de", "saveyourpet", "absicherung", "vorsorge", "schutz f\xC3\u0192\xC2\xBCr", "laptop screen showing"];
                  const lowerPrompt = (finalPrompt + " " + item.originalPrompt).toLowerCase();
                  const needsWebsiteScreenshot = isSypProject && brandingMode === "full" && saveyourpetKeywords.some((kw) => lowerPrompt.includes(kw));
                  if (needsWebsiteScreenshot) {
                    const websiteScreenshotPath = path5.join(DATA_DIR2, "anchors", "saveyourpet", "website_screenshot_laptop.png");
                    if (existsSync6(websiteScreenshotPath)) {
                      try {
                        const screenshotData = readFileSync6(websiteScreenshotPath).toString("base64");
                        finalReferences.push({ data: screenshotData, mimeType: "image/png" });
                        finalPrompt += `

CRITICAL: The laptop screen MUST display the saveyourpet.de website exactly as shown in the reference image.`;
                      } catch (e) {
                        console.warn("Failed to load SYP screenshot", e);
                      }
                    }
                  }
                  const imageSize = getImageSizeForFlow(service, effectiveFlow);
                  const result = finalReferences.length > 0 ? await generateImageWithReferences(finalPrompt, finalReferences, OPENAI_API_KEY, { aspectRatio: body.aspectRatio || "9:16", imageSize }) : await generateImage(finalPrompt, OPENAI_API_KEY, { aspectRatio: body.aspectRatio || "9:16", imageSize });
                  results.push({
                    slideIndex: item.index,
                    result
                  });
                }
              });
              await Promise.all(workers);
              const images = results.map((r) => {
                const firstImage = r.result.images?.[0];
                return {
                  slideIndex: r.slideIndex,
                  success: r.result.success,
                  image: firstImage ? {
                    data: firstImage.data,
                    mime_type: firstImage.mimeType
                  } : null,
                  error: r.result.error
                };
              });
              const successCount = images.filter((i) => i.success).length;
              console.log(`[Carousel Images] Generated ${successCount}/${promptsWithIndices.length} images`);
              return sendJSON({
                success: successCount > 0,
                images,
                stats: {
                  total: promptsWithIndices.length,
                  successful: successCount,
                  failed: promptsWithIndices.length - successCount
                }
              });
            }
          }
        } catch (err) {
          console.error("Carousel Image Generation Error:", err);
          return sendJSON({
            error: "Carousel image generation failed",
            details: err instanceof Error ? err.message : String(err)
          }, 500);
        }
      }
    } else if (cleanPath === "/generate-custom-image" && method === "POST") {
      if (!OPENAI_API_KEY) {
        return sendJSON({ error: "OpenAI API Key not configured" }, 500);
      } else {
        try {
          const body = await req.json();
          const { prompt, aspectRatio = "9:16", referenceImages = [], service, flow } = body;
          const requestedImageSize = body.imageSize === "1K" || body.imageSize === "2K" || body.imageSize === "4K" ? body.imageSize : undefined;
          if (!prompt) {
            return sendJSON({ error: "Prompt is required" }, 400);
          } else {
            console.log(`[Custom Image] Generating with model=${OPENAI_IMAGE_MODEL} and ${referenceImages.length} refs: ${prompt.substring(0, 50)}...`);
            const imageSize = requestedImageSize || getImageSizeForFlow(service, flow);
            let result;
            if (referenceImages && referenceImages.length > 0) {
              const finalReferences = referenceImages.map((ref) => ({
                data: ref.data,
                mimeType: ref.mimeType || ref.mime_type || "image/png"
              }));
              result = await generateImageWithReferences(prompt, finalReferences, OPENAI_API_KEY, {
                aspectRatio,
                imageSize
              });
            } else {
              result = await generateImage(prompt, OPENAI_API_KEY, {
                aspectRatio,
                imageSize
              });
            }
            if (result.success && result.images && result.images.length > 0) {
              const firstImage = result.images[0];
              if (!firstImage)
                return sendJSON({ error: "Image generation returned empty data" }, 500);
              return sendJSON({
                success: true,
                model: OPENAI_IMAGE_MODEL,
                image: {
                  data: firstImage.data,
                  mime_type: firstImage.mimeType
                }
              });
            } else {
              return sendJSON({ success: false, error: result.error || "Generation failed" }, 500);
            }
          }
        } catch (err) {
          console.error("Custom Image Generation Error:", err);
          return sendJSON({ error: "Custom generation failed", details: String(err) }, 500);
        }
      }
    } else if (cleanPath === "/generate-image-with-refs" && method === "POST") {
      if (!OPENAI_API_KEY) {
        return sendJSON({ error: "OpenAI API Key not configured" }, 500);
      } else {
        try {
          const body = await req.json();
          const { prompt, referenceImages = [], slideIndex = 0, service, slideText = "", brandingMode, character_id, flow } = body;
          if (!prompt) {
            return sendJSON({ error: "Prompt is required" }, 400);
          } else {
            console.log(`[Image Gen] Generating slide ${slideIndex + 1} with ${referenceImages.length} reference(s)...`);
            let flatPrompt = flattenImagePrompt(prompt, { includeUgcStyle: service !== "dbt" });
            let result = { success: false, error: "Initialization error" };
            let finalReferences = referenceImages.map((ref) => ({
              data: ref.data,
              mimeType: ref.mimeType || ref.mime_type || "image/png"
            }));
            if (finalReferences.length === 0 && body.character_id && service !== "dbt") {
              const anchor = getAnchorImage(body.character_id, ANCHORS_DIR);
              if (anchor)
                finalReferences.push(anchor);
            }
            const effectiveFlow = service === "dbt" ? flow || "weird_hack" : flow;
            if (service === "dbt" && effectiveFlow === "weird_hack_v2") {
              flatPrompt = buildWeirdHackV2NanoBananaPrompt(flatPrompt);
            }
            const usesLegacyDbtFixedReferences = service === "dbt" && effectiveFlow !== "i_say_they_say" && effectiveFlow !== "weird_hack_v2";
            if (service === "dbt" && effectiveFlow === "i_say_they_say") {
              const iFeelReference = getDbtSlide1References(character_id, effectiveFlow);
              if (iFeelReference.length > 0) {
                finalReferences.push(...iFeelReference);
              }
            }
            if (usesLegacyDbtFixedReferences && slideIndex === 0) {
              const slide1References = getDbtSlide1References(character_id, flow || "weird_hack");
              if (slide1References.length > 0) {
                finalReferences.push(...slide1References);
                const fixedSlide1Prompt = getDbtFixedSlide1Prompt(flow || "weird_hack");
                if (fixedSlide1Prompt) {
                  flatPrompt += `

CRITICAL: ${fixedSlide1Prompt}`;
                }
                console.log(`[Image Gen] Added ${slide1References.length} fixed reference(s) for DBT slide 1`);
              }
            }
            if (usesLegacyDbtFixedReferences && slideIndex === 1) {
              const slide2References = getDbtSlide2References(character_id, flow || "weird_hack");
              if (slide2References.length > 0) {
                finalReferences.push(...slide2References);
                flatPrompt += `

CRITICAL: ${getDbtFixedSlide2Prompt(character_id, flow || "weird_hack")}`;
                console.log(`[Image Gen] Added ${slide2References.length} fixed reference(s) for DBT slide 2`);
              }
            }
            if (usesLegacyDbtFixedReferences && slideIndex === 4) {
              const slide5References = getDbtSlide5References(character_id, flow || "weird_hack");
              if (slide5References.length > 0) {
                finalReferences.push(...slide5References);
                const fixedSlide5Prompt = getDbtFixedSlide5Prompt(character_id, flow || "weird_hack");
                if (fixedSlide5Prompt) {
                  flatPrompt += `

CRITICAL: ${fixedSlide5Prompt}`;
                }
                console.log(`[Image Gen] Added ${slide5References.length} fixed reference(s) for DBT slide 5`);
              }
            }
            if (usesLegacyDbtFixedReferences && slideIndex === 3) {
              const slide4References = getDbtSlide4References(character_id, flow || "weird_hack");
              if (slide4References.length > 0) {
                finalReferences.push(...slide4References);
                const fixedSlide4Prompt = getDbtFixedSlide4Prompt(flow || "weird_hack");
                if (fixedSlide4Prompt) {
                  flatPrompt += `

CRITICAL: ${fixedSlide4Prompt}`;
                }
                console.log(`[Image Gen] Added ${slide4References.length} fixed reference(s) for DBT slide 4`);
              }
            }
            if (usesLegacyDbtFixedReferences && slideIndex === 2) {
              const slide3References = getDbtSlide3References(character_id, flow || "weird_hack");
              if (slide3References.length > 0) {
                finalReferences.push(...slide3References);
                flatPrompt += `

CRITICAL: ${getDbtFixedSlide3Prompt(character_id, flow || "weird_hack")}`;
                console.log(`[Image Gen] Added ${slide3References.length} fixed reference(s) for DBT slide 3`);
              }
            }
            const isSypProject = service === "syp";
            const saveyourpetKeywords = [
              "saveyourpet.de",
              "saveyourpet",
              "absicherung",
              "vorsorge",
              "schutz f\xC3\u0192\xC2\xBCr",
              "laptop screen showing",
              "laptop.*saveyourpet"
            ];
            const lowerPrompt = (flatPrompt + " " + slideText).toLowerCase();
            const needsWebsiteScreenshot = isSypProject && brandingMode === "full" && saveyourpetKeywords.some((kw) => lowerPrompt.includes(kw.toLowerCase()) || new RegExp(kw, "i").test(lowerPrompt));
            if (needsWebsiteScreenshot) {
              console.log(`[Image Gen] Detected saveyourpet.de slide - adding website screenshot reference`);
              const websiteScreenshotPath = path5.join(DATA_DIR2, "anchors", "saveyourpet", "website_screenshot_laptop.png");
              if (existsSync6(websiteScreenshotPath)) {
                try {
                  const screenshotData = readFileSync6(websiteScreenshotPath).toString("base64");
                  finalReferences.push({
                    data: screenshotData,
                    mimeType: "image/png"
                  });
                  console.log(`[Image Gen] Added website screenshot as reference (${finalReferences.length} total refs)`);
                  flatPrompt = flatPrompt + `

CRITICAL: The laptop screen MUST display the saveyourpet.de website exactly as shown in the reference image (the website screenshot). Place the website screenshot content on the laptop screen in the generated image.`;
                } catch (screenshotError) {
                  console.warn(`[Image Gen] Could not load website screenshot: ${screenshotError}`);
                }
              } else {
                console.warn(`[Image Gen] Website screenshot not found at: ${websiteScreenshotPath}`);
              }
            }
            const imageSize = getImageSizeForFlow(service, effectiveFlow);
            if (finalReferences.length > 0) {
              result = await generateImageWithReferences(flatPrompt, finalReferences, OPENAI_API_KEY, { aspectRatio: body.aspectRatio || "9:16", imageSize });
            } else {
              result = await generateImage(flatPrompt, OPENAI_API_KEY, {
                aspectRatio: body.aspectRatio || "9:16",
                imageSize
              });
            }
            if (result.success && result.images && result.images.length > 0) {
              return sendJSON({
                success: true,
                slideIndex,
                image: {
                  data: result.images[0].data,
                  mime_type: result.images[0].mimeType
                },
                referencesUsed: finalReferences.length,
                websiteScreenshotUsed: needsWebsiteScreenshot
              });
            } else {
              return sendJSON({
                success: false,
                slideIndex,
                error: result.error || "Image generation failed"
              }, 500);
            }
          }
        } catch (err) {
          console.error("Image with References Error:", err);
          return sendJSON({
            error: "Image generation failed",
            details: err instanceof Error ? err.message : String(err)
          }, 500);
        }
      }
    } else {
      console.log(`[Warning] No route matched for ${method} ${cleanPath}`);
      return sendJSON({
        error: "Route not found",
        path: cleanPath,
        method,
        message: "Hook Bridge API is running, but this endpoint was not found."
      }, 404);
    }
    return new Response("Unsupported request", { status: 400, headers: corsHeaders });
  }
});
