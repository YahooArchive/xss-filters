/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
var _urlFilters = exports.urlFilters || exports;

// for node js version
if (typeof require === 'function') {
    _urlFilters.yUrlFilterFactory = require('./urlFilters').yUrlFilterFactory;
    _urlFilters.specialSchemeDefaultPort = require('./urlFilters').specialSchemeDefaultPort;
}

function _composeOriginSchemePath(scheme, auth, hostname, port, path) {
    var specialScheme = scheme === '' || _urlFilters.specialSchemeDefaultPort[scheme] !== undefined,
        origin = specialScheme ? scheme + '//' : scheme, 
        c;

    auth && (origin += auth + '@');
    origin += hostname;
    port && (origin += ':' + port);

    if (specialScheme && (path.length === 0 || 
        (c = path.charCodeAt(0)) !== 47 && c !== 92)) {  // char / or \
        path = '/' + path;
    }

    return [origin, scheme, path];
}

function _absUrlResolver(url, origin, scheme, path, baseOrigin, baseScheme, basePath, options) {
    return (scheme === '' ? baseScheme : '') + origin + path;
}

var _resolvePathDoubleDots = /^(?:\.|%2[eE]){2}$/, _resolvePathSingleDot = /^(?:\.|%2[eE])$/;

// return 1 for slash, 2 for ?/#, 0 otherwise
function _resolvePathSymbol(path, i) {
    var charCode = path.charCodeAt(i);
    return charCode === 47 || charCode === 92 ? 1 :
        charCode === 35 || charCode === 63 ? 2 :
        0;
}

// This resembles what is requried by the spec except things regarding file scheme
// Ref: https://url.spec.whatwg.org/#path-state
function _resolvePath(path, scheme) {
    // _composeOriginSchemePath() normalized path to have at least the first /
    var i = 1, j = 1, len = path.length, arrPathLen = 0, symbol, 
        arrPath = [], buffer, slash = /*scheme === 'file:' ? '\\' :*/ '/';
    while (j <= len) {
        if (j === len /* EOF */ || (symbol = _resolvePathSymbol(path, j))) {
            buffer = path.slice(i, j);

            if (_resolvePathDoubleDots.test(buffer)) {
                arrPathLen !== 0 && --arrPathLen;
                symbol !== 1 && (arrPath[arrPathLen++] = '');
            } else if (_resolvePathSingleDot.test(buffer)) {
                symbol !== 1 && (arrPath[arrPathLen++] = '');
            } else {
                arrPath[arrPathLen++] = buffer;
            }

            // supposedly switch to query or fragment state, which is dont care here
            if (symbol === 2) { break; }
            // the index of character that is just after the last slash
            i = j + 1;
        }
        j++;
    }
    // aggregate the path as string + the remaining query/fragment
    return slash + arrPath.slice(0, arrPathLen).join(slash) + path.slice(j);
}

// returns position of 
//   the first # if ? does not exists, or
//   the first ? if # does not exists, or
//   the first ? or #, whichever is earlier if both exist
//   i.e., -1 means none of them exists
function _queryOrFragmentPosition(path) {
    var qPos = path.indexOf('?'), hashPos = path.indexOf('#');
    return (qPos === -1 || hashPos !== -1 && hashPos < qPos) ? hashPos : qPos;
}

function _relUrlResolver(path, baseOrigin, baseScheme, basePath, options) {
    var resolve = options.resolvePath ? _resolvePath : function(p) {return p;};

    if (path.length === 0) { return baseOrigin + resolve(basePath, baseScheme); }

    var pos = -1, pathEnd = -1, t, firstCharCode = path.charCodeAt(0);

    /* / or \ */ 
    if (firstCharCode === 47 || firstCharCode === 92) {
        return baseOrigin + resolve(path, baseScheme);
    }

    /* # */
    if (firstCharCode === 35) {
        if (options.appendFragment) {
            pos = basePath.indexOf('#');
        } else { return path; } // no _resolvePath needed
    } 
    /* ? or else */
    else {
        // the position of ? or #, whichever is earlier
        pos = _queryOrFragmentPosition(basePath);

        // advance to position of filename, meaning
        //   the last / or \\ before the position of ? or #
        //   but it must not be .. or its equiv. representations
        if (firstCharCode !== 63) {  // not ?

            // remove the fromIndex constraint if no ? nor # was encountered
            pathEnd = pos === -1 ? undefined : pos;

            // _composeOriginSchemePath() normalized path to have at least the first /
            t = Math.max(basePath.lastIndexOf('/', pathEnd), 
                            basePath.lastIndexOf('\\', pathEnd));

            // update pos as t only when the filename (after slash and until ?/#) is not .. or equiv.
            !_resolvePathDoubleDots.test(basePath.slice(t + 1, pathEnd)) && (pos = t);

            path = '/' + path;
        }
    }

    // replace base path's component, if any, with the new one
    return baseOrigin + resolve(
        (pos === -1 ? basePath : basePath.slice(0, pos)) + path, baseScheme);
}

function _unsafeUrlResolver(url) {
    return 'unsafe:' + url;
}

_urlFilters.yUrlResolver = function (options) {
    options || (options = {});

    var bFilter, rFilter,
        schemes = options.schemes,
        relScheme = options.relScheme !== false,
        absSchemeResolver = options.absResolver || {},
        relSchemeResolver = options.relResolver || {},
        absResolver = typeof options.absResolver === 'function' ? options.absResolver : _absUrlResolver,
        relResolver = typeof options.relResolver === 'function' ? options.relResolver : _relUrlResolver,
        unsafeResolver = options.unsafeResolver || _unsafeUrlResolver;

    options.resolvePath = options.resolvePath !== false;

    bFilter = _urlFilters.yUrlFilterFactory({
        relScheme: relScheme,
        schemes: schemes,
        absCallback: function(url, scheme, auth, hostname, port, path) {
            var _baseURL = _composeOriginSchemePath(scheme || '', auth, hostname, port, path);
            rFilter = _urlFilters.yUrlFilterFactory({
                schemes: schemes,
                relScheme: relScheme,
                relPath: true,
                absCallback: function(url, scheme, auth, hostname, port, path) {
                    var args = _composeOriginSchemePath(scheme || '', auth, hostname, port, path);
                    return (absSchemeResolver[_baseURL[1]] || absResolver)(
                        url, args[0], args[1], args[2], _baseURL[0], _baseURL[1], _baseURL[2], options);
                },
                relCallback: function(path) {
                    return (relSchemeResolver[_baseURL[1]] || relResolver).apply(this,
                        [path].concat(_baseURL).concat(options));
                },
                unsafeCallback: unsafeResolver
            });
            return true;
        },
        unsafeCallback: function() { return false; }
    });

    return function(url, baseURL) {
        return (arguments.length >= 2 && !bFilter(baseURL) ? 
            unsafeResolver : 
            rFilter || unsafeResolver)(url);
    };
};
