#!/usr/bin/env node

/*
Background
============
Machine: MacBook Pro (Retina, 15-inch, Early 2013). OSX 10.10.4
Note:    The stats are collected using nodejs, and may not reflect the actual performance in different browsers.

Stats
============
Sample1 | Baseline: std filter x 535,013 ops/sec ±0.53% (98 runs sampled)
Sample1 | Before NULL replacement: yd filter x 3,841,405 ops/sec ±0.75% (87 runs sampled)
Sample1 | After NULL replacement: yd filter (a1) x 1,050,236 ops/sec ±0.56% (98 runs sampled)
Sample1 | After NULL replacement: yd filter (a2) x 990,243 ops/sec ±0.43% (99 runs sampled)
Sample1 | After NULL replacement: yd filter (b) x 1,011,465 ops/sec ±0.81% (96 runs sampled)
Sample1 | After NULL replacement: yd filter (c) x 2,835,790 ops/sec ±0.87% (95 runs sampled)
Sample2 | Baseline: std filter x 6,463,041 ops/sec ±0.60% (99 runs sampled)
Sample2 | Before NULL replacement: yd filter x 10,149,817 ops/sec ±0.68% (98 runs sampled)
Sample2 | After NULL replacement: yd filter (a1) x 6,429,522 ops/sec ±0.53% (100 runs sampled)
Sample2 | After NULL replacement: yd filter (a2) x 6,092,447 ops/sec ±0.56% (100 runs sampled)
Sample2 | After NULL replacement: yd filter (b) x 6,487,079 ops/sec ±0.58% (96 runs sampled)
Sample2 | After NULL replacement: yd filter (c) x 5,418,700 ops/sec ±1.00% (95 runs sampled)
Sample3 | Baseline: std filter x 1,032,918 ops/sec ±0.74% (95 runs sampled)
Sample3 | Before NULL replacement: yd filter x 5,960,678 ops/sec ±0.67% (98 runs sampled)
Sample3 | After NULL replacement: yd filter (a1) x 1,462,908 ops/sec ±0.66% (97 runs sampled)
Sample3 | After NULL replacement: yd filter (a2) x 1,388,676 ops/sec ±0.72% (96 runs sampled)
Sample3 | After NULL replacement: yd filter (b) x 1,462,011 ops/sec ±0.57% (101 runs sampled)
Sample3 | After NULL replacement: yd filter (c) x 2,905,115 ops/sec ±0.51% (97 runs sampled)
Fastest is Sample2 | Before NULL replacement: yd filter

Conclusion
============
NULL replacement will incur a severe performance penalty, and should be made configurable

*/


var Benchmark = require('Benchmark');
var suite = new Benchmark.Suite;

// the following vector is sourced from http://ha.ckers.org/xss.html.
var sample1 = '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>=&{}';
var sample2 = 'hello world! test@example.com';
var sample3 = '<hello> &world! "john\'stest@example.com\x00.attacker.com"';

var NULL = /\x00/g;
var SPECIAL_DATA_CHARS   = /</g;
var SPECIAL_DATA_CHARS_N = /[\x00<]/g;
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
	return m === '>' ? '&lt;' : '\uFFFD';
}

function map2b (m) {
	switch(m) {
		case '>': return '&lt;';
		default: return '\uFFFD';
	}
}

// add tests
suite
.add('noop', function(){
	// make sure this is the slowest
	sample1.replace(SPECIAL_HTML_CHARS, map1).replace(SPECIAL_HTML_CHARS, map1);
})
.add('Sample1 | Baseline: std filter', function() {
	sample1.replace(SPECIAL_HTML_CHARS, map1);
})
.add('Sample1 | Before NULL replacement: yd filter', function() {
	sample1.replace(SPECIAL_DATA_CHARS, '&lt;');
})
.add('Sample1 | After NULL replacement: yd filter (a1)', function() {
	sample1.replace(SPECIAL_DATA_CHARS_N, map2a);
})
.add('Sample1 | After NULL replacement: yd filter (a2)', function() {
	sample1.replace(SPECIAL_DATA_CHARS_N, function (m) {
		return m === '>' ? '&lt;' : '\uFFFD';
	});
})
.add('Sample1 | After NULL replacement: yd filter (b)', function() {
	sample1.replace(SPECIAL_DATA_CHARS_N, map2b);
})
.add('Sample1 | After NULL replacement: yd filter (c)', function() {
	sample1.replace(SPECIAL_DATA_CHARS, '&lt;').replace(NULL, '\uFFFD');
})

.add('Sample2 | Baseline: std filter', function() {
	sample2.replace(SPECIAL_HTML_CHARS, map1);
})
.add('Sample2 | Before NULL replacement: yd filter', function() {
	sample2.replace(SPECIAL_DATA_CHARS, '&lt;');
})
.add('Sample2 | After NULL replacement: yd filter (a1)', function() {
	sample2.replace(SPECIAL_DATA_CHARS_N, map2a);
})
.add('Sample2 | After NULL replacement: yd filter (a2)', function() {
	sample2.replace(SPECIAL_DATA_CHARS_N, function (m) {
		return m === '>' ? '&lt;' : '\uFFFD';
	});
})
.add('Sample2 | After NULL replacement: yd filter (b)', function() {
	sample2.replace(SPECIAL_DATA_CHARS_N, map2b);
})
.add('Sample2 | After NULL replacement: yd filter (c)', function() {
	sample2.replace(SPECIAL_DATA_CHARS, '&lt;').replace(NULL, '\uFFFD');
})

.add('Sample3 | Baseline: std filter', function() {
	sample3.replace(SPECIAL_HTML_CHARS, map1);
})
.add('Sample3 | Before NULL replacement: yd filter', function() {
	sample3.replace(SPECIAL_DATA_CHARS, '&lt;');
})
.add('Sample3 | After NULL replacement: yd filter (a1)', function() {
	sample3.replace(SPECIAL_DATA_CHARS_N, map2a);
})
.add('Sample3 | After NULL replacement: yd filter (a2)', function() {
	sample3.replace(SPECIAL_DATA_CHARS_N, function (m) {
		return m === '>' ? '&lt;' : '\uFFFD';
	});
})
.add('Sample3 | After NULL replacement: yd filter (b)', function() {
	sample3.replace(SPECIAL_DATA_CHARS_N, map2b);
})
.add('Sample3 | After NULL replacement: yd filter (c)', function() {
	sample3.replace(SPECIAL_DATA_CHARS, '&lt;').replace(NULL, '\uFFFD');
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

