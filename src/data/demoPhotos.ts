import type { Photo } from '../types'

// Deterministic random number generator
function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// Generate a normalized random unit vector
function randomUnitVector(seed: number, dim = 128): number[] {
  const rand = seededRand(seed)
  const v = Array.from({ length: dim }, () => rand() * 2 - 1)
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
  return v.map((x) => x / norm)
}

// Add noise to a vector and re-normalize, so it stays highly similar
function addNoise(baseVector: number[], seed: number, noiseFactor = 0.2): number[] {
  const rand = seededRand(seed)
  const dim = baseVector.length
  const noise = Array.from({ length: dim }, () => rand() * 2 - 1)
  
  const combined = baseVector.map((x, i) => x + noise[i] * noiseFactor)
  const norm = Math.sqrt(combined.reduce((sum, x) => sum + x * x, 0))
  return combined.map((x) => x / norm)
}

// Scenario Base Vectors (128 dimensions)
const MEDICINE_BASE = randomUnitVector(42)
const GOA_BEACH_BASE = randomUnitVector(99)
const GOA_RESTAURANT_BASE = randomUnitVector(199)
const GOA_HOTEL_BASE = randomUnitVector(299)
const BIRTHDAY_BASE = randomUnitVector(150)
const DOC_BASE = randomUnitVector(300)
const KASHMIR_BASE = randomUnitVector(700)
const FOOD_BASE = randomUnitVector(800)
const PETS_BASE = randomUnitVector(900)
const DIWALI_BASE = randomUnitVector(1000)
const BUILDING_BASE = randomUnitVector(1100)
const PLANTS_BASE = randomUnitVector(1200)

type PhotoSeedDef = {
  seed: number
  label: string
  event: string | null
  location: string | null
  baseEmbedding: number[] | null
  dateStr: string
  objects: string[]
  labels: string[]
  ocrText: string | null
}

