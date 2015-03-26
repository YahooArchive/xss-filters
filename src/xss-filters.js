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

    var STR_UD = 'undefined',
        STR_NL = 'null',
        LT     = /</g,
        QUOT   = /"/g,
        SQUOT  = /'/g,
        NULL   = /\x00/g,
        SPECIAL_ATTR_VALUE_UNQUOTED_CHARS = /(?:^(?:["'`]|\x00+$|$)|[\x09-\x0D >])/g,
        SPECIAL_HTML_CHARS = /[&<>"'`]/g, 
        SPECIAL_COMMENT_CHARS = /(?:^-*!?>|--!?>|--?!?$|\]>|\]$)/g;

    // Given a full URI, need to support "[" ( IPv6address ) "]" in URI as per RFC3986
    // Reference: https://tools.ietf.org/html/rfc3986
    var URL_IPV6 = /\/\/%5[Bb]([A-Fa-f0-9:]+)%5[Dd]/;


    // Reference: http://shazzer.co.uk/database/All/characters-allowd-in-html-entities
    // Reference: http://shazzer.co.uk/vector/Characters-allowed-after-ampersand-in-named-character-references
    // Reference: http://shazzer.co.uk/database/All/Characters-before-javascript-uri
    // Reference: http://shazzer.co.uk/database/All/Characters-after-javascript-uri
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
    // Reference for named characters: https://html.spec.whatwg.org/multipage/entities.json
    var URI_BLACKLIST_PROTOCOLS = ['javascript', 'data', 'vbscript', 'mhtml'],
        URI_PROTOCOL_COLON = /(?::|&#[xX]0*3[aA];?|&#0*58;?|&colon;)/,
        URI_PROTOCOL_HTML_ENTITIES = /&(?:#([xX][0-9A-Fa-f]+|\d+);?|Tab;|NewLine;)/g,
        URI_PROTOCOL_WHITESPACES = /(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,
        codePointConvertor = String.fromCodePoint || String.fromCharCode,
        x;

    return (x = {
        /*
         * @param {string} s - An untrusted uri input
         * @returns {string} s - null if relative url, otherwise the protocol with whitespaces stripped and lower-cased
         */
        yup: function(s) {
            s = s.replace(NULL, '').split(URI_PROTOCOL_COLON, 2);
            return (s.length >= 2 && s[0]) ? s[0].replace(URI_PROTOCOL_HTML_ENTITIES, function (m, p) {
                        return (typeof p === STR_UD) ? '' // &Tab; &NewLine; will be stripped
                            : codePointConvertor((p[0] === 'X' || p[0] === 'x') ? '0' + p : p);
                    })
                    // required for left trim and remove interim whitespaces
                    .replace(URI_PROTOCOL_WHITESPACES, '')
                    .toLowerCase()
                : null;
        },

        /*
         * @param {string} s - An untrusted user input
         * @returns {string} s - The original user input with & < > " ' ` encoded respectively as &amp; &lt; &gt; &quot; &#39; and &#96;.
         *
         * @description
         * <p>This filter is a fallback to use the standard HTML escaping (i.e., encoding &<>"'`)
         * in contexts that are currently not handled by the automatic context-sensitive templating solution.</p>
         *
         * See workaround at https://github.com/yahoo/xss-filters#warnings
         */
        y: function(s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(SPECIAL_HTML_CHARS, function (m) {
                        return m === '&' ? '&amp;'
                            :  m === '<' ? '&lt;'
                            :  m === '>' ? '&gt;'
                            :  m === '"' ? '&quot;'
                            :  m === "'" ? '&#39;'
                            :  /*m === '`'*/ '&#96;';       // in hex: 60
                    });
        },

        // FOR DETAILS, refer to inHTMLData()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#data-state
        yd: function (s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(LT, '&lt;');
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
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(NULL, '\uFFFD')
                    .replace(SPECIAL_COMMENT_CHARS, function(m){
                        return m === '--!' || m === '--' || m === '-' || m === ']' ? m + ' '
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
            return typeof s === STR_UD  ? STR_UD
                 : s === null           ? STR_NL
                 : s.toString()
                    .replace(QUOT, '&quot;');
        },

        // FOR DETAILS, refer to inSingleQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state
        yavs: function (s) {
            return typeof s === STR_UD  ? STR_UD
                 : s === null           ? STR_NL
                 : s.toString()
                    .replace(SQUOT, '&#39;');
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
            return typeof s === STR_UD ? STR_UD
                : s === null           ? STR_NL
                : s.toString().replace(SPECIAL_ATTR_VALUE_UNQUOTED_CHARS, function (m) {
                    return m === '\t' ? '&#9;'  // in hex: 09
                        :  m === '\n' ? '&#10;' // in hex: 0A
                        :  m === '\v' ? '&#11;' // in hex: 0B  for IE
                        :  m === '\f' ? '&#12;' // in hex: 0C
                        :  m === '\r' ? '&#13;' // in hex: 0D
                        :  m === ' '  ? '&#32;' // in hex: 20
                        :  m === '>'  ? '&gt;'
                        :  m === '"'  ? '&quot;'
                        :  m === "'"  ? '&#39;'
                        :  m === '`'  ? '&#96;'
                        : /*empty or all null*/ '\uFFFD';
                });
        },

        yu: encodeURI,
        yuc: encodeURIComponent,

        // Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yavd/yavs/yavu)
        // This is used to disable JS execution capabilities by prefixing x- to ^javascript:, ^vbscript: or ^data: that possibly could trigger script execution in URI attribute context
        yubl: function (s) {
            return URI_BLACKLIST_PROTOCOLS.indexOf(x.yup(s)) === -1 ? s : 'x-' + s;
        },

        // This is NOT a security-critical filter.
        // Reference: https://tools.ietf.org/html/rfc3986
        yufull: function (s) {
            return x.yu(s)
                    .replace(URL_IPV6, function(m, p) {
                        return '//[' + p + ']';
                    });
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
* <textarea>{{{inHTMLData html_data}}}</textarea>
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
*
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
* @returns {string} If s contains any state breaking chars (\t, \n, \v, \f, \r, space, and >), they are escaped and encoded into their equivalent HTML entity representations. If s starts with ', " or `, they are escaped to enforce the attr value (unquoted) state. If the whole string is empty or all null, inject a \uFFFD character.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InUnQuotedAttr filter </p>
* <p>Regarding \uFFFD injection,<br/>
*        Rationale 1: our belief is that developers wouldn't expect an 
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
