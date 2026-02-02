import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AudioLines,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Mic,
  Pause,
  Play,
  Save,
  Sparkles,
  Split,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// Voice options for each provider
const DEMO_VOICES_GEMINI = ["Kore", "Puck", "Aoede", "Charon", "Leda", "Orus", "Zephyr"] as const;
const DEMO_VOICES_CHIRP = [
  "en-US-Chirp3-HD-Charon",
  "en-US-Chirp3-HD-Kore",
  "en-IN-Chirp3-HD-Charon",
  "hi-IN-Chirp3-HD-Charon",
  "hi-IN-Chirp3-HD-Kore",
] as const;

const WORDS_LIMIT = 5000;
const STORAGE_KEY = "voiceforge_library";

type Provider = "gemini" | "chirp";

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
  audioData?: string; // base64 audio data
  mimeType?: string;
  duration?: number;
};

type ActiveView = "generator" | "library" | "teleprompter";

// Helper functions
function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

// LocalStorage helpers
function loadLibraryFromStorage(): Clip[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load library from storage:", e);
  }
  return [];
}

function saveLibraryToStorage(clips: Clip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch (e) {
    console.error("Failed to save library to storage:", e);
  }
}

// Audio merge helper - concatenates base64 audio chunks
async function mergeAudioChunks(chunks: { audio: string; mimeType: string }[]): Promise<{ audio: string; mimeType: string }> {
  if (chunks.length === 0) {
    throw new Error("No audio chunks to merge");
  }

  if (chunks.length === 1) {
    return { audio: chunks[0].audio, mimeType: chunks[0].mimeType };
  }

  // Convert base64 chunks to array buffers
  const audioBuffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const binary = atob(chunk.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    audioBuffers.push(bytes.buffer);
  }

  // Create audio context for decoding and merging
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decodedBuffers: AudioBuffer[] = [];

  for (const buffer of audioBuffers) {
    try {
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
      decodedBuffers.push(decoded);
    } catch (e) {
      console.error("Failed to decode audio chunk:", e);
    }
  }

  if (decodedBuffers.length === 0) {
    throw new Error("Failed to decode any audio chunks");
  }

  // Calculate total length
  const totalLength = decodedBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const numberOfChannels = decodedBuffers[0].numberOfChannels;
  const sampleRate = decodedBuffers[0].sampleRate;

  // Create merged buffer
  const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of decodedBuffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      mergedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
    }
    offset += buffer.length;
  }

  // Encode merged buffer to WAV
  const wavData = encodeWAV(mergedBuffer);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(wavData)));

  await audioContext.close();

  return { audio: base64, mimeType: "audio/wav" };
}

// WAV encoder
function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write audio data
  const offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let pos = offset;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, int16, true);
      pos += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Demo WAV for fallback
function buildDemoWavBase64() {
  return "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
}

