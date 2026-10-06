# Memory Clue — Phase-wise Implementation Plan

> **Product**: Memory Clue — Google Photos MVP Prototype  
> **Based on**: `architecture.md` + `context.md`  
> **Goal**: Build a fully working prototype that validates the core hypothesis — a user can find a photo they cannot describe by starting from a photo they can recognize.

---

## Overview

| Phase | Name | Focus | Est. Duration |
|---|---|---|---|
| **0** | Project Setup | Scaffold, tooling, design tokens | 0.5 day |
| **1** | UI Shell | Google Photos–like layout and navigation | 1 day |
| **2** | Demo Dataset | Mock photos, metadata, event clusters | 1 day |
| **3** | Search | Keyword search across demo dataset | 0.5 day |
| **4** | Photo Selection & Context Menu | Selection state, ⋮ menu, clue entry point | 0.5 day |
| **5** | Clue Choice Sheet | Bottom sheet, 3 retrieval strategy options | 0.5 day |
| **6** | Retrieval Engine — Search Similar | Visual/semantic similarity scoring | 1 day |
| **7** | Retrieval Engine — Search Around Memory | Contextual/temporal scoring | 1 day |
| **8** | Retrieval Engine — Best Match (Local) | Adaptive signal weighting | 0.5 day |
| **9** | Results Experience | Results grid, reason chips, explanations | 0.5 day |
| **10** | Clue Chaining | Multi-hop clue path, breadcrumb UI | 0.5 day |
| **11** | My Photos — Import & Processing | Upload, EXIF, embeddings, indexing | 2 days |
| **12** | My Photos — Search & Retrieval | Same retrieval engine on user photos | 0.5 day |
| **13** | Gemini Integration | Best Match AI re-ranking + explanations | 1 day |
| **14** | Privacy & Data Management | Disclosures, clear photos action | 0.5 day |
| **15** | Empty / Error / Loading States | All edge case UI | 0.5 day |
| **16** | Feedback Prompt | "Did you find it?" post-retrieval survey | 0.5 day |
| **17** | Demo Scenario Validation | Verify all 6 scenarios A–F end-to-end | 1 day |
| **18** | Polish & QA | Animations, responsiveness, final review | 1 day |

**Total estimated**: ~14–15 working days for a solo developer. Parallelizable across a team.

---

## Phase 0 — Project Setup

### Goal
Scaffold the project with the right tooling and design system so every subsequent phase builds on a solid foundation.

### Tasks

- [x] Initialize Vite + React + TypeScript project
  ```bash
  npm create vite@latest memory-clue -- --template react-ts
  ```
- [x] Install core dependencies
  ```bash
  npm install zustand react-router-dom idb exifr
  npm install @tensorflow/tfjs @tensorflow-models/mobilenet @tensorflow-models/coco-ssd
  npm install @google/generative-ai
  npm install -D vitest @testing-library/react
  ```
- [x] Set up folder structure
  ```
  src/
    components/        ← UI components
    pages/             ← Route-level pages
    store/             ← Zustand state
    engine/            ← Retrieval engine
    analysis/          ← Photo analysis pipeline
    data/              ← Demo dataset
    hooks/             ← Custom React hooks
    utils/             ← Helpers
    styles/            ← CSS files
    types/             ← TypeScript interfaces
  ```
- [x] Create `src/styles/tokens.css` with all Google Photos design tokens
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
- [x] Add Google Fonts link in `index.html`
- [x] Set up React Router with routes for `/demo` and `/my-photos`
- [x] Set up Zustand store skeleton (`src/store/appStore.ts`)
- [x] Configure path aliases in `vite.config.ts`
- [x] Create `src/types/index.ts` with all TypeScript interfaces
  - `Photo`, `RetrievalResult`, `ReasonChip`, `ClueChain`, `ClueStep`, `AppState`

### Exit Criteria
- App runs at `localhost:5173`
- All routes are accessible
- Design tokens applied globally
- TypeScript compiles with no errors

---

## Phase 1 — UI Shell

### Goal
Build the foundational Google Photos–like UI layout that all features will live inside. No logic — just the skeleton.

### Tasks

#### 1.1 App Shell & Mode Selector
- [x] `<AppShell>` — top-level layout with header + content area
- [x] `<ModeSelector>` — landing screen with two cards
  - "Demo Photos" — curated dataset
  - "My Photos" — upload your own
- [x] Header component matching Google Photos style
  - Logo / app name
  - Search bar (inactive placeholder)
  - Avatar placeholder

#### 1.2 Photo Grid
- [x] `<PhotoGrid>` — masonry/CSS grid layout
- [x] `<PhotoCard>` — individual photo tile
  - Thumbnail image
  - Hover state (slight overlay, checkmark)
  - Selection state (checkmark circle, blue border)
  - Long-press / right-click detection
- [x] Responsive grid: 2 cols mobile → 4 cols tablet → 6 cols desktop

