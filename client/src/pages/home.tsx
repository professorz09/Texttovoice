import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Mic,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Split,
  Sun,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wand2,
  X,
  AlertCircle,
  Key,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

// API Keys storage
const API_KEYS_STORAGE = "voiceforge_api_keys";
const SETTINGS_STORAGE = "voiceforge_settings";

// Models
const GEMINI_MODEL = "gemini-2.5-pro-preview-tts";
const CHIRP_MODEL = "chirp3-hd";

// Default word limit per chunk
const DEFAULT_WORD_LIMIT = 500;

const VOICES_GEMINI = [
  { name: "Zephyr", desc: "Bright" },
  { name: "Puck", desc: "Upbeat" },
  { name: "Charon", desc: "Informative" },
  { name: "Kore", desc: "Firm" },
  { name: "Fenrir", desc: "Excitable" },
  { name: "Leda", desc: "Youthful" },
  { name: "Orus", desc: "Firm" },
  { name: "Aoede", desc: "Breezy" },
  { name: "Callirrhoe", desc: "Easy-going" },
  { name: "Autonoe", desc: "Bright" },
  { name: "Enceladus", desc: "Breathy" },
  { name: "Iapetus", desc: "Clear" },
  { name: "Umbriel", desc: "Easy-going" },
  { name: "Algieba", desc: "Smooth" },
  { name: "Despina", desc: "Smooth" },
  { name: "Erinome", desc: "Clear" },
  { name: "Algenib", desc: "Gravelly" },
  { name: "Rasalgethi", desc: "Informative" },
  { name: "Laomedeia", desc: "Upbeat" },
  { name: "Achernar", desc: "Soft" },
  { name: "Alnilam", desc: "Firm" },
  { name: "Schedar", desc: "Even" },
  { name: "Gacrux", desc: "Mature" },
  { name: "Pulcherrima", desc: "Forward" },
  { name: "Achird", desc: "Friendly" },
  { name: "Zubenelgenubi", desc: "Casual" },
  { name: "Vindemiatrix", desc: "Gentle" },
  { name: "Sadachbia", desc: "Lively" },
  { name: "Sadaltager", desc: "Knowledgeable" },
  { name: "Sulafat", desc: "Warm" },
] as const;

// Chirp 3 HD voices (Google Cloud TTS)
// Voice format: {languageCode}-Chirp3-HD-{voiceName}
const CHIRP_VOICE_NAMES = [
  { name: "Achernar", desc: "Female, Soft" },
  { name: "Achird", desc: "Male, Friendly" },
  { name: "Algenib", desc: "Male, Gravelly" },
  { name: "Algieba", desc: "Male, Smooth" },
  { name: "Alnilam", desc: "Male, Firm" },
  { name: "Aoede", desc: "Female, Breezy" },
  { name: "Autonoe", desc: "Female, Bright" },
  { name: "Callirrhoe", desc: "Female, Easy-going" },
  { name: "Charon", desc: "Male, Informative" },
  { name: "Despina", desc: "Female, Smooth" },
  { name: "Enceladus", desc: "Male, Breathy" },
  { name: "Erinome", desc: "Female, Clear" },
  { name: "Fenrir", desc: "Male, Excitable" },
  { name: "Gacrux", desc: "Male, Mature" },
  { name: "Iapetus", desc: "Male, Clear" },
  { name: "Kore", desc: "Female, Firm" },
  { name: "Laomedeia", desc: "Female, Upbeat" },
  { name: "Leda", desc: "Female, Youthful" },
  { name: "Orus", desc: "Male, Firm" },
  { name: "Puck", desc: "Male, Upbeat" },
  { name: "Pulcherrima", desc: "Female, Forward" },
  { name: "Rasalgethi", desc: "Male, Informative" },
  { name: "Sadachbia", desc: "Male, Lively" },
  { name: "Sadaltager", desc: "Male, Knowledgeable" },
  { name: "Schedar", desc: "Male, Even" },
  { name: "Sulafat", desc: "Male, Warm" },
  { name: "Umbriel", desc: "Male, Easy-going" },
  { name: "Vindemiatrix", desc: "Female, Gentle" },
  { name: "Zephyr", desc: "Female, Bright" },
  { name: "Zubenelgenubi", desc: "Male, Casual" },
] as const;

// Supported languages for Chirp 3 HD
const CHIRP_LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "en-AU", name: "English (Australia)" },
  { code: "en-IN", name: "English (India)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-US", name: "Spanish (US)" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "cmn-CN", name: "Chinese (Mandarin)" },
  { code: "ar-XA", name: "Arabic" },
  { code: "bn-IN", name: "Bengali" },
  { code: "hi-IN", name: "Hindi" },
] as const;

const LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "hi-IN", name: "Hindi" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "ja-JP", name: "Japanese" },
] as const;

const STORAGE_KEY = "voiceforge_library";

type Provider = "gemini" | "chirp";
type ActiveView = "generator" | "library" | "teleprompter" | "settings";

type ApiKeys = {
  gemini: string;
  gcloud: string;
};

type AppSettings = {
  teleprompterFontSize: number; // 16-48
  teleprompterScrollSpeed: number; // 0.5-2
  wordLimit: number; // words per chunk (fixed 500)
  longTextMode: boolean; // enable multi-chunk for long text
};

type WordTimestamp = {
  word: string;
  startTime: number; // seconds
  endTime: number; // seconds
};

type ChunkStatus = {
  index: number;
  text: string;
  status: "pending" | "processing" | "completed" | "failed";
  audio?: { audio: string; mimeType: string };
  error?: string;
};

