# Plano de Arquitetura: Mapeamento Inteligente de Gráficos (Zero-Token/Low-Token)

Para resolver o problema da montagem ruim do dashboard sem gastar milhares de tokens de IA analisando linhas do CSV, a solução é criar um **Motor Analítico Heurístico Local**. 

Esse algoritmo rodará 100% no navegador (TypeScript), fará o "profiling" matemático dos dados e definirá matematicamente qual coluna vai para qual gráfico. A IA será usada **apenas** para gerar os insights de texto e títulos bonitos (gastando quase zero tokens).

---

## 1. Fase de Perfilamento (Column Profiling)
Para cada coluna, o algoritmo pegará uma amostra (ex: 100 linhas) e calculará:
- **Cardinalidade:** Quantidade de valores únicos.
- **Taxa de Preenchimento:** Quantos `%` não são nulos.
- **Comprimento Médio:** Tamanho do texto.
- **Tipo Inferido:** Tentará converter para Data, Número ou manter Texto.

**Classificação Automática (Tags):**
1. `ID` / `Ignore`: Cardinalidade 100% (ex: todas as linhas são únicas) ou nome da coluna contém "id", "cpf", "código".
2. `Currency` (Moeda): Numérico E nome contém ("valor", "preço", "custo", "total", "saldo").
3. `Metric` (Quantidade): Numérico puro (ex: "qtd", "idade", "nota").
4. `Date` (Temporal): Passou no parse de data (ISO, DD/MM/YYYY) ou contém "data", "criado_em".
5. `Category` (Dimensão): Texto/Número onde a Cardinalidade é baixa (ex: menos de 20 valores únicos. Ex: "Status", "Categoria", "Estado").
6. `Text` (Livre): Texto longo, alta cardinalidade (ex: "Descrição", "Observação").

---

## 2. Fase de Pontuação (Scoring System)
Em vez de pegar apenas `numericHeaders[0]`, o algoritmo dará "notas" (scores) para as colunas:

- **Melhor Métrica Principal (Y-Axis):**
  - +50 pts se for `Currency`.
  - +20 pts se for `Metric`.
  - -100 pts se for `ID`.
- **Melhor Categoria para Gráfico de Barras (X-Axis):**
  - Deve ter entre **5 e 20** itens únicos (ideal para barras).
- **Melhor Categoria para Gráfico de Pizza/Donut:**
  - Deve ter entre **2 e 7** itens únicos (ideal para fatias. Ex: "Status" [Pago, Pendente, Cancelado]).
- **Melhor Coluna Temporal (Eixo X de Linha):**
  - A coluna `Date` com menor quantidade de nulos.

---

## 3. Motor de Mapeamento de Gráficos (O Algoritmo)
Com as colunas ranqueadas, o sistema aloca deterministicamente:

1. **Card KPIs (Topo):** 
   - Card 1: Soma da melhor `Currency`.
   - Card 2: Contagem total.
   - Card 3: Categoria com maior frequência (ex: "Produto mais vendido").
2. **Gráfico de Barras (Comparativo):**
   - Eixo X = Coluna `Category` de maior score (5 a 20 itens).
   - Eixo Y = Coluna `Currency` ou `Metric` de maior score.
3. **Gráfico Donut (Distribuição):**
   - Eixo = Coluna `Category` com 2 a 7 itens.
   - Valor = Contagem de linhas ou soma da Métrica principal.
4. **Gráfico de Área (Evolução no Tempo):**
   - Eixo X = Melhor coluna `Date` (agrupada por mês/ano).
   - Eixo Y = Métrica principal.
5. **Gráfico de Radar:**
   - Eixo = Outra coluna `Category` (3 a 8 itens).

---

## 4. Otimização Máxima de IA (Low-Token Strategy)
Atualmente a IA recebe linhas de dados, o que gasta milhares de tokens. No novo modelo, enviamos **apenas a assinatura estrutural** para a IA.

**O que enviamos para a IA (Extremamente Curto):**
```json
{
  "metric": "Faturamento",
  "barCategory": "Região",
  "donutCategory": "Status"
}
```

**O que a IA responde (Gasto Mínimo):**
Ela apenas formula textos em português de nível executivo.
```json
{
  "barChartTitle": "Faturamento Comparativo por Região",
  "donutChartTitle": "Distribuição de Receita por Status",
  "insights": ["A região Sudeste concentra a maior parte do faturamento."]
}
```

---

## Próximos Passos (Implementação)
Se você aprovar esse modelo:
1. Criarei um arquivo `src/services/dataAnalyzer.ts` que terá esse algoritmo de Scoring e Tipagem matemática pura.
2. Refatorarei o `Dashboard.tsx` para usar o resultado desse algoritmo para decidir as chaves dos gráficos (`dataKey`, `xAxisKey`, etc).
3. Reduzirei o prompt do `groqService.ts` para enviar apenas os metadados, deixando a API instantânea e barata.
