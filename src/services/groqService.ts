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
  
  // Limitar a amostra a 15 linhas no máximo para não estourar o limite de tokens da API do Groq (TPM 8000)
  const sampleLimit = Math.min(totalRecords, 15);
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
3. CONTEXTO ANALÍTICO: Você tem acesso às ESTATÍSTICAS GERAIS, ESTATÍSTICAS AGRUPADAS POR CATEGORIA (Group-By) e a uma AMOSTRA DOS DADOS.
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
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it"
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

export interface DashboardConfig {
  primaryMetric: string;
  secondaryMetric: string;
  primaryCategory: string;
  primaryDate: string;
  chartTitles: {
    barChart?: string;
    donutChart?: string;
    areaChart?: string;
    radarChart?: string;
  };
}

export interface SmartDiscoveryResult {
  insights?: string[];
  columnMapping?: Record<string, 'currency' | 'number' | 'date' | 'category' | 'text' | 'ignore'>;
  dashboardConfig?: DashboardConfig;
}

/**
 * PRÉ-ANÁLISE LOCAL DETERMINÍSTICA DA IA:
 * Lê campos, títulos e amostra dos dados para interpretar valores, datas, nomes, categorias e IDs,
 * orientando o código sobre como configurar cada gráfico e card.
 */
export const runLocalPreAnalysis = (
  headers: string[],
  data: any[],
  onboardingData?: any
): SmartDiscoveryResult => {
  if (!headers || !data || data.length === 0) {
    return {
      columnMapping: {},
      dashboardConfig: {
        primaryMetric: '',
        secondaryMetric: '',
        primaryCategory: '',
        primaryDate: '',
        chartTitles: {}
      }
    };
  }

  const columnMapping: Record<string, 'currency' | 'number' | 'date' | 'category' | 'text' | 'ignore'> = {};
  const sampleRows = data.slice(0, 20);

  const isDateName = (h: string) => {
    const low = h.toLowerCase();
    return (
      low.includes('data') || low.includes('date') || low.includes('vencimento') ||
      low.includes('realizacao') || low.includes('realização') || low.includes('nascimento') ||
      low.includes('matricula') || low.includes('matrícula') || low.includes('criacao') ||
      low.includes('admissao') || low.includes('validade')
    );
  };

  const isCurrencyName = (h: string) => {
    const low = h.toLowerCase();
    return (
      low.includes('valor') || low.includes('preço') || low.includes('preco') ||
      low.includes('faturamento') || low.includes('saldo') || low.includes('receita') ||
      low.includes('despesa') || low.includes('lucro') || low.includes('mensalidade') ||
      low.includes('custo') || low.includes('pago') || low.includes('total')
    );
  };

  const isIdName = (h: string) => {
    const low = h.toLowerCase().trim();
    return (
      low === 'id' || low.includes('id_') || low.endsWith('_id') || low.includes(' id') ||
      low.includes('código') || low.includes('codigo') || low.includes('cpf') ||
      low.includes('cnpj') || low.includes('cep') || low.includes('telef') || low.includes('fone') ||
      low === 'nome' || low.includes('nome_') || low.endsWith('_nome') || low.includes('nome ') ||
      low === 'colaborador' || low.includes('colaborador_') || low.includes('colaborador ') ||
      low === 'aluno' || low.includes('aluno_') || low === 'cliente' || low.includes('cliente_') ||
      low === 'paciente' || low.includes('paciente_') || low === 'funcionario' || low.includes('funcionário') ||
      low.includes('email') || low.includes('e-mail') || low.includes('matricula') || low.includes('matrícula') ||
      low.includes('observacao') || low.includes('observação') || low.includes('descricao') || low.includes('descrição')
    );
  };

  headers.forEach(h => {
    if (isIdName(h)) {
      columnMapping[h] = 'ignore';
      return;
    }

    if (isDateName(h)) {
      columnMapping[h] = 'date';
      return;
    }

    const sampleVals = sampleRows.map(r => r[h]).filter(v => v !== null && v !== undefined && v !== '');

    // Checar se é número serial do Excel (entre 30000 e 70000 com até 5 dígitos)
    const dateSerialCount = sampleVals.filter(v => {
      const num = Number(v);
      return !isNaN(num) && num > 30000 && num < 70000 && String(v).trim().length <= 5;
    }).length;

    if (dateSerialCount >= sampleVals.length * 0.5 && sampleVals.length > 0) {
      columnMapping[h] = 'date';
      return;
    }

    if (isCurrencyName(h)) {
      columnMapping[h] = 'currency';
      return;
    }

    // Checar se é numérico
    const numCount = sampleVals.filter(v => {
      const cleaned = String(v).replace(/[R$\s.]/g, '').replace(',', '.');
      return !isNaN(Number(cleaned));
    }).length;

    if (numCount >= sampleVals.length * 0.7 && sampleVals.length > 0) {
      columnMapping[h] = 'number';
      return;
    }

    // Checar se é categórico (poucos valores únicos em relação às linhas)
    const uniqueCount = new Set(sampleVals.map(v => String(v).trim())).size;
    if (uniqueCount > 0 && uniqueCount <= 25) {
      columnMapping[h] = 'category';
      return;
    }

    columnMapping[h] = 'text';
  });

  const currencyCols = Object.entries(columnMapping).filter(([, type]) => type === 'currency').map(([col]) => col);
  const numberCols = Object.entries(columnMapping).filter(([, type]) => type === 'number').map(([col]) => col);
  const categoryCols = Object.entries(columnMapping).filter(([, type]) => type === 'category').map(([col]) => col);
  const dateCols = Object.entries(columnMapping).filter(([, type]) => type === 'date').map(([col]) => col);

  const primaryMetric = currencyCols[0] || numberCols[0] || '';
  const secondaryMetric = currencyCols[1] || numberCols[1] || (numberCols[0] !== primaryMetric ? numberCols[0] : '');
  const primaryCategory = categoryCols[0] || headers.find(h => columnMapping[h] === 'text') || headers[0] || '';
  const primaryDate = dateCols[0] || '';

  const companyPrefix = onboardingData?.companyName ? ` (${onboardingData.companyName})` : '';

  const chartTitles = {
    barChart: primaryMetric && primaryCategory ? `Análise Comparativa de ${primaryMetric} por ${primaryCategory}${companyPrefix}` : `Análise Comparativa por Categoria${companyPrefix}`,
    donutChart: primaryCategory ? `Distribuição Proporcional em ${primaryCategory}${companyPrefix}` : `Distribuição dos Dados${companyPrefix}`,
    areaChart: primaryMetric && primaryDate ? `Evolução Temporal de ${primaryMetric} (${primaryDate})${companyPrefix}` : (primaryDate ? `Evolução Temporal (${primaryDate})${companyPrefix}` : `Evolução Temporal${companyPrefix}`),
    radarChart: primaryCategory ? `Análise Multidimensional (${primaryCategory})${companyPrefix}` : `Análise Multidimensional${companyPrefix}`
  };

  return {
    columnMapping,
    dashboardConfig: {
      primaryMetric,
      secondaryMetric,
      primaryCategory,
      primaryDate,
      chartTitles
    }
  };
};

