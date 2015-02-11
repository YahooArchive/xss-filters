/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
(function () {
"use strict";

/*
* =====================================================
* NOT TO BE DIRECTLY USED. USE xss-filters.js INSTEAD
* =====================================================
*/


// TODO: remove the following mappings 
exports.FILTER_NOT_HANDLE = "y";
exports.FILTER_DATA = "yd";
exports.FILTER_COMMENT = "yc";
exports.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED = "yavd";
exports.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED = "yavs";
exports.FILTER_ATTRIBUTE_VALUE_UNQUOTED = "yavu";
exports.FILTER_ENCODE_URI = "yu";
exports.FILTER_ENCODE_URI_COMPONENT = "yuc";
exports.FILTER_URI_SCHEME_BLACKLIST = "yubl";
exports.FILTER_FULL_URI = "yufull";


var LT     = /</g,
    QUOT   = /\"/g,
    SQUOT  = /\'/g,
    SPECIAL_HTML_CHARS = /[&<>"']/g;

/*
 * @param {string} s - An untrusted user input
 * @returns {string} s - The original user input with & < > " ' encoded respectively as &amp; &lt; &gt; &quot; and &#39;.
 *
 * @description
 * <p>This filter is a fallback to use the standard HTML escaping (i.e., encoding &<>"')
 * in contexts that are currently not handled by the automatic context-sensitive templating solution.</p>
 *
 * Workaround this problem by following the suggestion below:
 * Use <input id="strJS" value="{{xssFilters.inHTMLData(data)}}"> 
 * and retrieve your data with document.getElementById('strJS').value. 
 *
 */
exports.y = function(s) {
    // s if undefined has no toString() method. String(s) will return 'undefined'
    if (typeof s !== 'string') {
        s = String(s);
    }

    return s.replace(SPECIAL_HTML_CHARS, function (m) {
        if (m === '&')      { return '&amp;';  }
        if (m === '<')      { return '&lt;';   }
        if (m === '>')      { return '&gt;';   }
        if (m === '"')      { return '&quot;'; }
        /* if (m === "'") */  return '&#39;';
    });
};


// FOR DETAILS, refer to inHTMLData()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#data-state
exports.yd = function (s) {
    // s if undefined has no toString() method. String(s) will return 'undefined'
    if (typeof s !== 'string') {
        s = String(s);
    }
    return s.replace(LT, '&lt;');
};


var COMMENT_SENSITIVE_CHARS = /(--!?>|--?!?$|\]>|\]$)/g;
// FOR DETAILS, refer to inHTMLComment()
// '-->' and '--!>' are modified as '-- >' and '--! >' so as stop comment state breaking
// for string ends with '--!', '--', or '-' are appended with a space, so as to stop collaborative state breaking at {{s}}>, {{s}}!>, {{s}}->
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#comment-state
// ']>' and 'ends with ]' patterns deal with IE conditional comments. verified in IE that '] >' can stop that.
// Reference: http://msdn.microsoft.com/en-us/library/ms537512%28v=vs.85%29.aspx
exports.yc = function (s) {
    // s if undefined has no toString() method. String(s) will return 'undefined'
    if (typeof s !== 'string') {
        s = String(s);
    }
    return s.replace(COMMENT_SENSITIVE_CHARS, function(m){
        if (m === '-->')  { return '-- >';  }
        if (m === '--!>') { return '--! >'; }
        if (m === '--!')  { return '--! ';  }
        if (m === '--')   { return '-- ';   }
        if (m === '-')    { return '- ';    }
        if (m === ']>')   { return '] >';   }
        /*if (m === ']')*/   return '] ';
    });
};

// Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
var BEFORE_ATTR_VALUE_CHARS = /^["']/;
var ATTR_VALUE_UNQUOTED_CHARS = /[\t\n\f >]/g;

// FOR DETAILS, refer to inDoubleQuotedAttr()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state
exports.yavd = function (s) {
    if (typeof s !== 'string') {
        s = String(s);
    }

    return s.replace(QUOT, '&quot;');
};

// FOR DETAILS, refer to inSingleQuotedAttr()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state
exports.yavs = function (s) {
    if (typeof s !== 'string') {
        s = String(s);
    }

    return s.replace(SQUOT, '&#39;');
};

// FOR DETAILS, refer to inUnQuotedAttr()
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
exports.yavu = function (s, preserveEmptyString) {
    if (typeof s !== 'string') {
        s = String(s);
    }

    s = s.replace(ATTR_VALUE_UNQUOTED_CHARS, function (m) {
        if (m === '\t')    { return '&Tab;';     }
        if (m === '\n')    { return '&NewLine;'; }
        if (m === '\f')    { return '&#12;';     } // in hex: 0C
        if (m === ' ')     { return '&#32;';     } // in hex: 20
        /*if (m === '>')*/   return '&gt;';
    });

    // if s starts with ' or ", encode it resp. as &#39; or &quot; to enforce the attr value (unquoted) state
    // if instead starts with some whitespaces [\t\n\f ] then optionally a quote, 
    //    then the above encoding has already enforced the attr value (unquoted) state
    //    therefore, no need to encode the quote
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
    s = s.replace(BEFORE_ATTR_VALUE_CHARS, function (m) {
        if (m === '"')     { return '&quot;'; }
        /*if (m === "'")*/   return '&#39;';
    });

    // Inject NULL character if an empty string is encountered in 
    // unquoted attribute value state.
    //
    // Example:
    // <input value={{yav(s, exports.VALUE_UNQUOTED)}} name="passwd"/>
    //
    // Rationale 1: our belief is that developers wouldn't expect an 
    //   empty string would result in ' name="firstname"' rendered as 
    //   attribute value, even though this is how HTML5 is specified.
    // Rationale 2: an empty string can effectively alter its immediate
    //   subsequent state, which violates our design principle. As per 
    //   the HTML 5 spec, NULL or \u0000 is the magic character to end 
    //   the comment state, which therefore will not mess up later 
    //   contexts.
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
    if (!preserveEmptyString && s === '') {
        return '\u0000';
    }

    return s;
};

exports.VALUE_DOUBLE_QUOTED = 1;
exports.VALUE_SINGLE_QUOTED = 2;
exports.VALUE_UNQUOTED      = 3;
exports.yav = function (s, mode, preserveUnquotedEmptyString) {
    if (typeof mode !== 'number' || !(mode === 1 || mode === 2 || mode === 3)) {
        throw new Error('yav: mode must be either VALUE_DOUBLE_QUOTED, VALUE_SINGLE_QUOTED, or VALUE_UNQUOTED');
    }
    switch(mode) {
        case exports.VALUE_DOUBLE_QUOTED:
            return exports.yavd(s);
        case exports.VALUE_SINGLE_QUOTED:
            return exports.yavs(s);
        case exports.VALUE_UNQUOTED:
            return exports.yavu(s, preserveUnquotedEmptyString);
    }
};


exports.yu = encodeURI;
exports.yuc = encodeURIComponent;


var URI_FASTLANE = ['&', 'j', 'J', 'v', 'V'];

// Reference: https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet#Null_breaks_up_JavaScript_directive
// Reference: https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet#Embedded_newline_to_break_up_XSS
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
// Reference for named characters: https://html.spec.whatwg.org/multipage/entities.json
/*
var URI_BLACKLIST_INTERIM_WHITESPACE = [
    '(?:',
    [
        // encodeURI/encodeURIComponent has percentage encoded ASCII chars of decimal 0-32
        // '\u0000',                                
        // '\t', '\n', '\r',                        // tab, newline, carriage return
        '&#[xX]0*[9aAdD];?',                    // &#x9, &#xA, &#xD in hex
        '&#0*(?:9|10|13);?',                    // &#9, &#10, &#13 in dec
        '&Tab;', '&NewLine;'                   // tab, newline in char entities
    ].join('|'),
    ')*'
].join('');

// delay building the following as an RegExp() object until the first hit
var URI_BLACKLIST, URI_BLACKLIST_REGEXPSTR = [

    // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet#Spaces_and_meta_chars_before_the_JavaScript_in_images_for_XSS
    '^(?:',
    [
        // encodeURI/encodeURIComponent has percentage encoded ASCII chars of decimal 0-32
        // '\u0001', '\u0002', '\u0003', '\u0004', 
        // '\u0005', '\u0006', '\u0007', '\u0008', 
        // '\u0009', '\u000A', '\u000B', '\u000C', 
        // '\u000D', '\u000E', '\u000F', '\u0010', 
        // '\u0011', '\u0012', '\u0013', '\u0014', 
        // '\u0015', '\u0016', '\u0017', '\u0018', 
        // '\u0019', '\u001A', '\u001B', '\u001C', 
        // '\u001D', '\u001E', '\u001F', '\u0020', 
        '&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?',     // &#x1-20 in hex
        '&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?',   // &#1-32  in dec
        '&Tab;', '&NewLine;'                    // space, newline in char entities
        
    ].join('|'),
    ')*',


    // &#x6A;&#x61;&#x76;&#x61;             &#106&#97&#118&#97              java
    // &#x4A;&#x41;&#x56;&#x41;             &#74&#65&#86&#65                JAVA
    // &#x76;&#x62;                         &#118&#98                       vb
    // &#x56;&#x42;                         &#86&#66                        VB
    // &#x73;&#x63;&#x72;&#x69;&#x70;&#x74; &#115&#99&#114&#105&#112&#116   script
    // &#x53;&#x43;&#x52;&#x49;&#x50;&#x54; &#83&#67&#82&#73&#80&#84        SCRIPT
    // &#x3A;                               &#58                            :

    // java|vb
    '(?:',
    [
        // java
        [
            '(?:j|J|&#[xX]0*(?:6|4)[aA];?|&#0*(?:106|74);?)',
            '(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)',
            '(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)',
            '(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)',

        ].join(URI_BLACKLIST_INTERIM_WHITESPACE),
        // vb
        [
            '(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)',
            '(?:b|B|&#[xX]0*(?:6|4)2;?|&#0*(?:98|66);?)'

        ].join(URI_BLACKLIST_INTERIM_WHITESPACE)

    ].join('|'),
    ')',

    URI_BLACKLIST_INTERIM_WHITESPACE,

    // script:
    [
        '(?:s|S|&#[xX]0*(?:7|5)3;?|&#0*(?:115|83);?)',
        '(?:c|C|&#[xX]0*(?:6|4)3;?|&#0*(?:99|67);?)',
        '(?:r|R|&#[xX]0*(?:7|5)2;?|&#0*(?:114|82);?)',
        '(?:i|I|&#[xX]0*(?:6|4)9;?|&#0*(?:105|73);?)',
        '(?:p|P|&#[xX]0*(?:7|5)0;?|&#0*(?:112|80);?)',
        '(?:t|T|&#[xX]0*(?:7|5)4;?|&#0*(?:116|84);?)',
        '(?:\:|&#[xX]0*3[aA];?|&#0*58;?)'

    ].join(URI_BLACKLIST_INTERIM_WHITESPACE)
].join('');
*/

// delay building URI_BLACKLIST as an RegExp() object until the first hit
var URI_BLACKLIST = null, 
// the following str is generated by the above commented logic
    URI_BLACKLIST_REGEXPSTR = "^(?:&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?|&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?|&Tab;|&NewLine;)*(?:(?:j|J|&#[xX]0*(?:6|4)[aA];?|&#0*(?:106|74);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)|(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:b|B|&#[xX]0*(?:6|4)2;?|&#0*(?:98|66);?))(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:s|S|&#[xX]0*(?:7|5)3;?|&#0*(?:115|83);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:c|C|&#[xX]0*(?:6|4)3;?|&#0*(?:99|67);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:r|R|&#[xX]0*(?:7|5)2;?|&#0*(?:114|82);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:i|I|&#[xX]0*(?:6|4)9;?|&#0*(?:105|73);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:p|P|&#[xX]0*(?:7|5)0;?|&#0*(?:112|80);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:t|T|&#[xX]0*(?:7|5)4;?|&#0*(?:116|84);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?::|&#[xX]0*3[aA];?|&#0*58;?)";

/* 
 * =============================
 * Rationale on data: protocol
 * =============================
 * Given there're two execution possibilities:
 *  1. data:text/html,<script>alert(1)</script> in <(i)frame>'s src
 *     expected script execution but it's of a different origin than the included page. hence not CROSS-SITE scripting
 *  2. data:application/javascript,alert(1) or data:,alert(1) in <script>'s src,
 *     data:text/css in <style>'s src
 *     data:image/svg+xml in <svg>'s src
 *     We already made it clear in the DISCLAIMER that anything involving <script>, <style>, and <svg> tags won't be taken care of
 *  Finally, we don't care the use of data: protocol
 */
// Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yav)
// This is used to disable JS execution capabilities by prefixing x- to ^javascript: or ^vbscript: that possibly could trigger script execution in URI attribute context
exports.yubl = function (s) {
    
    // FASTLANE for well-known protocols or relative URLs
    // let go if the first char is not &, j, J, v nor V
    if (URI_FASTLANE.indexOf(s[0]) === -1) {
        return s;
    }
    
    // build URI_BLACKLIST as a RegExp() object
    if (URI_BLACKLIST === null) {
        URI_BLACKLIST = new RegExp(URI_BLACKLIST_REGEXPSTR);
    }

    return URI_BLACKLIST.test(s) ? 'x-' + s : s;
};

// Given a full URI, need to support "[" ( IPv6address ) "]" in URI as per RFC3986
// Reference: https://tools.ietf.org/html/rfc3986
var URL_IPV6 = /\/\/%5B([A-Fa-f0-9:]+)%5D/i;
exports.yufull = function (s) {
    return exports.yu(s).replace(URL_IPV6, function(m, p){ return ['//[', p, ']'].join(''); });
};


})();