#### 1.3 Navigation
- [x] Bottom tab bar (mobile) or left sidebar (desktop)
  - Photos
  - Search
  - (My Photos mode) Library indicator
- [x] Back navigation

#### 1.4 Search Bar
- [x] Expandable search bar (Google Photos style)
- [x] Placeholder: "Search your photos"
- [x] Clear button
- [x] Keyboard: Enter triggers search

### Deliverables
- Pixel-accurate Google Photos–like layout (dark mode)
- Responsive photo grid with hover/selection states
- Navigation between demo and my-photos modes

### Exit Criteria
- UI matches Google Photos aesthetic at first glance
- Grid renders with placeholder images (lorem picsum or similar)
- Navigation works between all routes

---

## Phase 2 — Demo Dataset

### Goal
Create a rich, curated mock photo dataset with all metadata needed to power all 6 demo scenarios.

### Tasks

#### 2.1 Design Event Clusters

| Event ID | Name | Date | Location | Purpose |
|---|---|---|---|---|
| `goa-2024` | Goa Trip March 2024 | Mar 10–13, 2024 | Goa, India | Scenarios B, F |
| `med-2023` | Medicine 2023 | Aug 2023 | Mumbai | Scenarios A, E |
| `med-2025` | Medicine 2025 | Feb 2025 | Mumbai | Scenarios A, E |
| `birthday-2024` | Rahul's Birthday | Nov 2024 | Pune | Scenarios C, D |
| `doc-2022` | Document 2022 | Jun 2022 | Delhi | Scenario E |
| `doc-2024` | Document 2024 | Sep 2024 | Delhi | Scenario E |
| `hotel-goa` | Hotel — Goa Trip | Mar 10, 2024 | Goa | Scenario F |

#### 2.2 Generate Demo Images
- [x] Generate or source ~50 demo images covering:
  - Medicine/pill packaging (2 time periods)
  - Restaurant (Goa)
  - Beach (Goa)
  - Hotel room (Goa)
  - Birthday party (indoor, outdoor)
  - Documents / scanned papers
  - Miscellaneous (car, food, nature)
- [x] Resize all to 800×600 max, optimize for web
- [x] Store in `public/demo-photos/`

#### 2.3 Build Dataset JSON
- [x] Create `src/data/demoPhotos.ts` with full `Photo[]` array
- [x] Each photo includes:
  - `id`, `imageUrl`, `thumbnailUrl`
  - `dateTime`, `latitude`, `longitude`, `locationName`
  - `objects[]`, `labels[]`, `ocrText`
  - `description` (written manually for demo)
  - `eventId`, `eventName`, `tripId`
  - `neighborIds[]` (photos taken within ±30 min)
  - `people[]`
  - Pre-computed mock `embedding` (128-dim random unit vectors seeded by category — similar photos get similar vectors)

#### 2.4 Embedding Seeding Strategy
For the demo dataset, generate embeddings that encode the scenario relationships:
```typescript
// Photos in same category share base vector + small noise
const MEDICINE_BASE = randomUnitVector(seed=42)
const GOA_BASE = randomUnitVector(seed=99)

// medicine-2023 embedding ≈ medicine-2025 embedding (high cosine similarity)
// goa-restaurant embedding ≠ goa-beach embedding (low visual similarity)
// but they share eventId, tripId, locationName, dateTime proximity
```

### Deliverables
- `src/data/demoPhotos.ts` — complete typed dataset
- ~50 demo images in `public/demo-photos/`
- Verified: all 6 scenario relationships encoded in data

### Exit Criteria
- Demo dataset loads in app
- PhotoGrid renders all demo photos
- Event clusters correctly group photos
- Cross-year medicine photos have high embedding cosine similarity (> 0.85)

---

## Phase 3 — Search

### Goal
Implement keyword search across the demo dataset so users can discover their first clue photo.

### Tasks

#### 3.1 Search Index Builder
- [x] Create `src/engine/searchIndex.ts`
  ```typescript
  buildIndex(photos: Photo[]): SearchIndex
  searchIndex(index: SearchIndex, query: string): ScoredPhoto[]
  ```
- [x] Inverted index over: `objects`, `labels`, `ocrText`, `description`, `locationName`, `eventName`, `filename`
- [x] TF scoring (term frequency across fields, weighted by field importance)
  - `description`: 1.5×
  - `objects`: 1.3×
  - `labels`: 1.2×
  - `locationName`, `eventName`: 1.1×
  - `ocrText`, `filename`: 1.0×

#### 3.2 Search UI
- [x] Connect `<SearchBar>` to search engine
- [x] Debounce input: 300ms
- [x] Show results in `<PhotoGrid>` below search bar
- [x] Show result count: "12 photos"
- [x] Clear search → show all photos

#### 3.3 Test Queries
Verify these queries return relevant results:
- `"medicine"` → med-2023, med-2025 photos
- `"goa"` → goa-2024 photos
- `"birthday"` → birthday-2024 photos
- `"beach"` → goa beach photos
- `"document"` → doc-2022, doc-2024 photos
- `"restaurant"` → goa restaurant photos

