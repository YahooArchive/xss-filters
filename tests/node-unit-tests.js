/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/


require("mocha");

expect = require('expect.js');
testutils = require('./utils.js');


xssFilters = require('../');
require('./unit/xss-filters-private.js');
require('./unit/xss-filters.js');

require('./unit/url-filters-basics.js');
require('./unit/url-filters-parserAPI.js');
require('./unit/url-filters-withOutput.js');
require('./unit/url-filters-yUrlResolver.js');