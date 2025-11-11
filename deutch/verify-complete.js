const fs = require('fs');
const path = require('path');

// Argumentos: fileNumber (1, 2, 3, etc.)
const [, , fileNumberArg] = process.argv;
const FILE_NUMBER = parseInt(fileNumberArg, 10) || 1;
const INPUT_FILE = path.join(__dirname, `structured-german-words_${FILE_NUMBER}.json`);

function checkCompletion() {
    try {
        if (!fs.existsSync(INPUT_FILE)) {
            console.log(`Error: File not found: ${INPUT_FILE}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
        const data = JSON.parse(fileContent);
        
        const words = Object.entries(data);
        let completeCount = 0;
        let incompleteCount = 0;
        let missingFields = {
            definition: 0,
            example1: 0,
            example2: 0,
            example3: 0,
            ipa: 0
        };

        for (const [wordKey, wordData] of words) {
            let isComplete = true;
            
            if (!wordData.definition || wordData.definition === '') {
                missingFields.definition++;
                isComplete = false;
            }
            if (!wordData.example1 || wordData.example1 === '') {
                missingFields.example1++;
                isComplete = false;
            }
            if (!wordData.example2 || wordData.example2 === '') {
                missingFields.example2++;
                isComplete = false;
            }
            if (!wordData.example3 || wordData.example3 === '') {
                missingFields.example3++;
                isComplete = false;
            }
            if (!wordData.ipa || wordData.ipa === '') {
                missingFields.ipa++;
                isComplete = false;
            }
            
            if (isComplete) {
                completeCount++;
            } else {
                incompleteCount++;
            }
        }

        console.log(`\n=== File ${FILE_NUMBER} Completion Status ===`);
        console.log(`Total words: ${words.length}`);
        console.log(`Complete words: ${completeCount}`);
        console.log(`Incomplete words: ${incompleteCount}`);
        console.log(`\nMissing fields:`);
        console.log(`  - definition: ${missingFields.definition}`);
        console.log(`  - example1: ${missingFields.example1}`);
        console.log(`  - example2: ${missingFields.example2}`);
        console.log(`  - example3: ${missingFields.example3}`);
        console.log(`  - ipa: ${missingFields.ipa}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

checkCompletion();
