# c:\Users\jesus\OneDrive\Documentos\LR\fill_pos_grammar.py
import csv
import sys
import os
import glob
import shutil

try:
    import spacy
except ImportError:
    print("Instala spaCy: pip install spacy")
    sys.exit(1)

MODEL = "de_core_news_sm"

try:
    nlp = spacy.load(MODEL)
except Exception:
    print(f"Instala el modelo alemán: python -m spacy download {MODEL}")
    sys.exit(1)

def readable_pos(pos_tag):
    mapping = {
        "NOUN": "Noun",
        "VERB": "Verb",
        "ADJ": "Adjective",
        "ADV": "Adverb",
        "PROPN": "Proper noun",
        "DET": "Determiner",
        "PRON": "Pronoun",
        "ADP": "Adposition",
        "AUX": "Auxiliary",
        "CCONJ": "Coordinating conjunction",
        "SCONJ": "Subordinating conjunction",
        "NUM": "Numeral",
        "PART": "Particle",
        "INTJ": "Interjection",
        "X": "Other",
        "PUNCT": "Punctuation",
    }
    return mapping.get(pos_tag, pos_tag)

def grammar_from_token(token):
    morph = str(token.morph)  # e.g. "Case=Nom|Gender=Masc|Number=Sing"
    if morph:
        return morph
    # fallback: include lemma for verbs/nouns
    if token.pos_ in ("VERB", "NOUN", "ADJ"):
        return token.lemma_
    return ""

def process_file(input_path, output_path):
    # read raw lines to preserve Anki metadata (lines starting with '#')
    with open(input_path, encoding="utf-8-sig") as f:
        all_lines = f.read().splitlines()

    # separate metadata lines (starting with '#') from CSV content
    data_start = 0
    while data_start < len(all_lines) and all_lines[data_start].lstrip().startswith("#"):
        data_start += 1
    meta_lines = all_lines[:data_start]
    data_lines = all_lines[data_start:]

    if not data_lines:
        print("No hay datos CSV en el archivo (solo metadatos o vacío).")
        return

    reader = list(csv.reader(data_lines))
    if not reader:
        print("Archivo CSV vacío o no legible")
        return

    header = [c.strip() for c in reader[0]]
    data_rows = reader[1:]

    # find UID column or fallback to position 3
    uid_idx = None
    for candidate in ("UID", "Uid", "uid", "UUID", "Uuid", "uuid"):
        if candidate in header:
            uid_idx = header.index(candidate)
            break
    if uid_idx is None:
        uid_idx = 3 if len(header) > 3 else len(header)

    # IMPORTANT: do NOT insert or shift columns. We'll always write Part of Speech in column 5 (index 4)
    # and Grammar in column 6 (index 5). If the file has fewer columns, extend header/rows with empty values
    # so positions 4 and 5 exist, but we won't rename existing headers.
    pos_idx = 4
    gram_idx = 5

    # ensure header is long enough so indices exist
    if len(header) <= gram_idx:
        header.extend([""] * (gram_idx + 1 - len(header)))

    # determine word column index (prefer 'Word', else heuristics)
    word_idx = None
    for candidate in ("Word", "word", "Term", "term", "German::Level", "German::level", "col1", "col0"):
        if candidate in header:
            word_idx = header.index(candidate)
            break
    if word_idx is None:
        # fallback to second column if exists else first
        word_idx = 1 if len(header) > 1 else 0

    # prepare output rows, preserving header order
    rows_out = [header]

    # pos_idx and gram_idx are fixed indexes (5th and 6th columns)
    # pos_idx = header.index("Part of Speech")
    # gram_idx = header.index("Grammar")

    for row in data_rows:
        # ensure row length matches current header length; extend to current header length
        if len(row) < len(header):
            row = row + [""] * (len(header) - len(row))
        else:
            # if row longer than header (rare), still keep values but trim to header length
            row = row[:len(header)]

        # get the word from detected column (some rows may have 'German::Level' in col0 like 'German::0-1000')
        word = row[word_idx].strip() if word_idx < len(row) else ""

        # if the 'Word' column contains a 'German::' prefix, try to extract the actual word from another column (e.g., col1)
        if word.startswith("German::"):
            # try to find actual word in next column
            alt_idx = word_idx + 1 if (word_idx + 1) < len(row) else None
            if alt_idx is not None:
                candidate = row[alt_idx].strip()
                if candidate:
                    word = candidate

        token = None
        if word:
            doc = nlp(word)
            token = doc[0] if doc else None

        # only fill POS/Grammar if empty at fixed positions
        if token:
            if pos_idx < len(row) and not str(row[pos_idx]).strip():
                row[pos_idx] = readable_pos(token.pos_)
            if gram_idx < len(row) and not str(row[gram_idx]).strip():
                row[gram_idx] = grammar_from_token(token)

        rows_out.append(row)

    # write output preserving meta lines
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        if meta_lines:
            for ml in meta_lines:
                f.write(ml + "\n")
        writer = csv.writer(f)
        writer.writerows(rows_out)

    print(f"Guardado: {output_path}")

