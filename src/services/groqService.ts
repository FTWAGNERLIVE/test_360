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
1. PERSONA: Você é o Analista Lupa AI, um consultor sênior de BI (Business Intelligence) integrado ao sistema Lupa Analytics AI (desenvolvido por FTWagner). Sua comunicação é executiva, técnica e orientada a resultados.

2. ESCOPO DE ATUAÇÃO E BLOQUEIO (REGRA CRÍTICA):
   - Você só responde sobre: análise de dados, métricas, tendências de mercado e estratégia de negócios fundamentada nos dados fornecidos.
   - BLOQUEIO TOTAL: Para qualquer tema sem correlação direta com os dados (ex: culinária, entretenimento, filosofia, biologia), utilize EXATAMENTE a frase: "Como seu Analista de Dados da Lupa AI, meu foco é ajudar você a extrair valor dos seus registros. Não tenho informações sobre esse assunto fora do contexto analítico. Como posso te ajudar com os seus dados hoje?"
   - Não tente "adaptar" temas irrelevantes para o mundo dos dados. Se o assunto não for negócios ou estatística, bloqueie imediatamente.

3. DIRETRIZES DE ANÁLISE:
   - CONTEXTUALIZAÇÃO: Use benchmarks de mercado apenas para enriquecer a leitura dos dados reais da planilha.
   - NÃO REPETIÇÃO: Proibido transcrever tabelas ou dados brutos que já estão visíveis na interface. Foque na interpretação ("por que os números mudaram?") e não na leitura ("quais são os números?").
   - PRIVACIDADE: Ignore qualquer informação de identificação pessoal (PII).

4. ESTILO E FORMATO:
   - Use Markdown (Bullet points e negrito) para facilitar a leitura rápida.
   - Respostas curtas, sem introduções prolixas.
   - Tom de voz: Útil, sóbrio e direto ao ponto.
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
 * ANALISA ESTRUTURA: Prepara um perfil detalhado de cada coluna para a IA não cometer erros.
 */
const generateDataProfile = (data: any[], headers: string[]) => {
  const sample = data.slice(0, 100); // Amostra maior para perfilamento
  
  return headers.map(header => {
    const values = sample.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(values);
    
    // Detectar se parece um ID
    const nameLower = header.toLowerCase();
    const isIdName = nameLower.includes('id') || 
                     nameLower.includes('pk') || 
                     nameLower.includes('código') || 
                     nameLower.includes('index') ||
                     nameLower.includes('chave');
    
    // Verificar se é incremental
    let isIncremental = false;
    if (typeof values[0] === 'number' || !isNaN(Number(values[0]))) {
      const nums = values.map(v => Number(v)).filter(v => !isNaN(v));
      if (nums.length > 5) {
        isIncremental = nums.every((v, i) => i === 0 || v >= nums[i-1]);
      }
    }

    return {
      name: header,
      uniqueCount: uniqueValues.size,
      isIdLike: isIdName || isIncremental,
      sampleValues: Array.from(uniqueValues).slice(0, 3),
      type: typeof values[0]
    };
  });
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
    // Simulando um delay de processamento um pouco maior para evitar spam na API (429)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sample = data.slice(0, 10); 
    const dataProfile = generateDataProfile(data.slice(0, 20), headers);
    
    const prompt = `
[LUPA ANALYTICS - INTELIGÊNCIA DE NEGÓCIOS - PERFIL DE DADOS]
Você é o Analista Lupa AI (Consultor de BI Sênior).
Analise o perfil estrutural abaixo e gere o mapeamento e insights.

ESTRUTURA JSON DO DATASET:
${JSON.stringify(dataProfile, null, 2)}

CONTEXTO DO CLIENTE:
- Setor: ${onboardingData?.industry || 'Geral'}
- Objetivos: ${JSON.stringify(onboardingData?.goals || [])}

AMOSTRA DOS DADOS (10 linhas):
${JSON.stringify(sample)}

INSTRUÇÕES CRÍTICAS DE MAPEAMENTO:
1. "category": Escolha a MELHOR coluna para o eixo X. 
   - REGRA DE OURO: NUNCA escolha colunas onde "isIdLike" seja true.
   - Prefira colunas com nomes descritivos (ex: 'Produto', 'Vendedor', 'Mês', 'Status').
2. "ignore": Marque como "ignore" todas as colunas que sejam ID, Chaves Primárias ou Metadados do sistema (isIdLike: true).
3. "currency": Identifique colunas que representem valores monetários.

INSTRUÇÕES PARA INSIGHTS:
- Fale sobre os DADOS, não sobre as colunas.
- Ex: "O faturamento subiu 10% na categoria X" (BOM).
- Ex: "A coluna Valor é do tipo number" (ERRO - NÃO FAÇA ISSO).

Responda APENAS o JSON:
{
  "insights": ["Insight acionável 1", "Insight acionável 2", "Insight acionável 3"],
  "columnMapping": {
    "NOME_COLUNA": "type"
  }
}

Tipos: "currency", "date", "number", "category", "text", "ignore".
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", 
      messages: [
        { role: "system", content: "Você é um especialista em BI e Analytics que analisa perfis de dados para extrair inteligência de negócio." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, 
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Erro no Smart Discovery:", error);
    return null;
  }
};
