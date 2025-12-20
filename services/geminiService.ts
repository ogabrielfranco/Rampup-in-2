
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

    ATUAÇÃO:
    Você é um AI Master em Business Intelligence, Analista de Dados e Engenheiro de Ecossistemas B2B. Sua especialidade é a Teoria dos Grafos aplicada a negócios, identificando fluxos de capital e autoridade dentro de redes fechadas de networking.

    MISSÃO:
    Analisar a lista de participantes fornecida para extrair o valor máximo de conectividade, calculando um Índice de Negócio (IN) ultra-preciso e mapeando a arquitetura de sinergias do grupo, incluindo o Host como um nó estratégico da rede.

    1. MODELO MATEMÁTICO (ÍNDICE DE NEGÓCIO - IN)
    Calcule o IN de cada participante em uma escala de 1 a 100, utilizando a seguinte equação ponderada:
    $$IN = (E \cdot 0.50) + (P \cdot 0.30) + (D \cdot 0.20)$$
    Onde:
    - E (Essencialidade - 50%): Grau de necessidade do serviço para a sobrevivência/operação dos outros membros (ex: Jurídico, Contabilidade, TI, RH).
    - P (Poder de Indicação - 30%): Posição do negócio no "topo do funil" ou início da jornada de compra (ex: Imobiliária que indica reforma, Branding que indica marketing).
    - D (Densidade de Conexão - 20%): Potencial quantitativo de parcerias transversais detectadas na lista atual.

    2. PROTOCOLO DE ANÁLISE DE ECOSSISTEMA
    - Mapeamento de Cadeia de Valor: Identifique fornecedor potencial e comprador direto.
    - Hubs de Sinergia: Agrupe por 'Público-Alvo Compartilhado'.
    - Pontes de Inovação: Como empresas de Tecnologia/Consultoria podem otimizar as empresas tradicionais.
    - Análise de Autoridade e Mídia: Conecte detentores de canais a quem possui produto mas baixa visibilidade.

    3. REGRAS CRÍTICAS DE EXECUÇÃO
    - Regra do Score Alto: É terminantemente PROIBIDO um participante ter IN > 80 sem listar pelo menos 3 conexões recomendadas específicas.
    - Sinergia Classificada: Cada recomendação DEVE ser marcada como 'COMPRA', 'VENDA' ou 'PARCERIA'.
    - Visão do Host: O Host deve ser tratado como um nó estratégico.
    - Mapeamento Total: Nenhum participante pode ficar "isolado"; todos devem ter pelo menos uma sinergia mapeada.

    DADOS:
    ${rawData}
  `;
  return callGemini(prompt);
};

export const analyzeHostPotential = async (hostsData: string, participantsData: string): Promise<AnalysisResult> => {
    const prompt = `
      📑 MEGA PROMPT SUPREMO: ANÁLISE DE ECOSSISTEMA COM FOCO NO HOST

      Utilize a lógica matemática de Grafos e a equação IN = (E * 0.50) + (P * 0.30) + (D * 0.20) para mapear o valor de cada convidado em relação ao Host e ao ecossistema total.
      
      REGRAS:
      - Classifique sinergias como 'COMPRA', 'VENDA' ou 'PARCERIA'.
      - Mapeamento Total: Todos os convidados devem ter conexões.
      - Host é o âncora, mas as sinergias entre convidados também importam.

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
        console.error("Erro na análise estratégica:", error);
        throw new Error("Erro ao processar inteligência estratégica.");
      }
};
