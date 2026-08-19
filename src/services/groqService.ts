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

const calculateDataStats = (data: any[], headers: string[]) => {
  if (!data || data.length === 0) return "Sem dados para análise.";

  const stats: any = {};
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
    
    // Identificar tipo de dado
    const numericValues = values.map(v => {
      if (typeof v === 'number') return v;
      const parsed = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? null : parsed;
    }).filter(v => v !== null) as number[];

    if (numericValues.length > values.length * 0.8) {
      // É uma coluna numérica
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      stats[header] = {
        tipo: 'numérico',
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        media: avg.toFixed(2),
        soma: sum.toFixed(2),
        totalValores: numericValues.length
      };
    } else {
      // É uma coluna categórica/texto
      const counts: any = {};
      values.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
      });
      
      const sortedCategories = Object.entries(counts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5);

      stats[header] = {
        tipo: 'categórico',
        topCategorias: sortedCategories.map(([val, count]) => `${val} (${count} ocorrências)`),
        unicos: Object.keys(counts).length
      };
    }
  });

  return JSON.stringify(stats, null, 2);
};

const prepareDataContext = (data: any[], headers: string[], onboardingData?: any) => {
  const totalRecords = data.length;
  const columns = headers.join(", ");
  
  // Amostra pequena para estrutura
  const sampleData = data.slice(0, 5).map(row => {
    const simplifiedRow: any = {};
    headers.forEach(h => {
      simplifiedRow[h] = row[h];
    });
    return simplifiedRow;
  });

  // Resumo estatístico para inteligência
  const statsSummary = calculateDataStats(data, headers);

  let onboardingContext = "";
  if (onboardingData && Object.keys(onboardingData).length > 0) {
    onboardingContext = `
[CONTEXTO DE NEGÓCIO DO CLIENTE]
- Empresa: ${onboardingData.companyName || 'Não informado'}
- Setor: ${onboardingData.industry || 'Não informado'}
- Objetivos: ${Array.isArray(onboardingData.goals) ? onboardingData.goals.join(", ") : (onboardingData.goals || 'Análise geral')}
`;
  }

  const systemInstructions = `
1. PERSONA: Você é o Analista Lupa AI, consultor sênior de BI e Estratégia.
2. MISSÃO: Analisar o dataset fornecido e responder perguntas de negócio.
3. CONTEXTO ANALÍTICO: Você recebeu um RESUMO ESTATÍSTICO do dataset inteiro. Use esses números para dar respostas precisas sobre totais, médias e tendências, mesmo que você não veja todas as linhas individualmente.
4. REGRAS:
   - Use Markdown para formatação.
   - Seja direto e executivo.
   - Se perguntarem algo fora de dados/negócios, use a frase padrão de bloqueio.
   - PRIORIZE INSIGHTS: Não diga apenas "o valor é X", diga "o valor é X, o que indica uma tendência de Y".
`;

  return `
--- DATASET SUMMARY ---
Total de registros: ${totalRecords}
Colunas: ${columns}

--- ESTATÍSTICAS GERAIS (BASEADAS NO DATASET COMPLETO) ---
${statsSummary}

--- AMOSTRA INICIAL ---
${JSON.stringify(sampleData, null, 2)}

${onboardingContext}

--- INSTRUÇÕES ---
${systemInstructions}
`;
};

export const chatWithGroq = async (
  userMessage: string, 
  history: ChatMessage[], 
  data: any[], 
  headers: string[],
  onboardingData: any,
  onStream: (chunk: string) => void
) => {
  if (!API_KEY) {
    onStream("Erro: Chave de API do Groq não configurada.");
    return;
  }

  try {
    const dataContext = prepareDataContext(data, headers, onboardingData);
    
    const messages: any[] = [
      { role: "system", content: dataContext },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userMessage }
    ];

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.5,
      max_tokens: 2000,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        onStream(fullResponse);
      }
    }

    return fullResponse;
  } catch (error: any) {
    console.error("❌ Erro no streaming do Groq:", error);
    onStream("Ops! Ocorreu um erro na conexão com a inteligência artificial.");
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
