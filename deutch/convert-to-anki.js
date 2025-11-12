const fs = require('fs');
const path = require('path');

// Directory containing the structured files (this script is inside deutch/)
const inputDir = __dirname;

// Function to generate UUID placeholder (kept for compatibility if needed)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to determine level based on frequency
function getLevel(frequency) {
  if (!frequency) return 'B2';
  
  const freqNum = parseInt(String(frequency).split('-')[0]);
  if (freqNum <= 1000) return 'A1';
  if (freqNum <= 3000) return 'A2';
  if (freqNum <= 5000) return 'B1';
  if (freqNum <= 10000) return 'B2';
  if (freqNum <= 15000) return 'C1';
  return 'C2';
}

// Function to clean text for CSV (escape quotes, normalize newlines)
function cleanText(text) {
  if (text === null || text === undefined) return '';
  const s = String(text);
  return s.replace(/"/g, '""').replace(/[\r\n]+/g, ' ').trim();
}

// CSV Header (kept same as original)
const csvHeader = `#separator:comma
#html:true
#notetype:JPCARDSDE
#deck column:1
#tags column:13`;
//German::Level,Word,UUID,UID,Part of Speech,Grammar,Pronunciation/IPA,Audio Link,Definition,Example 1,Example 2,Example 3,Tags`;

// Convert words to CSV rows

// Find all structured-german-words_*.json files in inputDir
const files = fs.readdirSync(inputDir).filter(f => /^structured-german-words_\d+\.json$/.test(f));
files.sort((a, b) => {
  const na = parseInt(a.match(/_(\d+)\.json$/)[1], 10);
  const nb = parseInt(b.match(/_(\d+)\.json$/)[1], 10);
  return na - nb;
});

if (files.length === 0) {
  console.error('No se encontraron archivos structured-german-words_*.json en', inputDir);
  process.exit(1);
}

// Option: produce combined CSV
const produceCombined = true;
const combinedRows = [];

files.forEach(fileName => {
  const filePath = path.join(inputDir, fileName);
  let structuredWords;
  try {
    structuredWords = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error leyendo/parsing ${fileName}:`, err.message);
    return;
  }

  const csvRows = [];

  Object.values(structuredWords).forEach(wordData => {
    const level = wordData.frequency || '';
    const title = cleanText(wordData.title || '');
    const slug = cleanText(wordData.slug || '');
    const rank = cleanText(wordData.rank || '');
    const partOfSpeech = cleanText(wordData.partOfSpeech || '');
    const grammar = cleanText(wordData.grammar || '');
    const ipa = cleanText(wordData.ipa || '');
    const audioLink = ''; // Always blank as per instructions
    const definition = cleanText(wordData.definition || '');
    const example1 = cleanText(wordData.example1 || '');
    const example2 = cleanText(wordData.example2 || '');
    const example3 = cleanText(wordData.example3 || '');
    const tags = cleanText(`${wordData.frequency || ''} ${getLevel(wordData.frequency)}`.trim());

    // Build CSV row - keep examples and definition quoted to preserve commas
    const csvRow = `German::${level},${title},${slug},${rank},${partOfSpeech},${grammar},${ipa},${audioLink},"${definition}","${example1}","${example2}","${example3}","${tags}"`;

    csvRows.push(csvRow);
    if (produceCombined) combinedRows.push(csvRow);
  });

  // Output file name: anki_cards_german_<n>.csv where n is extracted from source
  const match = fileName.match(/_(\d+)\.json$/);
  const index = match ? match[1] : '1';
  const outName = `anki_cards_german_${index}.csv`;
  const outPath = path.join(inputDir, outName);

  const csvContent = csvHeader + '\n' + csvRows.join('\n');

  try {
    fs.writeFileSync(outPath, csvContent, 'utf8');
    console.log(`Creado: ${outName} (${csvRows.length} filas)`);
  } catch (err) {
    console.error(`Error escribiendo ${outName}:`, err.message);
  }
});

if (produceCombined && combinedRows.length > 0) {
  const combinedPath = path.join(inputDir, 'anki_cards_german_all.csv');
  try {
    fs.writeFileSync(combinedPath, csvHeader + '\n' + combinedRows.join('\n'), 'utf8');
    console.log(`Creado combinado: anki_cards_german_all.csv (${combinedRows.length} filas)`);
  } catch (err) {
    console.error('Error escribiendo archivo combinado:', err.message);
  }
}

console.log('Conversión completada.');