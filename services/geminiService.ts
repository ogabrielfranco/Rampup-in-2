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
      description: "Um resumo executivo analítico de alto nível, abordando tendências do setor e diagnósticos de mercado.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "A média de colaboradores do grupo de participantes.",
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
    ATUE COMO UM ESTRATEGISTA DE M&A E CONSULTOR SÊNIOR DE NETWORKING CORPORATIVO.
    
    **MISSÃO:**
    Analise a lista de participantes e gere um relatório de sinergia de alto impacto.
    
    **ALGORITMO DE CONEXÃO "VENTURE GRADE":**
    1. **Sinergia Operacional e Cadeia de Valor:** Como o produto/serviço de A atende uma dor crítica ou GAP tecnológico de B.
    2. **Maturidade Corporativa:** Utilize o porte (colaboradores) para alinhar empresas em estágios similares ou complementares.
    3. **Tendências de Mercado:** Considere como os setores (ex: Marketing Digital + Varejo) estão convergindo no cenário atual.
    4. **Metas Estratégicas Implícitas:** Deduza metas (ex: expansão, eficiência, tecnologia) baseado no perfil e setor.

    **REQUISITOS DE JUSTIFICATIVA:**
    As razões devem ser granuladas e assertivas. Use terminologia de negócios (ex: "Gargalo de Supply Chain", "Aquisição de Clientes de Baixo CAC", "Pivotagem Tecnológica").
    
    **IMPORTANTE:**
    - Para CADA participante, gere recomendações de conexão com TODOS os outros participantes que tenham o mínimo de sinergia (mesmo que o score seja baixo, ex: 10%).
    - Calcule a média real de colaboradores (averageEmployees).
    - O 'overallScore' deve refletir o potencial de geração de caixa do grupo.

    DADOS:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      ESTRATEGISTA DE INVESTIMENTOS E ROI PARA EVENTOS.
  
      **FOCO NO HOST:**
      O Host quer maximizar o valor de sua agenda.
      1. **Qualificação de Lead:** Identifique convidados que são "Ideal Customer Profiles" para o negócio do Host.
      2. **Parceria Estratégica:** Quem pode ser um canal de vendas ou fornecedor crítico.
      3. **Experiência de Negócio:** Justifique com base em teses de crescimento acelerado.
  
      Gere uma análise onde cada convidado tenha um score de "aderência ao host" granulado.
      Calcule a média de colaboradores.
  
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
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 4096 }
          },
        });
        const jsonText = response.text;
        if (!jsonText) throw new Error("Sem resposta da IA");
        return JSON.parse(jsonText) as AnalysisResult;
      } catch (error) {
        console.error("Erro na análise Gemini:", error);
        throw new Error("Erro ao processar inteligência de negócios. Verifique os dados inseridos.");
      }
};