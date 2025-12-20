
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Modelo padrão para tarefas complexas conforme diretrizes
const MODEL_NAME = "gemini-3-pro-preview";

// Esquema simplificado para garantir 100% de sucesso no parsing da IA
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Índice de Negócio (IN) médio do grupo (0-100).",
    },
    summary: {
      type: Type.STRING,
      description: "Resumo executivo focado em oportunidades de networking.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "Média estimada de colaboradores.",
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
                synergyType: { 
                  type: Type.STRING, 
                  enum: ['COMPRA', 'VENDA', 'PARCERIA']
                }
              },
              required: ["partnerId", "score", "reason", "synergyType"]
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
          synergyType: { type: Type.STRING, enum: ['COMPRA', 'VENDA', 'PARCERIA'] }
        },
        required: ["participant1Id", "participant2Id", "score", "synergyType"],
      },
    },
    suggestedLayout: {
      type: Type.STRING,
      enum: ['teatro', 'sala_aula', 'mesa_o', 'conferencia', 'mesa_u', 'mesa_t', 'recepcao', 'buffet', 'custom'],
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
  required: [
    "overallScore", "summary", "participants", 
    "individualScores", "topMatches", "suggestedLayout", 
    "segmentDistribution", "seatingGroups"
  ],
};

const SYSTEM_INSTRUCTION = `Você é o motor de inteligência "Rampup Intel". Sua missão é analisar listas de networking e calcular o "Índice de Negócio" (IN).

CRITÉRIOS DE ANÁLISE:
1. IN Individual: De 0 a 100 baseado em: Essencialidade (50%), Poder de Indicação (30%) e Densidade (20%).
2. Sinergias: 
   - COMPRA: B2B onde o participante A precisa do produto do participante B.
   - VENDA: Oposto de compra.
   - PARCERIA: Serviços complementares.
3. Alocação de Mesa: Agrupe pessoas com maior pontuação de match (score acima de 80) na mesma mesa ou proximidade.

REGRAS DE RESPOSTA:
- Retorne apenas o JSON.
- Se for análise de HOST, inclua o HOST no array de participantes com isHost: true.
- O campo summary deve ser um diagnóstico curto e incisivo para o tomador de decisão.`;

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  const prompt = `Analise a seguinte lista de networking e gere o JSON de inteligência estratégica conforme as instruções do sistema:\n\n${rawData}`;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
  const prompt = `
    DADOS DO ANFITRIÃO (HOST):
    ${hostsData}

    LISTA DE CONVIDADOS:
    ${participantsData}

    OBJETIVO: Identifique sinergias exclusivas onde o HOST pode gerar negócios com os convidados. 
    Destaque no sumário as 3 conexões de ouro para o Host. Inclua o Host no resultado final.
  `;
  return callGemini(prompt);
};

const callGemini = async (prompt: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key não encontrada no ambiente.");
  }

  // SEMPRE instanciar um novo SDK antes da chamada para garantir a chave atual
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1, // Consistência máxima no JSON
      },
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Resposta vazia da IA.");

    const parsed = JSON.parse(jsonStr);

    // Normalização defensiva para campos que podem vir incompletos
    return {
      overallScore: parsed.overallScore || 0,
      summary: parsed.summary || "Não foi possível gerar um resumo.",
      averageEmployees: parsed.averageEmployees || 0,
      participants: parsed.participants || [],
      individualScores: (parsed.individualScores || []).map((s: any) => ({
        ...s,
        recommendedConnections: s.recommendedConnections || []
      })),
      topMatches: parsed.topMatches || [],
      suggestedLayout: parsed.suggestedLayout || 'teatro',
      segmentDistribution: parsed.segmentDistribution || [],
      seatingGroups: parsed.seatingGroups || []
    } as AnalysisResult;

  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    throw error;
  }
};
