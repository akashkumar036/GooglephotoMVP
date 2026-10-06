import fs from 'fs'
import path from 'path'
import https from 'https'

const PHOTOS = [
  // ── FOOD (20) ──────────────────────────────────────
  { seed: 801, unsplashId: 'photo-1546069901-ba9599a7e63c' },
  { seed: 802, unsplashId: 'photo-1565299624946-b28f40a0ae38' },
  { seed: 803, unsplashId: 'photo-1568901346375-23c9450c58cd' },
  { seed: 804, unsplashId: 'photo-1512621776951-a57141f2eefd' },
  { seed: 805, unsplashId: 'photo-1555396273-367ea4eb4db5' },
  { seed: 806, unsplashId: 'photo-1567620905732-2d1ec7ab7445' },
  { seed: 807, unsplashId: 'photo-1504674900247-0877df9cc836' },
  { seed: 808, unsplashId: 'photo-1540420773420-3366772f4999' },
  { seed: 809, unsplashId: 'photo-1565958011703-44f9829ba187' },
  { seed: 810, unsplashId: 'photo-1482049016688-2d3e1b311543' },
  { seed: 811, unsplashId: 'photo-1550547660-d9450f859349' },
  { seed: 812, unsplashId: 'photo-1563379091339-03b21ab4a4f8' },
  { seed: 813, unsplashId: 'photo-1589302168068-964664d93dc0' },
  { seed: 814, unsplashId: 'photo-1544025162-d76694265947' },
  { seed: 815, unsplashId: 'photo-1579871494447-9811cf80d66c' },
  { seed: 816, unsplashId: 'photo-1569718212165-3a8278d5f624' },
  { seed: 817, unsplashId: 'photo-1565299585323-38d6b0865b47' },
  { seed: 818, unsplashId: 'photo-1555939594-58d7cb561ad1' },
  { seed: 819, unsplashId: 'photo-1504754524776-8f4f37790ca0' },
  { seed: 820, unsplashId: 'photo-1509722747041-616f39b57569' },

  // ── PLANTS & FLORA (20) ───────────────────────────
  { seed: 1201, unsplashId: 'photo-1485955900006-10f4d324d411' },
  { seed: 1202, unsplashId: 'photo-1509316975850-ff9c5deb0cd9' },
  { seed: 1203, unsplashId: 'photo-1518531933037-91b2f5f229cc' },
  { seed: 1204, unsplashId: 'photo-1463936575829-25148e1db1b8' },
  { seed: 1205, unsplashId: 'photo-1497250681960-ef046c08a56e' },
  { seed: 1206, unsplashId: 'photo-1501004318641-b39e6451bec6' },
  { seed: 1207, unsplashId: 'photo-1470240731273-7821a6eeb6bd' },
  { seed: 1208, unsplashId: 'photo-1520412099551-62b6bafeb5bb' },
  { seed: 1209, unsplashId: 'photo-1448375240586-882707db888b' },
  { seed: 1210, unsplashId: 'photo-1530968464165-7a1861cbaf9f' },
  { seed: 1211, unsplashId: 'photo-1492496913980-501348b61469' },
  { seed: 1212, unsplashId: 'photo-1512428813834-c702c7702b78' },
  { seed: 1213, unsplashId: 'photo-1469474968028-56623f02e42e' },
  { seed: 1214, unsplashId: 'photo-1542601906990-b4d3fb778b09' },
  { seed: 1215, unsplashId: 'photo-1490750967868-88aa4486c946' },
  { seed: 1216, unsplashId: 'photo-1453904300235-0f2f60b15b5d' },
  { seed: 1217, unsplashId: 'photo-1441974231531-c6227db76b6e' },
  { seed: 1218, unsplashId: 'photo-1513836279014-a89f7a76ae86' },
  { seed: 1219, unsplashId: 'photo-1470071459604-3b5ec3a7fe05' },
  { seed: 1220, unsplashId: 'photo-1534353436294-0dbd4bdac845' },

  // ── ANIMALS & PETS (20) ───────────────────────────
  { seed: 901, unsplashId: 'photo-1543466835-00a7907e9de1' },
  { seed: 902, unsplashId: 'photo-1514888286974-6c03e2ca1dba' },
  { seed: 903, unsplashId: 'photo-1548767797-d8c844163c4c' },
  { seed: 904, unsplashId: 'photo-1574158622682-e40e69881006' },
  { seed: 905, unsplashId: 'photo-1537151608828-ea2b11777ee8' },
  { seed: 906, unsplashId: 'photo-1583511655857-d19b40a7a54e' },
  { seed: 907, unsplashId: 'photo-1534361960057-19889db9621e' },
  { seed: 908, unsplashId: 'photo-1561037404-61cd46aa615b' },
  { seed: 909, unsplashId: 'photo-1552053831-71594a27632d' },
  { seed: 910, unsplashId: 'photo-1535268647677-300dbf3d78d1' },
  { seed: 911, unsplashId: 'photo-1573865526739-10659fec78a5' },
  { seed: 912, unsplashId: 'photo-1555685812-4b943f1cb0eb' },
  { seed: 913, unsplashId: 'photo-1548199973-03cce0bbc87b' },
  { seed: 914, unsplashId: 'photo-1557008075-7f2c5efa4cfd' },
  { seed: 915, unsplashId: 'photo-1456926631375-92c8ce872def' },
  { seed: 916, unsplashId: 'photo-1535083783855-76ae62b2914e' },
  { seed: 917, unsplashId: 'photo-1546182990-dffeafbe841d' },
  { seed: 918, unsplashId: 'photo-1551969014-7d2c4cddf0b6' },
  { seed: 919, unsplashId: 'photo-1534567153574-2b12153a87f0' },
  { seed: 920, unsplashId: 'photo-1517849845537-4d257902454a' }
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
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
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

async function processPhoto(item) {
  const photoDest = path.join(outputDir, `photo-${item.seed}.jpg`)
  const thumbDest = path.join(thumbDir, `thumb-${item.seed}.jpg`)

  const fullUrl = `https://images.unsplash.com/${item.unsplashId}?auto=format&fit=crop&w=800&h=600&q=80`
  const thumbUrl = `https://images.unsplash.com/${item.unsplashId}?auto=format&fit=crop&w=400&h=400&q=80`

  try {
    await download(fullUrl, photoDest)
  } catch (err) {
    console.error(`Failed full photo ${item.seed} (${item.unsplashId}):`, err.message)
  }

  try {
    await download(thumbUrl, thumbDest)
  } catch (err) {
    console.error(`Failed thumb photo ${item.seed} (${item.unsplashId}):`, err.message)
  }
}

async function main() {
  console.log(`Downloading ${PHOTOS.length} Unsplash photos for food, plants, and animals...`)
  const BATCH_SIZE = 6
  for (let i = 0; i < PHOTOS.length; i += BATCH_SIZE) {
    const batch = PHOTOS.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((p) => processPhoto(p)))
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, PHOTOS.length)} / ${PHOTOS.length} downloaded.`)
  }
  console.log('All Unsplash photos downloaded successfully!')
}

main().catch(console.error)
