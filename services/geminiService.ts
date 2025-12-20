
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// gemini-3-flash-preview é o modelo ideal para a camada gratuita e excelente para JSON
const MODEL_NAME = "gemini-3-flash-preview";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Índice de Negócio geral do grupo (0-100).",
    },
    summary: {
      type: Type.STRING,
      description: "Diagnóstico estratégico curto.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "Média de colaboradores.",
    },
    participants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          company: { type: Type.STRING },
          segment: { type: Type.STRING },
          employeeCount: { type: Type.STRING },
          isHost: { type: Type.BOOLEAN }
        },
        required: ["id", "name", "company", "segment"],
      },
    },
    individualScores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          participantId: { type: Type.STRING },
          score: { type: Type.NUMBER },
          potentialConnections: { type: Type.NUMBER },
          scoreReasoning: { type: Type.STRING },
          recommendedConnections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partnerId: { type: Type.STRING },
                score: { type: Type.NUMBER },
                reason: { type: Type.STRING },
                synergyType: { type: Type.STRING }
              },
              required: ["partnerId", "score", "reason"]
            }
          }
        },
        required: ["participantId", "score"],
      },
    },
    topMatches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          participant1Id: { type: Type.STRING },
          participant2Id: { type: Type.STRING },
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          synergyType: { type: Type.STRING }
        },
        required: ["participant1Id", "participant2Id", "score"],
      },
    },
    suggestedLayout: {
      type: Type.STRING,
    },
    segmentDistribution: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.NUMBER },
        },
        required: ["name", "value"],
      },
    },
    seatingGroups: {
      type: Type.ARRAY,
      items: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  },
  required: ["overallScore", "summary", "participants", "individualScores", "topMatches"],
};

const SYSTEM_INSTRUCTION = `Você é o Rampup Intel, especialista em Networking Estratégico. 
Analise listas de empresários e calcule o Índice de Negócio (IN).
- Score 0-100.
- Identifique Sinergias (Compra, Venda, Parceria).
- Sugira grupos de mesa.
- Responda APENAS em JSON seguindo o esquema fornecido.`;

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  return callGemini(`Analise esta lista de networking:\n\n${rawData}`);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
  return callGemini(`DADOS DO HOST: ${hostsData}\n\nCONVIDADOS: ${participantsData}\n\nFoque nas conexões para o Host.`);
};

async function callGemini(prompt: string): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Normalização básica
    return {
      ...result,
      overallScore: result.overallScore || 0,
      summary: result.summary || "Análise concluída.",
      participants: result.participants || [],
      individualScores: result.individualScores || [],
      topMatches: result.topMatches || [],
      segmentDistribution: result.segmentDistribution || [],
      seatingGroups: result.seatingGroups || []
    };
  } catch (error) {
    console.error("Erro no GeminiService:", error);
    throw error;
  }
}
