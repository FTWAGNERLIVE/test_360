import { GoogleGenerativeAI } from "@google/generative-ai";

// Use environment variable for API Key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Summarizes the data to be sent as context to Gemini
 */
const prepareDataContext = (data: any[], headers: string[]) => {
  const totalRecords = data.length;
  const columns = headers.join(", ");
  
  // Take first 10 rows as sample
  const sampleData = data.slice(0, 10).map(row => {
    const simplifiedRow: any = {};
    headers.forEach(h => {
      simplifiedRow[h] = row[h];
    });
    return simplifiedRow;
  });

  return `
CONTEXTO DO DATASET (Farol 360):
- Total de registros: ${totalRecords}
- Colunas disponíveis: ${columns}
- Amostra dos dados (primeiras 10 linhas):
${JSON.stringify(sampleData, null, 2)}

INSTRUÇÕES:
1. Você é o Agente 360 da empresa Creattive, um assistente de análise de dados inteligente.
2. Sua função é responder perguntas estritamente baseadas nos dados fornecidos acima.
3. Se o usuário perguntar algo que não pode ser respondido com os dados, explique educadamente que você só tem acesso aos dados carregados no dashboard.
4. Mantenha um tom profissional, prestativo e analítico.
5. Use markdown para formatar suas respostas (negrito, listas, tabelas se necessário).
6. Tente identificar tendências ou pontos interessantes nos dados se o usuário pedir uma análise geral.
7. O usuário é o cliente da Creattive usando o sistema Farol 360.
`;
};

export const chatWithGemini = async (
  userMessage: string, 
  history: ChatMessage[], 
  data: any[], 
  headers: string[]
) => {
  if (!API_KEY) {
    return "Erro: Chave de API do Gemini não configurada. Por favor, adicione VITE_GEMINI_API_KEY ao seu arquivo .env.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const dataContext = prepareDataContext(data, headers);

    // Format history for Gemini
    // Gemini history uses 'parts' with 'text'
    const contents = [
      {
        role: "user",
        parts: [{ text: `AQUI ESTÃO OS DADOS QUE VOCÊ DEVE ANALISAR:\n${dataContext}\n\nAgora, responda à seguinte pergunta do usuário.` }]
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Sou o Agente 360 e estou pronto para analisar seus dados. Como posso ajudar?" }]
      },
      ...history.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      })),
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ];

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.2, // Lower temperature for more analytical/factual responses
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Erro ao chamar o Gemini:", error);
    if (error.message?.includes("API key not valid")) {
      return "Erro: Chave de API do Gemini inválida. Verifique suas configurações.";
    }
    return "Desculpe, ocorreu um erro ao processar sua análise com o Gemini. Tente novamente em instantes.";
  }
};
