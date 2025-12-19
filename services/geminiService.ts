
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-3-pro-preview";

// Define the response schema using Type enum
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "O 'Business Index' geral (0-100) para o grupo, baseado no potencial de sinergia estratégica e densidade de decisores.",
    },
    summary: {
      type: Type.STRING,
      description: "Um resumo executivo detalhado sobre o potencial de networking, citando tendências setoriais e sinergias de metas (máx 3 frases).",
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
          employeeCount: { type: Type.STRING, description: "Número de colaboradores da empresa, se disponível." },
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
          score: { type: Type.NUMBER, description: "Índice de Negócio Individual (0-100). Baseado no potencial de prover ou receber valor estratégico." },
          potentialConnections: { type: Type.NUMBER, description: "Número de conexões de alta probabilidade encontradas." },
          scoreReasoning: { type: Type.STRING, description: "Explicação granular do score baseada em metas e tendências setoriais." },
          recommendedConnections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partnerId: { type: Type.STRING },
                score: { type: Type.NUMBER, description: "Força do Match 0-100" },
                reason: { type: Type.STRING, description: "Motivo granular (ex: 'Sinergia entre tecnologia de RH e empresas em expansão de frota')." }
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
  required: ["overallScore", "summary", "participants", "individualScores", "topMatches", "segmentDistribution", "suggestedLayout", "seatingGroups"],
};

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  const prompt = `
    Você é um Estrategista de Conexões de Negócios especializado em ecossistemas de alta performance.
    
    **Tarefa:** Calcular o "Rampup IN" (Índice de Negócio) e mapear conexões estratégicas.
    
    **Instruções de Análise Profunda:**
    1. **Metas de Negócio:** Se os dados sugerirem metas (ex: 'expansão', 'tech', 'vendas'), priorize matches que resolvam essas necessidades.
    2. **Tendências do Setor (2024-2025):** Considere tendências como digitalização de cadeias de suprimento, ESG, automação com IA e BPO.
    3. **Tamanho da Empresa:** Use a quantidade de colaboradores como um fator de relevância para matches (ex: empresas grandes podem precisar de BPO, empresas pequenas de consultoria de crescimento).
    4. **Justificativa Granular:** Não use "Setores parecidos". Use termos como "Otimização de Supply Chain", "Verticalização de Vendas", "Cross-selling em serviços corporativos".
    5. **Densidade de Decisores:** Se houver muitos decisores de um setor específico (ex: Logística), destaque como isso favorece parcerias de infraestrutura.

    Dados Brutos:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      Você é um Estrategista de Matchmaking com foco no HOST.
  
      **Objetivo:** Analisar quão estratégicos os GUESTS são para os objetivos do HOST.
  
      **Critérios:**
      - **ICP (Ideal Customer Profile):** Identifique convidados que são potenciais clientes do Host. Considere o tamanho da empresa (colaboradores) se disponível.
      - **Parcerias Estratégicas:** Identifique convidados que complementam o serviço do Host.
      - **Networking de Influência:** Identifique decisores de setores em alta que o Host deve conhecer.
      
      Justifique cada conexão com motivos de mercado granulares.
  
      DADOS DO HOST: ${hostsData}
      DADOS DOS CONVIDADOS: ${participantsData}
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
        console.error("Erro na análise:", error);
        throw new Error("Falha ao analisar os dados de networking.");
      }
}
