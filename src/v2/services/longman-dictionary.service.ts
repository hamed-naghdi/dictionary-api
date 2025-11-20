import * as cheerio from "cheerio";
import {Cheerio} from "cheerio";
import {
    LongmanDictionaryResponse,
    LongmanEntry,
    LongmanExample,
    LongmanPronunciation,
    LongmanHead, LongmanSense,
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

  // /**
  //  * Extract pronunciation data from an element
  //  * @param $ Cheerio instance
  //  * @param element The element containing pronunciation
  //  * @returns Pronunciation data
  //  * @private
  //  */ private extractPronunciation(
  //   $: cheerio.CheerioAPI,
  //   element: Element
  // ): LongmanPronunciation[] {
  //   const pronunciations: LongmanPronunciation[] = [];
  //
  //   // Bước 1: Thu thập tất cả các audio URLs trước tiên
  //   // Lưu trữ cả UK và US audio URLs và phiên âm tương ứng
  //   interface AudioInfo {
  //     url: string;
  //     variant: string;
  //     phonetic?: string;
  //     formHint?: string; // Gợi ý về dạng của từ (do, does, did, done, doing)
  //   }
  //
  //   // Tạo 2 arrays riêng biệt chứa audio URLs cho phát âm anh và mỹ
  //   const ukAudios: AudioInfo[] = [];
  //   const usAudios: AudioInfo[] = [];
  //
  //   // Tìm tất cả các phần tử audio và lưu trữ thông tin
  //   $(element)
  //     .find(".sound.audio_play_button.icon-audio")
  //     .each((i, audioElem) => {
  //       let mp3Url = $(audioElem).attr("data-src-mp3");
  //
  //       // Nếu không tìm thấy attr, thử lấy từ thuộc tính raw của element
  //       if (!mp3Url) {
  //         const outerHtml = $.html(audioElem);
  //         const match = outerHtml.match(/data-src-mp3=(?:["'])?([^"'\s>]+)/i);
  //         if (match && match[1]) {
  //           mp3Url = match[1];
  //         }
  //       }
  //
  //       if (mp3Url) {
  //         const absoluteUrl = this.makeAbsoluteUrl(mp3Url);
  //
  //         // Phân tích URL để tìm gợi ý về hình thức của từ
  //         let formHint: string | undefined;
  //         if (mp3Url) {
  //           // Trích xuất tên file từ URL (ví dụ: "does__gb_2.mp3" -> "does")
  //           const filenameMatch = mp3Url.match(
  //             /\/([a-z]+)(?:__|\w*?)_(?:gb|us)/i
  //           );
  //           if (filenameMatch && filenameMatch[1]) {
  //             formHint = filenameMatch[1].toLowerCase();
  //             console.log(`Detected word form from URL: ${formHint}`);
  //           }
  //         }
  //
  //         // Tìm phiên âm gần nhất nếu có
  //         let nearestPhonetic: string | undefined;
  //         const nearestPhonElem = $(audioElem)
  //           .closest(".pron-g")
  //           .find(".phon")
  //           .first();
  //         if (nearestPhonElem.length > 0) {
  //           nearestPhonetic = nearestPhonElem.text().trim();
  //         }
  //
  //         // Tìm thêm context gần nhất để xác định hình thức từ
  //         if (!formHint) {
  //           const parentContext = $(audioElem)
  //             .closest(".pron-g")
  //             .text()
  //             .toLowerCase();
  //
  //           // Kiểm tra các hình thức từ phổ biến
  //           const wordForms = ["do", "does", "did", "done", "doing"];
  //           for (const form of wordForms) {
  //             if (parentContext.includes(form)) {
  //               formHint = form;
  //               console.log(`Detected word form from context: ${formHint}`);
  //               break;
  //             }
  //           }
  //         }
  //
  //         // Lưu vào mảng tương ứng
  //         if ($(audioElem).hasClass("pron-uk")) {
  //           ukAudios.push({
  //             url: absoluteUrl ?? "",
  //             variant: "British English",
  //             phonetic: nearestPhonetic,
  //             formHint,
  //           });
  //           console.log(
  //             `UK Audio #${i}: ${absoluteUrl} (${
  //               nearestPhonetic || "no phonetic"
  //             }) - Form: ${formHint || "unknown"}`
  //           );
  //         } else if ($(audioElem).hasClass("pron-us")) {
  //           usAudios.push({
  //             url: absoluteUrl ?? "",
  //             variant: "American English",
  //             phonetic: nearestPhonetic,
  //             formHint,
  //           });
  //           console.log(
  //             `US Audio #${i}: ${absoluteUrl} (${
  //               nearestPhonetic || "no phonetic"
  //             }) - Form: ${formHint || "unknown"}`
  //           );
  //         } else {
  //           // Các audio khác (không phân biệt UK/US)
  //           ukAudios.push({
  //             url: absoluteUrl ?? "",
  //             variant: "Unknown",
  //             phonetic: nearestPhonetic,
  //             formHint,
  //           });
  //         }
  //       }
  //     });
  //
  //
  //   $(element)
  //     .find(".phon")
  //     .each((i, phonElem) => {
  //       const phonetic = $(phonElem).text().trim();
  //       if (!phonetic) return;
  //
  //       // Tìm audio URL phù hợp dựa trên vị trí gần nhất hoặc đánh dấu UK/US
  //       let audioUrl: string | undefined;
  //       let variant: string = "Unknown";
  //
  //       // Xác định biến thể UK/US dựa trên nội dung hoặc ngữ cảnh
  //       const isUK =
  //         phonetic.includes("BrE") ||
  //         $(phonElem).closest(".pron-g").find(".pron-uk").length > 0;
  //       const isUS =
  //         phonetic.includes("NAmE") ||
  //         $(phonElem).closest(".pron-g").find(".pron-us").length > 0;
  //
  //       // Phát hiện hình thức từ từ ngữ cảnh xung quanh phiên âm
  //       const phonContext = $(phonElem).closest(".pron-g").text().toLowerCase();
  //       let detectedForm: string | undefined;
  //
  //       // Các hình thức từ phổ biến để kiểm tra
  //       const wordForms = ["do", "does", "did", "done", "doing"];
  //       for (const form of wordForms) {
  //         if (phonContext.includes(form)) {
  //           detectedForm = form;
  //           console.log(
  //             `Found form ${form} in context of phonetic ${phonetic}`
  //           );
  //           break;
  //         }
  //       }
  //
  //       // Tìm audio phù hợp nhất cho phiên âm này
  //       const audioArrays = isUK
  //         ? [ukAudios]
  //         : isUS
  //         ? [usAudios]
  //         : [ukAudios, usAudios];
  //
  //       // Chiến lược ghép nối 1: Tìm audio khớp với cả phiên âm và hình thức từ
  //       for (const audioArray of audioArrays) {
  //         if (audioUrl) break; // Nếu đã tìm thấy, dừng tìm kiếm
  //
  //         if (detectedForm) {
  //           const formMatch = audioArray.find(
  //             (a) => a.formHint === detectedForm
  //           );
  //           if (formMatch) {
  //             audioUrl = formMatch.url;
  //             variant = formMatch.variant;
  //             console.log(
  //               `Matched by word form: ${detectedForm} -> ${audioUrl}`
  //             );
  //             break;
  //           }
  //         }
  //       }
  //
  //       // Chiến lược ghép nối 2: Sử dụng phiên âm để dự đoán hình thức từ
  //       if (!audioUrl) {
  //         // Một số phiên âm đặc trưng cho hình thức từ cụ thể
  //         if (phonetic.includes("/duː/")) {
  //           // Phiên âm cho "do" hoặc "does"
  //           const doForm = audioArrays[0].find(
  //             (a) => a.formHint === "do" || a.formHint === "does"
  //           );
  //           if (doForm) {
  //             audioUrl = doForm.url;
  //             variant = doForm.variant;
  //             console.log(`Matched by phonetic pattern /duː/ -> ${audioUrl}`);
  //           }
  //         } else if (phonetic.includes("/dɪd/")) {
  //           // Phiên âm cho "did"
  //           const didForm = audioArrays[0].find((a) => a.formHint === "did");
  //           if (didForm) {
  //             audioUrl = didForm.url;
  //             variant = didForm.variant;
  //             console.log(`Matched by phonetic pattern /dɪd/ -> ${audioUrl}`);
  //           }
  //         } else if (phonetic.includes("/dʌn/")) {
  //           // Phiên âm cho "done"
  //           const doneForm = audioArrays[0].find((a) => a.formHint === "done");
  //           if (doneForm) {
  //             audioUrl = doneForm.url;
  //             variant = doneForm.variant;
  //             console.log(`Matched by phonetic pattern /dʌn/ -> ${audioUrl}`);
  //           }
  //         } else if (phonetic.includes("ˈduːɪŋ")) {
  //           // Phiên âm cho "doing"
  //           const doingForm = audioArrays[0].find(
  //             (a) => a.formHint === "doing"
  //           );
  //           if (doingForm) {
  //             audioUrl = doingForm.url;
  //             variant = doingForm.variant;
  //             console.log(
  //               `Matched by phonetic pattern /ˈduːɪŋ/ -> ${audioUrl}`
  //             );
  //           }
  //         }
  //       }
  //
  //       // Chiến lược ghép nối 3: Tìm audio có cùng phiên âm
  //       if (!audioUrl) {
  //         for (const audioArray of audioArrays) {
  //           const matchingAudio = audioArray.find(
  //             (a) => a.phonetic === phonetic
  //           );
  //           if (matchingAudio) {
  //             audioUrl = matchingAudio.url;
  //             variant = matchingAudio.variant;
  //             console.log(
  //               `Matched by exact phonetic: ${phonetic} -> ${audioUrl}`
  //             );
  //             break;
  //           }
  //         }
  //       }
  //
  //       // Chiến lược ghép nối 4: Fallback theo vị trí tương đối
  //       if (!audioUrl) {
  //         const primaryArray = isUK
  //           ? ukAudios
  //           : isUS
  //           ? usAudios
  //           : ukAudios.length > 0
  //           ? ukAudios
  //           : usAudios;
  //         if (primaryArray.length > 0) {
  //           audioUrl = primaryArray[i % primaryArray.length].url;
  //           variant = isUK
  //             ? "British English"
  //             : isUS
  //             ? "American English"
  //             : primaryArray[i % primaryArray.length].variant;
  //           console.log(
  //             `Fallback match by position: index ${i} -> ${audioUrl}`
  //           );
  //         }
  //       }
  //
  //       // Chiến lược ghép nối 5: Fallback cuối cùng - sử dụng URL đầu tiên có sẵn
  //       if (!audioUrl) {
  //         if (ukAudios.length > 0) {
  //           audioUrl = ukAudios[0].url;
  //           variant = "British English";
  //         } else if (usAudios.length > 0) {
  //           audioUrl = usAudios[0].url;
  //           variant = "American English";
  //         }
  //         console.log(
  //           `Last resort fallback: using first available audio URL -> ${audioUrl}`
  //         );
  //       }
  //
  //       const pronunciation: LongmanPronunciation = {
  //         phonetic,
  //         audioUrl,
  //         variant,
  //       };
  //
  //       // Thêm ghi chú nếu có
  //       const notes = $(phonElem)
  //         .closest(".pron-g")
  //         .find(".label")
  //         .text()
  //         .trim();
  //       if (notes) {
  //         pronunciation.notes = notes;
  //       }
  //
  //       // Log kết quả cuối cùng để debug
  //       console.log(
  //         `Pronunciation: ${phonetic}, Audio: ${
  //           audioUrl || "none"
  //         }, Variant: ${variant}`
  //       );
  //
  //       pronunciations.push(pronunciation);
  //     });
  //
  //   return pronunciations;
  // }

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
  ): LongmanExample[] {
    const examples: LongmanExample[] = [];

    $(senseElem)
      .find(".x")
      .each((_, exampleElem) => {
        const text = $(exampleElem).text().trim();
        if (!text) return;

        // const example: LongmanExample = { text };

        // Check for source attribution
        // const source = $(exampleElem).find(".cf").text().trim();
        // if (source) {
        //   example.source = source;
        // }
        //
        // // Check for notes
        // const notes = $(exampleElem).find(".label").text().trim();
        // if (notes) {
        //   example.notes = notes;
        // }

        // examples.push(example);
      });

    // Also check for extra examples in collapsible sections
    // $(senseElem)
    //   .find(".collapse .unx")
    //   .each((_, extraExampleElem) => {
    //     const text = $(extraExampleElem).text().trim();
    //     if (text) {
    //       examples.push({ text });
    //     }
    //   });

    return examples;
  }

  // /**
  //  * Extract synonyms from a sense
  //  * @param $ Cheerio instance
  //  * @param element The element to extract from
  //  * @returns Array of synonyms or undefined
  //  * @private
  //  */
  // private extractSynonyms(
  //   $: cheerio.CheerioAPI,
  //   element: Element
  // ): string[] | undefined {
  //   const synonyms: string[] = [];
  //
  //   // Check for synonyms in the unbox sections
  //   $(element)
  //     .find('.unbox[unbox="synonyms"] .body .unbox')
  //     .each((_, synElem) => {
  //       const text = $(synElem).text().trim();
  //       if (!text || text === "example") return;
  //
  //       // Split by bullet separator and trim each item
  //       const syns = text
  //         .split("▪")
  //         .map((s) => s.trim())
  //         .filter(Boolean);
  //       synonyms.push(...syns);
  //     });
  //
  //   return synonyms.length > 0 ? synonyms : undefined;
  // }

  // /**
  //  * Extract subsenses from a sense block
  //  * @param $ Cheerio instance
  //  * @param element The sense element
  //  * @returns Array of subsenses
  //  * @private
  //  */
  // private extractSubsenses(
  //   $: cheerio.CheerioAPI,
  //   element: Element
  // ): LongmanSense[] {
  //   const subsenses: LongmanSense[] = [];
  //
  //   // In Longman, subsenses might be in a separate list or with special formatting
  //   $(element)
  //     .find(".subsense")
  //     .each((_, subsenseElem) => {
  //       const definition = $(subsenseElem).find(".def").text().trim();
  //       if (!definition) return;
  //
  //       const subsense: LongmanSense = { definition };
  //
  //       // Extract examples
  //       const examples = this.extractExamples($, subsenseElem);
  //       if (examples.length > 0) {
  //         subsense.examples = examples;
  //       }
  //
  //       // Extract registers
  //       const registers = this.extractRegisters($, subsenseElem);
  //       if (registers.length > 0) {
  //         subsense.registers = registers;
  //       }
  //
  //       // Extract domains
  //       const domains = this.extractDomains($, subsenseElem);
  //       if (domains.length > 0) {
  //         subsense.domains = domains;
  //       }
  //
  //       // Extract regions
  //       const regions = this.extractRegions($, subsenseElem);
  //       if (regions.length > 0) {
  //         subsense.regions = regions;
  //       }
  //
  //       subsenses.push(subsense);
  //     });
  //
  //   return subsenses;
  // }

  // /**
  //  * Extract senses from an entry
  //  * @param $ Cheerio instance
  //  * @param element The entry element
  //  * @returns Array of senses
  //  * @private
  //  */
  // private extractSenses(
  //   $: cheerio.CheerioAPI,
  //   element: Element
  // ): LongmanSense[] {
  //   const senses: LongmanSense[] = [];
  //
  //   $(element)
  //     .find(".sense")
  //     .each((_, senseElem) => {
  //       const definition = $(senseElem).find(".def").text().trim();
  //       if (!definition) return;
  //
  //       // Create the basic sense
  //       const sense: LongmanSense = { definition };
  //
  //       // Extract examples
  //       const examples = this.extractExamples($, senseElem);
  //       if (examples.length > 0) {
  //         sense.examples = examples;
  //       }
  //
  //       // Extract registers
  //       const registers = this.extractRegisters($, senseElem);
  //       if (registers.length > 0) {
  //         sense.registers = registers;
  //       }
  //
  //       // Extract domains
  //       const domains = this.extractDomains($, senseElem);
  //       if (domains.length > 0) {
  //         sense.domains = domains;
  //       }
  //
  //       // Extract regions
  //       const regions = this.extractRegions($, senseElem);
  //       if (regions.length > 0) {
  //         sense.regions = regions;
  //       }
  //
  //       // Extract subsenses
  //       const subsenses = this.extractSubsenses($, senseElem);
  //       if (subsenses.length > 0) {
  //         sense.subsenses = subsenses;
  //       }
  //
  //       // Extract synonyms
  //       const synonyms = this.extractSynonyms($, senseElem);
  //       if (synonyms) {
  //         sense.synonyms = synonyms;
  //       }
  //
  //       // Extract cross-references
  //       const crossReferences: string[] = [];
  //       $(senseElem)
  //         .find(".xrefs a")
  //         .each((_, xrefElem) => {
  //           const xrefText = $(xrefElem).text().trim();
  //           if (xrefText) {
  //             crossReferences.push(xrefText);
  //           }
  //         });
  //
  //       if (crossReferences.length > 0) {
  //         sense.crossReferences = crossReferences;
  //       }
  //
  //       // Extract notes
  //       const notes: string[] = [];
  //       $(senseElem)
  //         .find(".note")
  //         .each((_, noteElem) => {
  //           const noteText = $(noteElem).text().trim();
  //           if (noteText) {
  //             notes.push(noteText);
  //           }
  //         });
  //
  //       if (notes.length > 0) {
  //         sense.notes = notes;
  //       }
  //
  //       senses.push(sense);
  //     });
  //
  //   return senses;
  // }

  // /**
  //  * Extract idioms from an entry
  //  * @param $ Cheerio instance
  //  * @param entry The entry element
  //  * @returns Array of phrases (idioms)
  //  * @private
  //  */
  // private extractIdioms(
  //   $: cheerio.CheerioAPI,
  //   entry: Element
  // ): { text: string; explanation?: string }[] {
  //   const idioms: { text: string; explanation?: string }[] = [];
  //
  //   $(entry)
  //     .find(".idioms .idm-g")
  //     .each((_, idiomElem) => {
  //       const text = $(idiomElem).find(".idm").text().trim();
  //       if (!text) return;
  //
  //       const explanation = $(idiomElem).find(".def").text().trim();
  //
  //       idioms.push({
  //         text,
  //         ...(explanation ? { explanation } : {}),
  //       });
  //     });
  //
  //   return idioms;
  // }

  // /**
  //  * Extract variant forms
  //  * @param $ Cheerio instance
  //  * @param element The element to extract from
  //  * @returns Array of variant forms
  //  * @private
  //  */
  // private extractVariantForms(
  //   $: cheerio.CheerioAPI,
  //   element: Element
  // ): { text: string; notes?: string[] }[] {
  //   const variants: { text: string; notes?: string[] }[] = [];
  //
  //   $(element)
  //     .find(".variants")
  //     .each((_, variantElem) => {
  //       const text = $(variantElem).text().trim();
  //       if (!text) return;
  //
  //       // Extract notes if any
  //       const notes: string[] = [];
  //       $(variantElem)
  //         .find(".label")
  //         .each((_, labelElem) => {
  //           const labelText = $(labelElem).text().trim();
  //           if (labelText) {
  //             notes.push(labelText);
  //           }
  //         });
  //
  //       variants.push({
  //         text,
  //         ...(notes.length > 0 ? { notes } : {}),
  //       });
  //     });
  //
  //   return variants;
  // }

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
        const el = $(element).find(`.REFHWD`);
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
      $(".entry_content .dictionary .dictentry").each((entryIndex, entryElement) => {


          // const index = entryIndex;
          // const element = entryElement;

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
              }

              if (this.hasMeaningfulValue(sense)) {
                  entry.senses.push(sense);
              }
          });

        const posElements = $(entryElement).find(
          "h2.pos-header, span.pos, [hclass='pos']"
        );
        posElements.each((_, posHeaderElement) => {


          const posContent = $(posHeaderElement).closest(".top-g").siblings();



          // Extract pronunciations
          // const pronunciations = this.extractPronunciation($, entryElement);
          // if (pronunciations.length > 0) {
          //   lexicalEntry.pronunciations = pronunciations;
          // }

          // Extract grammatical features
          // const grammaticalFeatures = this.extractGrammaticalFeatures(
          //   $,
          //   entryElement
          // );
          // if (grammaticalFeatures.length > 0) {
          //   lexicalEntry.grammaticalFeatures = grammaticalFeatures;
          // }

          // Extract etymology
          // const etymology = this.extractEtymology($, entryElement);
          // if (etymology) {
          //   lexicalEntry.etymologies = [etymology];
          // }

          // Extract senseElements
          // const sensesElement =
          //   posContent.length > 0 ? posContent[0] : entryElement;
          // const senseElements = this.extractSenses($, sensesElement);
          // lexicalEntry.senseElements = senseElements;

          // Extract phrases and idioms
          // const phrases = this.extractIdioms($, entryElement);
          // if (phrases.length > 0) {
          //   lexicalEntry.phrases = phrases;
          // }

          // Extract variant forms
          // const variantForms = this.extractVariantForms($, entryElement);
          // if (variantForms.length > 0) {
          //   lexicalEntry.variantForms = variantForms;
          // }

          // entry.lexicalEntries.push(lexicalEntry);
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
