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
    
    **CRITÉRIOS DE MATCHMAKING AVANÇADOS:**
    1. **Sinergia Operacional e de Cadeia:** Cruzamento de GAPs de uma empresa com soluções de outra.
    2. **Maturidade e Porte:** Alinhamento baseado em volume de colaboradores.
    3. **TENDÊNCIAS DE SETOR:** Considere como a convergência setorial (ex: Fintech no Varejo, IA na Construção) cria valor.
    4. **METAS DE NEGÓCIO:** Analise potenciais metas de escala, eficiência ou saída (Exit) baseado no perfil da empresa.

    **REQUISITOS MANDATÓRIOS:**
    - LISTA EXAUSTIVA: Para cada participante, mapeie conexões com praticamente todos os outros participantes.
    - JUSTIFICATIVAS ULTRA-GRANULARES: Não use justificativas genéricas. Use termos como "Integração Vertical de Supply Chain", "Redução de CAC via Cross-Sell Setorial", "M&A Opportunity", "Sinergia de GTM em novos territórios".
    - O HOST: Trate o Host como uma peça estratégica central.

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
      Considere tendências macro do setor e metas de escala para justificar os matches.
      Gere justificativas granulares focadas em geração de receita imediata e alianças de longo prazo.
  
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
        throw new Error("Erro ao processar inteligência estratégica.");
      }
};