import fs from 'fs'
import path from 'path'
import https from 'https'

const NEW_SEEDS = [
  // Medicine (206..208, 306..308) -> makes 16 medicine photos total
  206, 207, 208, 306, 307, 308,
  // Food (807..816) -> makes 16 food photos total
  807, 808, 809, 810, 811, 812, 813, 814, 815, 816,
  // Building & Architecture (1101..1116) -> makes 16 building photos total
  1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1111, 1112, 1113, 1114, 1115, 1116,
  // Documents (609..615) -> makes 15 documents photos total
  609, 610, 611, 612, 613, 614, 615,
  // Birthday (511..515) -> makes 15 birthday photos total
  511, 512, 513, 514, 515,
  // Kashmir (707..715) -> makes 15 Kashmir photos total
  707, 708, 709, 710, 711, 712, 713, 714, 715,
  // Pets (907..915) -> makes 15 pets photos total
  907, 908, 909, 910, 911, 912, 913, 914, 915,
  // Diwali (1007..1015) -> makes 15 Diwali photos total
  1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015
]

const outputDir = path.join(process.cwd(), 'public', 'demo-photos')
const thumbDir = path.join(process.cwd(), 'public', 'demo-thumbnails')

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true })

function download(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'))

    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return download(res.headers.location, dest, maxRedirects - 1).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
      file.on('error', (err) => {
        fs.unlink(dest, () => {})
        reject(err)
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

// Fallback: in case of network issue, copy from an existing seed
function fallbackCopy(seed) {
  const samplePhoto = path.join(outputDir, 'photo-201.jpg')
  const sampleThumb = path.join(thumbDir, 'thumb-201.jpg')
  const destPhoto = path.join(outputDir, `photo-${seed}.jpg`)
  const destThumb = path.join(thumbDir, `thumb-${seed}.jpg`)
  if (!fs.existsSync(destPhoto) && fs.existsSync(samplePhoto)) {
    fs.copyFileSync(samplePhoto, destPhoto)
  }
  if (!fs.existsSync(destThumb) && fs.existsSync(sampleThumb)) {
    fs.copyFileSync(sampleThumb, destThumb)
  }
}

async function processSeed(seed) {
  const photoDest = path.join(outputDir, `photo-${seed}.jpg`)
  const thumbDest = path.join(thumbDir, `thumb-${seed}.jpg`)

  const photoUrl = `https://picsum.photos/seed/${seed}/800/600`
  const thumbUrl = `https://picsum.photos/seed/${seed}/400/400`

  try {
    await download(photoUrl, photoDest)
  } catch {
    fallbackCopy(seed)
  }

  try {
    await download(thumbUrl, thumbDest)
  } catch {
    fallbackCopy(seed)
  }
}

async function main() {
  console.log(`Starting download for ${NEW_SEEDS.length} new photos...`)
  // Process in batches of 8 to avoid socket starvation
  const BATCH_SIZE = 8
  for (let i = 0; i < NEW_SEEDS.length; i += BATCH_SIZE) {
    const batch = NEW_SEEDS.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((s) => processSeed(s)))
    process.stdout.write(`Downloaded ${Math.min(i + BATCH_SIZE, NEW_SEEDS.length)}/${NEW_SEEDS.length}...\r`)
  }
  console.log('\nAll new photos downloaded successfully.')
}

main().catch(console.error)
