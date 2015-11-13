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
    var urlFilters = xssFilters.urlFilters;

    describe("hostParser tests", function() {


        (function() {
            it('hostParser exists', function() {
                expect(urlFilters.hostParser).to.be.ok();
            });

            it('invalid ipv6 host', function() {
                expect(urlFilters.hostParser('[1:2:3:4:5:6:7:8')).to.eql(null);
            });
        })();


        var domains = [
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
            'http://12798120-foo.com',              //safe but dubious decimal link
            'http://0x127981foo.com',               //safe but dubious hex link
            'http://foo"onload="alert(0)',          //safe but dubious link *1
            'http:www.yahoo.com',
            'http:\\\\www.yahoo.com',
            'http:/\\/\\www.yahoo.com',
            'http://///www.yahoo.com',
            'http://.www.yahoo.com',
            'http://www.yahoo.com.',
        ];


        var ipv4_Positive = [
            'http://137.189.1.1.',
            'http://137.189.1.1',
            'http://137.189.1',
            'http://137.2560',
            'http://2560/',
            'http://4294967295/',
            'http://0x1010/',
            'http://9.077.03.0x2/'
        ];

        var ipv4_like_domains = [
            'http://137.189.1.1.2',
            'http://9.079.03.0x2/',
            'http://9.077.03.0x3H/',
            'http://notIP.137.189.1.1',
            'http://0x43.0.0x11.com',               //safe but dubious link
            'http://0x43.0.0x11.com/',              //safe but dubious link
            'http://0x43.0.0x11.com?foo',           //safe but dubious link with args
            'http://0x43.0.0x11.com:80',            //safe but dubious link with ports
        ];

        var ipv4_Negative = [
            'http://137.189.1.256',
            'http://137.189.256.1',
            'http://137.256.1.1',
            'http://256.1.1.1',
            'http://999.077.03.0x2/',
            'http://4294967296/'
        ];



        var ipv6_Positive = [
            'http://[2405:3000:3:6::1]',
            'http://[1:2:3:4:5:6:7:8]',
            'http://[1:2:3:4:5:6:7::]',
            'http://[::1:2:3:4:5:6:7]',
            'http://[1:2:3:4::6:7:8]',
            'http://[1:2:3:4:5:6:123.123.123.123]', 
            'http://[1:2:3:4:5::123.123.123.123]',
            'http://[1:2:3:4::6:123.123.123.123]',
            'http://[1:2:3::5:6:123.123.123.123]',
            'http://[1:2::4:5:6:123.123.123.123]',
            'http://[1::3:4:5:6:123.123.123.123]',
            'http://[::2:3:4:5:6:123.123.123.123]',
            'http://[1:2:3:4::123.123.123.123]',
            'http://[::123.123.123.123]',
            'http://[1::8]',
            'http://[::8]',
            'http://[1::]',
            'http://[::]',
            'http://[1:2:3::6:7:8]',
            'http://[1:2:3:4:5:6:12345.]'
        ];

        var ipv6_Negative = [
            'http://[1:2:3:4:5:6:7:8/',
            'http://[1:2:3:4:5:6::8/',
            'http://[1:2:3:4:5:6:7:8:9:123.123.123.123]',
            'http://[1:2:3:4:5:6:7:8:123.123.123.123]',
            'http://[1:2:3:4:5:6:7:123.123.123.123]',
            'http://[1:2:3:4:5:6::123.123.123.123]',
            'http://[1:2:3:4:5:6:7:8:9]',
            'http://[1:2:3:4:5:6:7:8::]',
            'http://[1:2:3:4:5:6:7:8:]',
            'http://[::2:3:4:5:6:7:123.123.123.123]',
            'http://[::2:3:4:5:6:7:8:123.123.123.123]',
            'http://[:1:2:3:4:5:6:7:8]',
            'http://[:1:2:3:4:5:6:7:]',
            'http://[1:2:3:4:5:6:7::8]',
            'http://[1:2:3:4:5:6:::8]',
            'http://[:1:2:]',
            'http://[:1:2]',
            'http://[1:2:]',
            'http://[:::]',
            'http://[::::]',
            'http://[::1::]',
            'http://[1:::]',
            'http://[:::2]',
            'http://[123.123.123.123]',
            'http://[::12345]',
            'http://[1:2:3:4:5:6:12345]'
        ];



        (function() {
            var yuwl = urlFilters.create({
                parseHost: true, 
                absCallback: function(url, scheme, auth, host, port, path, extra) {
                    return extra;
                }, 
                unsafeCallback: function(url) {
                    return null;
                }
            });

            it('check domains', function() {
                domains.forEach(function(url) {
                    expect(yuwl(url)).to.have.property('domain');
                });
                ipv4_like_domains.forEach(function(url) {
                    expect(yuwl(url)).to.have.property('domain');
                });
            });

            it('check valid ipv4', function() {
                ipv4_Positive.forEach(function(url) {
                    expect(yuwl(url)).to.have.property('ipv4');
                });
            });
            it('check invalid ipv4', function() {
                ipv4_Negative.forEach(function(url) {
                    expect(yuwl(url)).to.eql(null);
                });
                ipv4_like_domains.forEach(function(url) {
                    expect(yuwl(url)).not.to.have.property('ipv4');
                });
            });


            it('check valid ipv6', function() {
                ipv6_Positive.forEach(function(url) {
                    expect(yuwl(url)).to.have.property('ipv6');
                });
            });
            it('check invalid ipv6', function() {
                ipv6_Negative.forEach(function(url) {
                    expect(yuwl(url)).to.eql(null);
                });
            });
        })();



        (function() {
            var yuwl = urlFilters.create({
                hostnames: [
                    '[1:2:3:4:5:6:7::]', 
                    '[::1:2:3:4:5:6:7]', 
                    '[::2:3:4:5:6:7]', 
                    '[1:2:3:4:5:6:123.123.123.123]',
                    '2.153.207.181', 
                    '123456',
                    'yahoo.com'],
                parseHost: true, 
                absCallback: function(url, scheme, auth, host, port, path, extra) {
                    return extra;
                }, 
                unsafeCallback: function(url) {
                    return null;
                }
            });

            it('hostname matching (without subdomain)', function() {
                [
                    'http://[1:2:3:4:5:6:7::]', 'http://[1:2:3:4:5:6:7:0]', 'http://[1:2:3:4:5:6:0.7.0]', 'http://[1:2:3:4:5:6:0.7.0x]',
                    'http://[::1:2:3:4:5:6:7]', 'http://[0:1:2:3:4:5:6:7]', 'http://%5B0:1:2:3:4%3a5:6:7]',
                    'http://[::2:3:4:5:6:7]',
                    'http://[1:2:3:4:5:6:123.123.123.123]', 'http://[1:2:3:4:5:6:7b7b:7b7b]', 
                    'http://2.153.207.181', 'http://43634613',
                    'http://123456', 'http://0.1.226.64', 'http://0.1%2e226.64',
                    'http://YaHOO.com', 'http://YaHOO%2Ecom'
                ].forEach(function(url) {
                    // console.log(url, yuwl(url));
                    expect(yuwl(url)).not.eql(null);
                });
            });

        })();


        (function() {
            var yuwl = urlFilters.create({
                hostnames: [
                    '[1:2:3:4:5:6:7::]', 
                    '[::1:2:3:4:5:6:7]', 
                    '[::2:3:4:5:6:7]', 
                    '[1:2:3:4:5:6:123.123.123.123]',
                    '2.153.207.181', 
                    '123456',
                    'yahoo.com'],
                subdomain: true,
                parseHost: true, 
                absCallback: function(url, scheme, auth, host, port, path, extra) {
                    return extra;
                }, 
                unsafeCallback: function(url) {
                    return null;
                }
            });

            it('hostname matching (without subdomain)', function() {
                [
                    'http://[1:2:3:4:5:6:7::]', 'http://[1:2:3:4:5:6:7:0]', 'http://[1:2:3:4:5:6:0.7.0]', 'http://[1:2:3:4:5:6:0.7.0x]',
                    'http://[::1:2:3:4:5:6:7]', 'http://[0:1:2:3:4:5:6:7]', 'http://%5B0:1:2:3:4%3a5:6:7]',
                    'http://[::2:3:4:5:6:7]',
                    'http://[1:2:3:4:5:6:123.123.123.123]', 'http://[1:2:3:4:5:6:7b7b:7b7b]', 
                    'http://2.153.207.181', 'http://43634613',
                    'http://123456', 'http://0.1.226.64', 'http://0.1%2e226.64',
                    'http://YaHOO.com', 'http://YaHOO%2Ecom', 'http://www.yahoo.com'
                ].forEach(function(url) {
                    // console.log(url, yuwl(url));
                    expect(yuwl(url)).not.eql(null);
                });
            });

        })();

    });


}());