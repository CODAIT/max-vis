import replace from 'rollup-plugin-replace'
import json from 'rollup-plugin-json'

const jsonPlugin = json({
  include: 'package.json',
  preferConst: true,
  indent: '  ',
  compact: true,
  namedExports: ['version']
})

export default [
  {
    input: 'src/max-vis.js',
    output: [
      {
        format: 'iife',
        compact: true,
        name: 'maxvis',
        file: 'dist/max-vis.js'
      },
      {
        format: 'es',
        compact: true,
        name: 'maxvis',
        file: 'dist/max-vis.es.js'
      }
    ],
    plugins: [
      replace({
        'process.rollupBrowser': true
      }),
      jsonPlugin
    ]
  }, {
    input: 'src/max-vis.js',
    output: [
      {
        format: 'cjs',
        compact: true,
        name: 'maxvis',
        file: 'dist/max-vis.cjs.js'
      }
    ],
    plugins: [
      replace({
        'process.rollupBrowser': false
      }),
      jsonPlugin
    ]
  }
]
