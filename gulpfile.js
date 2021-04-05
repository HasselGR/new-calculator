import gulp from 'gulp'
import { clean, scripts, styles, markup, images, manifest, watch, bundle, _locales } from './tasks'
import dotenv from 'dotenv'
dotenv.config()


export const paths = {
  scripts: [
    'src/options.js',
    'src/content.js',
    'src/background.js',
    'src/popup.js',
  ],

  styles: [
    'src/options.scss',
    'src/popup.scss',
  ],

  images: 'src/images/**/*',
  
  _locales: 'src/_locales/**/*',

  manifest: 'src/manifest.json',

  markup: [
    'src/options.html',
    'src/popup.html',
  ],
}


gulp.task('build', gulp.series(clean, gulp.parallel(scripts, styles, markup, images, manifest)))
gulp.task('dev', gulp.series('build', watch))
gulp.task('bundle', gulp.series('build', bundle))
