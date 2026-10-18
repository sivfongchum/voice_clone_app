/**
 * Utility for splitting long Khmer text into coherent sentence chunks
 * to prevent GPU Out-of-Memory (OOM) errors during VoxCPM2 diffusion inference.
 */

// Khmer sentence terminators & major boundary punctuation:
// ។ (Khmer Khan / Full stop)
// ៕ (Khmer Bariyoosan / End of chapter)
// ៖ (Khmer Camnuc Pii Kuuh / Colon)
// ៘ (Khmer Peeyyal / Etc)
// ? (Question mark), ! (Exclamation)
const KHMER_SENTENCE_DELIMITERS = /(?<=[។៕!?\n])/;

/**
 * Counts words in Khmer text using Intl.Segmenter or zero-width / space tokenization
 */
export function countKhmerWords(text: string): number {
  if (!text || !text.trim()) return 0;
  
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter('km', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(text));
      return segments.filter((s) => s.isWordLike).length;
    } catch {
      // fallback
    }
  }

  // Fallback: split on spaces, zero-width spaces (\u200B), and Khmer punctuation
  const words = text
    .split(/[\s\u200B\u200C\u200D។៕៖៘?!,.]+/)
    .filter((w) => w.trim().length > 0);
  return words.length;
}

/**
 * Splits long Khmer text into manageable chunks (default ~60-80 words or ~150-250 characters).
 * Preserves sentence meaning by splitting preferentially at Khmer punctuation (។, ៕, ?),
 * then commas/clauses, and finally word boundaries.
 */
export function chunkKhmerText(text: string, maxCharsPerChunk: number = 220): string[] {
  if (!text || !text.trim()) return [];
  const clean = text.trim();

  // If already shorter than maxChars, return single chunk
  if (clean.length <= maxCharsPerChunk) {
    return [clean];
  }

  // Split by full sentences
  const rawSentences = clean.split(KHMER_SENTENCE_DELIMITERS).map(s => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxCharsPerChunk) {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // If a single sentence exceeds maxCharsPerChunk, split by clauses or words
      if (sentence.length > maxCharsPerChunk) {
        const subClauses = sentence.split(/(?<=[,;:\u200B\s])/).map(s => s.trim()).filter(Boolean);
        let subChunk = '';
        
        for (const sub of subClauses) {
          if ((subChunk + ' ' + sub).trim().length <= maxCharsPerChunk) {
            subChunk = subChunk ? `${subChunk} ${sub}` : sub;
          } else {
            if (subChunk) chunks.push(subChunk);
            // If even subclause is too large (rare), hard split by character limit
            if (sub.length > maxCharsPerChunk) {
              for (let i = 0; i < sub.length; i += maxCharsPerChunk) {
                chunks.push(sub.slice(i, i + maxCharsPerChunk));
              }
              subChunk = '';
            } else {
              subChunk = sub;
            }
          }
        }
        if (subChunk) currentChunk = subChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(c => c.trim().length > 0);
}
