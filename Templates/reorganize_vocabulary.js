const fs = require('fs');
const path = require('path');

// Función para extraer información de la cadena HTML
function parseVocabularyEntry(htmlContent) {
    const data = {
        word: '',
        pronunciation: '',
        partOfSpeech: '',
        level: '',
        definition: '',
        dictionaryExamples: '',
        learnerExamples: ''
    };

    // Remover referencias de sonido para limpiar el contenido
    const cleanContent = htmlContent.replace(/\[sound:[^\]]+\]/g, '');

    // Extraer la palabra - buscar patrones más flexibles
    let wordMatch = cleanContent.match(/<b>Word:<\/b>\s*([^<\n\r\t]+)/);
    if (!wordMatch) {
        // Intentar con espacios o saltos de línea adicionales
        wordMatch = cleanContent.match(/<b>Word:<\/b>[\s\n\r]*([^<\n\r\t]+)/);
    }
    if (wordMatch) {
        data.word = wordMatch[1].trim();
    }

    // Extraer pronunciación - mejorar el patrón para capturar IPA entre barras
    let pronunciationMatch = cleanContent.match(/<b>Pronunciation:<\/b>[\s\n\r]*([^<\n\r]+)/);
    if (!pronunciationMatch) {
        // Intentar capturar pronunciación IPA específicamente
        pronunciationMatch = cleanContent.match(/<b>Pronunciation:<\/b>[\s\n\r]*\/([^\/]+)\//);
        if (pronunciationMatch) {
            data.pronunciation = '/' + pronunciationMatch[1] + '/';
        }
    } else {
        data.pronunciation = pronunciationMatch[1].trim();
    }

    // Extraer Part of Speech - mejorar para capturar tipos más complejos
    let posMatch = cleanContent.match(/<b>Part of Speech:<\/b>[\s\n\r]*([^<\n\r]+)/);
    if (posMatch) {
        data.partOfSpeech = posMatch[1].trim();
    }

    // Extraer Level - buscar A1, A2, B1, B2, C1, C2
    let levelMatch = cleanContent.match(/<b>Level:<\/b>[\s\n\r]*([A-C][1-2])/);
    if (levelMatch) {
        data.level = levelMatch[1].trim();
    }

    // Extraer Definition - mejorar el patrón para capturar mejor las definiciones
    let definitionMatch = cleanContent.match(/<b>Definition:<\/b>\s*([^<]*?)(?=<br><b>Word Family:|<br><b>Dictionary Examples:<\/b>|<br><b>Learner Examples:<\/b>|<b>Dictionary Examples:<\/b>|<b>Learner Examples:<\/b>|$)/s);
    if (definitionMatch) {
        data.definition = definitionMatch[1]
            .replace(/<br>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Extraer Dictionary Examples - mejorar patrón
    let dictExamplesMatch = cleanContent.match(/<b>Dictionary Examples:<\/b>\s*<br>(.*?)(?=<br><b>Learner Examples:<\/b>|<b>Learner Examples:<\/b>|$)/s);
    if (dictExamplesMatch) {
        let examples = dictExamplesMatch[1];
        // Limpiar y formatear los ejemplos con saltos de línea
        examples = examples
            .replace(/<br>/g, '\n')
            .split('\n')
            .map(ex => ex.replace(/\d+\.\s*/, '').replace(/\s+/g, ' ').trim())
            .filter(ex => ex.length > 0)
            .join('<br>')
            .trim();
        data.dictionaryExamples = examples;
    }

    // Extraer Learner Examples - mejorar patrón
    let learnerExamplesMatch = cleanContent.match(/<b>Learner Examples:<\/b>\s*<br>(.*?)$/s);
    if (learnerExamplesMatch) {
        let examples = learnerExamplesMatch[1];
        // Limpiar y formatear los ejemplos con saltos de línea
        examples = examples
            .replace(/<br>/g, '\n')
            .split('\n')
            .map(ex => ex.replace(/\d+\.\s*/, '').replace(/\s+/g, ' ').trim())
            .filter(ex => ex.length > 0)
            .join('<br>')
            .trim();
        data.learnerExamples = examples;
    }

    // Debug: agregar logging para ver qué se está extrayendo
    if (!data.word) {
        console.log('DEBUG - No se pudo extraer palabra de:', cleanContent.substring(0, 200) + '...');
    }

    return data;
}

// Función principal para procesar el archivo
function processVocabularyFile(inputPath, outputPath) {
    try {
        console.log('Leyendo archivo...');
        const content = fs.readFileSync(inputPath, 'utf-8');
        const lines = content.split('\n');
        
        let processedLines = [];
        let counter = 1;
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Mantener líneas de configuración al inicio
            if (line.startsWith('#')) {
                processedLines.push(line);
                i++;
                continue;
            }
            
            if (!line) {
                i++;
                continue;
            }
            
            // Dividir por tabs
            const columns = line.split('\t');
            
            if (columns.length < 4) {
                i++;
                continue;
            }
            
            // Extraer datos básicos
            const guid = columns[0] || '';
            const notetype = columns[1] || '';
            const deck = columns[2] || '';
            
            // Combinar el contenido HTML de las columnas 4 y siguientes
            let combinedContent = columns.slice(3).join(' ');
            
            // Verificar si la entrada continúa en las siguientes líneas
            // Una nueva entrada siempre empieza con un GUID válido (no vacío y no solo tabs)
            let nextLineIndex = i + 1;
            while (nextLineIndex < lines.length) {
                const nextLine = lines[nextLineIndex];
                const nextColumns = nextLine.split('\t');
                
                // Si la siguiente línea tiene un GUID válido (no vacío), es una nueva entrada
                if (nextColumns[0] && nextColumns[0].trim() !== '') {
                    break;
                }
                
                // Si es una línea que empieza con tabs (continuación), agregarla
                if (nextLine.startsWith('\t')) {
                    combinedContent += ' ' + nextLine.trim();
                    nextLineIndex++;
                } else {
                    break;
                }
            }
            
            // Avanzar el índice hasta donde terminó esta entrada
            i = nextLineIndex;
            
            // Debug: mostrar contenido combinado para las primeras líneas
            if (counter <= 3) {
                console.log(`\n=== LÍNEA ${counter} DEBUG ===`);
                console.log('Columnas encontradas:', columns.length);
                console.log('Contenido combinado:', combinedContent);
            }
            
            // Parsear el contenido HTML
            const parsedData = parseVocabularyEntry(combinedContent);
            
            // Debug: mostrar datos parseados para las primeras líneas
            if (counter <= 3) {
                console.log('Datos parseados:', parsedData);
                console.log('=== FIN DEBUG ===\n');
            }

            // Si no se pudo extraer la palabra, saltar esta línea
            if (!parsedData.word) {
                console.log(`Línea ${i + 1}: No se pudo extraer la palabra, saltando...`);
                continue;
            }
            
            // Crear UUID único
            const uuid = `vocab_${counter}_${parsedData.word.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            // Construir la nueva línea con las 15 columnas según tu especificación
            const newLine = [
                guid,                           // Columna 1: guid (se queda igual)
                notetype,                       // Columna 2: notetype (se queda igual)  
                deck,                           // Columna 3: deck (se queda igual)
                parsedData.word,                // Columna 4: Word (la palabra)
                uuid,                           // Columna 5: uuid (el identificador único)
                'JPCARDS',                      // Columna 6: uid (JPCARDS)
                parsedData.partOfSpeech,        // Columna 7: Part of Speech (tipo de palabra)
                '',                             // Columna 8: Grammar (gramática) - vacía
                parsedData.pronunciation,       // Columna 9: Pronunciation/IPA (pronunciación)
                '',                             // Columna 10: Audio (vacía)
                parsedData.definition,          // Columna 11: Definition (definición)
                parsedData.dictionaryExamples,  // Columna 12: Examples (los ejemplos del diccionario)
                parsedData.learnerExamples,     // Columna 13: Examples (los ejemplos del aprendiz)
                '',                             // Columna 14: Examples (vacía)
                parsedData.level || 'Word'      // Columna 15: tags: nivel (A1, A2, etc.) o 'Word' si no hay nivel
            ].join('\t');
            
            processedLines.push(newLine);
            counter++;
            
            if (counter % 1000 === 0) {
                console.log(`Procesadas ${counter - 1} entradas...`);
            }
        }
        
        // Escribir el archivo de salida
        console.log('Escribiendo archivo de salida...');
        fs.writeFileSync(outputPath, processedLines.join('\n'), 'utf-8');
        console.log(`Archivo procesado completamente. Salida guardada en: ${outputPath}`);
        console.log(`Total de entradas procesadas: ${counter - 1}`);
        
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
    }
}

// Configuración de rutas
const inputFile = path.join(__dirname, 'English Profile Vocabulary.txt');
const outputFile = path.join(__dirname, 'English_Profile_Vocabulary_Reorganized.txt');

// Verificar que el archivo de entrada existe
if (!fs.existsSync(inputFile)) {
    console.error(`Archivo de entrada no encontrado: ${inputFile}`);
    console.log('Asegúrate de que el archivo "English Profile Vocabulary.txt" esté en el mismo directorio que este script.');
    process.exit(1);
}

// Ejecutar el procesamiento
console.log('Iniciando procesamiento del vocabulario...');
processVocabularyFile(inputFile, outputFile);
