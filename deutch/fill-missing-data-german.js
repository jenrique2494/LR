const fs = require('fs');
const path = require('path');
const https = require('https');

// Argumentos: fileNumber (1, 2, 3, etc.)
const [, , fileNumberArg] = process.argv;
const FILE_NUMBER = parseInt(fileNumberArg, 10) || 1;
const INPUT_FILE = path.join(__dirname, `structured-german-words_${FILE_NUMBER}.json`);
const OUTPUT_FILE = path.join(__dirname, `structured-german-words_${FILE_NUMBER}.json`);
const LOG_FILE = path.join(__dirname, `fill-missing-data-${FILE_NUMBER}.log`);

const CSRF_TOKEN = 'CltxKrUkog883U7V7bzrWmdpBwtjVgpO';
const SESSION_ID = '2bfxw059bcpe084cnbedy6n60wa5e0ej';

let structuredData = {};
let updatedCount = 0;

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage + '\n', 'utf8');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const defaultHeaders = {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en-GB;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'Pragma': 'no-cache',
            'Priority': 'u=1, i',
            'Referer': 'https://speak.tatar/en/dict/eng-eng/the-state-of-the/',
            'Sec-Ch-Ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            'Sec-Ch-Ua-Mobile': '?1',
            'Sec-Ch-Ua-Platform': '"Android"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
            'Cookie': `csrftoken=${CSRF_TOKEN}; sessionid=${SESSION_ID}; dictionary_dict_from=deu; dictionary_dict_to=deu`
        };

        const options = {
            headers: { ...defaultHeaders, ...headers }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

async function fetchDefinition(slug) {
    try {
        const url = `https://speak.tatar/de/dict/ajax/get/dict-ai?from=deu&to=deu&text=${encodeURIComponent(slug)}`;
        
        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            
            https.get(url, { headers }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    let redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        if (redirectUrl.startsWith('/')) {
                            redirectUrl = `https://speak.tatar${redirectUrl}`;
                        }
                        https.get(redirectUrl, { headers }, (res2) => {
                            let data = '';
                            res2.on('data', chunk => data += chunk);
                            res2.on('end', () => {
                                try {
                                    const parsed = JSON.parse(data);
                                    if (parsed && parsed.text) {
                                        resolve(parsed.text);
                                    } else {
                                        resolve('');
                                    }
                                } catch (e) {
                                    resolve('');
                                }
                            });
                        }).on('error', () => resolve(''));
                    } else {
                        resolve('');
                    }
                } else {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed && parsed.text) {
                                resolve(parsed.text);
                            } else {
                                resolve('');
                            }
                        } catch (e) {
                            resolve('');
                        }
                    });
                }
            }).on('error', () => resolve(''));
        });
    } catch (err) {
        return '';
    }
}

async function fetchAiSentences(word) {
    try {
        const wordLength = word.length;
        const url = `https://speak.tatar/en/user/fcs/ajax/ai-sents/?w=${encodeURIComponent(word)}&wl=${wordLength}&fcl=3`;
        const response = await httpsGet(url);
        if (response && response.text) {
            const sentences = response.text.split('<br>').map(s => s.trim()).filter(s => s.length > 0);
            return sentences.join('\n');
        }
        return '';
    } catch (err) {
        return '';
    }
}

async function fetchLiteraryExamples(slug,title) {
    try {
        const url = `https://speak.tatar/en/dict/ajax/load/lit-examples?from=deu&to=deu&slug=${encodeURIComponent(slug)}&title-org=${encodeURIComponent(title)}&p=1`;

        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en-GB;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json',
                'Pragma': 'no-cache',
                'Cookie': `csrftoken=${CSRF_TOKEN}; sessionid=${SESSION_ID}; dictionary_dict_from=deu; dictionary_dict_to=deu`
            };
            
            https.get(url, { headers }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    let redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        // Convertir URL relativa a absoluta
                        if (!redirectUrl.startsWith('http')) {
                            redirectUrl = `https://speak.tatar${redirectUrl}`;
                        }
                        
                        https.get(redirectUrl, { headers }, (res2) => {
                            let data = '';
                            res2.on('data', chunk => data += chunk);
                            res2.on('end', () => {
                                // console.log('data',data)
                                resolve(parseExamples(data));
                            });
                        }).on('error', () => resolve([]));
                    } else {
                        resolve([]);
                    }
                } else {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve(parseExamples(data));
                    });
                }
            }).on('error', () => resolve([]));
        });
    } catch (err) {
        return [];
    }
}