### Exit Criteria
- Search returns relevant results for all test queries
- Results appear within 100ms
- Clearing search restores full grid

---

## Phase 4 — Photo Selection & Context Menu

### Goal
Implement photo selection state and the ⋮ context menu with the "Use this photo as a clue" entry point.

### Tasks

#### 4.1 Selection State
- [x] Single-tap → select photo (checkmark appears, photo highlighted)
- [x] Tap again → deselect
- [x] Only one photo selected at a time (for clue triggering)
- [x] Selected state stored in Zustand: `selectedPhotoId`

#### 4.2 Context Menu (⋮)
- [x] `<ContextMenu>` component — floating menu, Google Photos style
- [x] Trigger: ⋮ icon visible on hover (desktop) or after tap (mobile)
- [x] Menu items:
  ```
  Share
  Add to album
  Download
  ──────────────────────
  ✦ Use this photo as a clue     ← NEW (highlighted)
  ```
- [x] "Use this photo as a clue" text has subtle accent color (`--gp-primary`)
- [x] Close menu on outside click / Escape key

#### 4.3 Entry Point Wiring
- [x] "Use this photo as a clue" → sets `activeClueId` in store → opens ClueChoiceSheet
- [x] Animate menu close before sheet opens (100ms delay)

### Exit Criteria
- Context menu appears on ⋮ click for any photo
- Existing actions (Share, Download, etc.) visible but non-functional (MVP scope)
- "Use this photo as a clue" correctly sets clue and opens sheet

---

## Phase 5 — Clue Choice Sheet

### Goal
Build the bottom sheet that lets users choose their retrieval strategy.

### Tasks

#### 5.1 Bottom Sheet Component
- [x] `<BottomSheet>` — slides up from bottom, backdrop overlay
- [x] Drag-to-dismiss on mobile
- [x] Click backdrop to dismiss
- [x] Smooth CSS animation: `transform: translateY` + `opacity`
- [x] Border radius 16px top corners

#### 5.2 Clue Choice Sheet Content
- [x] Show clue photo thumbnail (small, 60×60px, rounded)
- [x] Title: **"Use this photo as a clue"**
- [x] Supporting text: *"What do you think this photo tells you about the memory you're looking for?"*
- [x] Three option cards, each with:
  - Icon
  - Title
  - Short description
  - Tap → triggers retrieval

| Option | Icon | Title | Description |
|---|---|---|---|
| similar | 🔍 | Search similar to this photo | Find photos that look like this |
| memory | 📍 | Search around this memory | Find photos connected to this moment, place, people or event |
| best | ✨ | Let Photos find the best match | Use the clues most likely to find what you're looking for |

#### 5.3 Wiring
- [x] Each option tap → sets `selectedMode` in store → closes sheet → triggers retrieval → navigates to results

### Exit Criteria
- Sheet slides up smoothly after "Use this photo as a clue" is tapped
- Clue photo thumbnail visible in sheet
- All 3 options tappable and correctly set mode

---

## Phase 6 — Retrieval Engine: Search Similar

### Goal
Implement visual/semantic similarity retrieval. Cross-year retrieval must work.

### Tasks

#### 6.1 Core Scoring Function
- [x] Create `src/engine/retrieveSimilar.ts`
- [x] Implement cosine similarity for embedding vectors
  ```typescript
  function cosineSimilarity(a: number[], b: number[]): number
  ```
- [x] Implement Jaccard similarity for object/label arrays
  ```typescript
  function jaccardSimilarity(a: string[], b: string[]): number
  ```
- [x] Implement OCR text overlap (token-level)
- [x] Combine into weighted score:
  ```
  score = visual_sim × 0.50
        + object_sim × 0.25
        + semantic_sim × 0.20
        + context_sim × 0.05
  ```

#### 6.2 Cross-Year Constraint
- [x] **Explicitly exclude date from this scoring formula**
- [x] Write a test: medicine-2023 clue → medicine-2025 should appear in top 3

#### 6.3 Reason Chip Generation
- [x] For each result, determine which signals contributed most:
  ```typescript
  function generateSimilarReasons(clue: Photo, result: Photo, scores: SignalScores): ReasonChip[]
  ```
  Examples: "Similar appearance", "Similar object", "Similar text", "Similar packaging"

#### 6.4 Wiring
- [x] Connect to results display (placeholder until Phase 9)
- [x] `retrieveSimilar(clueId, dataset)` called when mode = 'similar'

### Tests
- [x] medicine-2023 → medicine-2025 appears (cross-year)
- [x] medicine photo → beach photo does NOT appear (unrelated)
- [x] doc-2022 → doc-2024 appears

### Exit Criteria
- Retrieval returns ranked results with reason chips
- Cross-year scenarios work correctly

---

## Phase 7 — Retrieval Engine: Search Around Memory

### Goal
Implement contextual memory retrieval. Photos from same trip/event should score highly even if visually different.

### Tasks

