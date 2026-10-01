export const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val
  if (val === null || val === undefined || val === '') return NaN
  const cleaned = String(val).trim().replace(/[R$\s]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return Number(cleaned.replace(',', '.'))
  }
  return Number(cleaned)
}

export const formatValue = (num: number) => {
  if (isNaN(num)) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export const parseDate = (dateStr: any): Date | null => {
  if (dateStr === null || dateStr === undefined || dateStr === '' || dateStr === 'null' || dateStr === 'undefined') return null
  
  const num = Number(dateStr);
  if (!isNaN(num) && String(dateStr).trim() !== '') {
    if (num > 1000 && num < 100000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
    if (num > 1000000000000000000) return new Date(num / 1000000);
    if (num > 1000000000000000) return new Date(num / 1000);
    if (num > 1000000000000) return new Date(num);
    if (num > 100000000) return new Date(num * 1000);
  }

  const s = String(dateStr).trim()

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
  }

  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      let day = Number(parts[0])
      let month = Number(parts[1]) - 1
      let year = Number(parts[2])
      
      if (parts[2].length === 2) year += 2000;
      if (parts[0].length === 4) {
        year = Number(parts[0])
        day = Number(parts[2])
      }
      return new Date(Date.UTC(year, month, day))
    }
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function isIdentityOrNameHeader(h: string): boolean {
  if (!h) return false
  const low = h.toLowerCase().trim()
  return (
    low === 'nome' || low.includes('nome_') || low.endsWith('_nome') || low.includes('nome ') ||
    low === 'colaborador' || low.includes('colaborador_') || low.includes('colaborador ') ||
    low === 'aluno' || low.includes('aluno_') ||
    low === 'cliente' || low.includes('cliente_') ||
    low === 'paciente' || low.includes('paciente_') ||
    low === 'funcionario' || low.includes('funcionário') ||
    low.includes('funcional') || low.includes('matricula') || low.includes('matrícula') ||
    low.includes('cpf') || low.includes('rg') || low.includes('cnpj') ||
    low.includes('email') || low.includes('e-mail') || low.includes('telefone') || low.includes('celular') ||
    low === 'id' || low.includes('id_') || low.endsWith('_id') || low.includes('codigo') || low.includes('código') ||
    low.includes('observacao') || low.includes('observação') || low.includes('descricao') || low.includes('descrição')
  )
}

export const isDateHeaderName = (header: string): boolean => {
  if (!header) return false
  const lower = header.toLowerCase()
  return (
    lower.includes('data') ||
    lower.includes('date') ||
    lower.includes('vencimento') ||
    lower.includes('realizacao') ||
    lower.includes('realização') ||
    lower.includes('nascimento') ||
    lower.includes('matricula') ||
    lower.includes('matrícula') ||
    lower.includes('criacao') ||
    lower.includes('criação') ||
    lower.includes('admissao') ||
    lower.includes('admissão') ||
    lower.includes('demissao') ||
    lower.includes('demissão') ||
    lower.includes('validade')
  )
}
