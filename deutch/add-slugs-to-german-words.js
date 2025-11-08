const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'german-words-20000.json');
const OUTPUT_FILE = path.join(__dirname, 'german-words-20000-with-slugs.json');

function makeSlug(title) {
  if (!title || typeof title !== 'string') return '';
  // Normalize unicode (decompose), remove diacritics
  let s = title.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  // Replace German sharp s
  s = s.replace(/ß/g, 'ss');
  // Replace non-alphanumeric characters with hyphens
  s = s.replace(/[^\p{L}\p{Nd}]+/gu, '-');
  // Collapse multiple hyphens and trim
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s.toLowerCase();
}

function processArray(arr) {
  let changed = 0;
  for (let item of arr) {
    if (!item) continue;
    const title = item.title || item.name || item.word || '';
    const existingSlug = item.slug || '';
    const generated = makeSlug(title);
    if (!existingSlug || existingSlug.length === 0) {
      item.slug = generated;
      changed++;
    } else {
      // if existing slug looks like a full URL, extract last segment
      if (existingSlug.includes('http') || existingSlug.includes('/')) {
        try {
          const parts = existingSlug.split('/').filter(Boolean);
          const last = parts[parts.length - 1];
          if (last && last.length > 0) {
            item.slug = last.replace(/\/$/, '');
            // if now empty, fallback to generated
            if (!item.slug) item.slug = generated;
          }
        } catch (e) {
          item.slug = generated;
        }
      }
    }
    // ensure slug is normalized (no diacritics, no spaces)
    if (item.slug) {
      const norm = makeSlug(item.slug);
      if (norm !== item.slug) {
        item.slug = norm;
      }
    }
  }
  return changed;
}

try {
  const raw = fs.readFileSync(INPUT_FILE, 'utf8');
  const data = JSON.parse(raw);
  let arr = null;
  if (Array.isArray(data)) arr = data;
  else if (data && Array.isArray(data.words)) arr = data.words;
  else throw new Error('Formato de JSON no reconocido (esperado array o { words: [] })');

  console.log(`Entradas a procesar: ${arr.length}`);
  const changed = processArray(arr);
  console.log(`Slugs añadidos o corregidos: ${changed}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✓ Archivo guardado: ${OUTPUT_FILE}`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
