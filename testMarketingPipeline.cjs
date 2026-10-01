const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

/**
 * TESTE DO PIPELINE UNIVERSAL PARA DADOS DE MARKETING DIGITAL
 */

const marketingCsvPath = path.join(__dirname, 'exemplo-marketing-cliques-investimento.csv');
const rawCsvContent = fs.readFileSync(marketingCsvPath, 'utf8');

const universalEngine = require('./src/services/universalAiSqlEngine.ts');

Papa.parse(rawCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: async function(results) {
    const rawHeaders = results.meta.fields;
    const sampleRows = results.data;

    const onboardingContext = {
      companyName: "Agência de Marketing Performance",
      industry: "Marketing Digital & Mídia Pago",
      dataSource: "Relatório de Campanhas (Google, Meta, TikTok)",
      goals: ["Análise de ROI e Custo por Clique (CPC)", "Comparação de Canais de Tráfego"]
    };

    console.log(`\n🚀 [PROCESSANDO PLANILHA DE MARKETING (${sampleRows.length} LINHAS)...]`);
    console.log(`📋 Contexto do Onboarding: ${onboardingContext.industry}`);
    console.log(`📊 Cabeçalhos Brutos da Planilha:`, rawHeaders);

    const plan = await universalEngine.generateUniversalAiPlan(sampleRows, rawHeaders, onboardingContext);
    const sqlView = universalEngine.renderUniversalSqlView(plan, 'tb_marketing_raw');

    console.log(`\n================ GENERATED MARKETING ADAPTIVE SQL QUERY ================`);
    console.log(sqlView);
    console.log(`========================================================================\n`);

    const sqlPath = path.join(__dirname, 'view_marketing_adaptativa.sql');
    fs.writeFileSync(sqlPath, sqlView, 'utf8');
    console.log(`✅ SQL Adaptativo para Marketing salvo com sucesso em: ${sqlPath}`);
  }
});
