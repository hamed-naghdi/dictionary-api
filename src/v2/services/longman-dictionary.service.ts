import * as cheerio from "cheerio";
import {Cheerio} from "cheerio";
import {
    LongmanDictionaryResponse,
    LongmanEntry,
    LongmanExampleItem,
    LongmanExample,
    LongmanCollectionExample,
    LongmanPropFormExample,
    LongmanPronunciation,
    LongmanHead,
    LongmanSense,
} from "../types/longman";
import {Element} from "domhandler";
import {BaseDictionaryService} from "./base-dictionary.service";

/**
 * Service to scrape definitions from Longman Dictionaries
 * Implements the dictionary service interface for v2
 * Follows Single Responsibility Principle (SRP) by focusing only on Longman-specific scraping
 * Follows Liskov Substitution Principle (LSP) by properly extending BaseDictionaryService
 */
export class LongmanDictionaryService extends BaseDictionaryService<LongmanDictionaryResponse> {
  private baseUrl: string = "https://www.ldoceonline.com/";

  constructor() {
    super("Longman");
  }

  /**
   * Makes an absolute URL from a relative URL
   * @param relativeUrl The relative URL
   * @returns The absolute URL
   * @protected
   */
  protected makeAbsoluteUrl(relativeUrl?: string): string | undefined {
    return super.makeAbsoluteUrl(
      "https://www.ldoceonline.com/",
      relativeUrl
    );
  }

  /**
   * Handle errors from the API
   * @param word The word that was being looked up
   * @param error The error that occurred
   * @returns A DictionaryResponse with the error information
   * @private
   */
  private handleLongmanError(
    word: string,
    error: unknown
  ): LongmanDictionaryResponse {
    return super.handleError(word, error) as LongmanDictionaryResponse;
  }