type Clip = {
  id: string;
  provider: Provider;
  title: string;
  createdAt: number;
  settings: {
    model: string;
    voice: string;
    language: string;
    style: string;
    pace: number;
    multiSpeaker: boolean;
  };
  text: string;
  audioData?: string;
  mimeType?: string;
  transcript?: WordTimestamp[]; // word-level timestamps from Speech-to-Text
  groupId?: string; // For grouping related clips
  partNumber?: number; // Part number in group
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Split text into chunks at paragraph breaks (~470 words target, max 500)
function splitTextIntoChunks(text: string, maxWords: number): string[] {
  const chunks: string[] = [];
  const targetWords = 470; // Target ~470 words

  // Split by paragraphs first (double newline or single newline)
  const paragraphs = text.trim().split(/\n\n+|\n/);

  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).filter(Boolean);
    const paraWordCount = paraWords.length;

    if (paraWordCount === 0) continue;

    // If adding this paragraph exceeds max and we have content, save current chunk
    if (currentWordCount + paraWordCount > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n\n"));
      currentChunk = [];
      currentWordCount = 0;
    }

    // If single paragraph is too long, split by sentences
    if (paraWordCount > maxWords) {
      // Split long paragraph by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceWords = sentence.trim().split(/\s+/).filter(Boolean);
        const sentenceWordCount = sentenceWords.length;

        if (currentWordCount + sentenceWordCount > maxWords && currentChunk.length > 0) {
          chunks.push(currentChunk.join(" "));
          currentChunk = [];
          currentWordCount = 0;
        }

        if (sentenceWordCount > 0) {
          currentChunk.push(sentence.trim());
          currentWordCount += sentenceWordCount;
        }

        // If we hit target ~470 and end of sentence, start new chunk
        if (currentWordCount >= targetWords && sentence.trim().match(/[.!?]$/)) {
          chunks.push(currentChunk.join(" "));
          currentChunk = [];
          currentWordCount = 0;
        }
      }
    } else {
      currentChunk.push(para.trim());
      currentWordCount += paraWordCount;

      // If we hit target ~470 at end of paragraph, start new chunk
      if (currentWordCount >= targetWords) {
        chunks.push(currentChunk.join("\n\n"));
        currentChunk = [];
        currentWordCount = 0;
      }
    }
  }

  // Add remaining content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }

  return chunks.filter(c => c.trim().length > 0);
}

// Storage limits
const MAX_CLIPS = 100;
const MAX_STORAGE_MB = 50;

function loadLibraryFromStorage(): Clip[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const clips = JSON.parse(data);
      // Auto-cleanup if exceeds limit
      if (clips.length > MAX_CLIPS) {
        return clips.slice(0, MAX_CLIPS);
      }
      return clips;
    }
  } catch (e) {
    console.error("Load failed:", e);
  }
  return [];
}

function saveLibraryToStorage(clips: Clip[]) {
  try {
    // Enforce max clips limit
    let clipsToSave = clips;
    if (clips.length > MAX_CLIPS) {
      clipsToSave = clips.slice(0, MAX_CLIPS);
    }
    
    const dataStr = JSON.stringify(clipsToSave);
    const sizeInMB = new Blob([dataStr]).size / (1024 * 1024);
    
    // Check storage size
    if (sizeInMB > MAX_STORAGE_MB) {
      // Remove oldest clips until under limit
      while (clipsToSave.length > 0 && new Blob([JSON.stringify(clipsToSave)]).size / (1024 * 1024) > MAX_STORAGE_MB) {
        clipsToSave = clipsToSave.slice(0, -1);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clipsToSave));
  } catch (e) {
    console.error("Save failed:", e);
    // If quota exceeded, try removing oldest clips
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      try {
        const reducedClips = clips.slice(0, Math.floor(clips.length / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedClips));
      } catch (retryError) {
        console.error("Retry save failed:", retryError);
      }
    }
  }
}

function loadApiKeys(): ApiKeys {
  try {
    const data = localStorage.getItem(API_KEYS_STORAGE);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Load API keys failed:", e);
  }
  return { gemini: "", gcloud: "" };
}

function saveApiKeys(keys: ApiKeys) {
  try {
    localStorage.setItem(API_KEYS_STORAGE, JSON.stringify(keys));
  } catch (e) {
    console.error("Save API keys failed:", e);
  }
}

const defaultSettings: AppSettings = {
  teleprompterFontSize: 28,
  teleprompterScrollSpeed: 1,
  wordLimit: 500, // Fixed at 500
  longTextMode: false, // OFF by default
};

function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_STORAGE);
    if (data) return { ...defaultSettings, ...JSON.parse(data) };
  } catch (e) {
    console.error("Load settings failed:", e);
  }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(settings));
  } catch (e) {
    console.error("Save settings failed:", e);
  }
}

// Convert [1] [2] markers to multi-speaker turn format
function parseMultiSpeakerText(text: string, voice1: string, voice2: string): { turns: { speaker: string; text: string }[] } {
  const turns: { speaker: string; text: string }[] = [];
  // Split by [1] and [2] markers
  const parts = text.split(/\[([12])\]/);

  let currentSpeaker = voice1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part === "1") {
      currentSpeaker = voice1;
    } else if (part === "2") {
      currentSpeaker = voice2;
    } else if (part.length > 0) {
      turns.push({ speaker: currentSpeaker, text: part });
    }
  }

  // If no markers found, treat as single speaker
  if (turns.length === 0 && text.trim()) {
    turns.push({ speaker: voice1, text: text.trim() });
  }

  return { turns };
}

// Direct Gemini TTS API call
async function callGeminiTTS(
  apiKey: string,
  text: string,
  voice: string,
  language: string,
  multiSpeaker: boolean = false,
  voice2: string = ""
): Promise<{ audio: string; mimeType: string }> {
  let requestBody: any;

  if (multiSpeaker && voice2) {
    // Multi-speaker mode using turn-based format
    const { turns } = parseMultiSpeakerText(text, voice, voice2);
    requestBody = {
      contents: [{
        parts: [{
          text: turns.map(t => `<speaker name="${t.speaker}">${t.text}</speaker>`).join("\n")
        }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: voice, voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
              { speaker: voice2, voiceConfig: { prebuiltVoiceConfig: { voiceName: voice2 } } }
            ]
          }
        }
      }
    };
  } else {
    // Single speaker mode
    requestBody = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gemini API error");
  }

  const data = await response.json();
  const audioPart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!audioPart?.inlineData) {
    throw new Error("No audio in response");
  }

  // Gemini returns PCM audio - convert to WAV for playback
  const pcmBase64 = audioPart.inlineData.data;
  const mimeType = audioPart.inlineData.mimeType || "audio/L16;rate=24000";

  // If it's raw PCM, wrap it in WAV header
  if (mimeType.includes("L16") || mimeType.includes("pcm")) {
    const wavBase64 = pcmToWav(pcmBase64, 24000);
    return { audio: wavBase64, mimeType: "audio/wav" };
  }

  return {
    audio: pcmBase64,
    mimeType: mimeType
  };
}