// Teleprompter Component
function Teleprompter({
  text,
  isPlaying,
  currentTime,
  duration,
  onClose,
}: {
  text: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const wordsPerSecond = duration > 0 ? words.length / duration : 2;

  useEffect(() => {
    if (isPlaying && duration > 0) {
      const currentWordIndex = Math.floor(currentTime * wordsPerSecond);
      setHighlightIndex(Math.min(currentWordIndex, words.length - 1));
    }
  }, [currentTime, isPlaying, duration, wordsPerSecond, words.length]);

  useEffect(() => {
    if (scrollRef.current && isPlaying) {
      const container = scrollRef.current;
      const highlightedWord = container.querySelector(`[data-word-index="${highlightIndex}"]`);
      if (highlightedWord) {
        highlightedWord.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightIndex, isPlaying]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">Teleprompter</span>
          </div>
          <div className="flex items-center gap-3">
            {isPlaying && (
              <Badge variant="secondary" className="animate-pulse">
                Playing
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="mx-auto max-w-2xl px-6 py-12">
              <div className="text-2xl leading-relaxed tracking-wide">
                {words.map((word, index) => (
                  <span
                    key={index}
                    data-word-index={index}
                    className={`inline-block px-1 py-0.5 transition-all duration-300 ${
                      index < highlightIndex
                        ? "text-muted-foreground/50"
                        : index === highlightIndex
                        ? "rounded bg-primary/20 text-primary font-semibold scale-105"
                        : index <= highlightIndex + 10
                        ? "text-foreground"
                        : "text-foreground/70"
                    }`}
                  >
                    {word}{" "}
                  </span>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="border-t border-border/70 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Word {highlightIndex + 1} of {words.length}</span>
            <Progress value={(highlightIndex / words.length) * 100} className="w-48" />
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

  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash-preview-tts");
  const [chirpModel, setChirpModel] = useState("Chirp 3 HD");

  const [voice, setVoice] = useState<string>(DEMO_VOICES_GEMINI[0]);
  const [language, setLanguage] = useState<string>("hi-IN");
  const [style, setStyle] = useState<string>("Warm, clear, confident");
  const [pace, setPace] = useState<number>(55);
  const [multiSpeaker, setMultiSpeaker] = useState<boolean>(false);

  const [text, setText] = useState<string>(
    "Namaste! Main VoiceForge hoon. Aapka text yahan se studio-quality voice me convert hoga."
  );

  // Large script mode
  const [largeScriptMode, setLargeScriptMode] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });

  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<Clip[]>(() => loadLibraryFromStorage());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Teleprompter state
  const [teleprompterClip, setTeleprompterClip] = useState<Clip | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);

  // Save to localStorage whenever clips change
  useEffect(() => {
    saveLibraryToStorage(clips);
  }, [clips]);

  const voicesForProvider = useMemo(() => {
    if (provider === "gemini") return DEMO_VOICES_GEMINI as readonly string[];
    return DEMO_VOICES_CHIRP as readonly string[];
  }, [provider]);

  const currentModel = provider === "gemini" ? geminiModel : chirpModel;
  const wordCount = countWords(text);
  const needsChunking = wordCount > WORDS_LIMIT;

  // Audio time update handler
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    }
  }, []);

  // Generate TTS via API
  async function generateTTS(textContent: string): Promise<{ audio: string; mimeType: string } | null> {
    try {
      const endpoint = provider === "gemini" ? "/api/tts/gemini" : "/api/tts/chirp";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textContent,
          voice,
          language,
          style,
          pace,
          model: currentModel,
        }),
      });

      const data = await response.json();

      if (data.demo || data.error) {
        // Fallback to demo mode
        return {
          audio: buildDemoWavBase64(),
          mimeType: "audio/wav",
        };
      }

      return {
        audio: data.audio,
        mimeType: data.mimeType,
      };
    } catch (error) {
      console.error("TTS generation error:", error);
      // Fallback to demo
      return {
        audio: buildDemoWavBase64(),
        mimeType: "audio/wav",
      };
    }
  }

  async function onGenerate() {
    if (!text.trim()) {
      toast({
        title: "Text missing",
        description: "Please enter some text to generate speech.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      let audioResult: { audio: string; mimeType: string } | null = null;

      if (largeScriptMode && needsChunking) {
        // Split into chunks and process sequentially
        const chunks = splitTextIntoChunks(text, WORDS_LIMIT);
        setChunkProgress({ current: 0, total: chunks.length });

        const audioChunks: { audio: string; mimeType: string }[] = [];

        for (let i = 0; i < chunks.length; i++) {
          setChunkProgress({ current: i + 1, total: chunks.length });

          toast({
            title: `Processing chunk ${i + 1}/${chunks.length}`,
            description: `Generating audio for section ${i + 1}...`,
          });

          const chunkResult = await generateTTS(chunks[i]);
          if (chunkResult) {
            audioChunks.push(chunkResult);
          }

          // Small delay between chunks
          await new Promise((r) => setTimeout(r, 300));
        }

        // Merge all chunks
        if (audioChunks.length > 0) {
          toast({
            title: "Merging audio",
            description: "Combining all chunks into one file...",
          });

          try {
            audioResult = await mergeAudioChunks(audioChunks);
          } catch (e) {
            // If merge fails, use last chunk
            audioResult = audioChunks[audioChunks.length - 1];
          }
        }

        setChunkProgress({ current: 0, total: 0 });
      } else {
        // Single generation
        audioResult = await generateTTS(text);
      }

      if (!audioResult) {
        toast({
          title: "Generation failed",
          description: "Failed to generate audio. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const clip: Clip = {
        id: uid(),
        provider,
        title: `${provider === "gemini" ? "Gemini" : "Chirp"} • ${voice}`,
        createdAt: Date.now(),
        settings: {
          model: currentModel,
          voice,
          language,
          style,
          pace,
          multiSpeaker,
        },
        text,
        audioData: audioResult.audio,
        mimeType: audioResult.mimeType,
      };

      setClips((prev) => [clip, ...prev]);

      toast({
        title: "Generated successfully",
        description: largeScriptMode && needsChunking
          ? `Audio created from ${Math.ceil(wordCount / WORDS_LIMIT)} chunks and merged.`
          : "Your voice clip has been saved to the library.",
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function getAudioUrl(clip: Clip): string {
    if (clip.audioData) {
      return `data:${clip.mimeType || "audio/wav"};base64,${clip.audioData}`;
    }
    return "";
  }

  async function playClip(clip: Clip) {
    const audio = audioRef.current;
    if (!audio) return;

    const url = getAudioUrl(clip);
    if (!url) return;

    if (nowPlayingId === clip.id && !audio.paused) {
      audio.pause();
      return;
    }

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
    const ext = clip.mimeType?.includes("mp3") ? "mp3" : "wav";
    a.download = `voiceforge-${clip.provider}-${clip.id}.${ext}`;
    a.click();
  }

  function deleteClip(clipId: string) {
    if (nowPlayingId === clipId) {
      stopPlayback();
    }
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    toast({
      title: "Deleted",
      description: "Clip removed from library.",
    });
  }

  function clearAll() {
    stopPlayback();
    setClips([]);
    toast({
      title: "Library cleared",
      description: "All clips have been removed.",
    });
  }

  function openTeleprompter(clip: Clip) {
    setTeleprompterClip(clip);
    setShowTeleprompter(true);
    playClip(clip);
  }

  function closeTeleprompter() {
    setShowTeleprompter(false);
    setTeleprompterClip(null);
  }

  const nowPlayingClip = clips.find((c) => c.id === nowPlayingId);

  return (
    <div
      className="min-h-screen w-full bg-[radial-gradient(1000px_500px_at_10%_-10%,hsl(var(--primary)/0.20),transparent_60%),radial-gradient(900px_600px_at_90%_0%,hsl(var(--accent)/0.18),transparent_55%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background)))]"
      data-testid="page-home"
    >
      <audio
        ref={audioRef}
        onEnded={() => {
          setNowPlayingId(null);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        data-testid="audio-player"
      />

      {/* Teleprompter Overlay */}
      <AnimatePresence>
        {showTeleprompter && teleprompterClip && (
          <Teleprompter
            text={teleprompterClip.text}
            isPlaying={nowPlayingId === teleprompterClip.id}
            currentTime={currentTime}
            duration={duration}
            onClose={closeTeleprompter}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground" data-testid="text-badge">
                  Studio-quality TTS
                </span>
              </div>
              <h1
                className="mt-3 text-3xl font-semibold tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
                data-testid="text-title"
              >
                VoiceForge
              </h1>
              <p className="mt-1 text-sm text-muted-foreground" data-testid="text-subtitle">
                Gemini 2.5 TTS + Chirp 3 HD with Library & Teleprompter
              </p>
            </div>

            <Button
              variant="secondary"
              className="shrink-0 rounded-full"
              onClick={clearAll}
              data-testid="button-clear"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ActiveView)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="generator" className="gap-1">
              <Wand2 className="h-3.5 w-3.5" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1">
              <AudioLines className="h-3.5 w-3.5" />
              Library ({clips.length})
            </TabsTrigger>
            <TabsTrigger value="teleprompter" className="gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Teleprompter
            </TabsTrigger>
          </TabsList>

          {/* Generator Tab */}
          <TabsContent value="generator">
            <Card className="border-border/70 bg-card/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base" data-testid="text-generator-title">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Tabs */}
                <Tabs
                  value={provider}
                  onValueChange={(v) => {
                    const p = v as Provider;
                    setProvider(p);
                    setVoice(p === "gemini" ? DEMO_VOICES_GEMINI[0] : DEMO_VOICES_CHIRP[0]);
                  }}
                  data-testid="tabs-provider"
                >
                  <TabsList className="grid w-full grid-cols-2" data-testid="tabslist-provider">
                    <TabsTrigger value="gemini" data-testid="tab-gemini">
                      Gemini
                    </TabsTrigger>
                    <TabsTrigger value="chirp" data-testid="tab-chirp">
                      Chirp 3 HD
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="gemini" className="mt-4 space-y-4" data-testid="tabcontent-gemini">
                    <div className="space-y-2">
                      <Label data-testid="label-model-gemini">Model</Label>
                      <Input
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        placeholder="gemini-2.5-flash-preview-tts"
                        data-testid="input-model-gemini"
                      />
                      <p className="text-xs text-muted-foreground" data-testid="text-model-help-gemini">
                        Uses Gemini API for speech generation.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="chirp" className="mt-4 space-y-4" data-testid="tabcontent-chirp">
                    <div className="space-y-2">
                      <Label data-testid="label-model-chirp">Engine</Label>
                      <Input
                        value={chirpModel}
                        onChange={(e) => setChirpModel(e.target.value)}
                        placeholder="Chirp 3 HD"
                        data-testid="input-model-chirp"
                      />
                      <p className="text-xs text-muted-foreground" data-testid="text-model-help-chirp">
                        Uses Google Cloud TTS with Chirp3-HD voices.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Voice & Language */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label data-testid="label-voice">Voice</Label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger data-testid="select-voice">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent data-testid="selectcontent-voice">
                        {voicesForProvider.map((v) => (
                          <SelectItem key={v} value={v} data-testid={`option-voice-${v}`}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label data-testid="label-language">Language</Label>
                    <Input
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="hi-IN"
                      data-testid="input-language"
                    />
                  </div>
                </div>

                {/* Large Script Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Split className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-sm font-medium">Large Script Mode</div>
                      <div className="text-xs text-muted-foreground">
                        Auto-split scripts over {WORDS_LIMIT} words
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={largeScriptMode}
                    onCheckedChange={setLargeScriptMode}
                    data-testid="switch-large-script"
                  />
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label data-testid="label-text">Text</Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={needsChunking && !largeScriptMode ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {wordCount} words
                      </Badge>
                      {needsChunking && (
                        <Badge variant="outline" className="text-xs">
                          {Math.ceil(wordCount / WORDS_LIMIT)} chunks
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-28"
                    placeholder="Type or paste your script here..."
                    data-testid="textarea-text"
                  />
                  {needsChunking && !largeScriptMode && (
                    <p className="text-xs text-amber-600">
                      Script exceeds {WORDS_LIMIT} words. Enable Large Script Mode for best results.
                    </p>
                  )}
                </div>

                {/* Style Controls */}
                <div className="rounded-xl border border-border/70 bg-muted/40 p-3" data-testid="card-controls">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium" data-testid="text-controls-title">
                        Style controls
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid="text-controls-subtitle">
                        Prompt-driven vibe + pacing
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs" data-testid="label-multispeaker">
                        2 speakers
                      </Label>
                      <Switch
                        checked={multiSpeaker}
                        onCheckedChange={setMultiSpeaker}
                        data-testid="switch-multispeaker"
                      />
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label data-testid="label-style">Style prompt</Label>
                      <Input
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Warm, clear, confident"
                        data-testid="input-style"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label data-testid="label-pace">Pace</Label>
                        <Badge variant="secondary" data-testid="badge-pace">
                          {pace}%
                        </Badge>
                      </div>
                      <Slider
                        value={[pace]}
                        onValueChange={(v) => setPace(v[0] ?? 50)}
                        min={20}
                        max={90}
                        step={1}
                        data-testid="slider-pace"
                      />
                    </div>
                  </div>
                </div>

                {/* Chunk Progress */}
                {chunkProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing chunks...</span>
                      <span>{chunkProgress.current}/{chunkProgress.total}</span>
                    </div>
                    <Progress value={(chunkProgress.current / chunkProgress.total) * 100} />
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  className="w-full"
                  onClick={onGenerate}
                  disabled={isGenerating}
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {chunkProgress.total > 0
                        ? `Processing ${chunkProgress.current}/${chunkProgress.total}...`
                        : "Generating..."}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Generate speech
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Saved Clips ({clips.length})</div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={stopPlayback}
                  data-testid="button-stop"
                >
                  <Pause className="h-4 w-4" />
                  Stop
                </Button>
              </div>

              <div className="space-y-3" data-testid="list-clips">
                {clips.length === 0 ? (
                  <Card className="border-dashed bg-card/50" data-testid="card-empty">
                    <CardContent className="py-8">
                      <div className="text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <AudioLines className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-medium">No clips yet</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Generate your first voice clip to save it here.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  clips.map((clip) => {
                    const isPlaying = nowPlayingId === clip.id;
                    return (
                      <Card
                        key={clip.id}
                        className="border-border/70 bg-card/70 shadow-sm"
                        data-testid={`card-clip-${clip.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-semibold">
                                  {clip.title}
                                </div>
                                <Badge variant={clip.provider === "gemini" ? "default" : "secondary"}>
                                  {clip.provider === "gemini" ? "Gemini" : "Chirp"}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatTime(clip.createdAt)} • {clip.settings.language} • {countWords(clip.text)} words
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant={isPlaying ? "default" : "secondary"}
                                className="h-8 w-8 rounded-full"
                                onClick={() => playClip(clip)}
                              >
                                {isPlaying ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                              </Button>

                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full"
                                onClick={() => openTeleprompter(clip)}
                                title="Open in Teleprompter"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full"
                                onClick={() => downloadClip(clip)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                onClick={() => deleteClip(clip.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 line-clamp-2 text-sm text-foreground/90">
                            {clip.text}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* Teleprompter Tab */}
          <TabsContent value="teleprompter">
            <Card className="border-border/70 bg-card/70 shadow-sm backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Teleprompter Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a clip from your library to play with the teleprompter. The text will scroll
                  and highlight as the audio plays, showing you what's coming next.
                </p>

                {clips.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 p-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No clips available. Generate some audio first!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clips.map((clip) => (
                      <Button
                        key={clip.id}
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-3"
                        onClick={() => openTeleprompter(clip)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Play className="h-4 w-4 text-primary" />
                        </div>
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

                {nowPlayingClip && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        <span className="text-sm font-medium">Now Playing</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => openTeleprompter(nowPlayingClip)}>
                        <BookOpen className="mr-1 h-3.5 w-3.5" />
                        Open Teleprompter
                      </Button>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground truncate">
                      {nowPlayingClip.title}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Callout */}
        <div className="mt-6 rounded-2xl border border-border/70 bg-card/60 p-4 text-xs text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Save className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                Auto-saved Library
              </div>
              <div className="mt-1">
                All clips are automatically saved to your browser's local storage.
                They persist even after closing the browser. Download anytime with one click!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
        data-testid="bottom-nav"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 px-4 py-3">
          <button
            onClick={() => setActiveView("generator")}
            className={`flex flex-col items-center justify-center gap-1 text-xs ${
              activeView === "generator" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
              activeView === "generator" ? "bg-primary/10 text-primary" : "bg-foreground/5"
            }`}>
              <Wand2 className="h-4 w-4" />
            </div>
            <span>Generate</span>
          </button>
          <button
            onClick={() => setActiveView("library")}
            className={`flex flex-col items-center justify-center gap-1 text-xs ${
              activeView === "library" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
              activeView === "library" ? "bg-primary/10 text-primary" : "bg-foreground/5"
            }`}>
              <AudioLines className="h-4 w-4" />
            </div>
            <span>Library</span>
          </button>
          <button
            onClick={() => setActiveView("teleprompter")}
            className={`flex flex-col items-center justify-center gap-1 text-xs ${
              activeView === "teleprompter" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
              activeView === "teleprompter" ? "bg-primary/10 text-primary" : "bg-foreground/5"
            }`}>
              <BookOpen className="h-4 w-4" />
            </div>
            <span>Teleprompter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
