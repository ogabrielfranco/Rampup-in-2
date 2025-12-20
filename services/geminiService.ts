
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

// Usando o modelo mais estável para a API gratuita para evitar erros de "Entity not found"
const MODEL_NAME = "gemini-flash-latest";

const SYSTEM_PROMPT = `Você é o Rampup Intel, especialista em networking empresarial.
Sua tarefa é analisar listas de participantes e retornar um JSON estrito com:
- overallScore (0-100)
- summary (diagnóstico estratégico curto)
- participants (id, name, company, segment, employeeCount, isHost)
- individualScores (participantId, score, potentialConnections, recommendedConnections: [{partnerId, score, reason, synergyType}])
- topMatches (participant1Id, participant2Id, score, reasoning)
- segmentDistribution ([{name, value}])
- seatingGroups (arrays de IDs de participantes)

REGRAS:
1. Calcule o score baseado na sinergia de setor e tamanho de empresa.
2. Identifique sinergias: COMPRA, VENDA ou PARCERIA.
3. Agrupe participantes com interesses comuns.
4. Responda APENAS o JSON, sem markdown ou explicações.`;

export const analyzeNetworkingData = async (data: string): Promise<AnalysisResult> => {
  return executeCall(`Analise esta lista de networking:\n\n${data}`);
};

export const analyzeHostPotential = async (host: string, guests: string): Promise<AnalysisResult> => {
  return executeCall(`FOCO NO HOST:\nHOST: ${host}\nCONVIDADOS: ${guests}\nIdentifique as melhores conexões para o Host.`);
};

async function executeCall(prompt: string): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chave de API não encontrada no sistema.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) throw new Error("A IA retornou uma resposta vazia.");
    
    // Limpeza de possíveis caracteres extras
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    // Garantir que os campos obrigatórios existam
    return {
      overallScore: parsed.overallScore || 0,
      summary: parsed.summary || "Análise concluída.",
      averageEmployees: parsed.averageEmployees || 0,
      participants: parsed.participants || [],
      individualScores: parsed.individualScores || [],
      topMatches: parsed.topMatches || [],
      segmentDistribution: parsed.segmentDistribution || [],
      suggestedLayout: parsed.suggestedLayout || 'buffet',
      seatingGroups: parsed.seatingGroups || []
    };
  } catch (err: any) {
    console.error("Erro detalhado na API Gemini:", err);
    // Lança erro mais amigável para a UI
    if (err.message.includes("403")) throw new Error("Erro 403: Chave de API sem permissão ou limite atingido.");
    if (err.message.includes("404")) throw new Error("Erro 404: Modelo não encontrado ou indisponível.");
    throw err;
  }
}
