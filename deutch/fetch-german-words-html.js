const fs = require('fs');
const path = require('path');
const https = require('https');
const { JSDOM } = require('jsdom');

const BASE_URL = 'https://speak.tatar/en/lang/100000-most-common-words-in-german/?p=';
const OUTPUT_FILE = path.join(__dirname, 'german-words-20000.json');
const TOTAL_PAGES = 200;
const WORDS_PER_PAGE = 100;

async function fetchPageHtml(pageNum) {
    return new Promise((resolve, reject) => {
        const url = BASE_URL + pageNum;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseWordsFromHtml(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const rows = document.querySelectorAll('tr');
    const words = [];
    rows.forEach(row => {
        const rankCell = row.querySelector('th[scope="row"] small');
        const wordCell = row.querySelector('td a');
        if (rankCell && wordCell) {
            const rank = parseInt(rankCell.textContent.trim(), 10);
            const title = wordCell.textContent.trim();
            const slug = wordCell.getAttribute('href').split('/').pop().replace(/\/$/, '');
            words.push({ rank, title, slug });
        }
    });
    return words;
}

async function main() {
    let allWords = [];
    for (let p = 1; p <= TOTAL_PAGES; p++) {
        console.log(`Descargando página ${p}...`);
        try {
            const html = await fetchPageHtml(p);
            const words = parseWordsFromHtml(html);
            allWords = allWords.concat(words);
            console.log(`  - ${words.length} palabras extraídas (Total: ${allWords.length})`);
        } catch (err) {
            console.error(`Error en página ${p}:`, err.message);
        }
        await new Promise(res => setTimeout(res, 300));
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allWords, null, 2), 'utf8');
    console.log(`\n✓ Archivo guardado exitosamente: ${OUTPUT_FILE}`);
    console.log(`  Total de palabras: ${allWords.length}`);
}

main();
