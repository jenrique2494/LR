const https = require('https');

const CSRF_TOKEN = 'CltxKrUkog883U7V7bzrWmdpBwtjVgpO';
const SESSION_ID = '2bfxw059bcpe084cnbedy6n60wa5e0ej';

async function fetchLiteraryExamples(slug) {
    try {
        const url = `https://speak.tatar/en/dict/ajax/load/lit-examples?from=deu&to=deu&slug=${encodeURIComponent(slug)}&title-org=${encodeURIComponent(slug)}&p=1`;
        
        console.log(`\n📝 URL: ${url}\n`);
        
        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': `csrftoken=${CSRF_TOKEN}; sessionid=${SESSION_ID}; dictionary_dict_from=deu; dictionary_dict_to=deu`
            };
            
            console.log(`Headers:`, headers);
            
            https.get(url, { headers }, (res) => {
                console.log(`\n📊 Status Code: ${res.statusCode}`);
                console.log(`📊 Headers:`, res.headers);
                
                if (res.statusCode === 301 || res.statusCode === 302) {
                    console.log(`\n🔄 Redirect detected to: ${res.headers.location}`);
                    let redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        if (redirectUrl.startsWith('/')) {
                            redirectUrl = `https://speak.tatar${redirectUrl}`;
                        }
                        if (!redirectUrl.includes('?')) {
                            redirectUrl += `?from=deu&to=deu&slug=${encodeURIComponent(slug)}&title-org=${encodeURIComponent(slug)}&p=1`;
                        }
                        console.log(`🔄 Following redirect to: ${redirectUrl}`);
                        
                        https.get(redirectUrl, { headers }, (res2) => {
                            console.log(`\n📊 Redirect Response Status: ${res2.statusCode}`);
                            let data = '';
                            res2.on('data', chunk => data += chunk);
                            res2.on('end', () => {
                                console.log(`\n📦 Response Data (first 500 chars):\n${data.substring(0, 500)}\n`);
                                resolve(data);
                            });
                        }).on('error', (err) => {
                            console.error(`❌ Error in redirect: ${err.message}`);
                            resolve(null);
                        });
                    } else {
                        resolve(null);
                    }
                } else {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log(`\n📦 Response Data (first 500 chars):\n${data.substring(0, 500)}\n`);
                        resolve(data);
                    });
                }
            }).on('error', (err) => {
                console.error(`❌ Error: ${err.message}`);
                resolve(null);
            });
        });
    } catch (err) {
        console.error(`❌ Exception: ${err.message}`);
        return null;
    }
}

// Prueba
(async () => {
    console.log('🧪 Testing literary examples fetch for: haus\n');
    const result = await fetchLiteraryExamples('haus');
    if (result) {
        console.log('✅ Got response');
    } else {
        console.log('❌ No response');
    }
})();