#### 7.1 Core Scoring Function
- [x] Create `src/engine/retrieveMemory.ts`
- [x] Implement temporal proximity scoring (Gaussian decay)
  ```typescript
  function temporalScore(clue: Date, candidate: Date, σHours = 4): number {
    const Δh = Math.abs(clue - candidate) / 3600000
    return Math.exp(-(Δh ** 2) / (2 * σ ** 2))
  }
  ```
- [x] Implement location proximity (Haversine distance)
  ```typescript
  function locationScore(clue: LatLng, candidate: LatLng): number {
    const km = haversine(clue, candidate)
    return Math.exp(-km / 10)
  }
  ```
- [x] Implement event/cluster match
  ```typescript
  function eventScore(clue: Photo, candidate: Photo): number {
    if (clue.eventId === candidate.eventId) return 1.0
    if (clue.tripId === candidate.tripId) return 0.6
    return 0.0
  }
  ```
- [x] Implement people overlap (Jaccard on people[])
- [x] Combine:
  ```
  score = event_score × 0.30
        + temporal_score × 0.25
        + location_score × 0.20
        + people_score × 0.15
        + visual_score × 0.10
  ```

#### 7.2 Reason Chip Generation
- [x] Assign reason chips based on dominant scoring signal:
  - `event_score` dominant → "Same Goa trip", "Same event"
  - `temporal_score` dominant → "Taken 42 minutes from your clue"
  - `location_score` dominant → "Same location"
  - `people_score` dominant → "Same people"

#### 7.3 Key Scenario Test
- [x] Goa restaurant (clue) → Goa beach (target): target must appear in top 5
- [x] Both photos are visually very different (low cosine similarity)
- [x] They share: `eventId = 'goa-2024'`, `tripId = 'goa-2024'`, same `locationName`, same day

### Exit Criteria
- Contextual retrieval surfaces visually-different-but-contextually-related photos
- Reason chips reflect the actual relationship (event, time, location, people)

---

## Phase 8 — Retrieval Engine: Best Match (Local)

### Goal
Implement adaptive local scoring for Best Match mode (before Gemini integration in Phase 13).

### Tasks

#### 8.1 Signal Strength Analysis
- [x] Create `src/engine/analyzeClueSignals.ts`
- [x] For a given clue photo, assess which signals are "strong":
  ```typescript
  interface SignalStrength {
    hasEmbedding: boolean
    hasLocation: boolean
    hasEvent: boolean
    hasPeople: boolean
    hasOCR: boolean
    dominantSignal: 'visual' | 'contextual' | 'balanced'
  }
  ```

#### 8.2 Adaptive Weight Calculation
- [x] Based on signal strength, compute weights dynamically:
  ```
  if dominantSignal === 'visual' (medicine, document):
    visual × 0.45, object × 0.30, semantic × 0.20, context × 0.05

  if dominantSignal === 'contextual' (trip, event):
    event × 0.30, temporal × 0.25, location × 0.25, people × 0.15, visual × 0.05

  if balanced:
    visual × 0.25, object × 0.20, event × 0.20, temporal × 0.15,
    location × 0.10, people × 0.10
  ```

#### 8.3 Combined Scoring
- [x] Run all signal computations
- [x] Apply adaptive weights
- [x] Return top-K candidates with per-signal breakdown (for Gemini prompt in Phase 13)

#### 8.4 Local Reason Chip Generation
- [x] Use top contributing signals to generate reason chips
- [x] "Strong visual + contextual match" for balanced cases

### Exit Criteria
- Contextual/visual/balanced adaptive weights dynamically selected
- Best Match (local) returns sensible top-10 for all demo scenarios
- Medicine clue → visual signals dominate
- Trip clue → contextual signals dominate

---

## Phase 9 — Results Experience

### Goal
Build the results display: Google Photos–style grid with reason chips and context headers.

### Tasks

#### 9.1 Results Grid
- [x] `<ResultsGrid>` — full-screen grid view
- [x] Header shows:
  ```
  Results related to your clue
  [Clue thumbnail] Search similar to this photo
  ```
- [x] Clue photo thumbnail visible in header (small, 40×40px)
- [x] Mode label shown: "Similar photos", "Memory results", "Best matches"

#### 9.2 Result Card
- [x] `<ResultCard>` — extends `<PhotoCard>` with reason chip
- [x] Reason chip displayed below/over thumbnail:
  - Small pill label: "Same Goa trip"
  - Subtle, not intrusive (opacity 0.85)
  - Color coded by type:
    - Visual → blue chip
    - Temporal → amber chip
    - Location → green chip
    - People → purple chip
    - Event → teal chip

#### 9.3 Best Match Explanations
- [x] For Best Match mode, show a slightly larger explanation under each card:
  - "Taken 35 minutes after your clue"
  - "Similar medicine packaging"
  - "Same location"

#### 9.4 Result Count
- [x] Show: "8 related photos found"
- [x] Show: "0 results" with empty state UI (Phase 15)

