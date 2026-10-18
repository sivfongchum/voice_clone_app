/**
 * Audio processing utilities:
 * - Conversion of WebM/OGG recordings to clean 16-bit mono/stereo PCM WAV
 * - Concatenation of multiple synthesized audio chunks into a seamless WAV file
 * - Accurate duration calculation
 */

/**
 * Encodes Float32Array channel data into a 16-bit PCM WAV Blob
 */
export function encodeWAV(
  samples: Float32Array,
  sampleRate: number = 24000,
  numChannels: number = 1
): Blob {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings into DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples (clamped between -1 and 1)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Calculates exact audio duration from Blob using AudioContext
 */
export async function getAudioBlobDuration(blob: Blob): Promise<number> {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  try {
    const buf = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buf);
    return decoded.duration;
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
}

/**
 * Converts any browser audio Blob to a clean 24kHz Mono WAV Blob
 */
export async function convertBlobToWav(
  audioBlob: Blob,
  targetSampleRate: number = 24000
): Promise<{ wavBlob: Blob; duration: number }> {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const monoSamples = renderedBuffer.getChannelData(0);
    const wavBlob = encodeWAV(monoSamples, targetSampleRate, 1);

    return {
      wavBlob,
      duration: audioBuffer.duration,
    };
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
}

/**
 * Concatenates multiple WAV blobs into a single continuous WAV Blob with silence buffer
 */
export async function concatenateWavBlobs(
  blobs: Blob[],
  silenceDurationSec: number = 0.08
): Promise<Blob> {
  if (blobs.length === 0) {
    throw new Error('No audio blobs to concatenate');
  }
  if (blobs.length === 1) {
    return blobs[0];
  }

  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  try {
    const decodedBuffers: AudioBuffer[] = [];
    let totalDuration = 0;
    let sampleRate = 24000;

    for (const blob of blobs) {
      const buf = await blob.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(buf);
      decodedBuffers.push(decoded);
      sampleRate = decoded.sampleRate;
      totalDuration += decoded.duration + silenceDurationSec;
    }

    totalDuration -= silenceDurationSec;

    const totalSamples = Math.ceil(totalDuration * sampleRate);
    const mergedSamples = new Float32Array(totalSamples);

    let currentSampleOffset = 0;
    const silenceSamplesCount = Math.floor(silenceDurationSec * sampleRate);

    for (let i = 0; i < decodedBuffers.length; i++) {
      const buffer = decodedBuffers[i];
      const channelData = buffer.getChannelData(0);

      mergedSamples.set(channelData, currentSampleOffset);
      currentSampleOffset += channelData.length;

      if (i < decodedBuffers.length - 1) {
        currentSampleOffset += silenceSamplesCount;
      }
    }

    return encodeWAV(mergedSamples, sampleRate, 1);
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
}

/**
 * Trims leading and trailing dead silence from synthesized audio.
 * Eliminates out-of-sync audio lag so the voice starts speaking at 0.00s sharp!
 */
export async function trimAudioSilence(
  audioBlob: Blob,
  threshold: number = 0.008
): Promise<{ trimmedBlob: Blob; duration: number }> {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  try {
    const arrayBuf = await audioBlob.arrayBuffer();
    const audioBuf = await audioContext.decodeAudioData(arrayBuf);
    const channelData = audioBuf.getChannelData(0);
    const actualSampleRate = audioBuf.sampleRate || 24000;

    let startIndex = 0;
    while (startIndex < channelData.length && Math.abs(channelData[startIndex]) < threshold) {
      startIndex++;
    }

    let endIndex = channelData.length - 1;
    while (endIndex > startIndex && Math.abs(channelData[endIndex]) < threshold) {
      endIndex--;
    }

    // Include small 15ms margin before speech to prevent clipping initial consonants
    const marginSamples = Math.floor(actualSampleRate * 0.015);
    const safeStart = Math.max(0, startIndex - marginSamples);
    const safeEnd = Math.min(channelData.length, endIndex + marginSamples);

    if (safeStart >= safeEnd || (safeStart === 0 && safeEnd === channelData.length)) {
      return { trimmedBlob: audioBlob, duration: audioBuf.duration };
    }

    const trimmedSamples = channelData.subarray(safeStart, safeEnd);
    const trimmedBlob = encodeWAV(trimmedSamples, actualSampleRate, 1);
    const duration = trimmedSamples.length / actualSampleRate;

    return { trimmedBlob, duration };
  } catch (e) {
    return { trimmedBlob: audioBlob, duration: 3.0 };
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
}

/**
 * Formats duration in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
