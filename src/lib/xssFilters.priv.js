/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/

/**
 * This file is all about undocumented features
 * Do not use it, or please use it with extra care
 */
var x = exports._privFilters || exports;

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

var strReplace = function (s, regexp, callback) {
        return s === undefined ? 'undefined'
                : s === null            ? 'null'
                : s.toString().replace(regexp, callback);
    };


function getProtocol(str, skipHtmlDecoding) {
    var m = skipHtmlDecoding || str.match(URI_PROTOCOL_ENCODED), i;
    if (m) {
        if (!skipHtmlDecoding) {
            // getProtocol() must run a greedy html decode algorithm, i.e., omit all NULLs before decoding (as in IE)
            // hence, \x00javascript:, &\x00#20;javascript:, and java\x00script: can all return javascript
            // and since all NULL is replaced with '', we can set skipNullReplacement in htmlDecode()
            str = x.yHtmlDecode(m[1].replace(NULL, ''), true);
        }
        i = str.indexOf(':');
        if (i !== -1) {
            return str.slice(0, i).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
        }
    }
    return null;
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
        : URI_BLACKLIST_PROTOCOLS[getProtocol((s = x.yufull(x.yHtmlDecode(s.toString()))), true)] ? '##' + s : s;
}




/*
 * @param {string} s - An untrusted uri input
 * @returns {string} s - null if no protocol found, otherwise the protocol with whitespaces stripped and lower-cased
 */
x.yup = getProtocol;

/*
 * @deprecated
 * @param {string} s - An untrusted user input
 * @returns {string} s - The original user input with & < > " ' ` encoded respectively as &amp; &lt; &gt; &quot; &#39; and &#96;.
 *
 */
x.y = function(s) {
    return strReplace(s, SPECIAL_HTML_CHARS, function (m) {
        return m === '&' ? '&amp;'
            :  m === '<' ? '&lt;'
            :  m === '>' ? '&gt;'
            :  m === '"' ? '&quot;'
            :  m === "'" ? '&#39;'
            :  /*m === '`'*/ '&#96;';       // in hex: 60
    });
};

// This filter is meant to introduce double-encoding, and should be used with extra care.
x.ya = function(s) {
    return strReplace(s, AMP, '&amp;');
};

// FOR DETAILS, refer to inHTMLData()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#data-state
x.yd = function (s) {
    return strReplace(s, LT, '&lt;');
};

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
x.yc = function (s) {
    return strReplace(s, SPECIAL_COMMENT_CHARS, function(m){
        return m === '\x00' ? '\uFFFD'
            : m === '--!' || m === '--' || m === '-' || m === ']' ? m + ' '
            :/*
            :  m === ']>'   ? '] >'
            :  m === '-->'  ? '-- >'
            :  m === '--!>' ? '--! >'
            : /-*!?>/.test(m) ? */ m.slice(0, -1) + ' >';
    });
};

// FOR DETAILS, refer to inDoubleQuotedAttr()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state
x.yavd = function (s) {
    return strReplace(s, QUOT, '&quot;');
};

// FOR DETAILS, refer to inSingleQuotedAttr()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state
x.yavs = function (s) {
    return strReplace(s, SQUOT, '&#39;');
};

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
x.yavu = function (s) {
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
};

x.yu = encodeURI;
x.yuc = encodeURIComponent;

// Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yavd/yavs/yavu)
// This is used to disable JS execution capabilities by prefixing x- to ^javascript:, ^vbscript: or ^data: that possibly could trigger script execution in URI attribute context
x.yubl = function (s) {
    // here the output s in either branch will not be html-decoded, 
    return URI_BLACKLIST_PROTOCOLS[getProtocol(s)] ? 'x-' + s : s;
};

// This is NOT a security-critical filter.
// Reference: https://tools.ietf.org/html/rfc3986
x.yufull = function (s) {
    return x.yu(s).replace(URL_IPV6, function(m, p) {
        return '//[' + p + ']';
    });
};

// chain yufull() with yubl()
x.yublf = function (s) {
    return x.yubl(x.yufull(s));
};

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

x.yceu = function(s) {
    s = x.yHtmlDecode(s);
    return CSS_VALID_VALUE.test(s) ? s : ";-x:'" + cssBlacklist(s.replace(CSS_SINGLE_QUOTED_CHARS, cssEncode)) + "';-v:";
};

// string1 = \"([^\n\r\f\\"]|\\{nl}|\\[^\n\r\f0-9a-f]|\\[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?)*\"
x.yced = function(s) {
    return cssBlacklist(x.yHtmlDecode(s).replace(CSS_DOUBLE_QUOTED_CHARS, cssEncode));
};

// string2 = \'([^\n\r\f\\']|\\{nl}|\\[^\n\r\f0-9a-f]|\\[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?)*\'
x.yces = function(s) {
    return cssBlacklist(x.yHtmlDecode(s).replace(CSS_SINGLE_QUOTED_CHARS, cssEncode));
};

// for url({{{yceuu url}}}
// unquoted_url = ([!#$%&*-~]|\\{h}{1,6}(\r\n|[ \t\r\n\f])?|\\[^\r\n\f0-9a-f])* (CSS 2.1 definition)
// unquoted_url = ([^"'()\\ \t\n\r\f\v\u0000\u0008\u000b\u000e-\u001f\u007f]|\\{h}{1,6}(\r\n|[ \t\r\n\f])?|\\[^\r\n\f0-9a-f])* (CSS 3.0 definition)
// The state machine in CSS 3.0 is more well defined - http://www.w3.org/TR/css-syntax-3/#consume-a-url-token0
// CSS_UNQUOTED_URL = /['\(\)]/g; // " \ treated by encodeURI()   
x.yceuu = function(s) {
    return cssUrl(s).replace(CSS_UNQUOTED_URL, function (chr) {
        return  chr === '\''        ? '\\27 ' :
                chr === '('         ? '%28' :
                /* chr === ')' ? */   '%29';
    });
};

// for url("{{{yceud url}}}
x.yceud = function(s) { 
    return cssUrl(s);
};

// for url('{{{yceus url}}}
x.yceus = function(s) { 
    return cssUrl(s).replace(SQUOT, '\\27 ');
};