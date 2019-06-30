import { actions, colors, base64toBlob, findUnique } from './max-vis-util.js'
import { createImageData, createCanvasWithImageData, createCanvasWithImage, trimCanvas } from './max-vis-canvas.js'

const type = 'segments'
const supports = [actions.OVERLAY, actions.ANNOTATE, actions.EXTRACT]

// e.g., [x1,x2,x3,...]
const isSegment = function (segment) {
  return Array.isArray(segment) && segment.length && segment.every(s => typeof s === 'number' && s >= 0)
}

// e.g., [ [x1,x2,x3,...], [x1,x2,x3,...], ... ]
const isArrayOfSegments = function (map) {
  return Array.isArray(map) && map.length && map.every(isSegment)
}

const getPredication = function (prediction) {
  if (prediction.segmentationMap) {
    // Image-Segmenter: TensorFlow.js
    return prediction.segmentationMap
  } else if (prediction['seg_map']) {
    // Image-Segmenter: Docker microservice
    return prediction['seg_map']
  }
  return Array.isArray(prediction) ? prediction : [prediction]
}

const transformData = function (prediction) {
  const p = getPredication(prediction)
  let segmentsData = []

  if (isSegment(p)) {
    segmentsData = [p]
  } else {
    segmentsData = p.map(seg => {
      if (isSegment(seg)) {
        return seg
      }
    })
  }

  return segmentsData
}

const canRender = function (prediction, options = {}) {
  const isType = (!options.type) || (typeof options.type === 'string' && options.type.toLowerCase() === type)
  if (isType) {
    const p = getPredication(prediction)
    return isArrayOfSegments(p) || isSegment(p)
  } else {
    return false
  }
}

const segmentsDataToImageData = function (segmentsData, renderOpts) {
  const width = segmentsData[0].length
  const height = segmentsData.length
  const colorRGB = renderOpts.colors ? renderOpts.colors : colors.rgb

  let segments = renderOpts.segments
  if (typeof segments !== 'undefined' && segments !== null) {
    segments = Array.isArray(segments) ? segments : [segments]
  }

  let excludes = renderOpts.exclude
  if (typeof excludes === 'string') {
    excludes = excludes.toLowerCase() === 'true'
  }

  const crop = segments && renderOpts.crop
  const croppedDataIndex = []
  let data = []

  for (var j = 0; j < height; j++) {
    for (var i = 0; i < width; i++) {
      let s = segmentsData[j][i]
      if (segments) {
        if (segments.indexOf(s) === -1) {
          // const rgb = excludes ? (crop ? 255 : 175) : [0, 0, 0]
          if (excludes) {
            data.push(...colorRGB[s % colorRGB.length], 175) // red, green, blue, alpha
          } else {
            data.push(0, 0, 0, (crop ? 255 : 0)) // red, green, blue, alpha
            croppedDataIndex.push(data.length - 1)
          }
        } else {
          const alpha = excludes ? (crop ? 175 : 0) : (crop ? 0 : 175)
          data.push(...colorRGB[s % colorRGB.length], alpha) // red, green, blue, alpha
          if (excludes) {
            croppedDataIndex.push(data.length - 1)
          }
        }
      } else {
        data.push(...colorRGB[s % colorRGB.length], 175) // red, green, blue, alpha
      }
    }
  }

  let imageData = createImageData(width, height)
  imageData.data.set(data)

  return { imageData, croppedDataIndex }
}

const extractSegments = function (image, segmentsData, cropOpts) {
  const { imageData, croppedDataIndex } = segmentsDataToImageData(segmentsData, cropOpts)
  const tempCanvas = createCanvasWithImage(image)
  const croppedCanvas = createCanvasWithImageData(createImageData(imageData.width, imageData.height))
  const croppedCanvasCtx = croppedCanvas.getContext('2d')

  croppedCanvasCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, croppedCanvas.width, croppedCanvas.height)

  const croppedImageData = croppedCanvasCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
  const croppedData = croppedImageData.data

  for (let i = 0; i < croppedDataIndex.length; i++) {
    croppedData[croppedDataIndex[i]] = 0
  }
  croppedCanvasCtx.putImageData(croppedImageData, 0, 0)

  // scale canvas
  const scaledCanvas = createCanvasWithImageData(createImageData(image.naturalWidth, image.naturalHeight))
  const scaledCanvasCtx = scaledCanvas.getContext('2d')

  scaledCanvasCtx.drawImage(croppedCanvas, 0, 0, croppedCanvas.width, croppedCanvas.height, 0, 0, scaledCanvas.width, scaledCanvas.height)

  return scaledCanvas
}

/**
 * Returns whether or not the `action` requested can be perform by this utility
 * with the given `prediction` and `options` objects
 *
 * @param {string} action The action to perform (i.e., `overlay`, `annotate`, or `extract`)
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {Object} options Options to customize action
 *
 * @returns {boolean} `true`, if `action` can be performed on `prediction` object
 */
const supportsAction = function (action, prediction, options) {
  if (supports.indexOf(action) > -1) {
    return canRender(prediction, options)
  } else {
    return false
  }
}

/**
 * Processes the `prediction` with the specified `options` and renders the
 * segmentation map on to the `canvas`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLCanvasElement} canvas The HTMLCanvasElement to render the segmentation map
 * @param {Object} options Options to customize segmentation map renderings
 */
const doOverlay = function (prediction, canvas, options = {}) {
  const renderOpts = {
    colors: options.colors,
    segments: options.segments,
    exclude: options.exclude
  }

  const segmentsData = transformData(prediction)
  const { imageData } = segmentsDataToImageData(segmentsData, renderOpts)

  // scale canvas
  const tempCanvas = createCanvasWithImageData(imageData)
  canvas.getContext('2d').drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height)
}

/**
 * Processes the `prediction` against the `image` and creates a new image that
 * includes segmentation maps from the `prediction`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to render the segmentation map
 * @param {Object} options Options to customize segmentation map renderings
 * @returns {Blob|Buffer} A Blob object (in browsers) of Buffer (in Node.js) of an `image/png` with the segment map rendered
 */
const doAnnotate = function (prediction, image, options = {}) {
  const annotationCanvas = createCanvasWithImage(image)

  doOverlay(prediction, annotationCanvas, options)

  return base64toBlob(annotationCanvas.toDataURL().split(',')[1])
}

/**
 * Processes the `prediction` against the `image` and extracts the area identified
 * by the segmentation maps
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to extract the segmentation maps
 * @param {Object} options Options to customize extraction
 * @returns {Array} An array of objects containing the segment `label` and extracted `image/png` (Blob or Buffer)
 */
const doExtract = function (prediction, image, options = {}) {
  const segmentsData = transformData(prediction)
  let segments = options.segments

  if (typeof segments !== 'undefined' && segments !== null) {
    segments = Array.isArray(segments) ? segments : [options.segments]
  } else {
    segments = findUnique(segmentsData)
  }

  const croppedImages = []

  segments.forEach(segment => {
    const cropOpts = {
      colors: options.colors,
      segments: [segment],
      crop: true,
      exclude: options.exclude
    }

    const segmentCanvas = extractSegments(image, segmentsData, cropOpts)
    const trimmedCanvas = trimCanvas(segmentCanvas)

    croppedImages.push({
      label: segment,
      image: base64toBlob(trimmedCanvas.toDataURL().split(',')[1])
    })
  })

  return croppedImages
}

export { type, supportsAction, doOverlay, doAnnotate, doExtract }
