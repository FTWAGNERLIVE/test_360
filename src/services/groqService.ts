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
 * SMART DISCOVERY: Analisa a estrutura e gera insights iniciais com o menor gasto de tokens possível.
 */
export const getSmartDiscovery = async (
  headers: string[],
  data: any[],
  onboardingData?: any
) => {
  if (!API_KEY) return null;

  try {
    // Amostra de 20 linhas é o "ponto doce" entre precisão e velocidade
    const sample = data.slice(0, 20); 
    
    // Blindagem de Engenharia: Pre-computar colunas que tem variacao
    const validCategoryColumns = headers.filter(h => {
      const firstVal = sample[0]?.[h];
      return sample.some(row => row[h] !== firstVal);
    });
    
    const prompt = `
[LUPA ANALYTICS - ENGINE DE MAPEAMENTO ESTRUTURAL]
Sua missão é classificar as colunas de um CSV para montar um dashboard de BI perfeito.

DADOS:
- Colunas: ${headers.join(", ")}
- Opções Válidas para Eixo X (Category): ${validCategoryColumns.join(", ")}
- Amostra: ${JSON.stringify(sample)}
- Setor: ${onboardingData?.industry || 'Geral'}

REGRAS OBRIGATÓRIAS:
1. "category": Escolha a MELHOR coluna da lista 'Opções Válidas' para ser o eixo principal. Prefira NOMES/DESCRIÇÕES sobre CÓDIGOS. Se não houver opção boa, não invente.
2. "currency": Apenas colunas de VALOR MONETÁRIO.
3. "ignore": BLOQUEIO TOTAL para: 'COLIGADA', 'ID', 'FILIAL', 'CONTA', 'DOCUMENTO', 'LANÇAMENTO'. Essas colunas são códigos e NUNCA devem ser somadas. Se você somar um ID, o gráfico fica ridículo.
4. "date": Identifique a coluna de data cronológica.

Responda APENAS o JSON:
{
  "insights": ["Frase 1", "Frase 2", "Frase 3"],
  "columnMapping": {
    "NOME_COLUNA": "type"
  }
}

Tipos válidos: "currency", "date", "number", "category", "text", "ignore".
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Você é um especialista em BI que mapeia estruturas de dados CSV para JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0, // Determinismo total para evitar erros
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Erro no Smart Discovery:", error);
    return null;
  }
};