#### 9.5 Re-use as Clue
- [x] Each result card has the same ⋮ menu
- [x] "Use this photo as a clue" available on results
- [x] This is the entry point for clue chaining (Phase 10)

### Exit Criteria
- Results grid renders correctly for all 3 modes
- Reason chips visible and correctly typed
- Clue context visible in header

---

## Phase 10 — Clue Chaining

### Goal
Allow users to select a result photo and use it as a new clue, supporting iterative memory reconstruction.

### Tasks

#### 10.1 Clue Chain Data Structure
- [x] Add `ClueChain` to Zustand store
  ```typescript
  interface ClueChain {
    id: string
    steps: ClueStep[]
  }
  interface ClueStep {
    stepIndex: number
    cluePhotoId: string
    mode: RetrievalMode
    resultIds: string[]
    timestamp: Date
  }
  ```
- [x] When user selects "Use this photo as a clue" from a result → append new step to chain

#### 10.2 Breadcrumb UI
- [x] `<ClueBreadcrumb>` — appears above results when chain depth > 1
  ```
  Search → [medicine-2023] Similar → [medicine-2025] Memory → Results
  ```
- [x] Each step is clickable → navigate back to that step's results
- [x] Keep compact (single line, truncate if too long)
- [x] Do not show on first clue (chain depth = 1)

#### 10.3 Exclusion Logic
- [x] When chaining, add previous clue photo to `excludeIds`
- [x] Slightly penalize (−0.1) photos already seen in previous results
- [x] Ensures new results skew toward fresh discoveries

#### 10.4 Chain Reset
- [x] New search from search bar → resets chain
- [x] "Start over" button in breadcrumb → resets chain
- [x] Back to mode selector → resets chain

### Tests
- [x] Scenario D: 2-hop chain works end-to-end
- [x] Breadcrumb shows correct step labels
- [x] Step 2 results exclude step 1's clue photo

### Exit Criteria
- Users can chain clues at least 3 hops deep
- Breadcrumb accurately tracks the path
- Results refresh correctly at each hop

---

## Phase 11 — My Photos: Import & Processing

### Goal
Let users upload their own photos and have them analyzed locally in the browser.

### Tasks

#### 11.1 Import Screen
- [x] `<ImportScreen>` page for My Photos mode
- [x] Large drop zone + "Add photos" button
- [x] File picker: `accept="image/*"`, `multiple`
- [x] Show selected count: "47 photos selected"
- [x] Privacy disclosure text:
  ```
  🔒 Your photos stay on this device.
     Images are analyzed locally in your browser.
     Only text descriptions are sent to Google AI
     when you use "Let Photos find the best match."
  ```
- [x] "Continue" button → starts processing

#### 11.2 File Validation
- [x] `src/analysis/validateFile.ts`
- [x] Accept: JPEG, JPG, PNG, WEBP, GIF (first frame)
- [x] Reject: files > 50MB with per-file error message
- [x] Reject: unsupported formats gracefully
- [x] Continue processing valid files even if some fail

#### 11.3 EXIF Extraction
- [x] `src/analysis/extractExif.ts` using `exifr`
- [x] Extract: `DateTimeOriginal`, `GPSLatitude`, `GPSLongitude`, `Make`, `Model`
- [x] Fallback: use file `lastModified` if no EXIF date
- [x] Handle gracefully: no GPS → `latitude: null`, `longitude: null`

#### 11.4 Image Resizing
- [x] `src/analysis/resizeImage.ts`
- [x] 224×224 for embedding input
- [x] 400px wide for thumbnail (maintain aspect ratio)
- [x] Use `OffscreenCanvas` / `createImageBitmap`

#### 11.5 Visual Embedding
- [x] `src/analysis/generateEmbedding.ts`
- [x] Load MobileNet model once (lazy-loaded on first use)
- [x] Generate 1024-dim embedding per photo
- [x] Store as `Float32Array` in IndexedDB
- [x] Show model loading indicator on first run

#### 11.6 Object & Label Detection
- [x] `src/analysis/detectObjects.ts` using COCO-SSD
- [x] Return top-5 objects with confidence > 0.5
- [x] Map COCO labels to user-friendly names

#### 11.7 OCR (Optional)
- [x] `src/analysis/extractText.ts` using Tesseract.js / heuristics
- [x] Run only if image likely contains text (heuristic check)
- [x] Lazy-load Tesseract worker / heuristic text detector
- [x] Store extracted text in `ocrText` field

#### 11.8 Event Clustering
- [x] `src/analysis/clusterPhotos.ts`
- [x] Group by temporal proximity: same day + within 2 hours → same event
- [x] Group by location: within 2km on same day → same location cluster
- [x] Multi-day same location → trip cluster
- [x] Assign `eventId`, `eventName`, `tripId`, `neighborIds`

#### 11.9 Search Index
- [x] Build inverted index after all photos processed
- [x] Same `buildIndex()` function from Phase 3 (shared)

