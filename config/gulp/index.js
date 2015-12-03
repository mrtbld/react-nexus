import _ from 'lodash';
import babel from 'gulp-babel';
import eslint from 'gulp-eslint';
import gulp from 'gulp';
import mocha from 'gulp-mocha';
import path from 'path';
import plumber from 'gulp-plumber';
import rimraf from 'rimraf';
import sourcemaps from 'gulp-sourcemaps';
import webpack from 'webpack-stream';

import webpackBrowserDev from '../webpack/browser-dev';
import webpackBrowserProd from '../webpack/browser-prod';
import webpackNodeDev from '../webpack/node-dev';
import webpackNodeProd from '../webpack/node-prod';

const webpackConfig = {
  browser: {
    dev: webpackBrowserDev,
    prod: webpackBrowserProd,
  },
  node: {
    dev: webpackNodeDev,
    prod: webpackNodeProd,
  },
};

const PLATFORMS = Object.keys(webpackConfig);
const ENVS = Object.keys(webpackConfig[PLATFORMS[0]]);

const exts = ['js', 'jsx'];
const src = 'src';
const sources = exts.map((ext) => path.join(src, '**', `*.${ext}`));

gulp.task('clean', (done) =>
  rimraf('dist', done)
);

gulp.task('lint', () =>
  gulp.src(sources)
  .pipe(plumber())
  .pipe(eslint())
  .pipe(eslint.format())
);

PLATFORMS.forEach((platform) =>
  ENVS.forEach((env) => {
    gulp.task(`transpile-${platform}-${env}`, ['clean', 'lint'], () =>
      gulp.src(sources)
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(babel({
        presets: [`${__dirname}/../babel/${platform}-${env}`],
      }))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(`dist/${platform}/${env}/src`))
    );

    gulp.task(`bundle-${platform}-${env}`, [`transpile-${platform}-${env}`], () =>
      gulp.src(`dist/${platform}/${env}/src/index.js`)
      .pipe(plumber())
      .pipe(webpack(webpackConfig[platform][env]))
      .pipe(gulp.dest(`dist/${platform}/${env}`))
    );
  })
);

gulp.task('bundle', _.flatten(
  PLATFORMS.map((platform) => ENVS.map((env) => `bundle-${platform}-${env}`))
));

gulp.task('test', ['lint', 'bundle'], () =>
  gulp.src(`dist/node/dev/src/**/__tests__/**/**`)
  .pipe(plumber())
  .pipe(mocha())
);

gulp.task('default', ['test']);
