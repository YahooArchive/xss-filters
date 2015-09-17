#!/usr/bin/env node

/*
Background
============
Machine: MacBook Pro (Retina, 15-inch, Early 2013). OSX 10.10.4
Note:    The stats are collected using nodejs, and may not reflect the actual performance in different browsers.

Stats
============
Data Context | Baseline: default filter x 312,552 ops/sec ±10.43% (92 runs sampled)
Data Context | yd filter                x 1,988,486 ops/sec ±0.78% (94 runs sampled)
Attr Context | Baseline: default filter x 280,626 ops/sec ±1.06% (92 runs sampled)
Attr Context | yavd/yavs filter         x 1,548,739 ops/sec ±0.73% (92 runs sampled)
Compound Context - URIinAttr | insecure to use default filter x 280,431 ops/sec ±0.89% (93 runs sampled)
Compound Context - URIinAttr | yavd yubl yu filter            x 53,871 ops/sec ±1.01% (91 runs sampled)

Conclusion
============

for contexts defendable by default filter, ours is 5.5 - 6.4x faster
to secure compound contexts, we filter the least amount of chars (80% slower than insecure default)

*/


var Benchmark = require('Benchmark');
var suite = new Benchmark.Suite;

// the following vector is sourced from http://ha.ckers.org/xss.html.
var sample1 = '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>=&{}';
var sample2 = 'hello world! test@example.com';
var sample3 = '<hello> &world! "john\'stest@example.com\x00.attacker.com"';

var sample4 = 'https://finance.yahoo.com/news/asian-shares-hit-three-week-005305790.html';
var sample5 = 'https://iojs.org/en/es6.html" onclick=alert(666)';
var sample6 = '&#13;javAsc&Tab;r&#0000013ipt&colon;alert(666)';

var LT   = /</g;
var QUOT   = /"/g;


