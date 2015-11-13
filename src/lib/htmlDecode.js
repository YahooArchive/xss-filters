/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/

var x = exports._privFilters || exports;

// Specified here are those html entities selected for decoding, they're sensitive to the following contexts 
//  CSS:     (Tab|NewLine|colon|semi|lpar|rpar|apos|sol|comma|excl|ast|midast|commat|lbrace|lcub|rbrace|rcub);|(quot|QUOT);?      // CSS sensitive chars: ()"'/,!*@:;{}
//  URI:     (bsol|commat|num|sol|quest|percnt|Tab|NewLine);     // URL sensitive chars: \@#/?%\t\n
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
    'a': {'m': {'p': '&'},
          'p': {'o': {'s': {';': '\''}}},
          's': {'t': {';': '*'}}},
    'b': {'s': {'o': {'l': {';': '\\'}}}},
    'c': {'o': {'m': {'m': {'a': {';': ',', 
                            't': {';': '@'}}}},
                'l': {'o': {'n': {';': ':'}}}}},
    'e': {'x': {'c': {'l': {';': '!'}}},
          'n': {'s': {'p': {';': '\u2002'}}},
          'm': {'s': {'p': {';': '\u2003'}}}},
    'g': {'t': '>'},
    'l': {'b': {'r': {'a': {'c': {'e': {';': '{'}}}}},
          'c': {'u': {'b': {';': '{'}}},
          'p': {'a': {'r': {';': '('}}},
          't': '<'},
    'm': {'i': {'d': {'a': {'s': {'t': {';': '*'}}}}}},
    'n': {'b': {'s': {'p': '\xA0'}},
          'u': {'m': {';': '#'}}},
    'p': {'e': {'r': {'c': {'n': {'t': {';': '%'}}}}}},
    'q': {'u': {'o': {'t': '"'},
                'e': {'s': {'t': {';': '?'}}}}},
    'r': {'b': {'r': {'a': {'c': {'e': {';': '}'}}}}},
          'c': {'u': {'b': {';': '}'}}},
          'p': {'a': {'r': {';': ')'}}}},
    's': {'e': {'m': {'i': {';': ';'}}},
          'o': {'l': {';': '/'}}},
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
x.yHtmlDecode = function(s, skipNullReplacement) {
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