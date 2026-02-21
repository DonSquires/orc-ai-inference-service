import https from 'https';
import fs from 'fs';
import path from 'path';

const OWNER = process.env.GITHUB_OWNER || 'DonSquires';
const REPO  = process.env.GITHUB_REPO || 'orc-ai-inference-service';
const TAG   = process.env.MODEL_TAG || 'v1-models';
const ASSETS = (process.env.MODEL_ASSETS || 'embedder.onnx,yolov10.onnx').split(',');
const DEST_DIR = process.env.MODEL_DIR || './models';

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

const headers = { 
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'NodeJS-Downloader'
};
if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let data=''; res.on('data', d => data += d);
      res.on('end', () => res.statusCode>=200 && res.statusCode<300
        ? resolve(JSON.parse(data)) : reject(new Error(`${res.statusCode}: ${data}`)));
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => {
        const size = fs.statSync(dest).size;
        if (size < 5*1024*1024) return reject(new Error(`Size guard failed for ${dest} (${size} bytes)`));
        resolve();
      }));
    }).on('error', reject);
  });
}

(async () => {
  console.log(`Fetching release info for ${OWNER}/${REPO}@${TAG}...`);
  const release = await getJson(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
  for (const name of ASSETS) {
    const asset = (release.assets || []).find(a => a.name === name);
    if (!asset) throw new Error(`Asset '${name}' not found on tag '${TAG}'`);
    const destPath = path.join(DEST_DIR, name);
    console.log(`Downloading ${name} (${(asset.size/1048576).toFixed(2)} MB) to ${destPath}...`);
    await download(asset.browser_download_url, destPath);
    console.log(`OK: ${name}`);
  }
})().catch(err => { console.error(err); process.exit(1); });
