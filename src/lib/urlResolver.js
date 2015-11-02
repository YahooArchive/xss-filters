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

function _relUrlResolver(path, baseOrigin, baseScheme, basePath, options) {
    if (path.length === 0) { return baseOrigin + basePath; }

    var pos = -1, hashPos = -1, 
        firstCharCode = path.charCodeAt(0);

    /* / or \ */ 
    if (firstCharCode === 47 || firstCharCode === 92) {
        return baseOrigin + path;
    }

    /* # */
    if (firstCharCode === 35) {
        if (options.appendFragment) {
           pos = basePath.indexOf('#'); 
        } else { return path; }
    } else {
        // pos set to the first ? if it's before the first #, 
        //         or the first # if ? does not exists
        pos = basePath.indexOf('?');
        hashPos = basePath.indexOf('#');
        if (pos === -1 || hashPos !== -1 && hashPos < pos) {
            pos = hashPos;
        }

        if (firstCharCode !== 63) {  // not ?
            path = '/' + path;
            pos = Math.max(basePath.lastIndexOf('/', pos), 
                            basePath.lastIndexOf('\\', pos));
        }
    }

    // replace base path's component, if any, with the new one
    return baseOrigin + (pos === -1 ? basePath :
             basePath.slice(0, pos)) + path;
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