// Convert PCM to WAV format
function pcmToWav(pcmBase64: string, sampleRate: number): string {
  const pcmData = atob(pcmBase64);
  const pcmLength = pcmData.length;

  // WAV header is 44 bytes
  const wavLength = 44 + pcmLength;
  const buffer = new ArrayBuffer(wavLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, wavLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmLength, true);

  // PCM data
  const uint8 = new Uint8Array(buffer);
  for (let i = 0; i < pcmLength; i++) {
    uint8[44 + i] = pcmData.charCodeAt(i);
  }

  // Convert to base64
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Direct Google Cloud TTS API call for Chirp 3 HD
async function callChirpTTS(
  apiKey: string,
  text: string,
  voiceName: string,
  languageCode: string
): Promise<{ audio: string; mimeType: string }> {
  // Build full voice name: en-US-Chirp3-HD-Kore
  const fullVoiceName = `${languageCode}-Chirp3-HD-${voiceName}`;

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: fullVoiceName
        },
        audioConfig: {
          audioEncoding: "MP3"
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Google Cloud TTS API error");
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error("No audio in response");
  }

  return {
    audio: data.audioContent,
    mimeType: "audio/mp3"
  };
}

// Google Cloud Speech-to-Text API for word timestamps
async function getTranscriptWithTimestamps(
  apiKey: string,
  audioBase64: string,
  languageCode: string,
  mimeType?: string
): Promise<WordTimestamp[]> {
  // Detect encoding from mimeType or default to LINEAR16 for WAV
  let encoding = "LINEAR16";
  let sampleRateHertz = 24000;
  
  if (mimeType?.includes("mp3")) {
    encoding = "MP3";
  } else if (mimeType?.includes("wav")) {
    encoding = "LINEAR16";
  }

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        config: {
          encoding,
          sampleRateHertz,
          languageCode,
          enableWordTimeOffsets: true,
          model: "latest_long",
          enableAutomaticPunctuation: true
        },
        audio: {
          content: audioBase64
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Speech-to-Text API error");
  }

  const data = await response.json();
  const timestamps: WordTimestamp[] = [];

  if (data.results && data.results.length > 0) {
    for (const result of data.results) {
      if (result.alternatives?.[0]?.words) {
        for (const wordInfo of result.alternatives[0].words) {
          timestamps.push({
            word: wordInfo.word,
            startTime: parseFloat(wordInfo.startTime?.replace('s', '') || '0'),
            endTime: parseFloat(wordInfo.endTime?.replace('s', '') || '0')
          });
        }
      }
    }
  }

  return timestamps;
}

async function mergeAudioChunks(chunks: { audio: string; mimeType: string }[]): Promise<{ audio: string; mimeType: string }> {
  if (chunks.length === 0) throw new Error("No chunks");
  if (chunks.length === 1) return chunks[0];

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decodedBuffers: AudioBuffer[] = [];

  // Decode all chunks sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const binary = atob(chunk.audio);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) {
      bytes[j] = binary.charCodeAt(j);
    }
    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
    decodedBuffers.push(audioBuffer);
  }

  // Use first buffer's properties
  const { numberOfChannels, sampleRate } = decodedBuffers[0];
  const totalLength = decodedBuffers.reduce((sum, buf) => sum + buf.length, 0);
  
  // Create merged buffer
  const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

  // Copy all channels for each buffer
  let offset = 0;
  for (const buffer of decodedBuffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      mergedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
    }
    offset += buffer.length;
  }

  // Encode to WAV
  const wavData = encodeWAV(mergedBuffer);
  const uint8 = new Uint8Array(wavData);
  
  // Convert to base64 in chunks to avoid stack overflow
  let base64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
    base64 += String.fromCharCode(...chunk);
  }
  base64 = btoa(base64);
  
  await audioContext.close();
  return { audio: base64, mimeType: "audio/wav" };
}

function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const { numberOfChannels, sampleRate } = audioBuffer;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const totalSize = 44 + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };

  writeStr(0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: numberOfChannels }, (_, i) => audioBuffer.getChannelData(i));
  let pos = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      pos += 2;
    }
  }
  return buffer;
}

