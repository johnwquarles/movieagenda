var LIVERELOAD_PORT = 35729;

module.exports = function(grunt) {

  // grunt.loadNpmTasks('grunt-contrib-clean');
  // grunt.loadNpmTasks('grunt-contrib-copy');
  // grunt.loadNpmTasks('grunt-contrib-jade');
  // grunt.loadNpmTasks('grunt-babel');
  // grunt.loadNpmTasks('grunt-sass');

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    autoprefixer: {
    	main: {
        options: ['>1% in US'],
        src: 'public/css/main.css'
    	}
    },
    babel: {
      dev: {
        options: {
          sourceMap: 'inline'
        },
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.js'],
            dest: 'public/'
          }
        ]
      },
      prod: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.js'],
            dest: 'public/'
          }
        ]
      }
    },
    bower_concat: {
      main: {
      	dest: 'public/lib/build.js',
      	cssDest: 'public/lib/build.css'
      }
    },
    clean: ['public'],
    connect: {
	    main: {
	      options: {
	        port: 8080,
	        base: 'public/',
	        open: true,
	        livereload: LIVERELOAD_PORT
	      }
	    }
	  },
    copy: {
      main: {
        files: [
          {
          	// copy over everything that the
          	// preprocessor tasks won't.
            expand: true,
            cwd: 'src/',
            src: [
              '**',
              '!**/*.jade',
              '!**/*.scss',
              '!**/*.js'
            ],
            dest: 'public/',
            filter: 'isFile'
          }
        ]
      }
    },
    cssmin: {
      main: {
        files: {
          'public/lib/build.css': 'public/lib/build.css'
        }
      }
    },
    jade: {
      dev: {
        options: {
          pretty: true
        },
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.jade', '!**/_*.jade'],
            dest: 'public/',
            ext: '.html'
          }
        ]
      },
      prod: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.jade', '!**/_*.jade'],
            dest: 'public/',
            ext: '.html'
          }
        ]
      }
    },
    sass: {
    	prod: {
    		options: {
    			outputStyle: 'compressed',
    		},
    		files: {
    			'public/css/main.css': 'src/_styles/main.scss'
    		}
    	},
    	dev: {
    		files: {
    			'public/css/main.css': 'src/_styles/main.scss'
    		},
    		options: {
    		  sourceMap: true,
    		  sourceMapEmbed: true
    		}
    	}
    },
    uglify: {
    	bower: {
    		files: {
    			'public/lib/build.js': 'public/lib/build.js'
    		}
    	},
    	main: {
    		files: [
    		{
    			expand: true,
    			cwd: 'public/',
    			src: ['**/*.js'],
    			dest: 'public/'
    		}]
    	}
    },
    watch: {
    	livereload: {
    		options: {
    			livereload: LIVERELOAD_PORT,
    		},
    		files: [
          'public/css/main.css',
          'public/js/**/*.js',
          'public/**/*.html'
    		]
    	},
    	sass: {
    		files: ['src/**/*.scss'],
    		tasks: ['sass:dev']
    	},
    	jade: {
    		files: ['src/**/*.jade'],
    		tasks: ['jade:dev']
    	},
    	babel: {
    		files: ['src/js/**/*.js'],
    		tasks: ['babel:dev']
    	}
    }
  });

  grunt.registerTask('default', []);
  grunt.registerTask('build', [
    'clean',
    'copy',
    'babel:prod',
    'bower_concat',
    'jade:prod',
    'sass:prod',
    'autoprefixer',
    'uglify',
    'cssmin'
  ]);
  grunt.registerTask('build-dev', [
    'clean',
    'copy',
    'babel:dev',
    'bower_concat',
    'jade:dev',
    'sass:dev',
    'autoprefixer'
  ]);

  grunt.registerTask('serve', [
    'build-dev',
    'connect',
    'watch'
  ]);

};
