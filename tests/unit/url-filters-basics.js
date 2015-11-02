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

    describe("urlFilterFactory tests", function() {

        it('urlFilterFactory exists', function() {
            expect(urlFilterFactory).to.be.ok();
        });

        it('invalid scheme', function() {
            expect(function() {
                urlFilterFactory({schemes:['!!']});
            }).to.throwException();

            // it does not check whether unsafe schemes are used
            // expect(function() {
            //     urlFilterFactory({schemes:['javascript']});
            // }).to.throwException();
            // expect(function() {
            //     urlFilterFactory({schemes:['vbscript']});
            // }).to.throwException();
            // expect(function() {
            //     urlFilterFactory({schemes:['data']});
            // }).to.throwException();

            // expect(function() {
            //     urlFilterFactory({schemes:['https', 'javascript']});
            // }).to.throwException();
        });

        it('invalid host', function() {
            expect(function() {
                urlFilterFactory({hostnames:['yahoo.com:88']});
            }).to.throwException();
        });

        it('removal of leading whitespaces - positive samples', function() {
            [
                '\t\nhttp:www.yahoo.com',
                '\rhttp://www.yahoo.com',
                '\x00\x03\x20http://www.yahoo.com'
            ].forEach(function(url) {
                expect(urlFilterFactory()(url)).to.eql(url.replace(/^[\x00-\x20]*/, ''));
            });
        });

        it('removal of leading whitespaces - negative samples', function() {
            [
                '\t\nftp:www.yahoo.com',
                '\rjavascript:alert(1)',
                '\x00\x03\x20mailto:test@yahoo.com'
            ].forEach(function(url) {
                expect(urlFilterFactory()(url)).to.eql('unsafe:' + url.replace(/^[\x00-\x20]*/, ''));
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
            'http://www.yahoo.com&colon;80',        //safe but html encoded link
            'http://example.666.com',               //safe but dubious link
            'http://example.com/666.com',           //safe but dubious link
            'http://6666.com',                      //safe but dubious link
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
            'http&colon;//www.yahoo.com',           // absolute url but require html decoding
            '#a',                                   // relative url, hash
            'img.png',                              // relative url
            '../asdf',
            './asdf',
            '://www.yahoo.com'
        ];


        (function() {
            var yuwl = urlFilterFactory();
            var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

            it('default - check http and https protocol only - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });

            it('default - check http and https protocol only - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();

        (function() {
            var yuwl = urlFilterFactory({relScheme: true});
            var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

            it('default + relScheme - allow relative scheme - positive samples', function() {
                p.push('//www.yahoo.com');

                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + relScheme - allow relative scheme - negative samples', function() {
                n.splice(n.indexOf('//www.yahoo.com'));

                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();

        (function() {
            var yuwl = urlFilterFactory({relPath: true});
            var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

            // move the last 5 relative path elements from n to p
            Array.prototype.push.apply(p, n.slice(n.length - 5));
            n = n.slice(0, n.length - 5);

            // 'http&colon;//www.yahoo.com' is considered as a relative path without html decode
            // move 'http&colon;//www.yahoo.com' from n to p
            p.push('http&colon;//www.yahoo.com');
            n.splice(n.indexOf('http&colon;//www.yahoo.com'));

            it('default + relPath - allow relative path - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + relPath - allow relative path - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();

        (function() {
            var yuwl = urlFilterFactory({relPathOnly: true});
            var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

            // only the last 5 in n can match relPath (i.e., proper inputs)
            var positive_ = n.slice(n.length - 5);
            n = p.concat(n.slice(0, n.length - 5));
            p = positive_;

            it('default + relPathOnly + htmlDecode - allow relative path ONLY after html decode - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(_privFilters.yHtmlDecode(url))).to.eql(_privFilters.yHtmlDecode(url));
                });
            });
            it('default + relPathOnly + htmlDecode - allow relative path ONLY after html decode - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(_privFilters.yHtmlDecode(url))).to.eql('unsafe:' + _privFilters.yHtmlDecode(url));
                });
            });
        })();

        (function() {
            var yuwl = urlFilterFactory({relPathOnly: true});
            var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

            // only the last 5 in n can match relPath (i.e., proper inputs)
            var positive_ = n.slice(n.length - 5);
            n = p.concat(n.slice(0, n.length - 5));
            p = positive_;

            // 'http&colon;//www.yahoo.com' is considered as a relative path without html decode
            // move 'http&colon;//www.yahoo.com' from n to p
            p.push('http&colon;//www.yahoo.com');
            n.splice(n.indexOf('http&colon;//www.yahoo.com'));

            it('default + relPathOnly - allow relative path ONLY - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + relPathOnly - allow relative path ONLY - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();

        (function() {
            var yuwl = urlFilterFactory({hostnames: ['666.com']});
            var p = lastPositiveSamples1.slice(), n = lastNegativeSamples1.slice();

            // filter all samples with 666.com first
            var positive_ = [];
            p.forEach(function(url){
                if (url.indexOf('666.com') === -1 || 
                        url === 'http://example.666.com' ||
                        url === 'http://example.com/666.com' ||
                        url === 'http://6666.com') {
                    n.push(url);
                } else {
                    positive_.push(url);
                }
            });
            p = positive_;

            it('default + options.hostnames - allow only 666.com - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + options.hostnames - allow only 666.com - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();




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
            'http://.www.yahoo.com'
        ];
        var lastNegativeSamples2 = [
            'http://www.yahoo.com&colon;80',        //safe but html encoded link
            '//www.yahoo.com',                      // relative protocol
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
            'http&colon;//www.yahoo.com',           // safe but require html decoding
            'http://www.evil.org/img.jpg',          //safe 
            'https://finance.yahoo.com.hk',         //safe 
            'https://finance.yahoo.com.hk/',        //safe 
            'https://finance.yahoo.com.hk?',        //safe 
            'https://finance.yahoo.com.hk:',        //safe 
            'https://finance.yahoo.com.hk#',        //safe 
            'http://example.666.com',               //safe but dubious link
            'http://example.com/666.com',           //safe but dubious link
            'http://6666.com',                      //safe but dubious link
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


        (function() {
            var yuwl = urlFilterFactory({hostnames: ['yahoo.com'], subdomain: true});
            var p = lastPositiveSamples2.slice(), n = lastNegativeSamples2.slice();

            it('default + options.hostnames + options.subdomain - allow (*.)yahoo.com - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + options.hostnames + options.subdomain - allow (*.)yahoo.com - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();

        (function() {
            var yuwl = urlFilterFactory({hostnames: ['yahoo.com'], subdomain: true, relScheme: true});
            var p = lastPositiveSamples2.slice(), n = lastNegativeSamples2.slice();
            
            // move //www.yahoo.com from negative to positive
            n.splice(n.indexOf('//www.yahoo.com'));
            p.push('//www.yahoo.com');

            it('default + options.hostnames + options.subdomain + options.relScheme - allow (*.)yahoo.com - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + options.hostnames + options.subdomain + options.relScheme - allow (*.)yahoo.com - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });
        })();


        (function() {
            var yuwl = urlFilterFactory({hostnames: ['yahoo.com', '137.189.1.1'], subdomain: true});
            var p = lastPositiveSamples2.slice(), n = lastNegativeSamples2.slice();

            p.push('http://137.189.1.1');
            n.splice(n.indexOf('http://137.189.1.1'));

            it('default + options.hostnames + options.subdomain - allow (*.)yahoo.com and 137.189.1.1 - positive samples', function() {
                p.forEach(function(url) {
                    expect(yuwl(url)).to.eql(url);
                });
            });
            it('default + options.hostnames + options.subdomain - allow (*.)yahoo.com and 137.189.1.1 - negative samples', function() {
                n.forEach(function(url) {
                    expect(yuwl(url)).to.eql('unsafe:' + url);
                });
            });

        })();
    });


}());