import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// TTS API Configuration
const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

interface GeminiTTSRequest {
  text: string;
  voice: string;
  language: string;
  style?: string;
  pace?: number;
  model?: string;
}

interface ChirpTTSRequest {
  text: string;
  voice: string;
  language: string;
  speakingRate?: number;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Gemini TTS API endpoint
  app.post("/api/tts/gemini", async (req, res) => {
    try {
      const { text, voice, language, style, pace, model } = req.body as GeminiTTSRequest;

      if (!text || !voice) {
        return res.status(400).json({ error: "Text and voice are required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Gemini API key not configured",
          demo: true,
          message: "Set GEMINI_API_KEY environment variable"
        });
      }

      const modelName = model || "gemini-2.5-flash-preview-tts";

      // Gemini TTS API request format
      const requestBody = {
        contents: [{
          parts: [{
            text: text
          }]
        }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: voice
              }
            }
          }
        }
      };

      const response = await fetch(
        `${GEMINI_API_ENDPOINT}/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Gemini API error:", errorData);
        return res.status(response.status).json({
          error: "Gemini API request failed",
          details: errorData
        });
      }

      const data = await response.json();

      // Extract audio data from response
      const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!audioData) {
        return res.status(500).json({ error: "No audio data in response" });
      }

      return res.json({
        audio: audioData.data,
        mimeType: audioData.mimeType || "audio/mp3",
        provider: "gemini"
      });

    } catch (error) {
      console.error("Gemini TTS error:", error);
      return res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Google Cloud TTS (Chirp3-HD) API endpoint
  app.post("/api/tts/chirp", async (req, res) => {
    try {
      const { text, voice, language, speakingRate } = req.body as ChirpTTSRequest;

      if (!text || !voice) {
        return res.status(400).json({ error: "Text and voice are required" });
      }

      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Google Cloud API key not configured",
          demo: true,
          message: "Set GOOGLE_CLOUD_API_KEY environment variable"
        });
      }

      // Google Cloud TTS request format for Chirp3-HD
      const requestBody = {
        input: {
          text: text
        },
        voice: {
          languageCode: language || "en-US",
          name: voice // e.g., "en-US-Chirp3-HD-Charon"
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: speakingRate || 1.0,
          pitch: 0.0
        }
      };

      const response = await fetch(
        `${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Cloud TTS error:", errorData);
        return res.status(response.status).json({
          error: "Google Cloud TTS request failed",
          details: errorData
        });
      }

      const data = await response.json();

      if (!data.audioContent) {
        return res.status(500).json({ error: "No audio content in response" });
      }

      return res.json({
        audio: data.audioContent,
        mimeType: "audio/mp3",
        provider: "chirp"
      });

    } catch (error) {
      console.error("Chirp TTS error:", error);
      return res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Batch TTS endpoint for large scripts (processes chunks)
  app.post("/api/tts/batch", async (req, res) => {
    try {
      const { chunks, provider, voice, language, style, pace, model } = req.body;

      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return res.status(400).json({ error: "Chunks array is required" });
      }

      const results: { index: number; audio: string; mimeType: string }[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        let audioData: { audio: string; mimeType: string } | null = null;

        if (provider === "gemini") {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            return res.status(500).json({ error: "Gemini API key not configured" });
          }

          const modelName = model || "gemini-2.5-flash-preview-tts";
          const requestBody = {
            contents: [{
              parts: [{
                text: chunk
              }]
            }],
            generationConfig: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: voice
                  }
                }
              }
            }
          };

          const response = await fetch(
            `${GEMINI_API_ENDPOINT}/${modelName}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
            if (inlineData) {
              audioData = {
                audio: inlineData.data,
                mimeType: inlineData.mimeType || "audio/mp3"
              };
            }
          }
        } else if (provider === "chirp") {
          const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
          if (!apiKey) {
            return res.status(500).json({ error: "Google Cloud API key not configured" });
          }

          const requestBody = {
            input: { text: chunk },
            voice: {
              languageCode: language || "en-US",
              name: voice
            },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: pace ? pace / 50 : 1.0,
              pitch: 0.0
            }
          };

          const response = await fetch(
            `${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.audioContent) {
              audioData = {
                audio: data.audioContent,
                mimeType: "audio/mp3"
              };
            }
          }
        }

        if (audioData) {
          results.push({
            index: i,
            audio: audioData.audio,
            mimeType: audioData.mimeType
          });
        }
      }

      return res.json({
        chunks: results,
        totalChunks: chunks.length,
        processedChunks: results.length
      });

    } catch (error) {
      console.error("Batch TTS error:", error);
      return res.status(500).json({ error: "Failed to process batch TTS" });
    }
  });

  return httpServer;
}
