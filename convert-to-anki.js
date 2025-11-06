const fs = require('fs');

// Read the structured_words.json file
const structuredWords = JSON.parse(fs.readFileSync('structured_words.json', 'utf8'));

// Function to generate UUID placeholder
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
  
  const freqNum = parseInt(frequency.split('-')[0]);
  if (freqNum <= 5000) return 'B1';
  if (freqNum <= 15000) return 'B2';
  if (freqNum <= 25000) return 'C1';
  return 'C2';
}

// Function to clean text for CSV (remove quotes, commas that could break CSV)
function cleanText(text) {
  if (!text) return '';
  return text.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
}

// CSV Header
const csvHeader = `#separator:comma
#html:true
#notetype:COCA-English
#deck column:1
#tags column:13
LR::Level,Word,UUID,UID,Part of Speech,Grammar,Pronunciation/IPA,Audio Link,Definition,Example 1,Example 2,Example 3,Tags`;

// Convert words to CSV rows
const csvRows = [];

Object.values(structuredWords).forEach(wordData => {
  const level = wordData.frequency;
  const word = cleanText(wordData.word || '');
  const uuid = generateUUID();
  const uid = generateUUID();
  const partOfSpeech = cleanText(wordData.partOfSpeech || '');
  const grammar = cleanText(wordData.grammar || '');
  const ipa = cleanText(wordData.ipa || '');
  const audioLink = ''; // Always blank as per instructions
  const definition = cleanText(wordData.definition || '');
  const example1 = cleanText(wordData.example1 || '');
  const example2 = cleanText(wordData.example2 || '');
  const example3 = cleanText(wordData.example3 || '');
  const tags = `LR::${wordData.frequency}`;

  // Create CSV row
  const csvRow = `LR::${level},${word},${uuid},${uid},${partOfSpeech},${grammar},${ipa},${audioLink},"${definition}","${example1}","${example2}","${example3}",${tags}`;
  
  csvRows.push(csvRow);
});

// Combine header and rows
const csvContent = csvHeader + '\n' + csvRows.join('\n');

// Write to anki_cards.csv
fs.writeFileSync('anki_cards.csv', csvContent, 'utf8');

console.log(`Successfully converted ${csvRows.length} words to anki_cards.csv`);
console.log('CSV file is ready for Anki import!');