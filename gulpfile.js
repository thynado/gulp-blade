let gulp = require("gulp");
let blade = require("./");

/**
 * Blade task
 * 
 * @return object
 */
gulp.task("blade", () => {
    return gulp.src("tests/source/**/*.blade")
        .pipe(blade())
        .pipe(gulp.dest("tests/results"));
});

/**
 * File watcher
 * 
 * @return void
 */
gulp.task("watch", () => {
    gulp.watch("tests/source/**/*.blade", gulp.parallel("blade"));
});

/**
 * Default task
 *
 * @return void
 */
gulp.task("default", gulp.series("blade", "watch"));