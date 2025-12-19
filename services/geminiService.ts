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
      description: "Um resumo executivo analítico de alto nível, abordando tendências do setor, diagnósticos de mercado e teses de investimento.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "A média de colaboradores do grupo de participantes mapeados.",
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
    ATUE COMO UM ESTRATEGISTA DE M&A E CONSULTOR SÊNIOR DE CONEXÕES EMPRESARIAIS.
    
    **MISSÃO:**
    Gerar um mapeamento EXAUSTIVO de sinergias para TODOS os participantes.
    
    **CRITÉRIOS DE MATCHMAKING (EXECUTIVE GRADE):**
    1. **Sinergia Operacional:** Cruzamento de GAPs tecnológicos de uma empresa com soluções de outra.
    2. **Maturidade e Porte:** Alinhamento baseado em volume de colaboradores e capacidade de entrega/compra.
    3. **Tendências do Setor:** Como a convergência setorial cria valor imediato.
    4. **Metas de Negócios:** Considere metas de escala e eficiência.

    **REQUISITOS MANDATÓRIOS:**
    - LISTA EXAUSTIVA: Para cada participante, você DEVE listar conexões com praticamente todos os outros participantes da lista, atribuindo um score (mesmo que baixo, ex: 5% ou 10%) e uma justificativa para cada um. 
    - Ninguém deve ser deixado de fora das recomendações de um participante.
    - JUSTIFICATIVAS GRANULARES: Use termos como "Otimização de Unit Economics", "Expansão de Market Share", "Sinergia de GTM".
    - O HOST: Trate o Host como uma peça estratégica no tabuleiro.

    DADOS:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      ESTRATEGISTA DE INVESTIMENTOS E ROI PARA EVENTOS.
  
      **ANÁLISE DE IMPACTO DO HOST E CONVIDADOS:**
      Mapeie exaustivamente como cada convidado se conecta com o(s) Host(s) e entre si.
      Para cada pessoa, liste conexões com todos os outros, justificando até as sinergias mais improváveis ou de longo prazo.
      
      Gere uma análise completa. Calcule a média de colaboradores.
  
      HOST(S): ${hostsData}
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
        console.error("Erro na análise Gemini:", error);
        throw new Error("Erro ao processar inteligência estratégica. Revise os dados.");
      }
};