/* global ImageData */

const DEFAULT_LINE = 3
let createCanvasElement
let createEmptyImageData
if (process.rollupBrowser) {
  createCanvasElement = function async (width, height) {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return c
  }
  createEmptyImageData = function (width, height) {
    return new ImageData(width, height)
  }
} else {
  const { createCanvas, createImageData } = require('canvas')
  createCanvasElement = createCanvas
  createEmptyImageData = createImageData
}

const getCanvasOverlay = function (image, options) {
  let maxvisid = image.getAttribute('data-maxvis-id')
  if (!maxvisid) {
    maxvisid = `maxvis${Date.now()}`
    image.setAttribute('data-maxvis-id', maxvisid)
  }

  let canvas = document.getElementById(maxvisid)
  if (canvas === null) {
    canvas = createCanvasElement(image.width, image.height)
    canvas.id = maxvisid
    canvas.className = 'max-vis-canvas'
    image.insertAdjacentElement('afterend', canvas)
  }

  canvas.width = image.width
  canvas.height = image.height
  canvas.style.position = 'absolute'
  canvas.style.left = image.offsetLeft + 'px'
  canvas.style.top = image.offsetTop + 'px'
  canvas.style.zIndex = (image.style.zIndex || 0) + 1

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  return canvas
}

const createCanvasWithImage = function (image, imageX = 0, imageY = 0, imageW, imageH, canvasX = 0, canvasY = 0, canvasW, canvasH) {
  const w = imageW || image.naturalWidth || image.width || image.clientWidth
  const h = imageH || image.naturalHeight || image.height || image.clientHeight
  const tempCanvas = createCanvasElement((canvasW || w), (canvasH || h))
  const tempCanvasCtx = tempCanvas.getContext('2d')
  tempCanvasCtx.drawImage(image, imageX, imageY, w, h, canvasX, canvasY, tempCanvas.width, tempCanvas.height)
  return tempCanvas
}

const createCanvasWithImageData = function (imageData, canvasX = 0, canvasY = 0, canvasW, canvasH) {
  const tempCanvas = createCanvasElement((canvasW || imageData.width), canvasH || imageData.height)
  tempCanvas.getContext('2d').putImageData(imageData, canvasX, canvasY)
  return tempCanvas
}

const scanDataForTransparency = function (imageData, horizontalScan, ascendingOrder) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const dim1 = horizontalScan ? width : height
  const dim2 = horizontalScan ? height : width

  const offset = ascendingOrder ? 1 : -1
  // loop through first dimension
  for (let i = ascendingOrder ? 0 : dim1 - 1; ascendingOrder ? (i < dim1) : (i > -1); i += offset) {
    // loop through second dimension
    for (let j = 0; j < dim2; j++) {
      // alpha channel
      if (data[(width * j + i) * 4 + 3] !== 0) {
        return i
      }
    }
  }
}

// https://stackoverflow.com/questions/12175991/crop-image-white-space-automatically-using-jquery
const trimCanvas = function (canvas) {
  const w = canvas.width
  const h = canvas.height
  const imageData = canvas.getContext('2d').getImageData(0, 0, w, h)

  const top = scanDataForTransparency(imageData, false, true)
  const bottom = scanDataForTransparency(imageData, false, false)
  const left = scanDataForTransparency(imageData, true, true)
  const right = scanDataForTransparency(imageData, true, false)

  const trimmedWidth = right - left
  const trimmedHeight = bottom - top

  const trimmedCanvas = createCanvasElement(trimmedWidth, trimmedHeight)
  trimmedCanvas.getContext('2d').drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight)

  return trimmedCanvas
}

const drawLine = function (canvasCtx, x1, y1, x2, y2, c = 'black', lineWidth) {
  canvasCtx.beginPath()
  canvasCtx.moveTo(x1, y1)
  canvasCtx.lineTo(x2, y2)
  canvasCtx.strokeStyle = (Array.isArray(c) ? `rgb(${c})` : c)
  canvasCtx.lineWidth = lineWidth || DEFAULT_LINE
  canvasCtx.stroke()
}

const drawBox = function (canvasCtx, x1, y1, x2, y2, c = 'black', lineWidth) {
  canvasCtx.beginPath()
  canvasCtx.rect(x1, y1, x2 - x1, y2 - y1)
  canvasCtx.strokeStyle = (Array.isArray(c) ? `rgb(${c})` : c)
  canvasCtx.lineWidth = lineWidth || DEFAULT_LINE
  canvasCtx.stroke()
  canvasCtx.closePath()
}

const drawLabel = function (label, canvasCtx, x1, y1, c = 'black') {
  const fontSize = 14
  canvasCtx.beginPath()
  canvasCtx.textBaseline = 'top'
  canvasCtx.fillStyle = (Array.isArray(c) ? `rgb(${c})` : c)
  canvasCtx.font = `400 ${fontSize}px "IBM Plex Sans"`

  const hPad = 5
  const lHeight = 18
  const x = (x1 - 1 < 1) ? x1 : x1 - (DEFAULT_LINE / 2)
  const y = (y1 - lHeight < 1) ? y1 : y1 - lHeight
  const w = canvasCtx.measureText(label).width

  canvasCtx.fillRect(x, y, w + (hPad * 2), lHeight)

  const t = labelContrastColor(...c)
  canvasCtx.fillStyle = (Array.isArray(t) ? `rgb(${t})` : t)
  canvasCtx.fillText(label, x + hPad, y + (lHeight - fontSize) / 2)
  canvasCtx.closePath()
}

const labelContrastColor = function (r, g, b) {
  // https://www.w3.org/TR/AERT/#color-contrast
  // ((Red value X 299) + (Green value X 587) + (Blue value X 114)) / 1000
  const rgbRatio = ((r * 299) + (g * 587) + (b * 114)) / 1000
  const whiteContrast = 255 - rgbRatio

  return rgbRatio > whiteContrast ? [0, 0, 0] : [255, 255, 255]
}

export {
  createEmptyImageData as createImageData,
  getCanvasOverlay,
  createCanvasWithImage,
  createCanvasWithImageData,
  trimCanvas,
  drawLine,
  drawBox,
  drawLabel
}
