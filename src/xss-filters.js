/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
/*jshint node: true */

exports._getPrivFilters = function () {

    var LT     = /</g,
        QUOT   = /"/g,
        SQUOT  = /'/g,
        AMP    = /&/g,
        NULL   = /\x00/g,
        SPECIAL_ATTR_VALUE_UNQUOTED_CHARS = /(?:^$|[\x00\x09-\x0D "'`=<>])/g,
        SPECIAL_HTML_CHARS = /[&<>"'`]/g, 
        SPECIAL_COMMENT_CHARS = /(?:\x00|^-*!?>|--!?>|--?!?$|\]>|\]$)/g;

    // var CSS_VALID_VALUE = 
    //     /^(?:
    //     (?!-*expression)#?[-\w]+
    //     |[+-]?(?:\d+|\d*\.\d+)(?:em|ex|ch|rem|px|mm|cm|in|pt|pc|%|vh|vw|vmin|vmax)?
    //     |!important
    //     | //empty
    //     )$/i;
    var CSS_VALID_VALUE = /^(?:(?!-*expression)#?[-\w]+|[+-]?(?:\d+|\d*\.\d+)(?:r?em|ex|ch|cm|mm|in|px|pt|pc|%|vh|vw|vmin|vmax)?|!important|)$/i,
        // TODO: prevent double css escaping by not encoding \ again, but this may require CSS decoding
        // \x7F and \x01-\x1F less \x09 are for Safari 5.0, added []{}/* for unbalanced quote
        CSS_DOUBLE_QUOTED_CHARS = /[\x00-\x1F\x7F\[\]{}\\"]/g,
        CSS_SINGLE_QUOTED_CHARS = /[\x00-\x1F\x7F\[\]{}\\']/g,
        // (, \u207D and \u208D can be used in background: 'url(...)' in IE, assumed all \ chars are encoded by QUOTED_CHARS, and null is already replaced with \uFFFD
        // otherwise, use this CSS_BLACKLIST instead (enhance it with url matching): /(?:\\?\(|[\u207D\u208D]|\\0{0,4}28 ?|\\0{0,2}20[78][Dd] ?)+/g
        CSS_BLACKLIST = /url[\(\u207D\u208D]+/g,
        // this assumes encodeURI() and encodeURIComponent() has escaped 1-32, 127 for IE8
        CSS_UNQUOTED_URL = /['\(\)]/g; // " \ treated by encodeURI()

    // Given a full URI, need to support "[" ( IPv6address ) "]" in URI as per RFC3986
    // Reference: https://tools.ietf.org/html/rfc3986
    var URL_IPV6 = /\/\/%5[Bb]([A-Fa-f0-9:]+)%5[Dd]/;


    // Reference: http://shazzer.co.uk/database/All/characters-allowd-in-html-entities
    // Reference: http://shazzer.co.uk/vector/Characters-allowed-after-ampersand-in-named-character-references
    // Reference: http://shazzer.co.uk/database/All/Characters-before-javascript-uri
    // Reference: http://shazzer.co.uk/database/All/Characters-after-javascript-uri
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
    // Reference for named characters: https://html.spec.whatwg.org/multipage/entities.json
    var URI_BLACKLIST_PROTOCOLS = {'javascript':1, 'data':1, 'vbscript':1, 'mhtml':1, 'x-schema':1, 'file':1},
        URI_PROTOCOL_WHITESPACES = /(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,
        URI_PROTOCOL_ENCODED = /^([\x00-\x20&#a-zA-Z0-9;+-.]*:?)/;

    var x, 
        strReplace = function (s, regexp, callback) {
            return s === undefined ? 'undefined'
                    : s === null            ? 'null'
                    : s.toString().replace(regexp, callback);
        };


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

    /**
     * This is what a urlFilterFactoryAbsCallback would expect
     *
     * @callback urlFilterFactoryAbsCallback
     * @param {string} url
     * @param {string|undefined} protocol - relative scheme is indicated as undefined. no trailing colon
     * @param {string|undefined} authority - no trailing @ if exists. username & password both included. no percent-decoding
     * @param {string} host - no percent-decoding
     * @param {string|undefined} port - no leading colon. no percent-decoding 
     * @param extraArg - an optional argument supplied thru the returned urlFilterFactory callback
     * @returns the url, or anything of one's choice
     */

    /**
     * This is what a urlFilterFactoryRelCallback would expect
     *
     * @callback urlFilterFactoryRelCallback
     * @param {string} url
     * @param  extraArg - an optional argument supplied thru the returned urlFilterFactory callback
     * @returns the url, or anything of one's choice
     */

    /* 
     * urlFilterFactory creates a URL whitelist filter, which largely observes 
     *  the specification in https://url.spec.whatwg.org/#url-parsing. It is 
     *  designed for matching whitelists of schemes and hosts, and will thus
     *  parse only up to a sufficient position (i.e., faster for not requiring 
     *  to parse the whole URL). 
     *
     * It simplifies the spec: base URL is null, utf-8 encoding, no state
     *   override, no host parsing, no percent-decoding, no username and 
     *   password parsing within the authority
     * It adds to the spec: aligned w/browsers to accept \t\n\r within origin,
     *   prohibited any scheme matching URI_BLACKLIST_PROTOCOLS, limited data 
     *   URIs to be only some safe image types
     * 
     * @param {Object} options allow configurations as follows
     * @param {Object[]} options.protocols - an optional array of protocols 
     *   (no trailing colon). If not provided, only http and https are allowed
     * @param {boolean} options.relScheme - to enable relative scheme (//)
     * @param {Object[]} options.hosts - an optional array of hostnames that 
     *   each matches /^[\w\.-]+$/. If any one is found unmatched, return null
     * @param {boolean} options.subdomain - to enable subdomain matching for 
     *   non-IPs specified in options.hosts
     * @param {boolean} options.relPath - to allow relative path
     * @param {boolean} options.relPathOnly - to allow relative path only
     * @param {boolean} options.imgDataURIs - to allow data scheme with the 
     *   MIME type equal to image/gif, image/jpeg, image/jpg, or image/png, and
     *   the encoding format as base64
     * @param {boolean} options.htmlDecode - to run html decoding first before
     *   applying any tests and filtering
     * @param {urlFilterFactoryAbsCallback} options.absCallback - if matched,
     *   called to further process the url, protocol, host, port number, and an
     *   extra argument supplied thru the returned callback to control what is
     *   returned
     * @param {urlFilterFactoryRelCallback} options.relCallback - if matched,
     *   called to further process the url, and an extra argument supplied thru
     *   the returned callback to control what is returned
     * @returns {function} The returned function taking (url, extraArg) runs 
     *   the configured tests. It prefixes "unsafe:" to non-matching URLs, and
     *   handover to the options.absCallback and/or options.relCallback for
     *   matched ones. In case no callback is supplied, return the matched url.
     */
    function urlFilterFactory (options) {
        /*jshint -W030 */
        options || (options = {});

        var i, n, arr, t, reElement, reProtos, reAuthHostsPort, 
            absCallback = options.absCallback,
            // reEscape escapes chars that are sensitive to regexp
            reEscape = /[.*?+\\\[\](){}|\^$]/g,
            // the following whitespaces are allowed in origin
            reOriginWhitespaces = /[\t\n\r]+/g,
            // reIPv4 matches the pattern of IPv4 address and its hex representation
            // used only when options.subdomain is set
            // Ref: https://url.spec.whatwg.org/#concept-ipv4-parser
            reIPv4 = options.subdomain && /^\.?(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?|0[xX][\dA-Fa-f]{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?|0[xX][\dA-Fa-f]{1,2})\.?$/,
            // reImgDataURIs hardcodes the image data URIs that are known to be safe
            reImgDataURIs = options.imgDataURIs && /^(data):image\/(?:gif|jpe?g|png);base64,/i,
            // reRelPath ensures the URL has no scheme/auth/host/port
            // (?![a-z][a-z0-9+-.\t\n\r]*:) avoided going to the #scheme-state
            //   \t\n\r can be part of scheme according to browsers' behavior
            // (?![\/\\]{2}) avoided the transitions from #relative-state, 
            //   to #relative-slash-state and then to 
            //   #special-authority-ignore-slashes-state
            // Ref: https://url.spec.whatwg.org/
            reRelPath = options.relPath && /^(?![a-z][a-z0-9+-.\t\n\r]*:|[\/\\]{2})/i;

        // if options.protocols are provided
        // in any case, reProtos won't match a relative path
        if ((arr = options.protocols) && (n = arr.length)) {
            // reElement specifies the possible chars for scheme
            // Ref: https://url.spec.whatwg.org/#scheme-state
            reElement = /^[a-z0-9+-.]+$/i;

            for (i = 0; i < n; i++) {
                // throw TypeError if an array element cannot be validated
                if (!reElement.test( (t = arr[i]) )) {
                    throw new TypeError(t + 'is an invalid scheme.');
                }
                if (URI_BLACKLIST_PROTOCOLS[ (t = t.toLowerCase()) ]) {
                    throw new TypeError(t + 'is a disallowed scheme.' + 
                        (t === 'data' ? 
                            ' Enable safe image types \\w/options.imgDataURIs':
                            ''));
                }
                // escapes t from regexp sensitive chars
                arr[i] = t.replace(reEscape, '\\$&');
            }

            // build reProtos from the protocols array, must be case insensitive
            // The relScheme matching regarding \\/\\/ summarized the transitions from 
            //   #relative-state, #relative-slash-state to #special-authority-ignore-slashes-state
            // Ref: https://url.spec.whatwg.org/
            reProtos = new RegExp(
                '^(?:(' +
                arr.join('|') +
                (options.relScheme ? '):|\\/\\/)' : '):)'), 'i');

        } else {
            // the default reProtos, only http and https are allowed. 
            // refer to above for regexp explanations
            reProtos = options.relScheme ? /^(?:(https?):|\/\/)/i : /^(https?):/i;
        }

        // if options.hosts are provided
        if ((arr = options.hosts) && (n = arr.length)) {
            // [^\x00\t\n\r#\/:?\[\\\]]+ tests a valid host 
            //   - @ won't appear here anyway as it's captured by prior regexp
            //   - \x20 is found okay to browser, so it's also allowed here
            //   - \t\n\r are not allowed, developers should stripped them
            //   Ref: https://url.spec.whatwg.org/#concept-host-parser
            // \[(?:[^\t\n\r\/?#\\]+)\] is minimal to capture ipv6-like address
            //   Ref: https://url.spec.whatwg.org/#concept-ipv6-parser
            reElement = /^(?:[^\x00\t\n\r#\/:?\[\]\\]+|\[(?:[^\x00\t\n\r\/?#\\]+)\])$/;

            for (i = 0; i < n; i++) {
                // throw TypeError if an array element cannot be validated
                if (!reElement.test( (t = arr[i]) )) {
                    throw new TypeError(t + 'is an invalid host.');
                }
                
                // if the host provided is neither IPv6 nor IPv4
                arr[i] = (options.subdomain && 
                        t.charCodeAt(0) !== 91 /*[*/ && !reIPv4.test(t)) ?
                            // See above for valid host requirement
                            // accept \t\n\r, which will be later stripped
                            '(?:[^\\x00#\\/:?\\[\\]\\\\]+\\.)*' : 
                            '';

                // escapes t from regexp sensitive chars
                arr[i] += t.replace(reEscape, '\\$&');
            }

            // build reAuthHostsPort from the hosts array, must be case insensitive
            // in general, host must be present, auth/port optional
            // ^[\\/\\\\]* actually is there to ignore any number of leading slashes. 
            //   This observes the spec except when there're >2 slashes after scheme,
            //   only syntax violation is specified So, follow browsers' behavior to continue parsing
            //   Ref: https://url.spec.whatwg.org/#special-authority-ignore-slashes-state
            // (?:([^\\/\\\\?#]*)@)? captures the authority without the trailing @ (i.e., username:password) if any
            //   This observes the spec except omitting any encoding/separating username and password
            //   Ref: https://url.spec.whatwg.org/#authority-state
            // '(' + arr.join('|') + ')' is to capture the whitelisted hosts
            //   Refer to above for the requirements
            // (?:$|OPTIONAL_PORT_SEE_BELOW($|[\\/?#\\\\])) required for host array
            //   [\\/?#\\\\] is delimeter to separate host from path, required
            //   to capture the whole host for matching elmement in hosts array
            //   Ref: https://url.spec.whatwg.org/#host-state
            // (?::([\\d\\t\\n\\r]*))? captures the port number if any
            //   whitespaces to be later stripped
            //   Ref: https://url.spec.whatwg.org/#port-state
            reAuthHostsPort = new RegExp(
                '^[\\/\\\\]*(?:([^\\/\\\\?#]*)@)?' +            // leading slashes and authority
                '(' + arr.join('|') + ')' +                     // allowed hosts, in regexp
                '(?:$|(?::([\\d\\t\\n\\r]*))?($|[\\/?#\\\\]))', // until EOF, an optional port or a delimeter
                'i');                                           // case insensitive required for hosts
        }
        // extract the auth, host and port number if options.absCallback is supplied
        else if (absCallback) {
            // the default reAuthHostsPort. see above for details
            //   host must be present, auth/port optional
            //   accept \t\n\r, which will be later stripped
            //   EXCEPT: no delimeter detection as host regex here will match everything
            reAuthHostsPort = /^[\/\\]*(?:([^\/\\?#]*)@)?([^\x00#\/:?\[\]\\]+|\[(?:[^\x00\/?#\\]+)\])(?::([\d\t\n\r]*))?/;
        }

        /*
         * @param {string} url 
         * @param extraArg - an optional extra argument for the callback
         * @returns {string|} the url - the url itself, or prefixed with 
         *   "unsafe:" if it fails the tests. In case absCallback/relCallback
         *   is supplied, the output is controled by the callback for those 
         *   urls that pass the tests.
         */
        return function(url, extraArg) {
            var protocol, authHostPort, i = 0, charCode, urlTemp;

            if (options.htmlDecode) {
                url = htmlDecode(url);
            }
            
            // remove leading whitespaces (don't care the trailing whitespaces)
            // Ref: #1 in https://url.spec.whatwg.org/#concept-basic-url-parser 
            while ((charCode = url.charCodeAt(i)) >= 0 && charCode <= 32) { i++; }
            i > 0 && (url = url.slice(i));

            // options.relPathOnly will bypass any check on protocol
            if (options.relPathOnly) {
                return reRelPath.test(url) ? 
                    (options.relCallback ? options.relCallback(url, extraArg) : url) :
                    'unsafe' + url;
            }

            // reRelPath ensures no scheme/auth/host/port
            if (options.relPath && reRelPath.test(url)) {
                return options.relCallback ? 
                    options.relCallback(url, extraArg) : 
                    url;
            }

            // match the protocol, could be from a safe image Data URI
            if ((protocol = reProtos.exec(url) || 
                    reImgDataURIs && reImgDataURIs.exec(url))) {
                
                // either there's no auth/host/port restrictions
                if (!reAuthHostsPort) { return url; }

                // get the remaining url for further matching
                urlTemp = url.slice(protocol[0].length);
                // or auth, host and port are properly validated
                if ((authHostPort = reAuthHostsPort.exec(urlTemp))) {
                    return absCallback ? 
                            absCallback(url, 
                                // protocol captured using whitelist matching
                                // no reOriginWhitespaces treatment needed
                                protocol[1], 
                                // spec says whitespaces are syntax violation
                                // stripping them follows browsers' behavior
                                authHostPort[1] && authHostPort[1].replace(reOriginWhitespaces, ''), 
                                authHostPort[2].replace(reOriginWhitespaces, ''), 
                                authHostPort[3] && authHostPort[3].replace(reOriginWhitespaces, ''), 
                                // minus the captured delimeter if existed
                                urlTemp.slice(authHostPort[0].length - (authHostPort[4] ? 1 : 0)), 
                                extraArg) : 
                            url;
                }
            }

            return 'unsafe:' + url;
        };
    }
    

    function cssEncode(chr) {
        // space after \\HEX is needed by spec
        return '\\' + chr.charCodeAt(0).toString(16).toLowerCase() + ' ';
    }
    function cssBlacklist(s) {
        return s.replace(CSS_BLACKLIST, function(m){ return '-x-' + m; });
    }
    function cssUrl(s) {
        return s === undefined ? 'undefined'
            : s === null ? 'null'
            // encodeURI() in yufull() will throw error for use of the CSS_UNSUPPORTED_CODE_POINT (i.e., [\uD800-\uDFFF])
            // prefix ## for blacklisted protocols
            // it's safe to skipHtmlDecoding for getProtocol() as s is already html-decoded (and also all NULLs are replaced with \uFFFD)
            : URI_BLACKLIST_PROTOCOLS[getProtocol((s = x.yufull(htmlDecode(s.toString()))), true)] ? '##' + s : s;
    }

    return (x = {
        urlFilterFactory: urlFilterFactory,
        yHtmlDecode: htmlDecode,
        /*
         * @param {string} s - An untrusted uri input
         * @returns {string} s - null if no protocol found, otherwise the protocol with whitespaces stripped and lower-cased
         */
        yup: getProtocol,

        /*
         * @deprecated
         * @param {string} s - An untrusted user input
         * @returns {string} s - The original user input with & < > " ' ` encoded respectively as &amp; &lt; &gt; &quot; &#39; and &#96;.
         *
         */
        y: function(s) {
            return strReplace(s, SPECIAL_HTML_CHARS, function (m) {
                return m === '&' ? '&amp;'
                    :  m === '<' ? '&lt;'
                    :  m === '>' ? '&gt;'
                    :  m === '"' ? '&quot;'
                    :  m === "'" ? '&#39;'
                    :  /*m === '`'*/ '&#96;';       // in hex: 60
            });
        },

        // This filter is meant to introduce double-encoding, and should be used with extra care.
        ya: function(s) {
            return strReplace(s, AMP, '&amp;');
        },

        // FOR DETAILS, refer to inHTMLData()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#data-state
        yd: function (s) {
            return strReplace(s, LT, '&lt;');
        },

        // FOR DETAILS, refer to inHTMLComment()
        // All NULL characters in s are first replaced with \uFFFD.
        // If s contains -->, --!>, or starts with -*>, insert a space right before > to stop state breaking at <!--{{{yc s}}}-->
        // If s ends with --!, --, or -, append a space to stop collaborative state breaking at {{{yc s}}}>, {{{yc s}}}!>, {{{yc s}}}-!>, {{{yc s}}}->
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#comment-state
        // Reference: http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-3
        // Reference: http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment
        // Reference: http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-0021
        // If s contains ]> or ends with ], append a space after ] is verified in IE to stop IE conditional comments.
        // Reference: http://msdn.microsoft.com/en-us/library/ms537512%28v=vs.85%29.aspx
        // We do not care --\s>, which can possibly be intepreted as a valid close comment tag in very old browsers (e.g., firefox 3.6), as specified in the html4 spec
        // Reference: http://www.w3.org/TR/html401/intro/sgmltut.html#h-3.2.4
        yc: function (s) {
            return strReplace(s, SPECIAL_COMMENT_CHARS, function(m){
                return m === '\x00' ? '\uFFFD'
                    : m === '--!' || m === '--' || m === '-' || m === ']' ? m + ' '
                    :/*
                    :  m === ']>'   ? '] >'
                    :  m === '-->'  ? '-- >'
                    :  m === '--!>' ? '--! >'
                    : /-*!?>/.test(m) ? */ m.slice(0, -1) + ' >';
            });
        },

        // FOR DETAILS, refer to inDoubleQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state
        yavd: function (s) {
            return strReplace(s, QUOT, '&quot;');
        },

        // FOR DETAILS, refer to inSingleQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state
        yavs: function (s) {
            return strReplace(s, SQUOT, '&#39;');
        },

        // FOR DETAILS, refer to inUnQuotedAttr()
        // PART A.
        // if s contains any state breaking chars (\t, \n, \v, \f, \r, space, and >),
        // they are escaped and encoded into their equivalent HTML entity representations. 
        // Reference: http://shazzer.co.uk/database/All/Characters-which-break-attributes-without-quotes
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state
        //
        // PART B. 
        // if s starts with ', " or `, encode it resp. as &#39;, &quot;, or &#96; to 
        // enforce the attr value (unquoted) state
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
        // Reference: http://shazzer.co.uk/vector/Characters-allowed-attribute-quote
        // 
        // PART C.
        // Inject a \uFFFD character if an empty or all null string is encountered in 
        // unquoted attribute value state.
        // 
        // Rationale 1: our belief is that developers wouldn't expect an 
        //   empty string would result in ' name="passwd"' rendered as 
        //   attribute value, even though this is how HTML5 is specified.
        // Rationale 2: an empty or all null string (for IE) can 
        //   effectively alter its immediate subsequent state, we choose
        //   \uFFFD to end the unquoted attr 
        //   state, which therefore will not mess up later contexts.
        // Rationale 3: Since IE 6, it is verified that NULL chars are stripped.
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state
        // 
        // Example:
        // <input value={{{yavu s}}} name="passwd"/>
        yavu: function (s) {
            return strReplace(s, SPECIAL_ATTR_VALUE_UNQUOTED_CHARS, function (m) {
                return m === '\t'   ? '&#9;'  // in hex: 09
                    :  m === '\n'   ? '&#10;' // in hex: 0A
                    :  m === '\x0B' ? '&#11;' // in hex: 0B  for IE. IE<9 \v equals v, so use \x0B instead
                    :  m === '\f'   ? '&#12;' // in hex: 0C
                    :  m === '\r'   ? '&#13;' // in hex: 0D
                    :  m === ' '    ? '&#32;' // in hex: 20
                    :  m === '='    ? '&#61;' // in hex: 3D
                    :  m === '<'    ? '&lt;'
                    :  m === '>'    ? '&gt;'
                    :  m === '"'    ? '&quot;'
                    :  m === "'"    ? '&#39;'
                    :  m === '`'    ? '&#96;'
                    : /*empty or null*/ '\uFFFD';
            });
        },

        yu: encodeURI,
        yuc: encodeURIComponent,

        // Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yavd/yavs/yavu)
        // This is used to disable JS execution capabilities by prefixing x- to ^javascript:, ^vbscript: or ^data: that possibly could trigger script execution in URI attribute context
        yubl: function (s) {
            // here the output s in either branch will not be html-decoded, 
            return URI_BLACKLIST_PROTOCOLS[getProtocol(s)] ? 'x-' + s : s;
        },

        // This is NOT a security-critical filter.
        // Reference: https://tools.ietf.org/html/rfc3986
        yufull: function (s) {
            return x.yu(s).replace(URL_IPV6, function(m, p) {
                return '//[' + p + ']';
            });
        },

        // chain yufull() with yubl()
        yublf: function (s) {
            return x.yubl(x.yufull(s));
        },

        // The design principle of the CSS filter MUST meet the following goal(s).
        // (1) The input cannot break out of the context (expr) and this is to fulfill the just sufficient encoding principle.
        // (2) The input cannot introduce CSS parsing error and this is to address the concern of UI redressing.
        //
        // term
        //   : unary_operator?
        //     [ NUMBER S* | PERCENTAGE S* | LENGTH S* | EMS S* | EXS S* | ANGLE S* |
        //     TIME S* | FREQ S* ]
        //   | STRING S* | IDENT S* | URI S* | hexcolor | function
        // 
        // Reference:
        // * http://www.w3.org/TR/CSS21/grammar.html 
        // * http://www.w3.org/TR/css-syntax-3/
        // 
        // NOTE: delimiter in CSS -  \  _  :  ;  (  )  "  '  /  ,  %  #  !  *  @  .  {  }
        //                        2d 5c 5f 3a 3b 28 29 22 27 2f 2c 25 23 21 2a 40 2e 7b 7d

        yceu: function(s) {
            s = htmlDecode(s);
            return CSS_VALID_VALUE.test(s) ? s : ";-x:'" + cssBlacklist(s.replace(CSS_SINGLE_QUOTED_CHARS, cssEncode)) + "';-v:";
        },

        // string1 = \"([^\n\r\f\\"]|\\{nl}|\\[^\n\r\f0-9a-f]|\\[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?)*\"
        yced: function(s) {
            return cssBlacklist(htmlDecode(s).replace(CSS_DOUBLE_QUOTED_CHARS, cssEncode));
        },

        // string2 = \'([^\n\r\f\\']|\\{nl}|\\[^\n\r\f0-9a-f]|\\[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?)*\'
        yces: function(s) {
            return cssBlacklist(htmlDecode(s).replace(CSS_SINGLE_QUOTED_CHARS, cssEncode));
        },

        // for url({{{yceuu url}}}
        // unquoted_url = ([!#$%&*-~]|\\{h}{1,6}(\r\n|[ \t\r\n\f])?|\\[^\r\n\f0-9a-f])* (CSS 2.1 definition)
        // unquoted_url = ([^"'()\\ \t\n\r\f\v\u0000\u0008\u000b\u000e-\u001f\u007f]|\\{h}{1,6}(\r\n|[ \t\r\n\f])?|\\[^\r\n\f0-9a-f])* (CSS 3.0 definition)
        // The state machine in CSS 3.0 is more well defined - http://www.w3.org/TR/css-syntax-3/#consume-a-url-token0
        // CSS_UNQUOTED_URL = /['\(\)]/g; // " \ treated by encodeURI()   
        yceuu: function(s) {
            return cssUrl(s).replace(CSS_UNQUOTED_URL, function (chr) {
                return  chr === '\''        ? '\\27 ' :
                        chr === '('         ? '%28' :
                        /* chr === ')' ? */   '%29';
            });
        },

        // for url("{{{yceud url}}}
        yceud: function(s) { 
            return cssUrl(s);
        },

        // for url('{{{yceus url}}}
        yceus: function(s) { 
            return cssUrl(s).replace(SQUOT, '\\27 ');
        }
    });
};

// exposing privFilters
// this is an undocumented feature, and please use it with extra care
var privFilters = exports._privFilters = exports._getPrivFilters();


/* chaining filters */

// uriInAttr and literally uriPathInAttr
// yubl is always used 
// Rationale: given pattern like this: <a href="{{{uriPathInDoubleQuotedAttr s}}}">
//            developer may expect s is always prefixed with ? or /, but an attacker can abuse it with 'javascript:alert(1)'
function uriInAttr (s, yav, yu) {
    return privFilters.yubl(yav((yu || privFilters.yufull)(s)));
}

/** 
* Yahoo Secure XSS Filters - just sufficient output filtering to prevent XSS!
* @module xss-filters 
*/

/**
* @function module:xss-filters#inHTMLData
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with '<' encoded as '&amp;lt;'
*
* @description
* This filter is to be placed in HTML Data context to encode all '<' characters into '&amp;lt;'
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <div>{{{inHTMLData htmlData}}}</div>
*
*/
exports.inHTMLData = privFilters.yd;

/**
* @function module:xss-filters#inHTMLComment
*
* @param {string} s - An untrusted user input
* @returns {string} All NULL characters in s are first replaced with \uFFFD. If s contains -->, --!>, or starts with -*>, insert a space right before > to stop state breaking at <!--{{{yc s}}}-->. If s ends with --!, --, or -, append a space to stop collaborative state breaking at {{{yc s}}}>, {{{yc s}}}!>, {{{yc s}}}-!>, {{{yc s}}}->. If s contains ]> or ends with ], append a space after ] is verified in IE to stop IE conditional comments.
*
* @description
* This filter is to be placed in HTML Comment context
* <ul>
* <li><a href="http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-3">Shazzer - Closing comments for -.-></a>
* <li><a href="http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment">Shazzer - Closing comments for --.></a>
* <li><a href="http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-0021">Shazzer - Closing comments for .></a>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-start-state">HTML5 Comment Start State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-start-dash-state">HTML5 Comment Start Dash State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-end-dash-state">HTML5 Comment End Dash State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-end-state">HTML5 Comment End State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-end-bang-state">HTML5 Comment End Bang State</a></li>
* <li><a href="http://msdn.microsoft.com/en-us/library/ms537512%28v=vs.85%29.aspx">Conditional Comments in Internet Explorer</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- {{{inHTMLComment html_comment}}} -->
*
*/
exports.inHTMLComment = privFilters.yc;

/**
* @function module:xss-filters#inSingleQuotedAttr
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with any single-quote characters encoded into '&amp;&#39;'.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InSingleQuotedAttr filter </p>
* This filter is to be placed in HTML Attribute Value (single-quoted) state to encode all single-quote characters into '&amp;&#39;'
*
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <input name='firstname' value='{{{inSingleQuotedAttr firstname}}}' />
*
*/
exports.inSingleQuotedAttr = privFilters.yavs;

/**
* @function module:xss-filters#inDoubleQuotedAttr
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with any single-quote characters encoded into '&amp;&quot;'.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InDoubleQuotedAttr filter </p>
* This filter is to be placed in HTML Attribute Value (double-quoted) state to encode all single-quote characters into '&amp;&quot;'
*
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <input name="firstname" value="{{{inDoubleQuotedAttr firstname}}}" />
*
*/
exports.inDoubleQuotedAttr = privFilters.yavd;

/**
* @function module:xss-filters#inUnQuotedAttr
*
* @param {string} s - An untrusted user input
* @returns {string} If s contains any state breaking chars (\t, \n, \v, \f, \r, space, null, ', ", `, <, >, and =), they are escaped and encoded into their equivalent HTML entity representations. If the string is empty, inject a \uFFFD character.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InUnQuotedAttr filter </p>
* <p>Regarding \uFFFD injection, given <a id={{{id}}} name="passwd">,<br/>
*        Rationale 1: our belief is that developers wouldn't expect when id equals an
*          empty string would result in ' name="passwd"' rendered as 
*          attribute value, even though this is how HTML5 is specified.<br/>
*        Rationale 2: an empty or all null string (for IE) can 
*          effectively alter its immediate subsequent state, we choose
*          \uFFFD to end the unquoted attr 
*          state, which therefore will not mess up later contexts.<br/>
*        Rationale 3: Since IE 6, it is verified that NULL chars are stripped.<br/>
*        Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state</p>
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state">HTML5 Before Attribute Value State</a></li>
* <li><a href="http://shazzer.co.uk/database/All/Characters-which-break-attributes-without-quotes">Shazzer - Characters-which-break-attributes-without-quotes</a></li>
* <li><a href="http://shazzer.co.uk/vector/Characters-allowed-attribute-quote">Shazzer - Characters-allowed-attribute-quote</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <input name="firstname" value={{{inUnQuotedAttr firstname}}} />
*
*/
exports.inUnQuotedAttr = privFilters.yavu;


/**
* @function module:xss-filters#uriInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded first by window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for an <strong>absolute</strong> URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='{{{uriInSingleQuotedAttr full_uri}}}'>link</a>
* 
*/
exports.uriInSingleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavs);
};

/**
* @function module:xss-filters#uriInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded first by window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for an <strong>absolute</strong> URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="{{{uriInDoubleQuotedAttr full_uri}}}">link</a>
* 
*/
exports.uriInDoubleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavd);
};


/**
* @function module:xss-filters#uriInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded first by window.encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for an <strong>absolute</strong> URI.<br/>
* The correct order of encoders is thus: first the built-in encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href={{{uriInUnQuotedAttr full_uri}}}>link</a>
* 
*/
exports.uriInUnQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavu);
};

/**
* @function module:xss-filters#uriInHTMLData
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded by window.encodeURI() and then inHTMLData()
*
* @description
* This filter is to be placed in HTML Data state for an <strong>absolute</strong> URI.
*
* <p>Notice: The actual implementation skips inHTMLData(), since '<' is already encoded as '%3C' by encodeURI().</p>
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="/somewhere">{{{uriInHTMLData full_uri}}}</a>
* 
*/
exports.uriInHTMLData = privFilters.yufull;


/**
* @function module:xss-filters#uriInHTMLComment
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded by window.encodeURI(), and finally inHTMLComment()
*
* @description
* This filter is to be placed in HTML Comment state for an <strong>absolute</strong> URI.
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- {{{uriInHTMLComment full_uri}}} -->
* 
*/
exports.uriInHTMLComment = function (s) {
    return privFilters.yc(privFilters.yufull(s));
};




/**
* @function module:xss-filters#uriPathInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded first by window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for a URI Path/Query or relative URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='http://example.com/{{{uriPathInSingleQuotedAttr uri_path}}}'>link</a>
* <a href='http://example.com/?{{{uriQueryInSingleQuotedAttr uri_query}}}'>link</a>
* 
*/
exports.uriPathInSingleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavs, privFilters.yu);
};

/**
* @function module:xss-filters#uriPathInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded first by window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for a URI Path/Query or relative URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/{{{uriPathInDoubleQuotedAttr uri_path}}}">link</a>
* <a href="http://example.com/?{{{uriQueryInDoubleQuotedAttr uri_query}}}">link</a>
* 
*/
exports.uriPathInDoubleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavd, privFilters.yu);
};


/**
* @function module:xss-filters#uriPathInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded first by window.encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for a URI Path/Query or relative URI.<br/>
* The correct order of encoders is thus: first the built-in encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href=http://example.com/{{{uriPathInUnQuotedAttr uri_path}}}>link</a>
* <a href=http://example.com/?{{{uriQueryInUnQuotedAttr uri_query}}}>link</a>
* 
*/
exports.uriPathInUnQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavu, privFilters.yu);
};

/**
* @function module:xss-filters#uriPathInHTMLData
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded by window.encodeURI() and then inHTMLData()
*
* @description
* This filter is to be placed in HTML Data state for a URI Path/Query or relative URI.
*
* <p>Notice: The actual implementation skips inHTMLData(), since '<' is already encoded as '%3C' by encodeURI().</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/">http://example.com/{{{uriPathInHTMLData uri_path}}}</a>
* <a href="http://example.com/">http://example.com/?{{{uriQueryInHTMLData uri_query}}}</a>
* 
*/
exports.uriPathInHTMLData = privFilters.yu;


/**
* @function module:xss-filters#uriPathInHTMLComment
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded by window.encodeURI(), and finally inHTMLComment()
*
* @description
* This filter is to be placed in HTML Comment state for a URI Path/Query or relative URI.
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- http://example.com/{{{uriPathInHTMLComment uri_path}}} -->
* <!-- http://example.com/?{{{uriQueryInHTMLComment uri_query}}} -->
*/
exports.uriPathInHTMLComment = function (s) {
    return privFilters.yc(privFilters.yu(s));
};


/**
* @function module:xss-filters#uriQueryInSingleQuotedAttr
* @description This is an alias of {@link module:xss-filters#uriPathInSingleQuotedAttr}
* 
* @alias module:xss-filters#uriPathInSingleQuotedAttr
*/
exports.uriQueryInSingleQuotedAttr = exports.uriPathInSingleQuotedAttr;

/**
* @function module:xss-filters#uriQueryInDoubleQuotedAttr
* @description This is an alias of {@link module:xss-filters#uriPathInDoubleQuotedAttr}
* 
* @alias module:xss-filters#uriPathInDoubleQuotedAttr
*/
exports.uriQueryInDoubleQuotedAttr = exports.uriPathInDoubleQuotedAttr;

/**
* @function module:xss-filters#uriQueryInUnQuotedAttr
* @description This is an alias of {@link module:xss-filters#uriPathInUnQuotedAttr}
* 
* @alias module:xss-filters#uriPathInUnQuotedAttr
*/
exports.uriQueryInUnQuotedAttr = exports.uriPathInUnQuotedAttr;

/**
* @function module:xss-filters#uriQueryInHTMLData
* @description This is an alias of {@link module:xss-filters#uriPathInHTMLData}
* 
* @alias module:xss-filters#uriPathInHTMLData
*/
exports.uriQueryInHTMLData = exports.uriPathInHTMLData;

/**
* @function module:xss-filters#uriQueryInHTMLComment
* @description This is an alias of {@link module:xss-filters#uriPathInHTMLComment}
* 
* @alias module:xss-filters#uriPathInHTMLComment
*/
exports.uriQueryInHTMLComment = exports.uriPathInHTMLComment;



/**
* @function module:xss-filters#uriComponentInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inSingleQuotedAttr()
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for a URI Component.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inSingleQuotedAttr()
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='http://example.com/?q={{{uriComponentInSingleQuotedAttr uri_component}}}'>link</a>
* 
*/
exports.uriComponentInSingleQuotedAttr = function (s) {
    return privFilters.yavs(privFilters.yuc(s));
};

/**
* @function module:xss-filters#uriComponentInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inDoubleQuotedAttr()
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for a URI Component.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inDoubleQuotedAttr()
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/?q={{{uriComponentInDoubleQuotedAttr uri_component}}}">link</a>
* 
*/
exports.uriComponentInDoubleQuotedAttr = function (s) {
    return privFilters.yavd(privFilters.yuc(s));
};


/**
* @function module:xss-filters#uriComponentInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inUnQuotedAttr()
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for a URI Component.<br/>
* The correct order of encoders is thus: first the built-in encodeURIComponent(), then inUnQuotedAttr()
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href=http://example.com/?q={{{uriComponentInUnQuotedAttr uri_component}}}>link</a>
* 
*/
exports.uriComponentInUnQuotedAttr = function (s) {
    return privFilters.yavu(privFilters.yuc(s));
};

/**
* @function module:xss-filters#uriComponentInHTMLData
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded by window.encodeURIComponent() and then inHTMLData()
*
* @description
* This filter is to be placed in HTML Data state for a URI Component.
*
* <p>Notice: The actual implementation skips inHTMLData(), since '<' is already encoded as '%3C' by encodeURIComponent().</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/">http://example.com/?q={{{uriComponentInHTMLData uri_component}}}</a>
* <a href="http://example.com/">http://example.com/#{{{uriComponentInHTMLData uri_fragment}}}</a>
* 
*/
exports.uriComponentInHTMLData = privFilters.yuc;


/**
* @function module:xss-filters#uriComponentInHTMLComment
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded by window.encodeURIComponent(), and finally inHTMLComment()
*
* @description
* This filter is to be placed in HTML Comment state for a URI Component.
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- http://example.com/?q={{{uriComponentInHTMLComment uri_component}}} -->
* <!-- http://example.com/#{{{uriComponentInHTMLComment uri_fragment}}} -->
*/
exports.uriComponentInHTMLComment = function (s) {
    return privFilters.yc(privFilters.yuc(s));
};


// uriFragmentInSingleQuotedAttr
// added yubl on top of uriComponentInAttr 
// Rationale: given pattern like this: <a href='{{{uriFragmentInSingleQuotedAttr s}}}'>
//            developer may expect s is always prefixed with #, but an attacker can abuse it with 'javascript:alert(1)'

/**
* @function module:xss-filters#uriFragmentInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Fragment
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for a URI Fragment.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='http://example.com/#{{{uriFragmentInSingleQuotedAttr uri_fragment}}}'>link</a>
* 
*/
exports.uriFragmentInSingleQuotedAttr = function (s) {
    return privFilters.yubl(privFilters.yavs(privFilters.yuc(s)));
};

// uriFragmentInDoubleQuotedAttr
// added yubl on top of uriComponentInAttr 
// Rationale: given pattern like this: <a href="{{{uriFragmentInDoubleQuotedAttr s}}}">
//            developer may expect s is always prefixed with #, but an attacker can abuse it with 'javascript:alert(1)'

/**
* @function module:xss-filters#uriFragmentInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Fragment
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for a URI Fragment.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/#{{{uriFragmentInDoubleQuotedAttr uri_fragment}}}">link</a>
* 
*/
exports.uriFragmentInDoubleQuotedAttr = function (s) {
    return privFilters.yubl(privFilters.yavd(privFilters.yuc(s)));
};

// uriFragmentInUnQuotedAttr
// added yubl on top of uriComponentInAttr 
// Rationale: given pattern like this: <a href={{{uriFragmentInUnQuotedAttr s}}}>
//            developer may expect s is always prefixed with #, but an attacker can abuse it with 'javascript:alert(1)'

/**
* @function module:xss-filters#uriFragmentInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Fragment
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for a URI Fragment.<br/>
* The correct order of encoders is thus: first the built-in encodeURIComponent(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href=http://example.com/#{{{uriFragmentInUnQuotedAttr uri_fragment}}}>link</a>
* 
*/
exports.uriFragmentInUnQuotedAttr = function (s) {
    return privFilters.yubl(privFilters.yavu(privFilters.yuc(s)));
};


/**
* @function module:xss-filters#uriFragmentInHTMLData
* @description This is an alias of {@link module:xss-filters#uriComponentInHTMLData}
* 
* @alias module:xss-filters#uriComponentInHTMLData
*/
exports.uriFragmentInHTMLData = exports.uriComponentInHTMLData;

/**
* @function module:xss-filters#uriFragmentInHTMLComment
* @description This is an alias of {@link module:xss-filters#uriComponentInHTMLComment}
* 
* @alias module:xss-filters#uriComponentInHTMLComment
*/
exports.uriFragmentInHTMLComment = exports.uriComponentInHTMLComment;
