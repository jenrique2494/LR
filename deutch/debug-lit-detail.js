const https = require('https');

const CSRF_TOKEN = 'CltxKrUkog883U7V7bzrWmdpBwtjVgpO';
const SESSION_ID = '2bfxw059bcpe084cnbedy6n60wa5e0ej';

function parseExamples(htmlData) {
    try {
        const parsed = JSON.parse(htmlData);
        if (parsed && parsed.html_examples) {
            console.log(`\n🔍 Parsing html_examples...`);
            
            const examplesRegex = /<div class="mb-3 div-examples">[\s\S]*?<\/div>\s*<\/div>/g;
            const matches = parsed.html_examples.match(examplesRegex);
            const examples = [];
            
            console.log(`Found ${matches ? matches.length : 0} matches with current regex`);
            
            if (matches) {
                for (let i = 0; i < Math.min(matches.length, 2); i++) {
                    console.log(`\n  Processing match ${i + 1}...`);
                    
                    const itemsRegex = /<div class="word-ex-items">([\s\S]*?)<\/div>/;
                    const itemsMatch = matches[i].match(itemsRegex);
                    
                    if (itemsMatch) {
                        console.log(`    ✓ Found word-ex-items`);
                        let html = itemsMatch[1];
                        const paragraphRegex = /<p>([\s\S]*?)<\/p>/g;
                        const paragraphs = [];
                        let pMatch;
                        let pCount = 0;
                        
                        while ((pMatch = paragraphRegex.exec(html)) !== null) {
                            pCount++;
                            let pText = pMatch[1];
                            pText = pText.replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '');
                            pText = pText.replace(/\s+/g, ' ').trim();
                            if (pText.length > 0) {
                                paragraphs.push(pText);
                                console.log(`    ✓ Paragraph ${pCount}: ${pText.substring(0, 50)}...`);
                            }
                        }
                        
                        const text = paragraphs.join('\n');
                        if (text.length > 0) {
                            examples.push(text);
                            console.log(`    ✓ Added example ${i + 1}`);
                        }
                    } else {
                        console.log(`    ✗ No word-ex-items found`);
                        console.log(`    Match preview: ${matches[i].substring(0, 200)}`);
                    }
                }
            }
            
            console.log(`\n✅ Total examples extracted: ${examples.length}`);
            return examples;
        }
    } catch (e) {
        console.log(`✗ Error: ${e.message}`);
        return [];
    }
    return [];
}

async function fetchLiteraryExamples(slug) {
    const url = `https://speak.tatar/en/dict/ajax/load/lit-examples?from=deu&to=deu&slug=${encodeURIComponent(slug)}&title-org=${encodeURIComponent(slug)}&p=1`;
    
    console.log(`\n🔍 Testing slug: ${slug}`);
    
    return new Promise((resolve) => {
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
                    if (!redirectUrl.startsWith('http')) {
                        redirectUrl = `https://speak.tatar${redirectUrl}`;
                    }
                    
                    https.get(redirectUrl, { headers }, (res2) => {
                        let data = '';
                        res2.on('data', chunk => data += chunk);
                        res2.on('end', () => {
                            parseExamples(data);
                            resolve();
                        });
                    }).on('error', resolve);
                } else {
                    resolve();
                }
            } else {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    parseExamples(data);
                    resolve();
                });
            }
        }).on('error', resolve);
    });
}

async function main() {
    await fetchLiteraryExamples('haus');
}

main();
