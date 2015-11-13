/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
/**
 * The following file serves the node.js version
 */

/*jshint node: true */
var extend = require('extend');

// populate the xss filters
module.exports = exports = require('./lib/xssFilters');

// add yHtmlDecode to _privFilters
extend(exports._privFilters, require('./lib/htmlDecode'));

// the following is largely designed for secure-handlebars-helpers
exports._getPrivFilters = {
	toString : function() {
        var fs = require('fs');
        return '(function(){var xssFilters={},exports={};' +
            fs.readFileSync('./src/lib/htmlDecode.js', 'utf8') +
            fs.readFileSync('./src/lib/xssFilters.priv.js', 'utf8') +
            'return exports;})';
    }
};

// add urlFilters
exports.urlFilters = extend(
	require('./lib/urlFilters'), 
	require('./lib/hostParser'), 
	require('./lib/urlResolver'));