#### 11.10 Processing Progress UI
- [x] `<ProcessingScreen>` with animated progress
  ```
  Preparing your photos
  ✓ Photos imported (47 photos)
  ⟳ Analyzing dates and locations...
  ```
- [x] Stages update in real-time as pipeline runs
- [x] Process in batches of 5 to avoid memory issues
- [x] Show: "Analyzed N of M photos"

#### 11.11 IndexedDB Storage
- [x] `src/storage/photoDb.ts` using `idb` wrapper
- [x] Stores: raw Blobs, metadata JSON, embedding Float32Arrays
- [x] Schema versioning for upgrades

### Exit Criteria
- [x] User can import 20+ photos at once
- [x] All 9 pipeline stages run successfully
- [x] Processing screen shows real-time progress
- [x] Photos appear in library grid after processing
- [x] EXIF dates / GPS extracted correctly where available

---

## Phase 12 — My Photos: Search & Retrieval

### Goal
Connect the same retrieval engine to user-imported photos.

### Tasks

- [x] `searchPhotos(query, dataset: 'user')` → searches user photo index
- [x] `retrieveSimilar(clueId, dataset: 'user')` → uses user embeddings
- [x] `retrieveMemory(clueId, dataset: 'user')` → uses user event clusters
- [x] `retrieveBestMatch(clueId, dataset: 'user')` → adaptive + Gemini (Phase 13)
- [x] Ensure engine is dataset-agnostic (same code, different data source)
- [x] Test with a set of 20 personal-style photos (varied content)

### Exit Criteria
- [x] Full flow works end-to-end on user-uploaded photos
- [x] All 3 retrieval modes return results on real photos
- [x] No crashes on photos missing metadata

---

## Phase 13 — Gemini Integration (Best Match)

### Goal
Connect Best Match mode to Gemini API for intelligent re-ranking and explanation generation.

### Tasks

#### 13.1 Gemini & Groq Client
- [x] `src/engine/geminiClient.ts` & `src/engine/groqClient.ts`
- [x] Use `@google/generative-ai` & Groq OpenAI-compatible API
- [x] Model: `gemini-1.5-flash` or `llama-3.3-70b-versatile` / `llama-3.1-8b-instant`
- [x] API keys from environment variables `VITE_GEMINI_API_KEY` or `VITE_GROQ_API_KEY`
- [x] **Never send raw images** — send only text descriptions + metadata

#### 13.2 Prompt Construction
- [x] Build prompt from clue + top-20 local candidates
- [x] Include: description, objects, labels, locationName, eventName, dateTime, localScore
- [x] Request: ranked IDs + short reason strings (max 6 words each)
- [x] Parse JSON response with validation

#### 13.3 API Call in Best Match
- [x] After local scoring → take top-20 candidates
- [x] Send to Gemini / Groq for re-ranking
- [x] Show loading state: "Photos is finding the best matches…"
- [x] On success: display AI-ranked results with AI-generated reasons
- [x] On failure: fall back to local scores + generic chips

#### 13.4 Rate Limiting & Error Handling
- [x] Debounce repeated calls (min 500ms between requests)
- [x] Retry once on 429/503
- [x] Clear error message if API unavailable: "Best match is temporarily unavailable. Using local analysis instead."

#### 13.5 Disclosure
- [x] Before first Best Match API call, show one-time disclosure:
  ```
  To find the best match, Google AI will analyze descriptions 
  of your photos (not the images themselves).
  [OK] [Use local search instead]
  ```

### Exit Criteria
- [x] Gemini / Groq re-ranks correctly for demo scenarios C
- [x] Reason strings are concise and human-readable
- [x] Graceful fallback when API is offline
- [x] API key not exposed in frontend (use env var)


---

## Phase 14 — Privacy & Data Management

### Goal
Implement all privacy-related UI and data management actions.

### Tasks

#### 14.1 Privacy Indicators
- [x] Persistent privacy badge in My Photos header: "🔒 Photos stored locally"
- [x] Tooltip: "Your photos are only used for this prototype session"
- [x] Gemini / Groq API disclosure (Phase 13.5 already covers this)

#### 14.2 Clear My Photos
- [x] Prominent "Clear my photos" button in My Photos header/settings
- [x] Confirmation dialog:
  ```
  Clear all photos?
  This will remove all your imported photos and 
  associated data from this device.
  [Cancel] [Clear photos]
  ```
- [x] On confirm:
  1. Delete all Blobs from IndexedDB
  2. Delete all metadata from IndexedDB
  3. Clear embedding matrix from memory
  4. Reset search index
  5. Reset Zustand store (user photos)
  6. Navigate to import screen
  7. Show toast: "Your photos have been removed"

#### 14.3 Session Expiry Notice
- [x] On page load, if user photos exist in IndexedDB: show notice
  ```
  You have 47 photos from your last session.
  [Continue] [Clear and start fresh]
  ```

### Exit Criteria
- [x] Clear action removes ALL user data with no trace
- [x] Privacy badge visible at all times in My Photos mode
- [x] Session restore notice works correctly

