// ##### Gulp Tasks #####

// ***** Inspired by https://css-tricks.com/gulp-for-beginners/ ***** //

var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var minifyCSS = require('gulp-minify-css');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var del = require('del');
var modernizr = require('gulp-modernizr');
var runSequence = require('run-sequence');
var validateHTML = require('gulp-w3cjs');
var scsslint = require('gulp-scss-lint');
var jshint = require('gulp-jshint');
var lbInclude = require('gulp-lb-include');
var ssi = require('browsersync-ssi');
var sftp = require('gulp-sftp');
var svgstore = require('gulp-svgstore');
var svgmin = require('gulp-svgmin');
var path = require('path');
var postcss = require('gulp-postcss');
var assets = require('postcss-assets');


// Check that gulp is working by running "gulp hello" at the command line:
gulp.task('hello', function() {
  console.log('Hello there!');
});


// Run the dev process by running "gulp" at the command line:
gulp.task('default', function (callback) {
  runSequence(['sass', 'browserSync', 'watch'],
    callback
  )
})


// Run the build process by running "gulp build" at the command line:
gulp.task('build', function (callback) {
  runSequence('clean', 
    ['fonts', 'scss-lint', 'js-lint', 'sass', 'useref', 'images' ],
    callback
  )
})


// Run "gulp modernizr" at the command line to build a custom modernizr file based off of classes found in CSS:
gulp.task('modernizr', function() {
  gulp.src('dev/css/main2.css') // where modernizr will look for classes
    .pipe(modernizr({
      options: ['setClasses'],
      dest: 'dev/js/modernizr-custombuild.js'
    }))
});


// Process sass to css, add sourcemaps, inline font & image files into css, and reload browser:
gulp.task('sass', function() {
  return gulp.src('dev/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(autoprefixer('last 2 versions'))
    .pipe(postcss([assets({
      loadPaths: ['fonts/', 'images/']
    })]))
    .pipe(sourcemaps.write('sourcemaps'))
    .pipe(gulp.dest('dev/css'))
    .pipe(browserSync.reload({
      stream: true
    }));
})


// Watch sass, html, and js and reload browser if any changes:
gulp.task('watch', ['browserSync', 'sass', 'scss-lint', 'js-lint'], function (){
  gulp.watch('dev/scss/**/*.scss', ['sass']);
  gulp.watch('dev/scss/**/*.scss', ['scss-lint']);
  gulp.watch('dev/js/**/*.js', ['js-lint']);
  gulp.watch('dev/**/*.html', browserSync.reload); 
  gulp.watch('dev/js/**/*.js', browserSync.reload); 
});


// Spin up a local browser with the index.html page at http://localhost:3000/
gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: 'dev',
      middleware: ssi({
        baseDir: __dirname + '/dev',
        ext: '.html',
        version: '1.4.0'
      })
    },
  })
})


// Minify and uglify css and js from paths within comment tags in html:
gulp.task('useref', function(){
  return gulp.src(['dev/**/*.html', '!dev/includes/*'])
    .pipe(gulpIf('*.css', minifyCSS())) // Minifies only if it's a CSS file
    .pipe(gulpIf('*.js', uglify())) // Uglifies only if it's a Javascript file
    .pipe(useref())
    .pipe(lbInclude()) // Process <!--#include file="" --> statements
    .pipe(gulp.dest('ui_library'))
});


// Compress images:
gulp.task('images', function(){
  return gulp.src('dev/images/**/*.+(png|jpg|jpeg|gif|svg)')
  .pipe(cache(imagemin({ // Caching images that ran through imagemin
      interlaced: true
    })))
  .pipe(gulp.dest('ui_library/images'))
});


// Copy font files from "dev" directory to "ui_library" directory during build process:
gulp.task('fonts', function() {
  return gulp.src('dev/fonts/**/*')
  .pipe(gulp.dest('ui_library/fonts'))
})


// Delete "ui_library" directory at start of build process:
gulp.task('clean', function(callback) {
  del('ui_library');
  return cache.clearAll(callback);
})

// Validate build HTML:
gulp.task('validateHTML', function () {
  gulp.src('ui_library/**/*.html')
    .pipe(validateHTML())
});

// Lint Sass:
gulp.task('scss-lint', function() {
  return gulp.src(['dev/scss/**/*.scss', '!dev/scss/vendor/**/*.scss'])
    .pipe(scsslint({
      'config': 'scss-lint-config.yml'
    }));
});

// Lint JavaScript:
gulp.task('js-lint', function() {
  return gulp.src(['dev/js/**/*.js', '!dev/js/vendor/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
});

// Deploy a build via SFTP to a web server:
gulp.task('deploy', function () {
  return gulp.src('ui_library/**')
    .pipe(sftp({
      host: 'webprod.cdlib.org',
      remotePath: '/apps/webprod/apache/htdocs/ezid/joel',
      authFile: 'gulp-sftp-key.json', // keep this file out of public repos by listing it within .gitignore, .hgignore, etc.
      auth: 'keyMain'
    }));
});

// Combine SVG files into one and reference them individually within HTML:

gulp.task('svgstore', function () {
  return gulp
    .src('app/images/*.svg')
    .pipe(svgmin(function (file) {
      var prefix = path.basename(file.relative, path.extname(file.relative));
      return {
        plugins: [{
          cleanupIDs: {
            prefix: prefix + '-',
            minify: true
          }
        }]
      }
    }))
    .pipe(svgstore())
    .pipe(gulp.dest('app/images'));
});
