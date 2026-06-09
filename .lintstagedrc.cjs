/**
 * Exclude package-lock.json (huge generated file) and assets/ binaries
 * from lint-staged. Pattern functions return file list with those filtered.
 */
const skipGenerated = (files) => files.filter((f) => !f.endsWith('package-lock.json') && !f.includes('assets/'))

module.exports = {
  // ESLint + Prettier on source TS only.
  'src/**/*.ts': ['eslint --cache --fix', 'prettier --cache --write'],
  'test/**/*.ts': ['eslint --cache --fix', 'prettier --cache --write'],
  'scripts/**/*.{ts,mjs,js}': ['prettier --cache --write'],

  // Format-only for authored config / docs. Exclude package-lock + assets.
  '*.{json,md,yml,yaml,html,css,toml}': (files) => {
    const target = skipGenerated(files)
    return target.length ? [`prettier --cache --write --ignore-unknown ${target.join(' ')}`] : []
  },
}
