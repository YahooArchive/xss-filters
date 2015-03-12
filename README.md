Secure XSS Filters
=================
*Just sufficient* output filtering to prevent XSS!

## Goals

- **More Secure.** Context-dependent output filters that are developer-friendly. It is safe to apply these filters like so: 

  `document.write("<a href=" + xssFilters.uriInUnquotedAttr(url) + ">" + xssFilters.uriInHTMLData(url) + "</a>");`

  In this example, the traditional wisdom of blindly escaping the five well-known characters (`&` `<` `>` `'` `"` `` ` ``) would not stop XSS (e.g., when `url` is equal to `javascript:alert(1)` or ` onclick=alert(1)`).

- **Just Sufficient Encoding.** Encode the *minimal* set of characters to thwart JavaScript executions, thus preventing XSS attacks while keeping most characters intact. Say goodbye to double-encoding problems such as '&amp;amp;lt;', as often resulted from traditional filters!!

  ![alt Visualizing the concept of just sufficient encoding](https://ierg4210.github.io/web/images/xss-filters/xss-filters.png)
  Figure 1. "Just sufficient" encoding based on the HTML5 spec.

## Design

- **Standards Compliant.** We redesign XSS filters based on the modern [HTML 5 Specification](https://html.spec.whatwg.org/multipage/syntax.html#syntax). The principle is to escape characters specific to each non-scriptable output context. Hence, untrusted inputs, once sanitized by context-sensitive escaping, cannot break out from the containing context. This approach stops malicious inputs from being executed as scripts, and also prevents the age-old problem of over/double-encoding.
- **Carefully Designed.** Every filter is heavily scrutinized by Yahoo Security Engineers. The specific sets of characters that require encoding are minimized to preserve usability to the greatest extent possible.

## Quick Start

### Server-side (nodejs)

Install the [xss-filters npm](https://www.npmjs.com/package/xss-filters), and include it as a dependency for your project.
```sh
npm install xss-filters --save
```

Require *xss-filters*, and you may use it with your favorite template engine. Or just use it directly:

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

Simply download the latest minified version from the [`dist/`](./dist) folder. Embed it in your HTML file, and all filters are available in a global object called `xssFilters`.

```html
<!doctype html><!-- You need HTML 5 mode for browser -->
...
<script src="dist/xss-filters.min.js"></script>
<script>
var firstname = "..."; //an untrusted input collected from user
document.write('<h1> Hello, ' + xssFilters.inHTMLData(firstname) + '!</h1>')
</script>
```

API Documentations
-------

### WARNINGS

(1) Filters **MUST ONLY** be applied to UTF-8-encoded documents.

(2) **DON'T** apply any filters inside any scriptable contexts, i.e., `<script>`, `<style>`, `<embed>`, and `<svg>` tags as well as `style=""` and `onXXX=""` (e.g., `onclick`) attributes. It is **unsafe** to permit untrusted input inside a scriptable context. 

A workaround, if you need to include data for JS, is to use:
```html
<input id="strJS" value="{{{inDoubleQuotedAttr data}}}">
```
and retrieve your data with `document.getElementById('strJS').value`.

### The API

There are five context-sensitive filters for generic input:
 - `<div>` `{{{inHTMLData data}}}` `</div>`
 - `<!--` `{{{inHTMLComment comment}}}` `-->`
 - `<input value='` `{{{inSingleQuotedAttr value}}}` `'/>`
 - `<input value="` `{{{inDoubleQuotedAttr value}}}` `"/>`
 - `<input value=` `{{{inUnQuotedAttr value}}}` `/>`

> Here we use {{{ }}} to indicate output expression to ease illustrations

**Whenever possible, apply the most specific filter** that describes your context and data:

| Input\Context | HTMLData | HTMLComment | SingleQuotedAttr | DoubleQuotedAttr | UnQuotedAttr |
| -------- | -------- | -------- | -------- | -------- | -------- |
| Full URI | uriInHTMLData() | uriInHTMLComment() | uriInSingleQuotedAttr() | uriInDoubleQuotedAttr() | uriInUnQuotedAttr() |
| URI Path | uriPathInHTMLData() | uriPathInHTMLComment() | uriPathInSingleQuotedAttr() | uriPathInDoubleQuotedAttr() | uriPathInUnQuotedAttr() |
| URI Query | uriQueryInHTMLData() | uriQueryInHTMLComment() | uriQueryInSingleQuotedAttr() | uriQueryInDoubleQuotedAttr() | uriQueryInUnQuotedAttr() |
| URI Component | uriComponentInHTMLData() | uriComponentInHTMLComment() | uriComponentInSingleQuotedAttr() | uriComponentInDoubleQuotedAttr() | uriComponentInUnQuotedAttr() |
| URI Fragment | uriFragmentInHTMLData() | uriFragmentInHTMLComment() | uriFragmentInSingleQuotedAttr() | uriFragmentInDoubleQuotedAttr() | uriFragmentInUnQuotedAttr() |

Check out the [documentations](../../wiki) for more details.



Contributing
-------
To contribute, make changes in [`src/`](./src) and [`tests/`](./tests), and then do:
```sh
npm test              # run the tests
npm run-script build  # build the minified version for client-side use
npm run-script docs   # build the docs
```

Build
-----
[![Build Status](https://travis-ci.org/yahoo/xss-filters.svg?branch=master)](https://travis-ci.org/yahoo/xss-filters)

License
-------

This software is free to use under the Yahoo BSD license.
See the [LICENSE file](./LICENSE) for license text and copyright information.
