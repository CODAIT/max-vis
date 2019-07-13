#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const cmdline = require('commander')
const maxvis = require('../dist/max-vis.cjs.js')

let imagePath

const isImage = function (fileName) {
  const name = path.resolve(fileName)

  const fileSignatures = [
    [0xFF, 0xD8, 0xFF], // jpg
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // png
    [0x47, 0x49, 0x46], // gif
    [0x42, 0x4D] // bmp
  ]

  return new Promise((resolve, reject) => {
    fs.readFile(name, (err, fileData) => {
      if (err) {
        reject(new Error(`failed to read file '${name}'`))
      } else {
        const isImage = fileSignatures.some((signature, index) => {
          for (let i = 0; i < signature.length; i++) {
            if (signature[i] !== fileData[i]) {
              return false
            }
          }
          return true
        })
        isImage ? resolve(name) : reject(new Error(`file '${name}' is not an image file`))
      }
    })
  })
}

const getPrediction = function (jsonFile) {
  if (jsonFile) {
    const name = path.resolve(jsonFile)
    try {
      const pred = require(name)
      return Promise.resolve(pred)
    } catch (e) {
      return Promise.reject(new Error(`failed to load ${jsonFile}`))
    }
  } else { // check stdin
    const stream = process.stdin

    return new Promise((resolve, reject) => {
      let data = []
      if (!stream.isTTY) {
        stream.setEncoding('utf8')
        stream.on('readable', () => {
          let chunk
          while ((chunk = stream.read())) {
            data.push(chunk)
          }
        })
        stream.on('end', () => {
          try {
            const result = JSON.parse(data.join(''))
            resolve(result)
          } catch (e) {
            reject(e)
          }
        })
        stream.on('error', (e) => {
          reject(e)
        })
      } else {
        reject(new Error(`invalid or no prediction provided`))
      }
    })
  }
}

const save = function (imageBuffer, filePath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, imageBuffer, (err) => {
      if (err) {
        console.log(`failed to save ${filePath}`)
        reject(err)
      } else {
        console.log(`saved ${filePath}`)
        resolve(filePath)
      }
    })
  })
}

const run = function (command, prediction, image, options = {}) {
  if (command === 'annotate') {
    return maxvis.annotate(prediction, image, options)
      .then(imageBuffer => {
        const filePath = path.join(path.parse(imagePath).dir, `${path.parse(imagePath).name}-annotate.png`)
        return save(imageBuffer, filePath)
      })
  } else if (command === 'extract') {
    return maxvis.extract(prediction, image, options)
      .then(response => {
        return Promise.all(response.map((resp, i) => {
          const filePath = path.join(path.parse(imagePath).dir, `${path.parse(imagePath).name}-extract-${i}.png`)
          return save(resp.image, filePath)
        }))
      })
  } else {
    return Promise.reject(new Error(`unsupported command (${command})`))
  }
}

cmdline
  .description('Image annotation library for MAX image models')
  .usage(`<imagePath> [options]`)
  .arguments('<imagePath>')
  .action(p => {
    imagePath = p
  })
  .option('-e, --extract', 'Extracts and saves each component of the prediction from the image instead of saving a single image will all components rendered')
  .option('-t, --type <name>', 'The name of type of rendering the prediction conforms to. Valid types are: "boxes", "lines", "segments"')
  .option('-p, --prediction <filePath>', 'The path to a JSON file containing the prediction returned by a MAX image model')
  .version(maxvis.version, '-v, --version')

cmdline.parse(process.argv)

if (!imagePath) {
  // output help information and exit immediately
  console.log('error: command \'maxvis <imagePath>\' argument missing\r\n')
  cmdline.help()
} else if (cmdline.type && maxvis.types.indexOf(cmdline.type.toLowerCase()) === -1) {
  console.log(`error: option '--type ${cmdline.type}' not a valid type (${maxvis.types})`)
  process.exit(1)
} else {
  const visCmd = cmdline.extract ? 'extract' : 'annotate'
  const visType = cmdline.type ? cmdline.type.toLowerCase() : null
  Promise.all([isImage(imagePath), getPrediction(cmdline.prediction)])
    .then(data => {
      const img = data[0]
      const pred = data[1]
      return run(visCmd, pred, img, { type: visType })
    })
    .catch(e => {
      console.error(`error: ${e.message || e}`)
      process.exit(1)
    })
}
