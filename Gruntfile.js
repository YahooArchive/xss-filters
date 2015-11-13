/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['src/*.js'],
      options: {
        scripturl: true,
        camelcase: true,
        unused: true,
        curly: true,
        node: true
      }
    },
    jsdoc : {
      dist : {
        src: ['README.md', 'src/<%= pkg.name %>.js'], 
        options: {
          destination: 'dist/docs',
          template : 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
          configure : 'jsdoc.conf.json'
        }
      }
    },
    browserify: {
      standalone: {
        src: [ 'src/index-node.js' ],
        dest: 'dist/<%= pkg.name %>.js',
        options: {
          browserifyOptions: {
            standalone: 'xssFilters'
          }
        }
      }
    },
    uglify: {
      options: {
        banner: '/**\n'
              + ' * <%= pkg.name %> - v<%= pkg.version %>\n'
              + ' * Yahoo! Inc. Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.\n'
              + ' */\n',
        compress: {
          join_vars: true
        }
      },
      // buildBrowserified: {
      //   src: 'dist/<%= pkg.name %>.js',
      //   dest: 'dist/<%= pkg.name %>.min-browserified.js'
      // },
      buildUrlOnly: {
        options: {
          wrap: 'urlFilters'
        },
        src: [
          'src/lib/hostParser.js',
          'src/lib/urlFilters.js',
          'src/lib/urlResolver.js'],
        dest: 'dist/url-filters-only.min.<%= pkg.version %>.js'
      },
      buildXssOnly: {
        options: {
          wrap: 'xssFilters'
        },
        src: [
          'src/index-browser.js', 
          'src/lib/htmlDecode.js', 
          'src/lib/xssFilters.priv.js', 
          'src/lib/xssFilters.js'
        ],
        dest: 'dist/xss-filters.min.<%= pkg.version %>.js'
      },
      buildMin: {
        options: {
          wrap: 'xssFilters'
        },
        src: [
          'src/index-browser.js', 
          'src/lib/hostParser.js',
          'src/lib/urlFilters.js',
          'src/lib/urlResolver.js',
          'src/lib/htmlDecode.js', 
          'src/lib/xssFilters.priv.js', 
          'src/lib/xssFilters.js'
        ],
        dest: 'dist/all-filters.min.js'
      },
      buildMinWithVersion: {
        options: {
          wrap: 'xssFilters'
        },
        src: [
          'src/index-browser.js', 
          'src/lib/hostParser.js',
          'src/lib/urlFilters.js',
          'src/lib/urlResolver.js',
          'src/lib/htmlDecode.js', 
          'src/lib/xssFilters.priv.js', 
          'src/lib/xssFilters.js'
        ],
        dest: 'dist/all-filters.min.<%= pkg.version %>.js'
      }
    },
    mocha_istanbul: {
      coverage: {
        src: 'tests/node-unit-tests.js',
        options: {
          coverageFolder: 'artifacts/test/coverage',
          check: {
            lines: 80,
            statements: 80
          },
          timeout: 10000
        }
      }
    },
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      ci: {
        
      },
      dev: {
        reporters: 'dots',
        browsers: ['Chrome']
      }
    },
    clean: {
      all: ['artifacts', 'node_modules', 'bower_components']
    }
  });

  grunt.loadNpmTasks('grunt-mocha-istanbul');
  // grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-karma');


  var testSet = ['jshint', 'mocha_istanbul'];

  if (process.env.TRAVIS && process.env.TRAVIS_NODE_VERSION === '0.12')
    testSet.push('dist', 'karma:ci');

  grunt.registerTask('test', testSet);
  // grunt.registerTask('dist', ['browserify', 'uglify'])
  grunt.registerTask('dist', 'uglify')
  grunt.registerTask('docs', ['jsdoc']);
  grunt.registerTask('default', ['test', 'dist']);

};