---

## Phase 15 — Empty / Error / Loading States

### Goal
Gracefully handle all failure and empty conditions.

### Tasks

#### 15.1 Empty Search Results
- [x] Structured empty state with icon and guidance:
  ```
  🔍 No photos found for "xyz"
  Try a different search term.
  ```

#### 15.2 No Retrieval Results
- [x] Recovery actions and clear guidance:
  ```
  We couldn't find a strong match.
  Try another clue photo or a different search approach.

  [Try another clue]  [Search again]
  ```

#### 15.3 Processing Error (single photo)
- [x] Show per-photo error badge in import queue
- [x] Message: "Couldn't analyze this photo" (with filename)
- [x] Continue processing other photos

#### 15.4 API Unavailable (Gemini / Groq)
- [x] Fallback silently to local scoring
- [x] Show subtle dismissible notice: "Best match is temporarily unavailable. Using local analysis instead."

#### 15.5 Loading States
- [x] Search → skeleton grid animation while searching
- [x] Retrieval → spinner inside results header: "Finding related photos…"
- [x] Best Match → "Photos is finding the best matches…" with animated dots
- [x] Import processing → animated progress (Phase 11.10)

#### 15.6 Unsupported File
- [x] Per-file toast: "filename.heic — format not supported"
- [x] Continue with rest

#### 15.7 No Photos Imported
- [x] Structured import prompt and add button:
  ```
  Import some photos to get started.
  [Add photos]
  ```

### Exit Criteria
- [x] Every error state has a clear message and recovery action
- [x] No state leaves the user stranded
- [x] Loading states are animated and feel Google-like

---

## Phase 16 — Feedback Prompt

### Goal
Collect lightweight post-retrieval feedback to measure hypothesis validation.

### Tasks

#### 16.1 Feedback Trigger
- [x] After user views results for > 10 seconds OR taps a result photo
- [x] Show non-intrusive prompt at bottom of results screen:
  ```
  Did you find the photo you were looking for?
  [Yes ✓]  [Not yet]  [I'm not sure]
  ```

#### 16.2 Follow-up (on "Yes")
- [x] Secondary prompt:
  ```
  What helped you find it?
  ☐ Similar appearance     ☐ Same place
  ☐ Same event             ☐ Same people
  ☐ Nearby in time         ☐ Another clue photo
  ☐ Best Match
  [Done]
  ```

#### 16.3 Follow-up (on "Not yet")
- [x] Show next-step suggestions:
  ```
  Keep going:
  [Try another clue]  [Change search approach]  [Start new search]
  ```

#### 16.4 Feedback Storage
- [x] Store in `localStorage` (session-level)
- [x] Structure: `{ timestamp, mode, chainDepth, success, helpfulSignals[] }`
- [x] Display aggregate in a simple debug panel (dev mode only)

### Exit Criteria
- [x] Feedback prompt appears after retrieval
- [x] Both flows (Yes / Not yet) have correct next actions
- [x] Feedback stored and accessible

---

## Phase 17 — Demo Scenario Validation

### Goal
Run all 6 required demo scenarios end-to-end and confirm they work correctly.

### Validation Checklist

#### Scenario A — Cross-year visual similarity
- [x] Search "medicine" → 2023 medicine photo appears in results
- [x] Select → Use as clue → Search Similar
- [x] 2025 medicine photo appears in top 5 results
- [x] Reason chip: "Similar appearance" or "Similar packaging"

#### Scenario B — Same memory, different visual appearance
- [x] Search "goa" → Goa restaurant photo appears
- [x] Select → Use as clue → Search Around This Memory
- [x] Goa beach photo appears in top 5
- [x] Beach and restaurant photos have low visual similarity (cosine < 0.5)
- [x] Reason chip: "Same Goa trip"

#### Scenario C — AI best match
- [x] Select a photo with both visual + contextual signals
- [x] Use as clue → Let Photos find the best match
- [x] Gemini re-ranks and returns reason strings
- [x] Reasons are human-readable and accurate

#### Scenario D — Clue chaining
- [x] Search → Clue A → results → select Clue B → results → target
- [x] Breadcrumb shows both hops correctly
- [x] Target photo accessible at step 2

#### Scenario E — Different year
- [x] doc-2022 as clue → Search Similar → doc-2024 appears
- [x] Cross-year retrieval confirmed

#### Scenario F — Same context, different appearance
- [x] Hotel-Goa as clue → Search Around Memory → Goa beach appears
- [x] Both share trip/event/location
- [x] Visually very different (confirmed by low cosine score)

### Exit Criteria
- [x] All 6 scenarios pass manually
- [x] Results for A, E appear cross-year (confirmed)
- [x] Results for B, F are visually different but contextually related (confirmed)
- [x] Breadcrumb works for D

---

## Phase 18 — Polish & QA

### Goal
Final pass on animations, responsiveness, accessibility, and overall feel.

### Tasks