  /**
   * Fetches Longman dictionary HTML using their direct search URL which handles redirects
   * @param word The word to look up
   * @returns A cheerio object with the parsed HTML
   * @private
   */
  private async fetchLongmanHtml(word: string): Promise<cheerio.CheerioAPI> {
      function normalize(word: string): string {
          return word
              .trim()
              .toLowerCase()
              // remove apostrophes: ’ ' ` etc.
              .replace(/['’`]/g, "")
              // collapse multiple spaces into single
              .replace(/\s+/g, " ")
              // replace spaces with hyphens
              .replace(/ /g, "-");
      }

      try {
      const directSearchUrl = `${
        this.baseUrl
      }/dictionary/${encodeURIComponent(normalize(word))}`;

      console.log(
        `Fetching Longman definition with direct search URL: ${directSearchUrl}`
      );

      const $ = await super.fetchHtml(directSearchUrl);

      // Check if we got a valid page with dictionary content
      if ($(".entry_content").length > 0) {
        console.log(`Successfully fetched Longman definition for: ${word}`);
        console.log($.html());
        return $;
      } else {
        console.log(
          `Longman page doesn't contain expected dictionary content for: ${word}`
        );
      }
    } catch (error: any) {
      console.log(`Error fetching Longman definition: ${error.message}`);
    }

    // If direct search fails, try the regular search as a fallback
    // try {
    //   const searchUrl = `${this.baseUrl}/dictionary/${encodeURIComponent(
    //     word
    //   )}`;
    //   console.log(`Trying fallback search URL: ${searchUrl}`);
    //   const searchPage = await super.fetchHtml(searchUrl);
    //
    //   // Check if search page has a direct link to the word
    //   const definitionLink = searchPage(".search-results .result a")
    //     .first()
    //     .attr("href");
    //   if (definitionLink) {
    //     console.log(`Found definition link through search: ${definitionLink}`);
    //     return await super.fetchHtml(definitionLink);
    //   }
    // } catch (error: any) {
    //   console.log(`Search approach failed: ${error.message}`);
    // }

    // If all attempts fail, throw an error
    throw new Error(
      `Could not find Longman definition for "${word}" using any known URL pattern`
    );
  }

    private extractExampleAudio(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const speaker = $(element).find(`.speaker`);
        if (speaker.length > 0){
            const voiceSrc = $(speaker).attr('data-src-mp3');
            if(!voiceSrc) return undefined;
            const u = new URL(voiceSrc);
            u.search = ""; // removes query parameters
            return u.toString();
        }
        return undefined;
    }

    private extractGlossary(
        $: cheerio.CheerioAPI,
        element: Element
    ): string | undefined {
        const el = $(element).find(".GLOSS");
        if (el.length === 0) return undefined;
        return $(el).text().trim();
    }

    private extractCollocation(
        $: cheerio.CheerioAPI,
        element: Element
    ): string {
        const el = $(element).find(".COLLO");
        return $(el).text().trim();
    }

    private extractPropForm(
        $: cheerio.CheerioAPI,
        element: Element
    ): string {
        const el = $(element).find(".PROPFORM");
        return $(el).text().trim();
    }

    private extractExample(
        $: cheerio.CheerioAPI,
        exampleElem: Element
    ): LongmanExample {
        const audio = this.extractExampleAudio($, exampleElem);
        const glossary = this.extractGlossary($, exampleElem);
        const clone = $(exampleElem);
        clone.find('.GLOSS').remove();
        const text = clone.text().trim();
        return {
            text: text,
            audio: audio,
            glossary: glossary,
        }
    }

  /**
   * Extract examples from a sense block
   * @param $ Cheerio instance
   * @param senseElem The sense element
   * @returns Array of examples
   * @private
   */
  private extractExamples(
    $: cheerio.CheerioAPI,
    senseElem: Element
  ): LongmanExampleItem[] {
    const examples: LongmanExampleItem[] = [];

    $(senseElem)
      .children('.EXAMPLE, .ColloExa, .GramExa')
      .each((_, exampleElem) => {
          let example : LongmanExampleItem | undefined = undefined;
          const className = $(exampleElem).attr('class');
          switch (className) {
              case 'EXAMPLE':
                  example = this.extractExample($, exampleElem);
                  break;

              case 'ColloExa':
                  const collocationExamples: LongmanExample[] | undefined = [];
                  $(exampleElem)
                      .children(`.EXAMPLE`)
                      .each((_, ex) => {
                          collocationExamples.push(this.extractExample($, ex));
                      });

                  let collocationExamplesResult : LongmanExample[] | undefined = collocationExamples;
                  if (!this.hasMeaningfulValue(collocationExamples)){
                      collocationExamplesResult = undefined;
                  }

                  const glossary = this.extractGlossary($, exampleElem);

                  example = {
                      collocation: this.extractCollocation($, exampleElem),
                      glossary: glossary,
                      examples: collocationExamplesResult,
                  };
                  break;

              case 'GramExa':
                  const propExamples: LongmanExample[] = [];
                  $(exampleElem)
                      .children(`.EXAMPLE`)
                      .each((_, ex) => {
                          propExamples.push(this.extractExample($, ex));
                      });

                  let propExamplesResult : LongmanExample[] | undefined = propExamples;
                  if (!this.hasMeaningfulValue(propExamples)){
                      propExamplesResult = undefined;
                  }

                  example = {
                      propForm: this.extractPropForm($, exampleElem),
                      examples: propExamplesResult,
                  };
                  break;

              default:
                  break;
          }

          if (example){
              examples.push(example);
          }
      });

    return examples;
  }

    private hasMeaningfulValue(obj: Record<string, any>): boolean {
        return Object.values(obj).some(
            v => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)
        );
    }

    private extractHyphenation(
        $: cheerio.CheerioAPI,
        element: Cheerio<Element>) : string {
      const el = $(element).find(`.HYPHENATION`);
      if (el.length > 0) {
          return el.text().trim();
      } else {
          return $(element).find(`.PHRVBHWD`).text().trim();
      }
    }

    private extractPronunciation(
        $: cheerio.CheerioAPI,
        element: Cheerio<Element>
    ) : LongmanPronunciation | undefined{
        const pron = this.extractPron($, element);
        const british = this.extractAudio($, element, `br`);
        const american = this.extractAudio($, element, `am`);
        const result : LongmanPronunciation = {
            phonetic: pron,
            britishAudioUrl: british,
            americanAudioUrl: american,
        }
        return this.hasMeaningfulValue(result) ? result : undefined;
    }

    private extractPron(
        $: cheerio.CheerioAPI,
        element: Cheerio<Element>
    ) : string | undefined {
        const el = $(element).find(`.PRON`);
        if (el.length > 0) {
            return el.text().trim();
        }
        return undefined;
    }

    private extractAudio(
      $: cheerio.CheerioAPI,
      element: Cheerio<Element>,
      accent: string
    ) : string | undefined {
      accent = accent.toLowerCase() === 'br' ? 'br' : 'am';
      const speaker = element.find(`.speaker.${accent}efile`);
      if (speaker.length > 0){
          const voiceSrc = $(speaker).attr('data-src-mp3');
          if(!voiceSrc) return undefined;
          const u = new URL(voiceSrc);
          u.search = ""; // removes query parameters
          return u.toString();
      }
      return undefined;
    }

    private extractWordForms(
        $: cheerio.CheerioAPI,
        element: Cheerio<Element>
    ): string | undefined {
        const el = $(element).find(".Inflections");
        if (el.length === 0) return undefined;

        let text = $(el).text().trim();

        text = text.replace(/^\(+|\)+$/g, '').trim();

        const regex = /([a-zA-Z\s]+)\s+([^\s,]+)/g;

        text = text.replace(regex, (_, label, word) => {
            return `${label} <strong>${word}</strong>`;
        });

        return text;
    }

    private extractPosition(
        $: cheerio.CheerioAPI,
        element: Cheerio<Element>
    ) : string {
        const el = $(element).find(`.POS`);
        return $(el).text().trim();
    }

    private extractGrammar(
        $: cheerio.CheerioAPI,
        element: Cheerio<Element>
    ) : string | undefined {
        const el = $(element).find(`.GRAM`);
        if (el.length > 0) {
            const raw = el.text().trim(); // e.g. "[transitive]"
            const cleaned = raw.replace(/\[|\]/g, "").trim(); // → "transitive"
            return cleaned || undefined;
        }
        return undefined;
    }

    private extractDefinition(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const el = $(element).find(`.DEF`);
        if (el.length > 0) {
            return  el.text().trim();
        }
        return undefined;
    }

    private extractSignPost(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const el = $(element).find(`.SIGNPOST`);
        if (el.length > 0) {
            return  el.text().trim();
        }
        return undefined;
    }

    private extractRef(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const el = $(element).find(`.Crossref .REFHWD`);
        if (el.length > 0) {
            return  el.text().trim();
        }
        return undefined;
    }

    private extractLexUnit(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const el = $(element).find(`.LEXUNIT`);
        if (el.length > 0) {
            return  el.text().trim();
        }
        return undefined;
    }

    private extractRegister(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const el = $(element).find(`.REGISTERLAB`);
        if (el.length > 0) {
            return  el.text().trim();
        }
        return undefined;
    }

    private extractSynOpp(
        $: cheerio.CheerioAPI,
        synElements: Cheerio<Element>): string[] | undefined{
        if (synElements.length === 0) {
            return undefined;
        }
        const results: string[] = [];
        synElements.each((_, el) => {
            const clone = $(el).clone();
            clone.find(".synopp").remove();
            const text = clone.text().trim();
            if (text) {
                results.push(text);
            }
        });

        return results.length > 0 ? results : undefined;
    }

    private extractSyn(
        $: cheerio.CheerioAPI,
        element: Element
    ): string[] | undefined {
        const synElements = $(element).find(".SYN");
        return this.extractSynOpp($, synElements);
    }

    private extractOpp(
        $: cheerio.CheerioAPI,
        element: Element
    ): string[] | undefined {
        const synElements = $(element).find(".OPP");
        return this.extractSynOpp($, synElements);
    }

    private extractImage(
        $: cheerio.CheerioAPI,
        element: Element
    ) : string | undefined {
        const image = $(element).find(`img`);
        if (image.length > 0){
            const src = $(image).attr('src');
            if(!src) return undefined;
            const u = new URL(src);
            u.search = ""; // removes query parameters
            return u.toString();
        }
        return undefined;
    }

  /**
   * Looks up a word in the Longman Learner's Dictionary
   * @param word The word to look up
   * @returns A promise resolving to LongmanDictionaryResponse
   */
  async lookupWord(word: string): Promise<LongmanDictionaryResponse> {
    try {
      const $ = await this.fetchLongmanHtml(word);

      // Check if the word was found
      const wordNotFoundMsg = $(".entry_content .dictionary").length === 0;
      if (wordNotFoundMsg) {
        return {
          word,
          entries: [],
          source: this.sourceName,
          error: `No entries found for '${word}'`,
        };
      }

      const entries: LongmanEntry[] = [];

      // Process each lexical category (part of speech) group
      $(".entry_content .dictionary .dictentry").each((_, entryElement) => {


          const ldEntry = $(entryElement)
              .find('.dictlink .Entry');

          const headElement = $(ldEntry)
              .find(`.Head`)
              .first();

          const head : LongmanHead = {
              hyphenation: this.extractHyphenation($, headElement),
              pronunciation: this.extractPronunciation($, headElement),
              position: this.extractPosition($, headElement),
              wordForms: this.extractWordForms($, headElement),
              grammar: this.extractGrammar($, headElement),
          };

          // Create a new dictionary entry
          const entry: LongmanEntry = {
              head: head,
              senses: []
          };

          const senseElements = $(ldEntry)
              .children(`.Sense`);

          $(senseElements).each((_, senseElement) => {
              let examples: LongmanExampleItem[] | undefined = this.extractExamples($, senseElement)
              if (!this.hasMeaningfulValue(examples)){
                  examples = undefined;
              }

              const sense: LongmanSense = {
                  definition: this.extractDefinition($, senseElement),
                  signpost: this.extractSignPost($, senseElement),
                  ref: this.extractRef($, senseElement),
                  lexUnit: this.extractLexUnit($, senseElement),
                  grammar: this.extractGrammar($, $(senseElement)),
                  register: this.extractRegister($, senseElement),
                  synonyms: this.extractSyn($, senseElement),
                  opposites: this.extractOpp($, senseElement),
                  image: this.extractImage($, senseElement),
                  examples: examples,
              }

              if (this.hasMeaningfulValue(sense)) {
                  entry.senses.push(sense);
              }
          });

        entries.push(entry);
      });

      // If no entries were found but the page loaded, might be a redirect or special case
      if (entries.length === 0) {
        const alternativeWord = $(".result-header a").first().text().trim();
        if (alternativeWord && alternativeWord !== word) {
          return {
            word,
            entries: [],
            source: this.sourceName,
            error: `No exact match found for "${word}". Did you mean "${alternativeWord}"?`,
          };
        }
      }

      return {
        word,
        entries,
        source: this.sourceName,
      };
    } catch (error) {
      return this.handleLongmanError(word, error);
    }
  }
}
