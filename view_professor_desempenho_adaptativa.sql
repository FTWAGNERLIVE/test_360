-- =========================================================================
-- VIEW SQL UNIVERSAL E ADAPTATIVA (IA + ALGORITMO)
-- Contexto do Cliente: Educação / Desempenho Escolar do Professor
-- =========================================================================
CREATE OR REPLACE VIEW vw_dados_cliente_tratados AS
SELECT
  -- 🪪 Matrícula / RGM / Código ID: rgm_matricula
  TRIM("RGM / Matricula") AS rgm_matricula,
  TRIM("Nome do Estudante") AS nome_do_estudante,
  -- 🧠 Unificação Semântica De-Para da IA: disciplina_materia
  CASE 
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'matemática aplicada' THEN 'Matemática'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'quimica organica' THEN 'Química'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'fisica i' THEN 'Física'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'lingua portuguesa' THEN 'Português'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'portugues' THEN 'Português'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'matematica' THEN 'Matemática'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'matematica' THEN 'Matemática'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'física i' THEN 'Física'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'historia' THEN 'História'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'história contemporânea' THEN 'História'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'língua portuguesa' THEN 'Português'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'historia' THEN 'História'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'química orgânica' THEN 'Química'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'fisica 1' THEN 'Física'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'quimica' THEN 'Química'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'historia geral' THEN 'História'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'física quantica i' THEN 'Física'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'quimica' THEN 'Química'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'portugues' THEN 'Português'
    WHEN LOWER(TRIM("Disciplina / Materia")) = 'matematica aplicada' THEN 'Matemática'
    ELSE INITCAP(TRIM("Disciplina / Materia"))
  END AS disciplina_materia,
  -- 🧠 Unificação Semântica De-Para da IA: turma_periodo
  CASE 
    WHEN LOWER(TRIM("Turma / Periodo")) = '2º ano b' THEN '2º Ano B'
    WHEN LOWER(TRIM("Turma / Periodo")) = '1º ano a' THEN '1º Ano A'
    WHEN LOWER(TRIM("Turma / Periodo")) = '3 ano c' THEN '3º Ano C'
    WHEN LOWER(TRIM("Turma / Periodo")) = '1 ano a' THEN '1º Ano A'
    WHEN LOWER(TRIM("Turma / Periodo")) = '2 ano b' THEN '2º Ano B'
    WHEN LOWER(TRIM("Turma / Periodo")) = '1a' THEN '1º Ano A'
    WHEN LOWER(TRIM("Turma / Periodo")) = '3º ano c' THEN '3º Ano C'
    ELSE INITCAP(TRIM("Turma / Periodo"))
  END AS turma_periodo,
  -- 🎓 Nota Escolar / Média Decimal (0.00 a 10.00): nota_prova_1
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("Nota Prova 1"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(4,2)) AS nota_prova_1,
  -- 🎓 Nota Escolar / Média Decimal (0.00 a 10.00): nota_prova_2
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("Nota Prova 2"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(4,2)) AS nota_prova_2,
  -- 🎓 Nota Escolar / Média Decimal (0.00 a 10.00): nota_trabalhos
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("Nota Trabalhos"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(4,2)) AS nota_trabalhos,
  -- 🎓 Nota Escolar / Média Decimal (0.00 a 10.00): media_final_calculada
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("Media Final Calculada"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(4,2)) AS media_final_calculada,
  -- 📝 Quantidade de Atividades Entregues (Extrai Número Inteiro): qtd_atividades_entregues
  CAST(NULLIF(SUBSTRING(REGEXP_REPLACE(TRIM("Qtd Atividades Entregues"), '[^0-9]', ' ') FROM 1 FOR 3), '') AS INTEGER) AS qtd_atividades_entregues,
  -- 📝 Quantidade de Atividades Entregues (Extrai Número Inteiro): total_atividades_passadas
  CAST(NULLIF(SUBSTRING(REGEXP_REPLACE(TRIM("Total Atividades Passadas"), '[^0-9]', ' ') FROM 1 FOR 3), '') AS INTEGER) AS total_atividades_passadas,
  -- 📊 Frequência / Porcentagem (%): frequencia_presenca
  CAST(NULLIF(REGEXP_REPLACE(REPLACE(TRIM("Frequencia / Presenca (%)"), ',', '.'), '[^0-9.]', ''), '') AS DECIMAL(5,2)) AS frequencia_presenca,
  -- 🧠 Unificação Semântica De-Para da IA: situacao_final_do_aluno
  CASE 
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'em dp' THEN 'Reprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'reprovado por faltas' THEN 'Reprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'em recuperação' THEN 'Em Recuperação'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'aprovada' THEN 'Aprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'recuperação' THEN 'Em Recuperação'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'aprovado' THEN 'Aprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'aprovado por nota e frequencia' THEN 'Aprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'reprovado' THEN 'Reprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'em recuperacao' THEN 'Em Recuperação'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'em recuperacao' THEN 'Em Recuperação'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'reprovado por nota' THEN 'Reprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'reprovado' THEN 'Reprovado'
    WHEN LOWER(TRIM("Situacao Final do Aluno")) = 'aprovado' THEN 'Aprovado'
    ELSE INITCAP(TRIM("Situacao Final do Aluno"))
  END AS situacao_final_do_aluno,
  -- 📅 Tratamento Adaptativo de Data: data_ultima_avaliacao
  CASE 
    WHEN TRIM("Data Ultima Avaliacao") REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN TO_DATE(TRIM("Data Ultima Avaliacao"), 'DD/MM/YYYY')
    WHEN TRIM("Data Ultima Avaliacao") REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN CAST(TRIM("Data Ultima Avaliacao") AS DATE)
    WHEN TRIM("Data Ultima Avaliacao") REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}' THEN TO_DATE(TRIM("Data Ultima Avaliacao"), 'DD-MM-YYYY')
    WHEN TRIM("Data Ultima Avaliacao") REGEXP '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}' THEN TO_DATE(TRIM("Data Ultima Avaliacao"), 'DD.MM.YYYY')
    ELSE NULL
  END AS data_ultima_avaliacao
FROM tb_diario_professor_raw;