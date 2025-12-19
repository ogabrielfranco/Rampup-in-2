
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-3-pro-preview";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "O 'Business Index' geral (0-100) baseado no potencial de novos negócios do grupo.",
    },
    summary: {
      type: Type.STRING,
      description: "Um resumo executivo analítico focado em oportunidades macro.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "A média aritmética simples do número de colaboradores dos participantes.",
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
          eventName: { type: Type.STRING },
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
                reason: { type: Type.STRING }
              },
              required: ["partnerId", "score", "reason"]
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
        },
        required: ["participant1Id", "participant2Id", "score", "reasoning"],
      },
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
    suggestedLayout: {
      type: Type.STRING,
      enum: ['teatro', 'sala_aula', 'mesa_o', 'conferencia', 'mesa_u', 'mesa_t', 'recepcao', 'buffet', 'custom'],
    },
    seatingGroups: {
      type: Type.ARRAY,
      items: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  },
  required: ["overallScore", "summary", "averageEmployees", "participants", "individualScores", "topMatches", "segmentDistribution", "suggestedLayout", "seatingGroups"],
};

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  const prompt = `
    Você é um Mestre em Matchmaking de Negócios e Estrategista de Networking.
    
    **ALGORITMO DE CONEXÃO AVANÇADO:**
    1. **Complementaridade de Cadeia (50%):** Analise se uma empresa fornece o que a outra precisa (ex: Software de Logística -> Transportadora).
    2. **Poder de Decisão e Escala (25%):** Use o número de colaboradores como proxy para maturidade e volume de compra/venda.
    3. **Sinergia Setorial Latente (15%):** Conexões entre setores que compartilham o mesmo ICP (cliente ideal).
    4. **Inovação Cruzada (10%):** Conectar empresas disruptivas com tradicionais para troca de know-how.

    **TAREFA:**
    - Calcule a média de colaboradores (averageEmployees).
    - Gere conexões detalhadas para CADA participante.
    - O Score de Match deve ser rigoroso: >90 apenas para parcerias 'perfeitas'.

    DADOS:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      Estrategista de ROI de Eventos focado no HOST.
  
      **ALGORITMO DO HOST:**
      1. **ICP Match (60%):** Nível de aderência do convidado ao produto/serviço do Host.
      2. **Cross-Selling / Upselling (25%):** Potencial de parceria para expandir mercado.
      3. **Qualificação de Leads (15%):** Baseado em porte (colaboradores) e relevância no setor.
  
      Calcule a média de colaboradores de todos os convidados.
  
      HOST: ${hostsData}
      CONVIDADOS: ${participantsData}
    `;
    return callGemini(prompt);
};

const callGemini = async (prompt: string): Promise<AnalysisResult> => {
    try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 4096 }
          },
        });
        const jsonText = response.text;
        if (!jsonText) throw new Error("Sem resposta da IA");
        return JSON.parse(jsonText) as AnalysisResult;
      } catch (error) {
        console.error("Erro na análise:", error);
        throw new Error("Falha ao analisar os dados de networking.");
      }
};
