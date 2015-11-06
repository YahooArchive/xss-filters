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
    var yUrlResolver = xssFilters.urlFilters.yUrlResolver({appendFragment: true});

    describe("yUrlResolver: Base URL Rewritting", function() {
        var relUrls = ['asdf', '/asdf', '?asdf', '#asdf'];
        var absUrls = [
            '//www.yahoo.com', 
            'http:yahoo.com',
            'https://yahoo.com', 
            'https://a@yahoo.com:443'];
        var absUrlsAnswers = [
            '//www.yahoo.com/', 
            'http://yahoo.com/', 
            'https://yahoo.com/', 
            'https://a@yahoo.com/'];
        var urls = relUrls.concat(absUrls);

        it('empty baseURL samples', function() {
            var baseURL = '';
            urls.forEach(function(url){
                expect(yUrlResolver(url, baseURL)).to.eql('unsafe:' + url);
            });
        });
        it('invalid scheme baseURL samples', function() {
            var baseURL = 'javascript:alert(1)';
            urls.forEach(function(url){
                expect(yUrlResolver(url, baseURL)).to.eql('unsafe:' + url);
            });
        });
        it('relative baseURL samples', function() {
            var baseURL = '/xyz';
            urls.forEach(function(url){
                expect(yUrlResolver(url, baseURL)).to.eql('unsafe:' + url);
            });
        });
        it('schemeless baseURL samples', function() {
            var baseURL = '//www.yahoo.com';
            expect(yUrlResolver('asdf', baseURL)).to.eql('//www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('//www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('//www.yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('//www.yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });
        });

        it('absolute baseURL samples', function() {
            var absUrlsAnswers = [
                'http://www.yahoo.com/', 
                'http://yahoo.com/', 
                'https://yahoo.com/', 
                'https://a@yahoo.com/'
            ];

            var baseURL = 'http://www.yahoo.com';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://www.yahoo.com/';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://asdf@yahoo.com:80';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://asdf@yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://asdf@yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://asdf@yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://asdf@yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://@yahoo.com:80';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://@yahoo.com:81';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://yahoo.com:81/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://yahoo.com:81/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://yahoo.com:81/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://yahoo.com:81/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://yahoo.com:';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://www.yahoo.com/finance';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/finance?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/finance#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://www.yahoo.com?finance';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/?finance#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://www.yahoo.com#finance';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://www.yahoo.com#finance?hello';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });

            baseURL = 'http://www.yahoo.com/fin\\ance\\hello?world#test/ing?complex#url';
            expect(yUrlResolver('asdf', baseURL)).to.eql('http://www.yahoo.com/fin/ance/asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('http://www.yahoo.com/fin/ance/hello?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('http://www.yahoo.com/fin/ance/hello?world#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql(absUrlsAnswers[i]);
            });
            // last baseURL is being kept
            expect(yUrlResolver('asdf')).to.eql('http://www.yahoo.com/fin/ance/asdf');
            expect(yUrlResolver('/asdf')).to.eql('http://www.yahoo.com/asdf');
            expect(yUrlResolver('?asdf')).to.eql('http://www.yahoo.com/fin/ance/hello?asdf');
            expect(yUrlResolver('#asdf')).to.eql('http://www.yahoo.com/fin/ance/hello?world#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url)).to.eql(absUrlsAnswers[i]);
            });
        });

        it('invalid URL samples', function() {
            var baseURL = 'http://www.yahoo.com/';
            expect(yUrlResolver('javascript:alert(1)', baseURL)).to.eql('unsafe:javascript:alert(1)');
        });

        it('invalid baseURL samples', function() {
            // invalid baseURL
            var baseURL = 'http://yahoo.com:finance';
            expect(yUrlResolver('asdf', baseURL)).to.eql('unsafe:asdf');
            expect(yUrlResolver('/asdf', baseURL)).to.eql('unsafe:/asdf');
            expect(yUrlResolver('?asdf', baseURL)).to.eql('unsafe:?asdf');
            expect(yUrlResolver('#asdf', baseURL)).to.eql('unsafe:#asdf');
            absUrls.forEach(function(url, i){
                expect(yUrlResolver(url, baseURL)).to.eql('unsafe:' + url);
            });
        });

        it('supply baseURL but no url', function() {
            var baseURL = 'http://www.yahoo.com/';

            expect(yUrlResolver('', baseURL)).to.eql(baseURL);
            expect(yUrlResolver(undefined, baseURL)).to.eql(baseURL);

            // last baseURL is being kept
            expect(yUrlResolver('')).to.eql(baseURL);
            expect(yUrlResolver()).to.eql(baseURL);
        });

        it('supply invalid url and no baseURL', function() {
            var yUrlResolver = xssFilters.urlFilters.yUrlResolver();
            expect(yUrlResolver('javascript:alert(1)')).to.eql('unsafe:javascript:alert(1)');
        });

        it('inherit scheme', function() {
            expect(yUrlResolver('//hk.yahoo.com?xyz', 'https://yahoo.com?asdf')).to.eql('https://hk.yahoo.com/?xyz');
            expect(yUrlResolver('//hk.yahoo.com?xyz', 'http://yahoo.com?asdf')).to.eql('http://hk.yahoo.com/?xyz');
        });


        it('http: and https: absolute URLs and any relative paths (the default)', function() {
            var yUrlResolver = xssFilters.urlFilters.yUrlResolver();

            var baseURL = 'http:yahoo.com';
            expect(yUrlResolver('//hk.yahoo.com?xyz', baseURL)).to.eql('http://hk.yahoo.com/?xyz');
            expect(yUrlResolver('ftp://yahoo.com/?xyz', baseURL)).to.eql('unsafe:ftp://yahoo.com/?xyz');
            expect(yUrlResolver('http://www.yahoo.com/', baseURL)).to.eql('http://www.yahoo.com/');
            expect(yUrlResolver('mailto:abc@xyz.org', baseURL)).to.eql('unsafe:mailto:abc@xyz.org');
            expect(yUrlResolver('cid:1:xyz', baseURL)).to.eql('unsafe:cid:1:xyz');
            expect(yUrlResolver('#abc', baseURL)).to.eql('#abc');
            expect(yUrlResolver('hello/world.html', baseURL)).to.eql('http://yahoo.com/hello/world.html');
            expect(yUrlResolver('/hello/world.html', baseURL)).to.eql('http://yahoo.com/hello/world.html');
        });

        it('relative path resolution', function() {
            var yUrlResolver = xssFilters.urlFilters.yUrlResolver();
            yUrlResolver('', 'http:yahoo.com'); // set baseURL

            expect(yUrlResolver('../../hello/world.html')).to.eql('http://yahoo.com/hello/world.html');
            
            expect(yUrlResolver('/hello3/hello2/../../..')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../.%2e')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2e.')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2e%2e')).to.eql('http://yahoo.com/');

            expect(yUrlResolver('/hello3/hello2/../../../')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../.%2E/')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2E./')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2E%2e/')).to.eql('http://yahoo.com/');
            
            expect(yUrlResolver('/hello3/hello2/../../../hello')).to.eql('http://yahoo.com/hello');
            expect(yUrlResolver('/hello3/hello2/../../..?hello')).to.eql('http://yahoo.com/?hello');
            expect(yUrlResolver('/hello3/hello2/../../..#hello')).to.eql('http://yahoo.com/#hello');

            expect(yUrlResolver('/hello3/hello2/../../.')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2e')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2E')).to.eql('http://yahoo.com/');
            
            expect(yUrlResolver('/hello3/hello2/../.././')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2e/')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../%2E/')).to.eql('http://yahoo.com/');
            
            expect(yUrlResolver('/hello3/hello2/../.././hello')).to.eql('http://yahoo.com/hello');
            expect(yUrlResolver('/hello3/hello2/../../.?hello')).to.eql('http://yahoo.com/?hello');
            expect(yUrlResolver('/hello3/hello2/../../.#hello')).to.eql('http://yahoo.com/#hello');

            expect(yUrlResolver('/hello2/../hello/world.html')).to.eql('http://yahoo.com/hello/world.html');
            expect(yUrlResolver('/hello2/../hello/./world.html')).to.eql('http://yahoo.com/hello/world.html');

            expect(yUrlResolver('/hello/#/hello2/world.html')).to.eql('http://yahoo.com/hello/#/hello2/world.html');
            expect(yUrlResolver('/hello/?hello2/world.html')).to.eql('http://yahoo.com/hello/?hello2/world.html');
            expect(yUrlResolver('/hello/#/hello2?world.html')).to.eql('http://yahoo.com/hello/#/hello2?world.html');


            yUrlResolver('', 'http:yahoo.com/hello9'); // set baseURL
            expect(yUrlResolver('../../hello/world.html')).to.eql('http://yahoo.com/hello/world.html');
            expect(yUrlResolver('hello3/hello2/../..')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('hello3/hello2/../../')).to.eql('http://yahoo.com/');

            yUrlResolver('', 'http:yahoo.com/hello9/'); // set baseURL
            expect(yUrlResolver('../../hello/world.html')).to.eql('http://yahoo.com/hello/world.html');
            expect(yUrlResolver('hello3/hello2/../..')).to.eql('http://yahoo.com/hello9/');
            expect(yUrlResolver('hello3/hello2/../../')).to.eql('http://yahoo.com/hello9/');
            expect(yUrlResolver('hello3/hello2/../hello')).to.eql('http://yahoo.com/hello9/hello3/hello');
            expect(yUrlResolver('hello3/hello2/../..?hello')).to.eql('http://yahoo.com/hello9/?hello');
            expect(yUrlResolver('hello3/hello2/../..#hello')).to.eql('http://yahoo.com/hello9/#hello');

            expect(yUrlResolver('/hello3/hello2/../..')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../../')).to.eql('http://yahoo.com/');
            expect(yUrlResolver('/hello3/hello2/../hello')).to.eql('http://yahoo.com/hello3/hello');
            expect(yUrlResolver('/hello3/hello2/../..?hello')).to.eql('http://yahoo.com/?hello');
            expect(yUrlResolver('/hello3/hello2/../..#hello')).to.eql('http://yahoo.com/#hello');

            yUrlResolver('', 'http:yahoo.com/#hello?world/'); // set baseURL
            expect(yUrlResolver('?hello')).to.eql('http://yahoo.com/?hello');
            expect(yUrlResolver('#hello')).to.eql('#hello');


            yUrlResolver('', 'http://yahoo.com/hello1/hello2/'); // set baseURL
            expect(yUrlResolver('foo/bar.html')).to.eql('http://yahoo.com/hello1/hello2/foo/bar.html');
            expect(yUrlResolver('hello/../world.html')).to.eql('http://yahoo.com/hello1/hello2/world.html');
            expect(yUrlResolver('/hello/../world.html')).to.eql('http://yahoo.com/world.html');

            yUrlResolver('', 'http://yahoo.com/hello1/hello2/..'); // set baseURL
            expect(yUrlResolver('foo/bar.html')).to.eql('http://yahoo.com/hello1/foo/bar.html');
            expect(yUrlResolver('hello/../world.html')).to.eql('http://yahoo.com/hello1/world.html');
            expect(yUrlResolver('/hello/../world.html')).to.eql('http://yahoo.com/world.html');
        });


        it('relative path resolution (turned off)', function() {
            var yUrlResolver = xssFilters.urlFilters.yUrlResolver({resolvePath: false});

            var baseURL = 'http://yahoo.com/hello1/hello2/';
            expect(yUrlResolver('foo/bar.html', baseURL)).to.eql('http://yahoo.com/hello1/hello2/foo/bar.html');
            expect(yUrlResolver('hello/../world.html', baseURL)).to.eql('http://yahoo.com/hello1/hello2/hello/../world.html');
            expect(yUrlResolver('/hello/../world.html', baseURL)).to.eql('http://yahoo.com/hello/../world.html');

            var baseURL = 'http://yahoo.com/hello1/hello2/..';
            expect(yUrlResolver('foo/bar.html', baseURL)).to.eql('http://yahoo.com/hello1/hello2/../foo/bar.html');
            expect(yUrlResolver('hello/../world.html', baseURL)).to.eql('http://yahoo.com/hello1/hello2/../hello/../world.html');
            expect(yUrlResolver('/hello/../world.html', baseURL)).to.eql('http://yahoo.com/hello/../world.html');
        });


        it('mailto: scheme URLs and any relative paths', function() {
            function absBypass(url, origin, scheme, path) { return origin + path; }
            function relBypass(path) { return path; }
            var yUrlResolver = xssFilters.urlFilters.yUrlResolver({
                    relScheme: false,
                    schemes: ['mailto'],
                    absResolver: absBypass,
                    relResolver: relBypass
                });

            var baseURL = 'mailto:qwer@xyz.org';
            expect(yUrlResolver('//hk.yahoo.com?xyz', baseURL)).to.eql('unsafe://hk.yahoo.com?xyz');
            expect(yUrlResolver('ftp://yahoo.com/?xyz', baseURL)).to.eql('unsafe:ftp://yahoo.com/?xyz');
            expect(yUrlResolver('http://www.yahoo.com/', baseURL)).to.eql('unsafe:http://www.yahoo.com/');
            expect(yUrlResolver('mailto:abc@xyz.org', baseURL)).to.eql('mailto:abc@xyz.org');
            expect(yUrlResolver('cid:1:xyz', baseURL)).to.eql('unsafe:cid:1:xyz');
            expect(yUrlResolver('#abc', baseURL)).to.eql('#abc');
            expect(yUrlResolver('hello/world.html', baseURL)).to.eql('hello/world.html');
            expect(yUrlResolver('/hello/world.html', baseURL)).to.eql('/hello/world.html');
        });

        it('customized schemes', function() {
            function absBypass(url, origin, scheme, path) { return origin + path; }
            function relBypass(path) { return path; }
            var yUrlResolver = xssFilters.urlFilters.yUrlResolver({
                    schemes: ['http', 'https', 'ftp', 'mailto', 'cid'],
                    absResolver: {'mailto:': absBypass, 'cid:': absBypass},
                    relResolver: {'mailto:': relBypass, 'cid:': function(path, baseOrigin, baseScheme, basePath, options) {
                        // 35 is charcode of #
                        return path.charCodeAt(0) === 35 ? path : baseOrigin + basePath + path;
                    }}
                });

            var baseURL = '//yahoo.com?asdf';
            expect(yUrlResolver('//hk.yahoo.com?xyz', baseURL)).to.eql('//hk.yahoo.com/?xyz');
            expect(yUrlResolver('ftp://yahoo.com/?xyz', baseURL)).to.eql('ftp://yahoo.com/?xyz');
            expect(yUrlResolver('http://www.yahoo.com/', baseURL)).to.eql('http://www.yahoo.com/');
            expect(yUrlResolver('mailto:abc@xyz.org', baseURL)).to.eql('mailto:abc@xyz.org');
            expect(yUrlResolver('#abc', baseURL)).to.eql('#abc');
            expect(yUrlResolver('hello/world.html', baseURL)).to.eql('//yahoo.com/hello/world.html');
            expect(yUrlResolver('/hello/world.html', baseURL)).to.eql('//yahoo.com/hello/world.html');

            var baseURL = 'ftp://yahoo.com?asdf';
            expect(yUrlResolver('//hk.yahoo.com?xyz', baseURL)).to.eql('ftp://hk.yahoo.com/?xyz');
            expect(yUrlResolver('ftp://yahoo.com/?xyz', baseURL)).to.eql('ftp://yahoo.com/?xyz');
            expect(yUrlResolver('http://www.yahoo.com/', baseURL)).to.eql('http://www.yahoo.com/');
            expect(yUrlResolver('mailto:abc@xyz.org', baseURL)).to.eql('mailto:abc@xyz.org');
            expect(yUrlResolver('#abc', baseURL)).to.eql('#abc');
            expect(yUrlResolver('hello/world.html', baseURL)).to.eql('ftp://yahoo.com/hello/world.html');
            expect(yUrlResolver('/hello/world.html', baseURL)).to.eql('ftp://yahoo.com/hello/world.html');

            var baseURL = 'mailto:qwer@xyz.org';
            expect(yUrlResolver('//hk.yahoo.com?xyz', baseURL)).to.eql('//hk.yahoo.com/?xyz');
            expect(yUrlResolver('ftp://yahoo.com/?xyz', baseURL)).to.eql('ftp://yahoo.com/?xyz');
            expect(yUrlResolver('http://www.yahoo.com/', baseURL)).to.eql('http://www.yahoo.com/');
            expect(yUrlResolver('mailto:abc@xyz.org', baseURL)).to.eql('mailto:abc@xyz.org');
            expect(yUrlResolver('cid:1:xyz', baseURL)).to.eql('cid:1:xyz');
            expect(yUrlResolver('#abc', baseURL)).to.eql('#abc');
            expect(yUrlResolver('hello/world.html', baseURL)).to.eql('hello/world.html');
            expect(yUrlResolver('/hello/world.html', baseURL)).to.eql('/hello/world.html');

            var baseURL = 'cid:2:';
            expect(yUrlResolver('//hk.yahoo.com?xyz', baseURL)).to.eql('//hk.yahoo.com/?xyz');
            expect(yUrlResolver('ftp://yahoo.com/?xyz', baseURL)).to.eql('ftp://yahoo.com/?xyz');
            expect(yUrlResolver('http://www.yahoo.com/', baseURL)).to.eql('http://www.yahoo.com/');
            expect(yUrlResolver('mailto:abc@xyz.org', baseURL)).to.eql('mailto:abc@xyz.org');
            expect(yUrlResolver('cid:1:xyz', baseURL)).to.eql('cid:1:xyz');
            expect(yUrlResolver('#abc', baseURL)).to.eql('#abc');
            expect(yUrlResolver('hello/world.html', baseURL)).to.eql('cid:2:hello/world.html');
            expect(yUrlResolver('/hello/world.html', baseURL)).to.eql('cid:2:/hello/world.html');
        });

    });
}());
