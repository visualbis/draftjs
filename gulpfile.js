const gulp = require('gulp');
const ts = require('gulp-typescript');
const less = require('gulp-less');;
const del = require('del');
const concat = require('gulp-concat');

function cleanDist() {
    return del([
        './dist',
    ]);
}

function compileTypescript() {
    var tsProject = ts.createProject('./tsconfig.json');
    return gulp
        .src(['./src/**/*.ts', './src/**/*.tsx'])
        .pipe(tsProject())
        .pipe(gulp.dest(`./dist/`));
}

function compileLess() {
    return gulp.src(`./src/Styles/**/*.less`).pipe(less()).pipe(gulp.dest(`./dist/css`));
}

function mergeCSS() {
    return gulp.src([`./dist/less/**/*.css`]).pipe(concat('combined.css')).pipe(gulp.dest(`./dist/css`));
}


const buildIbcs = gulp.series(
    function cleanIBCSDist() {
        return cleanDist();
    },
    function compileLessIbcs() {
        return compileLess();
    },
    function mergeCSSIbcs() {
        return mergeCSS();
    },
    function transpileEditor() {
        return compileTypescript();
    },
);

exports.build = buildIbcs;
gulp.task('dev', () => {
    buildIbcs();
    gulp.watch('src/**/*', gulp.series(compileLess, mergeCSS, compileTypescript));
});