const fs = require('fs').promises;
const axios = require('axios');

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const CSRF_TOKEN = 'CltxKrUkog883U7V7bzrWmdpBwtjVgpO';
const HEADERS = {
    'accept': '*/*',
    'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
    'Cookie': `csrftoken=${CSRF_TOKEN}`
};

// Fetch definition from AI dictionary
async function fetchDefinition(slug, id, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const url = `https://speak.tatar/de/dict/ajax/get/dict-ai?from=deu&to=deu&text=${slug}&id=${id}`;
            const response = await axios.get(url, { headers: HEADERS });
            return response.data.text || '';
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed for definition (${slug}):`, error.message);
            if (attempt < retries) {
                await delay(1000 * attempt);
                continue;
            }
            return '';
        }
    }
}

// Fetch first example (AI generated)
async function fetchExampleAI(slug, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const url = `https://speak.tatar/en/user/fcs/ajax/ai-sents/?w=${slug}&wl=3&fcl=3`;
            const response = await axios.get(url, { headers: HEADERS });
            const text = response.data.text || '';
            // Split by <br> and take the first sentence
            if (text) {
                const sentences = text.split('<br>');
                return sentences[0] ? sentences[0].trim() : '';
            }
            return '';
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed for example AI (${slug}):`, error.message);
            if (attempt < retries) {
                await delay(1000 * attempt);
                continue;
            }
            return '';
        }
    }
}

// Fetch literary examples
async function fetchLiteraryExamples(slug, id, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const url = `https://speak.tatar/en/dict/ajax/load/lit-examples?from=deu&to=deu&id=${id}&slug=${slug}&title-org=${slug}&p=1`;
            const response = await axios.get(url, { headers: HEADERS });
            const html = response.data.html_examples || '';
            
            // Extract examples from the HTML
            const examples = extractExamplesFromHTML(html);
            return examples.slice(0, 2); // Take only the first 2 literary examples
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed for literary examples (${slug}):`, error.message);
            if (attempt < retries) {
                await delay(1000 * attempt);
                continue;
            }
            return [];
        }
    }
}

// Extract sentences from the HTML response
function extractExamplesFromHTML(html) {
    const examples = [];
    const regex = /<div class="mb-3 div-examples">(.*?)<\/div>\s*<\/div>\s*<\/div>/gs;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        const block = match[1];
        const sentenceRegex = /<p>(.*?)<\/p>/g;
        let sentenceMatch;
        
        while ((sentenceMatch = sentenceRegex.exec(block)) !== null) {
            let sentence = sentenceMatch[1];
            // Remove HTML tags but keep the text
            sentence = sentence.replace(/<span class="word-in-example">/g, '');
            sentence = sentence.replace(/<\/span>/g, '');
            sentence = sentence.replace(/<br>/g, ' ');
            sentence = sentence.trim();
            
            if (sentence && sentence.length > 10) {
                examples.push(sentence);
                if (examples.length >= 2) break;
            }
        }
        
        if (examples.length >= 2) break;
    }
    
    return examples;
}

async function main() {
    try {
        // Load German words with slugs
        const germanWordsData = JSON.parse(
            await fs.readFile('deutch/german-words-20000-with-slugs.json', 'utf8')
        );

        let structuredData = {};
        
        // Try to load existing progress
        try {
            const existing = await fs.readFile('german-structured-words.json', 'utf8');
            structuredData = JSON.parse(existing);
        } catch (e) {
            // File doesn't exist yet
        }

        const totalWords = germanWordsData.length;

        for (let i = 0; i < totalWords; i++) {
            const wordObj = germanWordsData[i];
            const { rank, title, slug, id } = wordObj;

            if (structuredData[title]) {
                console.log(`\nSkipping already processed word: ${title} (${i + 1}/${totalWords})`);
                continue;
            }

            console.log(`\nProcessing word: ${title} (Rank: ${rank}) (${i + 1}/${totalWords})`);

            structuredData[title] = {
                rank: rank,
                title: title,
                slug: slug,
                definition: '',
                example1: '',
                example2: '',
                example3: ''
            };

            // Fetch definition from AI
            console.log('  - Fetching definition...');
            const definition = await fetchDefinition(slug, id);
            structuredData[title].definition = definition;

            // Fetch first example (AI generated)
            console.log('  - Fetching AI example...');
            const exampleAI = await fetchExampleAI(slug);
            structuredData[title].example1 = exampleAI;

            // Fetch literary examples
            console.log('  - Fetching literary examples...');
            const literaryExamples = await fetchLiteraryExamples(slug, id);
            if (literaryExamples.length >= 1) {
                structuredData[title].example2 = literaryExamples[0];
            }
            if (literaryExamples.length >= 2) {
                structuredData[title].example3 = literaryExamples[1];
            }

            // Save progress
            try {
                await fs.writeFile('german-structured-words.json', JSON.stringify(structuredData, null, 2));
            } catch (error) {
                console.error('Error saving progress:', error.message);
            }

            await delay(500);
        }

        console.log(`\nWords processed and saved to german-structured-words.json`);
        console.log(`Total words processed: ${Object.keys(structuredData).length}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
