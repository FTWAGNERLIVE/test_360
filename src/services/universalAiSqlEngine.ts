/**
 * UNIVERSAL AI + ALGORITHM + SQL ENGINE (SEM RESTRIÇÕES DE DOMÍNIO)
 * =========================================================================
 * Processa planilhas complexas e desorganizadas de professores, escolas,
 * RH, saúde, finanças e e-commerce, gerando Views SQL adaptativas.
 * =========================================================================
 */

export interface OnboardingContext {
  companyName?: string;
  industry?: string;
  dataSource?: string;
  goals?: string[];
}

export interface ColumnAiStrategy {
  rawHeader: string;
  cleanHeader: string;
  domainType: 
    | 'GRADE_DECIMAL'       // Notas escolares (ex: "8,5", "9.0", "N/A" -> 8.50)
    | 'PERCENTAGE'          // Frequência ou Metas % (ex: "95 %", "82.5%" -> 95.00)
    | 'ASSIGNMENT_QTY'      // Atividades Entregues (ex: "8 de 10", "9/10", "10 entregas" -> 8 ou 9)
    | 'RATING_SCALE'        // Avaliação de Desempenho / Escala (ex: "5 de 5", "2/5" -> 5)
    | 'ACADEMIC_STATUS'     // Aprovado, Reprovado, Em Recuperação
    | 'SUBJECT_MAPPED'      // Matemática, Física, Português, História, Química
    | 'CATEGORY_MAPPED'     // Cursos, Turmas, Departamentos unificados
    | 'DATE'                // Datas em múltiplos formatos
    | 'MONEY'               // Valores monetários
    | 'DOC_DIGITS'          // CPF, Matrícula, RGM, Código ID
    | 'BOOLEAN'             // Sim/Não
    | 'TEXT_CLEAN';         // Texto sanitizado
  
  sqlExpression?: string;
  categoryMap?: Record<string, string>;
}

export interface AiCleaningPlan {
  industryContext: string;
  columnStrategies: ColumnAiStrategy[];
  kpis: string[];
}

