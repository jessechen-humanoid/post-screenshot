import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { zipPath } from '../storage.js';

export async function buildJobZip(job) {
  const outputPath = zipPath(job.id);
  const files = job.items.filter((item) => item.status === 'success' && item.imagePath);
  if (files.length === 0) {
    return null;
  }

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const usedNames = new Set();

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    for (const item of files) {
      const entryName = dedupeName(item.fileName || path.basename(item.imagePath), usedNames);
      archive.file(item.imagePath, {
        name: entryName
      });
    }

    archive.finalize();
  });

  return outputPath;
}

function dedupeName(fileName, used) {
  const ext = path.extname(fileName) || '.png';
  const base = path.basename(fileName, ext);
  let candidate = `${base}${ext}`;
  let counter = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${counter}${ext}`;
    counter += 1;
  }

  used.add(candidate);
  return candidate;
}
