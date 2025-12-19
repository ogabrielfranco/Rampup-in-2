
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
      description: "O 'Business Index' geral (0-100) calculado pela média ponderada das sinergias.",
    },
    summary: {
      type: Type.STRING,
      description: "Um resumo executivo detalhado sobre o potencial de networking (máx 3 frases).",
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
          score: { type: Type.NUMBER, description: "Score individual calculado: (Sinergia*0.4 + Alinhamento*0.3 + Escala*0.2 + Diversidade*0.1)" },
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
  required: ["overallScore", "summary", "participants", "individualScores", "topMatches", "segmentDistribution", "suggestedLayout", "seatingGroups"],
};

export const analyzeNetworkingData = async (rawData: string): Promise<AnalysisResult> => {
  const prompt = `
    Você é um Estrategista de Conexões de Negócios de Alta Performance.
    
    **MISSÃO:** Calcular o "Rampup IN" (Índice de Negócio) usando o seguinte ALGORITMO PONDERADO:
    1. **Sinergia Setorial (40%):** Potencial de transação direta ou complementaridade entre setores (ex: TI -> Varejo).
    2. **Alinhamento Estratégico (30%):** Quão bem o perfil do participante atende aos objetivos descritos no contexto do evento.
    3. **Escala e Maturidade (20%):** Impacto baseado no número de colaboradores. Empresas maiores ganham peso em 'Capacidade de Compra', menores em 'Agilidade e Inovação'.
    4. **Diversidade de Rede (10%):** Capacidade do participante de trazer novas perspectivas para o grupo.

    **REQUISITO DE ANÁLISE:**
    - Identifique padrões ocultos (ex: muitos empresários de logística em um evento de e-commerce aumenta o IN geral).
    - As justificativas de match devem citar "Otimização de Cadeia", "Sinergia Tecnológica" ou "Escalabilidade Operacional".

    Dados do Evento e Participantes:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      Você é um Especialista em Matchmaking focado em ROI para o HOST.
  
      **ALGORITMO DO HOST:**
      1. **ICP Match (50%):** O convidado é um cliente ideal para o Host? (Considere tamanho da empresa e setor).
      2. **Parceria Estratégica (30%):** O convidado oferece serviços que o Host não tem, permitindo cross-selling?
      3. **Autoridade e Escala (20%):** O convidado é um decisor de uma empresa de grande porte (>100 colab)?
  
      Calcule o IN baseado exclusivamente no valor gerado PARA O ANFITRIÃO.
  
      HOST: ${hostsData}
      GUESTS: ${participantsData}
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
            temperature: 0.1, // Lower temperature for more consistent calculations
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