function Teleprompter({ text, isPlaying, currentTime, duration, onClose, fontSize, scrollSpeed, transcript }: {
  text: string; isPlaying: boolean; currentTime: number; duration: number; onClose: () => void;
  fontSize: number; scrollSpeed: number; transcript?: WordTimestamp[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localSpeed, setLocalSpeed] = useState(scrollSpeed);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  useEffect(() => {
    audioRef.current = document.querySelector('audio');
    if (audioRef.current) {
      const audio = audioRef.current;
      const handlePlay = () => setLocalIsPlaying(true);
      const handlePause = () => setLocalIsPlaying(false);
      
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      
      setLocalIsPlaying(!audio.paused);
      
      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = localSpeed;
    }
  }, [localSpeed]);

  const words = useMemo(() => {
    if (transcript && transcript.length > 0) {
      return transcript.map(t => t.word);
    }
    return text.split(/\s+/).filter(Boolean);
  }, [text, transcript]);

  useEffect(() => {
    if (transcript && transcript.length > 0) {
      const idx = transcript.findIndex(t => currentTime >= t.startTime && currentTime < t.endTime);
      if (idx >= 0) {
        setHighlightIndex(idx);
      } else if (currentTime >= (transcript[transcript.length - 1]?.endTime || 0)) {
        setHighlightIndex(transcript.length - 1);
      }
    } else if (duration > 0) {
      const progress = currentTime / duration;
      setHighlightIndex(Math.min(Math.floor(progress * words.length), words.length - 1));
    }
  }, [currentTime, duration, words.length, transcript]);

  useEffect(() => {
    if (!containerRef.current || isDragging || !localIsPlaying) return;
    
    const el = containerRef.current.querySelector(`[data-word-index="${highlightIndex}"]`);
    if (el) {
      const container = containerRef.current;
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;
      
      if (Math.abs(offset) > 5) {
        container.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }
  }, [highlightIndex, isDragging, localIsPlaying]);

  const handlePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (audioRef.current.paused) {
          await audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      } catch (err) {
        console.error('Playback error:', err);
      }
    }
  };

  const handleSeek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration));
    }
  };

  const handleSeekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = parseFloat(e.target.value);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setLocalSpeed(speed);
  };

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Teleprompter</span>
          {transcript && <Badge variant="secondary" className="text-xs">Synced</Badge>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Text Display */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div className="mx-auto max-w-3xl px-8 py-20">
          <div style={{ fontSize: `${localFontSize}px`, lineHeight: 1.8 }}>
            {words.map((word, i) => (
              <span key={i} data-word-index={i}
                className={`inline-block px-1 py-0.5 transition-all duration-200 ${
                  i === highlightIndex 
                    ? "bg-primary text-primary-foreground font-bold scale-110 shadow-lg rounded px-2" 
                    : i < highlightIndex 
                    ? "text-muted-foreground/30" 
                    : "text-foreground"
                }`}
              >{word} </span>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Footer */}
      <div className="border-t bg-background/95 backdrop-blur">
        {/* Playback Controls */}
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={() => handleSeek(-10)} className="w-16">-10s</Button>
            <Button size="sm" variant="outline" onClick={() => handleSeek(-5)} className="w-14">-5s</Button>
            <Button size="lg" onClick={handlePlayPause} className="w-20 h-12">
              {localIsPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleSeek(5)} className="w-14">+5s</Button>
            <Button size="sm" variant="outline" onClick={() => handleSeek(10)} className="w-16">+10s</Button>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeekTo}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--muted)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--muted)) 100%)`
              }}
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-mono">{formatTimeDisplay(currentTime)}</span>
              <span className="text-xs text-muted-foreground">Word {highlightIndex + 1} / {words.length}</span>
              <span className="text-muted-foreground font-mono">{formatTimeDisplay(duration)}</span>
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Size</Label>
              <input
                type="range"
                min="16"
                max="64"
                value={localFontSize}
                onChange={(e) => setLocalFontSize(parseInt(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
              />
              <span className="text-sm text-muted-foreground w-12 text-right font-mono">{localFontSize}px</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Speed</Label>
              <div className="flex gap-1">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                  <Button
                    key={speed}
                    size="sm"
                    variant={localSpeed === speed ? "default" : "outline"}
                    onClick={() => handleSpeedChange(speed)}
                    className="h-8 px-2 text-xs"
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [provider, setProvider] = useState<Provider>("gemini");
  const [activeView, setActiveView] = useState<ActiveView>("generator");
  const [voice, setVoice] = useState<string>("Zubenelgenubi");
  const [voice2, setVoice2] = useState<string>("Kore"); // Second voice for 2-speaker
  const [chirpVoice, setChirpVoice] = useState<string>("Zubenelgenubi");
  const [language, setLanguage] = useState<string>("en-US");
  const [style, setStyle] = useState<string>("Warm, clear, confident");
  const [pace, setPace] = useState<number>(55);
  const [multiSpeaker, setMultiSpeaker] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState(false); // OFF by default
  const [text, setText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<Clip[]>(() => loadLibraryFromStorage());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [teleprompterClip, setTeleprompterClip] = useState<Clip | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => loadApiKeys());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>([]);
  const [showProcessingPanel, setShowProcessingPanel] = useState(false);

  useEffect(() => { saveLibraryToStorage(clips); }, [clips]);
  useEffect(() => { saveApiKeys(apiKeys); }, [apiKeys]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  const currentModel = provider === "gemini" ? GEMINI_MODEL : CHIRP_MODEL;
  const wordCount = countWords(text);
  const needsChunking = settings.longTextMode && wordCount > 500; // Only chunk if Long Text Mode ON and >500 words
  const currentVoice = provider === "gemini" ? voice : chirpVoice;
  const textChunks = useMemo(() => needsChunking ? splitTextIntoChunks(text, 500) : [text], [text, needsChunking]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { setCurrentTime(audio.currentTime); setDuration(audio.duration || 0); }
  }, []);

  // Generate TTS - direct API call from frontend
  async function generateTTS(textContent: string): Promise<{ audio: string; mimeType: string } | null> {
    try {
      if (provider === "gemini") {
        if (!apiKeys.gemini) {
          toast({
            title: "API Key Required",
            description: "Add your Gemini API key in Settings",
            variant: "destructive"
          });
          return null;
        }
        return await callGeminiTTS(apiKeys.gemini, textContent, voice, language, multiSpeaker, voice2);
      } else {
        if (!apiKeys.gcloud) {
          toast({
            title: "API Key Required",
            description: "Add your Google Cloud API key in Settings",
            variant: "destructive"
          });
          return null;
        }
        return await callChirpTTS(apiKeys.gcloud, textContent, chirpVoice, language);
      }
    } catch (err: any) {
      toast({
        title: "API Error",
        description: err.message || "Failed to generate speech",
        variant: "destructive"
      });
      return null;
    }
  }

  // Generate a single chunk
  async function generateChunk(chunkText: string, index: number): Promise<{ audio: string; mimeType: string } | null> {
    setChunkStatuses(prev => prev.map((s, i) =>
      i === index ? { ...s, status: "processing", error: undefined } : s
    ));

    try {
      const result = await generateTTS(chunkText);
      if (result) {
        setChunkStatuses(prev => prev.map((s, i) =>
          i === index ? { ...s, status: "completed", audio: result } : s
        ));
        return result;
      } else {
        setChunkStatuses(prev => prev.map((s, i) =>
          i === index ? { ...s, status: "failed", error: "API key required" } : s
        ));
        return null;
      }
    } catch (err: any) {
      setChunkStatuses(prev => prev.map((s, i) =>
        i === index ? { ...s, status: "failed", error: err.message || "Failed" } : s
      ));
      return null;
    }
  }

  // Retry a failed chunk
  async function retryChunk(index: number) {
    const chunk = chunkStatuses[index];
    if (!chunk) return;

    setIsGenerating(true);
    await generateChunk(chunk.text, index);
    setIsGenerating(false);

    // Check if all chunks are now completed
    const updatedStatuses = chunkStatuses.map((s, i) =>
      i === index ? { ...s, status: "completed" as const } : s
    );
    if (updatedStatuses.every(s => s.status === "completed")) {
      await finalizeMerge();
    }
  }

  // Finalize and merge all audio
  async function finalizeMerge() {
    const allCompleted = chunkStatuses.every(s => s.status === "completed" && s.audio);
    if (!allCompleted) {
      toast({ title: "Error", description: "Some chunks failed. Retry failed chunks first.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      // Sort chunks by index to ensure correct order
      const sortedChunks = [...chunkStatuses].sort((a, b) => a.index - b.index);
      const audioChunks = sortedChunks.map(s => s.audio!);
      const fullText = sortedChunks.map(s => s.text).join("\n\n");
      let audioResult: { audio: string; mimeType: string };

      if (audioChunks.length === 1) {
        audioResult = audioChunks[0];
      } else {
        audioResult = await mergeAudioChunks(audioChunks);
      }

      const clip: Clip = {
        id: uid(),
        provider,
        title: currentVoice,
        createdAt: Date.now(),
        settings: { model: currentModel, voice: currentVoice, language, style, pace, multiSpeaker },
        text: fullText,
        audioData: audioResult.audio,
        mimeType: audioResult.mimeType,
      };

      setClips(prev => [clip, ...prev]);
      toast({ title: "Saved!", description: "Audio merged and saved to library." });
      setShowProcessingPanel(false);
      setChunkStatuses([]);
    } catch (err: any) {
      console.error("Merge error:", err);
      toast({ title: "Merge Failed", description: err.message || "Failed to merge audio chunks", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  // Save without merging - saves all chunks separately
  async function saveWithoutMerge() {
    const completedChunks = [...chunkStatuses]
      .filter(s => s.status === "completed" && s.audio)
      .sort((a, b) => a.index - b.index);
    
    if (completedChunks.length === 0) {
      toast({ title: "Error", description: "No completed chunks to save.", variant: "destructive" });
      return;
    }

    const groupId = uid();
    
    // Save each completed chunk as separate clip with group info
    const newClips = completedChunks.map((chunk) => ({
      id: uid(),
      provider,
      title: `${currentVoice} - Part ${chunk.index + 1}`,
      createdAt: Date.now(),
      settings: { model: currentModel, voice: currentVoice, language, style, pace, multiSpeaker },
      text: chunk.text,
      audioData: chunk.audio!.audio,
      mimeType: chunk.audio!.mimeType,
      groupId,
      partNumber: chunk.index + 1,
    }));

    setClips(prev => [...newClips, ...prev]);
    toast({ title: "Saved!", description: `${completedChunks.length} parts saved as group to library.` });
    setShowProcessingPanel(false);
    setChunkStatuses([]);
  }

  async function onGenerate() {
    if (!text.trim()) {
      toast({ title: "Text required", description: "Enter text to generate speech." });
      return;
    }

    // Check API key first
    if (provider === "gemini" && !apiKeys.gemini) {
      toast({ title: "API Key Required", description: "Add your Gemini API key in Settings", variant: "destructive" });
      return;
    }
    if (provider === "chirp" && !apiKeys.gcloud) {
      toast({ title: "API Key Required", description: "Add your Google Cloud API key in Settings", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    if (needsChunking) {
      // Multi-chunk mode with processing panel
      const chunks = textChunks;
      const initialStatuses: ChunkStatus[] = chunks.map((chunkText, index) => ({
        index,
        text: chunkText,
        status: "processing"
      }));
      setChunkStatuses(initialStatuses);
      setShowProcessingPanel(true);

      // Process all chunks in parallel
      await Promise.all(chunks.map((chunk, i) => generateChunk(chunk, i)));
      setIsGenerating(false);
    } else {
      // Single chunk mode
      try {
        const audioResult = await generateTTS(text);
        if (!audioResult) {
          return;
        }

        const clip: Clip = {
          id: uid(),
          provider,
          title: currentVoice,
          createdAt: Date.now(),
          settings: { model: currentModel, voice: currentVoice, language, style, pace, multiSpeaker },
          text,
          audioData: audioResult.audio,
          mimeType: audioResult.mimeType,
        };

        setClips(prev => [clip, ...prev]);
        toast({ title: "Saved!", description: "Audio saved to library." });
      } finally {
        setIsGenerating(false);
      }
    }
  }

  function getAudioUrl(clip: Clip): string {
    return clip.audioData ? `data:${clip.mimeType || "audio/wav"};base64,${clip.audioData}` : "";
  }

  async function playClip(clip: Clip) {
    const audio = audioRef.current;
    if (!audio) return;
    const url = getAudioUrl(clip);
    if (!url) return;
    
    if (nowPlayingId === clip.id) {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
      return;
    }
    
    audio.src = url;
    audio.load();
    await audio.play();
    setNowPlayingId(clip.id);
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setNowPlayingId(null);
    setCurrentTime(0);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const clip: Clip = {
          id: uid(),
          provider: 'gemini',
          title: file.name.replace(/\.[^/.]+$/, ''),
          createdAt: Date.now(),
          settings: { model: 'uploaded', voice: 'N/A', language: 'en-US', style: '', pace: 50, multiSpeaker: false },
          text: 'Uploaded file',
          audioData: base64,
          mimeType: file.type || 'audio/mpeg',
        };
        setClips(prev => [clip, ...prev]);
        toast({ title: "Uploaded!", description: `${file.name} added to library` });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    }
    
    e.target.value = '';
  }

  function downloadClip(clip: Clip) {
    const url = getAudioUrl(clip);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clip.title}-${clip.id}.wav`;
    a.click();
  }

  function downloadTranscript(clip: Clip) {
    if (!clip.transcript || clip.transcript.length === 0) {
      toast({ title: "No Transcript", description: "Generate transcript first by clicking the sync button", variant: "destructive" });
      return;
    }
    
    const transcriptText = clip.transcript.map(t => 
      `${t.startTime.toFixed(2)}s - ${t.endTime.toFixed(2)}s: ${t.word}`
    ).join('\n');
    
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clip.title}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "Transcript Downloaded", description: `${clip.title}-transcript.txt` });
  }

  function deleteClip(clipId: string) {
    if (nowPlayingId === clipId) stopPlayback();
    setClips(prev => prev.filter(c => c.id !== clipId));
  }

  const [generatingTranscriptId, setGeneratingTranscriptId] = useState<string | null>(null);

  // Generate transcript with timestamps for a clip using Speech-to-Text API
  async function generateTranscriptForClip(clip: Clip) {
    if (!apiKeys.gcloud) {
      toast({ title: "API Key Required", description: "Add Google Cloud API key in Settings for Speech-to-Text", variant: "destructive" });
      return;
    }
    if (!clip.audioData) {
      toast({ title: "Error", description: "No audio data available", variant: "destructive" });
      return;
    }

    // Check size limit (10MB = 10485760 bytes, base64 is ~1.37x original)
    const sizeBytes = (clip.audioData.length * 3) / 4;
    
    // If too large and it's a merged file, suggest using parts
    if (sizeBytes > 10000000) {
      // Check if this clip has related parts in the same group
      const groupClips = clip.groupId ? clips.filter(c => c.groupId === clip.groupId) : [];
      
      if (groupClips.length > 1) {
        toast({ 
          title: "Generating Transcripts", 
          description: `Processing ${groupClips.length} parts separately...`,
        });
        
        // Generate transcript for each part
        for (const part of groupClips) {
          if (part.audioData) {
            const partSize = (part.audioData.length * 3) / 4;
            if (partSize <= 10000000) {
              await generateTranscriptForClip(part);
            }
          }
        }
        return;
      }
      
      toast({ 
        title: "Audio Too Large", 
        description: "Audio exceeds 10MB. Re-generate with 'Save Separately' option for transcripts.", 
        variant: "destructive" 
      });
      return;
    }

    setGeneratingTranscriptId(clip.id);
    try {
      const transcript = await getTranscriptWithTimestamps(
        apiKeys.gcloud,
        clip.audioData,
        clip.settings.language || "en-US",
        clip.mimeType
      );

      setClips(prev => prev.map(c =>
        c.id === clip.id ? { ...c, transcript } : c
      ));

      toast({ title: "Transcript Generated!", description: `${transcript.length} words saved.` });
    } catch (err: any) {
      toast({ title: "Transcript Error", description: err.message || "Failed to generate transcript", variant: "destructive" });
    } finally {
      setGeneratingTranscriptId(null);
    }
  }

  function handleOpenTeleprompter(clip: Clip) {
    setTeleprompterClip(clip);
    setShowTeleprompter(true);
    playClip(clip);
  }

  function handleCloseTeleprompter() {
    setShowTeleprompter(false);
    setTeleprompterClip(null);
  }

  return (
    <div className="min-h-screen w-full bg-background touch-manipulation" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-40" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-10 w-10 rounded-full touch-manipulation active:scale-95 transition-transform"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <audio ref={audioRef} onEnded={() => { setNowPlayingId(null); setCurrentTime(0); }} onTimeUpdate={handleTimeUpdate} />

      <AnimatePresence>
        {showTeleprompter && teleprompterClip && (
          <Teleprompter
            text={teleprompterClip.text}
            isPlaying={nowPlayingId === teleprompterClip.id}
            currentTime={currentTime}
            duration={duration}
            onClose={handleCloseTeleprompter}
            fontSize={settings.teleprompterFontSize}
            scrollSpeed={settings.teleprompterScrollSpeed}
            transcript={teleprompterClip.transcript}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-md px-4 pt-4">
        {/* GENERATOR VIEW */}
        {activeView === "generator" && (
          <div className="space-y-4">
            <Tabs value={provider} onValueChange={(v) => {
              const p = v as Provider;
              setProvider(p);
              // Keep Zubenelgenubi as default for both
              if (p === "gemini") setVoice("Zubenelgenubi");
              else setChirpVoice("Zubenelgenubi");
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gemini">Gemini 2.5 Pro</TabsTrigger>
                <TabsTrigger value="chirp">Chirp 3 HD</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Voice Selection - Scrollable Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Voice</Label>
                <Badge variant="outline" className="text-xs">{currentVoice}</Badge>
              </div>
              <ScrollArea className="h-32 rounded-lg border p-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {(provider === "gemini" ? VOICES_GEMINI : CHIRP_VOICE_NAMES).map((v) => {
                    const isSelected = (provider === "gemini" ? voice : chirpVoice) === v.name;
                    return (
                      <Button
                        key={v.name}
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        className={`h-auto py-1.5 px-2 flex flex-col items-start text-left ${isSelected ? "" : "hover:bg-muted"}`}
                        onClick={() => provider === "gemini" ? setVoice(v.name) : setChirpVoice(v.name)}
                      >
                        <span className="text-xs font-medium truncate w-full">{v.name}</span>
                        <span className={`text-[10px] truncate w-full ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{v.desc}</span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {(provider === "chirp" ? CHIRP_LANGUAGES : LANGUAGES).map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API Key Warning */}
            {((provider === "gemini" && !apiKeys.gemini) || (provider === "chirp" && !apiKeys.gcloud)) && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-500">
                    {provider === "gemini" ? "Gemini" : "Google Cloud"} API key required
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveView("settings")}>
                  <Key className="h-3 w-3 mr-1" /> Add Key
                </Button>
              </div>
            )}

            {/* Long Text Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {settings.longTextMode ? (
                  <ToggleRight className="h-4 w-4 text-primary" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <span className="text-sm font-medium">Long Text Mode</span>
                  <p className="text-xs text-muted-foreground">Split text &gt;500 words into parts</p>
                </div>
              </div>
              <Switch
                checked={settings.longTextMode}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, longTextMode: v }))}
              />
            </div>

            {/* Script Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Script</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{wordCount} words</Badge>
                  {!settings.longTextMode && wordCount > 500 && (
                    <Badge variant="destructive" className="text-xs">Too long! Enable Long Text Mode</Badge>
                  )}
                </div>
              </div>

              {/* Single column if Long Text OFF or text is short */}
              {(!settings.longTextMode || !needsChunking) ? (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-36 resize-none"
                  placeholder="Enter your text here (max 500 words)..."
                />
              ) : (
                /* Two-column view when Long Text ON and text is long */
                <div className="grid grid-cols-2 gap-2">
                  {textChunks.slice(0, 2).map((chunk, i) => (
                    <div key={i} className="space-y-1">
                      <Badge variant="outline" className="text-xs">Script {i + 1} ({countWords(chunk)} words)</Badge>
                      <Textarea
                        value={chunk}
                        readOnly
                        className="min-h-32 resize-none text-xs bg-muted/30"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Show more chunks if more than 2 */}
              {settings.longTextMode && textChunks.length > 2 && (
                <ScrollArea className="h-24 rounded-lg border p-2">
                  <div className="space-y-1">
                    {textChunks.slice(2).map((chunk, i) => (
                      <div key={i + 2} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                        <Badge variant="outline" className="shrink-0">Script {i + 3}</Badge>
                        <span className="text-muted-foreground truncate flex-1">{chunk.slice(0, 40)}...</span>
                        <span className="text-muted-foreground shrink-0">{countWords(chunk)}w</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Full text input when Long Text Mode is ON */}
              {settings.longTextMode && (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-24 resize-none"
                  placeholder="Enter your full text here..."
                />
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Advanced Settings</span>
              </div>
              <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
            </div>

            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="rounded-lg border p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Style</Label>
                  <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Warm, clear, confident" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs">Pace</Label>
                    <span className="text-xs text-muted-foreground">{pace}%</span>
                  </div>
                  <Slider value={[pace]} onValueChange={(v) => setPace(v[0])} min={20} max={90} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">2 Speakers Mode</Label>
                      <p className="text-[10px] text-muted-foreground">Use [1] and [2] to mark speakers</p>
                    </div>
                    <Switch checked={multiSpeaker} onCheckedChange={setMultiSpeaker} />
                  </div>
                  {multiSpeaker && provider === "gemini" && (
                    <div className="space-y-2 p-2 rounded bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Speaker 1: {voice}</Label>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Speaker 2</Label>
                          <Select value={voice2} onValueChange={setVoice2}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-40">
                              {VOICES_GEMINI.filter(v => v.name !== voice).map((v) => (
                                <SelectItem key={v.name} value={v.name} className="text-xs">
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Example: [1] Hello! [2] Hi there! [1] How are you?
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Processing Panel */}
            {showProcessingPanel && chunkStatuses.length > 0 && (
              <Card className="border-primary/50">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Processing {chunkStatuses.length} Scripts</span>
                    <Badge variant="secondary">
                      {chunkStatuses.filter(s => s.status === "completed").length}/{chunkStatuses.length} done
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {chunkStatuses.map((chunk, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${
                        chunk.status === "completed" ? "bg-green-500/10" :
                        chunk.status === "failed" ? "bg-red-500/10" :
                        chunk.status === "processing" ? "bg-blue-500/10" : "bg-muted/50"
                      }`}>
                        <Badge variant="outline" className="shrink-0">Script {i + 1}</Badge>
                        <span className="flex-1 truncate text-xs text-muted-foreground">
                          {chunk.text.slice(0, 30)}...
                        </span>
                        {chunk.status === "processing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {chunk.status === "completed" && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-600">Done</Badge>
                        )}
                        {chunk.status === "failed" && (
                          <div className="flex items-center gap-1">
                            <Badge variant="destructive" className="text-xs">{chunk.error || "Failed"}</Badge>
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => retryChunk(i)}>
                              Retry
                            </Button>
                          </div>
                        )}
                        {chunk.status === "pending" && (
                          <Badge variant="outline" className="text-muted-foreground">Waiting</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {chunkStatuses.some(s => s.status === "failed") && (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => {
                          chunkStatuses.forEach((chunk, i) => {
                            if (chunk.status === "failed") retryChunk(i);
                          });
                        }}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry All Failed
                      </Button>
                    )}
                    
                    {chunkStatuses.every(s => s.status === "completed") && (
                      <>
                        <Button className="w-full" onClick={finalizeMerge} disabled={isGenerating}>
                          {isGenerating ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Merging...</>
                          ) : (
                            <><AudioLines className="h-4 w-4 mr-2" />Merge All & Save</>
                          )}
                        </Button>
                        <Button variant="outline" className="w-full" onClick={saveWithoutMerge}>
                          <Split className="h-4 w-4 mr-2" />Save Separately ({chunkStatuses.length} clips)
                        </Button>
                      </>
                    )}
                    
                    {chunkStatuses.some(s => s.status === "completed") && !chunkStatuses.every(s => s.status === "completed") && (
                      <Button variant="outline" className="w-full" onClick={saveWithoutMerge}>
                        <Split className="h-4 w-4 mr-2" />Save Completed Only ({chunkStatuses.filter(s => s.status === "completed").length} clips)
                      </Button>
                    )}
                  </div>

                  {/* Cancel button */}
                  <Button variant="ghost" className="w-full" onClick={() => {
                    setShowProcessingPanel(false);
                    setChunkStatuses([]);
                  }}>
                    <X className="h-4 w-4 mr-2" /> Close
                  </Button>
                </CardContent>
              </Card>
            )}

            {!showProcessingPanel && (
              <Button className="w-full h-12 text-base" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" />Generating...</>
                ) : (
                  <><Mic className="h-5 w-5 mr-2" />Generate Speech</>
                )}
              </Button>
            )}
          </div>
        )}

        {/* LIBRARY VIEW */}
        {activeView === "library" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold">Library ({clips.length}/{MAX_CLIPS})</h2>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const sizeInMB = new Blob([JSON.stringify(clips)]).size / (1024 * 1024);
                    return `${sizeInMB.toFixed(1)}MB / ${MAX_STORAGE_MB}MB used`;
                  })()}
                </p>
              </div>
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild disabled={clips.length >= MAX_CLIPS}>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </span>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.mp4,.mov,.avi,.mkv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {clips.length >= MAX_CLIPS && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Storage limit reached</p>
                    <p className="text-xs mt-1">Delete old clips to add new ones. Oldest clips auto-delete when limit exceeded.</p>
                  </div>
                </div>
              </div>
            )}

            {clips.length === 0 ? (
              <div className="text-center py-12">
                <AudioLines className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="mt-3 text-muted-foreground">No clips yet</p>
                <p className="text-sm text-muted-foreground">Generate your first audio!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map((clip, idx) => {
                  const isPlaying = nowPlayingId === clip.id;
                  const isGrouped = clip.groupId && clip.partNumber;
                  const isFirstInGroup = isGrouped && (idx === 0 || clips[idx - 1]?.groupId !== clip.groupId);
                  const groupClips = isGrouped ? clips.filter(c => c.groupId === clip.groupId) : [];
                  
                  return (
                    <div key={clip.id}>
                      {isFirstInGroup && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-t-lg border-b">
                          <Split className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {clip.title.replace(/ - Part \d+$/, '')} • {groupClips.length} parts
                          </span>
                        </div>
                      )}
                      <Card className={`bg-card/70 ${isGrouped ? 'rounded-t-none border-t-0' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{clip.title}</span>
                                {!isGrouped && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {clip.provider === "gemini" ? "Gemini" : "Chirp"}
                                  </Badge>
                                )}
                                {clip.transcript && (
                                  <Badge variant="secondary" className="text-xs shrink-0 bg-green-500/20 text-green-600">
                                    <Check className="h-3 w-3 mr-0.5" /> Synced
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatTime(clip.createdAt)} • {countWords(clip.text)} words
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant={isPlaying ? "default" : "ghost"} className="h-8 w-8"
                                onClick={() => isPlaying ? stopPlayback() : playClip(clip)}>
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenTeleprompter(clip)}>
                                <BookOpen className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-8 w-8 ${clip.transcript ? "text-green-600" : "text-orange-500"}`}
                                onClick={() => generateTranscriptForClip(clip)}
                                disabled={generatingTranscriptId === clip.id}
                                title={clip.transcript ? "Regenerate transcript" : "Generate transcript for word sync"}
                              >
                                {generatingTranscriptId === clip.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8" 
                                onClick={() => downloadClip(clip)}
                                title="Download audio"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className={`h-8 w-8 ${clip.transcript ? "text-blue-600" : "text-muted-foreground/30"}`}
                                onClick={() => downloadTranscript(clip)}
                                disabled={!clip.transcript}
                                title={clip.transcript ? "Download transcript" : "Generate transcript first"}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteClip(clip.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{clip.text}</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TELEPROMPTER VIEW */}
        {activeView === "teleprompter" && (
          <div className="space-y-3">
            <h2 className="font-semibold">Teleprompter</h2>
            <p className="text-sm text-muted-foreground">
              Select a clip. Click <RefreshCw className="h-3 w-3 inline text-orange-500" /> to sync word timing.
            </p>

            {clips.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="mt-3 text-muted-foreground">No clips available</p>
                <p className="text-sm text-muted-foreground">Generate audio first!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map(clip => (
                  <Card key={clip.id} className="bg-card/70">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Button
                          size="icon"
                          variant="default"
                          className="h-10 w-10 shrink-0"
                          onClick={() => handleOpenTeleprompter(clip)}
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{clip.title}</span>
                            {clip.transcript ? (
                              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600 shrink-0">
                                <Check className="h-3 w-3 mr-0.5" /> Synced
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-orange-500 shrink-0">
                                Not synced
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {countWords(clip.text)} words • {formatTime(clip.createdAt)}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 shrink-0 ${clip.transcript ? "text-green-600" : "text-orange-500"}`}
                          onClick={(e) => { e.stopPropagation(); generateTranscriptForClip(clip); }}
                          disabled={generatingTranscriptId === clip.id}
                        >
                          {generatingTranscriptId === clip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS VIEW */}
        {activeView === "settings" && (
          <div className="space-y-4">
            {/* API Keys Section */}
            <h2 className="font-semibold">API Keys</h2>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gemini API Key</Label>
                  <p className="text-xs text-muted-foreground">
                    For Gemini 2.5 Pro TTS. Get it from{" "}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener"
                      className="text-primary underline">Google AI Studio</a>
                  </p>
                  <Input
                    type="password"
                    placeholder="AIza..."
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                  />
                  {apiKeys.gemini && <Badge variant="secondary" className="text-xs">✓ Saved</Badge>}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Google Cloud API Key</Label>
                  <p className="text-xs text-muted-foreground">
                    For Chirp 3 HD TTS. Get it from{" "}
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener"
                      className="text-primary underline">Google Cloud Console</a>
                  </p>
                  <Input
                    type="password"
                    placeholder="AIza..."
                    value={apiKeys.gcloud}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, gcloud: e.target.value }))}
                  />
                  {apiKeys.gcloud && <Badge variant="secondary" className="text-xs">✓ Saved</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Teleprompter Settings */}
            <h2 className="font-semibold">Teleprompter</h2>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Font Size</Label>
                    <span className="text-sm text-muted-foreground">{settings.teleprompterFontSize}px</span>
                  </div>
                  <Slider
                    value={[settings.teleprompterFontSize]}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, teleprompterFontSize: v[0] }))}
                    min={16}
                    max={48}
                    step={2}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Scroll Speed</Label>
                    <span className="text-sm text-muted-foreground">{settings.teleprompterScrollSpeed}x</span>
                  </div>
                  <Slider
                    value={[settings.teleprompterScrollSpeed * 10]}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, teleprompterScrollSpeed: v[0] / 10 }))}
                    min={5}
                    max={20}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5x Slow</span>
                    <span>2x Fast</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Script Settings */}
            <h2 className="font-semibold">Script Processing</h2>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Word Limit</Label>
                    <p className="text-xs text-muted-foreground">Fixed at 500 words per chunk</p>
                  </div>
                  <Badge variant="secondary">500 words</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Long Text Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable to split text &gt;500 words</p>
                  </div>
                  <Switch
                    checked={settings.longTextMode}
                    onCheckedChange={(v) => setSettings(prev => ({ ...prev, longTextMode: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Note */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Data Storage</p>
                  <p>All data is stored locally on your device. API keys are only sent to Google's APIs.</p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setApiKeys({ gemini: "", gcloud: "" });
                setSettings(defaultSettings);
                toast({ title: "Reset", description: "All settings have been reset." });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset All Settings
            </Button>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-md grid grid-cols-4 py-2 pb-safe">
          <button onClick={() => setActiveView("generator")}
            className={`flex flex-col items-center py-2 touch-manipulation ${activeView === "generator" ? "text-primary" : "text-muted-foreground"}`}>
            <Wand2 className="h-5 w-5" />
            <span className="text-xs mt-1">Generate</span>
          </button>
          <button onClick={() => setActiveView("library")}
            className={`flex flex-col items-center py-2 relative touch-manipulation ${activeView === "library" ? "text-primary" : "text-muted-foreground"}`}>
            <AudioLines className="h-5 w-5" />
            <span className="text-xs mt-1">Library</span>
            {clips.length > 0 && (
              <span className="absolute top-1 right-1/4 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {clips.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveView("teleprompter")}
            className={`flex flex-col items-center py-2 touch-manipulation ${activeView === "teleprompter" ? "text-primary" : "text-muted-foreground"}`}>
            <BookOpen className="h-5 w-5" />
            <span className="text-xs mt-1">Teleprompter</span>
          </button>
          <button onClick={() => setActiveView("settings")}
            className={`flex flex-col items-center py-2 relative touch-manipulation ${activeView === "settings" ? "text-primary" : "text-muted-foreground"}`}>
            <Key className="h-5 w-5" />
            <span className="text-xs mt-1">Settings</span>
            {(!apiKeys.gemini || !apiKeys.gcloud) && (
              <span className="absolute top-1 right-1/4 bg-yellow-500 text-white text-xs rounded-full h-2 w-2" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
