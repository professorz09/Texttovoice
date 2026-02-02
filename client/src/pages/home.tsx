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

// Fixed model names
const GEMINI_MODEL = "gemini-2.5-pro-preview-tts";
const CHIRP_MODEL = "chirp3-hd";

// All 30 Gemini 2.5 Pro voices
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

// Chirp 3 HD voices
const VOICES_CHIRP = [
  { name: "en-US-Chirp3-HD-Charon", desc: "English" },
  { name: "en-US-Chirp3-HD-Kore", desc: "English" },
  { name: "hi-IN-Chirp3-HD-Charon", desc: "Hindi" },
  { name: "hi-IN-Chirp3-HD-Kore", desc: "Hindi" },
] as const;

// Language options
const LANGUAGES = [
  { code: "en-US", name: "English" },
  { code: "hi-IN", name: "Hindi" },
] as const;

const WORDS_LIMIT = 5000;
const STORAGE_KEY = "voiceforge_library";

type Provider = "gemini" | "chirp";
type ActiveView = "generator" | "library" | "teleprompter";

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

function loadLibraryFromStorage(): Clip[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load library:", e);
  }
  return [];
}

function saveLibraryToStorage(clips: Clip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch (e) {
    console.error("Failed to save library:", e);
  }
}

async function mergeAudioChunks(chunks: { audio: string; mimeType: string }[]): Promise<{ audio: string; mimeType: string }> {
  if (chunks.length === 0) throw new Error("No audio chunks");
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
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
      decodedBuffers.push(decoded);
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

function buildDemoWavBase64() {
  return "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
}

// Teleprompter Overlay
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

  useEffect(() => { saveLibraryToStorage(clips); }, [clips]);

  const voicesForProvider = useMemo(() =>
    provider === "gemini" ? VOICES_GEMINI : VOICES_CHIRP, [provider]);

  const currentModel = provider === "gemini" ? GEMINI_MODEL : CHIRP_MODEL;
  const wordCount = countWords(text);
  const needsChunking = wordCount > WORDS_LIMIT;

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { setCurrentTime(audio.currentTime); setDuration(audio.duration || 0); }
  }, []);

  async function generateTTS(textContent: string): Promise<{ audio: string; mimeType: string } | null> {
    try {
      const endpoint = provider === "gemini" ? "/api/tts/gemini" : "/api/tts/chirp";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textContent, voice, language, style, pace, model: currentModel }),
      });
      const data = await response.json();
      if (data.demo || data.error) return { audio: buildDemoWavBase64(), mimeType: "audio/wav" };
      return { audio: data.audio, mimeType: data.mimeType };
    } catch {
      return { audio: buildDemoWavBase64(), mimeType: "audio/wav" };
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
          if (result) audioChunks.push(result);
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

      if (!audioResult) {
        toast({ title: "Failed", description: "Could not generate audio.", variant: "destructive" });
        return;
      }

      const clip: Clip = {
        id: uid(),
        provider,
        title: `${voice}`,
        createdAt: Date.now(),
        settings: { model: currentModel, voice, language, style, pace, multiSpeaker },
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

  function openTeleprompter(clip: Clip) {
    setTeleprompterClip(clip);
    setShowTeleprompter(true);
    playClip(clip);
  }

  // Render clip card
  const ClipCard = ({ clip }: { clip: Clip }) => {
    const isPlaying = nowPlayingId === clip.id;
    return (
      <Card className="bg-card/70">
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
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openTeleprompter(clip)}>
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
  };

  return (
    <div className="min-h-screen w-full bg-background pb-20">
      <audio ref={audioRef} onEnded={() => { setNowPlayingId(null); setCurrentTime(0); }} onTimeUpdate={handleTimeUpdate} />

      <AnimatePresence>
        {showTeleprompter && teleprompterClip && (
          <Teleprompter text={teleprompterClip.text} isPlaying={nowPlayingId === teleprompterClip.id}
            currentTime={currentTime} duration={duration} onClose={() => setShowTeleprompter(false)} />
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-md px-4 pt-4">
        {/* Generator View */}
        {activeView === "generator" && (
          <div className="space-y-4">
            {/* Provider Switch */}
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

            {/* Voice & Language */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voicesForProvider.map((v) => (
                      <SelectItem key={v.name} value={v.name}>
                        {v.name} <span className="text-muted-foreground">• {v.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Script</Label>
                <Badge variant="secondary" className="text-xs">{wordCount} words</Badge>
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)}
                className="min-h-36 resize-none" placeholder="Enter your text here..." />
            </div>

            {/* Large Script Mode */}
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

            {/* Advanced Settings */}
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

            {/* Progress */}
            {chunkProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{chunkProgress.current}/{chunkProgress.total}</span>
                </div>
                <Progress value={(chunkProgress.current / chunkProgress.total) * 100} />
              </div>
            )}

            {/* Generate Button */}
            <Button className="w-full h-12 text-base" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" />Generating...</>
              ) : (
                <><Mic className="h-5 w-5 mr-2" />Generate Speech</>
              )}
            </Button>
          </div>
        )}

        {/* Library View */}
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
                {clips.map(clip => <ClipCard key={clip.id} clip={clip} />)}
              </div>
            )}
          </div>
        )}

        {/* Teleprompter View */}
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
                    onClick={() => openTeleprompter(clip)}>
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
      </div>

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md grid grid-cols-3 py-2">
          <button onClick={() => setActiveView("generator")}
            className={`flex flex-col items-center py-2 ${activeView === "generator" ? "text-primary" : "text-muted-foreground"}`}>
            <Wand2 className="h-5 w-5" />
            <span className="text-xs mt-1">Generate</span>
          </button>
          <button onClick={() => setActiveView("library")}
            className={`flex flex-col items-center py-2 ${activeView === "library" ? "text-primary" : "text-muted-foreground"}`}>
            <AudioLines className="h-5 w-5" />
            <span className="text-xs mt-1">Library</span>
            {clips.length > 0 && (
              <span className="absolute -mt-1 ml-4 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {clips.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveView("teleprompter")}
            className={`flex flex-col items-center py-2 ${activeView === "teleprompter" ? "text-primary" : "text-muted-foreground"}`}>
            <BookOpen className="h-5 w-5" />
            <span className="text-xs mt-1">Teleprompter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