var SPECIAL_HTML_CHARS = /[&<>"'`]/g;
function map1 (m) {
    return m === '&' ? '&amp;'
        :  m === '<' ? '&lt;'
        :  m === '>' ? '&gt;'
        :  m === '"' ? '&quot;'
        :  m === "'" ? '&#39;'
        :  /*m === '`'*/ '&#96;';
}



var NULL   = /\x00/g;
// Specified here are those html entities selected for decoding, they're sensitive to the following contexts 
//  CSS:     (Tab|NewLine|colon|semi|lpar|rpar|apos|sol|comma|excl|ast|midast);|(quot|QUOT);?      // CSS sensitive chars: ()"'/,!*@{}:;
//  URI:     (bsol|Tab|NewLine); 
//  common:  (amp|AMP|gt|GT|lt|LT|quote|QUOT);?
// To generate trie, given {'Tab;':'\t', 'NewLine;': '\n' ... }, (no semi-colon needed if it's optional)
// replace it repeatedly using /'(\w)([\w;]+)'\s*:\s*'([^']*)'/g with '$1': {'$2': '$3'}
/*jshint -W075 */
var trieNamedRef = {
    'A': {'M': {'P': '&'}},
    'G': {'T': '>'},
    'L': {'T': '<'},
    'N': {'e': {'w': {'L': {'i': {'n': {'e': {';': '\n'}}}}}}},
    'Q': {'U': {'O': {'T': '"'}}},
    'T': {'a': {'b': {';': '\t'}}},
    'a': {'m': {'p': '&'},                         'p': {'o': {'s': {';': '\''}}},         's': {'t': {';': '*'}}},
    'b': {'s': {'o': {'l': {';': '\\'}}}},
    'c': {'o': {'m': {'m': {'a': {';': ','}}}},    'o': {'l': {'o': {'n': {';': ':'}}}}},
    'e': {'x': {'c': {'l': {';': '!'}}},           'n': {'s': {'p': {';': '\u2002'}}},     'm': {'s': {'p': {';': '\u2003'}}}},
    'g': {'t': '>'},
    'l': {'p': {'a': {'r': {';': '('}}},           't':     '<'},
    'm': {'i': {'d': {'a': {'s': {'t': {';': '*'}}}}}},
    'n': {'b': {'s': {'p': '\xA0'}}},
    'q': {'u': {'o': {'t': '"'}}},
    'r': {'p': {'a': {'r': {';': ')'}}}},
    's': {'e': {'m': {'i': {';': ';'}}},           'o': {'l': {';': '/'}}},
    't': {'h': {'i': {'n': {'s': {'p': {';': '\u2009'}}}}}}
    
};
// Ref: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
var specialCharToken = [
    /*\x80*/ '\u20AC', '\u0081', '\u201A', '\u0192', 
    /*\x84*/ '\u201E', '\u2026', '\u2020', '\u2021', 
    /*\x88*/ '\u02C6', '\u2030', '\u0160', '\u2039', 
    /*\x8C*/ '\u0152', '\u008D', '\u017D', '\u008F',
    /*\x90*/ '\u0090', '\u2018', '\u2019', '\u201C', 
    /*\x94*/ '\u201D', '\u2022', '\u2013', '\u2014', 
    /*\x98*/ '\u02DC', '\u2122', '\u0161', '\u203A', 
    /*\x9C*/ '\u0153', '\u009D', '\u017E', '\u0178'
];
var fromCodePoint = String.fromCodePoint ? String.fromCodePoint : function(codePoint) {
    return String.fromCharCode(( (codePoint -= 0x10000) >> 10) + 0xD800, (codePoint % 0x400) + 0xDC00);
};
// the spec defines some invalid chars, 
//  - only some of those require \uFFFD replacement
//  - for others, return the corresponding character
function getHtmlDecodedChar(codePoint) {
    return (codePoint >= 0x80 && codePoint <= 0x9F) ? specialCharToken[codePoint - 0x80]
        : (codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint === 0 || codePoint > 0x10FFFF ? '\uFFFD'
        : codePoint <= 0xFFFF ? String.fromCharCode(codePoint) // BMP code point
        // Astral code point; split in surrogate halves
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        : fromCodePoint(codePoint);
}
/*
 * @param {string} s - An untrusted user input
 * @param {boolean} skipNullReplacement - set to true only if string s has NO NULL characters (e.g., string is once html-decoded, or input stream pre-processing has taken place). Caution: When set, given &\x00#39;, it is not decoded, and as a result, IE can still dangerously decode it as '. Leave it unset to result in &\uFFFD#39;, that won't be decoded further by browsers)
 * 
 * @returns {string} The html decoded string (All numbered entities will be decoded. See trieNamedRef in source code for a supported list of named entities)
 */
function htmlDecode(s, skipNullReplacement) {
    if (s === undefined || s === null) { return ''; }
    s = s.toString();

    var c, lastIdx = 0, ampIdx = -1, bufIdx = -1, subTrie, output = '', state = 0, i = 0, len = s.length;

    while (i < len) {
        c = s.charCodeAt(i);

        if (state === 0) {                              // init state

            if (c === 0x26) {                           //   & collected, switch to state 1
                state = 1;
                ampIdx = i;
            }                

        } else if (state === 1) {                   // & previously collected

            if (c === 0x23) {                       //   # collected, switch to number matching (state 2)
                state = 2;
            // } else if (c >= 0x41 && c <= 0x5A || 
            //     c >= 0x61 && c <= 0x7A || 
            //     c >= 0x30 && c <= 0x39) {        //   alphanumeric collected, switch to named ref matching (state 6)
            } else if ((subTrie = trieNamedRef[s[i]])) {
                state = 5;
                // bufIdx = i; // since subTrie is used to track
            } else {                                //   otherwise, not a character reference. 
                state = -1;
            }

        } else if (state === 2) {                   // # previously collected
            if (c === 0x78 || c === 0x58) {         //   X or x collected, process as hex (state 16)
                state = 16;
            } else if (c >= 0x30 && c <= 0x39) {    //   digits collected, process as dec (state 10)
                state = 10;
                bufIdx = i;
            } else {
                state = -1;
            }

        } else if (state === 16) {                   // xX previously collected (hex)

            if (c >= 0x30 && c <= 0x39 || 
                c >= 0x41 && c <= 0x46 ||
                c >= 0x61 && c <= 0x66) {           //   A-Fa-f0-9 collected
                if (bufIdx === -1) {
                    bufIdx = i;
                }
            } else {
                if (bufIdx > 0) {                   //   non-digits char encountered
                    output += s.slice(lastIdx, ampIdx) + getHtmlDecodedChar(parseInt(s.slice(bufIdx, i), state));
                    // consume one more char if the current one is semicolon
                    lastIdx = c === 0x3B ? i + 1 : i;
                }
                state = -1;
            }

        } else if (state === 10) {                   // 0-9 previously collected (dec)
            if (c >= 0x30 && c <= 0x39) {
                // bufIdx is set before entering state 10
            } else if (bufIdx > 0) {
                output += s.slice(lastIdx, ampIdx) + getHtmlDecodedChar(parseInt(s.slice(bufIdx, i)));
                lastIdx = c === 0x3B ? i + 1 : i;
                state = -1;
            }
        } else if (state === 5) {                   // named ref collected

            // assumed named ref must have at least 2 chars
            // if ((c >= 0x41 && c <= 0x5A || 
            //     c >= 0x61 && c <= 0x7A) && 
                // c >= 0x30 && c <= 0x39        // here's an optimization as no char ref contains number
            if ((subTrie = subTrie[s[i]])) {
                if (typeof subTrie === 'string') {
                    output += s.slice(lastIdx, ampIdx) + subTrie;
                    // when the last hit char is not semicolon, consume the next semicolon, if any
                    if (c !== 0x3B && s.charCodeAt(i+1) === 0x3B) { i++; }
                    lastIdx = i + 1;
                    state = -1;
                }
            } else {
                state = -1;
            }
        }

        // reset to init state
        if (state === -1) {
            
            // reconsume the & char as if in state 0, when it's used to terminate an entity (e.g., &#39&#39)
            if (c === 0x26) {
                state = 1;
                ampIdx = i;
                bufIdx = -1;
            } else {
                state = 0;
                ampIdx = bufIdx = -1;
            }
        }
        
        // replace Null with \uFFFD
        if (!skipNullReplacement && c === 0) {
            output += s.slice(lastIdx, i) + '\uFFFD';
            lastIdx = i + 1;
        }
    
        i++;
    }

    // flash any collected numbered references
    if ((state === 16 || state === 10) && bufIdx > 0) {
        return output + s.slice(lastIdx, ampIdx) + getHtmlDecodedChar(parseInt(s.slice(bufIdx, i), state));
    }

    return lastIdx === 0 ? s : output + s.slice(lastIdx);
}
var URI_BLACKLIST_PROTOCOLS = {'javascript':1, 'data':1, 'vbscript':1, 'mhtml':1, 'x-schema':1},
    URI_PROTOCOL_WHITESPACES = /(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,
    URI_PROTOCOL_ENCODED = /^([\x00-\x20&#a-zA-Z0-9;+-.]*:?)/;
function getProtocol(str, skipHtmlDecoding) {
    var m = skipHtmlDecoding || str.match(URI_PROTOCOL_ENCODED), i;
    if (m) {
        if (!skipHtmlDecoding) {
            // getProtocol() must run a greedy html decode algorithm, i.e., omit all NULLs before decoding (as in IE)
            // hence, \x00javascript:, &\x00#20;javascript:, and java\x00script: can all return javascript
            // and since all NULL is replaced with '', we can set skipNullReplacement in htmlDecode()
            str = htmlDecode(m[1].replace(NULL, ''), true);
        }
        i = str.indexOf(':');
        if (i !== -1) {
            return str.slice(0, i).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
        }
    }
    return null;
}




// add tests
suite
.add('Data Context | Baseline: default filter', function() {
	sample1.replace(SPECIAL_HTML_CHARS, map1);
	sample2.replace(SPECIAL_HTML_CHARS, map1);
	sample3.replace(SPECIAL_HTML_CHARS, map1);
})
.add('Data Context | yd filter               ', function() {
	sample1.replace(LT, '&lt;');
	sample2.replace(LT, '&lt;');
	sample3.replace(LT, '&lt;');
})
.add('Attr Context | Baseline: default filter', function() {
	sample1.replace(SPECIAL_HTML_CHARS, map1);
	sample4.replace(SPECIAL_HTML_CHARS, map1);
	sample5.replace(SPECIAL_HTML_CHARS, map1);
	sample6.replace(SPECIAL_HTML_CHARS, map1);
})
.add('Attr Context | yavd/yavs filter        ', function() {
	// yavd and yavs filters respectivaly " and ' only
	sample1.replace(QUOT, '&quot;');
	sample4.replace(QUOT, '&quot;');
	sample5.replace(QUOT, '&quot;');
	sample6.replace(QUOT, '&quot;');
})

.add('Compound Context - URIinAttr | insecure to use default filter', function() {
	sample1.replace(SPECIAL_HTML_CHARS, map1);
	sample4.replace(SPECIAL_HTML_CHARS, map1);
	sample5.replace(SPECIAL_HTML_CHARS, map1);
	sample6.replace(SPECIAL_HTML_CHARS, map1);
})
.add('Compound Context - URIinAttr | yavd yubl yu filter           ', function() {
	var s;

	s = encodeURI(sample1);
	(URI_BLACKLIST_PROTOCOLS[getProtocol(s)] ? 'x-' + s : s).replace(QUOT, '&quot;');
	s = encodeURI(sample4);
	(URI_BLACKLIST_PROTOCOLS[getProtocol(s)] ? 'x-' + s : s).replace(QUOT, '&quot;');
	s = encodeURI(sample5);
	(URI_BLACKLIST_PROTOCOLS[getProtocol(s)] ? 'x-' + s : s).replace(QUOT, '&quot;');
	s = encodeURI(sample6);
	(URI_BLACKLIST_PROTOCOLS[getProtocol(s)] ? 'x-' + s : s).replace(QUOT, '&quot;');
})
// add listeners
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async
.run({ 'async': true });
