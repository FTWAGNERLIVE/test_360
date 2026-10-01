/**
 * ADAPTIVE SQL ENGINE SERVICE
 * =========================================================================
 * 1. Analisa os dados brutos e o questionário do cliente.
 * 2. Constrói a Query SQL Adaptativa personalizada (CREATE VIEW ... AS SELECT ...).
 * 3. Executa a higienização dos dados com base nas regras da Query SQL.
 * 4. Retorna a Query SQL gerada e os Dados Sanitizados para renderização dos gráficos.
 * =========================================================================
 */

export interface OnboardingData {
  companyName?: string;
  industry?: string;
  dataSource?: string;
  goals?: string[];
  specificQuestions?: string;
}

export interface AdaptiveSqlResult {
  sqlQuery: string;
  cleanHeaders: string[];
  cleanData: any[];
  columnRules: Record<string, {
    type: string;
    cleanHeader: string;
    sqlSnippet: string;
    deParaMap?: Record<string, string>;
  }>;
}

/**
 * Sanitiza o nome de uma coluna para padrão SQL (snake_case)
 */

function sanitizeSqlHeader(header: string): string {
  if (!header) return 'coluna_indefinida';
  return header
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * GERA A QUERY SQL ADAPTATIVA E PROCESSA OS DADOS
 */

export function processAdaptiveSqlPipeline(
  rawHeaders: string[],
  rawData: any[],
  onboardingData?: OnboardingData
): AdaptiveSqlResult {
  if (!rawHeaders || rawHeaders.length === 0 || !rawData || rawData.length === 0) {
    return {
      sqlQuery: '-- Sem dados disponíveis para gerar a View SQL',
      cleanHeaders: rawHeaders || [],
      cleanData: rawData || [],
      columnRules: {}
    };
  }

  const columnRules: AdaptiveSqlResult['columnRules'] = {};
  const selectExpressions: string[] = [];
  const cleanHeaders: string[] = [];

  const sampleRows = rawData.slice(0, 50);

  rawHeaders.forEach((rawHeader) => {
    const rawClean = rawHeader.trim();
    const cleanHeader = sanitizeSqlHeader(rawHeader);
    cleanHeaders.push(cleanHeader);

    const headerLower = rawClean.toLowerCase();
    const samples = sampleRows.map(r => String(r[rawHeader] ?? '').trim()).filter(Boolean);

    // 1. CANAL / PLATAFORMA (Marketing Digital)
    if (headerLower.includes('canal') || headerLower.includes('plataforma') || headerLower.includes('rede') || headerLower.includes('midia') || headerLower.includes('mídia')) {
      const deParaMap: Record<string, string> = {};
      Array.from(new Set(samples)).forEach(val => {
        const s = val.toLowerCase();
        if (s.includes('google') || s.includes('gads') || s.includes('g_ads')) deParaMap[val] = 'Google Ads';
        else if (s.includes('meta') || s.includes('fb') || s.includes('facebook') || s.includes('insta') || s.includes('ig')) deParaMap[val] = 'Meta Ads (FB/Insta)';
        else if (s.includes('linkedin')) deParaMap[val] = 'LinkedIn Ads';
        else if (s.includes('tiktok') || s.includes('tt')) deParaMap[val] = 'TikTok Ads';
        else if (s.includes('email') || s.includes('e-mail') || s.includes('newsletter')) deParaMap[val] = 'Email Marketing';
        else deParaMap[val] = val;
      });

      const caseBranches = Object.entries(deParaMap)
        .map(([k, v]) => `    WHEN LOWER(TRIM("${rawClean}")) = '${k.toLowerCase()}' THEN '${v}'`)
        .join('\n');

      const sqlSnippet = `  -- 🧠 Unificação Semântica de Canais de Marketing: ${cleanHeader}\n  CASE\n${caseBranches}\n    ELSE INITCAP(TRIM("${rawClean}"))\n  END AS ${cleanHeader}`;
      
      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'CATEGORY_MARKETING', cleanHeader, sqlSnippet, deParaMap };
    }

    // 2. SITUAÇÃO / STATUS / RESULTADO (Escola, Vendas, RH)
    else if (headerLower.includes('situacao') || headerLower.includes('situação') || headerLower.includes('status') || headerLower.includes('resultado')) {
      const deParaMap: Record<string, string> = {};
      Array.from(new Set(samples)).forEach(val => {
        const s = val.toLowerCase();
        if (s.includes('aprov')) deParaMap[val] = 'Aprovado';
        else if (s.includes('recupera')) deParaMap[val] = 'Em Recuperação';
        else if (s.includes('reprov') || s.includes('dp') || s.includes('falta')) deParaMap[val] = 'Reprovado';
        else if (s.includes('ativ')) deParaMap[val] = 'Ativa';
        else if (s.includes('paus')) deParaMap[val] = 'Pausada';
        else if (s.includes('concl') || s.includes('encerr')) deParaMap[val] = 'Concluída';
        else deParaMap[val] = val;
      });

      const caseBranches = Object.entries(deParaMap)
        .map(([k, v]) => `    WHEN LOWER(TRIM("${rawClean}")) = '${k.toLowerCase()}' THEN '${v}'`)
        .join('\n');

      const sqlSnippet = `  -- 🔘 Normalização de Status / Situação: ${cleanHeader}\n  CASE\n${caseBranches}\n    ELSE INITCAP(TRIM("${rawClean}"))\n  END AS ${cleanHeader}`;
      
      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'STATUS', cleanHeader, sqlSnippet, deParaMap };
    }

    // 3. MATÉRIA / DISCIPLINA (Escola / Universidade)
    else if (headerLower.includes('materia') || headerLower.includes('matéria') || headerLower.includes('disciplina') || headerLower.includes('curso')) {
      const deParaMap: Record<string, string> = {};
      Array.from(new Set(samples)).forEach(val => {
        const s = val.toLowerCase();
        if (s.includes('matematica') || s.includes('matemática')) deParaMap[val] = 'Matemática';
        else if (s.includes('fisica') || s.includes('física') || s.includes('fis ')) deParaMap[val] = 'Física';
        else if (s.includes('portugues') || s.includes('português') || s.includes('lingua')) deParaMap[val] = 'Português';
        else if (s.includes('historia') || s.includes('história')) deParaMap[val] = 'História';
        else if (s.includes('quimica') || s.includes('química')) deParaMap[val] = 'Química';
        else deParaMap[val] = val;
      });

      const caseBranches = Object.entries(deParaMap)
        .map(([k, v]) => `    WHEN LOWER(TRIM("${rawClean}")) = '${k.toLowerCase()}' THEN '${v}'`)
        .join('\n');

      const sqlSnippet = `  -- 🎓 Padronização de Matérias e Cursos: ${cleanHeader}\n  CASE\n${caseBranches}\n    ELSE INITCAP(TRIM("${rawClean}"))\n  END AS ${cleanHeader}`;
      
      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'SUBJECT', cleanHeader, sqlSnippet, deParaMap };
    }

    // 4. VALORES MONETÁRIOS (Investimento, Custo, Faturamento, Mensalidade, Preço, CPC)
    else if (headerLower.includes('valor') || headerLower.includes('investid') || headerLower.includes('investim') || headerLower.includes('custo') || headerLower.includes('cpc') || headerLower.includes('preco') || headerLower.includes('preço') || headerLower.includes('mensalidade') || samples.some(s => /R\$|\$/.test(s))) {
      const sqlSnippet = `  -- 💲 Padronização Monetária (Decimal 10,2): ${cleanHeader}\n  CAST(\n    NULLIF(\n      REGEXP_REPLACE(\n        REPLACE(REPLACE(TRIM("${rawClean}"), 'R$', ''), '.', ''), \n        ',', '.'\n      ), ''\n    ) AS DECIMAL(10,2)\n  ) AS ${cleanHeader}`;

      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'MONEY', cleanHeader, sqlSnippet };
    }

    // 5. NOTAS ESCOLARES / MÉDIAS (0.00 a 10.00)
    else if (headerLower.includes('nota') || headerLower.includes('media') || headerLower.includes('média') || headerLower.includes('conceito')) {
      const sqlSnippet = `  -- 🎓 Nota Escolar / Média Decimal (4,2): ${cleanHeader}\n  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("${rawClean}"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(4,2)) AS ${cleanHeader}`;

      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'GRADE', cleanHeader, sqlSnippet };
    }

    // 6. MÉTRICAS DE CONTAGEM / MARKETING (Cliques, Impressões, Conversões, Leads, Atividades)
    else if (headerLower.includes('clique') || headerLower.includes('impress') || headerLower.includes('conversa') || headerLower.includes('conversã') || headerLower.includes('lead') || headerLower.includes('atividade') || headerLower.includes('tarefa') || headerLower.includes('entregas')) {
      const sqlSnippet = `  -- 📊 Métrica Numérica / Inteiro: ${cleanHeader}\n  CAST(NULLIF(SUBSTRING(REGEXP_REPLACE(TRIM("${rawClean}"), '[^0-9]', ' ') FROM 1 FOR 4), '') AS INTEGER) AS ${cleanHeader}`;

      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'METRIC_INTEGER', cleanHeader, sqlSnippet };
    }

    // 7. FREQUÊNCIA / PERCENTUAL (%)
    else if (headerLower.includes('frequencia') || headerLower.includes('frequência') || headerLower.includes('%') || headerLower.includes('presença') || headerLower.includes('presenca')) {
      const sqlSnippet = `  -- 📊 Percentual (%): ${cleanHeader}\n  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("${rawClean}"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(5,2)) AS ${cleanHeader}`;

      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'PERCENTAGE', cleanHeader, sqlSnippet };
    }

    // 8. DATAS
    else if (headerLower.includes('data') || headerLower.includes('date') || samples.some(s => /\d{2}[\/\.-]\d{2}[\/\.-]\d{4}/.test(s))) {
      const sqlSnippet = `  -- 📅 Tratamento Adaptativo de Data: ${cleanHeader}\n  CASE \n    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN TO_DATE(TRIM("${rawClean}"), 'DD/MM/YYYY')\n    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN CAST(TRIM("${rawClean}") AS DATE)\n    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}' THEN TO_DATE(TRIM("${rawClean}"), 'DD.MM.YYYY')\n    ELSE NULL\n  END AS ${cleanHeader}`;

      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'DATE', cleanHeader, sqlSnippet };
    }

    // DEFAULT: TEXTO SANITIZADO
    else {
      const sqlSnippet = `  -- 📝 Texto Sanitizado: ${cleanHeader}\n  TRIM("${rawClean}") AS ${cleanHeader}`;
      selectExpressions.push(sqlSnippet);
      columnRules[cleanHeader] = { type: 'TEXT', cleanHeader, sqlSnippet };
    }
  });

  const companyContext = onboardingData?.companyName ? ` (${onboardingData.companyName})` : '';
  const industryContext = onboardingData?.industry ? ` - Setor: ${onboardingData.industry}` : '';

  const sqlQuery = `-- =========================================================================
-- VIEW SQL ADAPTATIVA GERADA PELO SISTEMA
-- Cliente${companyContext}${industryContext}
-- =========================================================================

CREATE OR REPLACE VIEW vw_dados_cliente_tratados AS
SELECT
${selectExpressions.join(',\n')}
FROM tb_dados_brutos_raw;
`;

  // EXECUÇÃO DO TRATAMENTO ADAPTATIVO NOS DADOS EM MEMÓRIA
  const cleanData = rawData.map((row) => {
    const cleanRow: Record<string, any> = {};

    rawHeaders.forEach((rawCol, idx) => {
      const cleanHeader = cleanHeaders[idx];
      const rule = columnRules[cleanHeader];
      const val = row[rawCol];

      if (val === null || val === undefined || val === '') {
        cleanRow[cleanHeader] = null;
        return;
      }

      if (rule.deParaMap && rule.deParaMap[val]) {
        cleanRow[cleanHeader] = rule.deParaMap[val];
        return;
      }

      const valStr = String(val).trim();

      if (rule.type === 'MONEY') {
        const cleaned = valStr.replace(/[R$\s]/g, '');
        if (cleaned.includes(',') && cleaned.includes('.')) {
          cleanRow[cleanHeader] = Number(cleaned.replace(/\./g, '').replace(',', '.'));
        } else if (cleaned.includes(',') && !cleaned.includes('.')) {
          cleanRow[cleanHeader] = Number(cleaned.replace(',', '.'));
        } else {
          cleanRow[cleanHeader] = parseFloat(cleaned) || null;
        }
      } else if (rule.type === 'GRADE' || rule.type === 'PERCENTAGE') {
        if (valStr === ' - ' || valStr === 'N/A') {
          cleanRow[cleanHeader] = null;
        } else {
          const cleaned = valStr.replace(',', '.').replace(/[^0-9.]/g, '');
          cleanRow[cleanHeader] = parseFloat(cleaned) || null;
        }
      } else if (rule.type === 'METRIC_INTEGER') {
        const cleaned = valStr.replace(/\./g, '');
        const match = cleaned.match(/\d+/);
        cleanRow[cleanHeader] = match ? parseInt(match[0], 10) : null;
      } else {
        cleanRow[cleanHeader] = valStr;
      }
    });

    return cleanRow;
  });

  return {
    sqlQuery,
    cleanHeaders,
    cleanData,
    columnRules
  };
}
