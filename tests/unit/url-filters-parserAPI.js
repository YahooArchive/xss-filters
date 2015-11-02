/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
(function() {
    var _privFilters = xssFilters._privFilters;
    var urlFilterFactory = xssFilters.urlFilters.yUrlFilterFactory;
    
    describe("urlFilterFactory: URL Parser tests", function() {
        var URLParser = urlFilterFactory({
            relScheme: true,
            absCallback: function(url, scheme, auth, hostname, port, path, extraArg){
                return JSON.stringify(arguments);
            }});

        it('valid samples', function() {

            // standard
            var url = 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash';
            var result = {
                    0: url,
                    1: 'http:', 
                    2: 'user:pass', 
                    3: 'host.com', 
                    4: '8080', 
                    5: '/p/a/t/h?query=string#hash', 
                    6: undefined};

            expect(URLParser(url)).to.eql(JSON.stringify(result));

            // no scheme 
            result[0] = url = '//user:pass@host.com:8080/p/a/t/h?query=string#hash';
            result[1] = undefined;
            expect(URLParser(url)).to.eql(JSON.stringify(result));

            // no port 
            result[0] = url = 'http://user:pass@host.com/p/a/t/h?query=string#hash';
            result[1] = 'http:';
            result[4] = undefined;
            expect(URLParser(url)).to.eql(JSON.stringify(result));

            // no auth and port
            result[0] = url = 'http://host.com/p/a/t/h?query=string#hash';
            result[2] = undefined;
            expect(URLParser(url)).to.eql(JSON.stringify(result));

            // authority with reserved chars
            result[0] = url = 'http://user:p:a@ss@host.com:8080/p/a/t/h?query=string#hash';
            result[2] = 'user:p:a@ss';
            result[4] = '8080';
            expect(URLParser(url)).to.eql(JSON.stringify(result));


        });

        it('valid samples with whitespaces within auth, hostname, and port', function() {
            var url = 'http://use\r:pass@ho\ts\rt.com:80\n80/p/a/t/h?query=string#hash';
            var result = {
                    0: url,
                    1: 'http:', 
                    2: 'use:pass', 
                    3: 'host.com', 
                    4: '8080', 
                    5: '/p/a/t/h?query=string#hash', 
                    6: undefined};

            expect(URLParser(url)).to.eql(JSON.stringify(result));
        });

        it('valid samples with various slashes', function() {
            var url, result = {
                    0: '',
                    1: 'http:', 
                    2: 'user:pass', 
                    3: 'host.com', 
                    4: '8080', 
                    5: '/p/a/t/h?query=string#hash', 
                    6: undefined};

            // no slashes
            result[0] = url = 'http:user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // more than needed slashes
            result[0] = url = 'http:////user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // back slashes
            result[0] = url = 'http:\\\\user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // more than needed back slashes
            result[0] = url = 'http:\\\\\\user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // mix of slashes
            result[0] = url = 'http:\\////\\user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));

            // remove the scheme/protocol
            result[1] = undefined;
            // no scheme and more than needed slashes
            result[0] = url = '////user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // no scheme and back slashes
            result[0] = url = '\\\\user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // no scheme and more than needed back slashes
            result[0] = url = '\\\\\\user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
            // no scheme and mix of slashes
            result[0] = url = '\\////\\user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));
        });

        it('valid samples with (non-)default port', function() {
            var url, result = {
                    0: '',
                    1: 'http:', 
                    2: 'user:pass', 
                    3: 'host.com', 
                    4: '8080', 
                    5: '/p/a/t/h?query=string#hash', 
                    6: undefined};

            // non-default port
            result[0] = url = 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql(JSON.stringify(result));

            // default port
            result[0] = url = 'http://user:pass@host.com:80/p/a/t/h?query=string#hash';
            result[4] = undefined;
            expect(URLParser(url)).to.eql(JSON.stringify(result));
        });

        it('invalid samples', function() {
            // url failing the default allowed scheme (http and https) test
            var url = 'ht\ttp://user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql('unsafe:' + url);
            url = 'ftp://user:pass@host.com:8080/p/a/t/h?query=string#hash';
            expect(URLParser(url)).to.eql('unsafe:' + url);


            // relative path will get unsafe by default
            ['asdf', '/asdf', 'asdf/', '?asdf', '#asdf', '://yahoo.com/hello'].forEach(function(url){
                expect(URLParser(url)).to.eql('unsafe:' + url);
            });
        });

    });


}());
