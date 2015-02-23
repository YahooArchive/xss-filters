Secure XSS Filters
==================

*Just sufficient* output filtering to prevent XSS, without
extra `&amp;amp;lt;`s.

## Goals

- **More Secure.** Context-dependent output filters that are
developer-friendly. It is safe to apply these filters like so:

```javascript
el.innerHTML = (
   "<a href=" + xssFilters.uriInUnquotedAttr(url) + ">" +
   xssFilters.uriInHTMLData(url) + 
   "</a>"
```

In this example, the traditional wisdom of blindly escapes
the five well-known characters (```&<>'"```) wouldn't stop
XSS. (E.g, when url is ```javascript:alert(1)``` or 
``` onclick=alert(1)```).`

- ***Just Sufficient* escaping.** Escapes the *minimal* set of
characters to thwart JavaScript executions, thus preventing
XSS attacks while keeping most characters intact. Say goodbye
to double-encoding problems such as '&amp;amp;lt;', as often
caused by traditional filters.

![alt Visualizing the concept of just sufficient encoding](https://ierg4210.github.io/web/images/xss-filters/xss-filters.png)
Figure 1. "Just sufficient" encoding based on the HTML5 spec.

## Design

- **Standards compliant.** - We redesigned XSS filters based
on the modern [HTML 5 spec][html5]. The principle is to escape
characters specific to each non-scriptable output context. Thus,
untrusted input, once sanitized by context-sensitive escaping,
can't break out from the containing context. This approach stops
malicious inputs from being executed as scripts, and also prevents
the age-old problem of over/double-encoding.

- **Carefully designed.** - Every filter has been heavily scrutinized
by Yahoo Security Engineers. The specific sets of characters that
require encoding have been minimized to preserve usability to the
greatest extent possible.

## Quick Start

### Server-side (nodejs)

Install the [xss-filters npm](https://www.npmjs.com/package/xss-filters), and include it as a dependency for your project:

```sh
npm install xss-filters --save
```

Require the secure filters, and you can then use it with your favorite
template engine.

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

Simply download the latest minified version from the
[dist/](./dist) folder. Embed it in your HTML file,
and all filters are available in a global object
called `xssFilters`.

```html
<script src="dist/xss-filters.min.js"></script>
<script>
var firstname = "..."; //an untrusted input collected from user
document.write('<h1> Hello, ' + xssFilters.inHTMLData(firstname) + '!</h1>')
</script>
```

API Documentations
-------

**WARNINGS**

(1) Filters MUST be applied only to UTF-8-encoded documents.

(2) DO NOT apply any filters inside any scriptable contexts,
i.e., `<script>`, `<style>`, `<embed>`, and `<svg>` tags as
well as `style=""` and `onXXX=""` (e.g., `onclick`) attributes.
A workaround is to use `<input id="strJS" value="{{{inHTMLData data}}}">`
and retrieve your data with `document.getElementById('strJS').value`.

There are five context-sensitive filters for generic input:
 - `<div>``{{{inHTMLData data}}}``</div>`
 - `<!--``{{{inHTMLComment comment}}}``-->`
 - `<input value='``{{{inSingleQuotedAttr value}}}``'/>`
 - `<input value="``{{{inDoubleQuotedAttr value}}}``"/>`
 - `<input value=``{{{inUnQuotedAttr value}}}``/>`

> Here we use {{{ }}} to indicate output expression to ease illustrations

**Whenever possible, apply a more specific filter** that best describes your context and data:

| Input\Context | HTMLData | HTMLComment | SingleQuotedAttr | DoubleQuotedAttr | UnQuotedAttr |
| -------- | -------- | -------- | -------- | -------- | -------- |
| Full URI | uriInHTMLData() | uriInHTMLComment() | uriInSingleQuotedAttr() | uriInDoubleQuotedAttr() | uriInUnQuotedAttr() |
| URI Path | uriPathInHTMLData() | uriPathInHTMLComment() | uriPathInSingleQuotedAttr() | uriPathInDoubleQuotedAttr() | uriPathInUnQuotedAttr() |
| URI Query | uriQueryInHTMLData() | uriQueryInHTMLComment() | uriQueryInSingleQuotedAttr() | uriQueryInDoubleQuotedAttr() | uriQueryInUnQuotedAttr() |
| URI Component | uriComponentInHTMLData() | uriComponentInHTMLComment() | uriComponentInSingleQuotedAttr() | uriComponentInDoubleQuotedAttr() | uriComponentInUnQuotedAttr() |
| URI Fragment | uriFragmentInHTMLData() | uriFragmentInHTMLComment() | uriFragmentInSingleQuotedAttr() | uriFragmentInDoubleQuotedAttr() | uriFragmentInUnQuotedAttr() |

Check out the [documentation](../../wiki) for more details.

Contributing
-------

To contribute, make changes in `src/` and `tests/`, and then do:

```sh
npm test             # run the tests
npm run-script docs  # build the docs
npm run-script build  # build the minified version
```

Build
-----
[![Build Status](https://travis-ci.org/yahoo/xss-filters.svg?branch=master)](https://travis-ci.org/yahoo/xss-filters)

License
-------

This software is free to use under the Yahoo BSD license.
See the [LICENSE file](./LICENSE) for license text and
copyright information.
