const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'AXjq2bvv.UD9wLeDkn72kF1eP6qZ49IOcXBtyoRp4';
const CSRF_TOKEN = 'CltxKrUkog883U7V7bzrWmdpBwtjVgpO';
const BASE_URL = 'https://speak.tatar/api/v1/mcw/deu/';
const MAX_WORDS = 20000;
const WORDS_PER_PAGE = 10;
const OUTPUT_FILE = path.join(__dirname, 'german-words.json');

let allWords = [];
let totalWordsCollected = 0;
let currentPage = 1;
let hasMoreData = true;

function fetchPage(pageNumber) {
	return new Promise((resolve, reject) => {
		const url = `${BASE_URL}?page=${pageNumber}`;
		
		const options = {
			method: 'GET',
			headers: {
				'Authorization': `Api-key ${API_KEY}`,
				'User-Agent': 'insomnia/11.4.0',
				'Cookie': `csrftoken=${CSRF_TOKEN}`
			}
		};

		https.get(url, options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try {
					const words = JSON.parse(data);
					resolve(words);
				} catch (error) {
					reject(new Error(`Failed to parse JSON for page ${pageNumber}: ${error.message}`));
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

async function fetchAllWords() {
	console.log(`Iniciando descarga de palabras alemanas...`);
	console.log(`Objetivo: ${MAX_WORDS} palabras`);
	console.log(`URL base: ${BASE_URL}`);
	console.log('');

	while (hasMoreData && totalWordsCollected < MAX_WORDS) {
		try {
			console.log(`Obteniendo página ${currentPage}...`);
			const pageWords = await fetchPage(currentPage);

			if (!Array.isArray(pageWords) || pageWords.length === 0) {
				console.log(`No hay más datos en la página ${currentPage}. Deteniendo fetch.`);
				hasMoreData = false;
				break;
			}

			// Agregar palabras de esta página
			const wordsToAdd = Math.min(
				pageWords.length,
				MAX_WORDS - totalWordsCollected
			);

			allWords = allWords.concat(pageWords.slice(0, wordsToAdd));
			totalWordsCollected += wordsToAdd;

			console.log(`  - ${pageWords.length} palabras obtenidas (Total: ${totalWordsCollected})`);

			// Si llegamos al límite de palabras, detener
			if (totalWordsCollected >= MAX_WORDS) {
				console.log(`\n✓ Se alcanzó el límite de ${MAX_WORDS} palabras.`);
				hasMoreData = false;
				break;
			}

			currentPage++;

			// Pequeña pausa entre requests para no sobrecargar el servidor
			await new Promise(resolve => setTimeout(resolve, 500));

		} catch (error) {
			console.error(`Error en página ${currentPage}:`, error.message);
			hasMoreData = false;
			break;
		}
	}
}

function saveToFile() {
	try {
		const output = {
			metadata: {
				totalWords: allWords.length,
				fetchedAt: new Date().toISOString(),
				maxTarget: MAX_WORDS,
				pagesRequested: currentPage - 1
			},
			words: allWords
		};

		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
		console.log(`\n✓ Archivo guardado exitosamente: ${OUTPUT_FILE}`);
		console.log(`  Total de palabras: ${allWords.length}`);
		console.log(`  Tamaño del archivo: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
	} catch (error) {
		console.error('Error al guardar archivo:', error.message);
		process.exit(1);
	}
}

async function main() {
	try {
		await fetchAllWords();
		saveToFile();
		console.log('\n¡Proceso completado!');
	} catch (error) {
		console.error('Error durante la ejecución:', error);
		process.exit(1);
	}
}

main();
