/**
 * DATA SANITIZER FOR UPLOADED DATASETS IN DASHBOARD
 * =========================================================================
 * Higieniza em memória os dados brutos recebidos pelo uploader:
 * 1. Unifica categorias com variações/sinônimos (ex: "Aprovada", "Aprovado", "APROVADO POR NOTA..." -> "Aprovado")
 * 2. Limpa números, notas, cliques e moedas (converte "8,5" -> 8.5, "1.250 cliques" -> 1250)
 * 3. Sanitiza espaços e textos
 * =========================================================================
 */

export function sanitizeUploadedDataset(rawHeaders: string[], rawData: any[]): { cleanHeaders: string[]; cleanData: any[] } {
  if (!rawData || rawData.length === 0 || !rawHeaders || rawHeaders.length === 0) {
    return { cleanHeaders: rawHeaders || [], cleanData: rawData || [] };
  }

  // 1. Limpar nomes das colunas
  const cleanHeaders = rawHeaders.map(h => h.trim());

  // Mapa de transformações "De-Para" por coluna
  const columnTransforms: Record<string, (val: any) => any> = {};

  cleanHeaders.forEach((header) => {
    const headerLower = header.toLowerCase();

    // A. CANAL / PLATAFORMA DE MARKETING (Google, Meta, TikTok, Email)
    if (headerLower.includes('canal') || headerLower.includes('plataforma') || headerLower.includes('rede') || headerLower.includes('midia') || headerLower.includes('mídia')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return val;
        const s = String(val).trim().toLowerCase();
        if (s.includes('google') || s.includes('gads') || s.includes('g_ads')) return 'Google Ads';
        if (s.includes('meta') || s.includes('fb') || s.includes('facebook') || s.includes('insta') || s.includes('ig')) return 'Meta Ads (FB/Insta)';
        if (s.includes('linkedin')) return 'LinkedIn Ads';
        if (s.includes('tiktok') || s.includes('tt')) return 'TikTok Ads';
        if (s.includes('email') || s.includes('e-mail') || s.includes('newsletter')) return 'Email Marketing';
        return String(val).trim();
      };
    }

    // B. STATUS / SITUAÇÃO DO ALUNO, CAMPANHA OU CLIENTE
    else if (headerLower.includes('situacao') || headerLower.includes('situação') || headerLower.includes('status') || headerLower.includes('resultado')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return val;
        const s = String(val).trim().toLowerCase();
        if (s.includes('ativ')) return 'Ativa';
        if (s.includes('paus')) return 'Pausada';
        if (s.includes('concl') || s.includes('encerr')) return 'Concluída';
        if (s.includes('aprov')) return 'Aprovado';
        if (s.includes('recupera')) return 'Em Recuperação';
        if (s.includes('reprov') || s.includes('dp') || s.includes('falta')) return 'Reprovado';
        if (s.includes('pend')) return 'Pendente';
        if (s.includes('canc')) return 'Cancelado';
        return String(val).trim();
      };
    }

    // C. DISCIPLINA / MATÉRIA / CURSO
    else if (headerLower.includes('materia') || headerLower.includes('matéria') || headerLower.includes('disciplina') || headerLower.includes('curso')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return val;
        const s = String(val).trim().toLowerCase();
        if (s.includes('matematica') || s.includes('matemática')) return 'Matemática';
        if (s.includes('fisica') || s.includes('física') || s.includes('fis ')) return 'Física';
        if (s.includes('portugues') || s.includes('português') || s.includes('lingua')) return 'Português';
        if (s.includes('historia') || s.includes('história')) return 'História';
        if (s.includes('quimica') || s.includes('química')) return 'Química';
        if (s.includes('eng') && s.includes('soft')) return 'Engenharia de Software';
        if (s.includes('admin')) return 'Administração';
        if (s.includes('direit')) return 'Direito';
        if (s.includes('medicin')) return 'Medicina';
        return String(val).trim();
      };
    }

    // D. TURMA / PERÍODO
    else if (headerLower.includes('turma') || headerLower.includes('periodo') || headerLower.includes('período') || headerLower.includes('serie')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return val;
        const s = String(val).trim().toLowerCase();
        if (s.includes('1')) return '1º Ano A';
        if (s.includes('2')) return '2º Ano B';
        if (s.includes('3')) return '3º Ano C';
        return String(val).trim();
      };
    }

    // E. CATEGORIA GERAL (Farmácia, E-commerce, etc.)
    else if (headerLower.includes('categoria') || headerLower.includes('grupo') || headerLower.includes('setor')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return val;
        const s = String(val).trim().toLowerCase();
        if (s.includes('higiene')) return 'Higiene e Beleza';
        if (s.includes('medicamento')) return 'Medicamentos';
        if (s.includes('suplemento')) return 'Suplementos e Vitaminas';
        if (s.includes('infantil')) return 'Infantil';
        if (s.includes('eletr')) return 'Eletrônicos';
        if (s.includes('vestu') || s.includes('roupa')) return 'Vestuário';
        return String(val).trim();
      };
    }

    // F. NOTAS / MÉDIAS ESCOLARES (converte "8,5" -> 8.5)
    else if (headerLower.includes('nota') || headerLower.includes('media') || headerLower.includes('média') || headerLower.includes('conceito')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '' || val === ' - ' || val === 'N/A') return null;
        if (typeof val === 'number') return val;
        const cleaned = String(val).trim().replace(',', '.').replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      };
    }

    // G. METRICAS NUMÉRICAS DE MARKETING & ATIVIDADES (Cliques, Impressões, Conversões, Leads, Tarefas)
    else if (headerLower.includes('clique') || headerLower.includes('impress') || headerLower.includes('conversa') || headerLower.includes('conversã') || headerLower.includes('lead') || headerLower.includes('atividade') || headerLower.includes('tarefa') || headerLower.includes('entregas')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const s = String(val).trim().replace(/\./g, ''); // Remove separador de milhar ponto
        const match = s.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          return isNaN(num) ? null : num;
        }
        return null;
      };
    }

    // H. FREQUÊNCIA / PERCENTUAIS (converte "92,5 %" -> 92.5)
    else if (headerLower.includes('frequencia') || headerLower.includes('frequência') || headerLower.includes('presença') || headerLower.includes('presenca')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const cleaned = String(val).trim().replace(',', '.').replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      };
    }

    // I. VALORES MONETÁRIOS / INVESTIMENTO / CUSTO / MENSALIDADE / CPC
    else if (headerLower.includes('valor') || headerLower.includes('investid') || headerLower.includes('investim') || headerLower.includes('custo') || headerLower.includes('cpc') || headerLower.includes('preco') || headerLower.includes('preço') || headerLower.includes('mensalidade') || headerLower.includes('faturamento')) {
      columnTransforms[header] = (val: any) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const cleaned = String(val).trim().replace(/[R$\s]/g, '');
        if (cleaned.includes(',') && cleaned.includes('.')) {
          return Number(cleaned.replace(/\./g, '').replace(',', '.'));
        }
        if (cleaned.includes(',') && !cleaned.includes('.')) {
          return Number(cleaned.replace(',', '.'));
        }
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      };
    }

    // J. PADRÃO: TRIM EM STRINGS
    else {
      columnTransforms[header] = (val: any) => {
        if (typeof val === 'string') return val.trim();
        return val;
      };
    }
  });

  // Mapear cada linha aplicando os transformadores
  const cleanData = rawData.map((row) => {
    const cleanRow: Record<string, any> = {};
    rawHeaders.forEach((rawCol) => {
      const cleanHeaderName = rawCol.trim();
      const transform = columnTransforms[cleanHeaderName];
      const val = row[rawCol];
      cleanRow[cleanHeaderName] = transform ? transform(val) : val;
    });
    return cleanRow;
  });

  return { cleanHeaders, cleanData };
}
