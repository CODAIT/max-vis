
const FormData = require('form-data')
const maxVis = require('../dist/max-vis.cjs.js')
const http = require('http')
const fs = require('fs')
const path = require('path')

let imagePath

if (process.argv.length < 3) {
  console.log('please pass an image to process. ex:')
  console.log('  node app.js /path/to/image.jpg')
  process.exit(-1)
} else {
  imagePath = process.argv[2]
}

const form = new FormData()
form.append('image', fs.createReadStream(imagePath))

// Object Detector Endpoint: https://max-object-detector.max.us-south.containers.appdomain.cloud/model/predict
const request = http.request({
  method: 'post',
  host: 'max-object-detector.max.us-south.containers.appdomain.cloud',
  path: '/model/predict',
  headers: form.getHeaders()
})

form.pipe(request)

request.on('response', function (res) {
  console.log(res.statusCode)
  res.setEncoding('utf8')
  let body = ''
  res.on('data', chunk => {
    body += chunk
  })
  res.on('end', () => {
    const prediction = JSON.parse(body)
    console.log('Got Prediction:', prediction)
    annotateImage(prediction)
  })
})

const annotateImage = function (prediction) {
  maxVis.annotate(prediction, imagePath)
    .then(res => {
      const p = path.join(__dirname, 'annotated.jpg')
      fs.writeFile(path.join(__dirname, 'annotated.jpg'), res, (err) => {
        if (err) {
          console.error(err)
        } else {
          console.log(`saved as ${p}`)
        }
      })
    })
}
