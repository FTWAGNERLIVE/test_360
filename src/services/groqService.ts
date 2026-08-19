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
  const categoricalHeaders: string[] = [];
  const numericHeaders: string[] = [];

  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
    
    // Identificar tipo de dado
    const numericValues = values.map(v => {
      if (typeof v === 'number') return v;
      const parsed = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? null : parsed;
    }).filter(v => v !== null) as number[];

    if (numericValues.length > values.length * 0.8 && numericValues.length > 0) {
      numericHeaders.push(header);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      stats[header] = {
        tipo: 'numérico',
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        media: Number(avg.toFixed(2)),
        soma: Number(sum.toFixed(2)),
        totalValores: numericValues.length
      };
    } else {
      categoricalHeaders.push(header);
      const counts: any = {};
      values.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
      });
      
      const sortedCategories = Object.entries(counts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10);

      stats[header] = {
        tipo: 'categórico',
        topCategorias: sortedCategories.map(([val, count]) => `${val} (${count} ocorrências)`),
        unicos: Object.keys(counts).length
      };
    }
  });

  // Cruzamento Automático (Group By Categorias vs Numéricos)
  const groupStats: any = {};
  categoricalHeaders.slice(0, 4).forEach(catCol => {
    numericHeaders.slice(0, 4).forEach(numCol => {
      const groups: Record<string, number[]> = {};
      data.forEach(row => {
        const catVal = String(row[catCol] ?? 'Não Informado').trim();
        const rawNum = row[numCol];
        let numVal: number | null = null;
        if (typeof rawNum === 'number') numVal = rawNum;
        else if (rawNum !== null && rawNum !== undefined) {
          const parsed = parseFloat(String(rawNum).replace(',', '.').replace(/[^\d.-]/g, ''));
          if (!isNaN(parsed)) numVal = parsed;
        }

        if (numVal !== null) {
          if (!groups[catVal]) groups[catVal] = [];
          groups[catVal].push(numVal);
        }
      });

      const groupSummary: any = {};
      Object.entries(groups).forEach(([catVal, nums]) => {
        if (nums.length > 0) {
          const sum = nums.reduce((a, b) => a + b, 0);
          groupSummary[catVal] = {
            qtd: nums.length,
            media: Number((sum / nums.length).toFixed(2)),
            min: Math.min(...nums),
            max: Math.max(...nums),
            soma: Number(sum.toFixed(2))
          };
        }
      });

      if (Object.keys(groupSummary).length > 0 && Object.keys(groupSummary).length <= 20) {
        groupStats[`${catCol} vs ${numCol}`] = groupSummary;
      }
    });
  });

  if (Object.keys(groupStats).length > 0) {
    stats["_ESTATISTICAS_AGRUPADAS_POR_CATEGORIA"] = groupStats;
  }

  return JSON.stringify(stats, null, 2);
};

const prepareDataContext = (data: any[], headers: string[], onboardingData?: any) => {
  const totalRecords = data.length;
  const columns = headers.join(", ");
  
  // Se o conjunto tiver até 300 linhas, enviamos a tabela inteira!
  // Se tiver mais de 300, enviamos 50 linhas como amostra expandida.
  const sampleLimit = totalRecords <= 300 ? totalRecords : 50;
  const sampleData = data.slice(0, sampleLimit).map(row => {
    const simplifiedRow: any = {};
    headers.forEach(h => {
      simplifiedRow[h] = row[h];
    });
    return simplifiedRow;
  });

  // Resumo estatístico enriquecido com agrupamentos por categoria (Group-By)
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
3. CONTEXTO ANALÍTICO: Você tem acesso às ESTATÍSTICAS GERAIS, ESTATÍSTICAS AGRUPADAS POR CATEGORIA (Group-By) e à TABELA DE DADOS (completa se tiver até 300 registros ou amostra expandida).
4. REGRAS:
   - Use Markdown para formatação (tabelas, negrito, tópicos).
   - Seja direto e executivo.
   - Se perguntarem sobre médias, somas ou agrupamentos por categoria (ex: "média por status", "faturamento por setor"), consulte as ESTATÍSTICAS AGRUPADAS POR CATEGORIA para responder com precisão exata.
   - PRIORIZE INSIGHTS: Não diga apenas "o valor é X", diga "o valor é X, o que indica uma tendência de Y".
`;

  return `
--- DATASET SUMMARY ---
Total de registros: ${totalRecords}
Colunas: ${columns}

--- ESTATÍSTICAS GERAIS E AGRUPADAS POR CATEGORIA ---
${statsSummary}

--- REGISTROS / AMOSTRA DOS DADOS ---
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

    const CANDIDATE_MODELS = [
      "groq/compound-mini",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ];

    let lastError: any = null;
    for (const model of CANDIDATE_MODELS) {
      try {
        const stream = await groq.chat.completions.create({
          model,
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
            // Limpar tags <think> do streaming se houver
            const cleanedResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trimStart();
            onStream(cleanedResponse);
          }
        }

        const finalCleaned = fullResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        return finalCleaned;
      } catch (err: any) {
        lastError = err;
        console.warn(`⚠️ Modelo ${model} indisponível no Groq, tentando o próximo...`, err?.message || err);
      }
    }

    throw lastError || new Error("Nenhum modelo Groq disponível.");
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

    const CANDIDATE_MODELS = [
      "groq/compound-mini",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ];

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model, 
          messages: [
            { role: "system", content: "Você é um especialista em BI e Analytics que analisa perfis de dados para extrair inteligência de negócio." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1, 
          max_tokens: 1500,
          response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const cleanedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        return JSON.parse(cleanedContent);
      } catch (err) {
        console.warn(`⚠️ SmartDiscovery: modelo ${model} indisponível, tentando próximo...`);
      }
    }
    return null;
  } catch (error) {
    console.error("Erro no Smart Discovery:", error);
    return null;
  }
};
