/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/

var _urlFilters = exports.urlFilters || exports;

// Schemes including file, gopher, ws and wss are not heavily tested
// https://url.spec.whatwg.org/#special-scheme
_urlFilters.specialSchemeDefaultPort = {'ftp:': '21', 'file:': '', 'gopher:': '70', 'http:': '80', 'https:': '443', 'ws:': '80', 'wss:': '443'};

/**
 * This is what a urlFilterFactoryAbsCallback would expect
 *
 * @callback urlFilterFactoryAbsCallback
 * @param {string} url
 * @param {string|undefined} scheme - relative scheme is indicated as undefined. no trailing colon. always lowercased
 * @param {string|undefined} authority - no trailing @ if exists. username & password both included. no percent-decoding
 * @param {string|undefined} hostname - no percent-decoding. always lowercased
 * @param {string|undefined} port - non-default port number. no leading colon. no percent-decoding 
 * @returns the url, or anything of one's choice
 */

/**
 * This is what a urlFilterFactoryRelCallback would expect
 *
 * @callback urlFilterFactoryRelCallback
 * @param {string} path
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
 *   override, no hostname parsing, no percent-decoding, no username and 
 *   password parsing within the authority
 * It adds to the spec: aligned w/browsers to accept \t\n\r within origin
 * 
 * @param {Object} options allow configurations as follows
 * @param {Object[]} options.schemes - an optional array of schemes 
 *   (trailing colon optional). If not provided, only http and https are 
 *   allowed
 * @param {boolean} options.relScheme - to enable relative scheme (//)
 * @param {Object[]} options.hostnames - an optional array of hostnames that 
 *   each matches /^[\w\.-]+$/. If any one is found unmatched, return null
 * @param {boolean} options.subdomain - to enable subdomain matching for 
 *   non-IPs specified in options.hostnames
 * @param {boolean} options.relPath - to allow relative path
 * @param {boolean} options.relPathOnly - to allow relative path only
 * @param {boolean} options.imgDataURIs - to allow data scheme with the 
 *   MIME type equal to image/gif, image/jpeg, image/jpg, or image/png, and
 *   the encoding format as base64
 * @param {urlFilterFactoryAbsCallback} options.absCallback - if matched,
 *   called to further process the url, scheme, hostname, non-default port, and
 *   path
 * @param {urlFilterFactoryRelCallback} options.relCallback - if matched,
 *   called to further process the path
 * @param {urlFilterFactoryUnsafeCallback} options.unsafeCallback - called
 *   to further process any unmatched url. if not provided, the default is
 *   to prefix those unmatched url with "unsafe:"
 * @returns {function} The returned function taking (url) runs the 
 *   configured tests. It prefixes "unsafe:" to non-matching URLs, and
 *   handover to the options.absCallback and/or options.relCallback for
 *   matched ones, and options.unsafeCallback for unmatched ones. In case 
 *   no callback is provided, return the matched url or prefix it with 
 *   "unsafe:" for unmatched ones.
 */
