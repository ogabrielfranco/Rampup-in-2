import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const MODEL_NAME = "gemini-3-pro-preview";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Índice de Negócio (IN) geral do grupo de 0 a 100.",
    },
    summary: {
      type: Type.STRING,
      description: "Resumo executivo estratégico focado em sinergias detectadas.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "Média estimada de colaboradores das empresas.",
    },
    participants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único (pode ser o nome ou um UUID)." },
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
          score: { type: Type.NUMBER, description: "Score individual (0-100) baseado no modelo IN." },
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
        required: ["participantId", "score", "potentialConnections", "recommendedConnections"],
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
        required: ["participant1Id", "participant2Id", "score", "reasoning", "synergyType"],
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
    "overallScore", "summary", "averageEmployees", "participants", 
    "individualScores", "topMatches", "suggestedLayout", 
    "segmentDistribution", "seatingGroups"
  ],
};

const SYSTEM_INSTRUCTION = `Você é o "Rampup Intel", uma IA de elite especializada em Networking Estratégico e Business Intelligence.
Sua função é transformar listas de convidados em insights de negócios acionáveis através do cálculo do "Índice de Negócio" (IN).

METODOLOGIA:
1. Índice de Negócio (IN): Calcule de 0 a 100 considerando Essencialidade (50%), Poder de Indicação (30%) e Densidade de Conexão (20%).
2. Classificação de Sinergia: 
   - COMPRA: Um participante tem demanda pelo que o outro oferece.
   - VENDA: O inverso de compra.
   - PARCERIA: Serviços complementares ou públicos-alvo idênticos.
3. Análise do Host: Se houver um Host definido, priorize sinergias que beneficiem o Host e identifique quem são os "Alvos de Valor" para o anfitrião.
4. Mapeamento de Sala: Sugira mesas e grupos baseados no máximo potencial de networking convergente.

FORMATO DE RESPOSTA:
Retorne EXCLUSIVAMENTE um objeto JSON que siga rigorosamente o esquema definido. Não adicione texto antes ou depois do JSON.`;

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  const prompt = `Analise os dados abaixo e extraia a inteligência de networking conforme as instruções do sistema:\n\n${rawData}`;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
  const prompt = `
    DADOS DO ANFITRIÃO (HOST):
    ${hostsData}

    LISTA DE CONVIDADOS:
    ${participantsData}

    INSTRUÇÃO ADICIONAL: Analise com foco total no HOST. Identifique como cada convidado pode ser útil para o Host e vice-versa. 
    Inclua o Host e os Convidados no array final de participantes. Garanta que o resumo (summary) mencione as 3 principais oportunidades para o Host.
  `;
  return callGemini(prompt);
};

const callGemini = async (prompt: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key não configurada. Verifique as variáveis de ambiente.");
  }

  // Instancia o SDK conforme as diretrizes
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1, // Baixa temperatura para maior consistência em JSON
        thinkingConfig: { thinkingBudget: 8000 } // Orçamento para raciocínio complexo
      },
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("A IA retornou uma resposta vazia.");
    }

    const parsedResult = JSON.parse(jsonStr);

    // Normalização básica para garantir que campos obrigatórios existam
    return {
      ...parsedResult,
      participants: parsedResult.participants || [],
      individualScores: parsedResult.individualScores || [],
      topMatches: parsedResult.topMatches || [],
      seatingGroups: parsedResult.seatingGroups || []
    } as AnalysisResult;

  } catch (error: any) {
    console.error("Erro na comunicação com Gemini:", error);
    // Relança o erro com uma mensagem mais amigável ou técnica dependendo do contexto
    throw new Error(error.message || "Erro desconhecido ao processar análise.");
  }
};