function parseExamples(htmlData) {
    try {
        const parsed = JSON.parse(htmlData);
        if (!parsed) {
            log('📭 parseExamples: parsed is null');
            return [];
        }
        if (!parsed.html_examples) {
            log(`📭 parseExamples: no html_examples field. Keys: ${Object.keys(parsed).join(',')}`);
            return [];
        }
        
        const examplesRegex = /<div class="mb-3 div-examples">[\s\S]*?<\/div>\s*<\/div>/g;
        const matches = parsed.html_examples.match(examplesRegex);
        const examples = [];
        
        if (matches) {
            for (let i = 0; i < Math.min(matches.length, 2); i++) {
                const itemsRegex = /<div class="word-ex-items">([\s\S]*?)<\/div>/;
                const itemsMatch = matches[i].match(itemsRegex);
                if (itemsMatch) {
                    let html = itemsMatch[1];
                    const paragraphRegex = /<p>([\s\S]*?)<\/p>/g;
                    const paragraphs = [];
                    let pMatch;
                    
                    while ((pMatch = paragraphRegex.exec(html)) !== null) {
                        let pText = pMatch[1];
                        // Mantener los spans con la clase "word-in-example"
                        // Solo remover entidades HTML y espacios extras
                        pText = pText.replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '');
                        pText = pText.replace(/\s+/g, ' ').trim();
                        if (pText.length > 0) {
                            paragraphs.push(pText);
                        }
                    }
                    
                    const text = paragraphs.join('\n');
                    if (text.length > 0) {
                        examples.push(text);
                    }
                }
            }
        }
        return examples;
    } catch (e) {
        log(`📭 parseExamples error: ${e.message}`);
        return [];
    }
}

async function fillMissingData(wordKey, wordData, index, total) {
    const { title, slug } = wordData;
    if (!title || !slug) return;

    // Verificar si todos los campos están completos
    const hasDefinition = wordData.definition && wordData.definition !== '';
    const hasExample1 = wordData.example1 && wordData.example1 !== '';
    const hasExample2 = wordData.example2 && wordData.example2 !== '';
    const hasExample3 = wordData.example3 && wordData.example3 !== '';

    // Si todos los campos están completos, no hacer nada
    if (hasDefinition && hasExample1 && hasExample2 && hasExample3) {
        return;
    }

    let needsUpdate = false;
    let hasStartedLogging = false;

    // Verificar y llenar definición
    if (!hasDefinition) {
        if (!hasStartedLogging) {
            log(`\n[${index}/${total}] Processing: "${title}"`);
            hasStartedLogging = true;
        }
        log(`  → Fetching definition...`);
        const definition = await fetchDefinition(slug);
        if (definition) {
            structuredData[wordKey].definition = definition;
            needsUpdate = true;
            log(`    ✓ Definition found`);
        }
        await delay(1000);
    }

    // Verificar y llenar example1 (AI)
    if (!hasExample1) {
        if (!hasStartedLogging) {
            log(`\n[${index}/${total}] Processing: "${title}"`);
            hasStartedLogging = true;
        }
        log(`  → Fetching AI example...`);
        const aiExample = await fetchAiSentences(title);
        if (aiExample) {
            structuredData[wordKey].example1 = aiExample;
            needsUpdate = true;
            log(`    ✓ AI Example found`);
        }
        await delay(1000);
    }

    // Verificar y llenar example2 y example3 (Literary)
    if (!hasExample2 || !hasExample3) {
        if (!hasStartedLogging) {
            log(`\n[${index}/${total}] Processing: "${title}"`);
            hasStartedLogging = true;
        }
        log(`  → Fetching literary examples...`);
        const litExamples = await fetchLiteraryExamples(slug,title);
        log(`  📦 Got ${litExamples.length} literary examples`);
        
        if (litExamples.length > 0 && !hasExample2) {
            structuredData[wordKey].example2 = litExamples[0];
            needsUpdate = true;
            log(`    ✓ Literary example 1 found`);
        }
        
        if (litExamples.length > 1 && !hasExample3) {
            structuredData[wordKey].example3 = litExamples[1];
            needsUpdate = true;
            log(`    ✓ Literary example 2 found`);
        }
        
        await delay(1000);
    }

    // Guardar archivo SOLO UNA VEZ después de procesar todos los campos
    if (needsUpdate) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(structuredData, null, 2), 'utf8');
        log(`    ✓ File saved`);
        updatedCount++;
    }
}

async function main() {
    try {
        log(`\n=== Starting to fill missing data for file ${FILE_NUMBER} ===`);
        
        if (!fs.existsSync(INPUT_FILE)) {
            log(`Error: File not found: ${INPUT_FILE}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
        structuredData = JSON.parse(fileContent);
        
        const words = Object.entries(structuredData);
        const totalWords = words.length;
        
        log(`Loaded ${totalWords} words from file`);

        for (let i = 0; i < totalWords; i++) {
            const [wordKey, wordData] = words[i];
            await fillMissingData(wordKey, wordData, i + 1, totalWords);
        }

        log(`\n=== Completed ===`);
        log(`Words successfully updated: ${updatedCount}`);
    } catch (error) {
        log(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