/**
 * SMART DISCOVERY: Analisa a estrutura e gera inteligência orientando a montagem do dashboard.
 */
export const getSmartDiscovery = async (
  headers: string[],
  data: any[],
  onboardingData?: any
): Promise<SmartDiscoveryResult | null> => {
  const localAnalysis = runLocalPreAnalysis(headers, data, onboardingData);

  if (!API_KEY) return localAnalysis;

  try {
    const sample = data.slice(0, 10); 
    const dataProfile = generateDataProfile(data.slice(0, 20), headers);
    
    const prompt = `
[LUPA ANALYTICS - INTELIGÊNCIA DE NEGÓCIOS - PRÉ-ANÁLISE DE DADOS E ORIENTAÇÃO DO DASHBOARD]
Você é o Analista Lupa AI (Consultor de BI Sênior).
Sua tarefa é fazer a PRÉ-ANÁLISE dos campos, títulos e dados abaixo para orientar o código sobre qual gráfico montar e qual configuração utilizar.

ESTRUTURA DOS DADOS:
${JSON.stringify(dataProfile, null, 2)}

PRÉ-ANÁLISE SUGERIDA (LOCAL):
${JSON.stringify(localAnalysis, null, 2)}

CONTEXTO DO CLIENTE:
- Setor: ${onboardingData?.industry || 'Geral'}
- Objetivos: ${JSON.stringify(onboardingData?.goals || [])}

AMOSTRA DOS DADOS (10 linhas):
${JSON.stringify(sample)}

INSTRUÇÕES DE ORIENTAÇÃO PARA O DASHBOARD:
1. Analise títulos e conteúdos das colunas para classificar o tipo correto de cada um: "currency", "date", "number", "category", "text", "ignore".
2. Defina "primaryMetric": A melhor coluna de valor/moeda/métrica para os gráficos e cards.
3. Defina "secondaryMetric": Segunda coluna numérica importante (se houver).
4. Defina "primaryCategory": A melhor coluna categórica (ex: Produto, Curso, Status, Setor) para agrupar e montar os eixos X dos gráficos.
5. Defina "primaryDate": A melhor coluna de data (ex: data_realizacao, Data_Matricula, data_vencimento) para a linha do tempo. NUNCA escolha colunas de data como métricas numéricas.
6. Crie "chartTitles" com títulos executivos acionáveis de negócio para cada gráfico (barChart, donutChart, areaChart, radarChart).

Responda APENAS o JSON:
{
  "insights": ["Insight de negócio 1", "Insight de negócio 2"],
  "columnMapping": {
    "NOME_COLUNA": "type"
  },
  "dashboardConfig": {
    "primaryMetric": "NOME_COLUNA",
    "secondaryMetric": "NOME_COLUNA",
    "primaryCategory": "NOME_COLUNA",
    "primaryDate": "NOME_COLUNA",
    "chartTitles": {
      "barChart": "Título do Gráfico de Barras",
      "donutChart": "Título do Donut KPI",
      "areaChart": "Título do Gráfico de Evolução Temporal",
      "radarChart": "Título do Gráfico de Radar"
    }
  }
}
`;

    const CANDIDATE_MODELS = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it"
    ];

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model, 
          messages: [
            { role: "system", content: "Você é um especialista em BI e Analytics que orienta a estruturação de dashboards executivos a partir da pré-análise dos dados." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1, 
          max_tokens: 1500,
          response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const cleanedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const parsed = JSON.parse(cleanedContent);

        if (parsed && (parsed.columnMapping || parsed.dashboardConfig)) {
          return {
            insights: parsed.insights || localAnalysis.insights || [],
            columnMapping: { ...localAnalysis.columnMapping, ...parsed.columnMapping },
            dashboardConfig: {
              ...localAnalysis.dashboardConfig,
              ...parsed.dashboardConfig,
              chartTitles: {
                ...localAnalysis.dashboardConfig?.chartTitles,
                ...parsed.dashboardConfig?.chartTitles
              }
            }
          };
        }
      } catch (err) {
        console.warn(`⚠️ SmartDiscovery: modelo ${model} indisponível, tentando próximo...`);
      }
    }
    return localAnalysis;
  } catch (error) {
    console.error("Erro no Smart Discovery:", error);
    return localAnalysis;
  }
};
