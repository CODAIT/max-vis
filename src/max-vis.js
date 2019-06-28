import * as lines from './max-vis-lines.js'
import * as segments from './max-vis-segments.js'
import * as boxes from './max-vis-boxes.js'
import { actions as utilActions, getImage, getPredictionSize } from './max-vis-util.js'
import { getCanvasOverlay } from './max-vis-canvas.js'

const visualizers = [lines, segments, boxes]
const { OVERLAY, ANNOTATE, EXTRACT } = { ...utilActions }

const run = async function (action, prediction, image, options = {}) {
  let vis = visualizers.find(v => {
    return v.supportsAction(action, prediction, options)
  })

  if (!vis) {
    const msg = options.type
      ? `max-vis '${action}' does support type (${options.type})`
      : `Unable to determine appropriate type or '${action}()' does support prediction structure`
    throw Error(msg)
  }

  const img = await getImage(image)
  const size = getPredictionSize(prediction, options)
  const scale = size.height ? (img.height / size.height) : 1

  if (!options.scale) {
    options.scale = scale
  }

  let results = null

  switch (action) {
    case OVERLAY:
      const canvas = getCanvasOverlay(img, options)
      results = vis.doOverlay(prediction, canvas, options)
      break
    case EXTRACT:
      results = vis.doExtract(prediction, img, options)
      break
    default: // ANNOTATE
      results = vis.doAnnotate(prediction, img, options)
      break
  }

  return results
}

/**
 * Processes the `prediction` results with the specified `options` and renders the
 * results on to an HTMLCanvasElement overlaying the `image`
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to overlay prediction
 * @param {Object} options Options to customize overlay renderings
 */
const overlay = async function (prediction, image, options = {}) {
  if (process.rollupBrowser) {
    return run(OVERLAY, prediction, image, options)
  } else {
    return run(ANNOTATE, prediction, image, options)
  }
}

/**
 * Processes the `prediction` results against the `image` and creates a new image that
 * includes the results rendered on the image
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to render the results
 * @param {Object} options Options to customize annotation
 * @returns {Blob} A copy of the `image` with the prediction results rendered on it
 */
const annotate = async function (prediction, image, options = {}) {
  return run(ANNOTATE, prediction, image, options)
}

/**
 * Processes the `prediction` against the `image` and extracts the area identified
 * by the results
 *
 * @param {Object} prediction The prediction object from a MAX image model
 * @param {HTMLImageElement} image The HTMLImageElement to extract the results
 * @param {Object} options Options to customize extraction
 * @returns {Array} An array of Objects containing the results `label` and extracted `image` (Blob or Buffer)
 */
const extract = async function (prediction, image, options = {}) {
  return run(EXTRACT, prediction, image, options)
}

export {
  overlay,
  annotate,
  extract
}
