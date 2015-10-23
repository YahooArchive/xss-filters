/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
(function() {

    var urlFilterFactory = xssFilters._privFilters.urlFilterFactory;

    describe("urlFilterFactory: existence tests", function() {

        it('urlFilterFactory exists', function() {
            expect(urlFilterFactory).to.be.ok();
        });
        
    });

    var lastPositiveSamples1 = [
        'http://www.evil.org/img.jpg',          //safe 
        'https://yahoo.com',                    //safe 
        'https://hk.finance.yahoo.com',         //safe 
        'https://finance.yahoo.com.hk',         //safe 
        'https://finance.yahoo.com.hk/',        //safe 
        'https://finance.yahoo.com.hk?',        //safe 
        'https://finance.yahoo.com.hk:',        //safe 
        'https://finance.yahoo.com.hk#',        //safe 
        'https://www.yahoo.com',                //safe 
        'https://www.yahoo.com/',               //safe 
        'http://www.yahoo.com/',                //safe
        'http://www.yahoo.com/subdir/foo.html', //safe
        'http://666.com',                       //safe but dubious link
        'http://666.com/foo',                   //safe but dubious link
        'http://666.com?foo',                   //safe but dubious link with args
        'http://666.com:80',                    //safe but dubious link with ports
        'http://666.com#foo',                   //safe but dubious link with hash
        'http://666.com\\foo',                  //safe but dubious link with backslash
        'http://127.0.0.1.com',                 //safe but dubious link
        'http://127.0.0.1.com/',                //safe but dubious link
        'http://127.0.0.1.com?foo',             //safe but dubious link with args
        'http://127.0.0.1.com:80',              //safe but dubious link with ports
        'http://0x43.0.0x11.com',               //safe but dubious link
        'http://0x43.0.0x11.com/',              //safe but dubious link
        'http://0x43.0.0x11.com?foo',           //safe but dubious link with args
        'http://0x43.0.0x11.com:80',            //safe but dubious link with ports
        'http://12798120-foo.com',              //safe but dubious decimal link
        'http://0x127981foo.com',               //safe but dubious hex link
        'http://foo"onload="alert(0)',          //safe but dubious link *1
        'http:www.yahoo.com',
        'http:\\\\www.yahoo.com',
        'http:/\\/\\www.yahoo.com',
        'http://///www.yahoo.com',
        'http://.www.yahoo.com',
        'http://www.yahoo.com.',
        'http://[2405:3000:3:6::1]',
        'http://notIP.137.189.1.1',
        'http://137.189.1.1'
    ];
    var lastNegativeSamples1 = [
        '//www.yahoo.com',                      // relative protocol
        'javascript:evil();',
        'cid:1234567:111',
        'cid:2:subdir/foo.html',
        'cid:2:/subdir/foo.html',
        'mailto:abc@xyz.org',
        'data:image/jpeg;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
        'data:image/png;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
        'data:image/gif;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
        'h\tttp:www.yahoo.com',
        'h\rt\np:www.yahoo.com',
        'h\rt\np://www.yahoo.com',
        '#a',                                   // relative url, hash
        'img.png',                              // relative url
        '../asdf',
        './asdf',
        '://www.yahoo.com'
    ];

    describe("urlFilterFactory: default - check http and https protocol only", function() {
        var yuwl = urlFilterFactory();
        var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

        it('positive samples', function() {
            p.forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });

            [
                '\t\nhttp:www.yahoo.com',
                '\rhttp://www.yahoo.com',
                '\x00\x03\x20http://www.yahoo.com'
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(url.replace(/^[\x00-\x20]*/, ''));
            });
        });

        it('negative samples', function() {
            n.forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });
        });
    });


    describe("urlFilterFactory: default + relScheme - allow relative scheme", function() {
        var yuwl = urlFilterFactory({relScheme: true});
        var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

        it('positive samples', function() {
            p.push('//www.yahoo.com');

            p.forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });

            [
                '\t\nhttp:www.yahoo.com',
                '\rhttp://www.yahoo.com',
                '\x00\x03\x20http://www.yahoo.com'
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(url.replace(/^[\x00-\x20]*/, ''));
            });
        });

        it('negative samples', function() {
            n.splice(n.indexOf('//www.yahoo.com'));

            n.forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });
        });

    });



    describe("urlFilterFactory: default + relPath - allow relative path", function() {
        var yuwl = urlFilterFactory({relPath: true});
        var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

        // move the last 5 relative path elements from n to p
        Array.prototype.push.apply(p, n.slice(n.length - 5));
        n = n.slice(0, n.length - 5);

        it('positive samples', function() {
            // p.splice(p.indexOf('//www.yahoo.com'));

            p.forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });

            [
                '\t\nhttp:www.yahoo.com',
                '\rhttp://www.yahoo.com',
                '\x00\x03\x20http://www.yahoo.com'
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(url.replace(/^[\x00-\x20]*/, ''));
            });
        });

        it('negative samples', function() {
            // n.splice(n.indexOf('//www.yahoo.com'));

            n.forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });
        });

    });


    describe("urlFilterFactory: default + options.hosts - allow only 666.com", function() {
        var yuwl = urlFilterFactory({hosts: ['666.com']});


        it('positive samples', function() {
            [
                'http://666.com',                       //safe but dubious link
                'http://666.com/foo',                   //safe but dubious link
                'http://666.com?foo',                   //safe but dubious link with args
                'http://666.com:80',                    //safe but dubious link with ports
                'http://666.com#foo',                   //safe but dubious link with hash
                'http://666.com\\foo',                  //safe but dubious link with backslash
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });

        });

        it('negative samples', function() {
            [
                '//www.yahoo.com',                      // relative protocol
                'javascript:evil();',
                'cid:1234567:111',
                'cid:2:subdir/foo.html',
                'cid:2:/subdir/foo.html',
                'mailto:abc@xyz.org',
                'data:image/jpeg;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
                'data:image/png;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
                'data:image/gif;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
                'h\tttp:www.yahoo.com',
                'h\rt\np:www.yahoo.com',
                'h\rt\np://www.yahoo.com',

                'http://www.evil.org/img.jpg',          //safe 
                'https://yahoo.com',                    //safe 
                'https://hk.finance.yahoo.com',         //safe 
                'https://finance.yahoo.com.hk',         //safe 
                'https://finance.yahoo.com.hk/',        //safe 
                'https://finance.yahoo.com.hk?',        //safe 
                'https://finance.yahoo.com.hk:',        //safe 
                'https://finance.yahoo.com.hk#',        //safe 
                'https://www.yahoo.com',                //safe 
                'https://www.yahoo.com/',               //safe 
                'http://www.yahoo.com/',                //safe
                'http://www.yahoo.com/subdir/foo.html', //safe

                'http://127.0.0.1.com',                 //safe but dubious link
                'http://127.0.0.1.com/',                //safe but dubious link
                'http://127.0.0.1.com?foo',             //safe but dubious link with args
                'http://127.0.0.1.com:80',              //safe but dubious link with ports
                'http://0x43.0.0x11.com',               //safe but dubious link
                'http://0x43.0.0x11.com/',              //safe but dubious link
                'http://0x43.0.0x11.com?foo',           //safe but dubious link with args
                'http://0x43.0.0x11.com:80',            //safe but dubious link with ports
                'http://12798120-foo.com',              //safe but dubious decimal link
                'http://0x127981foo.com',               //safe but dubious hex link
                'http://foo"onload="alert(0)',          //safe but dubious link *1
                'http:www.yahoo.com',
                'http:\\\\www.yahoo.com',
                'http:/\\/\\www.yahoo.com',
                'http://///www.yahoo.com',
                'http://.www.yahoo.com',
                'http://www.yahoo.com.',
                'http://[2405:3000:3:6::1]',
                'http://notIP.137.189.1.1',
                'http://137.189.1.1',
                '#a',                                   // relative url, hash
                'img.png',                              // relative url
                '../asdf',
                './asdf',
                '://www.yahoo.com'
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });

            [
                '\t\nhttp:www.yahoo.com',
                '\rhttp://www.yahoo.com',
                '\x00\x03\x20http://www.yahoo.com'
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url.replace(/^[\x00-\x20]*/, ''));
            });
        });

    });



    var lastPositiveSamples2 = [
        'https://yahoo.com',                    //safe 
        'https://hk.finance.yahoo.com',         //safe 
        
        'https://www.yahoo.com',                //safe 
        'https://www.yahoo.com/',               //safe 
        'http://www.yahoo.com/',                //safe
        'http://www.yahoo.com/subdir/foo.html', //safe

        'http:www.yahoo.com',
        'http:\\\\www.yahoo.com',
        'http:/\\/\\www.yahoo.com',
        'http://///www.yahoo.com',
        'http://.www.yahoo.com',
        '//www.yahoo.com',                      // relative protocol
    ];
    var lastNegativeSamples2 = [
        'http://www.yahoo.com.',
        'http://[2405:3000:3:6::1]',
        'http://notIP.137.189.1.1',
        'http://137.189.1.1',
        'javascript:evil();',
        'cid:1234567:111',
        'cid:2:subdir/foo.html',
        'cid:2:/subdir/foo.html',
        'mailto:abc@xyz.org',
        'data:image/jpeg;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
        'data:image/png;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
        'data:image/gif;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
        'h\tttp:www.yahoo.com',
        'h\rt\np:www.yahoo.com',
        'h\rt\np://www.yahoo.com',
        'http://www.evil.org/img.jpg',          //safe 
        'https://finance.yahoo.com.hk',         //safe 
        'https://finance.yahoo.com.hk/',        //safe 
        'https://finance.yahoo.com.hk?',        //safe 
        'https://finance.yahoo.com.hk:',        //safe 
        'https://finance.yahoo.com.hk#',        //safe 
        'http://666.com',                       //safe but dubious link
        'http://666.com/foo',                   //safe but dubious link
        'http://666.com?foo',                   //safe but dubious link with args
        'http://666.com:80',                    //safe but dubious link with ports
        'http://666.com#foo',                   //safe but dubious link with hash
        'http://666.com\\foo',                  //safe but dubious link with backslash
        'http://127.0.0.1.com',                 //safe but dubious link
        'http://127.0.0.1.com/',                //safe but dubious link
        'http://127.0.0.1.com?foo',             //safe but dubious link with args
        'http://127.0.0.1.com:80',              //safe but dubious link with ports
        'http://0x43.0.0x11.com',               //safe but dubious link
        'http://0x43.0.0x11.com/',              //safe but dubious link
        'http://0x43.0.0x11.com?foo',           //safe but dubious link with args
        'http://0x43.0.0x11.com:80',            //safe but dubious link with ports
        'http://12798120-foo.com',              //safe but dubious decimal link
        'http://0x127981foo.com',               //safe but dubious hex link
        'http://foo"onload="alert(0)',          //safe but dubious link *1
        '#a',                                   // relative url, hash
        'img.png',                              // relative url
        '../asdf',
        './asdf',
        '://www.yahoo.com'
    ];


    describe("urlFilterFactory: default + options.hosts + options.subdomain + options.relScheme - allow (*.)yahoo.com", function() {
        var yuwl = urlFilterFactory({hosts: ['yahoo.com'], subdomain: true, relScheme: true});
        var p = lastPositiveSamples2.slice(), n = lastNegativeSamples2.slice();
        it('positive samples', function() {
            p.forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });
        });
        it('negative samples', function() {
            n.forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });
        });
    });

    describe("urlFilterFactory: default + options.hosts + options.subdomain - allow (*.)yahoo.com", function() {
        var yuwl = urlFilterFactory({hosts: ['yahoo.com'], subdomain: true});
        var p = lastPositiveSamples2.slice(), n = lastNegativeSamples2.slice();
        it('positive samples', function() {
            p.splice(p.indexOf('//www.yahoo.com'));

            p.forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });
        });
        it('negative samples', function() {
            n.push('//www.yahoo.com');

            n.forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });
        });
    });

    describe("urlFilterFactory: default + options.hosts + options.subdomain - allow (*.)yahoo.com and 137.189.1.1", function() {
        var yuwl = urlFilterFactory({hosts: ['yahoo.com', '137.189.1.1'], subdomain: true});
        var p = lastPositiveSamples2.slice(), n = lastNegativeSamples2.slice();
        it('positive samples', function() {
            p.push('http://137.189.1.1');
            p.splice(p.indexOf('//www.yahoo.com'));

            p.forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });
        });
        it('negative samples', function() {
            n.splice(n.indexOf('http://137.189.1.1'));
            n.push('//www.yahoo.com');

            n.forEach(function(url) {
                expect(yuwl(url)).to.eql('unsafe:' + url);
            });
        });

    });


}());
