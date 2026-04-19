import OpenAI from "openai";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// O SDK da OpenAI é compatível com o Groq, basta apontar para a base URL deles!
const groq = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const prepareDataContext = (data: any[], headers: string[], onboardingData?: any) => {
  const totalRecords = data.length;
  const columns = headers.join(", ");
  
  const sampleData = data.slice(0, 10).map(row => {
    const simplifiedRow: any = {};
    headers.forEach(h => {
      simplifiedRow[h] = row[h];
    });
    return simplifiedRow;
  });

  let onboardingContext = "";
  if (onboardingData && Object.keys(onboardingData).length > 0) {
    onboardingContext = `
[INFORMAÇÃO INTERNA DE CALIBRAGEM - NÃO MENCIONE ISSO]
Nível Técnico do Usuário: ${onboardingData.experience || 'Desconhecido'}
Foco Principal: ${onboardingData.goals || 'Análise Otimizada'}

REGRA CRÍTICA DE PRIVACIDADE: É estritamente proibido mencionar os dados pessoais, de perfil ou de negócio do usuário na sua resposta. Não diga coisas como "Como você é do cargo X" ou "Vejo que seu objetivo é Y". Foque 100% dos seus textos e respostas exclusivamenta na análise dos dados da planilha. Utilize as informações acima apenas internamente para adequar a complexidade da sua linguagem.
`;
  }

  return `
CONTEXTO DO DATASET (Lupa Analytics AI):
- Total de registros: ${totalRecords}
- Colunas disponíveis: ${columns}
- Amostra dos dados (primeiras 10 linhas):
${JSON.stringify(sampleData, null, 2)}
${onboardingContext}

INSTRUÇÕES:
1. Você é o Analista Lupa AI, um assistente de inteligência de dados de última geração.
2. Sua função é responder perguntas estritamente baseadas nos dados fornecidos acima e no contexto de negócio do usuário se disponível.
3. Se o usuário perguntar algo que não pode ser respondido com os dados, explique educadamente que você só tem acesso aos dados carregados no dashboard.
4. Mantenha um tom profissional, prestativo e analítico, altamente focado em resultados de negócio.
5. REGRA DE FORMATAÇÃO: NUNCA crie tabelas repetindo os dados da planilha. O cliente já está vendo os elementos listados na tela do dashboard. Responda de forma extremamente fluida, limpa e direta. Use apenas parágrafos curtos e "bullet points" (listas) para destacar os insights precisos, as maiores discrepâncias, percentuais importantes e as suas conclusões estratégicas.
6. Tente identificar tendências ou pontos interessantes nos dados associando com os objetivos do usuário.
7. O usuário está utilizando o sistema Lupa Analytics AI desenvolvido por FTWagner.
`;
};

export const chatWithGroq = async (
  userMessage: string, 
  history: ChatMessage[], 
  data: any[], 
  headers: string[],
  onboardingData?: any
) => {
  if (!API_KEY) {
    return "Erro: Chave de API do Groq não configurada. Por favor, adicione VITE_GROQ_API_KEY ao seu arquivo .env e reinicie o servidor com 'npm run dev'.";
  }

  try {
    const dataContext = prepareDataContext(data, headers, onboardingData);
    
    const systemMessage = {
      role: "system",
      content: dataContext
    };

    const formattedHistory: any[] = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Atualizado para o modelo suportado mais recente
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
    console.error("❌ Erro ao chamar o Groq:", error);

    if (error.status === 401 || error.message?.includes("Invalid API Key")) {
      return "Erro: Sua chave de API do Groq é inválida. Acesse console.groq.com/keys para pegar a chave correta.";
    }

    return "Ops! Ocorreu um erro na conexão com a inteligência artificial. Verifique sua conexão e sua chave de API.";
  }
};
