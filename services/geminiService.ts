
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Modelo ideal para a camada gratuita: ultra-rápido e preciso em JSON
const MODEL_NAME = "gemini-3-flash-preview";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    averageEmployees: { type: Type.NUMBER },
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
        required: ["id", "name", "company"]
      }
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
              required: ["partnerId", "score"]
            }
          }
        },
        required: ["participantId", "score"]
      }
    },
    topMatches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          participant1Id: { type: Type.STRING },
          participant2Id: { type: Type.STRING },
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["participant1Id", "participant2Id", "score"]
      }
    },
    suggestedLayout: { type: Type.STRING },
    segmentDistribution: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.NUMBER }
        }
      }
    },
    seatingGroups: {
      type: Type.ARRAY,
      items: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  },
  required: ["overallScore", "summary", "participants", "individualScores", "topMatches"]
};

const SYSTEM_PROMPT = `Você é o Rampup Intel. Sua missão é analisar listas de networking empresarial.
1. Calcule o Índice de Negócio (IN) de 0 a 100 para cada participante.
2. Identifique sinergias reais (Compra, Venda, Parceria).
3. Agrupe participantes com alto match em 'seatingGroups'.
4. Seja conciso no sumário.
Responda estritamente em JSON.`;

export const analyzeNetworkingData = async (data: string): Promise<AnalysisResult> => {
  return executeCall(`Analise esta lista de participantes de um evento de networking:\n\n${data}`);
};

export const analyzeHostPotential = async (host: string, guests: string): Promise<AnalysisResult> => {
  return executeCall(`FOCO NO ANFITRIÃO:\nHOST: ${host}\nCONVIDADOS: ${guests}\nIdentifique as melhores conexões para o Host.`);
};

async function executeCall(prompt: string): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  // Inicialização no momento do uso para capturar a chave mais recente
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
        // Thinking Budget 0 garante velocidade máxima e menor custo de tokens na API gratuita
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    if (!response.text) throw new Error("EMPTY_RESPONSE");
    const parsed = JSON.parse(response.text);

    // Normalização defensiva para evitar quebras na UI
    return {
      overallScore: parsed.overallScore || 0,
      summary: parsed.summary || "Análise concluída com sucesso.",
      averageEmployees: parsed.averageEmployees || 0,
      participants: parsed.participants || [],
      individualScores: parsed.individualScores || [],
      topMatches: parsed.topMatches || [],
      segmentDistribution: parsed.segmentDistribution || [],
      suggestedLayout: parsed.suggestedLayout || 'buffet',
      seatingGroups: parsed.seatingGroups || []
    };
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    throw err;
  }
}