function urlFilterFactory (options) {
    /*jshint -W030 */
    options || (options = {});

    var i, n, arr, t, reElement, reProtos, reAuthHostsPort, 
        _safeCallback = function(url) { return url; },
        absCallback = options.absCallback || _safeCallback,
        relCallback = options.relCallback || _safeCallback,
        unsafeCallback = options.unsafeCallback || function(url) { return 'unsafe:' + url; },
        // reEscape escapes chars that are sensitive to regexp
        reEscape = /[.*?+\\\[\](){}|\^$]/g,
        // the following whitespaces are allowed in origin
        reOriginWhitespaces = /[\t\n\r]+/g,
        // reIPv4 matches the pattern of IPv4 address and its hex representation
        // used only when options.subdomain is set
        // Ref: https://url.spec.whatwg.org/#concept-ipv4-parser
        reIPv4 = options.subdomain && /^\.?(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?|0[xX][\dA-Fa-f]{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?|0[xX][\dA-Fa-f]{1,2})\.?$/,
        // reImgDataURIs hardcodes the image data URIs that are known to be safe
        reImgDataURIs = options.imgDataURIs && /^(data):image\/(?:jpe?g|gif|png);base64,[a-z0-9+\/=]*$/i,
        // reRelPath ensures the URL has no scheme/auth/hostname/port
        // (?![a-z][a-z0-9+-.\t\n\r]*:) avoided going to the #scheme-state
        //   \t\n\r can be part of scheme according to browsers' behavior
        // (?![\/\\]{2}) avoided the transitions from #relative-state, 
        //   to #relative-slash-state and then to 
        //   #special-authority-ignore-slashes-state
        // Ref: https://url.spec.whatwg.org/
        reRelPath = (options.relPath || options.relPathOnly) && 
            /^(?![a-z][a-z0-9+-.\t\n\r]*:|[\/\\]{2})/i;

    // build reProtos if options.schemes are provided
    // in any case, reProtos won't match a relative path
    if ((arr = options.schemes) && (n = arr.length)) {
        // reElement specifies the possible chars for scheme
        // Ref: https://url.spec.whatwg.org/#scheme-state
        reElement = /^([a-z][a-z0-9+-.]*):?$/i;

        for (i = 0; i < n; i++) {
            if ((t = reElement.exec(arr[i]))) {
                // lowercased the scheme with the trailing colon skipped
                t = t[1].toLowerCase();
            } else {
                // throw TypeError if an array element cannot be validated
                throw new TypeError(t + ' is an invalid scheme.');
            }
            // if (URI_BLACKLIST_PROTOCOLS[ (t = t.toLowerCase()) ]) {
            //     throw new TypeError(t + ' is a disallowed scheme.' + 
            //         (t === 'data' ? 
            //             ' Enable safe image types \\w/options.imgDataURIs':
            //             ''));
            // }
            // escapes t from regexp sensitive chars
            arr[i] = t.replace(reEscape, '\\$&');
        }

        // build reProtos from the schemes array, must be case insensitive
        // The relScheme matching regarding [\/\\]{2} summarized the transitions from 
        //   #relative-state, #relative-slash-state to #special-authority-ignore-slashes-state
        // Ref: https://url.spec.whatwg.org/
        reProtos = new RegExp(
            '^(?:((?:' +
            arr.join('|') +
            (options.relScheme ? '):)|[\\/\\\\]{2})' : '):))'), 'i');

    } else {
        // the default reProtos, only http and https are allowed. 
        // refer to above for regexp explanations
        reProtos = options.relScheme ? /^(?:(https?:)|[\/\\]{2})/i : /^(https?:)/i;
    }

    // build reAuthHostsPort if options.hostnames are provided
    if ((arr = options.hostnames) && (n = arr.length)) {
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
                throw new TypeError(t + ' is an invalid hostname.');
            }
            
            // if the hostname provided is neither IPv6 nor IPv4
            arr[i] = (options.subdomain && 
                    t.charCodeAt(0) !== 91 /*[*/ && !reIPv4.test(t)) ?
                        // See above for valid hostname requirement
                        // accept \t\n\r, which will be later stripped
                        '(?:[^\\x00#\\/:?\\[\\]\\\\]+\\.)*' : 
                        '';

            // escapes t from regexp sensitive chars
            arr[i] += t.replace(reEscape, '\\$&');
        }

        // build reAuthHostsPort from the hosts array, must be case insensitive
        // in general, hostname must be present, auth/port optional
        // ^[\\/\\\\]* actually is there to ignore any number of leading slashes. 
        //   This observes the spec except when there're >2 slashes after scheme,
        //   only syntax violation is specified So, follow browsers' behavior to continue parsing
        //   Ref: https://url.spec.whatwg.org/#special-authority-ignore-slashes-state
        // (?:([^\\/\\\\?#]*)@)? captures the authority without the trailing @ (i.e., username:password) if any
        //   This observes the spec except omitting any encoding/separating username and password
        //   Ref: https://url.spec.whatwg.org/#authority-state
        // '(' + arr.join('|') + ')' is to capture the whitelisted hostnames
        //   Refer to above for the requirements
        // (?:$|OPTIONAL_PORT_SEE_BELOW($|[\\/?#\\\\])) required for host array
        //   [\\/?#\\\\] is delimeter to separate hostname from path, 
        //   required to capture the whole hostname for matching element in
        //   the options.hostnames array
        //   Ref: https://url.spec.whatwg.org/#host-state
        // (?::([\\d\\t\\n\\r]*))? captures the port number if any
        //   whitespaces to be later stripped
        //   Ref: https://url.spec.whatwg.org/#port-state
        reAuthHostsPort = new RegExp(
            '^[\\/\\\\]*(?:([^\\/\\\\?#]*)@)?' +        // leading slashes and authority
            '(' + arr.join('|') + ')' +                 // allowed hostnames, in regexp
            '(?::?$|:([\\d\\t\\n\\r]+)|([\\/?#\\\\]))', // until an optional colon then EOF, a port, or a delimeter
            'i');                                       // case insensitive required for hostnames
    }
    // extract the auth, hostname and port number if options.absCallback is supplied
    else if (options.absCallback) {
        // the default reAuthHostsPort. see above for details
        //   hostname must be present, auth/port optional
        //   accept \t\n\r, which will be later stripped
        reAuthHostsPort = /^[\/\\]*(?:([^\/\\?#]*)@)?([^\x00#\/:?\[\]\\]+|\[(?:[^\x00\/?#\\]+)\])(?::?$|:([\d\t\n\r]+)|([\/?#\\]))/;
    }

    /*
     * @param {string} url 
     * @returns {string|} the url - the url itself, or prefixed with 
     *   "unsafe:" if it fails the tests. In case absCallback/relCallback
     *   is supplied, the output is controled by the callback for those 
     *   urls that pass the tests.
     */
    return function(url) {
        var scheme, authHostPort, i = 0, charCode, remainingUrl, defaultPort, port;
        
        // handle special types
        if (url === undefined || typeof url === 'object') {
            url = '';
        } else {
            url = url.toString();

            // remove leading whitespaces (don't care the trailing whitespaces)
            // Ref: #1 in https://url.spec.whatwg.org/#concept-basic-url-parser 
            while ((charCode = url.charCodeAt(i)) >= 0 && charCode <= 32) { i++; }
            i > 0 && (url = url.slice(i));
        }

        // options.relPathOnly will bypass any check on scheme
        if (options.relPathOnly) {
            return reRelPath.test(url) ? relCallback(url) : unsafeCallback(url);
        }

        // reRelPath ensures no scheme/auth/hostname/port
        if (options.relPath && reRelPath.test(url)) {
            return relCallback(url);
        }

        // match the scheme, could be from a safe image Data URI
        if ((scheme = reProtos.exec(url) || 
                reImgDataURIs && reImgDataURIs.exec(url))) {

            // get the remaining url for further matching
            remainingUrl = url.slice(scheme[0].length);

            // !reAuthHostsPort means no restrictions on auth/host/port, implied
            //   no options.absCallback is present
            if (!reAuthHostsPort) { return url; }

            // scheme[1] could be empty when relScheme is set. When it holds
            //   a whitelisted scheme, no reOriginWhitespaces treatment as 
            //   applied to auth/hostname/port is needed due to the regexp used
            // specialSchemeDefaultPort[scheme[1].toLowerCase()] gets the 
            //   default port number of those special scheme. It's undefined if
            //   it's a non-special scheme. 
            // So, here non-special scheme, just consider
            //   anything beyond scheme as pathname
            if (scheme[1]) { 
                scheme[1] = scheme[1].toLowerCase();
                defaultPort = _urlFilters.specialSchemeDefaultPort[scheme[1]];
                if (defaultPort === undefined) {
                    return absCallback(url, scheme[1], '', '', '', remainingUrl);
                }
            }

            // if auth, hostname and port are properly validated
            if ((authHostPort = reAuthHostsPort.exec(remainingUrl))) {
                // spec simply says whitespaces are syntax violation
                // stripping them follows browsers' behavior
                port = authHostPort[3] && authHostPort[3].replace(reOriginWhitespaces, '');
                return absCallback(url, 
                    scheme[1], 
                    // spec simply says whitespaces are syntax violation
                    // stripping them follows browsers' behavior
                    authHostPort[1] && authHostPort[1].replace(reOriginWhitespaces, ''), 
                    authHostPort[2].replace(reOriginWhitespaces, '').toLowerCase(), 
                    // pass undefined instead of the default port, if given
                    port === defaultPort ? undefined : port, 
                    // minus the delimeter if captured
                    remainingUrl.slice(authHostPort[0].length - (authHostPort[4] ? 1 : 0)));
            }
        }

        return unsafeCallback(url);
    };
};

// export the util to create url filter
_urlFilters.yUrlFilterFactory = urlFilterFactory;