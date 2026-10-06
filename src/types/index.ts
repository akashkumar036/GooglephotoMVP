/**
 * Core domain types and interfaces for Memory Clue
 * Based on docs/architecture.md and docs/implementation-plan.md
 */

export type PhotoSource = 'demo' | 'user';
export type DatePrecision = 'exact' | 'approximate' | 'unknown';
export type RetrievalMode = 'similar' | 'memory' | 'best';
export type ChipType = 'visual' | 'temporal' | 'location' | 'people' | 'event' | 'text';

export interface ReasonChip {
  label: string; // e.g. "Same Goa trip", "Similar appearance"
  type: ChipType;
}

export interface Photo {
  id: string; // UUID or ID string
  source: PhotoSource;

  // Display
  imageUrl: string; // object URL (user) or asset path (demo)
  thumbnailUrl: string; // resized for grid

  // Temporal
  dateTime: Date | null; // from EXIF or filename
  datePrecision: DatePrecision;

  // Location
  latitude: number | null;
  longitude: number | null;
  locationName: string | null; // reverse-geocoded or from demo data

  // Content signals
  objects: string[]; // e.g. ["medicine bottle", "pill pack"]
  labels: string[]; // e.g. ["pharmacy", "healthcare", "indoor"]
  ocrText: string | null; // extracted text
  description: string; // AI-generated scene description
  people: string[]; // face IDs or names (demo) / anonymous (user)

  // Embedding
  embedding: number[] | null; // visual embedding vector

  // Contextual grouping
  eventId: string | null; // cluster ID
  eventName: string | null; // e.g. "Goa Trip March 2024"
  tripId: string | null;
  neighborIds: string[]; // IDs of photos taken within ±30 min

  // Metadata
  filename: string;
  width: number;
  height: number;
  fileSize: number;
}

export interface RetrievalResult {
  photo: Photo;
  score: number; // 0.0 – 1.0
  reasons: ReasonChip[]; // explanation chips
}

export interface RetrievalRequest {
  cluePhotoId: string;
  mode: RetrievalMode;
  dataset: 'demo' | 'user';
  excludeIds?: string[]; // previously seen clues
  topK?: number; // default 20
}

export interface ClueStep {
  stepIndex: number;
  cluePhotoId: string;
  mode: RetrievalMode;
  resultIds: string[];
  timestamp?: Date;
  label?: string;
}

export interface ClueChain {
  id: string;
  steps: ClueStep[];
}

export interface ProcessingProgress {
  total: number;
  current: number;
  stage:
    | 'idle'
    | 'validating'
    | 'exif'
    | 'resizing'
    | 'embedding'
    | 'detecting'
    | 'ocr'
    | 'clustering'
    | 'indexing'
    | 'ready';
  stageLabel: string;
  percentage: number;
  errors?: { filename: string; message: string }[];
}

export interface FeedbackState {
  found: boolean | null;
  stepCount?: number;
  selectedTags?: string[];
  comments?: string;
}

export interface StoredFeedback {
  id?: string;
  timestamp: string;
  mode: RetrievalMode;
  chainDepth: number;
  success: 'yes' | 'not_yet' | 'not_sure';
  helpfulSignals: string[];
}

export interface AppState {
  // Mode
  activeMode: 'demo' | 'my-photos' | null;

  // Photo library
  photos: Map<string, Photo>;
  userPhotos: Photo[];
  isProcessing: boolean;
  processingProgress: ProcessingProgress;

  // Search
  searchQuery: string;
  searchResults: string[]; // ordered photoIds

  // Clue
  activeClueId: string | null;
  selectedMode: RetrievalMode | null;
  clueResults: RetrievalResult[];

  // Clue chaining
  clueChain: ClueChain | null;

  // UI
  selectedPhotoId: string | null;
  enlargedPhotoId: string | null;
  menuOpen: boolean;
  sheetOpen: boolean;

  // Feedback
  feedbackState: FeedbackState | null;

  // Actions
  setActiveMode: (mode: 'demo' | 'my-photos' | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: string[]) => void;
  setSelectedPhotoId: (photoId: string | null) => void;
  setEnlargedPhotoId: (photoId: string | null) => void;
  setActiveClueId: (clueId: string | null) => void;
  setSelectedMode: (mode: RetrievalMode | null) => void;
  setClueResults: (results: RetrievalResult[]) => void;
  setMenuOpen: (open: boolean) => void;
  setSheetOpen: (open: boolean) => void;
  addClueStep: (step: ClueStep) => void;
  truncateChainToStep: (stepIndex: number) => void;
  updateStepResultIds: (stepIndex: number, resultIds: string[]) => void;
  resetClueChain: () => void;
  setProcessingProgress: (progress: ProcessingProgress) => void;
  setFeedbackState: (state: FeedbackState | null) => void;
  clearUserPhotos: () => void;
}
