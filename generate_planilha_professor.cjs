const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

/**
 * GERADOR DE PLANILHA GRANDE E DESORGANIZADA DE UM PROFESSOR
 * =========================================================================
 * Contém 60 linhas com casos reais de sujeira de sala de aula:
 * - Nomes de Matérias com acentos/typos (Matemática, Matematica, Fis 1, Física I, etc)
 * - Notas em múltiplos formatos ("8,5", "9.0", "N/A", " - ", "7,25", "10")
 * - Quantidade de Atividades entregues ("8 de 10", "10/10", "5", "3 entregas", "0 / 10")
 * - Frequência ("92,5%", "80 %", "100%", "65.0%")
 * - Situação do Aluno ("APROVADO", "aprovado por nota", "Em Recuperação", "reprovado por faltas", "EM DP")
 * - Datas de avaliação ("15/03/2024", "2024-03-16", "18.03.2024")
 * =========================================================================
 */

const rawTeacherHeaders = [
  " RGM / Matricula ",
  " Nome do Estudante ",
  " Disciplina / Materia ",
  " Turma / Periodo ",
  " Nota Prova 1 ",
  " Nota Prova 2 ",
  " Nota Trabalhos ",
  " Media Final Calculada ",
  " Qtd Atividades Entregues ",
  " Total Atividades Passadas ",
  " Frequencia / Presenca (%) ",
  " Situacao Final do Aluno ",
  " Data Ultima Avaliacao "
];

const materias = [
  "Matemática Aplicada", "Matematica Aplicada", "MATEMATICA", "Matematica",
  "Física Quantica I", "Fisica 1", "FÍSICA I", "Fisica I",
  "Língua Portuguesa", "Lingua Portuguesa", "PORTUGUES", "Portugues",
  "História Contemporânea", "Historia Geral", "HISTORIA", "Historia",
  "Química Orgânica", "Quimica Organica", "QUIMICA", "Quimica"
];

const turmas = [" 1º Ano A ", "1 Ano A", " 1A ", " 2º Ano B ", "2 Ano B", " 3º Ano C ", "3 Ano C"];

const nomesEstudantes = [
  " Lucas Andrade Silva ", "Beatriz Costa Ribeiro", " Gabriel Santos Oliveira ", "Mariana Lima Souza",
  " Guilherme Pereira ", " Sofia Martins Ferreira ", " Matheus Alves Rocha ", "Isabela Gomez Duarte",
  " Gustavo Henrique Lima ", " Amanda Rodrigues ", " Felipe Barbosa ", " Larissa Machado ",
  " Thiago Mendes Castro ", " Camila Ramos Barbosa ", " Rodrigo Nogueira ", " Vanessa Dias ",
  " Rafael Torres Pinto ", " Juliana Carvalho ", " Bruno Eduardo Farias ", " Patricia Mendes ",
  " Daniel Carvalho ", " Leticia Soares ", " Marcelo Augusto ", " Natalia Farias ",
  " Otavio Augusto ", " Bianca Martins ", " Caio Fernando ", " Carolina Paiva ",
  " Diego Armando ", " Fernanda Torres ", " Heitor Silva ", " Igor Guimaraes ",
  " Julia Paes ", " Kevin Ribeiro ", " Lara Croft Silva ", " Leonardo da Vinci ",
  " Manuela Santos ", " Nicolas Cage ", " Olivia Palito ", " Paulo Freire Silva ",
  " Renan Castro ", " Sabina Hidalgo ", " Tomas Edison ", " Vinicius de Moraes ",
  " Yasmin Brunet ", " Zeca Pagodinho ", " Arthur Dent ", " Clara Oswald ",
  " Enzo Gabriel ", " Valentina Sophia ", " Alice no Pais ", " Bernardo Silva ",
  " Cecília Meireles ", " Davi Lucca ", " Helena Ranaldi ", " Joao Pedro ",
  " Maria Eduarda ", " Pedro Henrique ", " Samuel Rosa ", " Theo James "
];

