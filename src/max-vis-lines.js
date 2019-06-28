import { actions, colors, base64toBlob } from './max-vis-util.js'
import { createCanvasWithImage, drawLine } from './max-vis-canvas.js'

const type = 'lines'
const supports = [actions.OVERLAY, actions.ANNOTATE]

// e.g., [x1,y1,x2,y2]
const isLine = function (line) {
  return Array.isArray(line) && line.length === 4 && line.every(l => typeof l === 'number' && l >= 0)
}

// e.g., [ [x1,y1,x2,y2], [x1,y1,x2,y2] ]
const isPose = function (poselines) {
  return Array.isArray(poselines) && poselines.length && poselines.every(pl => {
    // Human-Pose-Estimator: Docker microservice has 'line'
    return isLine(pl.line || pl)
  })
}

// e.g., [ [ [x1,y1,x2,y2], [x1,y1,x2,y2] ], [ [x1,y1,x2,y2], [x1,y1,x2,y2] ] ]
const isArrayOfPoses = function (poses) {
  return Array.isArray(poses) &&
    poses.length &&
    poses.every(p => {
      // Human-Pose-Estimator: TensorFlow.js has 'poseLines'
      // Human-Pose-Estimator: Docker microservice has 'pose_lines'
      return isPose(p.poseLines || p['pose_lines'] || p)
    })
}

const getPredication = function (prediction) {
  if (prediction.posesDetected) {
    // Human-Pose-Estimator: TensorFlow.js
    return prediction.posesDetected
  } else if (prediction.predictions) {
    // Human-Pose-Estimator: Docker microservice
    return prediction.predictions
  }
  return Array.isArray(prediction) ? prediction : [prediction]
}

const normalizeData = function (prediction) {
  const p = getPredication(prediction)
  let linesData = []

  if (isLine(p)) {
    linesData = [[p]]
  } else if (isPose(p)) {
    linesData = [p]
  } else {
    linesData = p.map(pose => {
      if (pose.poseLines) {
        // Human-Pose-Estimator: TensorFlow.js
        return pose.poseLines
      } else if (pose['pose_lines']) {
        // Docker Human-Pose-Estimator microservice
        return pose['pose_lines'].map(pl => pl.line)
      } else if (isPose(pose)) {
        // nested arrays of line points (i.e., [xMin, yMin, xMax, yMax])
        return pose
      } else if (isLine(pose)) {
        return [pose]
      }
    })
  }

  return linesData
}

const canRender = function (prediction, options = {}) {
  const isType = (!options.type) || (typeof options.type === 'string' && options.type.toLowerCase() === type)
  if (isType) {
    const p = getPredication(prediction)
    return isArrayOfPoses(p) || isPose(p) || isLine(p)
  } else {
    return false
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
 * Processes the `prediction` with the specified `options` and renders lines
 * on to the `canvas`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLCanvasElement} canvas The HTMLCanvasElement to render the lines
 * @param {Object} options Options to customize line renderings
 */
const doOverlay = function (prediction, canvas, options = {}) {
  const canvasCtx = canvas.getContext('2d')
  const colorRGB = options.colors ? options.colors : colors.rgb
  const lineWidth = options.lineWidth || undefined
  const scale = options.scale || 1
  const linesData = normalizeData(prediction)

  for (var i = 0; i < linesData.length; i++) {
    let color = colorRGB[i % colorRGB.length]
    linesData[i].forEach((l, j) => {
      let line = scale === 1 ? l : l.map(a => a * scale)
      drawLine(canvasCtx, ...line, color, lineWidth)
    })
  }
}

/**
 * Processes the `prediction` against the `image` and creates a new image that
 * includes lines from the `prediction`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to render the lines
 * @param {Object} options Options to customize line renderings
 * @returns {Blob} A copy of the `image` with the lines rendered on it
 */
const doAnnotate = function (prediction, image, options = {}) {
  const scale = options.scale || 1
  const annotatedCanvas = createCanvasWithImage(image)

  options.scale = scale * image.naturalWidth / image.width
  doOverlay(prediction, annotatedCanvas, options)

  return base64toBlob(annotatedCanvas.toDataURL().split(',')[1])
}

export { type, supportsAction, doOverlay, doAnnotate }
