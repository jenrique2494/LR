const fs = require('fs').promises;
const axios = require('axios');

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch dictionary data with retries
async function fetchDictionaryData(word, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            return response.data;
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed for dictionary data (${word}):`, error.message);
            if (attempt < retries) {
                await delay(1000 * attempt); // Exponential backoff
                continue;
            }
            return null;
        }
    }
}

// Function to fetch example sentences with retries
async function fetchExamples(word, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(`https://corpus.vocabulary.com/api/1.0/examples/random.json?maxResults=3&query=${word}&startOffset=0`);
            return response.data;
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed for examples (${word}):`, error.message);
            if (attempt < retries) {
                await delay(1000 * attempt); // Exponential backoff
                continue;
            }
            return null;
        }
    }
}

// Function to get frequency range
function getFrequencyRange(index) {
    const rangeStart = Math.floor(index / 1000) * 1000;
    const rangeEnd = rangeStart + 1000;
    return `${rangeStart}-${rangeEnd}`;
}

// Function to save progress
async function saveProgress(data) {
    try {
        await fs.writeFile('structured_words.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving progress:', error.message);
    }
}

// Function to load existing progress
async function loadProgress() {
    try {
        const data = await fs.readFile('structured_words.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function main() {
    try {
        // Argumentos: start, end, output
        const [,, startArg, endArg, outputFile] = process.argv;
        const start = parseInt(startArg, 10) || 0;
        const end = parseInt(endArg, 10) || 40000;
        const output = outputFile || 'structured_words.json';

        // Leer y parsear el archivo JSON
        const data = JSON.parse(await fs.readFile('LR.json', 'utf8'));
        const words = data.data.words;

        // Cargar progreso existente (si existe)
        let structuredData = {};
        try {
            const existing = await fs.readFile(output, 'utf8');
            structuredData = JSON.parse(existing);
        } catch (e) {
            structuredData = {};
        }

        // Procesar solo el rango indicado
        for (let i = start; i < Math.min(end, words.length); i++) {
            const wordObj = words[i];
            const word = wordObj.text;

            if (structuredData[word]) {
                console.log(`\nSkipping already processed word: ${word} (${i + 1}/${words.length})`);
                continue;
            }

            console.log(`\nProcessing word: ${word} (${i + 1}/${words.length})`);

            structuredData[word] = {
                word: word,
                definition: '',
                partOfSpeech: '',
                grammar: '',
                ipa: '',
                example1: '',
                example2: '',
                example3: '',
                frequency: getFrequencyRange(i)
            };

            // Fetch dictionary data
            const dictData = await fetchDictionaryData(word);
            if (dictData && dictData[0]) {
                const entry = dictData[0];
                if (entry.phonetic) {
                    structuredData[word].ipa = entry.phonetic;
                } else if (entry.phonetics && entry.phonetics.length > 0) {
                    const phoneticText = entry.phonetics.find(p => p.text)?.text;
                    if (phoneticText) structuredData[word].ipa = phoneticText;
                }
                if (entry.meanings && entry.meanings[0]) {
                    const meaning = entry.meanings[0];
                    structuredData[word].partOfSpeech = meaning.partOfSpeech || '';
                    if (meaning.definitions && meaning.definitions[0]) {
                        structuredData[word].definition = meaning.definitions[0].definition;
                        if (meaning.definitions[0].grammar) {
                            structuredData[word].grammar = meaning.definitions[0].grammar;
                        }
                    }
                }
            }

            // Fetch example sentences
            const examples = await fetchExamples(word);
            if (examples && examples.result && examples.result.sentences) {
                const sentences = examples.result.sentences;
                if (sentences[0]) structuredData[word].example1 = sentences[0].sentence;
                if (sentences[1]) structuredData[word].example2 = sentences[1].sentence;
                if (sentences[2]) structuredData[word].example3 = sentences[2].sentence;
            }

            // Guardar progreso en el archivo de salida
            try {
                await fs.writeFile(output, JSON.stringify(structuredData, null, 2));
            } catch (error) {
                console.error('Error saving progress:', error.message);
            }

            await delay(1000);
        }

        console.log(`\nWords processed and saved to ${output}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();