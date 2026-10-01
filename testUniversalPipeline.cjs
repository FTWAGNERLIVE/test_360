const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

/**
 * DEMONSTRAÇÃO DO PIPELINE COMPLETO UNIVERSAL:
 * IA lê amostras + Contexto do Onboarding -> Algoritmo gera Lógica -> SQL Trata -> IA Entrega Resultado
 */

// Simulação da Análise Semântica da IA (Lendo o Questionário de Onboarding do Cliente + Amostra da Planilha)
function aiAnalyzeDataAndContext(sampleRows, rawHeaders, onboardingContext) {
  console.log(`\n🧠 [ETAPA 1: IA Lendo os dados e o contexto do cliente...]`);
  console.log(`📋 Questionário do Cliente: Setor "${onboardingContext.industry}", Fonte "${onboardingContext.dataSource}"`);
  console.log(`📊 Colunas detectadas:`, rawHeaders);

  // A IA identifica o significado de cada coluna e gera o mapa semântico "De-Para" de textos/categorias
  const semanticPlan = {
    industry: onboardingContext.industry,
    columns: []
  };

  rawHeaders.forEach(header => {
    const rawClean = header.trim();
    const cleanName = rawClean
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    const samples = sampleRows.map(r => String(r[header] || '').trim()).filter(Boolean);

    // IA descobre se a coluna é a Categoria Principal do Negócio
    if (cleanName.includes('categoria') || cleanName.includes('tipo') || cleanName.includes('grupo') || cleanName.includes('setor')) {
      // IA varre os textos únicos da coluna e resolve sinônimos / abreviações / erros de digitação!
      const deParaMap = {};
      const uniqueTexts = Array.from(new Set(samples));

      uniqueTexts.forEach(text => {
        const textLow = text.toLowerCase();
        // IA entende que "Higiene", "Higiene & Beleza" e "Higiene e Beleza" são o MESMO conceito no contexto do cliente
        if (textLow.includes('higiene')) deParaMap[text] = 'Higiene e Beleza';
        else if (textLow.includes('medicamento')) deParaMap[text] = 'Medicamentos';
        else if (textLow.includes('suplemento')) deParaMap[text] = 'Suplementos e Vitaminas';
        else if (textLow.includes('infantil')) deParaMap[text] = 'Infantil';
        else if (textLow.includes('equipamento')) deParaMap[text] = 'Equipamentos e Acessórios';
        else if (textLow.includes('conveniencia') || textLow.includes('conveniência')) deParaMap[text] = 'Conveniência';
        else deParaMap[text] = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      });

      semanticPlan.columns.push({
        rawHeader: header,
        cleanName,
        type: 'CATEGORY_SEMANTIC',
        deParaMap
      });
    } else if (cleanName.includes('data') || cleanName.includes('date')) {
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'DATE' });
    } else if (cleanName.includes('valor') || cleanName.includes('preco') || cleanName.includes('total')) {
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'CURRENCY' });
    } else if (cleanName.includes('qtd') || cleanName.includes('quantidade')) {
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'INTEGER' });
    } else if (cleanName.includes('cpf') || cleanName.includes('cnpj')) {
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'DOC_DIGITS' });
    } else if (cleanName.includes('receita') || cleanName.includes('ativo')) {
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'BOOLEAN' });
    } else if (cleanName.includes('pagamento')) {
      // IA normaliza formas de pagamento
      const deParaMap = {};
      Array.from(new Set(samples)).forEach(text => {
        const tLow = text.toLowerCase();
        if (tLow.includes('credito') || tLow.includes('crédito')) deParaMap[text] = 'Cartão de Crédito';
        else if (tLow.includes('debito') || tLow.includes('débito')) deParaMap[text] = 'Cartão de Débito';
        else if (tLow.includes('pix')) deParaMap[text] = 'PIX';
        else if (tLow.includes('dinheiro')) deParaMap[text] = 'Dinheiro';
        else deParaMap[text] = text;
      });
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'CATEGORY_SEMANTIC', deParaMap });
    } else {
      semanticPlan.columns.push({ rawHeader: header, cleanName, type: 'TEXT' });
    }
  });

  return semanticPlan;
}

