/**
 * Types for Longman Dictionary API
 * These types reflect the specific structure of Longman Dictionary data
 */

/**
 * Represents pronunciation data with audio URLs and phonetic transcriptions
 */
export interface LongmanPronunciation {
  /** Phonetics (IPA) */
  phonetic: string;
  /** Audio URL for pronunciation */
  audioUrl?: string;
  /** Regional variant (e.g., 'British English', 'American English') */
  variant?: string;
  /** Additional pronunciation notes */
  notes?: string;
}

/**
 * Represents an example sentence for a definition
 */
export interface LongmanExample {
  /** The example sentence text */
  text: string;
  /** Source or attribution of the example */
  source?: string;
  /** Notes about usage context */
  notes?: string;
}

/**
 * Represents register or style labels (e.g., formal, informal, slang)
 */
export interface LongmanRegister {
  /** Type of register (e.g., 'formal', 'informal', 'slang') */
  type: string;
  /** Additional context or explanation */
  notes?: string;
}

/**
 * Represents a lexical category (part of speech) with grammatical information
 */
export interface LongmanLexicalCategory {
  /** The part of speech (e.g., noun, verb, adjective) */
  id: string;
  /** The display text for the lexical category */
  text: string;
}

/**
 * Represents lexical information about inflections and grammatical features
 */
export interface LongmanGrammaticalFeatures {
  /** Type of grammatical feature (e.g., 'gender', 'number', 'tense') */
  type: string;
  /** Value of the grammatical feature (e.g., 'singular', 'past') */
  value: string;
}

/**
 * Represents information about word origin and etymology
 */
export interface LongmanEtymology {
  /** Origin text explaining word derivation */
  text: string;
  /** Language of origin */
  language?: string;
  /** Period or date information */
  period?: string;
}

/**
 * Represents semantic domain or subject field
 */
export interface LongmanDomain {
  /** Domain identifier */
  id: string;
  /** Domain name (e.g., 'Medicine', 'Technology') */
  text: string;
}

/**
 * Represents regions where a particular sense is used
 */
export interface LongmanRegion {
  /** Region identifier */
  id: string;
  /** Region name (e.g., 'British', 'North American') */
  text: string;
}

/**
 * Represents a single definition (sense) of a word
 */
export interface LongmanSense {
  /** The definition text */
  definition: string;
  /** Example sentences demonstrating usage */
  examples?: LongmanExample[];
  /** Short form of the definition (if available) */
  shortDefinition?: string;
  /** Register information (formal, informal, etc.) */
  registers?: LongmanRegister[];
  /** Notes on usage or context */
  notes?: string[];
  /** Domains (subject fields) this sense belongs to */
  domains?: LongmanDomain[];
  /** Regions where this sense is primarily used */
  regions?: LongmanRegion[];
  /** Cross-references to related entries */
  crossReferences?: string[];
  /** Subsenses (more specific definitions) */
  subsenses?: LongmanSense[];
  /** Semantic categories */
  semanticClasses?: string[];
  /** Synonyms specific to this sense */
  synonyms?: string[];
  /** Antonyms specific to this sense */
  antonyms?: string[];
}

/**
 * Represents a lexical entry (grouping of senses with same lexical category)
 */
export interface LongmanLexicalEntry {
  /** The core text of the entry */
  text: string;
  /** Lexical category (part of speech) */
  lexicalCategory: LongmanLexicalCategory;
  /** Grammatical features */
  grammaticalFeatures?: LongmanGrammaticalFeatures[];
  /** Etymology information */
  etymologies?: LongmanEtymology[];
  /** Pronunciations */
  pronunciations?: LongmanPronunciation[];
  /** Different senses (meanings) */
  senses: LongmanSense[];
  /** Alternative forms or spellings */
  variantForms?: { text: string; notes?: string[] }[];
  /** Phrases or idioms containing this word */
  phrases?: { text: string; explanation?: string }[];
  /** Inflections (e.g., plural forms, verb conjugations) */
  inflections?: {
    inflectedForm: string;
    grammaticalFeatures: LongmanGrammaticalFeatures[];
  }[];
}

/**
 * Represents a complete dictionary entry for a word
 */
export interface LongmanDictionaryEntry {
  /** The word or phrase being defined */
  id: string;
  /** Word or phrase in normalized form */
  word: string;
  /** Lexical entries grouped by part of speech */
  lexicalEntries: LongmanLexicalEntry[];
  /** Language of the entry */
  language: string;
  /** Type of word (e.g., 'headword', 'inflection') */
  type?: string;
}

/**
 * Response format for Longman Dictionary API
 */
export interface LongmanDictionaryResponse {
  /** The word that was looked up */
  word: string;
  /** Dictionary entries found */
  entries: LongmanDictionaryEntry[];
  /** Source name */
  source: string;
  /** Error message (if applicable) */
  error?: string;
}
