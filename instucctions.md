


1) Generate Anki CSV : For each vocabulary word, tranform  saved_words.json to The CSV will adhere to the exact structure :

Code

```
#separator:comma

#html:true

#notetype:JPCARDSDE

#deck column:1

#tags column:13

myVocabs::[Level],[Word],[UUID],[UID],[Part of Speech],[Grammar],[Pronunciation/IPA],[Audio Link],[Definition],[Example 1],[Example 2],[Example 3],[Tags]

```

expleins:

```

[Level]: level of the word B1, B2, C1, C2

[Word]: The vocabulary word itself.

[UUID] & [UID]: I will generate unique placeholder IDs. (Please note: for actual, fully functional Anki cards with audio, you would typically need a more advanced integration with a dictionary API that provides these, but for this exercise, placeholders are used).

[Part of Speech]: The grammatical category of the word (e.g., noun, verb, adjective, adverb, preposition, conjunction, pronoun).

[Grammar]: Additional grammatical notes if applicable (e.g., "linking verb", "count", "noncount", "auxiliary verb"). If no specific grammar note is readily apparent from the context or general knowledge, this field will be left blank.

[Pronunciation/IPA]: I will provide the IPA pronunciation.

[Audio Link]: blank.

[Definition]: A clear and concise definition of the word as used in the context, or its most common meaning. I will prioritize definitions relevant to your B2 level.

[Example 1], [Example 2], [Example 3]: I will provide one to three example sentences using the word. These examples will aim to be natural and helpful for understanding the word's usage. If the provided transcript offers good examples, I will prioritize those.

[Tags]: This will include the episode code and the date, formatted as Vocabs::YYYY.MM.DD Vocabs::[EPISODE_CODE].

```

Precuation: don't use cites in the response



3) Export a Clean CSV codesnippet that you can copy directly: I will provide the final output in a clean CSV format. This means the data will be completely free of any internal processing or citation tags (e.g., ``, [cite_end],[cite_start]), ensuring you can directly copy the text for import without any further editing.
