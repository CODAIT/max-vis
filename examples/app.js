const maxvis = require('../dist/max-vis.cjs.js')

const http = require('http')
const fs = require('fs')
const path = require('path')

const FormData = require('form-data')

let imagePath

console.log(`\r\nrunning version ${maxvis.version}`)

if (process.argv.length < 3) {
  console.log('please pass an image to process. ex:')
  console.log('  node app.js /path/to/image.jpg')
  process.exit(-1)
} else {
  imagePath = process.argv[2]
}

const form = new FormData()
form.append('image', fs.createReadStream(imagePath))

// Object Detector Endpoint: http://max-object-detector.max.us-south.containers.appdomain.cloud/model/predict
const hostName = 'max-object-detector.max.us-south.containers.appdomain.cloud'
const request = http.request({
  method: 'post',
  host: hostName,
  path: '/model/predict',
  headers: form.getHeaders()
})

console.log(`sending ${imagePath} to http://${hostName}${request.path}`)
form.pipe(request)

request.on('error', (err) => {
  console.error(err.stack)
})

request.on('response', function (response) {
  console.log(`response status ${response.statusCode}`)

  if (response.statusCode !== 200) {
    console.error(response.statusMessage)
  } else {
    let body = ''
    response.setEncoding('utf8')

    response.on('data', chunk => {
      body += chunk
    })

    response.on('end', () => {
      const prediction = JSON.parse(body)
      console.log(`prediction status ${prediction.status}`)
      if (prediction.status !== 'ok') {
        console.error(prediction)
      } else {
        annotateImage(prediction)
      }
    })
  }
})

const annotateImage = function (prediction) {
  console.log(`annotating ${prediction.predictions.length} prediction result(s)`)

  maxvis.annotate(prediction, imagePath)
    .then(annotatedImageBuffer => {
      const f = path.join(path.parse(imagePath).dir, `${path.parse(imagePath).name}-annotate.png`)

      fs.writeFile(f, annotatedImageBuffer, (err) => {
        if (err) {
          console.error(err)
        } else {
          console.log(`saved as ${f}\r\n`)
        }
      })
    })
}
