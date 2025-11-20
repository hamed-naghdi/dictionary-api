/**
 * Types for Longman Dictionary API
 * These types reflect the specific structure of Longman Dictionary data
 */

export interface LongmanHead {
    hyphenation: string;
    pronunciation?: LongmanPronunciation;
    /** verb, name, adjective, ... */
    position: string;
    /** past tense for verbs or superlative for adjectives, etc */
    wordForms?: string;
    /** transitive, uncountable, etc */
    grammar?: string;
}

/**
 * Represents pronunciation data with audio URLs and phonetic transcriptions
 */
export interface LongmanPronunciation {
  phonetic?: string;
  britishAudioUrl?: string;
  americanAudioUrl?: string;
}

/**
 * Represents an example sentence for a definition
 */
export interface LongmanExample {
  text: string;
  audio?: string;
  collocation?: string;
  glossary?: string;
  /** (grammar form) PROPFORMPREP */
  propForm?: string;
}

/**
 * Represents a single definition (sense) of a word
 */
export interface LongmanSense {
  definition?: string;
  signpost?: string;
  ref?: string;
  lexUnit?: string;
  grammar?: string;
  register?: string;
  synonyms?: string[];
  opposites?: string[];
  image?: string;
  examples?: LongmanExample[];
}

/**
 * Represents a lexical entry (grouping of senses with same lexical category)
 */
export interface LongmanEntry {
  head: LongmanHead;
  senses: LongmanSense[];
}

/**
 * Response format for Longman Dictionary API
 */
export interface LongmanDictionaryResponse {
  /** The word that was looked up */
  word: string;
  /** Dictionary entries found */
  entries: LongmanEntry[];
  /** Source name */
  source: string;
  /** Error message (if applicable) */
  error?: string;
}
