export const getSmartDiscovery = async (
  headers: string[],
  data: any[],
  onboardingData?: any
): Promise<SmartDiscoveryResult | null> => {
  const analysis = analyzeData(headers, data);
  const mapping = analysis.mapping;
  
  const columnMapping: Record<string, any> = {};
  analysis.profiles.forEach(p => { columnMapping[p.name] = p.type; });

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
    const prompt = `
[LUPA ANALYTICS - DASHBOARD TITLES E INSIGHTS]
O sistema já decidiu matematicamente a estrutura dos gráficos abaixo:
- Gráfico de Barras: Analisa Métrica (${mapping.primaryMetric || 'N/A'}) agrupada por (${mapping.primaryCategory || 'N/A'})
- Gráfico Donut (Pizza): Distribuição da Categoria (${mapping.donutCategory || 'N/A'})
- Gráfico de Área (Linha do Tempo): Evolução da Métrica (${mapping.primaryMetric || 'N/A'}) ao longo do Tempo (${mapping.primaryDate || 'N/A'})
- Gráfico Radar: Análise da Categoria (${mapping.radarCategory || 'N/A'})

CONTEXTO DO CLIENTE:
- Setor: ${onboardingData?.industry || 'Geral'}
- Objetivos: ${JSON.stringify(onboardingData?.goals || [])}

Sua ÚNICA tarefa:
1. Criar Títulos curtos, executivos e profissionais (estilo consultoria McKinsey) para cada um dos 4 gráficos acima.
2. Criar 2 a 3 Insights genéricos e curtos sugerindo o que o usuário deve analisar com esses gráficos.

Responda APENAS um JSON válido neste exato formato (sem marcação Markdown em volta se possível, apenas a string JSON):
{
  "chartTitles": {
    "barChart": "Título...",
    "donutChart": "Título...",
    "areaChart": "Título...",
    "radarChart": "Título..."
  },
  "insights": [
    "Insight curto 1...",
    "Insight curto 2..."
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
          max_tokens: 400,
          response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const cleanedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const parsed = JSON.parse(cleanedContent);

        if (parsed && (parsed.chartTitles || parsed.insights)) {
          return {
            ...baseConfig,
            insights: parsed.insights || baseConfig.insights,
            dashboardConfig: {
              ...baseConfig.dashboardConfig,
              chartTitles: {
                ...baseConfig.dashboardConfig.chartTitles,
                ...parsed.chartTitles
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
