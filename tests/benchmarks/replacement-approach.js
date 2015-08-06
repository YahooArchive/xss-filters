#!/usr/bin/env node

/*
Background
============
Machine: MacBook Pro (Retina, 15-inch, Early 2013). OSX 10.10.4
Note:    The stats are collected using nodejs, and may not reflect the actual performance in different browsers.

Stats
============
using switch with all options x 527,468 ops/sec ±0.58% (99 runs sampled)
using switch with default option x 528,898 ops/sec ±0.53% (98 runs sampled)
using switch with final return x 525,099 ops/sec ±0.64% (94 runs sampled)
using if-else shortcuts x 520,917 ops/sec ±0.77% (99 runs sampled)
using inline if-else shortcuts x 514,742 ops/sec ±0.84% (96 runs sampled)
using object lookup x 511,245 ops/sec ±0.42% (98 runs sampled)
Fastest is using switch with default option,using switch with all options,using switch with final return,using if-else shortcuts

Conclusion
============
Statistically-insignificant difference between using switch and if-else shortcuts

*/


var Benchmark = require('Benchmark');
var suite = new Benchmark.Suite;

// the following vector is sourced from http://ha.ckers.org/xss.html.
var sample = '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>=&{}';

var SPECIAL_HTML_CHARS = /[&<>"'`]/g;

function map1 (m) {
    return m === '&' ? '&amp;'
        :  m === '<' ? '&lt;'
        :  m === '>' ? '&gt;'
        :  m === '"' ? '&quot;'
        :  m === "'" ? '&#39;'
        :  /*m === '`'*/ '&#96;';
}


function map2a (m) {
    switch(m) {
    	case '&': return '&amp;';
    	case '<': return '&lt;';
    	case '>': return '&gt;';
    	case '"': return '&quot;';
    	case "'": return '&#39;';
    	case '`': return '&#96;';
    }
}

function map2b (m) {
    switch(m) {
    	case '&': return '&amp;';
    	case '<': return '&lt;';
    	case '>': return '&gt;';
    	case '"': return '&quot;';
    	case "'": return '&#39;';
    	default: return '&#96;';
    }
}

function map2c (m) {
    switch(m) {
    	case '&': return '&amp;';
    	case '<': return '&lt;';
    	case '>': return '&gt;';
    	case '"': return '&quot;';
    	case "'": return '&#39;';
    }
    return '&#96;';
}

var _map3 = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};
function map3 (m) {
	return _map3[m];
}


// add tests
suite
.add('noop', function(){
	// make sure this is the slowest
	sample.replace(SPECIAL_HTML_CHARS, map2a).replace(SPECIAL_HTML_CHARS, map2a);
})
// .add(' y filter', function() {
// 	xssFilters.y(sample);
// })
.add('using switch with all options', function() {
	sample.replace(SPECIAL_HTML_CHARS, map2a);
})
.add('using switch with default option', function() {
	sample.replace(SPECIAL_HTML_CHARS, map2b);
})
.add('using switch with final return', function() {
	sample.replace(SPECIAL_HTML_CHARS, map2c);
})
.add('using if-else shortcuts', function() {
	sample.replace(SPECIAL_HTML_CHARS, map1);
})
.add('using inline if-else shortcuts', function() {
	sample.replace(SPECIAL_HTML_CHARS, function (m) {
	    return m === '&' ? '&amp;'
	        :  m === '<' ? '&lt;'
	        :  m === '>' ? '&gt;'
	        :  m === '"' ? '&quot;'
	        :  m === "'" ? '&#39;'
	        :  /*m === '`'*/ '&#96;';
	});
})
.add('using object lookup', function() {
	sample.replace(SPECIAL_HTML_CHARS, map3);
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

