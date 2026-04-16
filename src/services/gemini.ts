import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client using the environment variable.
// The AI Studio environment automatically handles injecting this key into the frontend.
export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});
