import OpenAI from "openai";

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

// dangerouslyAllowBrowser é necessário para rodar no frontend (React)
const openai = new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const prepareDataContext = (data: any[], headers: string[]) => {
  const totalRecords = data.length;
  const columns = headers.join(", ");
  
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

export const chatWithOpenAI = async (
  userMessage: string, 
  history: ChatMessage[], 
  data: any[], 
  headers: string[]
) => {
  if (!API_KEY) {
    return "Erro: Chave de API da OpenAI não configurada. Por favor, adicione VITE_OPENAI_API_KEY ao seu arquivo .env e crie a chave no site da OpenAI.";
  }

  try {
    const dataContext = prepareDataContext(data, headers);
    
    const systemMessage = {
      role: "system",
      content: dataContext
    };

    const formattedHistory: any[] = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Modelo rápido e excelente para dados
      messages: [
        systemMessage,
        ...formattedHistory,
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || "Desculpe, não consegui formular uma resposta.";
  } catch (error: any) {
    console.error("❌ Erro ao chamar a OpenAI:", error);

    if (error.status === 401 || error.message?.includes("Incorrect API key")) {
      return "Erro: Sua chave de API da OpenAI é inválida. Acesse platform.openai.com/api-keys para gerar uma correta.";
    }

    if (error.status === 429 || error.message?.includes("insufficient_quota")) {
      return "Erro: O limite de créditos da sua conta da OpenAI acabou. Você precisa adicionar fundos em platform.openai.com.";
    }

    return "Ops! Ocorreu um erro na conexão com a OpenAI. Verifique sua chave de API e tente novamente.";
  }
};
