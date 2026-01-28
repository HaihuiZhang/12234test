import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { SimulationConfig, MaterialType } from "../types";

// Tool Definition
const updateConfigTool: FunctionDeclaration = {
  name: "updateSimulationConfig",
  parameters: {
    type: Type.OBJECT,
    properties: {
      frequency: { type: Type.NUMBER, description: "Source frequency in Hz (500 - 5000)" },
      sourceAmplitude: { type: Type.NUMBER, description: "Source amplitude (0.1 - 2.0)" },
      simulationSpeed: { type: Type.NUMBER, description: "Simulation playback speed (0.1 - 2.0)" },
    },
    required: ["frequency"],
  },
  description: "Update the simulation parameters based on user requirements.",
};

export class GeminiService {
  private ai: GoogleGenAI;
  private modelStr: string = "gemini-3-flash-preview";

  constructor() {
    // Fixed: Use process.env.API_KEY directly without fallback as per coding guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async sendMessage(
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    currentConfig: SimulationConfig
  ) {
    try {
      // Construct a system instruction with current context
      const systemInstruction = `
        You are an expert Physics Assistant specializing in Acoustic Metamaterials and Phononic Crystals.
        The user is using a 2D FDTD Wave Simulation tool.
        
        Current Simulation State:
        - Frequency: ${currentConfig.frequency} Hz
        - Material: User is drawing on a 1.2m x 1.2m grid.
        
        Your Goal:
        1. Explain concepts like Bandgaps, Bragg Scattering, Local Resonance, and Waveguides.
        2. Suggest frequencies to observe specific phenomena based on material properties (Speed of Sound: Air=343m/s, Water=1481m/s, Steel=5960m/s).
        3. Use the 'updateSimulationConfig' tool if the user asks to change frequency or speed.
        
        Keep responses concise and scientific yet accessible.
      `;

      const response = await this.ai.models.generateContent({
        model: this.modelStr,
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [updateConfigTool] }],
        }
      });

      return response;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();