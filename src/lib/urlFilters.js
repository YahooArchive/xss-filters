/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/

var _urlFilters = exports.urlFilters || exports;

// In general, hostname must be present, auth/port optional
// ^[\/\\]* is to ignore any number of leading slashes. 
//   Spec says at most 2 slashes after scheme, otherwise syntax violation
//   here, we follow browsers' behavior to ignore syntax violation
//   Ref: https://url.spec.whatwg.org/#special-authority-ignore-slashes-state
// (?:([^\/\\?#]*)@)? captures the authority (user:pass) without the trailing @
//   We omitted here any encoding/separation for username and password
//   Ref: https://url.spec.whatwg.org/#authority-state
// (IPV6-LIKE|VALID_HOST) is explained as follows:
//  [^\x00#\/:?\[\]\\]+ captures chars that can specify domain and IPv4
//    - @ won't appear here anyway as it's captured by prior regexp
//    - \x20 is found okay to browser, so it's also allowed here
//    - \t\n\r is allowed here, to be later stripped (follows browser behavior)
//  (?:\[|%5[bB])(?:[^\/?#\\]+)\] is to capture ipv6-like address
//    - \t\n\r is allowed here, to be later stripped (follows browser behavior)
//    Ref: https://url.spec.whatwg.org/#concept-ipv6-parser
//  Ref: https://url.spec.whatwg.org/#concept-host-parser
// (?:ENDS_W/OPTIONAL_COLON|OPTIONAL_PORT|FOLLOWED_BY_DELIMETER) explanations:
//  :?$ tests if it ends with an optional colon
//  (?::([\\d\\t\\n\\r]*))? captures the port number if any
//    whitespaces to be later stripped
//    Ref: https://url.spec.whatwg.org/#port-state
//  (?=[\/?#\\]) means a pathname follows (delimeter is not captured though)
//    this is required to ensure the whole hostname is matched
//  Ref: https://url.spec.whatwg.org/#host-state
var _reUrlAuthHostsPort = /^[\/\\]*(?:([^\/\\?#]*)@)?((?:\[|%5[bB])(?:[^\x00\/?#\\]+)\]|[^\x00#\/:?\[\]\\]+)(?::?$|:([\d\t\n\r]+)|(?=[\/?#\\]))/;

// Schemes including file, gopher, ws and wss are not heavily tested
// https://url.spec.whatwg.org/#special-scheme
_urlFilters.specialSchemeDefaultPort = {'ftp:': '21', 'file:': '', 'gopher:': '70', 'http:': '80', 'https:': '443', 'ws:': '80', 'wss:': '443'};

/**
 * The prototype of urlFilterFactoryAbsCallback
 *
 * @callback urlFilterFactoryAbsCallback
 * @param {string} url
 * @param {string} scheme - relative scheme is indicated as ''. no trailing colon. always lowercased
 * @param {string} authority - no trailing @ if exists. username & password both included. no percent-decoding
 * @param {string} hostname - no percent-decoding. always lowercased
 * @param {string} port - non-default port number. no leading colon. no percent-decoding 
 * @returns the url, or anything of your choice
 */

/**
 * The prototype of urlFilterFactoryRelCallback
 *
 * @callback urlFilterFactoryRelCallback
 * @param {string} path
 * @returns the url, or anything of your choice
 */

/**
 * The prototype of urlFilterFactoryUnsafeCallback
 *
 * @callback urlFilterFactoryUnsafeCallback
 * @param {string} url
 * @returns the url, or anything of your choice (e.g., 'unsafe:' + url)
 */

/* 
 * This creates a URL whitelist filter, which largely observes 
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
 * @param {boolean} options.parseHost - the specified options.hostnames
 *   are validated against URLs after their hosts are parsed and normalized, 
 *   as specified in https://url.spec.whatwg.org/#host-parsing. Even if 
 *   options.hostnames are not provided, absCallback are called only if a host
 *   can be parsed correctly, otherwise, call unsafeCallback instead.
 * @param {boolean} options.relPath - to allow relative path
 * @param {boolean} options.relPathOnly - to allow relative path only
 * @param {boolean} options.imgDataURIs - to allow data scheme with the 
 *   MIME type equal to image/gif, image/jpeg, image/jpg, or image/png, and
 *   the encoding format as base64
 * @param {boolean} options.IDNAtoASCII - convert all domains to its ASCII 
 *   format according to RFC 3492 and RFC 5891 for matching/comparisons. See 
 *   https://nodejs.org/api/punycode.html for details.
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
_urlFilters.create = function (options) {
    /*jshint -W030 */
    options || (options = {});

    function _parseHostAbsCallback (url, scheme, auth, host, port, path) {
        var i = 0, re, t, hostnames = options.hostnames, 
            safeCallback = function (t) {
                return _safeAbsCallback(url, scheme, auth, t.host, port, path, t);
            };
        // parse the host
        if ((t = _urlFilters.hostParser(host, options)) !== null) {
            // no hostnames enforcement 
            if (!hostnames) {
                return safeCallback(t);
            }
            // if subdomain enabled, use regexp to check if a host is whitelisted
            else if (options.subdomain) {
                for (; re = reHosts[i]; i++) {
                    if (re.test ? re.test(t.host) : re === t.host) { 
                        return safeCallback(t);
                    }
                }
            }
            // host found in options.hostnames
            else if (hostnames.indexOf(t.host) !== -1) {
                return safeCallback(t);
            }
        }
        return unsafeCallback(url);
    }

    var i, n, arr, t, reElement, reProtos, reAuthHostsPort, reHosts = [],
        _safeCallback = function(url) { return url; },
        _safeAbsCallback = options.absCallback || _safeCallback,
        absCallback = options.parseHost ? _parseHostAbsCallback : _safeAbsCallback,
        relCallback = options.relCallback || _safeCallback,
        unsafeCallback = options.unsafeCallback || function(url) { return 'unsafe:' + url; },
        // reEscape escapes chars that are sensitive to regexp
        reEscape = /[.*?+\\\[\](){}|\^$]/g,
        // the following whitespaces are allowed in origin
        reOriginWhitespaces = /[\t\n\r]+/g,
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

    // clean reHosts first
    reHosts.length = 0;

    // build reAuthHostsPort if options.hostnames are provided
    if ((arr = options.hostnames) && (n = arr.length)) {
        for (i = 0; i < n; i++) {
            // throw TypeError if an array element cannot be validated
            if ((t = _urlFilters.hostParser(arr[i], options)) === null) {
                throw new TypeError(arr[i] + ' is an invalid hostname.');
            }
            
            // relax for subdomain for those domain elements
            reHosts[i] = (options.subdomain && t.domain) ?
                        // See above for valid hostname requirement
                        // accept \t\n\r, which will be later stripped
                        '(?:[^\\x00#\\/:?\\[\\]\\\\]+\\.)*' : 
                        '';

            // escapes t from regexp sensitive chars
            reHosts[i] += (arr[i] = t.host).replace(reEscape, '\\$&');

            if (options.parseHost && options.subdomain) {
                reHosts[i] = t.domain ? new RegExp('^' + reHosts[i] + '$') : t.host;
            }
        }

        // build reAuthHostsPort from the hosts array, must be case insensitive
        // it is based on _reUrlAuthHostsPort, see comments there for details
        // The difference here is to directly match the hostnames using regexp:
        // '(' + arr.join('|') + ')' is to match the whitelisted hostnames
        reAuthHostsPort = options.parseHost ? _reUrlAuthHostsPort :
            new RegExp('^[\\/\\\\]*(?:([^\\/\\\\?#]*)@)?' +
                '(' + reHosts.join('|') + ')' +     // allowed hostnames, in regexp
                '(?::?$|:([\\d\\t\\n\\r]+)|(?=[\\/?#\\\\]))', 'i');
    } else {
        // options.subdomain must be false given no options.hostnames
        delete options.hostnames;

        // extract the auth, hostname and port number if options.absCallback is supplied
        if (options.absCallback) {
            // use the default reAuthHostsPort. see _reUrlAuthHostsPort for details
            reAuthHostsPort = _reUrlAuthHostsPort;
        }
    }

    /*
     * @param {string} url 
     * @returns {string|} the url - the url itself, or prefixed with 
     *   "unsafe:" if it fails the tests. In case absCallback/relCallback
     *   is supplied, the output is controled by the callback for those 
     *   urls that pass the tests.
     */
    return function(url) {
        var scheme, authHostPort, i = 0, charCode, remainingUrl, defaultPort, port, empty = '';
        
        // handle special types
        if (url === undefined || typeof url === 'object') {
            url = empty;
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
                    return absCallback(url, scheme[1], empty, empty, empty, remainingUrl);
                }
            } else {
                scheme[1] = empty;
            }

            // if auth, hostname and port are properly validated
            if ((authHostPort = reAuthHostsPort.exec(remainingUrl))) {
                // strip \t\r\n in origin like browsers to handle syntax violations
                port = authHostPort[3] ? authHostPort[3].replace(reOriginWhitespaces, empty) : empty; // port
                return absCallback(url, 
                    scheme[1], 
                    authHostPort[1] ? authHostPort[1].replace(reOriginWhitespaces, empty) : empty, // auth
                    authHostPort[2].replace(reOriginWhitespaces, empty), // host
                    port === defaultPort ? empty : port, // pass '' instead of the default port, if given
                    remainingUrl.slice(authHostPort[0].length));
            }
        }

        return unsafeCallback(url);
    };
};

