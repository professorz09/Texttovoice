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
  Settings,
  Split,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Fixed model names (not editable)
const GEMINI_MODEL = "gemini-2.5-pro-preview-tts";
const CHIRP_MODEL = "chirp3-hd";

// Voice options for each provider
const VOICES_GEMINI = ["Kore", "Puck", "Aoede", "Charon", "Leda", "Orus", "Zephyr"] as const;
const VOICES_CHIRP = [
  "en-US-Chirp3-HD-Charon",
  "en-US-Chirp3-HD-Kore",
  "hi-IN-Chirp3-HD-Charon",
  "hi-IN-Chirp3-HD-Kore",
] as const;

// Language options (only English and Hindi)
const LANGUAGES = [
  { code: "en-US", name: "English" },
  { code: "hi-IN", name: "Hindi" },
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
  audioData?: string;
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

// Audio merge helper
async function mergeAudioChunks(chunks: { audio: string; mimeType: string }[]): Promise<{ audio: string; mimeType: string }> {
  if (chunks.length === 0) throw new Error("No audio chunks to merge");
  if (chunks.length === 1) return { audio: chunks[0].audio, mimeType: chunks[0].mimeType };

  const audioBuffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const binary = atob(chunk.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    audioBuffers.push(bytes.buffer);
  }

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

  if (decodedBuffers.length === 0) throw new Error("Failed to decode any audio chunks");

  const totalLength = decodedBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const numberOfChannels = decodedBuffers[0].numberOfChannels;
  const sampleRate = decodedBuffers[0].sampleRate;

  const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of decodedBuffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      mergedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
    }
    offset += buffer.length;
  }

  const wavData = encodeWAV(mergedBuffer);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(wavData)));
  await audioContext.close();

  return { audio: base64, mimeType: "audio/wav" };
}

function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let pos = 44;
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

  const [voice, setVoice] = useState<string>(VOICES_GEMINI[0]);
  const [language, setLanguage] = useState<string>("en-US"); // English default
  const [style, setStyle] = useState<string>("Warm, clear, confident");
  const [pace, setPace] = useState<number>(55);
  const [multiSpeaker, setMultiSpeaker] = useState<boolean>(false);

  // Advanced settings toggle (default off)
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [text, setText] = useState<string>("");

  // Large script mode
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

  useEffect(() => {
    saveLibraryToStorage(clips);
  }, [clips]);

  const voicesForProvider = useMemo(() => {
    if (provider === "gemini") return VOICES_GEMINI as readonly string[];
    return VOICES_CHIRP as readonly string[];
  }, [provider]);

  const currentModel = provider === "gemini" ? GEMINI_MODEL : CHIRP_MODEL;
  const wordCount = countWords(text);
  const needsChunking = wordCount > WORDS_LIMIT;

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    }
  }, []);

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
        const chunks = splitTextIntoChunks(text, WORDS_LIMIT);
        setChunkProgress({ current: 0, total: chunks.length });

        const audioChunks: { audio: string; mimeType: string }[] = [];

        for (let i = 0; i < chunks.length; i++) {
          setChunkProgress({ current: i + 1, total: chunks.length });

          toast({
            title: `Processing ${i + 1}/${chunks.length}`,
            description: `Generating audio for section ${i + 1}...`,
          });

          const chunkResult = await generateTTS(chunks[i]);
          if (chunkResult) {
            audioChunks.push(chunkResult);
          }

          await new Promise((r) => setTimeout(r, 300));
        }

        if (audioChunks.length > 0) {
          toast({
            title: "Merging audio",
            description: "Combining all chunks...",
          });

          try {
            audioResult = await mergeAudioChunks(audioChunks);
          } catch (e) {
            audioResult = audioChunks[audioChunks.length - 1];
          }
        }

        setChunkProgress({ current: 0, total: 0 });
      } else {
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
        title: "Saved to library",
        description: "Your voice clip is ready!",
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate speech.",
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
      description: "Clip removed.",
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

      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
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
              <CardContent className="pt-4 space-y-4">
                {/* Provider Tabs */}
                <Tabs
                  value={provider}
                  onValueChange={(v) => {
                    const p = v as Provider;
                    setProvider(p);
                    setVoice(p === "gemini" ? VOICES_GEMINI[0] : VOICES_CHIRP[0]);
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gemini">Gemini 2.5 Pro</TabsTrigger>
                    <TabsTrigger value="chirp">Chirp 3 HD</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Voice & Language */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Voice</Label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voicesForProvider.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  />
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Text</Label>
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
                    className="min-h-32"
                    placeholder="Type or paste your script here..."
                  />
                  {needsChunking && !largeScriptMode && (
                    <p className="text-xs text-amber-600">
                      Enable Large Script Mode for scripts over {WORDS_LIMIT} words.
                    </p>
                  )}
                </div>

                {/* Advanced Settings Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <div className="text-sm font-medium">Advanced Settings</div>
                  </div>
                  <Switch
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                  />
                </div>

                {/* Advanced Style Controls (only shown when toggle is on) */}
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-3"
                  >
                    <div className="space-y-2">
                      <Label>Style prompt</Label>
                      <Input
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Warm, clear, confident"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Pace</Label>
                        <Badge variant="secondary">{pace}%</Badge>
                      </div>
                      <Slider
                        value={[pace]}
                        onValueChange={(v) => setPace(v[0] ?? 50)}
                        min={20}
                        max={90}
                        step={1}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">2 Speakers Mode</Label>
                      <Switch
                        checked={multiSpeaker}
                        onCheckedChange={setMultiSpeaker}
                      />
                    </div>
                  </motion.div>
                )}

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
                      Generate Speech
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
                >
                  <Pause className="h-4 w-4" />
                  Stop
                </Button>
              </div>

              <div className="space-y-3">
                {clips.length === 0 ? (
                  <Card className="border-dashed bg-card/50">
                    <CardContent className="py-8">
                      <div className="text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <AudioLines className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-medium">No clips yet</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Generate your first voice clip.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  clips.map((clip) => {
                    const isPlaying = nowPlayingId === clip.id;
                    return (
                      <Card key={clip.id} className="border-border/70 bg-card/70 shadow-sm">
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
                                {formatTime(clip.createdAt)} • {clip.settings.language === "en-US" ? "English" : "Hindi"} • {countWords(clip.text)} words
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant={isPlaying ? "default" : "secondary"}
                                className="h-8 w-8 rounded-full"
                                onClick={() => playClip(clip)}
                              >
                                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                              </Button>

                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full"
                                onClick={() => openTeleprompter(clip)}
                                title="Teleprompter"
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
                  Teleprompter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a clip to play with teleprompter. Text highlights as audio plays.
                </p>

                {clips.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 p-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No clips available. Generate audio first!
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
                        Open
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
      </div>

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
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
