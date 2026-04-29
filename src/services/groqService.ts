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
[CONTEXTO DE NEGÓCIO DO CLIENTE - USE PARA CALIBRAR SEU TOM E INSIGHTS]
- Empresa: ${onboardingData.companyName || 'Não informado'}
- Setor/Indústria: ${onboardingData.industry || 'Não informado'}
- Objetivos Principais: ${Array.isArray(onboardingData.goals) ? onboardingData.goals.join(", ") : (onboardingData.goals || 'Análise geral')}
- Perguntas que o cliente quer responder: ${onboardingData.specificQuestions || 'Nenhuma específica'}

REGRA DE PRIVACIDADE: Use essas informações apenas para dar respostas mais inteligentes e personalizadas para o setor do cliente. Não repita os dados pessoais dele na resposta final.
`;
  }

  const systemInstructions = `
1. Você é o Analista Lupa AI, um consultor sênior de inteligência de negócios.
2. FOCO TOTAL EM DADOS: Sua função é analisar os dados da planilha e fornecer insights estratégicos.
3. REGRA DE OURO (ASSUNTOS FORA DE PAUTA): Se o usuário fizer perguntas sobre assuntos totalmente irrelevantes para análise de dados ou para o negócio do cliente (ex: receitas de cozinha, piadas aleatórias, biologia, curiosidades sobre animais como "ovos e galinhas"), você deve responder educadamente: "Como seu Analista de Dados da Lupa AI, meu foco é ajudar você a extrair valor dos seus registros. Não tenho informações sobre esse assunto fora do contexto analítico. Como posso te ajudar com os seus dados hoje?"
4. CONTEXTO DE MERCADO: Você PODE (e deve) usar seu conhecimento geral para comparar os dados da planilha com tendências de mercado. Ex: Se os dados mostram vendas de casas, e o usuário perguntar como está o mercado, você pode associar os dados dele com a realidade econômica atual.
5. PRIVACIDADE: Nunca mencione informações pessoais do onboarding na resposta.
6. ESTILO: Respostas curtas, fluidas, em bullet points, sem repetir tabelas que o usuário já está vendo.
7. O usuário está utilizando o sistema Lupa Analytics AI desenvolvido por FTWagner.
`;

  return `
CONTEXTO DO DATASET (Lupa Analytics AI):
- Total de registros: ${totalRecords}
- Colunas disponíveis: ${columns}
- Amostra dos dados (primeiras 10 linhas):
${JSON.stringify(sampleData, null, 2)}
${onboardingContext}

INSTRUÇÕES DO SISTEMA:
${systemInstructions}
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

/**
 * SMART DISCOVERY: Analisa a estrutura e gera insights iniciais com o menor gasto de tokens possível.
 */
export const getSmartDiscovery = async (
  headers: string[],
  data: any[],
  onboardingData?: any
) => {
  if (!API_KEY) return null;

  try {
    // Pegamos apenas os nomes das colunas e as 5 primeiras linhas (Economia de tokens!)
    const sample = data.slice(0, 5);
    
    const prompt = `
Analise a estrutura deste CSV:
Colunas: ${headers.join(", ")}
Amostra (5 linhas): ${JSON.stringify(sample)}
Empresa: ${onboardingData?.companyName || 'N/A'} - Setor: ${onboardingData?.industry || 'N/A'}

Responda EXCLUSIVAMENTE um objeto JSON (sem textos antes ou depois) com:
1. "insights": Lista de 3 frases curtas e impactantes com insights de negócio iniciais.
2. "columnMapping": Um objeto onde a CHAVE é o nome da coluna e o VALOR é o tipo ("currency", "date", "number", "category" ou "text"). Importante: Identifique a PRINCIPAL coluna de categoria (eixo X de gráficos comparativos) como "category" e a PRINCIPAL coluna temporal (eixo X temporal) como "date". Colunas monetárias devem ser "currency" e números comuns "number". Outros textos "text".

Exemplo de formato esperado:
{
  "insights": ["Tendência de alta em X", "O setor Y representa 40% do total", "A média de Z está acima do esperado"],
  "columnMapping": {"Preço": "currency", "Data": "date", "Setor": "category", "Quantidade": "number"}
}
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Você é um motor de análise de dados que responde apenas em JSON puro." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Temperatura baixa para ser mais preciso e consistente
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (error) {
    console.error("Smart Discovery Error:", error);
    return null;
  }
};
