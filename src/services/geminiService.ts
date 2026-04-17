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
    return "Erro: Chave de API do Gemini não configurada. Por favor, adicione VITE_GEMINI_API_KEY ao seu arquivo .env e REINICIE o terminal (npm run dev).";
  }

  // Lista de modelos para tentar (fallback chain)
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Tentando chat com o modelo: ${modelName}...`);
      const dataContext = prepareDataContext(data, headers);
      
      const model = genAI.getGenerativeModel({ model: modelName });

      // Mensagens de inicialização
      const startMessages = [
        {
          role: "user",
          parts: [{ text: `AQUI ESTÃO OS DADOS QUE VOCÊ DEVE ANALISAR:\n${dataContext}\n\nEntendido sua função como Agente 360?` }]
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Sou o Agente 360 da Creattive. Analisei os dados fornecidos e estou pronto para responder suas perguntas com base nesse dataset." }]
        }
      ];

      const historyMessages = history.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({
        history: [...startMessages, ...historyMessages],
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Erro com o modelo ${modelName}:`, error.message);
      
      // Se o erro for 404 (Not Found), tentamos o próximo modelo da lista
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        continue;
      }
      
      // Se for erro de chave ou permissão, paramos por aqui
      if (error.message?.includes("API key not valid") || error.message?.includes("access denied")) {
        break;
      }
      
      // Para outros erros (como quota), também paramos
      break;
    }
  }

  // Se chegou aqui, todos os modelos falharam
  console.error("❌ Todos os modelos do Gemini falharam:", lastError);
  
  if (lastError?.message?.includes("API key not valid")) {
    return "Erro: Sua chave de API do Gemini é inválida. Por favor, gere uma nova no Google AI Studio e verifique o arquivo .env.";
  }

  return "Ops! Ocorreu um erro na análise de dados após tentar vários modelos do Gemini. Verifique sua conexão e sua chave de API.";
};
