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

    var YUWL_WARN_HOST_NUMERIC = 1,
        YUWL_WARN_HOST_LOCAL = 2,
        YUWL_WARN_PORT_UNCOMMON = 11,
        YUWL_WARN_HASH_ONLY = 21;

    // this demonstrates how to further condition urlFilterFactory
    var reNumericHost = /^\.?(?:(?:0x[0-9a-f]*|[0-9]+)\.?)*$/i;

    var advConfig = {
        protocols: ['http', 'https', 'mailto', 'cid'], 
        relScheme: true,
        imgDataURIs: true, 
        absCallback: function(url, protocol, authority, host, port, path) {
            var httpProtocol = protocol === 'https' ? 1 : protocol === 'http' ? 2 : 0;

            if (port && ((httpProtocol === 1 && port !== '443') || (httpProtocol === 2 && port !== '80'))) {
                return YUWL_WARN_PORT_UNCOMMON;
            }

            if (httpProtocol) {
                if (reNumericHost.test(host)) {
                    return YUWL_WARN_HOST_NUMERIC;
                }
                if (host.indexOf('.') === -1) {
                    return YUWL_WARN_HOST_LOCAL;
                }
            }

            return url;
        },
        relPath: true,
        relCallback: function(url) {
            return (url.indexOf('#') === 0) ? YUWL_WARN_HASH_ONLY : url;
        }
    };

    describe("urlFilterFactory with warnings tests", function() {
        var yuwl = urlFilterFactory(advConfig);

        it('positive protocol samples', function() {
            [
                '//www.yahoo.com',                      // relative protocol
                'http://www.evil.org/img.jpg',
                'https://www.yahoo.com',
                'https://www.yahoo.com/',
                'http://www.yahoo.com/', 
                'http://www.yahoo.com/subdir/foo.html',           
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
                'cid:1234567:111',
                'cid:2:subdir/foo.html',
                'cid:2:/subdir/foo.html',
                'mailto:abc@xyz.org',
                'data:image/jpeg;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
                'data:image/png;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=',
                'data:image/gif;base64,abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+='
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });
        });

        it('negative protocol samples', function() {
            expect(yuwl('javascript:evil();')).to.eql('unsafe:javascript:evil();');
        });
        
        it('positive absCallback samples', function() {
            [
                "http://www.yahoo.com/foo",             // no port specified
                "https://www.yahoo.com/foo",            // no port specified
                "http://www.yahoo.com:80/foo",          // safe port
                "https://www.yahoo.com:443/foo",        // safe port
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
                'http://0x127981foo.com'                //safe but dubious hex link
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(url);
            });
        });

        it('negative absCallback samples - port check', function() {
            [
                "http://www.yahoo.com:35/foo",      // dangerous port
                "http://www.yahoo.com:443/foo",     // dangerous port
                "https://www.yahoo.com:35/foo",     // dangerous port
                "https://www.yahoo.com:80/foo"      // dangerous port
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(YUWL_WARN_PORT_UNCOMMON);
            });
        });

        it('negative absCallback samples - numeric hosts', function() {
            [
                "http://127.0.0.1",                 // dangerous link
                "http://127.0.0.1/foo",             // dangerous link
                "http://127.0.0.1?foo",             // dangerous link with args
                "http://127.0.0.1:80",              // dangerous link with ports
                "http://127.0.0.1./foo",            // dangerous link with trailing dot
                "http://.127.0.0.1/foo",            // dangerous link with leading
                "http://12798120",                  // dangerous decimal link
                "http://12798120/foo",              // dangerous decimal link
                "http://12798120?foo",              // dangerous decimal link
                "http://12798120:80",               // dangerous decimal link
                "http://0x43.0x19.0x18.0x11",       // dangerous hex link
                "http://0x43.0x19.0x18.0x11/foo",   // dangerous hex link
                "http://0x43.0x19.0x18.0x11?foo",   // dangerous hex link with args
                "http://0x43.0x19.0x18.0x11:80",    // dangerous hex link with port
                "http://127.0x4319.0x18",           // dangerous mixed link
                "http://127.0x4319.0x18/foo",       // dangerous mixed link
                "http://127.0x4319.0x18?foo",       // dangerous mixed link with args
                "http://127.0x4319.0x18:80"         // dangerous mixed link with port
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(YUWL_WARN_HOST_NUMERIC);
            });
        });

        it('negative absCallback samples - dubious hosts', function() {
            [
                "http://localhost",                 
                "http://localhost/foo",             
                "http://localhost?foo",             
                "http://localhost:80",              
                "http://somewhere",                 
                "http://somewhere/foo",             
                "http://somewhere?foo",             
                "http://somewhere:80",              
                "http://somewhere#foo",             
                "http://somewhere\\foo",            
                'http://foo"onload="alert(0)'       
                
            ].forEach(function(url) {
                expect(yuwl(url)).to.eql(YUWL_WARN_HOST_LOCAL);
            });
        });


        it('positive relPath samples', function() {
            expect(yuwl('img.png')).to.eql('img.png');
        });


        it('positive relCallback samples - hash', function() {
            expect(yuwl("somewhere#a")).to.eql("somewhere#a");
        });

        it('negative relCallback samples - hash', function() {
            expect(yuwl("#a")).to.eql(YUWL_WARN_HASH_ONLY);
        });
        
    });
}());


    // var baseHrefConfig = {
    //     protocols: ['http', 'https', 'mailto', 'cid'], 
    //     relScheme: true,
    //     imgDataURIs: true, 
    //     absCallback: function(url, protocol, authority, host, port, path) {
    //         if (protocol === 'http' || protocol === 'https') {
    //             url = protocol + '://' + host;
    //             port.length && (url += ':' + port);
    //         }
    //         return [advConfig.absCallback(url, protocol, host, port), path];
    //     },
    //     relPath: true,
    //     relCallback: function(url, baseHrefProcessor) {
    //         return (url.indexOf('#') === 0) ? YUWL_WARN_HASH_ONLY : 
    //             baseHrefProcessor ? baseHrefProcessor(url) : url;
    //     }
    // }
    
    // var baseHrefFactory = function(absBaseHref) {
    //     var yuwlBase = urlFilterFactory(baseHrefConfig),
    //         absBaseHrefInfo = yuwlBase(absBaseHref), 
    //         authority = absBaseHrefInfo[0], 
    //         path, lastIndex;

    //     // quit if warning occurred
    //     if (typeof authority === 'number') {
    //         return authority;
    //     }
       
    //     path = absBaseHrefInfo[1];
        

    //     function resolveUrl(relUrl, i, j) {
    //         var I = i, J = j, fromIndex = I + J;
    //         while (relUrl.indexOf('../', fromIndex) === fromIndex) {
    //             I += 3;
    //             fromIndex += 3;
    //         }
    //         while (relUrl.indexOf('./', fromIndex) === fromIndex) {
    //             J += 2;
    //             fromIndex += 2;
    //         }
    //         return (I > i || J > j) ? resolveUrl(relUrl, I, J) : [I, J];
    //     }
        

    //     return function(relUrl) {
    //         if (relUrl.indexOf('/') === 0) {  // rooted
    //             return authority + relUrl;
    //         }
            
    //         // handle ../ and ./
    //         var ijPos = resolveUrl(relUrl, 0, 0),
    //             i = ijPos[0],
    //             j = ijPos[1];
    //         if (i > 0 || j > 0) {
    //             relUrl = relUrl.slice(i + j);
    //         }

    //         // the following runs at least once to resolve the 
    //         i = Math.min(i / 3, 1);
    //         lastIndex = path.indexOf('#') + 1;
    //         while (i-- >= 0) {
    //             lastIndex = path.lastIndexOf('/', lastIndex - 1);
    //         }

    //         // if there's a slash not following a hash 
    //         if (lastIndex !== -1) {
    //             // remove anything beyond the last slash
    //             path = path.slice(0, lastIndex);
    //         }

    //         return authority + path + relUrl;
    //     }
    // };

