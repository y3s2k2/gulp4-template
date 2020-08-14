"use strict";
const { src, dest, series, watch, lastRun, parallel } = require("gulp");
const gutil = require("gulp-util");
const pug = require("gulp-pug");
const sass = require("gulp-sass");
const packageImporter = require("node-sass-package-importer");
const typescript = require("gulp-typescript");
const rename = require("gulp-rename");
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const autoprefixer = require("gulp-autoprefixer");
const browserSync = require("browser-sync").create();
const prettify = require("gulp-prettify");
const htmlhint = require("gulp-htmlhint");
const cleanCSS = require('gulp-clean-css');
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");
const imagemin = require("gulp-imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const imageminSvgo = require("imagemin-svgo");
const PUBLIC_PATH = "dist/assets";

const PATHS = {
  pug: {
    src: "./src/pug/**/!(_)*.pug",
    dest: "./dist/assets"
  },
  styles: {
    src: "./src/scss/**/*.scss",
    dest: "./dist/assets/css"
  },
  scripts: {
    src: "./src/typescript/**/*.ts",
    dest: "./dist/assets/js"
  },
  images: {
    src: "./src/images/**/*.+(jpg|jpeg|png|gif)",
    dest: "./dist/assets/images"
  }
};

// methods
const errorHandler = (err, stats) => {
  if (err || (stats && stats.compilation.errors.length > 0)) {
    const error = err || stats.compilation.errors[0].error;
    notify.onError({ message: "<%= error.message %>" })(error);
    this.emit("end");
  }
}

// pug
const pugFiles = () => {
  const option = {
    pretty: true
  };
  return src(PATHS.pug.src)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(pug(option))
    .pipe(dest(PATHS.pug.dest));
}

// scss
const sassCompile = () => {
  return src(PATHS.styles.src)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(
      sass({
        outputStyle: "expanded",
        importer: packageImporter({
          extensions: [".scss", ".css"]
        })
      })
    )
    .pipe(
      autoprefixer({
        cascade: false
      })
    )
    .pipe(dest(PATHS.styles.dest))
    .pipe(
      rename(function (path) {
        if (/^style_/.test(path.basename)) {
          path.basename = "style_latest";
        }
      })
    )
    .pipe(cleanCSS({ compatibility: 'ie8' }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(dest(PATHS.styles.dest))
    .pipe(browserSync.stream());
}

// typescript
const tsCompile = () => {
  return src(PATHS.scripts.src)
    .pipe(
      typescript({
        target: "ES5",
        removeComments: true
      })
    )
    .js
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(babel({
      presets: ['@babel/preset-env']  // gulp-babel transpile
    }))
    .pipe(dest(PATHS.scripts.dest))
    .pipe(uglify()) // js minifier
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest(PATHS.scripts.dest));
}

// images 
const imgImagemin = () => {
  return src(PATHS.images.src)
    .pipe(
      imagemin(
        [
          imageminMozjpeg({
            quality: 80
          }),
          imageminPngquant(),
          imageminSvgo({
            plugins: [
              {
                removeViewbox: false
              }
            ]
          })
        ],
        {
          verbose: true
        }
      )
    )
    .pipe(dest(PATHS.images.dest))
}

// server
const browserSyncOption = {
  open: false,
  port: 3000,
  ui: {
    port: 3001
  },
  server: {
    baseDir: PATHS.pug.dest, // output directory,
    index: "index.html"
  }
};

const browsersync = (done) => {
  browserSync.init(browserSyncOption);
  done();
}

// browser reload
const browserReload = (done) => {
  browserSync.reload();
  done();
  console.info("Browser reload completed");
}

// watch
const watchFiles = (done) => {
  watch(PATHS.pug.src, series(pugFiles, browserReload));
  watch(PATHS.styles.src, sassCompile);
  watch(PATHS.scripts.src, tsCompile);
  watch(PATHS.images.src, imgImagemin);
  done();
}

// commands
exports.default = series(
  parallel(sassCompile, pugFiles, tsCompile),
  series(browsersync, watchFiles)
);
