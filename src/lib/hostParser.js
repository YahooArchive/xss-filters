/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/

var _urlFilters = exports.urlFilters || exports;

// designed according to https://url.spec.whatwg.org/#percent-decode
var _reHostInvalidSyntax = /[\x00\t\n\r#%\/:?@\[\\\]]/g,
    _reUpto4HexDigits = /^[\dA-Fa-f]{1,4}$/,
    _yUrl256Power = [1, 256, 65536, 16777216, 4294967296],
    _reValidNumber = /^(?:0[xX][\dA-Fa-f]*|0[0-7]*|(?!0)\d*)$/;

function _yIPv4NumberParser(part) {
    if (!_reValidNumber.test(part)) return NaN;

    var n, len = part.length;
    return (len > 1 && part.slice(0, 2).toLowerCase() === '0x') ? (len === 2 ? 0 : parseInt(part.slice(2), 16)) :
           (len > 1 && part.charCodeAt(0) === 48) ? parseInt(part, 8) : 
           parseInt(part);
}


_urlFilters.hostParser = function (input, options) {
    /*jshint -W030 */
    options || (options = {});

    var FAILURE = null, lastIdx;

    // the order of percent decoding is swapped with ipv6 to follow browser behavior
    try {
        // Let domain be the result of utf-8 decode without BOM on the percent
        //   decoding of utf-8 encode on input.
        input = decodeURIComponent(input);    
    } catch(e) { return FAILURE; }
    
    lastIdx = input.length - 1;

    // trigger ipv6 parser
    // _reUrlAuthHostsPort has excluded those not ending with ]
    if (input.charCodeAt(0) === 91) {                          // begins with [
        return input.charCodeAt(lastIdx) === 93 ?              // ends with ]
            _urlFilters.ipv6Parser(input.slice(1, lastIdx)) :  // && valid ipv6
            FAILURE;
    }

    // Let asciiDomain be the result of running domain to ASCII on domain.
    // If asciiDomain is failure, return failure.
    options.IDNAtoASCII && (input = punycode.toASCII(input));

    // If asciiDomain contains one of U+0000, U+0009, U+000A, U+000D, U+0020, 
    //   "#", "%", "/", ":", "?", "@", "[", "\", and "]", syntax violation, 
    //   return failure.
    // We follow this except the space character U+0020
    if (_reHostInvalidSyntax.test(input)) { return FAILURE; }

    return _urlFilters.ipv4Parser(input);
}


_urlFilters.ipv4Parser = function (input) {
    var chunks = input.split('.'), 
        len = chunks.length, 
        i = 0, 
        FAILURE = null, INPUT = {'domain': 1, 'host': input.toLowerCase()},
        outputA = '', outputB = '';

    // If the last item in parts is the empty string, remove the last item from
    //   parts
    chunks[len - 1].length === 0 && len--;

    // If parts has more than four items, return input
    if (len > 4) { return INPUT; }

    // parse the number in every item. 
    for (; i < len; i++) {
        // If part is the empty string, return input.
        //   0..0x300 is a domain, not an IPv4 address.
        if (chunks[i].length === 0 || 
            // If n is failure, return input.
            isNaN((chunks[i] = _yIPv4NumberParser(chunks[i])))) { return INPUT; }
    }

    // If any but the last item in numbers > 255, return failure
    for (i = 0; i < len - 1; i++) {
        if ((n = chunks[i]) > 255) { return FAILURE; }
        // Use them directly as output
        outputA += n + '.';
    }

    // If the last item in numbers is greater than or equal to 256^(5 − the 
    //   number of items in numbers), syntax violation, return failure.
    if ((n = chunks[i]) >= _yUrl256Power[5 - len]) { return FAILURE; }

    // IPv4 serializer composes anything after outputA
    for (i = len - 1; i < 4; i++) {
        // Prepend n % 256, serialized, to output.
        outputB = (n % 256) + outputB;
        // Unless this is the fourth time, prepend "." to output.
        (i !== 3) && (outputB = '.' + outputB);
        // Set n to n / 256.
        n = Math.floor(n / 256);
    }

    // Return output as {'ipv4': 1, 'host': 'IPv4_ADDRESS'}
    return {'ipv4': 1, 'host': outputA + outputB};
}

_urlFilters.ipv6Parser = function(input) {
    if (input === '::') { return {'ipv6': 1, 'host': '[::]'}; }

    var chunks = input.split(':'), 
        FAILURE = null, compressPtr = null, compressAtEdge = false,
        i = 0, len = chunks.length, piece, result;

    // too little or many colons than allowed
    if (len < 3 || len > 9 || 
        // start with a single colon (except double-colon)
        chunks[0].length === 0 && chunks[1].length !== 0) { return FAILURE; }

    // capture as many 4-hex-digits as possible
    for (; i < len; i++) {
        piece = chunks[i];
        // empty indicates a colon is found
        if (piece.length === 0) {
            // 2nd colon found
            if (compressPtr !== null) {
                // double-colon allowed once, and only at either start or end
                if (!compressAtEdge && (i === 1 || compressPtr === len - 2)) {
                    compressAtEdge = true;
                    continue;
                }
                return FAILURE;
            }
            // if the input ends with a single colon
            if (i === len - 1) { return FAILURE; }
            // point to the first colon position
            compressPtr = i;
        } 
        // check if the piece conform to 4 hex digits
        else if (_reUpto4HexDigits.test(piece)) {
            // lowercased, and leading zeros are removed
            chunks[i] = parseInt(piece, 16).toString(16);
        }
        // quit the loop once a piece is found not matching 4 hex digits
        else { break; }
    }

    // all pieces conform to the 4-hex pattern
    if (i === len) {}
    // only the last one doesn't conform to 4 hex digits
    //   has at most 6 4-hex pieces (7 is due to the leading compression)
    //   it must has a dot to trigger ipv4 parsing (excluded number only)
    //   it's a valid IPv4 address
    else if (i === len - 1 &&
            i < (compressAtEdge ? 8 : 7) &&
            piece.indexOf('.') !== -1 &&
            (result = _urlFilters.ipv4Parser(piece)) && result.ipv4) {
        // replace the last piece with two pieces of ipv4 in hexadecimal
        result = result.host.split('.');
        chunks[i]     = (result[0] * 0x100 + parseInt(result[1])).toString(16);
        chunks[len++] = (result[2] * 0x100 + parseInt(result[3])).toString(16);
    }
    else { return FAILURE; }

    // insert zero for ipv6 that has 7 chunks plus a compressor 
    if (compressAtEdge) {
        --len === 8 && chunks.splice(compressPtr, 2, '0');
    } else if (len === 8 && compressPtr !== null) {
        chunks[compressPtr] = '0';
    }

    // return the input in string if there're less than 8 chunks
    return len === 9 ? FAILURE : {'ipv6': 1, 'host': '[' + chunks.join(':') + ']'};
}
