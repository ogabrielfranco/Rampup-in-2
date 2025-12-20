import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Tipagem para o ambiente global
declare const process: any;

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
            description: "Índice de Negócio individual (1-100). Cálculo: IN = (E * 0.50) + (P * 0.30) + (D * 0.20)." 
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
                reason: { type: Type.STRING, description: "Justificativa baseada em Cadeia de Valor, Hub de Sinergia ou Ponte de Inovação." },
                synergyType: { 
                  type: Type.STRING, 
                  enum: ['COMPRA', 'VENDA', 'PARCERIA'],
                  description: "Classificação da sinergia entre os dois participantes."
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
          synergyType: { 
            type: Type.STRING, 
            enum: ['COMPRA', 'VENDA', 'PARCERIA']
          }
        },
        required: ["participant1Id", "participant2Id", "score", "reasoning", "synergyType"],
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
    📑 MEGA PROMPT SUPREMO: ENGENHARIA DE ECOSSISTEMAS E INTELIGÊNCIA DE NETWORKING

    Você é um AI Master em Business Intelligence. Analise a lista para calcular o Índice de Negócio (IN) usando:
    IN = (E * 0.50) + (P * 0.30) + (D * 0.20)
    
    Onde E=Essencialidade, P=Poder de Indicação, D=Densidade de Conexão.
    Identifique sinergias de COMPRA, VENDA e PARCERIA.

    DADOS:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      📑 MEGA PROMPT SUPREMO: INTELIGÊNCIA DE NETWORKING FOCADA NO HOST

      ATUAÇÃO: Você é um Engenheiro de Ecossistemas. Sua missão é analisar a relação estratégica entre o(s) HOST(S) e os CONVIDADOS.
      
      OBJETIVO:
      1. Calcule o Índice de Negócio (IN) para cada convidado focado em sua utilidade para o HOST e para o grupo.
      2. Mapeie sinergias onde o HOST pode comprar, vender ou fazer parceria com os convidados.
      3. Identifique conexões valiosas entre os próprios convidados que o HOST pode facilitar (autoridade).
      
      MODELO MATEMÁTICO:
      IN = (Sinergia com Host * 0.60) + (Poder do Convidado * 0.40)
      
      REGRAS:
      - Inclua os HOSTS e CONVIDADOS na lista final de 'participants'.
      - Identifique claramente o tipo de sinergia ('COMPRA', 'VENDA', 'PARCERIA').
      - O 'summary' deve focar em como o HOST pode extrair valor desta agenda específica.

      DADOS DO(S) HOST(S):
      ${hostsData}

      LISTA DE CONVIDADOS:
      ${participantsData}
    `;
    return callGemini(prompt);
};

const callGemini = async (prompt: string): Promise<AnalysisResult> => {
    try {
        const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
        if (!apiKey) throw new Error("API_KEY não configurada no ambiente.");

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.1,
          },
        });
        
        const jsonText = response.text;
        if (!jsonText) throw new Error("A IA retornou uma resposta vazia.");
        
        const result = JSON.parse(jsonText);
        
        // Garantir que campos obrigatórios existam mesmo em falhas parciais da IA
        if (!result.seatingGroups) result.seatingGroups = [];
        if (!result.topMatches) result.topMatches = [];
        
        return result as AnalysisResult;
      } catch (error) {
        console.error("Erro crítico na chamada Gemini:", error);
        throw error;
      }
};