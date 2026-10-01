const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

/**
 * GERADOR DE PLANILHA REALISTA DE MARKETING DIGITAL
 * =========================================================================
 * Contém colunas solicitadas:
 * - Total de Cliques (em variados formatos: "1.250 cliques", "450", "3200")
 * - Datas da Campanha (em variados formatos: "15/05/2024", "2024-05-16", "17.05.2024")
 * - Valor Investido (em variados formatos: "R$ 1.250,00", "450.50", "R$ 800")
 * - Canais/Plataformas (Google Ads, Meta Ads, LinkedIn Ads, TikTok, Email)
 * - Impressões, Conversões e CPC
 * =========================================================================
 */

const rawMarketingHeaders = [
  " ID_Campanha ",
  " Data da Campanha ",
  " Canal / Plataforma ",
  " Nome da Campanha ",
  " Valor Investido (R$) ",
  " Total de Impressoes ",
  " Total de Cliques ",
  " Conversoes / Leads ",
  " Custo por Clique (CPC) ",
  " Status Campanha "
];

const canais = [
  " Google Ads ", "google_ads", "GOOGLE ADS",
  " Meta Ads (FB/Insta) ", "Facebook Ads", "Instagram Ads", "META ADS",
  " LinkedIn Ads ", "Linkedin Ads", "LINKEDIN",
  " TikTok Ads ", "tiktok", "TIKTOK ADS",
  " Email Marketing ", "e-mail", "Newsletter"
];

const campanhas = [
  " Black Friday 2024 ", "Campanha de Verão - Promo", " Remarketing Leads Qualificados ",
  " Lançamento Novo Produto ", " Promoção Mês de Maio ", " Institucional Branding ",
  " Geracao de Leads B2B ", " Desconto Primeira Compra ", " Campanha de Retenção "
];

const statusList = ["Ativa", "ATIVA", "Pausada", "PAUSADO", "Concluida", "Concluída", "Encerrada"];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const rawRows = [];

for (let i = 1; i <= 45; i++) {
  const id = `CMP-${1000 + i}`;
  const canal = randomChoice(canais);
  const campanha = randomChoice(campanhas);
  
  // Datas em múltiplos formatos
  const day = String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0');
  const month = String(Math.floor(Math.random() * 6 + 1)).padStart(2, '0');
  let dataStr = `${day}/${month}/2024`;
  if (Math.random() > 0.6) dataStr = `2024-${month}-${day}`;
  else if (Math.random() > 0.3) dataStr = `${day}.${month}.2024`;

  // Valor Investido (R$)
  const valorNum = (Math.random() * 3000 + 300).toFixed(2); // R$ 300 a R$ 3300
  let valorStr = `R$ ${valorNum.replace('.', ',')}`;
  if (Math.random() > 0.6) valorStr = valorNum; // Ex: 450.50
  else if (Math.random() > 0.3) valorStr = `R$ ${Math.round(valorNum)}`;

  // Impressões
  const impressoesNum = Math.floor(Math.random() * 40000 + 5000);
  const impressoesStr = Math.random() > 0.5 ? impressoesNum.toLocaleString('pt-BR') : String(impressoesNum);

  // Cliques
  const cliquesNum = Math.floor(impressoesNum * (Math.random() * 0.08 + 0.02)); // CTR 2% a 10%
  let cliquesStr = `${cliquesNum}`;
  if (Math.random() > 0.6) cliquesStr = `${cliquesNum} cliques`;
  else if (Math.random() > 0.3) cliquesStr = ` ${cliquesNum.toLocaleString('pt-BR')} `;

  // Conversões
  const conversoesNum = Math.floor(cliquesNum * (Math.random() * 0.15 + 0.03));
  let conversoesStr = `${conversoesNum}`;
  if (Math.random() > 0.5) conversoesStr = ` ${conversoesNum} `;

  // CPC
  const cpcNum = (parseFloat(valorNum) / Math.max(1, cliquesNum)).toFixed(2);
  let cpcStr = `R$ ${cpcNum.replace('.', ',')}`;
  if (Math.random() > 0.5) cpcStr = cpcNum;

  const status = randomChoice(statusList);

  rawRows.push([
    id,
    dataStr,
    canal,
    campanha,
    valorStr,
    impressoesStr,
    cliquesStr,
    conversoesStr,
    cpcStr,
    status
  ]);
}

// 1. Gerar CSV
const csvLines = [rawMarketingHeaders.join(",")];
rawRows.forEach(row => {
  csvLines.push(row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","));
});

const csvPath = path.join(__dirname, 'exemplo-marketing-cliques-investimento.csv');
fs.writeFileSync(csvPath, csvLines.join("\n"), 'utf8');

// 2. Gerar XLSX
const wsData = [rawMarketingHeaders, ...rawRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Campanhas Marketing");

const xlsxPath = path.join(__dirname, 'exemplo-marketing-cliques-investimento.xlsx');
XLSX.writeFile(wb, xlsxPath);

console.log(`✅ Planilha de Marketing gerada com sucesso!`);
console.log(`📄 CSV: ${csvPath} (${rawRows.length} linhas)`);
console.log(`📊 XLSX: ${xlsxPath}`);