if __name__ == "__main__":
    # soporta tres modos:
    # 1) procesar un solo archivo y guardar en otro: python fill_pos_grammar.py input.csv output.csv
    # 2) procesar todos los archivos de una carpeta que coincidan con anki_cards_german_*.csv: python fill_pos_grammar.py path/to/dir
    # 3) procesar por patrón glob: python fill_pos_grammar.py "anki_cards_german_*.csv"
    # si no se pasan argumentos, procesar el directorio actual por defecto
    if len(sys.argv) < 2:
        if len(sys.argv) == 1:
            print("No se proporcionó argumento: procesando el directorio actual '.'\n")
            arg = '.'
        else:
            print("Uso:\n 1) python fill_pos_grammar.py input.csv output.csv\n 2) python fill_pos_grammar.py <dir>  (procesa anki_cards_german_*.csv en la carpeta)\n 3) python fill_pos_grammar.py \"anki_cards_german_*.csv\"\n")
            sys.exit(1)
    else:
        arg = sys.argv[1]

    # si es directorio, buscar archivos que empiecen con anki_cards_german_*, recursivamente
    files = []
    if os.path.isdir(arg):
        pattern = os.path.join(arg, "**", "anki_cards_german_*.csv")
        files = glob.glob(pattern, recursive=True)
    elif any(ch in arg for ch in "*?"):
        # si el usuario pasó un patrón; si no contiene ruta, buscaremos recursivamente en subfolders
        if os.path.sep not in arg and "**" not in arg:
            pattern = os.path.join("**", arg)
            files = glob.glob(pattern, recursive=True)
        else:
            files = glob.glob(arg, recursive=True)
    else:
        # archivo único (puede estar en subcarpeta: hacer búsqueda recursiva también)
        if os.path.isabs(arg) or os.path.sep in arg:
            files = [arg]
        else:
            # buscar recursivamente el archivo por nombre en subcarpetas
            pattern = os.path.join("**", arg)
            files = glob.glob(pattern, recursive=True)

    # si solo hay un archivo y se proporcionó un output explícito, úsalo
    if len(files) == 1 and len(sys.argv) >= 3 and not os.path.isdir(arg):
        process_file(files[0], sys.argv[2])
        sys.exit(0)

    if not files:
        print(f"No se encontraron archivos para: {arg}")
        sys.exit(1)

    # procesar cada archivo (sobrescribir directamente sin crear .bak)
    for fpath in files:
        if not os.path.isfile(fpath):
            print(f"Saltando (no archivo): {fpath}")
            continue
        try:
            process_file(fpath, fpath)
        except Exception as e:
            print(f"Error procesando {fpath}: {e}")

    print("Procesamiento completado.")
