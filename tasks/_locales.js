import gulp from 'gulp'
import { paths } from '../gulpfile'


export function _locales() {
  return gulp.src(paths._locales, { since: gulp.lastRun(_locales) })
    .pipe(gulp.dest('build/_locales'))
}
