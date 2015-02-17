Secure XSS Filters
=================
Just sufficient output filtering to prevent XSS!

## Goals

- **More Secure** - Context-dependent output filters that are developer-friendly and easy to comprehend. It is secure to apply our filters like so: ```el.innerHTML = "<a href=" + xssFilters.uriInUnquotedAttr(url) + ">" + xssFilters.uriInHTMLData(url) + "</a>"```. In this example, the traditional wisdom of blindly encoding the five well-known characters (```&``` ```<``` ```>``` ```'``` ```"```) would however fail in stopping XSS (i.e., when url is ```javascript:alert(1)``` or ``` onclick=alert(1)```).
- **Just Sufficient Encoding** - Encode the *minimal* set of characters to thwart JavaScript executions, thus preventing XSS attacks while keeping most characters intact. Say goodbye to double-encoding problems such as '&amp;amp;lt;', as resulted often by traditional filters!!

![alt Visualizing the concept of just sufficient encoding](https://ierg4210.github.io/web/images/xss-filters/xss-filters.png)
Figure 1. Encoding decision based on the HTML5 specification to achieve the idea of "just sufficient encoding"

## Designs

- **Standard Compliant** - Stemmed from the modern HTML 5 Specification, we re-design how XSS filters should be applied. The general principle is to encode characters that are specific to each non-scriptable output context. Therefore, untrusted input characters are sanitized by context-sensitive encoding that will not break out from the containing context. The approach stops any malicious inputs from executed as scripts, as well as solving the age-old problem of over/double-encoding.
- **Carefully Designed** - Every filter is heavily scrutized by Yahoo Security Engineers. The specific sets of characters that require encoding are minimized so as to preserve usability to the greatest extent.

## Quick Start

### Server-side (nodejs)

Install the [xss-filters npm](https://www.npmjs.com/package/xss-filters), and include it as your project's dependency.
```
$ npm install xss-filters --save
```

Require the secure filters, and you can then use it with/out your favorite tempating engine.
```javascript
var express = require('express');
var app = express();
var xssFilters = require('xss-filters');

app.get('/', function(req, res){
  var firstname = req.query.firstname; //an untrusted input collected from user
  res.send('<h1> Hello, ' + xssFilters.inHTMLData(firstname) + '!</h1>');
});
```

### Client-side (browser)

Simply download the latest minified version of JavaScript file directly from the [`dist/`](./dist) folder. Embed it to your HTML file, and all filters are exposed to a global object called `xssFilters`.
```html
<script src="dist/xss-filters.min.js"></script>
<script>
var firstname = "..."; //an untrusted input collected from user
document.write('<h1> Hello, ' + xssFilters.inHTMLData(firstname) + '!</h1>')
</script>
```

API Documentations
-------
**DISCLAIMER**: (1) Filters are applied in UTF-8 documents. (2) DO NOT apply any filters inside any scriptable contexts, i.e., `<script>`, `<style>`, `<embed>`, and `<svg>` tags as well as `style=""` and `onXXX=""` (e.g., `onclick`) attributes. A workaround is to use `<input id="strJS" value="{{{inHTMLData data}}}">` and retrieve your data with `document.getElementById('strJS').value`.

There are five context-sensitive filters for generic input:
 - `<div>``{{{inHTMLData data}}}``</div>`
 - `<!--``{{{inHTMLComment comment}}}``-->`
 - `<input value='``{{{inSingleQuotedAttr value}}}``'/>`
 - `<input value="``{{{inDoubleQuotedAttr value}}}``"/>`
 - `<input value=``{{{inUnQuotedAttr value}}}``/>`

> Here we use {{{ }}} to indicate output expression to ease illustrations

**Whenenver possible, apply a more specific filter** that best describe your context and data:

| Input\Context | HTMLData | HTMLComment | SingleQuotedAttr | DoubleQuotedAttr | UnQuotedAttr |
| -------- | -------- | -------- | -------- | -------- | -------- |
| Full URI | uriInHTMLData() | uriInHTMLComment() | uriInSingleQuotedAttr() | uriInDoubleQuotedAttr() | uriInUnQuotedAttr() |
| URI Path | uriPathInHTMLData() | uriPathInHTMLComment() | uriPathInSingleQuotedAttr() | uriPathInDoubleQuotedAttr() | uriPathInUnQuotedAttr() |
| URI Query | uriQueryInHTMLData() | uriQueryInHTMLComment() | uriQueryInSingleQuotedAttr() | uriQueryInDoubleQuotedAttr() | uriQueryInUnQuotedAttr() |
| URI Component | uriComponentInHTMLData() | uriComponentInHTMLComment() | uriComponentInSingleQuotedAttr() | uriComponentInDoubleQuotedAttr() | uriComponentInUnQuotedAttr() |
| URI Fragment | uriFragmentInHTMLData() | uriFragmentInHTMLComment() | uriFragmentInSingleQuotedAttr() | uriFragmentInDoubleQuotedAttr() | uriFragmentInUnQuotedAttr() |

Check out the [documentations](../../wiki) for more details.



Contribute
-------
To contribute, you will make changes in `src/` and `tests/`, followed by the following commands:
- ```$ npm test``` to run the tests
- ```$ npm run-script docs``` to build the docs
- ```$ npm run-script build``` to build the standalone JavaScript for client-side use

Build
-----
[![Build Status](https://travis-ci.org/yahoo/xss-filters.svg?branch=master)](https://travis-ci.org/yahoo/xss-filters)

License
-------

This software is free to use under the Yahoo BSD license.
See the [LICENSE file](./LICENSE) for license text and copyright information.
