/**
 * High-Precision Khmer Video Dialogue Transcription & Native Translation Client
 * Powered by Google Gemini AI with Specialized Khmer Linguistic & Dubbing Directives.
 */

export interface VideoSpeakerSegment {
  id: string;
  segmentNumber: number; // e.g. 1, 2, 3
  speakerId?: string;
  voiceProfileId?: string; // ID of the assigned voice profile
  voiceProfileName?: string; // Display name of assigned voice clone
  startTime: number; // in seconds
  endTime: number; // in seconds
  originalText: string;
  khmerTranslation: string;
  status: 'pending' | 'ready_for_sync' | 'synthesizing' | 'synced' | 'error';
  synthesizedAudioBlob?: Blob;
  synthesizedAudioUrl?: string;
  audioDuration?: number;
  playbackSpeed?: number; // 0.8x to 1.5x tempo scaling
  syncMode?: 'natural_duration' | 'fit_to_cut';
}

/**
 * Dynamically queries Google Generative Language API to find active models
 */
async function discoverAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const modelsList: any[] = data.models || [];

    const validModels = modelsList
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));

    // Prioritize Gemini 2.0 Flash and Gemini 1.5 Pro/Flash for best Khmer translation
    validModels.sort((a, b) => {
      const scoreA = a.includes('2.0-flash') ? 3 : a.includes('1.5-pro') ? 2 : a.includes('1.5-flash') ? 1 : 0;
      const scoreB = b.includes('2.0-flash') ? 3 : b.includes('1.5-pro') ? 2 : b.includes('1.5-flash') ? 1 : 0;
      return scoreB - scoreA;
    });

    return validModels;
  } catch (e) {
    return [];
  }
}

/**
 * High-Fidelity Khmer Video Dialogue Transcription & Native Translation
 */
export async function analyzeVideoWithGemini(
  audioBase64: string,
  mimeType: string = 'audio/wav',
  apiKey: string,
  style: 'conversational' | 'formal' | 'story' = 'conversational'
): Promise<VideoSpeakerSegment[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'Please enter your Google Gemini API Key in Settings (Get one free at https://aistudio.google.com/app/apikey).'
    );
  }

  const prompt = `
You are a World-Class Master Khmer Translator & Professional Film Subtitle Dubbing Director.
Analyze the provided video audio track with extreme precision from beginning (0.0s) to end.

CRITICAL INSTRUCTIONS:
1. DIALOGUE TIMING & SEGMENTATION:
   - Identify each spoken dialogue sentence and its EXACT start time and end time in seconds.
   - Timestamps MUST be strictly chronological (startTime < endTime) and non-overlapping.
   - Capture the exact moment speech begins and ends so the dubbed voice synchronizes precisely with the speaker.

2. NATIVE KHMER TRANSLATION QUALITY (ភាសាខ្មែរ):
   - Translate into natural, smooth, culturally authentic Khmer spoken by native Cambodians.
   - STRICTLY AVOID literal word-for-word translation or mechanical phrasing.
   - Rephrase English idioms, technical terms, and colloquial speech into natural Khmer conversational expressions.
   - Tone: ${
     style === 'formal'
       ? 'Formal, professional broadcast news tone (ផ្លូវការ និង ពិរោះ)'
       : style === 'story'
       ? 'Cinematic storytelling and dramatic narration (រស់រវើក និង ទាក់ទាញ)'
       : 'Natural, friendly conversational speech (ការសន្ទនាបែបធម្មជាតិ រលូន)'
   }.
   - End complete sentences with Khmer Khan (។).

3. JSON OUTPUT FORMAT:
Output ONLY a parseable JSON object matching this schema:
{
  "segments": [
    {
      "segmentNumber": 1,
      "startTime": 0.0,
      "endTime": 4.5,
      "originalText": "Hello and welcome to our video presentation today.",
      "khmerTranslation": "ជំរាបសួរ និងសូមស្វាគមន៍មកកាន់ការធ្វើបទបង្ហាញវីដេអូរបស់យើងនៅថ្ងៃនេះ។"
    }
  ]
}

DO NOT wrap with markdown blocks. Return parseable JSON only.
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.15,
      responseMimeType: 'application/json',
    },
  };

  const discoveredModels = await discoverAvailableModels(apiKey);
  const defaultFallbackList = [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
  ];

  const modelsToTry = Array.from(new Set([...discoveredModels, ...defaultFallbackList]));
  let lastError = '';

  for (const modelName of modelsToTry) {
    for (const version of ['v1beta', 'v1']) {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${apiKey.trim()}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errText = '';
          try {
            const errJson = await response.json();
            errText = errJson.error?.message || JSON.stringify(errJson);
          } catch {
            errText = await response.text();
          }

          if (response.status === 400 && (errText.includes('API_KEY_INVALID') || errText.includes('API key not valid'))) {
            throw new Error('Your Gemini API Key is invalid. Please generate a new key from https://aistudio.google.com/app/apikey.');
          }

          lastError = `[${response.status}] ${errText}`;
          continue;
        }

        const resultData = await response.json();
        const rawText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleanJson = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsed = JSON.parse(cleanJson);
        const rawSegments = parsed.segments || (Array.isArray(parsed) ? parsed : []);

        if (rawSegments.length === 0) continue;

        // Ensure strictly sorted, non-overlapping timestamps
        let lastEnd = 0;

        return rawSegments.map((seg: any, index: number): VideoSpeakerSegment => {
          let start = Math.max(lastEnd, parseFloat(Number(seg.startTime).toFixed(2)) || lastEnd);
          let end = Math.max(start + 0.8, parseFloat(Number(seg.endTime).toFixed(2)) || (start + 3.5));
          lastEnd = end;

          return {
            id: `seg-${index + 1}-${Date.now().toString(36)}`,
            segmentNumber: index + 1,
            speakerId: `Voice #${index + 1}`,
            startTime: start,
            endTime: end,
            originalText: seg.originalText || seg.text || '',
            khmerTranslation: seg.khmerTranslation || seg.translation || '',
            status: 'ready_for_sync',
          };
        });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (lastError.includes('API Key is invalid')) throw err;
      }
    }
  }

  throw new Error(`Gemini API Error: ${lastError || 'Failed to analyze video'}.`);
}

/**
 * Re-translates or polishes a single sentence into natural, fluent Khmer
 */
export async function polishKhmerTranslationWithGemini(
  originalText: string,
  currentKhmerText: string,
  apiKey: string,
  style: 'conversational' | 'formal' | 'story' = 'conversational'
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API Key is required for translation polish.');
  }

  const prompt = `
You are an expert native Khmer linguist and video dubbing translator.
Translate/Polish the following English dialogue into natural, fluent, spoken Khmer (ភាសាខ្មែរ).

Original English: "${originalText}"
Current draft: "${currentKhmerText}"

Requirements:
- Style: ${style === 'formal' ? 'Formal and professional' : style === 'story' ? 'Story narration' : 'Natural everyday spoken Khmer'}.
- Make it sound 100% natural, elegant, and native. Avoid literal translations.
- End with Khmer full stop (។).
- Return ONLY the translated Khmer string without quotation marks or explanations.
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  };

  const discoveredModels = await discoverAvailableModels(apiKey);
  const models = Array.from(new Set([...discoveredModels, 'gemini-2.0-flash', 'gemini-1.5-flash']));

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return text.trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // try next model
    }
  }

  return currentKhmerText;
}
