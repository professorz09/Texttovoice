import type { Express } from "express";
import { createServer, type Server } from "http";

// Gemini API Configuration
const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface TTSRequest {
  text: string;
  voice: string;
  language: string;
  style?: string;
  pace?: number;
  model?: string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Gemini 2.5 Pro TTS API endpoint
  app.post("/api/tts/gemini", async (req, res) => {
    try {
      const { text, voice, language } = req.body as TTSRequest;

      if (!text || !voice) {
        return res.status(400).json({ error: "Text and voice are required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log("No GEMINI_API_KEY found, returning demo mode");
        return res.json({
          demo: true,
          error: "API key not configured"
        });
      }

      // Use Gemini 2.5 Pro Preview TTS model
      const modelName = "gemini-2.5-pro-preview-tts";

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

      console.log(`Generating TTS with voice: ${voice}, model: ${modelName}`);

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
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        return res.json({
          demo: true,
          error: `API error: ${response.status}`
        });
      }

      const data = await response.json();
      const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!audioData || !audioData.data) {
        console.error("No audio data in response:", JSON.stringify(data).substring(0, 500));
        return res.json({
          demo: true,
          error: "No audio in response"
        });
      }

      console.log("TTS generated successfully");
      return res.json({
        audio: audioData.data,
        mimeType: audioData.mimeType || "audio/wav",
        provider: "gemini"
      });

    } catch (error) {
      console.error("Gemini TTS error:", error);
      return res.json({
        demo: true,
        error: "Generation failed"
      });
    }
  });

  // Chirp 3 HD TTS (Google Cloud TTS)
  app.post("/api/tts/chirp", async (req, res) => {
    try {
      const { text, voice, language } = req.body as TTSRequest;

      if (!text || !voice) {
        return res.status(400).json({ error: "Text and voice are required" });
      }

      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        console.log("No GOOGLE_CLOUD_API_KEY found, returning demo mode");
        return res.json({
          demo: true,
          error: "API key not configured"
        });
      }

      const requestBody = {
        input: { text },
        voice: {
          languageCode: language || "en-US",
          name: voice
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.0,
          pitch: 0.0
        }
      };

      console.log(`Generating Chirp TTS with voice: ${voice}`);

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chirp API error:", response.status, errorText);
        return res.json({
          demo: true,
          error: `API error: ${response.status}`
        });
      }

      const data = await response.json();

      if (!data.audioContent) {
        return res.json({
          demo: true,
          error: "No audio content"
        });
      }

      console.log("Chirp TTS generated successfully");
      return res.json({
        audio: data.audioContent,
        mimeType: "audio/mp3",
        provider: "chirp"
      });

    } catch (error) {
      console.error("Chirp TTS error:", error);
      return res.json({
        demo: true,
        error: "Generation failed"
      });
    }
  });

  return httpServer;
}