#### 18.1 Animations
- [x] Bottom sheet: smooth slide-up (300ms ease)
- [x] Photo selection: checkmark fade-in (150ms)
- [x] Context menu: fade + scale (150ms)
- [x] Results grid: staggered card entrance (50ms per card)
- [x] Processing steps: typewriter-style reveal
- [x] Reason chips: fade-in after image loads

#### 18.2 Responsiveness
- [x] Mobile (< 640px): 2-col grid, full-screen sheet
- [x] Tablet (640–1024px): 3-col grid, bottom sheet
- [x] Desktop (> 1024px): 4–6 col grid, centered modal or side panel

#### 18.3 Accessibility
- [x] All interactive elements have `aria-label`
- [x] Keyboard navigation: Tab, Enter, Escape work everywhere
- [x] Focus management: after sheet opens, focus first option
- [x] Color contrast meets WCAG AA

#### 18.4 Performance
- [x] TF.js model loaded lazily (not on initial page load)
- [x] Demo photos use `loading="lazy"` on `<img>`
- [x] Large photo Blobs accessed via object URLs (not base64)
- [x] Debounce search input (300ms)
- [x] Batch process photos in groups of 5

#### 18.5 Final QA Checklist
- [x] Both Demo Photos and My Photos flows work end-to-end
- [x] All 3 retrieval modes return correct results
- [x] Clue chaining works for 2+ hops
- [x] All 6 demo scenarios validated
- [x] Clear My Photos removes all data
- [x] Feedback prompt appears and stores responses
- [x] App works on Chrome, Safari, Firefox (latest)
- [x] App works on iOS Safari and Android Chrome
- [x] No console errors in production build

---

## Dependency Graph

```
Phase 0 (Setup)
    │
    ▼
Phase 1 (UI Shell)
    │
    ├──► Phase 2 (Demo Dataset)
    │         │
    │         ▼
    │    Phase 3 (Search)
    │         │
    │         ▼
    │    Phase 4 (Selection + Menu)
    │         │
    │         ▼
    │    Phase 5 (Clue Choice Sheet)
    │         │
    │    ┌────┼──────┐
    │    │    │      │
    │    ▼    ▼      ▼
    │   Ph6  Ph7   Ph8
    │ (Sim)(Mem)(Best)
    │    │    │      │
    │    └────┴──────┘
    │         │
    │         ▼
    │    Phase 9 (Results)
    │         │
    │         ▼
    │    Phase 10 (Clue Chaining)
    │
    ├──► Phase 11 (My Photos Import)
    │         │
    │         ▼
    │    Phase 12 (My Photos Retrieval)
    │
    ├──► Phase 13 (Gemini) ──► depends on Ph8
    │
    ├──► Phase 14 (Privacy)
    │
    ├──► Phase 15 (Error States)
    │
    ├──► Phase 16 (Feedback)
    │
    ▼
Phase 17 (Scenario Validation) ──► depends on ALL above
    │
    ▼
Phase 18 (Polish & QA)
```

---

## Parallelization (Team)

If working across multiple engineers simultaneously:

| Track | Phases | Engineer |
|---|---|---|
| **UI / Design** | 0, 1, 4, 5, 9, 15 | Frontend/Design |
| **Data & Search** | 2, 3, 11, 12 | Data/ML |
| **Retrieval Engine** | 6, 7, 8, 10 | Backend/Algorithm |
| **AI Integration** | 13 | AI/API |
| **Privacy & QA** | 14, 16, 17, 18 | QA/PM |

Phases 6, 7, 8 can be developed in parallel after Phase 2 is done.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TF.js MobileNet too slow on mobile | Medium | High | Lazy-load; show progress; use lighter model |
| Demo embeddings not similar enough for Scenario A/E | Medium | High | Pre-compute and validate embeddings in Phase 2 |
| Gemini API rate limits during demo | Low | Medium | Implement fallback to local scoring |
| HEIC format not supported on all browsers | High | Low | Skip with friendly message; focus on JPEG/PNG |
| OCR increases processing time significantly | Medium | Low | Make OCR opt-in or disable by default for MVP |
| IndexedDB quota exceeded (many large photos) | Low | Medium | Limit import to 200 photos; warn at 150 |
| Clue chaining UX confusing | Medium | Medium | Keep breadcrumb simple; test with real users |

---

## Definition of Done

The MVP is complete when:

1. ✅ Both Demo Photos and My Photos modes are fully functional
2. ✅ All 3 retrieval strategies return relevant, explainable results
3. ✅ All 6 demo scenarios (A–F) pass end-to-end
4. ✅ Clue chaining works for 2+ hops with breadcrumb
5. ✅ User photos analyzed locally with no silent uploads
6. ✅ "Clear my photos" removes all data
7. ✅ Feedback prompt captures success/failure signal
8. ✅ UI looks and feels like a native Google Photos feature
9. ✅ Gemini Best Match works (with graceful fallback)
10. ✅ The ultimate question is answerable:

> **Can a user find a photo they cannot describe by starting from a photo they can recognize?**
