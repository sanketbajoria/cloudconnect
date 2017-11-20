const gulp = require('gulp');
const concat = require('gulp-concat');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const jetpack = require('fs-jetpack');
const bundle = require('./bundle');
const utils = require('./utils');
const sass = require('gulp-sass');
const projectDir = jetpack;
const srcDir = jetpack.cwd('./src');
const destDir = jetpack.cwd('./target');
const fs = require('fs-extra');
const autoprefixer = require('gulp-autoprefixer');

gulp.task('bundle', () => {
  return Promise.all([
    bundle(srcDir.path('background.js'), destDir.path('background.js')),
    bundle(srcDir.path('app.js'), destDir.path('app.js')),
  ]);
});

gulp.task('js', () => {
  return gulp.src(srcDir.path('./app/**/*.js'))
  .pipe(gulp.dest(destDir.path('./')));
});

gulp.task('images', () => {
  return gulp.src(srcDir.path('./images/**'))
  .pipe(gulp.dest(destDir.path('./images/')));
});

gulp.task('icons', () => {
  return gulp.src(srcDir.path('./icons/**'))
  .pipe(gulp.dest(destDir.path('./icons/')));
}); 

gulp.task('css', () => {
  return gulp.src(srcDir.path('./app/**/*.scss'))
  .pipe(plumber())
  .pipe(sass())
  .pipe(autoprefixer({
    browsers: ['last 2 versions'],
    cascade: false
  }))
  .pipe(gulp.dest(destDir.path('./')));
});

gulp.task('html', () => {
  return gulp.src(srcDir.path('./app/**/*.html'))
  .pipe(gulp.dest(destDir.path('./')));
});

gulp.task('environment', () => {
  const envFile = `config/env_${utils.getEnvName()}.json`;
  projectDir.copy(envFile, destDir.path('env.json'), { overwrite: true });
  gulp.src(['config/*.json', '!config/env*.json']).pipe(gulp.dest(destDir.path('./')));
});

gulp.task('watch', () => {
  const beepOnError = (done) => {
    return (err) => {
      if (err) {
        utils.beepSound();  
      }
      done(err);
    };
  };

  watch(['src/**/*.js', '!src/app/**/*.js'], batch((events, done) => {
    gulp.start('bundle', beepOnError(done));
  }));
  watch('src/**/*.scss', batch((events, done) => {
    gulp.start('css', beepOnError(done));
  }));
  watch('src/**/*.html', batch((events, done) => {
    gulp.start('html', beepOnError(done));
  }));
  watch('src/app/**/*.js', batch((events, done) => {
    gulp.start('js', beepOnError(done));
  }));
});

gulp.task('clean', () => {
  fs.removeSync('target');
});

gulp.task('build', ['bundle', 'css', 'js', 'html', 'environment', 'images', 'icons']);

