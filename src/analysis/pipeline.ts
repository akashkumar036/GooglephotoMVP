import type { Photo, ProcessingProgress } from '../types'
import { validateFiles } from './validateFile'
import { extractExif } from './extractExif'
import { resizeImage } from './resizeImage'
import { generateEmbedding } from './generateEmbedding'
import { detectObjects } from './detectObjects'
import { extractText } from './extractText'
import { clusterPhotos } from './clusterPhotos'
import { buildIndex } from '../engine/searchIndex'
import { savePhotos } from '../storage/photoDb'
import { useAppStore } from '../store/appStore'

const BATCH_SIZE = 5

export interface PipelineResult {
  photos: Photo[]
  totalImported: number
  rejectedCount: number
  errors: string[]
}

/**
 * Runs the complete on-device photo analysis pipeline in batches of 5.
 * Updates Zustand store progress in real time (Phase 11.10).
 */
export async function processPhotosPipeline(
  files: FileList | File[],
  onProgress?: (progress: ProcessingProgress) => void
): Promise<PipelineResult> {
  const setProgress = (progress: ProcessingProgress) => {
    useAppStore.getState().setProcessingProgress(progress)
    onProgress?.(progress)
  }

  // Stage 1: Validating
  setProgress({
    total: files.length,
    current: 0,
    stage: 'validating',
    stageLabel: 'Validating photo formats and sizes...',
    percentage: 5,
  })

  const { validFiles, rejectedFiles } = validateFiles(files)
  const errors = rejectedFiles.map((r) => r.error)

  if (validFiles.length === 0) {
    setProgress({
      total: files.length,
      current: 0,
      stage: 'idle',
      stageLabel: 'No valid photos found.',
      percentage: 0,
    })
    return {
      photos: [],
      totalImported: 0,
      rejectedCount: rejectedFiles.length,
      errors,
    }
  }

  const total = validFiles.length
  const rawPhotos: Photo[] = []
  const blobsMap = new Map<string, Blob>()
  const photoErrors: { filename: string; message: string }[] = []

  // Process in batches of 5 (Task 11.10)
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = validFiles.slice(i, i + BATCH_SIZE)

    for (let bIdx = 0; bIdx < batch.length; bIdx++) {
      const file = batch[bIdx]
      const currentCount = i + bIdx + 1
      const photoId = `user-${Date.now()}-${i + bIdx}-${Math.random().toString(36).slice(2, 7)}`

      try {
        // Stage 2: EXIF extraction
        setProgress({
          total,
          current: currentCount,
          stage: 'exif',
          stageLabel: `Extracting dates and location for photo ${currentCount} of ${total}...`,
          percentage: Math.round(10 + (currentCount / total) * 15),
          errors: photoErrors.length > 0 ? [...photoErrors] : undefined,
        })
        const exif = await extractExif(file)

        // Stage 3: Resizing
        setProgress({
          total,
          current: currentCount,
          stage: 'resizing',
          stageLabel: `Optimizing and creating thumbnail for photo ${currentCount} of ${total}...`,
          percentage: Math.round(25 + (currentCount / total) * 15),
          errors: photoErrors.length > 0 ? [...photoErrors] : undefined,
        })
        const resized = await resizeImage(file)

        // Stage 4: Visual Embedding
        setProgress({
          total,
          current: currentCount,
          stage: 'embedding',
          stageLabel: `Generating AI visual embedding for photo ${currentCount} of ${total}...`,
          percentage: Math.round(40 + (currentCount / total) * 20),
          errors: photoErrors.length > 0 ? [...photoErrors] : undefined,
        })
        const embedding = await generateEmbedding(resized.embeddingCanvas)

        // Stage 5: Object & Label Detection
        setProgress({
          total,
          current: currentCount,
          stage: 'detecting',
          stageLabel: `Detecting objects and scenes for photo ${currentCount} of ${total}...`,
          percentage: Math.round(60 + (currentCount / total) * 15),
          errors: photoErrors.length > 0 ? [...photoErrors] : undefined,
        })
        const detections = await detectObjects(resized.embeddingCanvas)

        // Stage 6: OCR (Optional heuristic check)
        const ocr = await extractText(resized.embeddingCanvas, file.name, detections.objects)

        const photo: Photo = {
          id: photoId,
          source: 'user',
          imageUrl: resized.thumbnailUrl,
          thumbnailUrl: resized.thumbnailUrl,
          dateTime: exif.dateTime,
          datePrecision: exif.datePrecision,
          latitude: exif.latitude,
          longitude: exif.longitude,
          locationName: null,
          objects: detections.objects,
          labels: detections.labels,
          ocrText: ocr,
          description:
            detections.objects.length > 0
              ? `Photo containing ${detections.objects.join(', ')}`
              : file.name.replace(/\.[^/.]+$/, ''),
          people: [],
          embedding,
          eventId: null,
          eventName: null,
          tripId: null,
          neighborIds: [],
          filename: file.name,
          width: resized.width,
          height: resized.height,
          fileSize: file.size,
        }

        rawPhotos.push(photo)
        blobsMap.set(photoId, file)
      } catch (photoErr) {
        console.warn(`Couldn't analyze photo "${file.name}":`, photoErr)
        photoErrors.push({
          filename: file.name,
          message: "Couldn't analyze this photo",
        })
        setProgress({
          total,
          current: currentCount,
          stage: 'detecting',
          stageLabel: `Couldn't analyze "${file.name}". Continuing...`,
          percentage: Math.round(20 + (currentCount / total) * 60),
          errors: [...photoErrors],
        })
        // Phase 15.3: Continue processing other photos
      }
    }
  }

  if (rawPhotos.length === 0) {
    setProgress({
      total,
      current: total,
      stage: 'idle',
      stageLabel: 'Could not analyze selected photos.',
      percentage: 0,
      errors: photoErrors,
    })
    return {
      photos: [],
      totalImported: 0,
      rejectedCount: rejectedFiles.length + photoErrors.length,
      errors: [...errors, ...photoErrors.map((e) => `${e.message} (${e.filename})`)],
    }
  }

  // Stage 7: Event & Trip Clustering
  setProgress({
    total,
    current: total,
    stage: 'clustering',
    stageLabel: 'Clustering moments, locations, and trips...',
    percentage: 85,
  })
  const clusteredPhotos = clusterPhotos(rawPhotos)

  // Stage 8: Building Search Index
  setProgress({
    total,
    current: total,
    stage: 'indexing',
    stageLabel: 'Building fast local search index...',
    percentage: 95,
  })
  buildIndex(clusteredPhotos)

  // Stage 9: Saving to IndexedDB & Updating Zustand Store
  setProgress({
    total,
    current: total,
    stage: 'ready',
    stageLabel: 'Your photos are ready!',
    percentage: 100,
  })

  // Persist to IndexedDB
  await savePhotos(clusteredPhotos, blobsMap)

  // Synchronize with store
  const store = useAppStore.getState()
  const existingUserPhotos = store.userPhotos || []
  const combinedUserPhotos = [...existingUserPhotos, ...clusteredPhotos]

  const newPhotosMap = new Map(store.photos)
  clusteredPhotos.forEach((p) => newPhotosMap.set(p.id, p))

  useAppStore.setState({
    userPhotos: combinedUserPhotos,
    photos: newPhotosMap,
    activeMode: 'my-photos',
    isProcessing: false,
    processingProgress: {
      total,
      current: total,
      stage: 'ready',
      stageLabel: 'Ready',
      percentage: 100,
    },
  })

  return {
    photos: clusteredPhotos,
    totalImported: clusteredPhotos.length,
    rejectedCount: rejectedFiles.length,
    errors,
  }
}
