import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// gemini-3-flash-preview é o modelo mais estável e rápido para processamento de JSON estruturado
const MODEL_NAME = "gemini-3-flash-preview";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Média de 0 a 100 do potencial de negócios do grupo.",
    },
    summary: {
      type: Type.STRING,
      description: "Sumário executivo das oportunidades detectadas.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "Média estimada de colaboradores das empresas citadas.",
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
          synergyType: { type: Type.STRING, enum: ['COMPRA', 'VENDA', 'PARCERIA'] }
        },
        required: ["participant1Id", "participant2Id", "score"],
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
  // Mantemos apenas o essencial como obrigatório para evitar falhas de validação rígida
  required: ["overallScore", "summary", "participants", "individualScores", "topMatches"],
};

const SYSTEM_INSTRUCTION = `Você é o analista de BI da Rampup. Sua tarefa é calcular o "Índice de Negócio" (IN) para participantes de um evento.
IN Individual (0-100) = (Essencialidade 50% + Indicação 30% + Densidade 20%).

Sinergias:
- COMPRA: A precisa do que B vende.
- VENDA: Oposto de compra.
- PARCERIA: Serviços que se complementam para o mesmo cliente.

Layout: Escolha o melhor formato de sala.
Mapeamento: Agrupe os matches mais fortes (score > 80) em seatingGroups.

IMPORTANTE:
- Retorne APENAS o JSON.
- Se houver Host, priorize as sinergias dele.
- Garanta que todos os IDs nos scores e matches existam no array de participantes.`;

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  const prompt = `Analise esta lista de networking e gere o relatório estratégico completo em JSON:\n\n${rawData}`;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
  const prompt = `
    FOCO: ANÁLISE DO ANFITRIÃO (HOST)
    
    DADOS DO HOST:
    ${hostsData}

    CONVIDADOS:
    ${participantsData}

    INSTRUÇÕES: 
    1. Calcule o IN de cada convidado em relação ao Host.
    2. No sumário, aponte as 3 maiores oportunidades de faturamento para o Host.
    3. Inclua o Host no array de participantes com isHost: true.
  `;
  return callGemini(prompt);
};

const callGemini = async (prompt: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("CHAVE_NAO_CONFIGURADA");
  }

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

    const text = response.text;
    if (!text) throw new Error("RESPOSTA_VAZIA");

    const parsed = JSON.parse(text);

    // Normalização para garantir que campos opcionais no schema mas usados na UI existam
    return {
      overallScore: parsed.overallScore || 0,
      summary: parsed.summary || "",
      averageEmployees: parsed.averageEmployees || 0,
      participants: parsed.participants || [],
      individualScores: parsed.individualScores || [],
      topMatches: parsed.topMatches || [],
      suggestedLayout: parsed.suggestedLayout || 'teatro',
      segmentDistribution: parsed.segmentDistribution || [],
      seatingGroups: parsed.seatingGroups || []
    } as AnalysisResult;

  } catch (error: any) {
    console.error("Erro interno GeminiService:", error);
    throw error;
  }
};