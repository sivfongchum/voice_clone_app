import { chunkKhmerText } from './khmerChunker';
import { concatenateWavBlobs } from './audioUtils';

export interface HealthResponse {
  status: 'ready' | 'loading' | 'error';
  model_name?: string;
  device?: string;
  cuda_available?: boolean;
  gpu_name?: string;
  vram_allocated_gb?: number;
  vram_total_gb?: number;
  message?: string;
  timestamp?: string;
}

export interface CloneVoiceOptions {
  apiUrl: string;
  targetText: string;
  promptText?: string;
  referenceAudioBlob: Blob;
  inferenceTimesteps?: number;
  cfgScale?: number;
  enableAutoChunking?: boolean;
  maxCharsPerChunk?: number;
  onProgress?: (progress: {
    stage: 'uploading' | 'synthesizing' | 'merging' | 'completed' | 'error';
    currentChunk: number;
    totalChunks: number;
    percentage: number;
    message: string;
  }) => void;
}

/**
 * Normalizes user-supplied API URL
 */
export function normalizeApiUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, '');
}

/**
 * Tests connection and checks health status of backend GPU server
 */
export async function checkBackendHealth(rawUrl: string): Promise<{
  isOnline: boolean;
  latencyMs: number;
  data?: HealthResponse;
  error?: string;
}> {
  const normalized = normalizeApiUrl(rawUrl);
  if (!normalized) {
    return { isOnline: false, latencyMs: 0, error: 'API URL is empty' };
  }

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${normalized}/health`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      return {
        isOnline: false,
        latencyMs,
        error: `Server responded with status ${res.status} (${res.statusText})`,
      };
    }

    const data: HealthResponse = await res.json();
    return {
      isOnline: data.status === 'ready' || data.cuda_available === true,
      latencyMs,
      data,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return {
      isOnline: false,
      latencyMs,
      error: msg.includes('aborted')
        ? 'Connection timed out (Server did not respond within 8s)'
        : `Cannot connect to Colab API: ${msg}. Make sure Colab is running and ngrok URL is active.`,
    };
  }
}

/**
 * Calls backend single-chunk POST /clone-voice (Pure timbre cloning if promptText is empty)
 */
async function synthesizeSingleChunk(
  apiUrl: string,
  chunkText: string,
  promptText: string | undefined,
  audioBlob: Blob,
  timesteps: number,
  cfgScale: number
): Promise<Blob> {
  const formData = new FormData();
  formData.append('text', chunkText);
  if (promptText && promptText.trim()) {
    formData.append('prompt_text', promptText.trim());
  }
  formData.append('audio_file', audioBlob, 'reference.wav');
  formData.append('inference_timesteps', timesteps.toString());
  formData.append('cfg_scale', cfgScale.toString());

  const response = await fetch(`${apiUrl}/clone-voice`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`Inference failed [${response.status}]: ${errorDetail || response.statusText}`);
  }

  const resultBlob = await response.blob();
  return resultBlob;
}

/**
 * Main function to synthesize Khmer voice cloning.
 */
export async function generateKhmerVoiceClone(options: CloneVoiceOptions): Promise<Blob> {
  const {
    apiUrl,
    targetText,
    promptText,
    referenceAudioBlob,
    inferenceTimesteps = 8,
    cfgScale = 2.0,
    enableAutoChunking = true,
    maxCharsPerChunk = 220,
    onProgress,
  } = options;

  const normalizedUrl = normalizeApiUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error('Please configure the Colab backend API URL in Settings first.');
  }

  if (!targetText.trim()) {
    throw new Error('Please enter the target Khmer text to synthesize.');
  }

  if (!referenceAudioBlob || referenceAudioBlob.size === 0) {
    throw new Error('Please record or upload a reference voice sample (3-6s).');
  }

  // Determine text chunks
  const chunks = enableAutoChunking
    ? chunkKhmerText(targetText, maxCharsPerChunk)
    : [targetText.trim()];

  const totalChunks = chunks.length;

  onProgress?.({
    stage: 'uploading',
    currentChunk: 1,
    totalChunks,
    percentage: 5,
    message: `Preparing audio and tokenizing ${totalChunks} passage chunk(s)...`,
  });

  const generatedBlobs: Blob[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks[i];
    const chunkNum = i + 1;
    const basePct = 10 + Math.floor((i / totalChunks) * 80);

    onProgress?.({
      stage: 'synthesizing',
      currentChunk: chunkNum,
      totalChunks,
      percentage: basePct,
      message: `Synthesizing chunk ${chunkNum} of ${totalChunks} with clean voice cloning...`,
    });

    const chunkBlob = await synthesizeSingleChunk(
      normalizedUrl,
      chunk,
      promptText,
      referenceAudioBlob,
      inferenceTimesteps,
      cfgScale
    );

    generatedBlobs.push(chunkBlob);
  }

  // If multiple chunks, merge them
  let finalBlob: Blob;
  if (generatedBlobs.length > 1) {
    onProgress?.({
      stage: 'merging',
      currentChunk: totalChunks,
      totalChunks,
      percentage: 95,
      message: 'Seamlessly concatenating audio chunks...',
    });
    finalBlob = await concatenateWavBlobs(generatedBlobs, 0.08);
  } else {
    finalBlob = generatedBlobs[0];
  }

  onProgress?.({
    stage: 'completed',
    currentChunk: totalChunks,
    totalChunks,
    percentage: 100,
    message: 'Voice cloning synthesis complete!',
  });

  return finalBlob;
}
