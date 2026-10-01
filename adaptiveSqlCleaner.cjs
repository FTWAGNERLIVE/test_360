const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

/**
 * MOTOR DE TRATAMENTO E GERADOR DE SQL ADAPTATIVO
 * ------------------------------------------------
 * Analisa os dados desorganizados de planilhas (CSV/Excel) e gera uma
 * VIEW SQL adaptativa completa (PostgreSQL / SQLite / DuckDB / Snowflake / BigQuery)
 * para padronizar nomes de colunas, datas, moedas, categorias e booleanos.
 */

function sanitizeColumnName(rawHeader) {
  if (!rawHeader) return 'coluna_indefinida';
  return rawHeader
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildAdaptiveColumnSql(rawHeader, sampleValues) {
  const colClean = sanitizeColumnName(rawHeader);
  const rawColEscaped = `"${rawHeader.trim()}"`;
  
  // Limpeza prévia de amostras para análise
  const samples = sampleValues
    .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
    .map(v => String(v).trim());

  // Regras de Detecção Baseadas no Nome da Coluna e no Conteúdo
  const colNameLower = colClean.toLowerCase();

  // 1. DATA
  if (colNameLower.includes('data') || samples.some(s => /\d{2}[\/\.-]\d{2}[\/\.-]\d{4}/.test(s) || /\d{4}[\/\.-]\d{2}/.test(s))) {
    return `  -- 📅 Tratamento de Data: ${colClean}
  CASE 
    WHEN TRIM(${rawColEscaped}) REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN TO_DATE(TRIM(${rawColEscaped}), 'DD/MM/YYYY')
    WHEN TRIM(${rawColEscaped}) REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN CAST(TRIM(${rawColEscaped}) AS DATE)
    WHEN TRIM(${rawColEscaped}) REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}' THEN TO_DATE(TRIM(${rawColEscaped}), 'DD-MM-YYYY')
    WHEN TRIM(${rawColEscaped}) REGEXP '^[0-9]{4}/[0-9]{2}/[0-9]{2}' THEN TO_DATE(TRIM(${rawColEscaped}), 'YYYY/MM/DD')
    WHEN TRIM(${rawColEscaped}) REGEXP '^[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}' THEN TO_DATE(TRIM(${rawColEscaped}), 'DD.MM.YYYY')
    ELSE NULL
  END AS ${colClean}`;
  }

  // 2. CPF / DOCUMENTO
  if (colNameLower.includes('cpf') || colNameLower.includes('cnpj') || colNameLower.includes('documento')) {
    return `  -- 🪪 Limpeza de CPF / Documento (Apenas Números): ${colClean}
  REGEXP_REPLACE(TRIM(${rawColEscaped}), '[^0-9]', '') AS ${colClean}`;
  }

  // 3. BOOLEANO (Receita, Ativo, Status)
  if (colNameLower.includes('receita') || colNameLower.includes('ativo') || samples.every(s => /^(sim|nao|não|s|n|true|false|1|0)$/i.test(s))) {
    return `  -- 🔘 Normalização de Booleano: ${colClean}
  CASE 
    WHEN LOWER(TRIM(${rawColEscaped})) IN ('sim', 's', 'true', '1') THEN TRUE
    WHEN LOWER(TRIM(${rawColEscaped})) IN ('nao', 'não', 'n', 'false', '0') THEN FALSE
    ELSE NULL
  END AS ${colClean}`;
  }

  // 4. PREÇO / MOEDA / VALOR TOTAL
  if (colNameLower.includes('preco') || colNameLower.includes('valor') || colNameLower.includes('total') || samples.some(s => /R\$|\$/.test(s))) {
    return `  -- 💲 Padronização Monetária (Decimal): ${colClean}
  CAST(
    NULLIF(
      REGEXP_REPLACE(
        REPLACE(
          REPLACE(TRIM(${rawColEscaped}), 'R$', ''), 
          '.', ''
        ), 
        ',', '.'
      ), ''
    ) AS DECIMAL(10,2)
  ) AS ${colClean}`;
  }

  // 5. QUANTIDADE
  if (colNameLower.includes('qtd') || colNameLower.includes('quantidade')) {
    return `  -- 🔢 Extração de Quantidade Numérica: ${colClean}
  CAST(REGEXP_REPLACE(TRIM(${rawColEscaped}), '[^0-9]', '') AS INTEGER) AS ${colClean}`;
  }

  // 6. CATEGORIA (Unificação do problema do filtro da imagem!)
  if (colNameLower.includes('categoria')) {
    return `  -- 🏷️ Unificação de Categorias (Higiene, Medicamentos, etc): ${colClean}
  CASE 
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%higiene%' THEN 'Higiene e Beleza'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%medicamento%' THEN 'Medicamentos'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%suplemento%' THEN 'Suplementos e Vitaminas'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%infantil%' THEN 'Infantil'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%equipamento%' THEN 'Equipamentos e Acessórios'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%conveniencia%' OR LOWER(TRIM(${rawColEscaped})) LIKE '%conveniência%' THEN 'Conveniência'
    ELSE INITCAP(TRIM(${rawColEscaped}))
  END AS ${colClean}`;
  }

  // 7. FORMA DE PAGAMENTO
  if (colNameLower.includes('pagamento')) {
    return `  -- 💳 Padronização de Forma de Pagamento: ${colClean}
  CASE 
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%credito%' OR LOWER(TRIM(${rawColEscaped})) LIKE '%crédito%' THEN 'Cartão de Crédito'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%debito%' OR LOWER(TRIM(${rawColEscaped})) LIKE '%débito%' THEN 'Cartão de Débito'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%pix%' THEN 'PIX'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%dinheiro%' THEN 'Dinheiro'
    ELSE INITCAP(TRIM(${rawColEscaped}))
  END AS ${colClean}`;
  }

  // 8. FILIAL / UNIDADE
  if (colNameLower.includes('filial') || colNameLower.includes('unidade')) {
    return `  -- 🏢 Padronização de Filiais: ${colClean}
  CASE 
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%centro%' THEN 'Filial Centro'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%norte%' THEN 'Filial Norte'
    WHEN LOWER(TRIM(${rawColEscaped})) LIKE '%sul%' THEN 'Filial Sul'
    ELSE INITCAP(TRIM(${rawColEscaped}))
  END AS ${colClean}`;
  }

  // 9. PADRÃO: LIMPEZA DE TEXTO / STRINGS
  return `  -- 📝 Sanitização Geral de Texto: ${colClean}
  TRIM(${rawColEscaped}) AS ${colClean}`;
}

function generateFullSqlView(rows, headers) {
  const expressions = headers.map(h => {
    const samples = rows.map(r => r[h]);
    return buildAdaptiveColumnSql(h, samples);
  });

  return `-- =========================================================================
-- VIEW SQL ADAPTATIVA DE TRATAMENTO DE DADOS (PIPELINE DE LIMPEZA)
-- Objetivo: Resolver inconsistências de categorias, datas, moedas e booleans
-- =========================================================================

CREATE OR REPLACE VIEW vw_vendas_farmacia_tratadas AS
SELECT
${expressions.join(',\n')}
FROM tb_vendas_raw;
`;
}

// Executar
const csvPath = path.join(__dirname, 'exemplo-farmacia-desorganizada.csv');
const rawCsvContent = fs.readFileSync(csvPath, 'utf8');

Papa.parse(rawCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const headers = results.meta.fields;
    const rows = results.data;
    const finalSql = generateFullSqlView(rows, headers);

    const outputPath = path.join(__dirname, 'view_vendas_farmacia_adaptativa.sql');
    fs.writeFileSync(outputPath, finalSql, 'utf8');
    
    console.log("SQL Adaptativo gerado com sucesso! Veja uma prévia:\n");
    console.log(finalSql);
  }
});
