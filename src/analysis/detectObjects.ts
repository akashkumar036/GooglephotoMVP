import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

let cocoModel: cocoSsd.ObjectDetection | null = null
let modelLoadingPromise: Promise<cocoSsd.ObjectDetection> | null = null

// Label mapping dictionary for user-friendly Google Photos terms
const LABEL_MAP: Record<string, string[]> = {
  bottle: ['bottle', 'medicine bottle', 'container'],
  cup: ['cup', 'drink', 'beverage'],
  'cell phone': ['phone', 'mobile phone', 'electronics'],
  laptop: ['laptop', 'computer', 'work'],
  book: ['book', 'document', 'paper'],
  person: ['person', 'people'],
  car: ['car', 'vehicle', 'travel'],
  dog: ['dog', 'pet', 'animal'],
  cat: ['cat', 'pet', 'animal'],
  chair: ['chair', 'furniture', 'indoor'],
  diningtable: ['table', 'dining', 'indoor'],
  bowl: ['bowl', 'food', 'meal'],
  sandwich: ['sandwich', 'food', 'meal'],
  pizza: ['pizza', 'food', 'meal'],
  backpack: ['backpack', 'bag', 'travel'],
}

/**
 * Lazy loads COCO-SSD model once.
 */
export async function loadCocoSsd(): Promise<cocoSsd.ObjectDetection> {
  if (cocoModel) return cocoModel

  if (!modelLoadingPromise) {
    modelLoadingPromise = (async () => {
      await tf.ready()
      const model = await cocoSsd.load({ base: 'mobilenet_v2' })
      cocoModel = model
      return model
    })()
  }

  return modelLoadingPromise
}

export interface DetectionResult {
  objects: string[]
  labels: string[]
}

/**
 * Runs object detection on an image canvas or element.
 * Returns top-5 objects with confidence > 0.5 mapped to friendly names (Phase 11.6).
 */
export async function detectObjects(
  imageCanvasOrElement: HTMLCanvasElement | HTMLImageElement
): Promise<DetectionResult> {
  try {
    const model = await loadCocoSsd()
    const predictions = await model.detect(imageCanvasOrElement)

    // Filter by confidence > 0.5, take top 5
    const confident = predictions
      .filter((p) => p.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const rawObjects = Array.from(new Set(confident.map((p) => p.class.toLowerCase())))

    const labelsSet = new Set<string>()
    for (const obj of rawObjects) {
      labelsSet.add(obj)
      const mapped = LABEL_MAP[obj]
      if (mapped) {
        mapped.forEach((m) => labelsSet.add(m))
      }
    }

    return {
      objects: rawObjects,
      labels: Array.from(labelsSet),
    }
  } catch {
    // Graceful fallback for test or unsupported environments
    return {
      objects: [],
      labels: [],
    }
  }
}