// ETAPA 2: Algoritmo constrói o SQL Adaptativo baseado no plano semântico da IA
function buildAdaptiveSqlFromSemanticPlan(semanticPlan) {
  console.log(`\n⚙️ [ETAPA 2: Algoritmo montando a lógica SQL adaptativa...]`);

  const sqlColumns = semanticPlan.columns.map(col => {
    const rawEscaped = `"${col.rawHeader.trim()}"`;

    if (col.type === 'CATEGORY_SEMANTIC' && col.deParaMap) {
      const caseBranches = Object.entries(col.deParaMap)
        .map(([rawVal, cleanVal]) => `    WHEN LOWER(TRIM(${rawEscaped})) = '${rawVal.toLowerCase()}' THEN '${cleanVal}'`)
        .join('\n');

      return `  -- 🧠 Unificação Semântica De-Para da IA para: ${col.cleanName}
  CASE 
${caseBranches}
    ELSE INITCAP(TRIM(${rawEscaped}))
  END AS ${col.cleanName}`;
    }

    if (col.type === 'DATE') {
      return `  -- 📅 Data Adaptativa: ${col.cleanName}
  CASE 
    WHEN TRIM(${rawEscaped}) REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN TO_DATE(TRIM(${rawEscaped}), 'DD/MM/YYYY')
    WHEN TRIM(${rawEscaped}) REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN CAST(TRIM(${rawEscaped}) AS DATE)
    WHEN TRIM(${rawEscaped}) REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}' THEN TO_DATE(TRIM(${rawEscaped}), 'DD-MM-YYYY')
    ELSE NULL
  END AS ${col.cleanName}`;
    }

    if (col.type === 'CURRENCY') {
      return `  -- 💲 Moeda Decimal: ${col.cleanName}
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(REPLACE(TRIM(${rawEscaped}), 'R$', ''), '.', ''), ',', '.'), '') AS DECIMAL(10,2)) AS ${col.cleanName}`;
    }

    if (col.type === 'INTEGER') {
      return `  -- 🔢 Inteiro: ${col.cleanName}
  CAST(REGEXP_REPLACE(TRIM(${rawEscaped}), '[^0-9]', '') AS INTEGER) AS ${col.cleanName}`;
    }

    if (col.type === 'DOC_DIGITS') {
      return `  -- 🪪 Somente Números: ${col.cleanName}
  REGEXP_REPLACE(TRIM(${rawEscaped}), '[^0-9]', '') AS ${col.cleanName}`;
    }

    if (col.type === 'BOOLEAN') {
      return `  -- 🔘 Booleano: ${col.cleanName}
  CASE 
    WHEN LOWER(TRIM(${rawEscaped})) IN ('sim', 's', 'true', '1') THEN TRUE
    WHEN LOWER(TRIM(${rawEscaped})) IN ('nao', 'não', 'n', 'false', '0') THEN FALSE
    ELSE NULL
  END AS ${col.cleanName}`;
    }

    return `  TRIM(${rawEscaped}) AS ${col.cleanName}`;
  });

  const fullSql = `-- =========================================================================
-- VIEW SQL ADAPTATIVA GERADA AUTOMATICAMENTE (IA + ALGORITMO)
-- Alinhada ao contexto de negócio: ${semanticPlan.industry}
-- =========================================================================
CREATE OR REPLACE VIEW vw_dados_cliente_tratados AS
SELECT
${sqlColumns.join(',\n')}
FROM tb_raw_data;`;

  return fullSql;
}

// EXECUÇÃO DO PIPELINE
const onboardingContext = {
  companyName: "Farmácia Vida & Saúde",
  industry: "Saúde / Farmácia",
  dataSource: "Vendas",
  goals: ["Identificar Categorias mais lucrativas", "Limpar cadastros de clientes"]
};

const csvPath = path.join(__dirname, 'exemplo-farmacia-desorganizada.csv');
const rawCsvContent = fs.readFileSync(csvPath, 'utf8');

Papa.parse(rawCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const rawHeaders = results.meta.fields;
    const sampleRows = results.data;

    // 1. IA lê os dados e o contexto do questionário do cliente
    const semanticPlan = aiAnalyzeDataAndContext(sampleRows, rawHeaders, onboardingContext);

    // 2. Algoritmo monta a lógica SQL adaptativa
    const generatedSql = buildAdaptiveSqlFromSemanticPlan(semanticPlan);

    console.log(`\n🛢️ [ETAPA 3: O SQL executa a limpeza em lote no banco de dados!]`);
    console.log(generatedSql);

    console.log(`\n🎯 [ETAPA 4: A IA recebe os dados 100% limpos do SQL e entrega os KPIs/Gráficos perfeitos para o cliente!]`);
    console.log(`✅ Fim do Pipeline Universal IA + Algoritmo + SQL com Sucesso.`);
  }
});
