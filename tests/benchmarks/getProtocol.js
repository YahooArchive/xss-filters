#!/usr/bin/env node

/*
Background
============
Machine: MacBook Pro (Retina, 15-inch, Early 2013). OSX 10.10.4
Note:    The stats are collected using nodejs, and may not reflect the actual performance in different browsers.

Stats
============
using htmlDecode old x 6,589 ops/sec ±2.68% (97 runs sampled)
using htmlDecode new x 7,507 ops/sec ±0.73% (98 runs sampled)
using getProtocol old x 10,182 ops/sec ±0.80% (99 runs sampled)
using getProtocol old w/ new decoder x 22,613 ops/sec ±0.70% (98 runs sampled)
using getProtocol new (decode first, then match) x 24,759 ops/sec ±0.79% (95 runs sampled)
using getProtocol new (greedy match first, then decode and match) x 23,064 ops/sec ±0.80% (94 runs sampled)
using getProtocol new (greedy match first, then decode and match) w/old decoder x 9,522 ops/sec ±0.79% (93 runs sampled)
using searchProtocol 1 x 24,702 ops/sec ±0.76% (93 runs sampled)
using searchProtocol 2 (greedy match first, then decode and match) x 19,267 ops/sec ±0.68% (93 runs sampled)
legit samples | using getProtocol old x 10,370 ops/sec ±1.01% (95 runs sampled)
legit samples | using getProtocol old w/new decoder x 10,787 ops/sec ±0.72% (98 runs sampled)
legit samples | using getProtocol new (decode first, then match) x 7,622 ops/sec ±0.68% (100 runs sampled)
legit samples | using getProtocol new (greedy match first, then decode and match) x 20,110 ops/sec ±0.59% (101 runs sampled)
legit samples | using getProtocol new (greedy match first, then decode and match) w/old decoder x 8,113 ops/sec ±0.53% (100 runs sampled)
legit samples | using searchProtocol 1 x 6,822 ops/sec ±0.81% (95 runs sampled)
legit samples | using searchProtocol 2 (greedy match first, then decode and match) x 11,234 ops/sec ±0.75% (96 runs sampled)

Conclusion
============

Fastest for both bad and legit samples are: getProtocol new (greedy match first, then decode and match)
compared to the original, it doubled the speed (2x for legit samples, and 2.3x for bad ones)
*/


var Benchmark = require('Benchmark');
var suite = new Benchmark.Suite;

var sample1 = [
    '\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009\
\u000A\u000B\u000C\u000D\u000E\u000F\u0010\u0011\u0012\
\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001A\u001B\
\u001C\u001D\u001E\u001F\u0020j\nav&#x61;\rscript\t&col\u0000on;',
    '&Tab;&#X0a;&NewLine;j&#x61;&NewLine;&#x76;&#x61&Tab;&Tab;&#115&#99&#114&#105&#112&#116&#x3a;alert(0)',
    'JavascripT:alert(0)',
    'j&#x61;&#x76;&#x61&#115&#99&#114&#105&#112&#116&#x3a;alert(0)',
    'javascript:javascript:alert(0)',
    '&#02&#x0D;&#11javascript:alert(1)',

    'vbscript&colon;',
    '&Tab;&#X0a;&NewLine;v&#98scripT&#0;:',

    'https://www.yahoo.com',
    'http://www.yahoo.com',
    'ftp://ftp.yahoo.com',
    'data:image/png',
    'data:application/javascript',
    'data:text/css',
    'data:text/html',
    'mhtml:http://somewhere/',

    'javajavascript:script:alert(0)',
    'javaXscript:alert(0)',
    'ABCjavascript:alert(0)'
];
var sample2 = [
    '%01%02%03%04%05%06%07%08%09\
%0A%0B%0C%0D%0E%0F%10%11%12\
%13%14%15%16%17%18%19%1A%1B\
%1C%1D%1E%1F%20j%0Aav&#x61;%0Dscript%09&col%00on;',
    'x-&Tab;&#X0a;&NewLine;j&#x61;&NewLine;&#x76;&#x61&Tab;&Tab;&#115&#99&#114&#105&#112&#116&#x3a;alert(0)',
    'x-JavascripT:alert(0)',
    'x-j&#x61;&#x76;&#x61&#115&#99&#114&#105&#112&#116&#x3a;alert(0)',
    'x-javascript:javascript:alert(0)',
    'x-&#02&#x0D;&#11javascript:alert(1)',

    'x-vbscript&colon;',
    'x-&Tab;&#X0a;&NewLine;v&#98scripT&#0;:',

    'https://www.yahoo.com',
    'http://www.yahoo.com',
    'ftp://ftp.yahoo.com',
    'x-data:image/png',
    'x-data:application/javascript',
    'x-data:text/css',
    'x-data:text/html',
    'x-mhtml:http://somewhere/',

    'javajavascript:script:alert(0)',
    'javaXscript:alert(0)',
    'ABCjavascript:alert(0)'
];

