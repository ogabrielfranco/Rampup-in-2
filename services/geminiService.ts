import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-3-pro-preview";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "O 'Business Index' geral (0-100) da agenda, baseado na densidade de sinergias do grupo.",
    },
    summary: {
      type: Type.STRING,
      description: "Resumo executivo analítico focado em ecossistemas, pontes de inovação e hubs de sinergia.",
    },
    averageEmployees: {
      type: Type.NUMBER,
      description: "Média aritmética de colaboradores das empresas.",
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
          score: { 
            type: Type.NUMBER, 
            description: "Índice de Negócio individual (1-100). Cálculo: Essencialidade (50%) + Poder de Indicação (30%) + Sinergia de Ecossistema (20%)." 
          },
          potentialConnections: { type: Type.NUMBER },
          scoreReasoning: { type: Type.STRING },
          recommendedConnections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partnerId: { type: Type.STRING },
                score: { type: Type.NUMBER },
                reason: { type: Type.STRING, description: "Justificativa baseada em Cadeia de Valor, Hub de Sinergia ou Ponte de Inovação." }
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
    ATUE COMO UM ESPECIALISTA EM GESTÃO DE ECOSSISTEMAS DE NEGÓCIOS E ANALISTA DE DADOS B2B.
    
    **MISSÃO:**
    Gerar um Índice de Negócio (IN) ultra-preciso (1-100) para cada participante.
    
    **LOGICA DE RACIOCÍNIO (ANÁLISE DE ECOSSISTEMA):**
    1. **Mapeamento de Cadeia de Valor:** Identifique quem é o fornecedor potencial e quem é o comprador direto dentro do grupo.
    2. **Hubs de Sinergia:** Agrupe os participantes por 'Público-Alvo Compartilhado'.
    3. **Pontes de Inovação:** Identifique empresas de tecnologia ou consultoria que podem otimizar as operações das empresas tradicionais da lista.
    4. **Análise de Autoridade e Mídia:** Conecte quem possui canais de divulgação a quem precisa de visibilidade.

    **CRITÉRIOS PARA O CÁLCULO DO IN (0-100):**
    - **Essencialidade (50%):** O serviço é obrigatório/essencial para os outros? (Ex: Jurídico, Contabilidade, Software = Alto).
    - **Poder de Indicação (30%):** Este negócio está no início da jornada de compra de outros? (Ex: Imobiliária indica reforma = Alto).
    - **Densidade de Conexão (20%):** O score individual é reflexo da quantidade e qualidade de conexões.

    **REGRAS CRÍTICAS:**
    - É PROIBIDO um participante ter score alto (ex: >80) sem possuir conexões sugeridas listadas no array 'recommendedConnections'.
    - TODOS os participantes devem ter sinergias de compra/venda mapeadas.
    - O HOST deve ser considerado um participante comum dentro do ecossistema para fins de conexão.

    DADOS:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      ATUE COMO UM ANALISTA DE DADOS E ESTRATEGISTA DE NETWORKING B2B.
  
      **MISSÃO:** Analisar o ecossistema de negócios integrando o Host como parte dos participantes.
      
      **CRITÉRIOS DE CÁLCULO (IN):**
      - Essencialidade (50%): Serviço obrigatório para os outros membros do grupo.
      - Poder de Indicação (30%): Negócio no início da jornada de compra.
      
      **MAPEAMENTO DE CONEXÕES:**
      - Identifique hubs de sinergia e cadeias de valor entre TODOS.
      - Se um participante (como Rafael Castro ou Otacilio Valente) possui alto IN, ele OBRIGATORIAMENTE deve ter conexões sugeridas com outros membros.
      - Não foque exclusivamente no host; trate-o como um nó estratégico dentro da rede total.

      HOST(S): ${hostsData}
      CONVIDADOS: ${participantsData}
    `;
    return callGemini(prompt);
};

const callGemini = async (prompt: string): Promise<AnalysisResult> => {
    try {
        const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await aiInstance.models.generateContent({
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
