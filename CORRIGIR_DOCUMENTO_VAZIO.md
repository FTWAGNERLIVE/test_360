# 🔧 Corrigir Documento com Campos Vazios

## 🚨 Problema Identificado

Você tem um documento na coleção `onboarding_data` com ID `g7fMkfGnzOeX7LdU3pk8`, mas **todos os campos estão vazios** (strings vazias `""`).

**Campos vazios:**
- `companyName: ""`
- `contact: ""`
- `dataSource: ""`
- `email: ""`
- `goals: ""` ⚠️ (deveria ser array, não string!)
- `industry: ""`
- `specificQuestions: ""`
- `userId: ""`

---

## 🔍 Por Que Isso Aconteceu?

Isso pode ter acontecido por:

1. **Documento criado manualmente** no Firebase Console sem dados
2. **Erro ao salvar** - o documento foi criado mas os dados não foram passados
3. **Código antigo** que criava documentos vazios

---

## ✅ SOLUÇÃO RECOMENDADA: Deletar e Deixar a Aplicação Criar

### Opção 1: Deletar o Documento (RECOMENDADO)

1. **Firebase Console** → **Firestore Database** → **Data**
2. **Coleção:** `onboarding_data`
3. **Clique no documento** `g7fMkfGnzOeX7LdU3pk8`
4. **Clique nos três pontos** (⋮) no topo do painel direito
5. **Selecione:** "Excluir documento" ou "Delete document"
6. **Confirme** a exclusão

**Depois:**
- **Preencha o formulário** de onboarding na aplicação
- **Clique em "Salvar dados"**
- A aplicação criará um **novo documento** com os dados corretos automaticamente

---

## ✅ OPÇÃO 2: Preencher Manualmente (NÃO RECOMENDADO)

Se você quiser manter o documento e preencher manualmente:

### Passo 1: Deletar Campos Vazios

1. **Clique em cada campo vazio**
2. **Delete o campo** (ícone de lixeira)
3. **Repita** para todos os campos vazios

### Passo 2: Adicionar Campos Corretos

1. **Clique em "+ Adicionar campo"**
2. **Adicione cada campo** com os valores corretos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `companyName` | string | Nome da empresa |
| `industry` | string | Setor/Indústria |
| `dataSource` | string | Fonte de dados |
| `goals` | **array** | `["objetivo1", "objetivo2"]` ⚠️ |
| `specificQuestions` | string | Perguntas específicas |
| `contact` | string | Contato (telefone/email) |
| `userId` | string | UID do usuário |
| `email` | string | Email do usuário |

**⚠️ IMPORTANTE:** O campo `goals` deve ser um **array**, não uma string!

### Passo 3: Como Adicionar o Campo `goals` como Array

1. **Clique em "+ Adicionar campo"**
2. **Nome:** `goals`
3. **Tipo:** Selecione **array**
4. **Adicione itens:**
   - Clique em "+ Adicionar item"
   - Digite o primeiro objetivo
   - Repita para cada objetivo

---

## 🎯 O Que Fazer Agora

### Se Você Quer Testar o Salvamento:

1. **Delete o documento vazio** (Opção 1 acima)
2. **Vá para a aplicação**
3. **Preencha o formulário** de onboarding
4. **Clique em "Salvar dados"**
5. **Verifique o console** (F12) para ver se salvou
6. **Volte ao Firestore** e verifique se o novo documento foi criado com dados

---

## 🔍 Verificar se Está Funcionando

Após preencher o formulário e salvar:

1. **Firebase Console** → **Firestore Database** → **Data**
2. **Coleção:** `onboarding_data`
3. **Procure** por um documento **novo** (não o vazio)
4. **Verifique** se tem:
   - ✅ `companyName` com valor (não vazio)
   - ✅ `industry` com valor
   - ✅ `dataSource` com valor
   - ✅ `goals` como **array** (não string)
   - ✅ `userId` com o UID do usuário
   - ✅ `email` com o email do usuário

---

## ⚠️ IMPORTANTE

**Não edite documentos manualmente no Firebase Console!**

A aplicação cria os documentos automaticamente quando alguém preenche o formulário. Se você editar manualmente, pode causar problemas de estrutura de dados.

**Sempre deixe a aplicação criar os documentos automaticamente!**

---

## 🆘 Se Ainda Não Salvar

Se mesmo após deletar o documento vazio e tentar salvar novamente os dados não forem salvos:

1. **Abra o Console** do navegador (F12)
2. **Tente salvar** novamente
3. **Procure por erros** no console
4. **Verifique** se aparece:
   - `💾 Tentando salvar dados de onboarding:` → Salvamento iniciado
   - `✅ Dados de onboarding salvos com sucesso` → Salvou
   - `❌ Erro ao salvar` → Erro (veja o código)

5. **Consulte** o guia `RESOLVER_ERRO_NAO_SALVA_DADOS.md` para resolver o erro específico

---

## ✅ Resumo

**O que você precisa fazer:**

1. ✅ **Delete o documento vazio** `g7fMkfGnzOeX7LdU3pk8`
2. ✅ **Preencha o formulário** na aplicação
3. ✅ **Clique em "Salvar dados"**
4. ✅ **Verifique** se o novo documento foi criado com dados corretos

**Não se preocupe!** O documento vazio não é um problema grave. Apenas delete e deixe a aplicação criar corretamente! 🎉