var sample3 = ["https://www.flickr.com","/signup","/explore","/explore","/commons","/20under20","/galleries","/map","/services","/cameras","/photos/flickr/albums/72157639868074114/","https://blog.flickr.net/","/create","/upload","/signin","/explore","/explore","/commons","/20under20","/galleries","/photos/flickr/albums/72157639868074114/","https://blog.flickr.net/","/photos/jenshaggren/20697268356/in/explore-2015-08-20/","/photos/jenshaggren/20697268356/in/explore-2015-08-20/","/photos/jenshaggren/","/photos/jenshaggren/20697268356/in/explore-2015-08-20/","/photos/jenshaggren/20697268356/in/explore-2015-08-20/","/photos/maxgor/20730241532/in/explore-2015-08-20/","/photos/maxgor/20730241532/in/explore-2015-08-20/","/photos/maxgor/","/photos/maxgor/20730241532/in/explore-2015-08-20/","/photos/maxgor/20730241532/in/explore-2015-08-20/","/photos/wdbowman/20530539060/in/explore-2015-08-20/","/photos/wdbowman/20530539060/in/explore-2015-08-20/","/photos/wdbowman/","/photos/wdbowman/20530539060/in/explore-2015-08-20/","/photos/wdbowman/20530539060/in/explore-2015-08-20/","/photos/84527028@N03/20718255592/in/explore-2015-08-20/","/photos/84527028@N03/20718255592/in/explore-2015-08-20/","/photos/84527028@N03/","/photos/84527028@N03/20718255592/in/explore-2015-08-20/","/photos/84527028@N03/20718255592/in/explore-2015-08-20/","/photos/58071954@N08/20534945209/in/explore-2015-08-20/","/photos/58071954@N08/20534945209/in/explore-2015-08-20/","/photos/58071954@N08/","/photos/58071954@N08/20534945209/in/explore-2015-08-20/","/photos/58071954@N08/20534945209/in/explore-2015-08-20/","/photos/sciandra/20544309388/in/explore-2015-08-20/","/photos/sciandra/20544309388/in/explore-2015-08-20/","/photos/sciandra/","/photos/sciandra/20544309388/in/explore-2015-08-20/","/photos/sciandra/20544309388/in/explore-2015-08-20/","/photos/sirdavidyoung/20552037228/in/explore-2015-08-20/","/photos/sirdavidyoung/20552037228/in/explore-2015-08-20/","/photos/sirdavidyoung/","/photos/sirdavidyoung/20552037228/in/explore-2015-08-20/","/photos/sirdavidyoung/20552037228/in/explore-2015-08-20/","/photos/beautiful_bugs/20735277275/in/explore-2015-08-20/","/photos/beautiful_bugs/20735277275/in/explore-2015-08-20/","/photos/beautiful_bugs/","/photos/beautiful_bugs/20735277275/in/explore-2015-08-20/","/photos/beautiful_bugs/20735277275/in/explore-2015-08-20/","/photos/cervelor3/20547207780/in/explore-2015-08-20/","/photos/cervelor3/20547207780/in/explore-2015-08-20/","/photos/cervelor3/","/photos/cervelor3/20547207780/in/explore-2015-08-20/","/photos/cervelor3/20547207780/in/explore-2015-08-20/","/photos/101295317@N06/20115610133/in/explore-2015-08-20/","/photos/101295317@N06/20115610133/in/explore-2015-08-20/","/photos/101295317@N06/","/photos/101295317@N06/20115610133/in/explore-2015-08-20/","/photos/101295317@N06/20115610133/in/explore-2015-08-20/","/photos/eh64/20114673013/in/explore-2015-08-20/","/photos/eh64/20114673013/in/explore-2015-08-20/","/photos/eh64/","/photos/eh64/20114673013/in/explore-2015-08-20/","/photos/eh64/20114673013/in/explore-2015-08-20/","/photos/snewgewirtz/20531938989/in/explore-2015-08-20/","/photos/snewgewirtz/20531938989/in/explore-2015-08-20/","/photos/snewgewirtz/","/photos/snewgewirtz/20531938989/in/explore-2015-08-20/","/photos/snewgewirtz/20531938989/in/explore-2015-08-20/","/photos/haroldvdb/20740526431/in/explore-2015-08-20/","/photos/haroldvdb/20740526431/in/explore-2015-08-20/","/photos/haroldvdb/","/photos/haroldvdb/20740526431/in/explore-2015-08-20/","/photos/haroldvdb/20740526431/in/explore-2015-08-20/","/photos/shinrya/20740822401/in/explore-2015-08-20/","/photos/shinrya/20740822401/in/explore-2015-08-20/","/photos/shinrya/","/photos/shinrya/20740822401/in/explore-2015-08-20/","/photos/shinrya/20740822401/in/explore-2015-08-20/","/photos/pietrofaccioli/20732506471/in/explore-2015-08-20/","/photos/pietrofaccioli/20732506471/in/explore-2015-08-20/","/photos/pietrofaccioli/","/photos/pietrofaccioli/20732506471/in/explore-2015-08-20/","/photos/pietrofaccioli/20732506471/in/explore-2015-08-20/","/photos/janwallin/20747091191/in/explore-2015-08-20/","/photos/janwallin/20747091191/in/explore-2015-08-20/","/photos/janwallin/","/photos/janwallin/20747091191/in/explore-2015-08-20/","/photos/janwallin/20747091191/in/explore-2015-08-20/","/photos/tuanland/20731559681/in/explore-2015-08-20/","/photos/tuanland/20731559681/in/explore-2015-08-20/","/photos/tuanland/","/photos/tuanland/20731559681/in/explore-2015-08-20/","/photos/tuanland/20731559681/in/explore-2015-08-20/","/photos/43188207@N05/20693410456/in/explore-2015-08-20/","/photos/43188207@N05/20693410456/in/explore-2015-08-20/","/photos/43188207@N05/","/photos/43188207@N05/20693410456/in/explore-2015-08-20/","/photos/43188207@N05/20693410456/in/explore-2015-08-20/","/photos/daveholder/20741054415/in/explore-2015-08-20/","/photos/daveholder/20741054415/in/explore-2015-08-20/","/photos/daveholder/","/photos/daveholder/20741054415/in/explore-2015-08-20/","/photos/daveholder/20741054415/in/explore-2015-08-20/","/photos/calumgladstone/20704149256/in/explore-2015-08-20/","/photos/calumgladstone/20704149256/in/explore-2015-08-20/","/photos/calumgladstone/","/photos/calumgladstone/20704149256/in/explore-2015-08-20/","/photos/calumgladstone/20704149256/in/explore-2015-08-20/","/photos/sbisaro/20535275608/in/explore-2015-08-20/","/photos/sbisaro/20535275608/in/explore-2015-08-20/","/photos/sbisaro/","/photos/sbisaro/20535275608/in/explore-2015-08-20/","/photos/sbisaro/20535275608/in/explore-2015-08-20/","/photos/kyphorrhinos/20720420125/in/explore-2015-08-20/","/photos/kyphorrhinos/20720420125/in/explore-2015-08-20/","/photos/kyphorrhinos/","/photos/kyphorrhinos/20720420125/in/explore-2015-08-20/","/photos/kyphorrhinos/20720420125/in/explore-2015-08-20/","/photos/104654295@N04/20551705739/in/explore-2015-08-20/","/photos/104654295@N04/20551705739/in/explore-2015-08-20/","/photos/104654295@N04/","/photos/104654295@N04/20551705739/in/explore-2015-08-20/","/photos/104654295@N04/20551705739/in/explore-2015-08-20/","/photos/nikolapesic/20729395445/in/explore-2015-08-20/","/photos/nikolapesic/20729395445/in/explore-2015-08-20/","/photos/nikolapesic/","/photos/nikolapesic/20729395445/in/explore-2015-08-20/","/photos/nikolapesic/20729395445/in/explore-2015-08-20/","/photos/95570410@N07/20723095935/in/explore-2015-08-20/","/photos/95570410@N07/20723095935/in/explore-2015-08-20/","/photos/95570410@N07/","/photos/95570410@N07/20723095935/in/explore-2015-08-20/","/photos/95570410@N07/20723095935/in/explore-2015-08-20/","/photos/rrp71/20536963690/in/explore-2015-08-20/","/photos/rrp71/20536963690/in/explore-2015-08-20/","/photos/rrp71/","/photos/rrp71/20536963690/in/explore-2015-08-20/","/photos/rrp71/20536963690/in/explore-2015-08-20/","/photos/rafavergara/20749726781/in/explore-2015-08-20/","/photos/rafavergara/20749726781/in/explore-2015-08-20/","/photos/rafavergara/","/photos/rafavergara/20749726781/in/explore-2015-08-20/","/photos/rafavergara/20749726781/in/explore-2015-08-20/","/photos/richjjones/20733424341/in/explore-2015-08-20/","/photos/richjjones/20733424341/in/explore-2015-08-20/","/photos/richjjones/","/photos/richjjones/20733424341/in/explore-2015-08-20/","/photos/richjjones/20733424341/in/explore-2015-08-20/","/photos/99194469@N08/20101709724/in/explore-2015-08-20/","/photos/99194469@N08/20101709724/in/explore-2015-08-20/","/photos/99194469@N08/","/photos/99194469@N08/20101709724/in/explore-2015-08-20/","/photos/99194469@N08/20101709724/in/explore-2015-08-20/","/photos/ginaballerina/20709490722/in/explore-2015-08-20/","/photos/ginaballerina/20709490722/in/explore-2015-08-20/","/photos/ginaballerina/","/photos/ginaballerina/20709490722/in/explore-2015-08-20/","/photos/ginaballerina/20709490722/in/explore-2015-08-20/","/photos/74810639@N02/20707961996/in/explore-2015-08-20/","/photos/74810639@N02/20707961996/in/explore-2015-08-20/","/photos/74810639@N02/","/photos/74810639@N02/20707961996/in/explore-2015-08-20/","/photos/74810639@N02/20707961996/in/explore-2015-08-20/","/photos/127727047@N05/20098545864/in/explore-2015-08-20/","/photos/127727047@N05/20098545864/in/explore-2015-08-20/","/photos/127727047@N05/","/photos/127727047@N05/20098545864/in/explore-2015-08-20/","/photos/127727047@N05/20098545864/in/explore-2015-08-20/","/photos/55873497@N04/20724285062/in/explore-2015-08-20/","/photos/55873497@N04/20724285062/in/explore-2015-08-20/","/photos/55873497@N04/","/photos/55873497@N04/20724285062/in/explore-2015-08-20/","/photos/55873497@N04/20724285062/in/explore-2015-08-20/","/photos/buscato/20548584220/in/explore-2015-08-20/","/photos/buscato/","/photos/buscato/20548584220/in/explore-2015-08-20/","/photos/buscato/20548584220/in/explore-2015-08-20/","/photos/122303651@N02/20553496529/in/explore-2015-08-20/","/photos/122303651@N02/20553496529/in/explore-2015-08-20/","/photos/122303651@N02/","/photos/122303651@N02/20553496529/in/explore-2015-08-20/","/photos/122303651@N02/20553496529/in/explore-2015-08-20/","/photos/ryanschude/20115430503/in/explore-2015-08-20/","/photos/ryanschude/20115430503/in/explore-2015-08-20/","/photos/ryanschude/","/photos/ryanschude/20115430503/in/explore-2015-08-20/","/photos/ryanschude/20115430503/in/explore-2015-08-20/","/photos/torehegg/20532176308/in/explore-2015-08-20/","/photos/torehegg/20532176308/in/explore-2015-08-20/","/photos/torehegg/","/photos/torehegg/20532176308/in/explore-2015-08-20/","/photos/torehegg/20532176308/in/explore-2015-08-20/","/photos/opi3ss3/20730729332/in/explore-2015-08-20/","/photos/opi3ss3/20730729332/in/explore-2015-08-20/","/photos/opi3ss3/","/photos/opi3ss3/20730729332/in/explore-2015-08-20/","/photos/opi3ss3/20730729332/in/explore-2015-08-20/","/photos/54271339@N03/20742389675/in/explore-2015-08-20/","/photos/54271339@N03/20742389675/in/explore-2015-08-20/","/photos/54271339@N03/","/photos/54271339@N03/20742389675/in/explore-2015-08-20/","/photos/54271339@N03/20742389675/in/explore-2015-08-20/","/photos/120254834@N04/20537742320/in/explore-2015-08-20/","/photos/120254834@N04/20537742320/in/explore-2015-08-20/","/photos/120254834@N04/","/photos/120254834@N04/20537742320/in/explore-2015-08-20/","/photos/120254834@N04/20537742320/in/explore-2015-08-20/","/photos/116479554@N04/20734995351/in/explore-2015-08-20/","/photos/116479554@N04/20734995351/in/explore-2015-08-20/","/photos/116479554@N04/","/photos/116479554@N04/20734995351/in/explore-2015-08-20/","/photos/116479554@N04/20734995351/in/explore-2015-08-20/","/photos/squareburn/20734952181/in/explore-2015-08-20/","/photos/squareburn/20734952181/in/explore-2015-08-20/","/photos/squareburn/","/photos/squareburn/20734952181/in/explore-2015-08-20/","/photos/squareburn/20734952181/in/explore-2015-08-20/","/photos/jarhtc/20727415682/in/explore-2015-08-20/","/photos/jarhtc/20727415682/in/explore-2015-08-20/","/photos/jarhtc/","/photos/jarhtc/20727415682/in/explore-2015-08-20/","/photos/jarhtc/20727415682/in/explore-2015-08-20/","/photos/tonyshi/20725840061/in/explore-2015-08-20/","/photos/tonyshi/20725840061/in/explore-2015-08-20/","/photos/tonyshi/","/photos/tonyshi/20725840061/in/explore-2015-08-20/","/photos/tonyshi/20725840061/in/explore-2015-08-20/","/photos/colinsbell/20548635799/in/explore-2015-08-20/","/photos/colinsbell/20548635799/in/explore-2015-08-20/","/photos/colinsbell/","/photos/colinsbell/20548635799/in/explore-2015-08-20/","/photos/colinsbell/20548635799/in/explore-2015-08-20/","/photos/childishtoy/20543504870/in/explore-2015-08-20/","/photos/childishtoy/20543504870/in/explore-2015-08-20/","/photos/childishtoy/","/photos/childishtoy/20543504870/in/explore-2015-08-20/","/photos/childishtoy/20543504870/in/explore-2015-08-20/","/photos/131474603@N03/20543682528/in/explore-2015-08-20/","/photos/131474603@N03/20543682528/in/explore-2015-08-20/","/photos/131474603@N03/","/photos/131474603@N03/20543682528/in/explore-2015-08-20/","/photos/131474603@N03/20543682528/in/explore-2015-08-20/","/photos/117605304@N07/20720213885/in/explore-2015-08-20/","/photos/117605304@N07/20720213885/in/explore-2015-08-20/","/photos/117605304@N07/","/photos/117605304@N07/20720213885/in/explore-2015-08-20/","/photos/117605304@N07/20720213885/in/explore-2015-08-20/","/photos/tiggrrr/20735972231/in/explore-2015-08-20/","/photos/tiggrrr/20735972231/in/explore-2015-08-20/","/photos/tiggrrr/","/photos/tiggrrr/20735972231/in/explore-2015-08-20/","/photos/tiggrrr/20735972231/in/explore-2015-08-20/","/photos/lemmerdeur64/20716248572/in/explore-2015-08-20/","/photos/lemmerdeur64/20716248572/in/explore-2015-08-20/","/photos/lemmerdeur64/","/photos/lemmerdeur64/20716248572/in/explore-2015-08-20/","/photos/lemmerdeur64/20716248572/in/explore-2015-08-20/","/explore/2015/08/19","/explore/2015/08/21","/about","/jobs","//blog.flickr.net/en","//mobile.yahoo.com/flickr","/services/developer","/help/guidelines","//yahoo.uservoice.com/forums/211185-us-flickr","/abuse","/help/forum","/change_language.gne?lang=en-US&csrf=","//info.yahoo.com/privacy/us/yahoo/flickr/details.html","/help/terms","//safely.yahoo.com","//help.yahoo.com/kb/flickr","https://info.yahoo.com","http://flickr.tumblr.com/","https://www.facebook.com/flickr","https://twitter.com/flickr","https://plus.google.com/+flickr"];

    var URI_BLACKLIST_PROTOCOLS = {'javascript':1, 'data':1, 'vbscript':1, 'mhtml':1, 'x-schema':1},
        URI_PROTOCOL_COLON = /(?::|&#[xX]0*3[aA];?|&#0*58;?|&colon;)/,
        URI_PROTOCOL_WHITESPACES = /(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,
        URI_PROTOCOL_NAMED_REF_MAP = {Tab: '\t', NewLine: '\n'},
        NULL   = /\x00/g,
        SENSITIVE_HTML_ENTITIES = /&(?:#([xX][0-9A-Fa-f]+|\d+);?|(Tab|NewLine|colon|semi|lpar|rpar|apos|b?sol|comma|excl|ast|midast|ensp|emsp|thinsp);|(nbsp|amp|AMP|lt|LT|gt|GT|quot|QUOT);?)/g,
        SENSITIVE_NAMED_REF_MAP = {Tab: '\t', NewLine: '\n', colon: ':', semi: ';', lpar: '(', rpar: ')', apos: '\'', sol: '/', bsol: '\\', comma: ',', excl: '!', ast: '*', midast: '*', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', nbsp: '\xA0', amp: '&', lt: '<', gt: '>', quot: '"', QUOT: '"'};


    var fromCodePoint = String.fromCodePoint || function(codePoint) {
            if (arguments.length === 0) {
                return '';
            }
            if (codePoint <= 0xFFFF) { // BMP code point
                return String.fromCharCode(codePoint);
            }

            // Astral code point; split in surrogate halves
            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            codePoint -= 0x10000;
            return String.fromCharCode((codePoint >> 10) + 0xD800, (codePoint % 0x400) + 0xDC00);
        };
    var x = {
        // turn invalid codePoints and that of non-characters to \uFFFD, and then fromCodePoint()
        frCoPt: function(num) {
            return num === undefined || num === null ? '' :
                !isFinite(num = Number(num)) || // `NaN`, `+Infinity`, or `-Infinity`
                num <= 0 ||                     // not a valid Unicode code point
                num > 0x10FFFF ||               // not a valid Unicode code point
                // Math.floor(num) != num || 

                (num >= 0x01 && num <= 0x08) ||
                (num >= 0x0E && num <= 0x1F) ||
                (num >= 0x7F && num <= 0x9F) ||
                (num >= 0xFDD0 && num <= 0xFDEF) ||
                
                 num === 0x0B || 
                (num & 0xFFFF) === 0xFFFF || 
                (num & 0xFFFF) === 0xFFFE ? '\uFFFD' : fromCodePoint(num);
        }
    };

 //    var reHtmlEntities = /&\x00*(?:#(\x00*[xX][0-9A-Fa-f\x00]+|[\d\x00]+);?|([a-zA-Z\x00]+;?))/g,
 //        // namedRefWithSemiColon = /^(Tab|NewLine|colon|semi|lpar|rpar|apos|b?sol|comma|excl|ast|midast|ensp|emsp|thinsp);/,
 //        // namedRefOptionalSemiColon = /^(nbsp|amp|AMP|lt|LT|gt|GT|quot|QUOT);?/;
 //        namedRefWithSemiColon = /^(Tab|NewLine|colon|semi|lpar|rpar|apos|b?sol|comma|excl|ast|midast|ensp|emsp|thinsp);/,
 //        namedRefOptionalSemiColon = /^(nbsp|amp|AMP|lt|LT|gt|GT|quot|QUOT);?/;
 // {Tab: '\t', NewLine: '\n', colon: ':', semi: ';', lpar: '(', rpar: ')', apos: '\'', sol: '/', bsol: '\\', comma: ',', excl: '!', ast: '*', midast: '*', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', nbsp: '\xA0', amp: '&', lt: '<', gt: '>', quot: '"', QUOT: '"'};

    // no semi-colon needed if it's optional  
    // to generate, given {'Tab;':'\t', 'NewLine;': '\n' ... }, replace repeatedly using /'(\w)([\w;]+)'\s*:\s*'([^']*)'/g with '$1': {'$2': '$3'}
    var trieNamedRef = {
        'a': {'m': {'p': '&'},                         'p': {'o': {'s': {';': '\''}}},         's': {'t': {';': '*'}}},
        'A': {'M': {'P': '&'}},
        'b': {'s': {'o': {'l': {';': '\\'}}}},
        'c': {'o': {'m': {'m': {'a': {';': ','}}}},    'o': {'l': {'o': {'n': {';': ':'}}}}},
        'e': {'x': {'c': {'l': {';': '!'}}},           'n': {'s': {'p': {';': '\u2002'}}},     'm': {'s': {'p': {';': '\u2003'}}}},
        'g': {'t': '>'},
        'G': {'T': '>'},
        'l': {'p': {'a': {'r': {';': '('}}},           't':     '<'},
        'L': {'T': '<'},
        'm': {'i': {'d': {'a': {'s': {'t': {';': '*'}}}}}},
        'n': {'b': {'s': {'p': '\xA0'}}},
        'N': {'e': {'w': {'L': {'i': {'n': {'e': {';': '\n'}}}}}}},
        'q': {'u': {'o': {'t': '"'}}},
        'Q': {'U': {'O': {'T': '"'}}},
        'r': {'p': {'a': {'r': {';': ')'}}}},
        's': {'e': {'m': {'i': {';': ';'}}},           'o': {'l': {';': '/'}}},
        't': {'h': {'i': {'n': {'s': {'p': {';': '\u2009'}}}}}},
        'T': {'a': {'b': {';': '\t'}}}
    };
    // Ref: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
    var specialCharToken = [
        /*\x80*/ '\u20AC', '\u0081', '\u201A', '\u0192', 
        /*\x84*/ '\u201E', '\u2026', '\u2020', '\u2021', 
        /*\x88*/ '\u02C6', '\u2030', '\u0160', '\u2039', 
        /*\x8C*/ '\u0152', '\u008D', '\u017D', '\u008F',
        /*\x90*/ '\u0090', '\u2018', '\u2019', '\u201C', 
        /*\x94*/ '\u201D', '\u2022', '\u2013', '\u2014', 
        /*\x98*/ '\u02DC', '\u2122', '\u0161', '\u203A', 
        /*\x9C*/ '\u0153', '\u009D', '\u017E', '\u0178'
    ];

    function getHtmlDecodedChar(codePoint) {
        return (codePoint >= 0x80 && codePoint <= 0x9F) ? specialCharToken[codePoint - 0x80] 
            : (codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint === 0 || codePoint > 0x10FFFF ? '\uFFFD'
            : codePoint <= 0xFFFF ? String.fromCharCode(codePoint) // BMP code point
            // Astral code point; split in surrogate halves
            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            : String.fromCharCode(( (codePoint -= 0x10000) >> 10) + 0xD800, (codePoint % 0x400) + 0xDC00);
    }

    function htmlDecode(s, onOutputMatched, nullFreeInput) {
        if (s === undefined || s === null) return '';
        s = s.toString();

        var c, lastIdx = 0, ampIdx = -1, bufIdx = -1, subTrie, output = '', state = 0, i = 0, len = s.length;

        while (i < len) {
            c = s.charCodeAt(i);

            if (state === 0) {                              // init state

                if (c === 0x26) {                           //   & collected, switch to state 1
                    state = 1;
                    ampIdx = i;
                }                

            } else if (state === 1) {                   // & previously collected

                if (c === 0x23) {                       //   # collected, switch to number matching (state 2)
                    state = 2;
                // } else if (c >= 0x41 && c <= 0x5A || 
                //     c >= 0x61 && c <= 0x7A || 
                //     c >= 0x30 && c <= 0x39) {        //   alphanumeric collected, switch to named ref matching (state 6)
                } else if ((subTrie = trieNamedRef[s[i]])) {
                    state = 5;
                    // bufIdx = i; // since subTrie is used to track
                } else {                                //   otherwise, not a character reference. 
                    state = -1;
                }

            } else if (state === 2) {                   // # previously collected
                if (c === 0x78 || c === 0x58) {         //   X or x collected, process as hex (state 3)
                    state = 16;
                } else if (c >= 0x30 && c <= 0x39) {    //   digits collected, process as dec (state 4)
                    state = 10;
                    bufIdx = i;
                } else {
                    state = -1;
                }

            } else if (state === 16) {                   // xX previously collected (hex)

                if (c >= 0x30 && c <= 0x39 || 
                    c >= 0x41 && c <= 0x46 ||
                    c >= 0x61 && c <= 0x66) {           //   A-Fa-f0-9 collected
                    if (bufIdx === -1) {
                        bufIdx = i;
                    }
                } else {
                    if (bufIdx > 0) {                   //   non-digits char encountered
                        output += s.slice(lastIdx, ampIdx) + getHtmlDecodedChar(parseInt(s.slice(bufIdx, i), 16));
                        if (onOutputMatched && onOutputMatched(c, output)) return output;
                        // consume one more char if the current one is semicolon
                        lastIdx = c === 0x3B ? i + 1 : i;
                    }
                    state = -1;
                }

            } else if (state === 10) {                   // 0-9 previously collected (dec)
                if (c >= 0x30 && c <= 0x39) {
                    // bufIdx is set before entering state 10
                } else if (bufIdx > 0) {
                    output += s.slice(lastIdx, ampIdx) + getHtmlDecodedChar(parseInt(s.slice(bufIdx, i)));
                    if (onOutputMatched && onOutputMatched(c, output)) return output;
                    lastIdx = c === 0x3B ? i + 1 : i;
                    state = -1;
                }
            } else if (state === 5) {                   // named ref collected

                // assumed named ref must have at least 2 chars
                // if ((c >= 0x41 && c <= 0x5A || 
                //     c >= 0x61 && c <= 0x7A) && 
                    // c >= 0x30 && c <= 0x39        // here's an optimization as no char ref contains number
                if ((subTrie = subTrie[s[i]])) {
                    if (typeof subTrie === 'string') {
                        output += s.slice(lastIdx, ampIdx) + subTrie;
                        if (onOutputMatched && onOutputMatched(c, output)) return output;
                        // when the last hit char is not semicolon, consume the next semicolon, if any
                        c !== 0x3B && s.charCodeAt(i+1) === 0x3B && i++;
                        lastIdx = i + 1;
                        state = -1;
                    }
                } else {
                    state = -1;
                }
            }

            // reset to init state
            if (state === -1) {
                
                // reconsume the & char as if in state 0, when it's used to terminate an entity (e.g., &#39&#39)
                if (c === 0x26) {
                    state = 1;
                    ampIdx = i;
                    bufIdx = -1;
                } else {
                    state = 0;
                    ampIdx = bufIdx = -1;
                }
            }
            // replace Null with \uFFFD
            if (!nullFreeInput && c === 0) {
                output += s.slice(lastIdx, i) + '\uFFFD';
                if (onOutputMatched && onOutputMatched(0xFFFD, output)) return output;
                lastIdx = i + 1;
            }
            
            i++;
        }

        if (lastIdx === 0) {
            output = s;
        } else if ((state === 16 || state === 10) && bufIdx > 0) {
            // flash any collected numbered references
            output += s.slice(lastIdx, ampIdx) + getHtmlDecodedChar(parseInt(s.slice(bufIdx, i), state));
        } else {
            output += s.slice(lastIdx);
        }
        onOutputMatched && onOutputMatched(null, output);
        return output;
    }
    function htmlDecode2(s, namedRefMap, reNamedRef, skipReplacement) {
        
        namedRefMap = namedRefMap || SENSITIVE_NAMED_REF_MAP;
        reNamedRef = reNamedRef || SENSITIVE_HTML_ENTITIES;

        function regExpFunction(m, num, named, named1) {
            if (num) {
                num = Number(num[0] <= '9' ? num : '0' + num);
                // switch(num) {
                //     case 0x80: return '\u20AC';  // EURO SIGN (€)
                //     case 0x82: return '\u201A';  // SINGLE LOW-9 QUOTATION MARK (‚)
                //     case 0x83: return '\u0192';  // LATIN SMALL LETTER F WITH HOOK (ƒ)
                //     case 0x84: return '\u201E';  // DOUBLE LOW-9 QUOTATION MARK („)
                //     case 0x85: return '\u2026';  // HORIZONTAL ELLIPSIS (…)
                //     case 0x86: return '\u2020';  // DAGGER (†)
                //     case 0x87: return '\u2021';  // DOUBLE DAGGER (‡)
                //     case 0x88: return '\u02C6';  // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
                //     case 0x89: return '\u2030';  // PER MILLE SIGN (‰)
                //     case 0x8A: return '\u0160';  // LATIN CAPITAL LETTER S WITH CARON (Š)
                //     case 0x8B: return '\u2039';  // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
                //     case 0x8C: return '\u0152';  // LATIN CAPITAL LIGATURE OE (Œ)
                //     case 0x8E: return '\u017D';  // LATIN CAPITAL LETTER Z WITH CARON (Ž)
                //     case 0x91: return '\u2018';  // LEFT SINGLE QUOTATION MARK (‘)
                //     case 0x92: return '\u2019';  // RIGHT SINGLE QUOTATION MARK (’)
                //     case 0x93: return '\u201C';  // LEFT DOUBLE QUOTATION MARK (“)
                //     case 0x94: return '\u201D';  // RIGHT DOUBLE QUOTATION MARK (”)
                //     case 0x95: return '\u2022';  // BULLET (•)
                //     case 0x96: return '\u2013';  // EN DASH (–)
                //     case 0x97: return '\u2014';  // EM DASH (—)
                //     case 0x98: return '\u02DC';  // SMALL TILDE (˜)
                //     case 0x99: return '\u2122';  // TRADE MARK SIGN (™)
                //     case 0x9A: return '\u0161';  // LATIN SMALL LETTER S WITH CARON (š)
                //     case 0x9B: return '\u203A';  // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
                //     case 0x9C: return '\u0153';  // LATIN SMALL LIGATURE OE (œ)
                //     case 0x9E: return '\u017E';  // LATIN SMALL LETTER Z WITH CARON (ž)
                //     case 0x9F: return '\u0178';  // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
                // }
                // // num >= 0xD800 && num <= 0xDFFF, and 0x0D is separately handled, as it doesn't fall into the range of x.pec()
                // return (num >= 0xD800 && num <= 0xDFFF) || num === 0x0D ? '\uFFFD' : x.frCoPt(num);

                return skipReplacement ? fromCodePoint(num)
                        : num === 0x80 ? '\u20AC'  // EURO SIGN (€)
                        : num === 0x82 ? '\u201A'  // SINGLE LOW-9 QUOTATION MARK (‚)
                        : num === 0x83 ? '\u0192'  // LATIN SMALL LETTER F WITH HOOK (ƒ)
                        : num === 0x84 ? '\u201E'  // DOUBLE LOW-9 QUOTATION MARK („)
                        : num === 0x85 ? '\u2026'  // HORIZONTAL ELLIPSIS (…)
                        : num === 0x86 ? '\u2020'  // DAGGER (†)
                        : num === 0x87 ? '\u2021'  // DOUBLE DAGGER (‡)
                        : num === 0x88 ? '\u02C6'  // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
                        : num === 0x89 ? '\u2030'  // PER MILLE SIGN (‰)
                        : num === 0x8A ? '\u0160'  // LATIN CAPITAL LETTER S WITH CARON (Š)
                        : num === 0x8B ? '\u2039'  // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
                        : num === 0x8C ? '\u0152'  // LATIN CAPITAL LIGATURE OE (Œ)
                        : num === 0x8E ? '\u017D'  // LATIN CAPITAL LETTER Z WITH CARON (Ž)
                        : num === 0x91 ? '\u2018'  // LEFT SINGLE QUOTATION MARK (‘)
                        : num === 0x92 ? '\u2019'  // RIGHT SINGLE QUOTATION MARK (’)
                        : num === 0x93 ? '\u201C'  // LEFT DOUBLE QUOTATION MARK (“)
                        : num === 0x94 ? '\u201D'  // RIGHT DOUBLE QUOTATION MARK (”)
                        : num === 0x95 ? '\u2022'  // BULLET (•)
                        : num === 0x96 ? '\u2013'  // EN DASH (–)
                        : num === 0x97 ? '\u2014'  // EM DASH (—)
                        : num === 0x98 ? '\u02DC'  // SMALL TILDE (˜)
                        : num === 0x99 ? '\u2122'  // TRADE MARK SIGN (™)
                        : num === 0x9A ? '\u0161'  // LATIN SMALL LETTER S WITH CARON (š)
                        : num === 0x9B ? '\u203A'  // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
                        : num === 0x9C ? '\u0153'  // LATIN SMALL LIGATURE OE (œ)
                        : num === 0x9E ? '\u017E'  // LATIN SMALL LETTER Z WITH CARON (ž)
                        : num === 0x9F ? '\u0178'  // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
                        : (num >= 0xD800 && num <= 0xDFFF) || num === 0x0D ? '\uFFFD'
                        : x.frCoPt(num);
            }
            return namedRefMap[named || named1] || m;
        }

        return s === undefined || s === null  ? '' : s.toString().replace(NULL, '\uFFFD').replace(reNamedRef, regExpFunction);
    }



    var URL_ABS = /^[\x00-\x20]*([a-zA-Z][a-zA-Z0-9+-.\t\n\r]*:)[\/\\]*([^:\/\\?#]*)/,
        URL_REL = /^[\x00-\x20]*(?![\/\\]{2}|[a-zA-Z][a-zA-Z0-9+-.\t\n\r]*:)/,
        URL_WHITESPACES = /[\t\n\r]+/g,
        // URL_PROTO2 = /^[\x00-\x20]*([a-zA-Z][a-zA-Z0-9+-.\t\n\r]*):/,
        URL_PROTO = /^([\x00-\x20&#a-zA-Z0-9;+-.]*:?)/,
        URL_PROTO3 = /^[\x01-\x20]*([a-zA-Z][a-zA-Z0-9+-.\t\n\r]*):/;

function getProtocolUnsafe(str) {
    var m = str.match(URL_ABS);
    return m ? m[1].toLowerCase() : m;
}

function getProtocol1(str) {
    var s = str.replace(NULL, '').split(URI_PROTOCOL_COLON, 2);
    // str.length !== s[0].length is for older IE (e.g., v8), where delimeter residing at last will result in length equals 1, but not 2
    return (s[0] && (s.length === 2 || str.length !== s[0].length)) ? htmlDecode2(s[0]).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase() : null;
}
function getProtocol1b(str) {
    var s = str.replace(NULL, '').split(URI_PROTOCOL_COLON, 2);
    // str.length !== s[0].length is for older IE (e.g., v8), where delimeter residing at last will result in length equals 1, but not 2
    return (s[0] && (s.length === 2 || str.length !== s[0].length)) ? htmlDecode(s[0]).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase() : null;
}


function getProtocol3(str) {
    var m = htmlDecode(str).match(URL_PROTO3);
    return m ? m[1].replace(URL_WHITESPACES, '').toLowerCase() : m;
}

function getProtocol4(str) {
    var m = str.match(URL_PROTO), i;
    if (m) {
        str = htmlDecode(m[1]);
        i = str.indexOf(':');
        return i === -1 ? null : str.slice(0, i).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
    }
    return m;
}
function getProtocol4Fast(str) {
    var m = str.match(URL_PROTO), i;
    if (m) {
        m = htmlDecode(m[1]).split(':', 2);
        m.length === 2 ? m[0].replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase() : null;
    }
    return m;


    /*
    var m = str.match(URL_PROTO), i;
    if (m) {

        htmlDecode(str, function(charCode, output){
            if (charCode === null) {
                var i = output.indexOf(':');
                if (i === -1) return false;
                output.slice(0, i).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
            }
            else if (charCode === 58) { // :
                // check
                output.replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();

                return true;
            }
            return false;
        });
    }
    return m;
    */
}

function getProtocol4b(str) {
    var m = str.match(URL_PROTO), i;
    if (m) {
        str = htmlDecode2(m[1]);
        i = str.indexOf(':');
        return i === -1 ? null : str.slice(0, i).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
    }
    return m;
}

function searchProtocolFast(str) {

    htmlDecode(str, function(charCode, output){
        if (charCode === null) {
            var i = output.indexOf(':');
            if (i === -1) return false;
            output.slice(0, i).replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
        }
        else if (charCode === 58) { // :
            // check
            output.replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();

            return true;
        }
        return false;
    });
}

console.log(sample1[1], JSON.stringify(htmlDecode(sample1[1])), JSON.stringify(getProtocol3(sample1[1])), JSON.stringify(getProtocol4(sample1[1])));
// console.log(sample1[1], JSON.stringify(htmlDecode(sample1[1])), getProtocol2(sample1[1]));
// console.log(sample1[1], JSON.stringify(htmlDecode(sample1[1])), getProtocol1(sample1[1]));

// add tests
suite
// .add('using whitelist', function() {
//     sample1.filter(getProtocol2);
//     sample2.filter(getProtocol2);
// })
.add('using htmlDecode old', function() {
    sample1.filter(function(s) {return htmlDecode2(s)});
    sample3.filter(function(s) {return htmlDecode2(s)});
})
.add('using htmlDecode new', function() {
    sample1.filter(function(s) {return htmlDecode(s)});
    sample3.filter(function(s) {return htmlDecode(s)});
})

.add('using getProtocol old', function() {
	sample1.filter(getProtocol1);
    sample2.filter(getProtocol1);
})
.add('using getProtocol old w/ new decoder', function() {
    sample1.filter(getProtocol1b);
    sample2.filter(getProtocol1b);
})
.add('using getProtocol new (decode first, then match)', function() {
    sample1.filter(getProtocol3);
    sample2.filter(getProtocol3);
})
.add('using getProtocol new (greedy match first, then decode and match)', function() {
    sample1.filter(getProtocol4);
    sample2.filter(getProtocol4);
})
.add('using getProtocol new (greedy match first, then decode and match) w/old decoder', function() {
    sample1.filter(getProtocol4b);
    sample2.filter(getProtocol4b);
})
.add('using searchProtocol 1', function() {
    sample1.filter(searchProtocolFast);
    sample2.filter(searchProtocolFast);
})
.add('using searchProtocol 2 (greedy match first, then decode and match)', function() {
    sample1.filter(getProtocol4Fast);
    sample2.filter(getProtocol4Fast);
})

.add('legit samples | using getProtocol old', function() {
    sample3.filter(getProtocol1);
})
.add('legit samples | using getProtocol old w/new decoder', function() {
    sample3.filter(getProtocol1b);
})
.add('legit samples | using getProtocol new (decode first, then match)', function() {
    sample3.filter(getProtocol3);
})
.add('legit samples | using getProtocol new (greedy match first, then decode and match)', function() {
    sample3.filter(getProtocol4);
})
.add('legit samples | using getProtocol new (greedy match first, then decode and match) w/old decoder', function() {
    sample3.filter(getProtocol4b);
})
.add('legit samples | using searchProtocol 1', function() {
    sample3.filter(searchProtocolFast);
})
.add('legit samples | using searchProtocol 2 (greedy match first, then decode and match)', function() {
    sample3.filter(getProtocol4Fast);
})

// add listeners
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async
.run({ 'async': true });
