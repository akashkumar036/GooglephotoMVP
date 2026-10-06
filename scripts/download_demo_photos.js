import fs from 'fs'
import path from 'path'
import https from 'https'

const SEEDS = [
  // Medicine 2023 (10)
  201, 202, 203, 204, 205,
  // Medicine 2025 (10)
  301, 302, 303, 304, 305,
  // Goa Trip (15)
  401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415,
  // Birthday (10)
  501, 502, 503, 504, 505, 506, 507, 508, 509, 510,
  // Documents (8)
  601, 602, 603, 604, 605, 606, 607, 608,
  // Misc (7)
  101, 102, 103, 104, 105, 106, 107
]

const outputDir = path.join(process.cwd(), 'public', 'demo-photos')
const thumbDir = path.join(process.cwd(), 'public', 'demo-thumbnails')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}
if (!fs.existsSync(thumbDir)) {
  fs.mkdirSync(thumbDir, { recursive: true })
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject)
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`))
      }
      const file = fs.createWriteStream(dest)
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err))
    })
  })
}

async function main() {
  console.log(`Downloading ${SEEDS.length} images...`)
  
  const promises = SEEDS.flatMap((seed) => {
    const fullUrl = `https://picsum.photos/seed/${seed}/800/600`
    const fullDest = path.join(outputDir, `photo-${seed}.jpg`)
    
    const thumbUrl = `https://picsum.photos/seed/${seed}/400/400`
    const thumbDest = path.join(thumbDir, `thumb-${seed}.jpg`)
    
    return [
      download(fullUrl, fullDest).catch(e => console.error(`Failed ${seed} full:`, e.message)),
      download(thumbUrl, thumbDest).catch(e => console.error(`Failed ${seed} thumb:`, e.message))
    ]
  })
  
  await Promise.all(promises)
  console.log('Done downloading images.')
}

main().catch(console.error)