const situacoes = [
  "APROVADO POR NOTA E FREQUENCIA", "aprovado", "Aprovado", "Aprovada",
  "Em Recuperacao", "EM RECUPERAÇÃO", "em recuperacao", "Recuperação",
  "REPROVADO POR FALTAS", "Reprovado por Nota", "Reprovado", "REPROVADO", "Em DP"
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const rawRows = [];

for (let i = 1; i <= 60; i++) {
  const rgm = `2024-${1000 + i}`;
  const estudante = nomesEstudantes[i - 1] || `Estudante ${i}`;
  const materia = randomChoice(materias);
  const turma = randomChoice(turmas);

  // Gera notas sujas
  const p1Num = (Math.random() * 6 + 4).toFixed(1); // 4.0 a 10.0
  const p2Num = (Math.random() * 6 + 4).toFixed(1);
  const trabNum = (Math.random() * 5 + 5).toFixed(1);

  const p1Str = Math.random() > 0.1 ? (Math.random() > 0.5 ? p1Num.replace('.', ',') : p1Num) : (Math.random() > 0.5 ? "N/A" : " - ");
  const p2Str = Math.random() > 0.1 ? (Math.random() > 0.5 ? p2Num.replace('.', ',') : p2Num) : " - ";
  const trabStr = Math.random() > 0.5 ? trabNum.replace('.', ',') : trabNum;

  const m1 = parseFloat(p1Num) || 5;
  const m2 = parseFloat(p2Num) || 5;
  const mt = parseFloat(trabNum) || 5;
  const mediaCalc = ((m1 * 0.4) + (m2 * 0.4) + (mt * 0.2)).toFixed(2);
  const mediaStr = Math.random() > 0.5 ? mediaCalc.replace('.', ',') : mediaCalc;

  // Atividades entregues em vários formatos
  const entreguesNum = Math.floor(Math.random() * 6 + 5); // 5 a 10
  const totalPassadas = 10;
  let entreguesStr = `${entreguesNum}`;
  const randFmt = Math.random();
  if (randFmt > 0.7) entreguesStr = `${entreguesNum} de 10`;
  else if (randFmt > 0.4) entreguesStr = `${entreguesNum}/10`;
  else if (randFmt > 0.2) entreguesStr = ` ${entreguesNum} entregas `;

  // Frequência suja
  const freqNum = (Math.random() * 35 + 65).toFixed(1); // 65.0% a 100%
  let freqStr = `${freqNum}%`;
  if (Math.random() > 0.5) freqStr = `${freqNum.replace('.', ',')} %`;
  if (Math.random() > 0.8) freqStr = ` ${Math.round(freqNum)}% `;

  const situacao = randomChoice(situacoes);

  // Datas variadas
  const day = String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0');
  let dataStr = `${day}/04/2024`;
  if (Math.random() > 0.6) dataStr = `2024-04-${day}`;
  else if (Math.random() > 0.3) dataStr = `${day}.04.2024`;

  rawRows.push([
    rgm,
    estudante,
    materia,
    turma,
    p1Str,
    p2Str,
    trabStr,
    mediaStr,
    entreguesStr,
    String(totalPassadas),
    freqStr,
    situacao,
    dataStr
  ]);
}

// 1. Salvar em CSV
const csvLines = [rawTeacherHeaders.join(",")];
rawRows.forEach(row => {
  csvLines.push(row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","));
});

const csvPath = path.join(__dirname, 'planilha-professor-desempenho-grande.csv');
fs.writeFileSync(csvPath, csvLines.join("\n"), 'utf8');

// 2. Salvar em XLSX
const wsData = [rawTeacherHeaders, ...rawRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Notas do Professor");

const xlsxPath = path.join(__dirname, 'planilha-professor-desempenho-grande.xlsx');
XLSX.writeFile(wb, xlsxPath);

console.log(`✅ Planilha Grande de Professor gerada com sucesso!`);
console.log(`📄 CSV: ${csvPath} (${rawRows.length} linhas)`);
console.log(`📊 XLSX: ${xlsxPath}`);
