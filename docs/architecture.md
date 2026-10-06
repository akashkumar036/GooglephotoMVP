# Memory Clue — Technical Architecture

> **Product**: Memory Clue — Google Photos MVP Prototype  
> **Core feature**: Use this photo as a clue  
> **Objective**: Validate that a recognizable non-target photo can act as an effective retrieval anchor for finding a photo the user cannot precisely describe.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Data Layer](#4-data-layer)
5. [Photo Analysis Pipeline](#5-photo-analysis-pipeline)
6. [Retrieval Engine](#6-retrieval-engine)
7. [AI / Reasoning Layer](#7-ai--reasoning-layer)
8. [Clue Chaining](#8-clue-chaining)
9. [Demo Dataset](#9-demo-dataset)
10. [My Photos Mode](#10-my-photos-mode)
11. [Search Architecture](#11-search-architecture)
12. [Privacy Architecture](#12-privacy-architecture)
13. [State Management](#13-state-management)
14. [Component Hierarchy](#14-component-hierarchy)
15. [User Flow Architecture](#15-user-flow-architecture)
16. [API Design](#16-api-design)
17. [Error & Edge Case Handling](#17-error--edge-case-handling)
18. [Tech Stack](#18-tech-stack)

---

## 1. System Overview

Memory Clue is a **photo retrieval prototype** layered on top of a Google Photos-inspired UI. It is NOT a chatbot, NOT a general AI assistant. The AI operates silently behind the scenes to power three distinct retrieval strategies.

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                  │
│  (Cannot describe target photo precisely)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ broad search / recognition
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Memory Clue UI                             │
│  Google Photos–style layout, grid, menus, sheets            │
└────────┬─────────────────┬──────────────────────┬───────────┘
         │                 │                      │
         ▼                 ▼                      ▼
   Demo Photos        My Photos            Clue Choice Sheet
   (Mock Dataset)     (Uploaded)           (3 retrieval modes)
         │                 │                      │
         └─────────────────┴──────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Retrieval Engine                           │
│  ┌──────────────┐ ┌─────────────────┐ ┌──────────────────┐ │
│  │ Search       │ │ Search Around   │ │ Best Match       │ │
│  │ Similar      │ │ This Memory     │ │ (AI Reasoning)   │ │
│  └──────────────┘ └─────────────────┘ └──────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI / Gemini Layer                          │
│  Embeddings · Ranking · Signal Weighting · Explanations     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. High-Level Architecture

### Deployment Model

```
Browser (Client-side)
│
├── UI Layer (React / Vite)
│   ├── Google Photos–inspired components
│   ├── State management (Zustand or Context API)
│   └── Local IndexedDB / in-memory store
│
├── Analysis Layer (runs in browser)
│   ├── EXIF extraction (exifr)
│   ├── CLIP / MobileNet embeddings (TensorFlow.js)
│   ├── OCR (Tesseract.js — optional)
│   └── Metadata indexing
│
└── AI / Ranking Layer
    ├── Local: cosine similarity, heuristic scoring
    └── Remote (optional): Gemini API — for Best Match mode
```

### Key Principle

- **Demo Photos mode**: 100% local, no network calls after initial load.
- **My Photos mode**: Analysis runs in the browser. Gemini API called only for **Best Match** mode (opt-in, disclosed to user).
- No user photos are silently uploaded.

---

## 3. Frontend Architecture

### Framework

- **Vite + React** (TypeScript)
- CSS: Vanilla CSS with CSS custom properties matching Google Photos design tokens
- Font: **Google Sans** / **Roboto** (via Google Fonts)

### Page / Route Structure

```
/                        → App Shell (mode selector)
  /demo                  → Demo Photos Library
    /demo/search         → Search Results
    /demo/clue/:id       → Clue Choice Sheet (bottom sheet overlay)
    /demo/results        → Related Results Grid
  /my-photos             → My Photos Library
    /my-photos/import    → Import / Processing Screen
    /my-photos/search    → Search Results
    /my-photos/clue/:id  → Clue Choice Sheet
    /my-photos/results   → Related Results Grid
```

### Design Tokens (matching Google Photos)

```css
:root {
  --gp-bg: #202124;
  --gp-surface: #303134;
  --gp-primary: #8ab4f8;
  --gp-on-surface: #e8eaed;
  --gp-secondary-text: #9aa0a6;
  --gp-chip-bg: #3c4043;
  --gp-sheet-bg: #292a2d;
  --gp-radius-card: 8px;
  --gp-radius-sheet: 16px;
  --font-body: 'Google Sans', Roboto, sans-serif;
}
```

---

## 4. Data Layer

### Photo Data Model

Every photo (demo or user-imported) is normalized into a single schema:

```typescript
interface Photo {
  id: string;                    // UUID
  source: 'demo' | 'user';
  
  // Display
  imageUrl: string;              // object URL (user) or asset path (demo)
  thumbnailUrl: string;          // resized for grid
  
  // Temporal
  dateTime: Date | null;         // from EXIF or filename
  datePrecision: 'exact' | 'approximate' | 'unknown';
  
  // Location
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;   // reverse-geocoded or from demo data
  
  // Content signals
  objects: string[];             // e.g. ["medicine bottle", "pill pack"]
  labels: string[];              // e.g. ["pharmacy", "healthcare", "indoor"]
  ocrText: string | null;        // extracted text
  description: string;           // AI-generated scene description
  people: string[];              // face IDs or names (demo) / anonymous (user)
  
  // Embedding
  embedding: number[] | null;    // 512-dim visual embedding vector
  
  // Contextual grouping
  eventId: string | null;        // cluster ID
  eventName: string | null;      // e.g. "Goa Trip March 2024"
  tripId: string | null;
  neighborIds: string[];         // IDs of photos taken within ±30 min
  
  // Metadata
  filename: string;
  width: number;
  height: number;
  fileSize: number;
}
```

### Storage Strategy

| Context | Storage | TTL |
|---|---|---|
| Demo dataset | In-memory (bundled JSON) | App lifetime |
| User photos (images) | IndexedDB (Blob) | Session + persist opt |
| User photo metadata | IndexedDB (JSON) | Session + persist opt |
| Embeddings | IndexedDB (Float32Array) | Session + persist opt |
| Clue history | React state (sessionStorage backup) | Session |

---

## 5. Photo Analysis Pipeline

Runs entirely in the browser after a user imports photos.

### Pipeline Stages

```
[File Input]
     │
     ▼
[1. File Validation]
     Check: JPEG, JPG, PNG, HEIC, WEBP
     Reject unsupported formats gracefully
     │
     ▼
[2. EXIF Extraction] — exifr library
     Extract: DateTimeOriginal, GPS, Make, Model
     Handle: missing fields gracefully (do not fail)
     │
     ▼
[3. Image Resize]
     Resize to 224×224 (embedding) + 400px (thumbnail)
     Using OffscreenCanvas / createImageBitmap
     │
     ▼
[4. Visual Embedding] — TensorFlow.js + MobileNet / CLIP
     Generate 512-dim embedding vector per photo
     Stored as Float32Array in IndexedDB
     │
     ▼
[5. Object & Label Detection] — MobileNet / COCO-SSD
     Detect top-N objects and semantic labels
     e.g. ["person", "outdoor", "food", "car"]
     │
     ▼
[6. OCR (Optional)] — Tesseract.js
     Run only if image contains likely text regions
     (heuristic: high contrast regions, aspect ratios)
     Store extracted text for search and similarity
     │
     ▼
[7. Cluster / Event Detection]
     Group photos by temporal + spatial proximity:
       - Same day + location within 2km → same event
       - Consecutive photos within 30 min → neighbors
       - Multi-day + same location → trip cluster
     │
     ▼
[8. Index Building]
     Build in-memory inverted index:
       keyword → [photoIds]
     Build embedding matrix for cosine similarity
     │
     ▼
[9. Ready State]
     UI unlocks search and clue features
```

### Processing Progress UI

Display to user during analysis:
```
Preparing your photos
✓ Photos imported (N photos)
✓ Dates detected
✓ Locations detected
✓ Visual relationships prepared
✓ Search index created
```

---

## 6. Retrieval Engine

The engine exposes a single interface regardless of mode:

```typescript
interface RetrievalRequest {
  cluePhotoId: string;
  mode: 'similar' | 'memory' | 'best';
  dataset: 'demo' | 'user';
  excludeIds?: string[];        // previously seen clues
  topK?: number;                // default 20
}

interface RetrievalResult {
  photo: Photo;
  score: number;                // 0.0 – 1.0
  reasons: ReasonChip[];        // explanation chips
}

interface ReasonChip {
  label: string;                // e.g. "Same Goa trip"
  type: 'visual' | 'temporal' | 'location' | 'people' | 'event' | 'text';
}
```

---

### 6A. Search Similar to This Photo

**Goal**: Find photos that *look like* the clue, regardless of date.

**Scoring Formula**:

```
score = (visual_sim × 0.50)
      + (object_sim  × 0.25)
      + (semantic_sim × 0.20)
      + (context_sim × 0.05)
```

**Signal Computation**:

| Signal | Method |
|---|---|
| `visual_sim` | Cosine similarity between embedding vectors |
| `object_sim` | Jaccard similarity on `objects[]` arrays |
| `semantic_sim` | Jaccard similarity on `labels[]` arrays + OCR text TF-IDF overlap |
| `context_sim` | Weak boost if same event/trip (not dominant) |

**Critical rule**: Date proximity is NOT a scoring factor in this mode. Cross-year retrieval must work.

---

### 6B. Search Around This Memory

**Goal**: Find photos that belong to the *same broader memory* as the clue, even if visually different.

**Scoring Formula**:

```
score = (event_sim   × 0.30)
      + (temporal_sim × 0.25)
      + (location_sim × 0.20)
      + (people_sim  × 0.15)
      + (visual_sim  × 0.10)
```

**Signal Computation**:

| Signal | Method |
|---|---|
| `event_sim` | Same `eventId` or `tripId` → 1.0; adjacent cluster → 0.6 |
| `temporal_sim` | Gaussian decay: `exp(-Δt² / 2σ²)` where σ = 4 hours; same-day = high |
| `location_sim` | Haversine distance decay: `exp(-Δkm / 10)` |
| `people_sim` | Jaccard similarity on `people[]` sets |
| `visual_sim` | Cosine similarity (low weight — contextual mode) |

**Key behavior**: Two photos from the same trip on the same day but visually very different should score highly.

---

### 6C. Let Photos Find the Best Match

**Goal**: AI-adaptive combination of all available signals.

**Process**:

```
1. Analyze clue photo signal strength:
   - Has GPS?           → weight location higher
   - Has event cluster? → weight event higher
   - Has OCR text?      → weight text similarity higher
   - Has clear objects? → weight visual/object higher
   - Has people?        → weight people higher

2. Dynamically compute weights based on available signals

3. Score all candidate photos using adaptive formula

4. Send top-20 candidates + clue to Gemini API:
   - Prompt: re-rank and explain top candidates
   - Gemini returns ordered list with reason strings

5. Present top-10 results with Gemini-generated reasons
```

**Gemini Integration** (Best Match only):

```typescript
interface GeminiRankRequest {
  clue: {
    description: string;
    objects: string[];
    labels: string[];
    locationName: string | null;
    eventName: string | null;
    dateTime: string | null;
  };
  candidates: Array<{
    id: string;
    description: string;
    objects: string[];
    labels: string[];
    locationName: string | null;
    eventName: string | null;
    dateTime: string | null;
    localScore: number;
  }>;
}

interface GeminiRankResponse {
  rankedIds: string[];
  reasons: Record<string, string>;  // photoId → reason string
}
```

**Fallback**: If Gemini API is unavailable, fall back to adaptive local scoring without explanations.

---

## 7. AI / Reasoning Layer

### Models Used

| Task | Model / Library | Where |
|---|---|---|
| Visual embeddings | MobileNet v3 or CLIP (WASM) | Browser |
| Object detection | COCO-SSD (TF.js) | Browser |
| OCR | Tesseract.js (optional) | Browser |
| Adaptive re-ranking + explanations | Gemini 1.5 Flash (API) | Remote (Best Match only) |
| Reverse geocoding | Nominatim / BigDataCloud (free) | Remote (optional) |

### Gemini Prompt Template (Best Match)

```
You are a photo retrieval assistant for Memory Clue, a Google Photos feature.

The user is trying to find a photo they cannot describe precisely.
They have selected a clue photo. Your job is to re-rank the candidate photos
and explain in plain language (max 6 words per explanation) why each is relevant.

CLUE PHOTO:
- Description: {clue.description}
- Objects: {clue.objects}
- Labels: {clue.labels}
- Location: {clue.locationName}
- Event: {clue.eventName}
- Date: {clue.dateTime}

CANDIDATE PHOTOS (already pre-ranked by local scoring):
{candidates.map(c => `ID: ${c.id} | ${c.description} | Score: ${c.localScore}`)}

Return JSON:
{
  "rankedIds": [...ordered photo IDs...],
  "reasons": {
    "photoId": "Short reason string"
  }
}

Reason examples: "Similar medicine packaging", "Same Goa trip", 
"Taken 35 minutes after clue", "Same location", "Same people"
```

---

## 8. Clue Chaining

### Concept

Users can select any photo from a results grid and use it as a new clue, creating a chain of progressive memory reconstruction.

### Data Structure

```typescript
interface ClueChain {
  id: string;                          // session ID
  steps: ClueStep[];
}

interface ClueStep {
  stepIndex: number;
  cluePhotoId: string;
  mode: 'similar' | 'memory' | 'best';
  resultIds: string[];
  timestamp: Date;
}
```

### Chain Breadcrumb UI

Display a compact trail when the chain depth > 1:

```
Search → Clue 1 (Search Similar) → Clue 2 (Memory) → Results
```

Each breadcrumb is clickable to go back.

### Exclusion Logic

When the user starts a new clue from a result:
- Previous clue photo is added to `excludeIds`
- Already-seen result photos are given a slight penalty
- This nudges the engine toward fresh results

---

## 9. Demo Dataset

### Structure

A curated JSON dataset bundled with the app. Contains ~40–60 photos across multiple events designed to demonstrate all 6 required scenarios.

```typescript
// /src/data/demoPhotos.ts
export const DEMO_PHOTOS: Photo[] = [ ... ]
```

### Required Event Clusters

| Cluster | Event | Purpose |
|---|---|---|
| `goa-2024` | Goa Trip March 2024 | Scenario B, F — contextual memory |
| `medicine-2023` | Medicine 2023 | Scenario A, E — cross-year visual |
| `medicine-2025` | Medicine 2025 | Scenario A, E — cross-year visual |
| `birthday-2024` | Friend's Birthday | Scenario C, D — best match + chaining |
| `hotel-goa` | Hotel during Goa trip | Scenario B, F |
| `doc-scan-2022` | Document photo 2022 | Scenario A — visual similarity |
| `doc-scan-2024` | Document photo 2024 | Scenario A — visual similarity |

### Cross-Scenario Coverage

| Scenario | Required Relationship | Clue → Target |
|---|---|---|
| A | Cross-year visual similarity | medicine-2023 → medicine-2025 |
| B | Same memory, different visual | Goa restaurant → Goa beach |
| C | AI best match | Birthday clue → best candidate |
| D | Clue chaining | Search → Clue A → Clue B → Target |
| E | Different year | Doc 2022 → Doc 2024 |
| F | Same context, different appearance | Hotel Goa → Beach Goa |

### Image Generation

Demo photos should be generated using AI image generation or sourced from royalty-free stock, clearly labeled as demonstration content.

---

## 10. My Photos Mode

### Upload Flow

```
User clicks "Add Photos"
        │
        ▼
File picker (accept="image/*", multiple)
        │
        ▼
File validation (type, size < 50MB each)
        │
        ▼
Store raw Blobs in IndexedDB
        │
        ▼
Start Analysis Pipeline (Section 5)
        │
        ▼
Show processing progress UI
        │
        ▼
Unlock search + clue features
```

### Supported Formats

- JPEG / JPG
- PNG
- WEBP
- HEIC (with polyfill)
- GIF (first frame only)

### Batch Import UX

- Multi-file select in a single picker dialog
- Show count: "47 photos selected"
- Process concurrently in batches of 5 (to avoid OOM)
- Display progress bar and per-stage status

### Clear My Photos

Prominent action in My Photos header:

```
[Clear my photos]
```

This action:
1. Removes all Blobs from IndexedDB
2. Removes all metadata records from IndexedDB
3. Clears embedding matrix from memory
4. Resets search index
5. Shows confirmation: "Your photos have been removed from this session."

---

## 11. Search Architecture

### Initial Search (keyword → candidate set)

```
Query string
     │
     ▼
Tokenize + normalize (lowercase, strip punctuation)
     │
     ▼
Match against:
  - photo.objects[]
  - photo.labels[]
  - photo.ocrText
  - photo.description
  - photo.locationName
  - photo.eventName
  - photo.filename
     │
     ▼
Score by term frequency across fields
     │
     ▼
Return top-30 ranked results as photo grid
```

### Search Index Structure

```typescript
interface SearchIndex {
  invertedIndex: Map<string, Set<string>>;   // term → Set<photoId>
  tfScores: Map<string, Map<string, number>>; // photoId → term → score
}
```

### Natural Language Support

For My Photos mode, send query to Gemini (optional) to expand it:

```
"medicine" → ["medicine", "pill", "tablet", "pharmacy", "drug", "prescription"]
"Goa"      → ["goa", "beach", "india", "coastal", "resort", "tropical"]
```

Fall back to exact keyword match if Gemini unavailable.

---

## 12. Privacy Architecture

### Data Handling Principles

| Data Type | Where Stored | Sent to Server? |
|---|---|---|
| User photos (images) | IndexedDB (local) | Never (unless Best Match API) |
| User metadata | IndexedDB (local) | Never |
| Visual embeddings | IndexedDB (local) | Never |
| Clue history | sessionStorage | Never |
| Best Match API call | Gemini API | Only descriptions + metadata, NOT raw images |

### Privacy Disclosure

Show on import screen:

```
🔒 Your photos stay on this device.
   Images are analyzed locally in your browser.
   Only text descriptions are sent to Google AI 
   when you use "Let Photos find the best match."
   Your photos are never stored on our servers.
```

### Session-Only Mode (default)

By default, all user data is cleared when the browser tab is closed. Offer opt-in persistence via IndexedDB with explicit consent.

---

## 13. State Management

### Global State Shape

```typescript
interface AppState {
  // Mode
  activeMode: 'demo' | 'my-photos' | null;
  
  // Photo library
  photos: Map<string, Photo>;
  isProcessing: boolean;
  processingProgress: ProcessingProgress;
  
  // Search
  searchQuery: string;
  searchResults: string[];          // ordered photoIds
  
  // Clue
  activeClueId: string | null;
  selectedMode: RetrievalMode | null;
  clueResults: RetrievalResult[];
  
  // Clue chaining
  clueChain: ClueChain | null;
  
  // UI
  selectedPhotoId: string | null;   // for menu/sheet trigger
  menuOpen: boolean;
  sheetOpen: boolean;
  
  // Feedback
  feedbackState: FeedbackState | null;
}
```

### State Library

Use **Zustand** for lightweight global state. Component-level state for UI interactions (menu open/close, animations).

---

## 14. Component Hierarchy

```
<App>
  <ModeSelector />                     ← Demo Photos / My Photos
  
  <DemoMode>
    <SearchBar />
    <PhotoGrid results={searchResults} />
    <PhotoCard
      onSelect → selectedPhotoId
      onMenuOpen → menuOpen
    />
    <ContextMenu photoId={selectedPhotoId}>
      <MenuItem> Share </MenuItem>
      <MenuItem> Add to album </MenuItem>
      <MenuItem> Download </MenuItem>
      ─────────────────────────────
      <MenuItem highlight> Use this photo as a clue </MenuItem>
    </ContextMenu>
    <ClueChoiceSheet photoId={selectedPhotoId}>
      <ClueOption mode="similar" />
      <ClueOption mode="memory" />
      <ClueOption mode="best" />
    </ClueChoiceSheet>
    <ResultsGrid results={clueResults}>
      <ResultCard reason={chip} />
    </ResultsGrid>
    <ClueBreadcrumb chain={clueChain} />
  </DemoMode>
  
  <MyPhotosMode>
    <ImportScreen />
    <ProcessingScreen progress={processingProgress} />
    <SearchBar />
    <PhotoGrid />
    ... (same as DemoMode from here)
  </MyPhotosMode>
  
  <FeedbackPrompt />                   ← "Did you find it?"
</App>
```

---

## 15. User Flow Architecture

### Flow 1 — Demo Photos

```
AppShell
  → ModeSelector: "Demo Photos"
  → SearchBar: user types "medicine"
  → PhotoGrid: 8–12 results shown
  → User long-presses / clicks photo → ContextMenu opens
  → User taps "Use this photo as a clue"
  → ClueChoiceSheet opens (bottom sheet animation)
  → User selects "Search similar to this photo"
  → RetrievalEngine.similar(clueId) called
  → Loading spinner (300–800ms simulated or real)
  → ResultsGrid with ReasonChips shown
  → User can: select a result as new clue (chaining) OR view photo
  → FeedbackPrompt: "Did you find the photo?"
```

### Flow 2 — My Photos

```
AppShell
  → ModeSelector: "My Photos"
  → ImportScreen: user taps "Add photos"
  → File picker opens (multi-select)
  → Photos added to queue
  → ProcessingScreen: pipeline runs per photo
  → Progress: "✓ Visual relationships prepared"
  → Library view: all imported photos in grid
  → User searches "Goa"
  → ... (same as Demo flow from search step)
```

---

## 16. API Design

### Retrieval Engine API (internal)

```typescript
// Retrieval
retrieveSimilar(clueId: string, options?: RetrievalOptions): Promise<RetrievalResult[]>
retrieveMemory(clueId: string, options?: RetrievalOptions): Promise<RetrievalResult[]>
retrieveBestMatch(clueId: string, options?: RetrievalOptions): Promise<RetrievalResult[]>

// Search
searchPhotos(query: string, dataset: 'demo' | 'user'): Promise<Photo[]>

// Analysis
analyzePhoto(file: File): Promise<Photo>
analyzePhotoBatch(files: File[], onProgress: ProgressCallback): Promise<Photo[]>

// Data management
clearUserPhotos(): Promise<void>
getPhotoById(id: string): Promise<Photo | null>
getAllPhotos(dataset: 'demo' | 'user'): Promise<Photo[]>
```

### External APIs

| API | Purpose | Required? | Privacy Note |
|---|---|---|---|
| Gemini 1.5 Flash | Best Match re-ranking + reasons | Optional | Descriptions only, no images |
| Nominatim / BigDataCloud | Reverse geocoding from GPS | Optional | Coordinates only |
| Google Fonts | Typography | Yes | No user data |

---

## 17. Error & Edge Case Handling

### Analysis Pipeline Failures

| Failure | Behavior |
|---|---|
| No EXIF date | Use file modified date as fallback; mark `datePrecision: 'approximate'` |
| No GPS | Skip location signals; retrieve without location |
| No readable text | Skip OCR; exclude from text similarity |
| Embedding model fails | Fall back to keyword-only retrieval |
| Unsupported file type | Show friendly error per file, continue with rest |
| File > 50MB | Warn user, skip that file |

### Retrieval Failures

| Failure | Behavior |
|---|---|
| No results (score < threshold) | Show "We couldn't find a strong match" with suggested actions |
| Gemini API unavailable | Fall back to local scoring; hide explanation chips |
| Partial results (< 3) | Show what's available; no empty state if ≥ 1 result |
| All photos already seen | Loosen exclusion threshold; show with "already seen" badge |

### Empty State Messages

```
No results: "We couldn't find a strong match.
             Try another clue photo or a different search."
             
No photos:  "Import some photos to get started."

Processing: "Preparing your photos… (N of M)"

API error:  "Best match is unavailable right now.
             We'll use our local analysis instead."
```

---

## 18. Tech Stack

### Core

| Layer | Technology |
|---|---|
| Build tool | Vite |
| Framework | React 18 (TypeScript) |
| State | Zustand |
| Routing | React Router v6 |
| Styling | Vanilla CSS + CSS custom properties |
| Fonts | Google Fonts (Google Sans / Roboto) |

### Analysis & AI

| Task | Library |
|---|---|
| EXIF extraction | `exifr` |
| Image resizing | `OffscreenCanvas` / `createImageBitmap` |
| ML embeddings | `@tensorflow/tfjs` + `@tensorflow-models/mobilenet` |
| Object detection | `@tensorflow-models/coco-ssd` |
| OCR (optional) | `tesseract.js` |
| Vector similarity | Custom cosine similarity (Float32Array) |
| AI reasoning | `@google/generative-ai` (Gemini) |

### Storage

| Purpose | Technology |
|---|---|
| Photo blobs | IndexedDB (via `idb` wrapper) |
| Metadata + embeddings | IndexedDB |
| Session state | sessionStorage |
| Demo dataset | Bundled JSON (in-memory) |

### Testing & Quality

| Purpose | Tool |
|---|---|
| Unit tests | Vitest |
| Component tests | React Testing Library |
| E2E (optional) | Playwright |

---

## Architecture Decision Log

| Decision | Rationale |
|---|---|
| Run analysis in browser | Privacy-first; no silent photo uploads |
| IndexedDB for photo storage | Persists across refreshes without server |
| Gemini only for Best Match | Limits API surface; keeps demo/similar fully offline |
| Send descriptions to Gemini, not images | Privacy; descriptions are sufficient for re-ranking |
| Separate retrieval modes | Validates Hypothesis 2: users benefit from distinct strategies |
| Clue chaining as first-class feature | Validates Hypothesis 3: iterative discovery |
| No Google account auth | Out of MVP scope; avoids production complexity |
| Curated demo dataset | Ensures reliable demo scenarios A–F regardless of user data |
| TF.js MobileNet for embeddings | Runs in-browser; sufficient for MVP similarity quality |
| Zustand for state | Lightweight, no boilerplate, easy to inspect |
