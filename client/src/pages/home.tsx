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
  Pause,
  Play,
  RefreshCw,
  Settings,
  Split,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wand2,
  X,
  AlertCircle,
  Key,
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

function loadLibraryFromStorage(): Clip[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Load failed:", e);
  }
  return [];
}

function saveLibraryToStorage(clips: Clip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch (e) {
    console.error("Save failed:", e);
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
  languageCode: string
): Promise<WordTimestamp[]> {
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
          encoding: "LINEAR16",
          sampleRateHertz: 24000,
          languageCode: languageCode,
          enableWordTimeOffsets: true,
          model: "default"
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

  if (data.results) {
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

  const audioBuffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const binary = atob(chunk.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    audioBuffers.push(bytes.buffer);
  }

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decodedBuffers: AudioBuffer[] = [];

  for (const buffer of audioBuffers) {
    try {
      decodedBuffers.push(await audioContext.decodeAudioData(buffer.slice(0)));
    } catch (e) {
      console.error("Decode error:", e);
    }
  }

  if (decodedBuffers.length === 0) throw new Error("Decode failed");

  const totalLength = decodedBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const { numberOfChannels, sampleRate } = decodedBuffers[0];
  const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of decodedBuffers) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      mergedBuffer.getChannelData(ch).set(buffer.getChannelData(ch), offset);
    }
    offset += buffer.length;
  }

  const wavData = encodeWAV(mergedBuffer);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(wavData)));
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Use transcript words if available, otherwise split text
  const words = useMemo(() => {
    if (transcript && transcript.length > 0) {
      return transcript.map(t => t.word);
    }
    return text.split(/\s+/).filter(Boolean);
  }, [text, transcript]);

  // Calculate highlight index based on transcript timestamps or estimated timing
  useEffect(() => {
    if (!isPlaying) return;

    if (transcript && transcript.length > 0) {
      // Use precise timestamps from transcript
      const idx = transcript.findIndex(t => currentTime >= t.startTime && currentTime < t.endTime);
      if (idx >= 0) {
        setHighlightIndex(idx);
      } else if (currentTime >= (transcript[transcript.length - 1]?.endTime || 0)) {
        setHighlightIndex(transcript.length - 1);
      }
    } else if (duration > 0) {
      // Fallback: estimate based on duration
      const wordsPerSecond = (words.length / duration) * scrollSpeed;
      setHighlightIndex(Math.min(Math.floor(currentTime * wordsPerSecond), words.length - 1));
    }
  }, [currentTime, isPlaying, duration, scrollSpeed, words.length, transcript]);

  useEffect(() => {
    if (scrollRef.current && isPlaying) {
      const el = scrollRef.current.querySelector(`[data-word-index="${highlightIndex}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightIndex, isPlaying]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">Teleprompter</span>
          </div>
          <div className="flex items-center gap-3">
            {transcript && <Badge variant="outline" className="text-xs">Synced</Badge>}
            {isPlaying && <Badge variant="secondary" className="animate-pulse">Playing</Badge>}
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </div>
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="mx-auto max-w-2xl px-6 py-12">
            <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
              {words.map((word, i) => (
                <span key={i} data-word-index={i}
                  className={`inline-block px-1 py-0.5 transition-all ${
                    i < highlightIndex ? "text-muted-foreground/40"
                    : i === highlightIndex ? "rounded bg-primary/20 text-primary font-semibold scale-105"
                    : i <= highlightIndex + 10 ? "text-foreground" : "text-foreground/60"
                  }`}>{word} </span>
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Word {highlightIndex + 1} / {words.length}</span>
            <Progress value={(highlightIndex / words.length) * 100} className="w-40" />
            <span>{Math.round((highlightIndex / words.length) * 100)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { toast } = useToast();
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
      const audioChunks = chunkStatuses.map(s => s.audio!);
      let audioResult: { audio: string; mimeType: string };

      if (audioChunks.length === 1) {
        audioResult = audioChunks[0];
      } else {
        try {
          audioResult = await mergeAudioChunks(audioChunks);
        } catch {
          audioResult = audioChunks[audioChunks.length - 1];
        }
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
      toast({ title: "Saved!", description: "Audio merged and saved to library." });
      setShowProcessingPanel(false);
      setChunkStatuses([]);
    } finally {
      setIsGenerating(false);
    }
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
        status: "pending"
      }));
      setChunkStatuses(initialStatuses);
      setShowProcessingPanel(true);

      // Process all chunks
      for (let i = 0; i < chunks.length; i++) {
        await generateChunk(chunks[i], i);
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      setIsGenerating(false);

      // Check if all completed
      const allDone = chunkStatuses.every(s => s.status === "completed");
      if (allDone) {
        // Auto-merge will happen in finalizeMerge
      }
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
    if (nowPlayingId === clip.id && !audio.paused) { audio.pause(); return; }
    audio.src = url;
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

  function downloadClip(clip: Clip) {
    const url = getAudioUrl(clip);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clip.title}-${clip.id}.wav`;
    a.click();
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

    setGeneratingTranscriptId(clip.id);
    try {
      const transcript = await getTranscriptWithTimestamps(
        apiKeys.gcloud,
        clip.audioData,
        clip.settings.language || "en-US"
      );

      // Update clip with transcript
      setClips(prev => prev.map(c =>
        c.id === clip.id ? { ...c, transcript } : c
      ));

      toast({ title: "Transcript Generated!", description: `${transcript.length} words with timestamps saved.` });
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
    <div className="min-h-screen w-full bg-background pb-20">
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

                  {/* Merge button when all complete */}
                  {chunkStatuses.every(s => s.status === "completed") && (
                    <Button className="w-full" onClick={finalizeMerge} disabled={isGenerating}>
                      {isGenerating ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Merging...</>
                      ) : (
                        <><AudioLines className="h-4 w-4 mr-2" />Merge & Save to Library</>
                      )}
                    </Button>
                  )}

                  {/* Cancel button */}
                  <Button variant="outline" className="w-full" onClick={() => {
                    setShowProcessingPanel(false);
                    setChunkStatuses([]);
                  }}>
                    <X className="h-4 w-4 mr-2" /> Cancel
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Library ({clips.length})</h2>
              {nowPlayingId && (
                <Button variant="outline" size="sm" onClick={stopPlayback}>
                  <Pause className="h-4 w-4 mr-1" /> Stop
                </Button>
              )}
            </div>

            {clips.length === 0 ? (
              <div className="text-center py-12">
                <AudioLines className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="mt-3 text-muted-foreground">No clips yet</p>
                <p className="text-sm text-muted-foreground">Generate your first audio!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map(clip => {
                  const isPlaying = nowPlayingId === clip.id;
                  return (
                    <Card key={clip.id} className="bg-card/70">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{clip.title}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {clip.provider === "gemini" ? "Gemini" : "Chirp"}
                              </Badge>
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
                              onClick={() => playClip(clip)}>
                              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenTeleprompter(clip)}>
                              <BookOpen className="h-4 w-4" />
                            </Button>
                            {/* Generate Transcript Button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-8 w-8 ${clip.transcript ? "text-green-600" : "text-orange-500"}`}
                              onClick={() => generateTranscriptForClip(clip)}
                              disabled={generatingTranscriptId === clip.id}
                            >
                              {generatingTranscriptId === clip.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadClip(clip)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteClip(clip.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{clip.text}</p>
                      </CardContent>
                    </Card>
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
              Select a clip. Click <RefreshCw className="h-3 w-3 inline" /> to sync word timing.
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
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md grid grid-cols-4 py-2">
          <button onClick={() => setActiveView("generator")}
            className={`flex flex-col items-center py-2 ${activeView === "generator" ? "text-primary" : "text-muted-foreground"}`}>
            <Wand2 className="h-5 w-5" />
            <span className="text-xs mt-1">Generate</span>
          </button>
          <button onClick={() => setActiveView("library")}
            className={`flex flex-col items-center py-2 relative ${activeView === "library" ? "text-primary" : "text-muted-foreground"}`}>
            <AudioLines className="h-5 w-5" />
            <span className="text-xs mt-1">Library</span>
            {clips.length > 0 && (
              <span className="absolute top-1 right-1/4 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {clips.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveView("teleprompter")}
            className={`flex flex-col items-center py-2 ${activeView === "teleprompter" ? "text-primary" : "text-muted-foreground"}`}>
            <BookOpen className="h-5 w-5" />
            <span className="text-xs mt-1">Teleprompter</span>
          </button>
          <button onClick={() => setActiveView("settings")}
            className={`flex flex-col items-center py-2 relative ${activeView === "settings" ? "text-primary" : "text-muted-foreground"}`}>
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
