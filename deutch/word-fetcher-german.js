const fs = require('fs');
const path = require('path');
const https = require('https');

const INPUT_FILE = path.join(__dirname, 'german-words.json');
// Argumentos: start, end
const [,, startArg, endArg] = process.argv;
const START_INDEX = parseInt(startArg, 10) || 0;
const END_INDEX = parseInt(endArg, 10) || 1000;
const RANGE_NUM = Math.floor(START_INDEX / 1000) + 1;
const OUTPUT_FILE = path.join(__dirname, `structured-german-words_${RANGE_NUM}.json`);
const CSRF_TOKEN = 'CltxKrUkog883U7V7bzrWmdpBwtjVgpO';
const SESSION_ID = '2bfxw059bcpe084cnbedy6n60wa5e0ej';

let structuredData = {};
let processedCount = 0;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getFrequencyRange(index) {
    const rangeStart = Math.floor(index / 1000) * 1000;
    const rangeEnd = rangeStart + 1000;
    return `${rangeStart}-${rangeEnd}`;
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
                // Manejar redirecciones
                if (res.statusCode === 301 || res.statusCode === 302) {
                    let redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        // Convertir URL relativa a absoluta
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
            // Separar por <br> y limpiar
            const sentences = response.text.split('<br>').map(s => s.trim()).filter(s => s.length > 0);
            // Retornar como una sola cadena con saltos de línea
            return sentences.join('\n');
        }
        return '';
    } catch (err) {
        console.error(`  Error fetching AI sentences for ${word}:`, err.message);
        return '';
    }
}

async function fetchLiteraryExamples(slug) {
    try {
        const url = `https://speak.tatar/en/dict/ajax/load/lit-examples?from=deu&to=deu&slug=${encodeURIComponent(slug)}&title-org=${encodeURIComponent(slug)}&p=1`;
        
        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            
            https.get(url, { headers }, (res) => {
                // Manejar redirecciones
                if (res.statusCode === 301 || res.statusCode === 302) {
                    let redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        if (redirectUrl.startsWith('/')) {
                            redirectUrl = `https://speak.tatar${redirectUrl}`;
                        }
                        // Preservar parámetros si la URL redirigida no los tiene
                        if (!redirectUrl.includes('?')) {
                            redirectUrl += `?from=deu&to=deu&slug=${encodeURIComponent(slug)}&title-org=${encodeURIComponent(slug)}&p=1`;
                        }
                        https.get(redirectUrl, { headers }, (res2) => {
                            let data = '';
                            res2.on('data', chunk => data += chunk);
                            res2.on('end', () => {
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
        if (parsed && parsed.html_examples) {
            // Parsear ejemplos de la clase "mb-3 div-examples"
            const examplesRegex = /<div class="mb-3 div-examples">[\s\S]*?<\/div>\s*<\/div>/g;
            const matches = parsed.html_examples.match(examplesRegex);
            const examples = [];
            
            if (matches) {
                for (let i = 0; i < Math.min(matches.length, 2); i++) {
                    // Extraer texto del div con clase "word-ex-items"
                    const itemsRegex = /<div class="word-ex-items">([\s\S]*?)<\/div>/;
                    const itemsMatch = matches[i].match(itemsRegex);
                    if (itemsMatch) {
                        let html = itemsMatch[1];
                        
                        // Extraer cada párrafo <p>
                        const paragraphRegex = /<p>([\s\S]*?)<\/p>/g;
                        const paragraphs = [];
                        let pMatch;
                        
                        while ((pMatch = paragraphRegex.exec(html)) !== null) {
                            let pText = pMatch[1];
                            // Mantener los spans con la clase "word-in-example"
                            // Remover solo otros tags HTML
                            pText = pText.replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '');
                            pText = pText.replace(/\s+/g, ' ').trim();
                            if (pText.length > 0) {
                                paragraphs.push(pText);
                            }
                        }
                        
                        // Unir párrafos con salto de línea
                        const text = paragraphs.join('\n');
                        if (text.length > 0) {
                            examples.push(text);
                        }
                    }
                }
            }
            return examples;
        }
    } catch (e) {
        return [];
    }
    return [];
}

async function fetchIPA(slug) {
    try {
        // Intentar obtener IPA desde speak.tatar
        const url = `https://speak.tatar/de/dict/ajax/get/dict-general?from=deu&to=deu&text=${encodeURIComponent(slug)}`;
        
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
                                    // Buscar el IPA en la respuesta
                                    if (parsed && parsed.ipa) {
                                        resolve(parsed.ipa);
                                    } else if (parsed && parsed.pron) {
                                        resolve(parsed.pron);
                                    } else {
                                        resolve(generateGermanIPA(slug));
                                    }
                                } catch (e) {
                                    resolve(generateGermanIPA(slug));
                                }
                            });
                        }).on('error', () => resolve(generateGermanIPA(slug)));
                    } else {
                        resolve(generateGermanIPA(slug));
                    }
                } else {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed && parsed.ipa) {
                                resolve(parsed.ipa);
                            } else if (parsed && parsed.pron) {
                                resolve(parsed.pron);
                            } else {
                                resolve(generateGermanIPA(slug));
                            }
                        } catch (e) {
                            resolve(generateGermanIPA(slug));
                        }
                    });
                }
            }).on('error', () => resolve(generateGermanIPA(slug)));
        });
    } catch (err) {
        return generateGermanIPA(slug);
    }
}

