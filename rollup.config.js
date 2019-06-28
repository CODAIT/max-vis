import replace from 'rollup-plugin-replace'

export default [
  {
    input: 'src/max-vis.js',
    output: [
      {
        format: 'iife',
        compact: true,
        name: 'maxVis',
        file: 'dist/max-vis.js'
      },
      {
        format: 'es',
        compact: true,
        name: 'maxVis',
        file: 'dist/max-vis.es.js'
      }
    ],
    plugins: [
      replace({
        'process.rollupBrowser': true
      })
    ]
  }, {
    input: 'src/max-vis.js',
    output: [
      {
        format: 'cjs',
        compact: true,
        name: 'maxVis',
        file: 'dist/max-vis.cjs.js'
      }
    ],
    plugins: [
      replace({
        'process.rollupBrowser': false
      })
    ]
  }
]
