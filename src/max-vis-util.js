/* global atob, Blob, Image */

const COLOR_MAP = {
  blue: [31, 119, 180],
  orange: [255, 127, 14],
  green: [44, 160, 44],
  red: [214, 39, 40],
  purple: [148, 103, 189],
  brown: [140, 86, 75],
  pink: [227, 119, 194],
  gray: [127, 127, 127],
  yellow: [188, 189, 34],
  cyan: [23, 190, 207]
}

const colors = {
  rgb: Object.values(COLOR_MAP),
  name: Object.keys(COLOR_MAP)
}

const actions = {
  OVERLAY: 'overlay',
  ANNOTATE: 'annotate',
  EXTRACT: 'extract'
}

let loadImage
if (process.rollupBrowser) {
  loadImage = async function (imageUrlOrId) {
    let loadedImage = document.getElementById(imageUrlOrId)
    if (!loadedImage) {
      loadedImage = new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          resolve(img)
        }
        img.onerror = err => reject(err)
        img.src = imageUrlOrId
      })
    }
    return loadedImage
  }
} else {
  loadImage = require('canvas').loadImage
}

const getImage = async function (image) {
  let img = image
  if (typeof image === 'string') {
    img = await loadImage(image)
  }
  return img
}

const getPredictionSize = function (prediction, options) {
  let height = 0
  let width = 0

  if (options.height && options.width) {
    height = options.height
    width = options.width
  } else if (prediction.image_size) {
    height = prediction.image_size[1]
    width = prediction.image_size[0]
  } else if (prediction.imageSize) {
    height = prediction.imageSize.height
    width = prediction.imageSize.width
  }

  return {
    height: height,
    width: width
  }
}

const base64toBlob = function (b64, type = 'image/png') {
  const bStr = process.rollupBrowser ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const arr = new Uint8Array(bStr.length)
  for (let i = 0; i < bStr.length; i++) {
    arr[i] = bStr.charCodeAt(i)
  }
  if (process.rollupBrowser) {
    return new Blob([arr], { type: type })
  } else {
    return Buffer.from(arr)
  }
}

const findUnique = function (array) {
  // find all unique elements of the (nested) array
  const unique = []

  if (Array.isArray(array)) {
    const tempArray = array.slice(0)

    while (tempArray.length !== 0) {
      const element = tempArray.pop()
      if (Array.isArray(element)) {
        [].push.apply(tempArray, element)
        continue
      }

      if (unique.indexOf(element) === -1) {
        unique.push(element)
      }
    }
  }

  return unique
}

export {
  actions,
  colors,
  getImage,
  getPredictionSize,
  base64toBlob,
  findUnique
}
