const fs = require('fs');

// Read the main structured_words.json file
let mainWords = {};
try {
  const mainContent = fs.readFileSync('structured_words.json', 'utf8');
  mainWords = JSON.parse(mainContent);
} catch (error) {
  console.log('Main structured_words.json not found or empty, starting fresh');
}

// Read and merge all numbered files
for (let i = 1; i <= 20; i++) {
  const filename = `structured_words_${i}.json`;
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const wordsData = JSON.parse(content);
    
    // Merge the words into the main object
    Object.assign(mainWords, wordsData);
    console.log(`Merged ${filename} - added ${Object.keys(wordsData).length} words`);
  } catch (error) {
    console.log(`Could not read ${filename}: ${error.message}`);
  }
}

// Write the merged data back to structured_words.json
fs.writeFileSync('structured_words.json', JSON.stringify(mainWords, null, 2));

console.log(`\nMerge complete! Total words in structured_words.json: ${Object.keys(mainWords).length}`);