import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AudioLines,
  Download,
  Mic,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Wand2,
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
import { useToast } from "@/hooks/use-toast";

const DEMO_VOICES_GEMINI = ["Kore", "Puck", "Aoede", "Charon", "Leda"] as const;
const DEMO_VOICES_CHIRP = ["en-US-Chirp3-HD-Charon", "en-IN-Chirp3-HD-Kore", "hi-IN-Chirp3-HD-Charon"] as const;

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
  url?: string;
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

function buildDemoWavBase64() {
  // A tiny base64-encoded WAV beep so the UI can actually play something.
  // (Frontend-only mock; no API calls.)
  return "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
}

export default function Home() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider>("gemini");

  const [geminiModel, setGeminiModel] = useState("gemini-2.5-pro-preview-tts");
  const [chirpModel, setChirpModel] = useState("Chirp 3 HD");

  const [voice, setVoice] = useState<string>(DEMO_VOICES_GEMINI[0]);
  const [language, setLanguage] = useState<string>("hi-IN");
  const [style, setStyle] = useState<string>("Warm, clear, confident");
  const [pace, setPace] = useState<number>(55);
  const [multiSpeaker, setMultiSpeaker] = useState<boolean>(false);

  const [text, setText] = useState<string>(
    "Namaste! Main VoiceForge hoon. Aapka text yahan se studio-quality voice me convert hoga."
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);

  const voicesForProvider = useMemo(() => {
    if (provider === "gemini") return DEMO_VOICES_GEMINI as readonly string[];
    return DEMO_VOICES_CHIRP as readonly string[];
  }, [provider]);

  const currentModel = provider === "gemini" ? geminiModel : chirpModel;

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
      await new Promise((r) => setTimeout(r, 650));

      const b64 = buildDemoWavBase64();
      const url = `data:audio/wav;base64,${b64}`;

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
        url,
      };

      setClips((prev) => [clip, ...prev]);
      toast({
        title: "Generated (demo)",
        description:
          "This is a frontend-only demo clip. Real generation needs a secure backend.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function playClip(clip: Clip) {
    if (!clip.url) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (nowPlayingId === clip.id && !audio.paused) {
      audio.pause();
      return;
    }

    audio.src = clip.url;
    await audio.play();
    setNowPlayingId(clip.id);
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setNowPlayingId(null);
  }

  function downloadClip(clip: Clip) {
    if (!clip.url) return;
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = `voiceforge-${clip.provider}-${clip.id}.wav`;
    a.click();
  }

  function clearAll() {
    stopPlayback();
    setClips([]);
  }

  return (
    <div
      className="min-h-screen w-full bg-[radial-gradient(1000px_500px_at_10%_-10%,hsl(var(--primary)/0.20),transparent_60%),radial-gradient(900px_600px_at_90%_0%,hsl(var(--accent)/0.18),transparent_55%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background))) ]"
      data-testid="page-home"
    >
      <audio
        ref={audioRef}
        onEnded={() => setNowPlayingId(null)}
        data-testid="audio-player"
      />

      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
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
                <span
                  className="text-xs font-medium text-foreground"
                  data-testid="text-badge"
                >
                  Studio-quality TTS mock
                </span>
              </div>
              <h1
                className="mt-3 text-3xl font-semibold tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
                data-testid="text-title"
              >
                VoiceForge
              </h1>
              <p
                className="mt-1 text-sm text-muted-foreground"
                data-testid="text-subtitle"
              >
                Gemini 2.5 TTS + Chirp 3 HD inspired controls (demo UI)
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

        <Card className="border-border/70 bg-card/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle
              className="flex items-center gap-2 text-base"
              data-testid="text-generator-title"
            >
              <Wand2 className="h-4 w-4 text-primary" />
              Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    placeholder="gemini-2.5-pro-preview-tts"
                    data-testid="input-model-gemini"
                  />
                  <p className="text-xs text-muted-foreground" data-testid="text-model-help-gemini">
                    Demo only. Real calls require a secure backend (don’t put API keys in frontend).
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
                    Chirp voices usually look like: en-US-Chirp3-HD-Charon.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

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

            <div className="space-y-2">
              <Label data-testid="label-text">Text</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-28"
                placeholder="Type something…"
                data-testid="textarea-text"
              />
            </div>

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

            <Button
              className="w-full"
              onClick={onGenerate}
              disabled={isGenerating}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <span className="inline-flex items-center gap-2">
                  <AudioLines className="h-4 w-4 animate-pulse" />
                  Generating…
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mt-5"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold" data-testid="text-library-title">
              Library
            </div>
            <Button
              variant="secondary"
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
                    <div
                      className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                      data-testid="icon-empty"
                    >
                      <AudioLines className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium" data-testid="text-empty-title">
                      No clips yet
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" data-testid="text-empty-subtitle">
                      Generate your first voice clip above.
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
                            <div
                              className="truncate text-sm font-semibold"
                              data-testid={`text-clip-title-${clip.id}`}
                            >
                              {clip.title}
                            </div>
                            <Badge
                              variant={clip.provider === "gemini" ? "default" : "secondary"}
                              data-testid={`badge-clip-provider-${clip.id}`}
                            >
                              {clip.provider === "gemini" ? "Gemini" : "Chirp"}
                            </Badge>
                          </div>
                          <div
                            className="mt-1 text-xs text-muted-foreground"
                            data-testid={`text-clip-meta-${clip.id}`}
                          >
                            {formatTime(clip.createdAt)} • {clip.settings.language} • {clip.settings.model}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9 rounded-full"
                            onClick={() => playClip(clip)}
                            data-testid={`button-play-${clip.id}`}
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9 rounded-full"
                            onClick={() => downloadClip(clip)}
                            data-testid={`button-download-${clip.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div
                        className="mt-3 line-clamp-3 text-sm text-foreground/90"
                        data-testid={`text-clip-body-${clip.id}`}
                      >
                        {clip.text}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </motion.div>

        <div className="mt-6 rounded-2xl border border-border/70 bg-card/60 p-4 text-xs text-muted-foreground" data-testid="callout-security">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground" data-testid="text-callout-title">
                Next step (to make it real)
              </div>
              <div className="mt-1" data-testid="text-callout-body">
                TTS generation needs API keys + server-side calls. This prototype is UI-first and safe.
                When you’re ready, we can upgrade to a full app and connect Gemini/Cloud TTS securely.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
        data-testid="bottom-nav"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 px-4 py-3">
          <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wand2 className="h-4 w-4" />
            </div>
            <span data-testid="text-nav-generate">Generate</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <AudioLines className="h-4 w-4" />
            </div>
            <span data-testid="text-nav-library">Library</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground/5 text-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span data-testid="text-nav-settings">Settings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
