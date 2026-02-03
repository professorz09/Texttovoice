import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AudioLines,
  BookOpen,
  Download,
  FileText,
  Loader2,
  Mic,
  Pause,
  Play,
  Settings,
  Split,
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

// Models
const GEMINI_MODEL = "gemini-2.5-pro-preview-tts";
const CHIRP_MODEL = "chirp3-hd";

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

const WORDS_LIMIT = 5000;
const STORAGE_KEY = "voiceforge_library";

type Provider = "gemini" | "chirp";
type ActiveView = "generator" | "library" | "teleprompter" | "settings";

type ApiKeys = {
  gemini: string;
  gcloud: string;
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

function splitTextIntoChunks(text: string, maxWords: number): string[] {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
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

// Direct Gemini TTS API call
async function callGeminiTTS(
  apiKey: string,
  text: string,
  voice: string,
  language: string
): Promise<{ audio: string; mimeType: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice }
            }
          }
        }
      })
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

function Teleprompter({ text, isPlaying, currentTime, duration, onClose }: {
  text: string; isPlaying: boolean; currentTime: number; duration: number; onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const wordsPerSecond = duration > 0 ? words.length / duration : 2;

  useEffect(() => {
    if (isPlaying && duration > 0) {
      setHighlightIndex(Math.min(Math.floor(currentTime * wordsPerSecond), words.length - 1));
    }
  }, [currentTime, isPlaying, duration, wordsPerSecond, words.length]);

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
            {isPlaying && <Badge variant="secondary" className="animate-pulse">Playing</Badge>}
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </div>
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="mx-auto max-w-2xl px-6 py-12">
            <div className="text-2xl leading-relaxed">
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
  const [voice, setVoice] = useState<string>("Kore");
  const [chirpVoice, setChirpVoice] = useState<string>("Kore");
  const [language, setLanguage] = useState<string>("en-US");
  const [style, setStyle] = useState<string>("Warm, clear, confident");
  const [pace, setPace] = useState<number>(55);
  const [multiSpeaker, setMultiSpeaker] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [text, setText] = useState<string>("");
  const [largeScriptMode, setLargeScriptMode] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<Clip[]>(() => loadLibraryFromStorage());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [teleprompterClip, setTeleprompterClip] = useState<Clip | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => loadApiKeys());

  useEffect(() => { saveLibraryToStorage(clips); }, [clips]);
  useEffect(() => { saveApiKeys(apiKeys); }, [apiKeys]);

  const currentModel = provider === "gemini" ? GEMINI_MODEL : CHIRP_MODEL;
  const wordCount = countWords(text);
  const needsChunking = wordCount > WORDS_LIMIT;
  const currentVoice = provider === "gemini" ? voice : chirpVoice;

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
        return await callGeminiTTS(apiKeys.gemini, textContent, voice, language);
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

  async function onGenerate() {
    if (!text.trim()) {
      toast({ title: "Text required", description: "Enter text to generate speech." });
      return;
    }

    setIsGenerating(true);
    try {
      let audioResult: { audio: string; mimeType: string } | null = null;

      if (largeScriptMode && needsChunking) {
        const chunks = splitTextIntoChunks(text, WORDS_LIMIT);
        setChunkProgress({ current: 0, total: chunks.length });
        const audioChunks: { audio: string; mimeType: string }[] = [];

        for (let i = 0; i < chunks.length; i++) {
          setChunkProgress({ current: i + 1, total: chunks.length });
          const result = await generateTTS(chunks[i]);
          if (!result) {
            setChunkProgress({ current: 0, total: 0 });
            return; // Stop if any chunk fails
          }
          audioChunks.push(result);
          await new Promise(r => setTimeout(r, 300));
        }

        if (audioChunks.length > 0) {
          try { audioResult = await mergeAudioChunks(audioChunks); }
          catch { audioResult = audioChunks[audioChunks.length - 1]; }
        }
        setChunkProgress({ current: 0, total: 0 });
      } else {
        audioResult = await generateTTS(text);
      }

      // Only save if we got real audio
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
              setVoice(p === "gemini" ? "Kore" : "en-US-Chirp3-HD-Charon");
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gemini">Gemini 2.5 Pro</TabsTrigger>
                <TabsTrigger value="chirp">Chirp 3 HD</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Voice</Label>
                {provider === "gemini" ? (
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOICES_GEMINI.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.name} <span className="text-muted-foreground">• {v.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={chirpVoice} onValueChange={setChirpVoice}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHIRP_VOICE_NAMES.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.name} <span className="text-muted-foreground">• {v.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(provider === "chirp" ? CHIRP_LANGUAGES : LANGUAGES).map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Script</Label>
                <Badge variant="secondary" className="text-xs">{wordCount} words</Badge>
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)}
                className="min-h-36 resize-none" placeholder="Enter your text here..." />
            </div>

            {needsChunking && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Split className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Large Script</div>
                    <div className="text-xs text-muted-foreground">{Math.ceil(wordCount / WORDS_LIMIT)} chunks</div>
                  </div>
                </div>
                <Switch checked={largeScriptMode} onCheckedChange={setLargeScriptMode} />
              </div>
            )}

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
                <div className="flex items-center justify-between">
                  <Label className="text-xs">2 Speakers</Label>
                  <Switch checked={multiSpeaker} onCheckedChange={setMultiSpeaker} />
                </div>
              </motion.div>
            )}

            {chunkProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{chunkProgress.current}/{chunkProgress.total}</span>
                </div>
                <Progress value={(chunkProgress.current / chunkProgress.total) * 100} />
              </div>
            )}

            <Button className="w-full h-12 text-base" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" />Generating...</>
              ) : (
                <><Mic className="h-5 w-5 mr-2" />Generate Speech</>
              )}
            </Button>
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
            <p className="text-sm text-muted-foreground">Select a clip to play with teleprompter</p>

            {clips.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="mt-3 text-muted-foreground">No clips available</p>
                <p className="text-sm text-muted-foreground">Generate audio first!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map(clip => (
                  <Button key={clip.id} variant="outline" className="w-full justify-start h-auto py-3"
                    onClick={() => handleOpenTeleprompter(clip)}>
                    <Play className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">{clip.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {countWords(clip.text)} words • {formatTime(clip.createdAt)}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS VIEW */}
        {activeView === "settings" && (
          <div className="space-y-4">
            <h2 className="font-semibold">API Settings</h2>
            <p className="text-sm text-muted-foreground">
              Enter your API keys. Keys are stored locally on your device.
            </p>

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
                  {apiKeys.gemini && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ Key saved
                    </Badge>
                  )}
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
                  {apiKeys.gcloud && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ Key saved
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Security Note</p>
                  <p>API keys are stored in your browser's local storage and never sent to any server except Google's APIs.</p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setApiKeys({ gemini: "", gcloud: "" });
                toast({ title: "Keys cleared", description: "All API keys have been removed." });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Keys
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
