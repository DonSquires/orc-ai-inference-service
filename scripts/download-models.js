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

const baseHeaders = { 
  'User-Agent': 'NodeJS-Downloader',
  'Accept': 'application/vnd.github+json'
};

if (process.env.GITHUB_TOKEN) {
  baseHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: baseHeaders }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const options = { headers: { ...baseHeaders } };
    
    https.get(url, options, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const nextUrl = res.headers.location;
        if (nextUrl.includes('github-production-release-asset-2e65be') || nextUrl.includes('s3.amazonaws.com')) {
          delete options.headers['Authorization'];
        }
        return download(nextUrl, dest).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', d => errData += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode} for ${url}: ${errData}`)));
        return;
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => {
        const size = fs.statSync(dest).size;
        if (size < 1024 * 1024) {
          return reject(new Error(`Size guard failed for ${dest} (${size} bytes). Asset might be missing or corrupt.`));
        }
        resolve();
      }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log(`Fetching release info for ${OWNER}/${REPO}@${TAG}...`);
    const release = await getJson(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
    
    for (const name of ASSETS) {
      const asset = (release.assets || []).find(a => a.name === name);
      if (!asset) {
        throw new Error(`Asset '${name}' not found on tag '${TAG}'. Available assets: ${(release.assets || []).map(a => a.name).join(', ')}`);
      }
      
      const destPath = path.join(DEST_DIR, name);
      console.log(`Downloading ${name} (${(asset.size / 1048576).toFixed(2)} MB) to ${destPath}...`);
      
      const downloadUrl = process.env.GITHUB_TOKEN 
        ? `https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${asset.id}`
        : asset.browser_download_url;

      if (process.env.GITHUB_TOKEN) {
        baseHeaders['Accept'] = 'application/octet-stream';
      } else {
        baseHeaders['Accept'] = '*/*';
      }

      await download(downloadUrl, destPath);
      console.log(`OK: ${name} (${fs.statSync(destPath).size} bytes)`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
})();