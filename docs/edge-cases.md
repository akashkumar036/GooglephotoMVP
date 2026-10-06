# Memory Clue — Edge Cases & Corner Scenarios

> **Product**: Memory Clue — Google Photos MVP Prototype  
> **Purpose**: Exhaustive catalogue of edge cases, corner scenarios, failure modes, and boundary conditions across every layer of the system.  
> **How to use**: Reference during implementation (Phase 6–18), QA testing, and code review.

---

## Table of Contents

1. [Photo Import & File Handling](#1-photo-import--file-handling)
2. [EXIF & Metadata Extraction](#2-exif--metadata-extraction)
3. [Visual Embedding & ML Models](#3-visual-embedding--ml-models)
4. [OCR & Text Extraction](#4-ocr--text-extraction)
5. [Event & Cluster Detection](#5-event--cluster-detection)
6. [Search](#6-search)
7. [Retrieval — Search Similar](#7-retrieval--search-similar)
8. [Retrieval — Search Around Memory](#8-retrieval--search-around-memory)
9. [Retrieval — Best Match (Local + Gemini)](#9-retrieval--best-match-local--gemini)
10. [Reason Chip Generation](#10-reason-chip-generation)
11. [Clue Chaining](#11-clue-chaining)
12. [Demo Dataset](#12-demo-dataset)
13. [My Photos Mode](#13-my-photos-mode)
14. [IndexedDB & Storage](#14-indexeddb--storage)
15. [Gemini API Integration](#15-gemini-api-integration)
16. [UI & Interaction](#16-ui--interaction)
17. [Performance & Memory](#17-performance--memory)
18. [Privacy & Data Lifecycle](#18-privacy--data-lifecycle)
19. [Cross-browser & Device](#19-cross-browser--device)
20. [Feedback Prompt](#20-feedback-prompt)
21. [Demo Scenario Edge Cases](#21-demo-scenario-edge-cases)

---

## 1. Photo Import & File Handling

### 1.1 File Type Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User uploads a `.heic` file (iPhone default) | Attempt decode with polyfill; gracefully skip with per-file error if unsupported |
| User uploads a `.webp` file | Process normally |
| User uploads a `.gif` file | Extract and process first frame only; show note "Animated GIFs: first frame used" |
| User uploads a `.bmp` or `.tiff` file | Show: "Format not supported. Try JPEG or PNG." Continue with other files |
| User uploads a PDF accidentally | Reject immediately with clear error: "PDFs are not supported. Select image files only." |
| User uploads a video file (`.mp4`, `.mov`) | Reject with: "Videos are not supported in this prototype." |
| User uploads a file with no extension | Attempt MIME type sniffing from file header; process if image, reject otherwise |
| User uploads a file named `photo.jpg` that is actually a PNG | Detect by magic bytes, process as PNG |
| User uploads a corrupt/truncated image file | Catch decode error, mark photo with error badge, continue batch |
| User uploads the same photo twice | Detect by filename + size + lastModified; deduplicate silently or warn: "2 duplicate photos skipped" |

### 1.2 File Size Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Single file > 50MB | Skip with per-file warning: "filename.jpg is too large (52MB). Max size is 50MB." |
| Total import batch > 500MB | Warn before processing: "Large import (520MB). Processing may take a few minutes." Allow continuation |
| Single file is 0 bytes (empty) | Reject with: "filename.jpg appears to be empty." |
| File is exactly 50MB (boundary) | Accept and process |
| 1000+ photos imported at once | Process in batches of 5; show count "Analyzed 247 of 1,032 photos"; complete without crash |

### 1.3 Batch Import Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User cancels file picker without selecting | No action, stay on import screen |
| User selects 1 photo | Process normally, no special messaging |
| User selects 0 photos (e.g., clears selection in picker) | No action |
| User imports photos, then imports more (second batch) | Append to existing collection; do not replace |
| User imports photos while previous batch is still processing | Queue second batch; start processing after first completes OR process concurrently with clear progress separation |
| Network connection drops mid-import (for future remote processing) | All local processing continues unaffected |

---

## 2. EXIF & Metadata Extraction

### 2.1 Missing Metadata

| Scenario | Expected Behavior |
|---|---|
| Photo has no EXIF data at all (screenshot, WhatsApp image) | Use `file.lastModified` as fallback date; set `datePrecision: 'approximate'`; proceed without GPS |
| Photo has EXIF but no date field | Use file `lastModified`; mark `datePrecision: 'approximate'` |
| Photo has date but no GPS | Retrieve without location; location signals excluded from scoring |
| Photo has GPS but no date | Use GPS for location scoring; exclude temporal scoring |
| Photo has neither date nor GPS | Process with filename + visual signals only; do not fail |
| Photo has all metadata | Process fully; all signals available |

### 2.2 Corrupt or Invalid Metadata

| Scenario | Expected Behavior |
|---|---|
| EXIF date is `0000:00:00 00:00:00` (invalid) | Treat as missing date; fall back to file `lastModified` |
| EXIF date in the future (e.g., camera clock wrong → 2099) | Accept as-is; do not discard; flag for human review in debug mode |
| EXIF date is Unix epoch 0 (1970-01-01) | Treat as missing; use file `lastModified` |
| GPS coordinates are `0.0, 0.0` (null island) | Treat as missing GPS; do not use for location scoring |
| GPS altitude is extreme (e.g., -10000m) | Ignore altitude; use lat/lng only |
| EXIF contains malformed UTF-8 in description field | Strip non-UTF8 characters; use remaining text |
| EXIF data is partially corrupt | Extract what is available; skip corrupt fields; do not fail |

### 2.3 Metadata Conflicts

| Scenario | Expected Behavior |
|---|---|
| EXIF `DateTimeOriginal` differs from `DateTime` by years | Prefer `DateTimeOriginal`; it reflects capture time |
| Multiple GPS fields conflict | Prefer `GPSLatitude`/`GPSLongitude`; ignore `GPSDestLatitude` |
| Same GPS coordinates for many photos (GPS lock issue) | Process normally; clustering may group them incorrectly but should not crash |
| Photo taken across midnight (late night photos) | Temporal clustering uses actual timestamps; no 24h rollover issue |

---

## 3. Visual Embedding & ML Models

### 3.1 Model Loading

| Scenario | Expected Behavior |
|---|---|
| TF.js / MobileNet model fails to load (offline) | Show: "Visual analysis unavailable. Using text-based search instead." Fall back to keyword+metadata retrieval |
| Model loading takes > 30 seconds | Show extended loading indicator: "Preparing visual analysis…"; do not time out prematurely |
| Browser does not support WebGL (required by TF.js) | Fall back to CPU backend; warn user of slower performance |
| User navigates away during model loading | Cancel model load cleanly; no memory leaks |
| Model loads successfully after previous failure | Resume full visual analysis for subsequent photos |

### 3.2 Embedding Generation

| Scenario | Expected Behavior |
|---|---|
| Photo is extremely small (e.g., 10×10px thumbnail) | Upscale to 224×224 for model input; embed normally |
| Photo is very dark / nearly black | Generate embedding; visual similarity will reflect darkness; no special handling needed |
| Photo is entirely a single solid color | Generate embedding; results will reflect low visual diversity; not an error |
| Photo is a screenshot of text | Embedding generated; OCR complements visual; may surface similar screenshots |
| Photo is a close-up with no clear object (bokeh, blur) | Embedding generated; lower object detection confidence; proceed |
| Two photos are byte-for-byte identical | Should produce identical embeddings; cosine similarity = 1.0; one may be excluded from results (not clue vs. self) |
| Embedding vector is all zeros (model error) | Detect zero vector; skip embedding-based similarity for this photo; use other signals |
| Embedding dimension mismatch after model upgrade | Validate embedding length on load from IndexedDB; re-embed if mismatch detected |

### 3.3 Object Detection

| Scenario | Expected Behavior |
|---|---|
| No objects detected (confidence < 0.5) | `objects[]` = []; exclude object similarity from scoring; do not fail |
| 20+ objects detected (crowded scene) | Use top-5 by confidence only |
| Object detected as "person" for a photo of a mannequin | Accept detection; no special handling |
| Object detection model returns wrong class (misclassification) | No correction; proceed with detected labels; retrieval may be imperfect but not broken |
| COCO-SSD does not recognize medicine packaging (not a COCO class) | Object detection returns generic class (bottle, cup); semantic labels from MobileNet supplement |

---

## 4. OCR & Text Extraction

### 4.1 OCR Availability

| Scenario | Expected Behavior |
|---|---|
| Tesseract.js fails to load | Skip OCR entirely; `ocrText: null`; proceed with other signals |
| OCR enabled but photo has no text | `ocrText: null` or empty string; no impact on retrieval |
| OCR returns garbled text (low quality scan) | Store as-is; partial text overlap still possible in search |
| OCR returns text in a non-English script (Hindi, Arabic) | Store as-is; search will match if user types in same script |
| Photo contains mixed scripts (English + Hindi) | OCR returns mixed; store both; search matches on whichever user types |
| Photo is a QR code or barcode only | OCR returns random chars; store; no meaningful text similarity impact |
| Receipt with numbers only | OCR stores numbers; numeric search queries may surface it |
| OCR text is extremely long (e.g., full-page document) | Truncate to 1000 chars for storage; index full text for search |

### 4.2 OCR Heuristics

| Scenario | Expected Behavior |
|---|---|
| Heuristic decides photo unlikely has text (landscape, selfie) | Skip OCR; saves processing time |
| Heuristic misses a photo with text (false negative) | No OCR for that photo; text signals unavailable; other signals compensate |
| Heuristic triggers OCR on a photo without text (false positive) | OCR runs, returns empty; no harm |

---

## 5. Event & Cluster Detection

### 5.1 Temporal Clustering

| Scenario | Expected Behavior |
|---|---|
| All photos taken in a single day (e.g., single event import) | All grouped into one cluster; works correctly |
| Photos span years without any GPS | Cluster by date only; coarse clusters (same month/year) |
| Photos taken in rapid succession (burst shots, < 1 second apart) | All in same event; `neighborIds` includes all burst siblings |
| Photos with no date at all | Cannot cluster temporally; no `eventId`; placed in unclustered pool |
| Two photos: same GPS, 3 months apart | Different events; location similarity used in retrieval but not clustering |
| One photo at midnight exactly | Correct timestamp handling; no day-boundary errors |
| Photos taken across time zones (travel) | Use UTC timestamps; may cause apparent day-boundary shifts; acceptable for MVP |
| Single photo import (1 photo only) | No neighbors possible; `neighborIds: []`; `eventId` assigned as singleton |

### 5.2 Location Clustering

| Scenario | Expected Behavior |
|---|---|
| Two photos at same café, 6 months apart | Same location cluster; different event clusters; correctly handled separately |
| Photos from a moving vehicle (GPS drifts) | Clusters may fragment; acceptable degradation |
| Photos taken at sea / on a plane (no landmark GPS) | Coordinates used as-is; no reverse geocoding result; `locationName: null` |
| GPS jitter: two photos at same location but 500m apart | Within 2km threshold → same location cluster |
| Photos from international trip (multiple countries) | Multiple trip clusters; each country segment becomes separate trip |

### 5.3 Trip Clustering

| Scenario | Expected Behavior |
|---|---|
| User visits same city twice in same year | Two separate trip clusters; differentiated by date gap (> 7 days gap = separate trip) |
| Day trip (same day, far location) | Identified as trip; `tripId` assigned for that day |
| No GPS for any photos | No trip clustering; `tripId: null` for all; temporal clusters only |
| Photos during a road trip (GPS changes constantly) | May fragment into many clusters; acceptable; memory mode uses broader proximity |

---

## 6. Search

### 6.1 Query Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Empty query (user presses Enter with blank input) | Show all photos (no filter); do not error |
| Query is a single character ("a") | Search runs; may return many or few results |
| Query is very long (> 200 characters) | Truncate to 200 chars for processing; search runs |
| Query contains special characters (`!@#$%`) | Sanitize; strip special chars; run on remaining text |
| Query contains SQL injection or script tags | Fully client-side; no SQL; sanitize for display only |
| Query in non-English (e.g., "गोवा" for Goa in Hindi) | Match against indexed Hindi OCR text if present; otherwise no results |
| Query matches no photos | Show empty state: "No photos found for 'xyz'. Try a different term." |
| Query matches 1 photo only | Show that one photo; no special handling |
| Query matches every photo (e.g., "photo") | Show all; rank by relevance |
| User types very fast (100 chars in 1 second) | Debounce 300ms; only last stable query triggers search |
| User clears query mid-result | Restore full library grid |
| Same query searched twice in a row | Return same results; no caching issue |

### 6.2 Gemini Query Expansion

| Scenario | Expected Behavior |
|---|---|
| Gemini expands "goa" → 10 synonyms | Search uses expanded set; broader recall |
| Gemini returns empty expansion | Fall back to exact keyword search |
| Gemini returns irrelevant expansions (hallucination) | Unexpected results in search; acceptable for MVP |
| Gemini API unavailable during search | Fall back to exact keyword match silently |
| Expansion causes too many results | Rank by relevance score; only top-30 shown |

---

## 7. Retrieval — Search Similar

### 7.1 Embedding-based Similarity

| Scenario | Expected Behavior |
|---|---|
| Clue photo has no embedding (model failed) | Fall back to object + label Jaccard only; warn user results may be less accurate |
| All candidate photos have no embeddings | Visual similarity = 0 for all; object + semantic signals dominate |
| Clue photo embedding is a zero vector | Cosine similarity undefined; treat as no embedding; use fallback |
| Only 1 candidate photo exists in library | Return that 1 result regardless of score |
| Clue photo IS already in results (self-match) | Exclude clue photo from its own results |
| Top result has cosine similarity > 0.99 | Almost certainly a duplicate; still show; optionally badge as "Very similar" |
| All candidates score below threshold (< 0.1) | Show "no strong match" state; offer fallback actions |
| Clue is a screenshot; candidates are real photos | Embedding captures screen-like visual; may surface other screenshots correctly |
| Clue is a panoramic/wide photo | Resized to 224×224 loses aspect ratio info; embedding still captures scene content; acceptable |

### 7.2 Cross-year Requirement

| Scenario | Expected Behavior |
|---|---|
| Same medicine photo scanned twice (different years) | Both appear in results; high similarity score |
| Medicine clue 2023 → medicine photo 2025 exists | Must appear in top 5; verified in Scenario A |
| Clue and target are from same day | Still valid; retrieval does not penalize proximity |
| All photos are from same year | Retrieval works normally; cross-year constraint is permissive, not required |
| Date metadata missing from target | Date not used in scoring; photo still surfaced by visual signals |

### 7.3 Object & Semantic Signals

| Scenario | Expected Behavior |
|---|---|
| Clue has no detected objects | `object_sim = 0`; visual + semantic signals carry the score |
| Clue and target share all objects | `object_sim = 1.0`; heavily weighted; correct behavior |
| Clue is food photo; candidate is entirely different food | Jaccard overlap on "food" label; may surface incorrectly; acceptable recall vs. precision trade-off |
| Clue is a white background product shot | Object detection may miss objects; embedding and labels carry weight |

---

## 8. Retrieval — Search Around Memory

### 8.1 Temporal Scoring

| Scenario | Expected Behavior |
|---|---|
| Clue has no date metadata | `temporal_score = 0` for all; event + location signals dominate |
| Clue and target have identical timestamp | `temporal_score = 1.0`; may be burst siblings or duplicates |
| Clue and target are 1 second apart | `temporal_score ≈ 1.0`; neighbors |
| Clue and target are 30 minutes apart | `temporal_score` high (within σ); likely same event |
| Clue and target are 4 hours apart (σ = 4h) | `temporal_score = ~0.37` (one σ decay); moderate score |
| Clue and target are 24 hours apart | `temporal_score` very low; mainly contextual signals carry |
| Clue and target are years apart | `temporal_score ≈ 0`; event/location signals determine result |
| Clue taken at midnight, target at 11:59 PM same day | 1-minute gap; `temporal_score ≈ 1.0`; correct |
| Clue taken at 11:59 PM, target at 12:01 AM next day | 2-minute gap; correct if using UTC timestamps |

### 8.2 Location Scoring

| Scenario | Expected Behavior |
|---|---|
| Both photos have no GPS | `location_score = 0`; no location penalty; other signals used |
| Only clue has GPS; target has none | Cannot compute distance; `location_score = 0`; no penalty |
| Only target has GPS; clue has none | Cannot compute distance; `location_score = 0` |
| Both at same GPS coordinate | Distance = 0; `location_score = 1.0` |
| Photos 500m apart (same neighborhood) | Score very high (within decay threshold) |
| Photos 2km apart (same city area) | Score moderately high |
| Photos 10km apart (same city, different area) | `exp(-10/10) ≈ 0.37`; moderate |
| Photos in different cities | Score very low; event/temporal dominate if they exist |
| Photos in different countries | Score ≈ 0; no location relationship |

### 8.3 Event/Cluster Scoring

| Scenario | Expected Behavior |
|---|---|
| Clue and target share same `eventId` | `event_score = 1.0`; strongly surfaced |
| Clue and target share `tripId` but different `eventId` | `event_score = 0.6`; still meaningfully connected |
| Neither has an `eventId` | `event_score = 0`; other signals carry |
| Only one photo in the event cluster | `event_score` only applies to that one photo; expected |
| Photo belongs to two overlapping events (edge case in clustering) | Assign primary event only during clustering |

### 8.4 People Scoring

| Scenario | Expected Behavior |
|---|---|
| No face detection in demo (people identified manually) | Demo works correctly; user photo mode has no faces → `people_score = 0` |
| `people[]` is empty for all photos | `people_score = 0`; excluded from scoring transparently |
| Clue has 3 people; target has 2 of those 3 | Jaccard = 2/4 = 0.5; moderate people match |
| Clue has 1 person; all photos have that person | High people score for many candidates; event/temporal differentiates |

---

## 9. Retrieval — Best Match (Local + Gemini)

### 9.1 Signal Strength Analysis

| Scenario | Expected Behavior |
|---|---|
| Clue photo has ALL signals (GPS, date, event, objects, OCR, people) | Balanced adaptive weights; Gemini has rich context |
| Clue photo has NO signals (screenshot, no EXIF, no detectable objects) | Very low confidence retrieval; show "We couldn't find a strong match" after attempt |
| Clue has ONLY visual signals (good embedding, no context) | Weight shifts to visual (similar to Search Similar mode effectively) |
| Clue has ONLY contextual signals (GPS + event, no visual distinctiveness) | Weight shifts to memory mode effectively |
| Clue photo is a white/blank page | Near-zero signal strength; very poor retrieval quality; show honest result count |

### 9.2 Adaptive Weighting

| Scenario | Expected Behavior |
|---|---|
| Two signals conflict (visual says X, contextual says Y) | Adaptive weights determine dominant signal; both contribute |
| Medicine photo with strong GPS (took at hospital) | Both visual AND location signals active; Gemini should recognize both |
| Trip photo with no visual distinctiveness (all blue sky) | Contextual signals dominate in adaptive weighting |

---

## 10. Reason Chip Generation

### 10.1 Chip Content

| Scenario | Expected Behavior |
|---|---|
| No dominant signal exists for a result | Show generic chip: "Possible match" |
| Multiple equally-strong signals | Show most user-friendly chip (prefer event > location > temporal > visual) |
| Temporal signal is dominant with exact time known | "Taken 42 minutes from your clue" |
| Temporal signal but no exact time | "Around the same time" |
| Location signal but no `locationName` | "Nearby location" (not raw GPS) |
| People signal but people are anonymous (user photos) | "Same people" (based on face IDs only; no names) |
| Event name is very long | Truncate chip: "Same Goa trip…" (max 25 chars) |
| Visual similarity is high but no clear object match | "Similar appearance" |
| OCR text overlap is dominant signal | "Similar text" |

### 10.2 Chip Display

| Scenario | Expected Behavior |
|---|---|
| 5+ chips generated for one result | Show top 2 only; do not overflow card |
| Chip text overflows card width | Truncate with ellipsis |
| Chip type color not defined | Default to neutral chip color |
| Best Match result with Gemini reason string | Gemini string takes priority over local chips |
| Gemini returns empty reason for a photo | Show local-generated chip as fallback |

---

## 11. Clue Chaining

### 11.1 Chain State

| Scenario | Expected Behavior |
|---|---|
| User starts a new chain from scratch | `clueChain` initializes with step 0 |
| User uses a result as clue immediately (step 2) | Chain extends to step 1; breadcrumb shows both |
| User chains 10 hops | System supports arbitrarily long chains; breadcrumb truncates display ("Search → … → Clue 9 → Results") |
| User goes back to step 1 results via breadcrumb | Step 1 results displayed; chain truncated to step 1 |
| User starts a new search mid-chain | Chain fully resets; `clueChain: null` |
| User uses a photo from step 1 results as clue (not step 2's clue) | New branch from step 1; replaces step 2 onward |
| Same photo used as clue twice in same chain | Allowed; different modes may yield different results |
| Clue photo is no longer in results (was excluded) | No issue; clue is stored by ID separately from results |

### 11.2 Exclusion Logic

| Scenario | Expected Behavior |
|---|---|
| Previously used clue appears in new results | Filter it out (add to `excludeIds`) |
| All results were already seen | Loosen exclusion; show previously seen results with subtle "seen" indicator |
| Chain starts fresh; no exclusions | `excludeIds: []`; full candidate set available |
| Excluded photo is the best visual match | Still excluded; correctness trade-off accepted for UX clarity |

### 11.3 Breadcrumb UI

| Scenario | Expected Behavior |
|---|---|
| Chain depth = 1 | No breadcrumb shown |
| Chain depth = 2 | Show: "Search → Clue (Similar) → Results" |
| Chain depth = 5 | Truncate middle: "Search → … → Clue 4 (Memory) → Results" |
| Clue photo thumbnail missing (deleted from IndexedDB) | Show placeholder icon in breadcrumb instead of thumbnail |
| Mode name is very long | Use short labels: "Similar", "Memory", "Best" |

---

## 12. Demo Dataset

### 12.1 Data Integrity

| Scenario | Expected Behavior |
|---|---|
| Demo dataset fails to import (JSON parse error) | App shows error screen: "Demo data unavailable. Please reload." |
| Demo image file missing from `public/` | Show broken image placeholder for that photo; dataset remains functional |
| Demo photo embedding is zero vector | Detected at runtime; excluded from cosine similarity; other signals used |
| Two demo photos have identical IDs | Deduplicate at load time; last one wins (log warning in dev) |
| Demo dataset has no photos in a required event cluster | Scenario for that cluster fails gracefully; show partial results |

### 12.2 Scenario Coverage

| Scenario | Edge Case | Expected Behavior |
|---|---|---|
| Scenario A | Medicine photos have very different labels despite similar appearance | Embedding similarity carries the result even if object/label Jaccard is low |
| Scenario B | Beach and restaurant photos accidentally share a label (e.g., "outdoor") | Event/trip signal must dominate; visual correctly gives low score |
| Scenario C | Gemini unavailable during demo | Fallback to local Best Match; show "Using local analysis" notice |
| Scenario D | User accidentally uses wrong photo in chain | Chain still works; just may not reach target efficiently |
| Scenario E | doc-2022 and doc-2024 have different dimensions/orientations | Embedding normalizes; similarity still high |
| Scenario F | Hotel and beach share same eventId | Correct: event_score = 1.0 for Search Around Memory |

---

## 13. My Photos Mode

### 13.1 Import Interruption

| Scenario | Expected Behavior |
|---|---|
| User closes tab mid-import | Partial data in IndexedDB; on reload, show "Resume incomplete import?" or offer fresh start |
| Browser crashes mid-processing | Same as tab close; partial state in IndexedDB; recovery prompt on reload |
| User navigates away mid-import | Warn: "Import in progress. Are you sure you want to leave?" |
| Import completes but embedding model was not loaded yet | Retry embedding for unprocessed photos on next interaction |
| User force-refreshes page during import | Restart import from last committed batch in IndexedDB |

### 13.2 Photo Content Edge Cases

| Scenario | Expected Behavior |
|---|---|
| All imported photos are from different contexts (no clusters) | Each photo is its own singleton; "Search Around Memory" yields very low scores |
| All imported photos are from same day (burst import from one event) | All cluster together; "Search Similar" more useful than Memory mode |
| User imports only 1 photo | Works; retrieval returns 0 results (cannot compare to self) |
| User imports 2 photos | Retrieval returns 1 result for each clue |
| User imports photos with completely unrelated content | Retrieval may return poor results; expected; show low-confidence results or empty state |
| All user photos are selfies | Face IDs assigned if face detection enabled; people overlap may be high |
| User imports photos of documents only | OCR very useful; visual and text signals dominate |

### 13.3 Second Import Session

| Scenario | Expected Behavior |
|---|---|
| User imports more photos after initial batch | Append to existing library; rebuild index |
| User imports same photos again | Deduplicate by filename + size; skip duplicates |
| User clears photos and reimports a different set | Fresh start; no leftover data from previous session |

---

## 14. IndexedDB & Storage

### 14.1 Storage Quota

| Scenario | Expected Behavior |
|---|---|
| IndexedDB quota exceeded (browser storage limit reached) | Catch `QuotaExceededError`; show: "Storage is full. Clear some photos to continue." |
| User has <100MB free storage when importing 200 photos | Warn at start: "You may not have enough storage. Try importing fewer photos." |
| Storage quota approaching (80% full) | Show subtle warning in My Photos header |
| User clears browser storage externally (DevTools) | App detects missing data on load; treats as fresh session |
| Private/Incognito mode (limited storage) | IndexedDB available but quota very low; warn user; suggest normal mode for large imports |

### 14.2 Data Corruption

| Scenario | Expected Behavior |
|---|---|
| Photo metadata record corrupted in IndexedDB | Skip that photo; log warning; continue with others |
| Embedding Float32Array corrupted | Detect invalid values (NaN, Infinity); re-process photo or exclude from visual scoring |
| Blob data corrupted (cannot create object URL) | Show broken image placeholder; metadata still usable for search |
| IndexedDB schema version mismatch (after app update) | Run migration; if migration fails, offer "Reset data" option |

### 14.3 Concurrent Access

| Scenario | Expected Behavior |
|---|---|
| Two browser tabs open with My Photos | Second tab reads stale data; show "Another session is active" warning |
| IndexedDB write fails mid-batch | Retry write; if repeated failure, skip and continue |

---

## 15. Gemini API Integration

### 15.1 API Availability

| Scenario | Expected Behavior |
|---|---|
| Gemini API key not set (`VITE_GEMINI_API_KEY` missing) | Disable Best Match AI mode silently; fall back to local scoring; do not crash |
| Gemini API key is invalid (401) | Show: "Best match AI is unavailable. Using local analysis." No retry |
| Gemini API rate limit hit (429) | Wait 2 seconds, retry once; if still 429, fall back to local |
| Gemini API timeout (> 10 seconds) | Cancel request; fall back to local scoring; show brief notice |
| Gemini API returns 500 error | Fall back to local scoring immediately; log error in dev |
| Gemini API returns unexpected JSON structure | Validate response; if malformed, fall back to local results |
| Gemini API quota exhausted for the day | Fall back to local; show: "AI analysis is temporarily unavailable." |
| No internet connection when Best Match selected | Detect offline; fall back to local immediately without attempting API call |

### 15.2 Prompt & Response Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Clue photo description is empty (no description generated) | Send available signals only (objects, labels, location); still valid prompt |
| All 20 candidates have identical descriptions | Gemini may return arbitrary order; local scores used as tiebreaker |
| Gemini re-ranks a photo that was excluded from results | Ignore any IDs in Gemini response not in original candidate set |
| Gemini returns fewer ranked IDs than candidates | Fill remaining slots from local scoring order |
| Gemini returns more ranked IDs than requested | Trim to requested `topK` |
| Gemini reason string is longer than 6 words | Truncate to 6 words + "…" |
| Gemini reason string is in a different language | Display as-is; acceptable for MVP |
| Gemini reasons are factually wrong (hallucination) | Display as-is; user discerns relevance themselves |
| Gemini response contains photo IDs from demo dataset when using My Photos | Validate that returned IDs exist in the active dataset; discard foreign IDs |

### 15.3 Privacy Safeguards

| Scenario | Expected Behavior |
|---|---|
| Code accidentally includes raw image data in Gemini request | Must be caught in code review; only descriptions/metadata sent |
| Gemini prompt accidentally reveals one user's photos to another session | Not possible (client-only; no server session sharing) |
| User declines AI disclosure and selects Best Match | Fall back to local Best Match; do not call Gemini |

---

## 16. UI & Interaction

### 16.1 Context Menu

| Scenario | Expected Behavior |
|---|---|
| User right-clicks photo (desktop) | Context menu opens |
| User long-presses photo (mobile) | Context menu opens after 500ms |
| User taps ⋮ icon | Context menu opens |
| User opens menu, then scrolls | Menu closes (outside click) |
| User opens menu, presses Escape | Menu closes |
| Two photos have menus open simultaneously | Close first menu when second opens |
| User opens menu on clue photo while sheet is open | Close sheet; open menu for new photo |
| Context menu appears partially off-screen (near edges) | Reposition to keep fully visible |

### 16.2 Bottom Sheet (Clue Choice)

| Scenario | Expected Behavior |
|---|---|
| Sheet opens on very small screen (<360px wide) | Sheet takes full width; scrollable if needed |
| User swipes sheet up past 100% | Sheet stays at max height; no overflow |
| User swipes sheet down slowly (drag-to-dismiss) | Dismiss if > 40% of height swiped; else snap back |
| User taps backdrop while sheet is animating | Complete animation first, then dismiss |
| User taps a retrieval option while Gemini is loading | Show spinner; block double-tap |
| Keyboard appears on mobile while sheet is open | Sheet adjusts position above keyboard |

### 16.3 Photo Grid

| Scenario | Expected Behavior |
|---|---|
| Grid has 0 photos | Show empty state with appropriate message |
| Grid has 1 photo | Render single card; grid does not break layout |
| Grid has 1000+ photos | Virtualize list (only render visible rows); do not render all DOM nodes |
| Photos of wildly different aspect ratios (portrait, landscape, square) | CSS grid handles; no layout breaks |
| Images fail to load (broken URL) | Show placeholder gray box; grid does not collapse |
| Images load slowly | Show progressive skeleton animation per card |
| User rapidly scrolls through 1000-photo grid | No jank; virtual scrolling maintains performance |

### 16.4 Photo Selection

| Scenario | Expected Behavior |
|---|---|
| User taps a photo while another is selected | Deselect previous, select new |
| User taps already-selected photo | Deselect |
| User selects a photo, then searches | Selection cleared; new search context |
| User tries to select multiple photos | Only single selection supported for clue triggering; multi-select not in scope |
| Selected photo scrolls out of view | Selection state maintained; photo still the active clue |

---

## 17. Performance & Memory

### 17.1 Processing Performance

| Scenario | Expected Behavior |
|---|---|
| 200 photos imported; embedding takes 2 minutes | Show active progress bar; do not time out |
| Embedding model takes 500MB RAM on mobile | Detect low memory; reduce batch size; show slower progress |
| Processing all 200 photos simultaneously | Batched processing (max 5 concurrent); prevents OOM |
| User switches tabs while processing | Processing continues in background (Web Workers if used) |
| Phone screen locks during processing | Processing may pause on iOS (background execution limited); resume on unlock |

### 17.2 Search & Retrieval Performance

| Scenario | Expected Behavior |
|---|---|
| 1000 photos; similarity computed against all | Use matrix multiplication on Float32Arrays; target < 200ms |
| 1000 photos; naive loop similarity | Unacceptable (> 5 seconds); must use vectorized computation |
| Search index rebuild after import | Run asynchronously; do not block UI |
| Clue changed rapidly (user swipes clues) | Debounce retrieval calls; cancel in-flight computation |

### 17.3 Memory Leaks

| Scenario | Expected Behavior |
|---|---|
| Object URLs created for 1000 photos | Revoke URLs when photos leave viewport (`URL.revokeObjectURL`) |
| TF.js tensors not disposed | Explicitly dispose tensors after embedding; prevent GPU memory leak |
| User clears photos but object URLs remain | Revoke all object URLs as part of clear action |
| IndexedDB connection not closed | Close connection when component unmounts |

---

## 18. Privacy & Data Lifecycle

### 18.1 Data Persistence

| Scenario | Expected Behavior |
|---|---|
| User closes tab → reopens next day | IndexedDB data persists; show "Resume last session?" prompt |
| User clears browser data (cookies/storage) | App detects no data; starts fresh |
| User uses private/incognito mode | All data cleared when tab closes; expected and disclosed |
| User exports browser data (e.g., Chrome Takeout) | User photos in IndexedDB may be included; acceptable |

### 18.2 Clear My Photos Action

| Scenario | Expected Behavior |
|---|---|
| User taps "Clear" then immediately reopens app | IndexedDB fully wiped; no residual data |
| Clear action interrupted mid-way (crash) | Partial data may remain; show "Incomplete clear — clear again?" on reload |
| User clears while processing is in progress | Cancel processing; then clear; no partial writes |
| User clears demo photos accidentally (if such an action exists) | Demo dataset reloads from bundle; no data loss |

### 18.3 Gemini & Privacy

| Scenario | Expected Behavior |
|---|---|
| Sensitive photo (medical, personal document) selected as clue for Best Match | Only description + metadata sent to Gemini; never the image |
| User denies Gemini disclosure | Fall back to local Best Match; no API call |
| Description inadvertently reveals sensitive info (e.g., "prescription for Patient X") | Description is auto-generated; no PII extraction in MVP; acceptable risk |

---

## 19. Cross-browser & Device

### 19.1 Browser Compatibility

| Scenario | Expected Behavior |
|---|---|
| Chrome (latest) | Full feature support; primary target |
| Safari (iOS 16+) | Full support; test HEIC handling specifically |
| Safari (iOS 14) | Partial: OffscreenCanvas may be unavailable; fall back to `canvas` element |
| Firefox (latest) | Full support; test IndexedDB quota behavior |
| Edge (latest) | Full support (Chromium-based) |
| Opera, Brave | Should work; not officially tested in MVP |
| IE11 / Legacy Edge | Not supported; show: "Please use a modern browser" |
| Chrome Android | Full support; test mobile touch interactions |
| Samsung Internet | Generally works; not primary target |

### 19.2 Device & Screen

| Scenario | Expected Behavior |
|---|---|
| Very small screen (320px wide, e.g., iPhone SE) | Layout adapts; 2-column grid; sheet full-width |
| Very large screen (4K, 3840px wide) | Grid expands; max-width container constrains layout |
| Landscape orientation (mobile) | Grid reflows; sheet usable |
| Notch / dynamic island (iPhone 14+) | Safe area insets applied via CSS `env()` |
| Tablet (iPad, Android tablet) | 3–4 column grid; sheet as modal centered |
| Device with stylus (Surface, iPad Pro) | Stylus treated as pointer; works as expected |

### 19.3 Accessibility

| Scenario | Expected Behavior |
|---|---|
| User navigates only by keyboard | Tab → photos, Enter → select, Space → open menu, Escape → close menu/sheet |
| Screen reader (VoiceOver, NVDA) | All interactive elements have `aria-label`; images have `alt` text |
| Forced dark mode | App is already dark mode–first; no inversion issues |
| Forced high contrast mode | Colors adapt via media query; chips and chips remain legible |
| User zooms browser to 200% | Layout reflows; no content hidden or overflowing |
| User has reduced motion preference | Animations disabled via `prefers-reduced-motion` |

---

## 20. Feedback Prompt

### 20.1 Prompt Display

| Scenario | Expected Behavior |
|---|---|
| User dismisses feedback prompt | Do not show again for that retrieval session |
| User ignores prompt (doesn't tap anything) | Prompt remains visible; no auto-dismiss |
| User taps "Yes" and then closes app before follow-up | Record "Yes" response; follow-up not required |
| Feedback prompt shown on empty results state | Skip feedback prompt if 0 results returned |
| Clue chain depth > 2 | Feedback prompt still appears; includes chain depth in stored response |

### 20.2 Feedback Storage

| Scenario | Expected Behavior |
|---|---|
| `localStorage` is full | Silently fail to write feedback; do not error |
| Feedback data grows very large (100+ sessions) | Trim oldest entries; keep last 50 |
| User clears browser storage | Feedback data cleared; expected |

---

## 21. Demo Scenario Edge Cases

### Scenario A (Cross-year medicine)

| Edge Case | Expected Behavior |
|---|---|
| Embedding similarity between medicine-2023 and medicine-2025 < 0.85 | Embedding re-seeded or photos regenerated to ensure scenario works |
| "Medicine" search returns 0 results | Dataset integrity issue; check `labels` and `objects` for medicine photos |
| 2025 medicine photo not in top 5 results | Investigate weight tuning; may need to boost visual_sim weight |

### Scenario B (Goa memory)

| Edge Case | Expected Behavior |
|---|---|
| Beach and restaurant accidentally share a high embedding similarity | Re-generate demo images to ensure visual distinctiveness |
| Goa beach doesn't appear in top 10 memory results | Check `eventId` assignment; both must share `goa-2024` |
| User accidentally selects beach photo as clue (not restaurant) | Scenario still works in reverse; memory mode returns restaurant |

### Scenario C (AI Best Match)

| Edge Case | Expected Behavior |
|---|---|
| Gemini API is down during live demo | Local fallback must produce sensible results for same clue |
| Gemini reasons are confusing or irrelevant | Accept for MVP; refine prompt in v2 |

### Scenario D (Clue chaining)

| Edge Case | Expected Behavior |
|---|---|
| User reaches target in 1 hop (not chaining) | That's success; chaining not required if 1 hop works |
| Target photo is not in the dataset | Demo script must ensure target always exists |
| Chain produces a loop (A → B → A) | Exclusion logic prevents A from appearing again after being used as clue |

### Scenario E (Different year document)

| Edge Case | Expected Behavior |
|---|---|
| doc-2022 and doc-2024 have very different visual content | Scenario only requires reasonable visual similarity; ensure demo images are similar documents |
| OCR text is the dominant signal (not visual) | Acceptable; text similarity confirms correct retrieval |

### Scenario F (Same context, different appearance)

| Edge Case | Expected Behavior |
|---|---|
| Hotel and beach accidentally look similar (both blue/white) | Ensure visual similarity is low; scenario tests contextual > visual |
| They don't share the same `tripId` | Data bug; must be fixed in demo dataset |

---

## Summary: Priority Matrix

| Category | Severity | Must Handle in MVP |
|---|---|---|
| Import failures (corrupt, wrong type) | High | Yes |
| Missing EXIF (no date, no GPS) | High | Yes |
| Embedding model fails to load | High | Yes (fallback) |
| Cross-year retrieval correctness | Critical | Yes |
| Gemini API unavailable | High | Yes (fallback) |
| IndexedDB quota exceeded | Medium | Yes (error message) |
| OCR failure | Low | Yes (skip gracefully) |
| Chain loop prevention | Medium | Yes |
| HEIC format support | Medium | Best-effort |
| Screen reader accessibility | Medium | Yes (basic) |
| Very large import (500+ photos) | Low | Warning + best-effort |
| Duplicate photo detection | Low | Best-effort |
| Offline Gemini (no internet) | High | Yes (local fallback) |
| Demo scenario integrity | Critical | Yes (validated in Phase 17) |
| Clear My Photos completeness | High | Yes |