const PHOTO_SEEDS: PhotoSeedDef[] = [
  // ── Medicine (16 photos) ──────────────────────────
  // Med 2023 (5 core)
  { seed: 201, label: 'Medicine strips 2023', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-15T09:00:00', objects: ['Pill', 'Packaging'], labels: ['Medicine', 'Health'], ocrText: 'Paracetamol 500mg' },
  { seed: 202, label: 'Pharmacy prescription 2023', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-15T09:05:00', objects: ['Paper'], labels: ['Document', 'Text', 'Medicine'], ocrText: 'Dr. Sharma Rx' },
  { seed: 203, label: 'Pill pack 2023', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-15T09:10:00', objects: ['Pill'], labels: ['Medicine', 'Health'], ocrText: 'Crocine' },
  { seed: 204, label: 'Tablet packaging 2023', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-15T09:15:00', objects: ['Packaging'], labels: ['Medicine'], ocrText: null },
  { seed: 205, label: 'Syrup bottle 2023', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-15T09:20:00', objects: ['Bottle'], labels: ['Liquid', 'Medicine'], ocrText: 'Cough Syrup 100ml' },
  // Med 2023 extra
  { seed: 206, label: 'Painkiller capsules blister 2023', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-16T11:00:00', objects: ['Capsule', 'Blister'], labels: ['Medicine', 'Healthcare'], ocrText: 'Ibuprofen 400mg' },
  { seed: 207, label: 'Digital thermometer and pills', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-16T11:30:00', objects: ['Thermometer', 'Pill'], labels: ['Medicine', 'Health'], ocrText: '98.6 F' },
  { seed: 208, label: 'First aid ointment tube and bandage', event: 'med-2023', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2023-08-16T12:00:00', objects: ['Tube', 'Bandage'], labels: ['Medicine', 'First Aid'], ocrText: 'Antiseptic Cream' },

  // Med 2025 (5 core)
  { seed: 301, label: 'Medicine strips 2025', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-10T10:00:00', objects: ['Pill', 'Packaging'], labels: ['Medicine', 'Health'], ocrText: 'Paracetamol 500mg' },
  { seed: 302, label: 'Pharmacy prescription 2025', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-10T10:05:00', objects: ['Paper'], labels: ['Document', 'Medicine'], ocrText: 'Dr. Sharma Rx' },
  { seed: 303, label: 'Pill pack 2025', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-10T10:10:00', objects: ['Pill'], labels: ['Medicine'], ocrText: 'Crocine' },
  { seed: 304, label: 'Tablet box 2025', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-10T10:15:00', objects: ['Box'], labels: ['Medicine'], ocrText: null },
  { seed: 305, label: 'Drug store visit 2025', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-10T10:20:00', objects: ['Store'], labels: ['Retail', 'Medicine'], ocrText: 'Apollo Pharmacy' },
  // Med 2025 extra
  { seed: 306, label: 'Antacid effervescent strip 2025', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-11T09:00:00', objects: ['Pill', 'Sachet'], labels: ['Medicine', 'Health'], ocrText: 'Eno Orange' },
  { seed: 307, label: 'Daily vitamin multivitamin supplements bottle', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-11T09:30:00', objects: ['Bottle', 'Capsule'], labels: ['Medicine', 'Supplements'], ocrText: 'Zincovit Daily' },
  { seed: 308, label: 'Prescription lubricating eye drops vial', event: 'med-2025', location: 'Mumbai, India', baseEmbedding: MEDICINE_BASE, dateStr: '2025-02-11T10:00:00', objects: ['Dropper', 'Bottle'], labels: ['Medicine', 'Eye Care'], ocrText: 'Refresh Tears' },

  // ── Food & Culinary (20 photos from Unsplash) ───────
  { seed: 801, label: 'Fresh quinoa vegetable salad bowl with greens', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-12T19:30:00', objects: ['Bowl', 'Vegetables', 'Salad'], labels: ['Food', 'Healthy', 'Salad'], ocrText: null },
  { seed: 802, label: 'Wood-fired Neapolitan pizza with melted mozzarella', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-13T08:30:00', objects: ['Pizza', 'Cheese'], labels: ['Food', 'Italian', 'Pizza'], ocrText: null },
  { seed: 803, label: 'Juicy artisan beef cheeseburger and seasoned fries', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-13T11:15:00', objects: ['Burger', 'Fries'], labels: ['Food', 'Burger', 'Lunch'], ocrText: null },
  { seed: 804, label: 'Vibrant roasted avocado and greens Buddha bowl', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-13T20:00:00', objects: ['Bowl', 'Avocado', 'Vegetables'], labels: ['Food', 'Healthy', 'Vegan'], ocrText: null },
  { seed: 805, label: 'Freshly prepared Italian tomato basil pasta plate', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-14T16:00:00', objects: ['Pasta', 'Plate', 'Fork'], labels: ['Food', 'Italian', 'Pasta'], ocrText: null },
  { seed: 806, label: 'Golden buttermilk pancakes with blueberries and maple syrup', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-14T17:30:00', objects: ['Pancakes', 'Plate', 'Berries'], labels: ['Food', 'Breakfast', 'Sweet'], ocrText: null },
  { seed: 807, label: 'Chef gourmet dinner spread and appetizers banquet', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-15T13:00:00', objects: ['Platter', 'Dishes'], labels: ['Food', 'Dining', 'Buffet'], ocrText: null },
  { seed: 808, label: 'Crisp Greek salad with feta cheese and kalamata olives', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-15T20:30:00', objects: ['Salad', 'Feta', 'Bowl'], labels: ['Food', 'Salad', 'Healthy'], ocrText: null },
  { seed: 809, label: 'Fresh strawberry cream layer sponge cake dessert', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-16T18:00:00', objects: ['Cake', 'Plate'], labels: ['Food', 'Dessert', 'Cake'], ocrText: null },
  { seed: 810, label: 'Artisan sourdough avocado toast with poached farm egg', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-16T21:00:00', objects: ['Toast', 'Egg', 'Plate'], labels: ['Food', 'Breakfast', 'Brunch'], ocrText: null },
  { seed: 811, label: 'Gourmet double smash burger with cheddar and bacon', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-17T13:30:00', objects: ['Burger', 'Cheese'], labels: ['Food', 'Fast Food', 'Burger'], ocrText: null },
  { seed: 812, label: 'Fragrant spiced saffron basmati rice pilaf dish', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-17T17:00:00', objects: ['Rice', 'Bowl'], labels: ['Food', 'Rice', 'Spices'], ocrText: null },
  { seed: 813, label: 'Royal Indian spiced chicken dum biryani clay pot', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-18T12:30:00', objects: ['Pot', 'Rice', 'Biryani'], labels: ['Food', 'Biryani', 'Indian Food'], ocrText: null },
  { seed: 814, label: 'Hickory slow-smoked tender BBQ ribs with herb garnish', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-18T21:45:00', objects: ['Meat', 'Board'], labels: ['Food', 'Barbecue', 'Meat'], ocrText: null },
  { seed: 815, label: 'Japanese salmon nigiri and spicy tuna sushi roll platter', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-19T13:15:00', objects: ['Sushi', 'Chopsticks'], labels: ['Food', 'Japanese', 'Sushi'], ocrText: null },
  { seed: 816, label: 'Authentic Japanese tonkotsu ramen with soft egg and nori', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-19T16:30:00', objects: ['Ramen', 'Chopsticks', 'Bowl'], labels: ['Food', 'Ramen', 'Noodles'], ocrText: null },
  { seed: 817, label: 'Authentic Mexican street tacos with lime, onion, and salsa', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-20T12:00:00', objects: ['Tacos', 'Lime'], labels: ['Food', 'Mexican', 'Tacos'], ocrText: null },
  { seed: 818, label: 'Sizzling flame-grilled barbecue chicken skewers and herbs', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-20T19:00:00', objects: ['Skewers', 'Grill'], labels: ['Food', 'Barbecue', 'Grill'], ocrText: null },
  { seed: 819, label: 'Healthy morning breakfast berry oatmeal porridge bowl with seeds', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-21T08:30:00', objects: ['Oatmeal', 'Berries', 'Bowl'], labels: ['Food', 'Breakfast', 'Healthy'], ocrText: null },
  { seed: 820, label: 'Warm flaky butter croissants and roasted espresso coffee', event: 'foodie-delight', location: 'Bangalore, India', baseEmbedding: FOOD_BASE, dateStr: '2024-07-21T10:15:00', objects: ['Croissant', 'Coffee'], labels: ['Food', 'Bakery', 'Coffee'], ocrText: null },


  // ── Building & Architecture (16 photos) ───────────
  { seed: 1101, label: 'Modern glass skyscraper reflecting blue sky', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-10T11:00:00', objects: ['Skyscraper', 'Building'], labels: ['Building', 'Architecture', 'Urban'], ocrText: null },
  { seed: 1102, label: 'Ancient red sandstone historic fort gate', event: 'arch-tour', location: 'Delhi, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-10T14:30:00', objects: ['Fort', 'Arch', 'Stone'], labels: ['Building', 'Heritage', 'History'], ocrText: 'Red Fort Entry' },
  { seed: 1103, label: 'Iconic cable stayed architectural sea link bridge', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-11T09:00:00', objects: ['Bridge', 'Cables'], labels: ['Building', 'Engineering', 'Architecture'], ocrText: 'Bandra Worli Sea Link' },
  { seed: 1104, label: 'Victorian colonial clock tower landmark monument', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-11T12:00:00', objects: ['Tower', 'Clock'], labels: ['Building', 'Monument', 'Colonial'], ocrText: 'Rajabai Clock Tower' },
  { seed: 1105, label: 'Intricately carved white marble temple dome', event: 'arch-tour', location: 'Delhi, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-12T10:30:00', objects: ['Temple', 'Dome', 'Marble'], labels: ['Building', 'Religious', 'Architecture'], ocrText: 'Akshardham' },
  { seed: 1106, label: 'Contemporary geometric glass museum pavilion', event: 'arch-tour', location: 'Bangalore, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-12T15:00:00', objects: ['Museum', 'Glass'], labels: ['Building', 'Modern', 'Museum'], ocrText: 'Science Gallery' },
  { seed: 1107, label: 'Grand royal palace courtyard with carved arches', event: 'arch-tour', location: 'Jaipur, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-13T11:30:00', objects: ['Palace', 'Arch', 'Courtyard'], labels: ['Building', 'Palace', 'Heritage'], ocrText: 'City Palace Jaipur' },
  { seed: 1108, label: 'Downtown highrise skyline bathed in sunset gold', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-13T18:45:00', objects: ['Skyline', 'Building'], labels: ['Building', 'City', 'Skyline'], ocrText: null },
  { seed: 1109, label: 'Minimalist brutalist concrete villa architecture', event: 'arch-tour', location: 'Bangalore, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-14T10:00:00', objects: ['House', 'Concrete'], labels: ['Building', 'Minimalism', 'Residential'], ocrText: null },
  { seed: 1110, label: 'Gothic revival cathedral with soaring stone spires', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-14T16:00:00', objects: ['Church', 'Spire', 'Stone'], labels: ['Building', 'Cathedral', 'Gothic'], ocrText: 'St Thomas Cathedral' },
  { seed: 1111, label: 'Classical university library with ionic pillars', event: 'arch-tour', location: 'Delhi, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-15T11:00:00', objects: ['Pillars', 'Library'], labels: ['Building', 'Academic', 'Classical'], ocrText: 'Central Library' },
  { seed: 1112, label: 'Coastal lighthouse tower atop rocky promontory', event: 'arch-tour', location: 'Goa, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-15T17:15:00', objects: ['Lighthouse', 'Tower'], labels: ['Building', 'Coast', 'Navigation'], ocrText: 'Aguada Lighthouse' },
  { seed: 1113, label: 'Historic carved wooden jharokha balconies haveli', event: 'arch-tour', location: 'Jaipur, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-16T12:00:00', objects: ['Balcony', 'Wood', 'Haveli'], labels: ['Building', 'Traditional', 'Haveli'], ocrText: null },
  { seed: 1114, label: 'Sleek curved aerodynamic airport terminal facade', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-16T16:30:00', objects: ['Terminal', 'Steel', 'Glass'], labels: ['Building', 'Airport', 'Modern'], ocrText: 'Terminal 2 Mumbai' },
  { seed: 1115, label: 'Cozy colonial street with pastel heritage rowhouses', event: 'arch-tour', location: 'Goa, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-17T11:00:00', objects: ['House', 'Street'], labels: ['Building', 'Colonial', 'Street'], ocrText: 'Fontainhas' },
  { seed: 1116, label: 'Illuminated suspension bridge over harbor at dusk', event: 'arch-tour', location: 'Mumbai, India', baseEmbedding: BUILDING_BASE, dateStr: '2024-04-17T20:00:00', objects: ['Bridge', 'Lights', 'Water'], labels: ['Building', 'Night', 'Bridge'], ocrText: null },

  // ── Goa Trip 2024 (15 photos) ─────────────────────
  { seed: 401, label: 'Goa beach sunset', event: 'goa-2024', location: 'Goa, India', baseEmbedding: GOA_BEACH_BASE, dateStr: '2024-03-10T18:00:00', objects: ['Sun', 'Ocean'], labels: ['Nature', 'Beach'], ocrText: null },
  { seed: 402, label: 'Goa beach waves', event: 'goa-2024', location: 'Goa, India', baseEmbedding: GOA_BEACH_BASE, dateStr: '2024-03-10T18:10:00', objects: ['Water'], labels: ['Ocean', 'Nature'], ocrText: null },
  { seed: 403, label: 'Goa restaurant meal', event: 'goa-2024', location: 'Goa, India', baseEmbedding: GOA_RESTAURANT_BASE, dateStr: '2024-03-10T20:00:00', objects: ['Food', 'Plate'], labels: ['Dining'], ocrText: 'Fisherman Wharf' },
  { seed: 404, label: 'Goa restaurant interior', event: 'goa-2024', location: 'Goa, India', baseEmbedding: GOA_RESTAURANT_BASE, dateStr: '2024-03-10T20:10:00', objects: ['Chair', 'Table'], labels: ['Interior'], ocrText: null },
  { seed: 405, label: 'Goa hotel room view', event: 'hotel-goa', location: 'Goa, India', baseEmbedding: GOA_HOTEL_BASE, dateStr: '2024-03-10T19:00:00', objects: ['Bed', 'Window'], labels: ['Hotel'], ocrText: null },
  { seed: 406, label: 'Goa hotel pool', event: 'hotel-goa', location: 'Goa, India', baseEmbedding: GOA_HOTEL_BASE, dateStr: '2024-03-10T19:15:00', objects: ['Pool', 'Water'], labels: ['Leisure', 'Hotel'], ocrText: null },
  { seed: 407, label: 'Goa water sports', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-11T14:00:00', objects: ['Boat'], labels: ['Adventure', 'Ocean'], ocrText: null },
  { seed: 408, label: 'Goa night market', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-11T21:00:00', objects: ['Crowd', 'Stall'], labels: ['Market', 'Night'], ocrText: 'Flea Market' },
  { seed: 409, label: 'Goa fort ruins', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-12T11:00:00', objects: ['Wall', 'Stone'], labels: ['Architecture', 'History'], ocrText: null },
  { seed: 410, label: 'Goa coconut grove', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-12T13:00:00', objects: ['Tree'], labels: ['Nature', 'Plant'], ocrText: null },
  { seed: 411, label: 'Goa shack food', event: 'goa-2024', location: 'Goa, India', baseEmbedding: GOA_RESTAURANT_BASE, dateStr: '2024-03-12T14:30:00', objects: ['Food', 'Drink'], labels: ['Dining'], ocrText: 'Curlies' },
  { seed: 412, label: 'Goa boat ride', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-13T09:00:00', objects: ['Boat', 'Water'], labels: ['Travel'], ocrText: null },
  { seed: 413, label: 'Goa spice garden', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-13T12:00:00', objects: ['Plant', 'Leaf'], labels: ['Nature'], ocrText: null },
  { seed: 414, label: 'Goa church landmark', event: 'goa-2024', location: 'Goa, India', baseEmbedding: null, dateStr: '2024-03-13T15:00:00', objects: ['Building'], labels: ['Architecture', 'Religion'], ocrText: null },
  { seed: 415, label: 'Goa sunset cruise', event: 'goa-2024', location: 'Goa, India', baseEmbedding: GOA_BEACH_BASE, dateStr: '2024-03-13T18:00:00', objects: ['Sun', 'Boat'], labels: ['Ocean', 'Evening'], ocrText: null },

  // ── Birthday Party 2024 (15 photos) ───────────────
  { seed: 501, label: "Rahul's birthday cake", event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T20:00:00', objects: ['Cake', 'Candle'], labels: ['Celebration', 'Food'], ocrText: 'Happy Birthday Rahul' },
  { seed: 502, label: 'Birthday party outdoor', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T20:10:00', objects: ['People', 'Table'], labels: ['Gathering'], ocrText: null },
  { seed: 503, label: 'Birthday group photo', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T20:30:00', objects: ['Person', 'Face'], labels: ['Portrait', 'Group'], ocrText: null },
  { seed: 504, label: 'Birthday decoration balloons', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T20:45:00', objects: ['Balloon'], labels: ['Decoration'], ocrText: null },
  { seed: 505, label: 'Birthday dinner table', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T21:00:00', objects: ['Plate', 'Food'], labels: ['Dining'], ocrText: null },
  { seed: 506, label: 'Birthday candid moment', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T21:15:00', objects: ['Person'], labels: ['Smile', 'Portrait'], ocrText: null },
  { seed: 507, label: 'Birthday gifts table', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T21:30:00', objects: ['Box', 'Paper'], labels: ['Gift'], ocrText: null },
  { seed: 508, label: 'Birthday venue entrance', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T19:30:00', objects: ['Door', 'Sign'], labels: ['Entrance'], ocrText: 'Welcome' },
  { seed: 509, label: 'Birthday evening lights', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T22:00:00', objects: ['Light'], labels: ['Night', 'Illumination'], ocrText: null },
  { seed: 510, label: 'Birthday photo booth', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T22:30:00', objects: ['Person', 'Prop'], labels: ['Fun', 'Portrait'], ocrText: null },
  { seed: 511, label: 'Confetti explosion party celebration', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T20:20:00', objects: ['Confetti', 'People'], labels: ['Celebration', 'Party'], ocrText: null },
  { seed: 512, label: 'Sparkler birthday candles gleaming', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T20:25:00', objects: ['Candle', 'Fire'], labels: ['Celebration', 'Lights'], ocrText: null },
  { seed: 513, label: 'Friends cheering and toasting glasses', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T21:10:00', objects: ['Glass', 'Drink'], labels: ['Celebration', 'Friends'], ocrText: 'Cheers' },
  { seed: 514, label: 'Pastel helium balloon archway', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T19:45:00', objects: ['Balloon', 'Arch'], labels: ['Decoration', 'Party'], ocrText: null },
  { seed: 515, label: 'Birthday boy unwrapping mystery gift box', event: 'birthday-2024', location: 'Pune, India', baseEmbedding: BIRTHDAY_BASE, dateStr: '2024-11-20T22:15:00', objects: ['Box', 'Ribbon'], labels: ['Gift', 'Smile'], ocrText: null },

  // ── Documents & Receipts (15 photos) ──────────────
  { seed: 601, label: 'Document scan 2022', event: 'doc-2022', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2022-06-15T10:00:00', objects: ['Paper'], labels: ['Text', 'Document'], ocrText: 'Invoice #1029' },
  { seed: 602, label: 'Certificate 2022', event: 'doc-2022', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2022-06-15T10:05:00', objects: ['Paper'], labels: ['Certificate', 'Document'], ocrText: 'Certificate of Achievement' },
  { seed: 603, label: 'Invoice photo 2022', event: 'doc-2022', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2022-06-15T10:10:00', objects: ['Paper'], labels: ['Text', 'Finance'], ocrText: 'Total: $500' },
  { seed: 604, label: 'Receipt paper 2022', event: 'doc-2022', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2022-06-15T10:15:00', objects: ['Paper'], labels: ['Receipt', 'Text'], ocrText: 'Paid in full' },
  { seed: 605, label: 'Document scan 2024', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-10T14:00:00', objects: ['Paper'], labels: ['Text', 'Document'], ocrText: 'Invoice #4402' },
  { seed: 606, label: 'Certificate 2024', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-10T14:05:00', objects: ['Paper'], labels: ['Certificate', 'Document'], ocrText: 'Award of Excellence' },
  { seed: 607, label: 'Invoice photo 2024', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-10T14:10:00', objects: ['Paper'], labels: ['Text', 'Finance'], ocrText: 'Total: $850' },
  { seed: 608, label: 'Receipt scan 2024', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-10T14:15:00', objects: ['Paper'], labels: ['Receipt', 'Text'], ocrText: 'Thank you' },
  { seed: 609, label: 'Medical prescription pharmacy invoice receipt', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-11T11:00:00', objects: ['Paper'], labels: ['Document', 'Invoice'], ocrText: 'Rx Receipt #991' },
  { seed: 610, label: 'Bank official account statement paper', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-11T11:30:00', objects: ['Paper'], labels: ['Document', 'Finance'], ocrText: 'HDFC Statement' },
  { seed: 611, label: 'Residential rental lease agreement contract', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-12T10:00:00', objects: ['Contract', 'Paper'], labels: ['Document', 'Legal'], ocrText: 'Lease Agreement' },
  { seed: 612, label: 'Airline airport boarding pass ticket', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-12T14:00:00', objects: ['Ticket', 'Paper'], labels: ['Document', 'Travel'], ocrText: 'Air India Flight 802' },
  { seed: 613, label: 'Official income tax acknowledgement filing slip', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-13T10:15:00', objects: ['Paper'], labels: ['Document', 'Tax'], ocrText: 'ITR-V Acknowledgement' },
  { seed: 614, label: 'University graduation bachelor diploma certificate', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-13T15:00:00', objects: ['Diploma', 'Paper'], labels: ['Document', 'Certificate'], ocrText: 'Degree of Engineering' },
  { seed: 615, label: 'Monthly electricity power bill utility statement', event: 'doc-2024', location: 'Delhi, India', baseEmbedding: DOC_BASE, dateStr: '2024-09-14T09:45:00', objects: ['Paper'], labels: ['Document', 'Receipt'], ocrText: 'Power Corp Bill' },

  // ── Kashmir Trip 2024 (15 photos) ─────────────────
  { seed: 701, label: 'Snow capped Himalayan peaks', event: 'kashmir-2024', location: 'Gulmarg, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-18T10:00:00', objects: ['Mountain', 'Snow'], labels: ['Nature', 'Winter', 'Mountains'], ocrText: null },
  { seed: 702, label: 'Gondola ride above pine forest', event: 'kashmir-2024', location: 'Gulmarg, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-18T10:25:00', objects: ['Cable Car', 'Pine Tree'], labels: ['Winter', 'Adventure'], ocrText: 'Gulmarg Gondola' },
  { seed: 703, label: 'Dal lake shikara boat ride', event: 'kashmir-2024', location: 'Srinagar, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-19T16:00:00', objects: ['Boat', 'Water'], labels: ['Lake', 'Sunset'], ocrText: null },
  { seed: 704, label: 'Traditional wooden houseboat', event: 'kashmir-2024', location: 'Srinagar, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-19T16:20:00', objects: ['Houseboat', 'Water'], labels: ['Architecture', 'Heritage'], ocrText: 'Kashmir Palace' },
  { seed: 705, label: 'Pahalgam valley river stream', event: 'kashmir-2024', location: 'Pahalgam, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-20T11:30:00', objects: ['River', 'Pebbles'], labels: ['Nature', 'Valley'], ocrText: null },
  { seed: 706, label: 'Warm cup of Kashmiri Kahwa tea', event: 'kashmir-2024', location: 'Srinagar, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-20T15:00:00', objects: ['Cup', 'Kettle'], labels: ['Tea', 'Beverage'], ocrText: 'Pure Saffron Kahwa' },
  { seed: 707, label: 'Pine trees draped in thick white snow', event: 'kashmir-2024', location: 'Gulmarg, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-21T09:30:00', objects: ['Pine Tree', 'Snow'], labels: ['Nature', 'Winter'], ocrText: null },
  { seed: 708, label: 'Frozen mountain waterfall ice stalactites', event: 'kashmir-2024', location: 'Gulmarg, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-21T11:45:00', objects: ['Ice', 'Rock'], labels: ['Nature', 'Winter', 'Ice'], ocrText: null },
  { seed: 709, label: 'Skiing on powdery Gulmarg slopes', event: 'kashmir-2024', location: 'Gulmarg, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-21T14:00:00', objects: ['Skis', 'Snow'], labels: ['Adventure', 'Sports'], ocrText: 'Phase 2 Ski' },
  { seed: 710, label: 'Artisan handwoven Pashmina shawl boutique', event: 'kashmir-2024', location: 'Srinagar, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-22T11:15:00', objects: ['Fabric', 'Pattern'], labels: ['Culture', 'Craft'], ocrText: 'Kashmir Shawls' },
  { seed: 711, label: 'Morning floating vegetable market on Dal lake', event: 'kashmir-2024', location: 'Srinagar, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-22T06:30:00', objects: ['Boat', 'Vegetable'], labels: ['Lake', 'Market'], ocrText: null },
  { seed: 712, label: 'Intricate walnut wood carving artisan workshop', event: 'kashmir-2024', location: 'Srinagar, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-22T15:20:00', objects: ['Wood', 'Chisel'], labels: ['Art', 'Heritage'], ocrText: null },
  { seed: 713, label: 'Snow covered A-frame wooden cabin in woods', event: 'kashmir-2024', location: 'Pahalgam, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-23T10:00:00', objects: ['Cabin', 'Snow'], labels: ['Architecture', 'Cozy'], ocrText: null },
  { seed: 714, label: 'Purple saffron crocus blossoms field in Pampore', event: 'kashmir-2024', location: 'Pampore, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-23T14:30:00', objects: ['Flower', 'Field'], labels: ['Nature', 'Flowers'], ocrText: 'Saffron Town' },
  { seed: 715, label: 'Golden sunset over snowcapped Pir Panjal range', event: 'kashmir-2024', location: 'Gulmarg, Kashmir, India', baseEmbedding: KASHMIR_BASE, dateStr: '2024-01-23T17:45:00', objects: ['Sunset', 'Mountain'], labels: ['Nature', 'Sunset'], ocrText: null },

  // ── Animals & Pets (20 photos from Unsplash) ───────
  { seed: 901, label: 'Cheerful beagle dog with wagging tail in sunny park', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-04T16:30:00', objects: ['Dog', 'Grass'], labels: ['Animals', 'Dog', 'Beagle'], ocrText: null },
  { seed: 902, label: 'Inquisitive ginger cat gazing into camera with amber eyes', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-04T16:45:00', objects: ['Cat', 'Eyes'], labels: ['Animals', 'Cat', 'Feline'], ocrText: null },
  { seed: 903, label: 'Happy Pembroke Welsh corgi dog galloping across grassy lawn', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-05T14:00:00', objects: ['Dog', 'Lawn'], labels: ['Animals', 'Dog', 'Corgi'], ocrText: null },
  { seed: 904, label: 'Striking close up portrait of domestic cat with green eyes', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-05T14:20:00', objects: ['Cat', 'Whiskers'], labels: ['Animals', 'Cat', 'Portrait'], ocrText: null },
  { seed: 905, label: 'Golden retriever puppy lying peacefully on soft green grass', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-06T10:00:00', objects: ['Puppy', 'Grass'], labels: ['Animals', 'Puppy', 'Dog'], ocrText: null },
  { seed: 906, label: 'Playful scruffy puppy with head tilted in adorable curiosity', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-06T11:15:00', objects: ['Dog', 'Eyes'], labels: ['Animals', 'Dog', 'Cute'], ocrText: null },
  { seed: 907, label: 'Smiling golden dog running freely in warm sunshine', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-07T09:30:00', objects: ['Dog', 'Sunlight'], labels: ['Animals', 'Dog', 'Playful'], ocrText: null },
  { seed: 908, label: 'Fluffy white curly pup sitting obediently indoors', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-07T13:00:00', objects: ['Dog', 'Floor'], labels: ['Animals', 'Dog', 'Puppy'], ocrText: null },
  { seed: 909, label: 'Handsome golden retriever sitting gracefully by autumn woods', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-08T10:15:00', objects: ['Dog', 'Autumn'], labels: ['Animals', 'Dog', 'Golden Retriever'], ocrText: null },
  { seed: 910, label: 'Little grey striped kitten looking upwards in wonder', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-08T16:00:00', objects: ['Kitten', 'Whiskers'], labels: ['Animals', 'Cat', 'Kitten'], ocrText: null },
  { seed: 911, label: 'Calico tortoiseshell cat lounging comfortably on floor', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-09T11:00:00', objects: ['Cat', 'Floor'], labels: ['Animals', 'Cat', 'Pet'], ocrText: null },
  { seed: 912, label: 'Sleepy domestic cat opening mouth wide in big yawn', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-09T16:30:00', objects: ['Cat', 'Yawn'], labels: ['Animals', 'Cat', 'Funny'], ocrText: null },
  { seed: 913, label: 'Pair of energetic dogs chasing each other in green meadow', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-10T14:15:00', objects: ['Dogs', 'Meadow'], labels: ['Animals', 'Dogs', 'Outdoor'], ocrText: null },
  { seed: 914, label: 'Noble African lion resting proudly in golden savanna tall grass', event: 'animals-wild', location: 'Gir, Gujarat, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-10T17:45:00', objects: ['Lion', 'Savanna'], labels: ['Animals', 'Wildlife', 'Lion'], ocrText: null },
  { seed: 915, label: 'Wild spotted cheetah walking through open wildlife reserve', event: 'animals-wild', location: 'Kuno, Madhya Pradesh, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-11T12:00:00', objects: ['Cheetah', 'Grass'], labels: ['Animals', 'Wildlife', 'Cheetah'], ocrText: null },
  { seed: 916, label: 'Majestic wild antlered red deer stag in misty morning forest', event: 'animals-wild', location: 'Kanha, Madhya Pradesh, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-11T15:30:00', objects: ['Deer', 'Antlers', 'Forest'], labels: ['Animals', 'Wildlife', 'Deer'], ocrText: null },
  { seed: 917, label: 'Powerful wild lion portrait showing golden eyes and mane', event: 'animals-wild', location: 'Gir, Gujarat, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-12T10:00:00', objects: ['Lion', 'Mane'], labels: ['Animals', 'Wildlife', 'Safari'], ocrText: null },
  { seed: 918, label: 'Striking rainbow-billed tropical toucan bird perched on branch', event: 'animals-wild', location: 'Western Ghats, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-12T14:15:00', objects: ['Bird', 'Beak', 'Branch'], labels: ['Animals', 'Birds', 'Tropical'], ocrText: null },
  { seed: 919, label: 'Gentle wild elephant walking calmly along lush riverbank', event: 'animals-wild', location: 'Kaziranga, Assam, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-13T09:45:00', objects: ['Elephant', 'River'], labels: ['Animals', 'Wildlife', 'Elephant'], ocrText: null },
  { seed: 920, label: 'Cute French bulldog puppy resting paws with alert ears', event: 'animals-wild', location: 'Pune, India', baseEmbedding: PETS_BASE, dateStr: '2024-08-13T16:00:00', objects: ['Dog', 'Bulldog'], labels: ['Animals', 'Dog', 'Bulldog'], ocrText: null },

  // ── Plants & Flora (20 photos from Unsplash) ───────
  { seed: 1201, label: 'Echeveria jade succulents in modern ceramic pots', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-10T10:00:00', objects: ['Succulent', 'Pot'], labels: ['Plants', 'Succulents', 'Botanical'], ocrText: null },
  { seed: 1202, label: 'Misty evergreen pine forest canopy and mossy trees', event: 'plant-life', location: 'Manali, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-10T11:30:00', objects: ['Pine Tree', 'Forest'], labels: ['Plants', 'Forest', 'Nature'], ocrText: null },
  { seed: 1203, label: 'Morning dew drops glistening on fresh green leaf macro', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-11T07:15:00', objects: ['Leaf', 'Dewdrop'], labels: ['Plants', 'Foliage', 'Macro'], ocrText: null },
  { seed: 1204, label: 'Flowering saguaro and golden barrel desert cacti', event: 'plant-life', location: 'Jaipur, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-11T14:00:00', objects: ['Cactus', 'Flower'], labels: ['Plants', 'Cactus', 'Desert'], ocrText: null },
  { seed: 1205, label: 'Broad tropical monstera deliciosa Swiss cheese plant leaf', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-12T09:45:00', objects: ['Monstera', 'Leaf'], labels: ['Plants', 'Tropical', 'Houseplants'], ocrText: null },
  { seed: 1206, label: 'Sunny botanical collection of indoor potted house plants', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-12T15:20:00', objects: ['Houseplants', 'Shelf'], labels: ['Plants', 'Indoor Plants', 'Greenery'], ocrText: null },
  { seed: 1207, label: 'Colorful field of spring wildflowers in radiant bloom', event: 'plant-life', location: 'Munnar, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-13T10:30:00', objects: ['Wildflowers', 'Meadow'], labels: ['Plants', 'Flowers', 'Spring'], ocrText: null },
  { seed: 1208, label: 'Terracotta potted house plants on wooden interior shelf', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-13T16:00:00', objects: ['Pot', 'Plants'], labels: ['Plants', 'Decor', 'Houseplants'], ocrText: null },
  { seed: 1209, label: 'Sun rays breaking through lush green rainforest foliage', event: 'plant-life', location: 'Coorg, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-14T08:00:00', objects: ['Trees', 'Canopy'], labels: ['Plants', 'Forest', 'Sunlight'], ocrText: null },
  { seed: 1210, label: 'Elegant fiddle-leaf fig tree in sunlit minimalist living room', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-14T11:45:00', objects: ['Fiddle Leaf Fig', 'Planter'], labels: ['Plants', 'Houseplants', 'Interior'], ocrText: null },
  { seed: 1211, label: 'Delicate blooming pink Japanese cherry blossoms in springtime', event: 'plant-life', location: 'Shillong, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-15T09:15:00', objects: ['Cherry Blossom', 'Branch'], labels: ['Plants', 'Blossoms', 'Spring'], ocrText: null },
  { seed: 1212, label: 'Arching coconut palm tree leaves against bright summer sky', event: 'plant-life', location: 'Kerala, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-15T15:30:00', objects: ['Palm Frond', 'Sky'], labels: ['Plants', 'Palm Trees', 'Tropical'], ocrText: null },
  { seed: 1213, label: 'Lush green alpine meadow carpeted with blooming flora', event: 'plant-life', location: 'Manali, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-16T11:00:00', objects: ['Meadow', 'Mountain'], labels: ['Plants', 'Alpine', 'Meadow'], ocrText: null },
  { seed: 1214, label: 'Tiny green plant seedling sprouting from rich dark earth', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-16T14:30:00', objects: ['Seedling', 'Soil'], labels: ['Plants', 'Growth', 'Sprout'], ocrText: null },
  { seed: 1215, label: 'Radiant golden sunflowers facing the bright summer sun', event: 'plant-life', location: 'Mysore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-17T09:00:00', objects: ['Sunflowers', 'Field'], labels: ['Plants', 'Sunflowers', 'Flowers'], ocrText: null },
  { seed: 1216, label: 'Striped snake plant sansevieria in white ceramic planter', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-17T13:45:00', objects: ['Snake Plant', 'Planter'], labels: ['Plants', 'Houseplants', 'Sansevieria'], ocrText: null },
  { seed: 1217, label: 'Peaceful walking trail surrounded by towering ancient trees', event: 'plant-life', location: 'Coorg, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-18T08:30:00', objects: ['Trail', 'Trees'], labels: ['Plants', 'Woodland', 'Trees'], ocrText: null },
  { seed: 1218, label: 'Golden yellow and scarlet autumn tree leaves canopy', event: 'plant-life', location: 'Shimla, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-18T16:15:00', objects: ['Autumn Leaves', 'Branches'], labels: ['Plants', 'Autumn', 'Foliage'], ocrText: null },
  { seed: 1219, label: 'Serene emerald green misty woodland mountain slopes', event: 'plant-life', location: 'Ooty, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-19T07:45:00', objects: ['Mist', 'Forest'], labels: ['Plants', 'Forest', 'Greenery'], ocrText: null },
  { seed: 1220, label: 'Deep green delicate fern leaves in tranquil botanical garden', event: 'plant-life', location: 'Bangalore, India', baseEmbedding: PLANTS_BASE, dateStr: '2024-05-19T14:00:00', objects: ['Fern', 'Foliage'], labels: ['Plants', 'Ferns', 'Botanical'], ocrText: null },


  // ── Diwali Festival (15 photos) ───────────────────
  { seed: 1001, label: 'Glowing terracotta diyas at doorstep', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-01T19:00:00', objects: ['Diya', 'Flame'], labels: ['Festival', 'Diwali', 'Lights'], ocrText: 'Shubh Deepavali' },
  { seed: 1002, label: 'Colorful flower rangoli design', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-01T19:15:00', objects: ['Flowers', 'Floor'], labels: ['Art', 'Diwali', 'Celebration'], ocrText: null },
  { seed: 1003, label: 'Sparkler fireworks glowing in night', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-01T20:30:00', objects: ['Sparkler', 'Fire'], labels: ['Celebration', 'Night', 'Diwali'], ocrText: null },
  { seed: 1004, label: 'Assorted box of traditional Diwali sweets', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-01T21:00:00', objects: ['Box', 'Sweets'], labels: ['Food', 'Gift', 'Dessert'], ocrText: 'Haldiram Sweets' },
  { seed: 1005, label: 'Hanging paper lantern kandil', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-02T18:45:00', objects: ['Lantern', 'Light'], labels: ['Decoration', 'Diwali'], ocrText: null },
  { seed: 1006, label: 'Family lighting diyas in balcony', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-02T19:30:00', objects: ['People', 'Diya'], labels: ['Family', 'Tradition', 'Celebration'], ocrText: null },
  { seed: 1007, label: 'Golden marigold flower garland entrance door', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-02T10:00:00', objects: ['Garland', 'Door'], labels: ['Diwali', 'Tradition'], ocrText: 'Shubh Labh' },
  { seed: 1008, label: 'Children cheering around spinning ground chakkars', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-02T20:15:00', objects: ['Firework', 'Children'], labels: ['Diwali', 'Joy'], ocrText: null },
  { seed: 1009, label: 'Ornate silver gift box with premium dry fruits', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-03T11:30:00', objects: ['Box', 'Nuts'], labels: ['Gift', 'Diwali'], ocrText: 'Festive Hamper' },
  { seed: 1010, label: 'House facade decorated with glowing golden fairy lights', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-03T19:00:00', objects: ['Lights', 'House'], labels: ['Diwali', 'Illumination'], ocrText: null },
  { seed: 1011, label: 'Traditional brass puja thali with incense and bell', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-03T19:45:00', objects: ['Thali', 'Diya'], labels: ['Diwali', 'Prayer'], ocrText: null },
  { seed: 1012, label: 'Long line of earthen clay lamps glowing along boundary', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-03T20:30:00', objects: ['Diya', 'Flame'], labels: ['Diwali', 'Lights'], ocrText: null },
  { seed: 1013, label: 'Festive sweet shop counter with silver coated kaju katli', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-04T12:00:00', objects: ['Sweets', 'Tray'], labels: ['Food', 'Diwali'], ocrText: 'Kaju Katli' },
  { seed: 1014, label: 'Skyburst fireworks illuminating city night sky', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-04T21:30:00', objects: ['Fireworks', 'Sky'], labels: ['Diwali', 'Night'], ocrText: null },
  { seed: 1015, label: 'Friends in festive Indian ethnic silk kurtas smiling', event: 'diwali-2024', location: 'Delhi, India', baseEmbedding: DIWALI_BASE, dateStr: '2024-11-04T22:00:00', objects: ['People', 'Kurta'], labels: ['Diwali', 'Friends', 'Celebration'], ocrText: 'Happy Diwali' },

  // ── Misc (7 photos) ───────────────────────────────
  { seed: 101, label: 'Morning coffee', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-01T08:00:00', objects: ['Cup'], labels: ['Coffee', 'Drink'], ocrText: null },
  { seed: 102, label: 'Street food', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-02T13:00:00', objects: ['Food'], labels: ['Street', 'Snack'], ocrText: null },
  { seed: 103, label: 'Nature walk', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-03T07:00:00', objects: ['Tree'], labels: ['Nature', 'Forest'], ocrText: null },
  { seed: 104, label: 'City skyline', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-04T19:00:00', objects: ['Building'], labels: ['City', 'Architecture'], ocrText: null },
  { seed: 105, label: 'Family dinner', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-05T20:00:00', objects: ['Table', 'Person'], labels: ['Family', 'Dining'], ocrText: null },
  { seed: 106, label: 'Office meeting', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-06T10:00:00', objects: ['Laptop', 'Person'], labels: ['Work', 'Office'], ocrText: null },
  { seed: 107, label: 'Evening walk', event: null, location: null, baseEmbedding: null, dateStr: '2024-05-07T18:00:00', objects: ['Path'], labels: ['Nature', 'Sunset'], ocrText: null },
]

export const demoPhotos: Photo[] = PHOTO_SEEDS.map((p) => {
  const embedding = p.baseEmbedding ? addNoise(p.baseEmbedding, p.seed, 0.03) : randomUnitVector(p.seed)
  
  return {
    id: `demo-${p.seed}`,
    source: 'demo' as const,
    imageUrl: `/demo-photos/photo-${p.seed}.jpg`,
    thumbnailUrl: `/demo-thumbnails/thumb-${p.seed}.jpg`,
    dateTime: new Date(p.dateStr),
    datePrecision: 'exact',
    latitude: p.location?.includes('Goa') ? 15.2993 : p.location?.includes('Mumbai') ? 19.076 : p.location?.includes('Pune') ? 18.5204 : p.location?.includes('Delhi') ? 28.6139 : p.location?.includes('Kashmir') ? 34.0484 : p.location?.includes('Bangalore') ? 12.9716 : p.location?.includes('Jaipur') ? 26.9124 : p.location?.includes('Manali') ? 32.2432 : p.location?.includes('Munnar') ? 10.0889 : p.location?.includes('Coorg') ? 12.3375 : p.location?.includes('Kerala') ? 9.9312 : p.location?.includes('Gir') ? 21.1241 : p.location?.includes('Kanha') ? 22.3345 : null,
    longitude: p.location?.includes('Goa') ? 74.124 : p.location?.includes('Mumbai') ? 72.8777 : p.location?.includes('Pune') ? 73.8567 : p.location?.includes('Delhi') ? 77.209 : p.location?.includes('Kashmir') ? 74.3805 : p.location?.includes('Bangalore') ? 77.5946 : p.location?.includes('Jaipur') ? 75.7873 : p.location?.includes('Manali') ? 77.1892 : p.location?.includes('Munnar') ? 77.0595 : p.location?.includes('Coorg') ? 75.8069 : p.location?.includes('Kerala') ? 76.2673 : p.location?.includes('Gir') ? 70.8242 : p.location?.includes('Kanha') ? 80.6115 : null,
    locationName: p.location,
    objects: p.objects,
    labels: p.labels,
    ocrText: p.ocrText,
    description: p.label,
    people: [],
    embedding,
    eventId: p.event,
    eventName: p.event,
    tripId: (p.event?.startsWith('goa') || p.event?.includes('goa')) ? 'goa-2024' : (p.event?.includes('kashmir')) ? 'kashmir-2024' : (p.event?.includes('arch-tour')) ? 'arch-tour' : (p.event?.includes('plant-life')) ? 'plant-life' : null,
    neighborIds: [],
    filename: `photo-${p.seed}.jpg`,
    width: 800,
    height: 600,
    fileSize: 204800,
  }
})

// Post-process to add neighborIds (photos within 30 mins)
const THIRTY_MINS_MS = 30 * 60 * 1000

for (let i = 0; i < demoPhotos.length; i++) {
  const p1 = demoPhotos[i]
  if (!p1.dateTime) continue
  
  const time1 = p1.dateTime.getTime()
  
  for (let j = 0; j < demoPhotos.length; j++) {
    if (i === j) continue
    const p2 = demoPhotos[j]
    if (!p2.dateTime) continue
    
    const time2 = p2.dateTime.getTime()
    if (Math.abs(time1 - time2) <= THIRTY_MINS_MS) {
      p1.neighborIds.push(p2.id)
    }
  }
}
