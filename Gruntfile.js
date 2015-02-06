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
        unused: true
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
        src: [ 'src/<%= pkg.name %>.js' ],
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
              + ' */\n'
      },
      build: {
        src: 'dist/<%= pkg.name %>.js',
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    copy: {
      buildFile: {
        files: [
          { dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.min.js', src: 'dist/<%= pkg.name %>.min.js'}
        ]
      }
    },
    mocha_istanbul: {
      coverage: {
        src: 'tests/unit',
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
    clean: {
      all: ['dist', 'artifacts', 'node_modules']
    }
  });

  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('test', ['jshint', 'mocha_istanbul']);
  grunt.registerTask('dist', ['browserify', 'uglify', 'copy:buildFile'])
  grunt.registerTask('docs', ['jsdoc']);
  grunt.registerTask('default', ['test', 'dist']);

};
