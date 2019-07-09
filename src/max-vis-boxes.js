import { actions, colors, base64toBlob } from './max-vis-util.js'
import { createCanvasWithImage, drawBox, drawLabel } from './max-vis-canvas.js'

const type = 'boxes'
const supports = [actions.OVERLAY, actions.ANNOTATE, actions.EXTRACT]

// e.g., [x1,y1,x2,y2]
const isBox = function (box) {
  return Array.isArray(box) && box.length === 4 && box.every(l => typeof l === 'number' && l >= 0)
}

// e.g., [ [x1,y1,x2,y2], [x1,y1,x2,y2] ]
const isArrayOfBoxes = function (boxes) {
  return Array.isArray(boxes) && boxes.length && boxes.every(b => {
    // Docker microservices have 'detection_box'
    return isBox(b['detection_box'] || b)
  })
}

const getPredication = function (prediction) {
  if (prediction.predictions) {
    // Object-Detector: Docker microservice
    // Facial-Age-Estimator: Docker microservice
    // Facial-Emotion-Classifier: Docker microservice
    // Facial-Recognizer: Docker microservice
    return prediction.predictions
  }
  return Array.isArray(prediction) ? prediction : [prediction]
}

const transformData = function (prediction) {
  let p = getPredication(prediction)

  const reOrderBox = function (box) {
    if (box.every(b => b <= 1)) {
      // Object-Detector: Docker microservice ordering
      box = [box[1], box[0], box[3], box[2]]
    }

    return box
  }

  if (isBox(p)) {
    p = [p]
  }

  const boxesData = p.map((box, i) => {
    // some Docker microservices have 'label'
    // Facial-Age-Estimator: Docker microservice has 'age_estimation'
    let label = box.label || box['age_estimation'] || ''

    if (!label) {
      if (box['probability']) {
        // Facial-Recognizer: Docker microservice
        label = (box['probability'] * 100).toFixed(2)
      } else if (box['emotion_predictions']) {
        // Facial-Emotion-Classifier: Docker microservice
        label = box['emotion_predictions'].sort((a, b) => {
          return b.probability - a.probability
        })[0].label
      }
    }

    let b = []

    if (box['detection_box']) {
      // Docker microservices
      b = box['detection_box']
    } else if (isBox(box)) {
      b = box
    }

    return {
      box: reOrderBox(b),
      label: label
    }
  })

  return boxesData
}

const canRender = function (prediction, options = {}) {
  const isType = (!options.type) || (typeof options.type === 'string' && options.type.toLowerCase() === type)
  if (isType) {
    const p = getPredication(prediction)
    return isArrayOfBoxes(p) || isBox(p)
  } else {
    return false
  }
}

const scaleBox = function (box, scalew, scaleh) {
  if (scalew === 1 && scaleh === 1) {
    return box
  } else {
    return [
      box[0] * scalew, // xMin
      box[1] * scaleh, // yMin
      box[2] * scalew, // xMax
      box[3] * scaleh // yMax
    ]
  }
}

/**
 * Returns whether or not the `action` requested can be perform by this utility
 * with the given `prediction` and `options` objects
 *
 * @param {string} action The action to perform (i.e., `overlay`, `annotate`, or `extract`)
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {Object} options Options to customize action
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
 * Processes the `prediction` with the specified `options` and renders bounding
 * boxes on to the `canvas`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLCanvasElement} canvas The HTMLCanvasElement to render the bounding boxes
 * @param {Object} options Options to customize bounding box renderings
 */
const doOverlay = function (prediction, canvas, options = {}) {
  const canvasCtx = canvas.getContext('2d')
  const colorRGB = options.colors ? options.colors : colors.rgb
  const lineWidth = options.lineWidth || undefined

  const boxesData = transformData(prediction)
  const isRatio = boxesData[0].box.every(b => b <= 1)
  let scale = options.scale || 1

  scale = isRatio
    ? [canvas.width * scale, canvas.height * scale]
    : [scale, scale]

  for (var i = 0; i < boxesData.length; i++) {
    const box = scaleBox(boxesData[i].box, ...scale)
    const color = colorRGB[i % colorRGB.length]

    drawBox(canvasCtx, ...box, color, lineWidth)

    if (boxesData[i].label) {
      if (typeof options.label === 'undefined' ||
          options.label === null ||
          (typeof options.label === 'string' && options.label.toLowerCase() !== 'false') ||
          (typeof options.label !== 'string' && !options.label)) {
        drawLabel(boxesData[i].label, canvasCtx, box[0], box[1], color)
      }
    }
  }
}

/**
 * Processes the `prediction` against the `image` and creates a new image that
 * includes bounding boxes from the `prediction`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to render the bounding boxes
 * @param {Object} options Options to customize bounding box renderings
 * @returns {Blob|Buffer} A Blob object (in browsers) of Buffer (in Node.js) of an `image/png` with the bounding boxes rendered
 */
const doAnnotate = function (prediction, image, options = {}) {
  const annotatedCanvas = createCanvasWithImage(image)

  doOverlay(prediction, annotatedCanvas, options)

  return base64toBlob(annotatedCanvas.toDataURL().split(',')[1])
}

/**
 * Processes the `prediction` against the `image` and extracts the area identified
 * by the bounding boxes
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to extract the bounding boxes
 * @param {Object} options Options to customize extraction
 * @returns {Array} An array of objects containing the bounding box `label` and extracted `image/png` (Blob or Buffer)
 */
const doExtract = function (prediction, image, options = {}) {
  const croppedImages = []

  const boxesData = transformData(prediction)
  const isRatio = boxesData[0].box.every(b => b <= 1)
  let scale = options.scale || 1

  const w = image.naturalWidth || image.width || image.clientWidth
  const h = image.naturalHeight || image.height || image.clientHeight

  scale = isRatio
    ? [w * scale, h * scale]
    : [scale, scale]

  for (var i = 0; i < boxesData.length; i++) {
    const box = scaleBox(boxesData[i].box, ...scale)
    const canvas = createCanvasWithImage(image, box[0], box[1], box[2] - box[0], box[3] - box[1])

    croppedImages.push({
      label: boxesData[i].label,
      image: base64toBlob(canvas.toDataURL().split(',')[1])
    })
  }

  return croppedImages
}

export { type, supportsAction, doOverlay, doAnnotate, doExtract }