export async function generateUniversalAiPlan(
  sampleRows: any[],
  rawHeaders: string[],
  context: OnboardingContext
): Promise<AiCleaningPlan> {
  const columnStrategies: ColumnAiStrategy[] = rawHeaders.map((header) => {
    const rawClean = header.trim();
    const cleanHeader = rawClean
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    const samples = sampleRows.map(r => String(r[header] || '').trim()).filter(Boolean);
    const headerLower = rawClean.toLowerCase();

    // 1. MATÉRIA / DISCIPLINA (Matemática, Física, Português, História, Química)
    if (headerLower.includes('materia') || headerLower.includes('matéria') || headerLower.includes('disciplina')) {
      const categoryMap: Record<string, string> = {};
      Array.from(new Set(samples)).forEach(s => {
        const sLow = s.toLowerCase();
        if (sLow.includes('matematica') || sLow.includes('matemática')) categoryMap[s] = 'Matemática';
        else if (sLow.includes('fisica') || sLow.includes('física') || sLow.includes('fis')) categoryMap[s] = 'Física';
        else if (sLow.includes('portugues') || sLow.includes('português') || sLow.includes('lingua')) categoryMap[s] = 'Português';
        else if (sLow.includes('historia') || sLow.includes('história')) categoryMap[s] = 'História';
        else if (sLow.includes('quimica') || sLow.includes('química')) categoryMap[s] = 'Química';
        else categoryMap[s] = s.trim();
      });

      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'SUBJECT_MAPPED',
        categoryMap
      };
    }

    // 2. ATIVIDADES ENTREGUES (Qtd Entregas, "8 de 10", "9/10", "10 entregas")
    if (headerLower.includes('atividade') || headerLower.includes('tarefa') || headerLower.includes('entregas') || headerLower.includes('trabalhos_entregues')) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'ASSIGNMENT_QTY',
        sqlExpression: `  -- 📝 Quantidade de Atividades Entregues (Extrai Número Inteiro): ${cleanHeader}
  CAST(NULLIF(SUBSTRING(REGEXP_REPLACE(TRIM("${rawClean}"), '[^0-9]', ' ') FROM 1 FOR 3), '') AS INTEGER) AS ${cleanHeader}`
      };
    }

    // 3. TURMAS / PERÍODOS (1º Ano A, 2º Ano B, 3º Ano C)
    if (headerLower.includes('turma') || headerLower.includes('periodo') || headerLower.includes('período') || headerLower.includes('serie') || headerLower.includes('série')) {
      const categoryMap: Record<string, string> = {};
      Array.from(new Set(samples)).forEach(s => {
        const sLow = s.toLowerCase();
        if (sLow.includes('1') || sLow.includes('1a')) categoryMap[s] = '1º Ano A';
        else if (sLow.includes('2')) categoryMap[s] = '2º Ano B';
        else if (sLow.includes('3')) categoryMap[s] = '3º Ano C';
        else categoryMap[s] = s.trim();
      });

      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'CATEGORY_MAPPED',
        categoryMap
      };
    }

    // 4. VALOR MONETÁRIO / MENSALIDADE
    if (headerLower.includes('valor') || headerLower.includes('mensalidade') || headerLower.includes('custo') || headerLower.includes('preco') || headerLower.includes('preço') || samples.some(s => /R\$|\$/.test(s))) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'MONEY',
        sqlExpression: `  -- 💲 Valor Monetário: ${cleanHeader}
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(REPLACE(TRIM("${rawClean}"), 'R$', ''), '.', ''), ',', '.'), '') AS DECIMAL(10,2)) AS ${cleanHeader}`
      };
    }

    // 5. DOCUMENTOS / MATRÍCULAS / IDs / RGM
    if (headerLower.includes('matricula') || headerLower.includes('matrícula') || headerLower.includes('rgm') || headerLower.includes('id') || headerLower.includes('cpf')) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'DOC_DIGITS',
        sqlExpression: `  -- 🪪 Matrícula / RGM / Código ID: ${cleanHeader}
  TRIM("${rawClean}") AS ${cleanHeader}`
      };
    }

    // 6. FREQUÊNCIA / PERCENTUAIS (%)
    if (headerLower.includes('frequencia') || headerLower.includes('frequência') || headerLower.includes('%') || headerLower.includes('presença') || headerLower.includes('presenca')) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'PERCENTAGE',
        sqlExpression: `  -- 📊 Frequência / Porcentagem (%): ${cleanHeader}
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("${rawClean}"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(5,2)) AS ${cleanHeader}`
      };
    }

    // 7. NOTAS ESCOLARES / MÉDIAS (Nota Prova 1, Nota Prova 2, Média Final)
    if (headerLower.includes('nota') || headerLower.includes('media') || headerLower.includes('média') || headerLower.includes('conceito')) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'GRADE_DECIMAL',
        sqlExpression: `  -- 🎓 Nota Escolar / Média Decimal (0.00 a 10.00): ${cleanHeader}
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("${rawClean}"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(4,2)) AS ${cleanHeader}`
      };
    }

    // 8. AVALIAÇÃO DE DESEMPENHO / RATING (ex: "5 de 5", "2/5")
    if (headerLower.includes('desempenho') || headerLower.includes('rating') || headerLower.includes('nps') || headerLower.includes('escala')) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'RATING_SCALE',
        sqlExpression: `  -- ⭐ Escala de Desempenho / Rating (Inteiro 1-5): ${cleanHeader}
  CAST(SUBSTRING(REGEXP_REPLACE(TRIM("${rawClean}"), '[^0-9]', ' ') FROM 1 FOR 2) AS INTEGER) AS ${cleanHeader}`
      };
    }

    // 9. DATAS
    if (headerLower.includes('data') || headerLower.includes('date') || samples.some(s => /\d{2}[\/\.-]\d{2}[\/\.-]\d{4}/.test(s))) {
      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'DATE',
        sqlExpression: `  -- 📅 Tratamento Adaptativo de Data: ${cleanHeader}
  CASE 
    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN TO_DATE(TRIM("${rawClean}"), 'DD/MM/YYYY')
    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN CAST(TRIM("${rawClean}") AS DATE)
    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}' THEN TO_DATE(TRIM("${rawClean}"), 'DD-MM-YYYY')
    WHEN TRIM("${rawClean}") REGEXP '^[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}' THEN TO_DATE(TRIM("${rawClean}"), 'DD.MM.YYYY')
    ELSE NULL
  END AS ${cleanHeader}`
      };
    }

    // 10. SITUAÇÃO FINAL DO ALUNO (Aprovado, Recuperação, Reprovado)
    if (headerLower.includes('situacao') || headerLower.includes('situação') || headerLower.includes('status') || headerLower.includes('resultado')) {
      const categoryMap: Record<string, string> = {};
      Array.from(new Set(samples)).forEach(s => {
        const sLow = s.toLowerCase();
        if (sLow.includes('aprov')) categoryMap[s] = 'Aprovado';
        else if (sLow.includes('recupera')) categoryMap[s] = 'Em Recuperação';
        else if (sLow.includes('reprov') || sLow.includes('dp')) categoryMap[s] = 'Reprovado';
        else categoryMap[s] = s.trim();
      });

      return {
        rawHeader: header,
        cleanHeader,
        domainType: 'ACADEMIC_STATUS',
        categoryMap
      };
    }

    // Default: Texto Sanitizado
    return {
      rawHeader: header,
      cleanHeader,
      domainType: 'TEXT_CLEAN',
      sqlExpression: `  TRIM("${rawClean}") AS ${cleanHeader}`
    };
  });

  return {
    industryContext: context.industry || 'Geral',
    columnStrategies,
    kpis: [
      `Média Geral por Matéria (${context.industry || 'Educação'})`,
      'Taxa de Entrega de Atividades (%)',
      'Distribuição de Alunos: Aprovados vs Em Recuperação vs Reprovados'
    ]
  };
}

export function renderUniversalSqlView(plan: AiCleaningPlan, tableName: string = 'tb_raw_data'): string {
  const expressions = plan.columnStrategies.map(col => {
    const rawEscaped = `"${col.rawHeader.trim()}"`;

    if (col.sqlExpression) {
      return col.sqlExpression;
    }

    if (col.categoryMap && Object.keys(col.categoryMap).length > 0) {
      const branches = Object.entries(col.categoryMap)
        .map(([rawVal, cleanVal]) => `    WHEN LOWER(TRIM(${rawEscaped})) = '${rawVal.toLowerCase()}' THEN '${cleanVal}'`)
        .join('\n');

      return `  -- 🧠 Unificação Semântica De-Para da IA: ${col.cleanHeader}
  CASE 
${branches}
    ELSE INITCAP(TRIM(${rawEscaped}))
  END AS ${col.cleanHeader}`;
    }

    return `  TRIM(${rawEscaped}) AS ${col.cleanHeader}`;
  });

  return `-- =========================================================================
-- VIEW SQL UNIVERSAL E ADAPTATIVA (IA + ALGORITMO)
-- Contexto do Cliente: ${plan.industryContext}
-- =========================================================================
CREATE OR REPLACE VIEW vw_dados_cliente_tratados AS
SELECT
${expressions.join(',\n')}
FROM ${tableName};`;
}
