import OpenAI from "openai";
import { analyzeData } from "./src/services/dataAnalyzer";
import { SmartDiscoveryResult } from "./src/services/groqService";

const API_KEY = (import.meta as any).env ? (import.meta as any).env.VITE_GROQ_API_KEY : "";
const groq = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true,
});

export const getSmartDiscovery = async (
  headers: string[],
  data: any[],
  onboardingData?: any
): Promise<SmartDiscoveryResult | null> => {
  const analysis = analyzeData(headers, data);
  const mapping = analysis.mapping;
  
  const columnMapping: Record<string, any> = {};
  analysis.profiles.forEach((p: any) => { columnMapping[p.name] = p.type; });

  const baseConfig = {
    insights: [],
    columnMapping,
    dashboardConfig: {
      primaryMetric: mapping.primaryMetric,
      secondaryMetric: mapping.secondaryMetric,
      primaryCategory: mapping.primaryCategory,
      primaryDate: mapping.primaryDate,
      donutCategory: mapping.donutCategory,
      radarCategory: mapping.radarCategory,
      chartTitles: {
        barChart: mapping.primaryMetric && mapping.primaryCategory ? `Análise Comparativa de ${mapping.primaryMetric} por ${mapping.primaryCategory}` : 'Análise Comparativa',
        donutChart: mapping.donutCategory ? `Distribuição Proporcional em ${mapping.donutCategory}` : 'Distribuição dos Dados',
        areaChart: mapping.primaryMetric && mapping.primaryDate ? `Evolução Temporal de ${mapping.primaryMetric}` : 'Evolução Temporal',
        radarChart: mapping.radarCategory ? `Perfil por ${mapping.radarCategory}` : 'Análise Multidimensional'
      }
    }
  };

  if (!API_KEY) return baseConfig as any;

  try {
    const columnsContext = analysis.profiles.map((p: any) => `- ${p.name} (Tipo: ${p.type}, Valores únicos: ${p.uniqueCount})`).join('\n');

    const prompt = `
[LUPA ANALYTICS - DASHBOARD INTELIGENTE]
Você é um Cientista de Dados Sênior. Sua tarefa é analisar o contexto do cliente e as colunas de dados disponíveis para montar o dashboard perfeito.

CONTEXTO DO CLIENTE:
- Empresa: ${onboardingData?.companyName || 'Não informado'}
- Setor: ${onboardingData?.industry || 'Geral'}
- Fonte dos Dados: ${onboardingData?.dataSource || 'Não informado'}
- Objetivos Principais: ${JSON.stringify(onboardingData?.goals || [])}
- Dúvidas/Questões Específicas do Cliente: ${onboardingData?.specificQuestions || 'Nenhuma'}

COLUNAS DISPONÍVEIS NA BASE DE DADOS:
${columnsContext}

MAPEAMENTO MATEMÁTICO INICIAL (Pode e DEVE ser ajustado por você se não fizer sentido pro negócio):
- primaryMetric: ${mapping.primaryMetric || 'N/A'}
- primaryCategory: ${mapping.primaryCategory || 'N/A'}
- donutCategory: ${mapping.donutCategory || 'N/A'}
- radarCategory: ${mapping.radarCategory || 'N/A'}
- primaryDate: ${mapping.primaryDate || 'N/A'}

SUA TAREFA:
1. REVISAR O MAPEAMENTO: Escolha as melhores colunas EXATAMENTE como estão escritas na lista de "Colunas Disponíveis" para responder às dúvidas do cliente. Se o mapeamento inicial for ruim para os objetivos, troque!
2. TÍTULOS: Criar Títulos curtos, executivos e profissionais (estilo consultoria) para os 4 gráficos (barChart, donutChart, areaChart, radarChart).
3. INSIGHTS: Criar 2 a 3 Insights curtos sugerindo o que o usuário deve procurar focar nesses gráficos.

Responda APENAS um JSON válido neste exato formato:
{
  "dashboardConfig": {
    "primaryMetric": "Nome da coluna...",
    "primaryCategory": "Nome da coluna...",
    "donutCategory": "Nome da coluna...",
    "radarCategory": "Nome da coluna...",
    "primaryDate": "Nome da coluna...",
    "chartTitles": {
      "barChart": "Título...",
      "donutChart": "Título...",
      "areaChart": "Título...",
      "radarChart": "Título..."
    }
  },
  "insights": [
    "Insight 1...",
    "Insight 2..."
  ]
}
`;

    const CANDIDATE_MODELS = [
      "qwen-2.5-32b",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768"
    ];

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model, 
          messages: [
            { role: "system", content: "Você é um especialista em BI e retorna APENAS JSON válido." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1, 
          max_tokens: 600,
          response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const cleanedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const parsed = JSON.parse(cleanedContent);

        if (parsed && (parsed.dashboardConfig || parsed.insights)) {
          return {
            ...baseConfig,
            insights: parsed.insights || baseConfig.insights,
            dashboardConfig: {
              ...baseConfig.dashboardConfig,
              ...(parsed.dashboardConfig || {}),
              chartTitles: {
                ...baseConfig.dashboardConfig.chartTitles,
                ...(parsed.dashboardConfig?.chartTitles || parsed.chartTitles || {})
              }
            }
          } as any;
        }
      } catch (err) {
        console.warn(`⚠️ SmartDiscovery: modelo ${model} indisponível no momento.`);
      }
    }
    return baseConfig as any;
  } catch (error) {
    console.error("Erro no Smart Discovery:", error);
    return baseConfig as any;
  }
};