function generateGermanIPA(word) {
    // Generar IPA aproximado para palabras alemanas basado en reglas de pronunciación
    if (!word) return '';
    
    let ipa = word.toLowerCase();
    
    // Reglas básicas de pronunciación alemana a IPA
    const replacements = [
        // Vocales
        [/ä/g, 'ɛ'],
        [/ö/g, 'ø'],
        [/ü/g, 'ʏ'],
        [/a(?=[^e]|$)/g, 'a'],
        [/e(?=[^e]|$)/g, 'ə'],
        [/i(?=[^e]|$)/g, 'ɪ'],
        [/o(?=[^e]|$)/g, 'ɔ'],
        [/u(?=[^e]|$)/g, 'ʊ'],
        
        // Consonantes especiales
        [/ch/g, 'x'],
        [/sch/g, 'ʃ'],
        [/st(?=[aeiouäöü])/g, 'ʃt'],
        [/sp(?=[aeiouäöü])/g, 'ʃp'],
        [/ss/g, 's'],
        [/ß/g, 's'],
        [/z/g, 'ts'],
        [/c(?=[eiy])/g, 'ts'],
        [/c(?=[aouäöü])/g, 'k'],
        [/j/g, 'j'],
        [/w/g, 'v'],
        [/v/g, 'f'],
        [/y/g, 'ʏ'],
        [/tion/g, 'tsiːoːn'],
        [/ng/g, 'ŋ'],
    ];
    
    replacements.forEach(([pattern, replacement]) => {
        ipa = ipa.replace(pattern, replacement);
    });
    
    // Envolver en slashes como formato IPA estándar
    return `/${ipa}/`;
}

async function processWord(wordObj, index) {
    const { rank, title, slug } = wordObj;
    if (!title || !slug) return;

    console.log(`\n[${index + 1}] Procesando: ${title} (rank: ${rank})`);

    structuredData[title] = {
        title: title,
        slug: slug,
        rank: rank,
        ipa: '',
        definition: '',
        example1: '',
        example2: '',
        example3: '',
        frequency: getFrequencyRange(index)
    };

    // 1. Fetch IPA
    console.log(`  → Obteniendo pronunciación IPA...`);
    const ipa = await fetchIPA(slug);
    if (ipa) {
        structuredData[title].ipa = ipa;
        console.log(`    ✓ IPA: ${ipa}`);
    }
    await delay(300);

    // 2. Fetch definition
    console.log(`  → Obteniendo definición...`);
    const definition = await fetchDefinition(slug);
    if (definition) {
        structuredData[title].definition = definition;
        console.log(`    ✓ Definición: ${definition.substring(0, 50)}...`);
    }
    await delay(300);

    // 3. Fetch AI sentences (todos en example1)
    console.log(`  → Obteniendo oraciones de AI...`);
    const aiSentences = await fetchAiSentences(title);
    if (aiSentences && aiSentences.length > 0) {
        structuredData[title].example1 = aiSentences;
        console.log(`    ✓ Ejemplo 1 (AI): ${aiSentences.substring(0, 40)}...`);
    }
    await delay(300);

    // 4. Fetch literary examples (segundo y tercer ejemplo)
    console.log(`  → Obteniendo ejemplos literarios...`);
    const litExamples = await fetchLiteraryExamples(slug);
    if (litExamples.length > 0) {
        if (litExamples[0]) {
            structuredData[title].example2 = litExamples[0];
            console.log(`    ✓ Ejemplo 2 (Literario): ${litExamples[0].substring(0, 40)}...`);
        }
    }
    if (litExamples.length > 1) {
        if (litExamples[1]) {
            structuredData[title].example3 = litExamples[1];
            console.log(`    ✓ Ejemplo 3 (Literario): ${litExamples[1].substring(0, 40)}...`);
        }
    }
    await delay(300);

    // Guardar progreso
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(structuredData, null, 2), 'utf8');
    processedCount++;
}

async function main() {
    try {
        console.log(`Procesando palabras del índice ${START_INDEX} al ${END_INDEX - 1}`);
        console.log('Leyendo palabras alemanas...');
        const words = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
        
        if (!Array.isArray(words)) {
            throw new Error('El archivo debe contener un array de palabras');
        }

        console.log(`Total de palabras disponibles: ${words.length}`);
        console.log(`Procesando rango: ${START_INDEX} - ${END_INDEX - 1}\n`);

        // Cargar progreso existente
        try {
            const existing = fs.readFileSync(OUTPUT_FILE, 'utf8');
            structuredData = JSON.parse(existing);
            console.log(`✓ Archivo de progreso cargado con ${Object.keys(structuredData).length} palabras`);
        } catch (e) {
            console.log('Creando nuevo archivo de progreso...');
        }

        // Procesar solo el rango indicado
        for (let i = START_INDEX; i < Math.min(END_INDEX, words.length); i++) {
            await processWord(words[i], i);
        }

        console.log(`\n✓ Procesamiento completado!`);
        console.log(`  Palabras en archivo: ${Object.keys(structuredData).length}`);
        console.log(`  Archivo guardado: ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
