const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

/**
 * TESTE REALISTA: PLANILHA DE 60 LINHAS DO PROFESSOR (NOTAS, DISCIPLINAS, ATIVIDADES)
 */

const teacherCsvPath = path.join(__dirname, 'planilha-professor-desempenho-grande.csv');
const rawCsvContent = fs.readFileSync(teacherCsvPath, 'utf8');

const universalEngine = require('./src/services/universalAiSqlEngine.ts');

Papa.parse(rawCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: async function(results) {
    const rawHeaders = results.meta.fields;
    const sampleRows = results.data;

    const onboardingContext = {
      companyName: "Colégio Visão do Futuro",
      industry: "Educação / Desempenho Escolar do Professor",
      dataSource: "Diário de Classe & Notas de Provas",
      goals: ["Análise de Médias e Frequência por Matéria", "Controle de Atividades Entregues"]
    };

    console.log(`\n🎓 [PROCESSANDO PLANILHA REAL DE PROFESSOR (${sampleRows.length} LINHAS)...]`);
    console.log(`📋 Contexto do Onboarding: ${onboardingContext.industry}`);
    console.log(`📊 Cabeçalhos Brutos da Planilha:`, rawHeaders);

    const plan = await universalEngine.generateUniversalAiPlan(sampleRows, rawHeaders, onboardingContext);
    const sqlView = universalEngine.renderUniversalSqlView(plan, 'tb_diario_professor_raw');

    console.log(`\n================ GENERATED TEACHER ADAPTIVE SQL QUERY ================`);
    console.log(sqlView);
    console.log(`======================================================================\n`);

    const sqlPath = path.join(__dirname, 'view_professor_desempenho_adaptativa.sql');
    fs.writeFileSync(sqlPath, sqlView, 'utf8');
    console.log(`✅ SQL Adaptativo para o Professor salvo com sucesso em: ${sqlPath}`);
  }
});
