# 📋 Estrutura da Coleção `onboarding_data`

## 🎯 Estrutura Completa

```
Coleção: onboarding_data
└── Documento ID: [gerado automaticamente pelo Firestore]
    ├── companyName (string): "Nome da Empresa"
    ├── industry (string): "Setor/Indústria"
    ├── dataSource (string): "Fonte de Dados"
    ├── goals (array): ["objetivo1", "objetivo2", ...]
    ├── specificQuestions (string): "Perguntas específicas"
    ├── contact (string): "Contato (telefone/email)"
    ├── userId (string): "UID do usuário do Firebase Auth"
    ├── email (string): "email@usuario.com"
    └── timestamp (timestamp): [data/hora atual]
```

---

## 📝 Tipos de Dados Corretos

| Campo | Tipo | Exemplo | Obrigatório |
|-------|------|-----------|------------|
| `companyName` | **string** | `"Minha Empresa LTDA"` | ✅ Sim |
| `industry` | **string** | `"Varejo"` ou `"E-commerce"` | ✅ Sim |
| `dataSource` | **string** | `"Google Analytics"` ou `"CRM"` | ✅ Sim |
| `goals` | **array** | `["Aumentar vendas", "Melhorar ROI"]` | ✅ Sim |
| `specificQuestions` | **string** | `"Quero entender melhor..."` | ⚠️ Pode ser vazio |
| `contact` | **string** | `"(11) 99999-9999"` ou `"contato@empresa.com"` | ✅ Sim |
| `userId` | **string** | `"7v72v6oyEsTs1pgPjPmqF9cdo6q1"` | ✅ Sim |
| `email` | **string** | `"usuario@email.com"` | ✅ Sim |
| `timestamp` | **timestamp** | Data/hora atual | ✅ Sim (automático) |

---

## ⚠️ PROBLEMAS COMUNS

### 1. Campo `goals` como String (ERRADO)

**❌ ERRADO:**
```json
{
  "goals": "Aumentar vendas, Melhorar ROI"
}
```

**✅ CORRETO:**
```json
{
  "goals": ["Aumentar vendas", "Melhorar ROI"]
}
```

**Como corrigir no Firebase Console:**
1. Clique no campo `goals`
2. **Delete** o campo
3. **Adicione novamente** com tipo **array**
4. Adicione cada objetivo como um item do array

---

### 2. Campos Vazios (Strings Vazias)

**❌ ERRADO:**
```json
{
  "companyName": "",
  "contact": "",
  "email": ""
}
```

**✅ CORRETO:**
```json
{
  "companyName": "Nome da Empresa",
  "contact": "(11) 99999-9999",
  "email": "usuario@email.com"
}
```

**Se um campo não tiver valor:**
- **Deixe o campo vazio** (não adicione string vazia `""`)
- **OU** use um valor padrão como `"Não informado"`

---

### 3. Timestamp Incorreto

**❌ ERRADO:**
```json
{
  "timestamp": "2026-01-17T00:00:00Z"
}
```

**✅ CORRETO:**
```json
{
  "timestamp": [timestamp] // Use o tipo "timestamp" do Firestore
}
```

**Como adicionar no Firebase Console:**
1. Tipo: **timestamp**
2. Valor: Selecione data/hora atual
3. **OU** deixe o Firestore preencher automaticamente

---

## 📊 Exemplo Completo de Documento

```json
{
  "companyName": "Empresa Exemplo LTDA",
  "industry": "E-commerce",
  "dataSource": "Google Analytics",
  "goals": [
    "Aumentar vendas online",
    "Melhorar taxa de conversão",
    "Reduzir taxa de abandono"
  ],
  "specificQuestions": "Quero entender melhor o comportamento dos clientes no checkout",
  "contact": "(11) 98765-4321",
  "userId": "7v72v6oyEsTs1pgPjPmqF9cdo6q1",
  "email": "contato@empresaexemplo.com",
  "timestamp": "2026-01-17T12:00:00Z"
}
```

---

## 🔧 Como Criar/Corrigir no Firebase Console

### Passo 1: Acessar o Documento

1. **Firebase Console** → **Firestore Database** → **Data**
2. **Coleção:** `onboarding_data`
3. **Clique no documento** que precisa ser corrigido

---

### Passo 2: Corrigir Campo `goals` (se estiver como string)

1. **Delete** o campo `goals` atual
2. **Clique em "Adicionar campo"** ou "+ Add field"
3. **Nome:** `goals`
4. **Tipo:** Selecione **array**
5. **Adicione itens:**
   - Clique em "+ Adicionar item" ou "+ Add item"
   - Digite o primeiro objetivo
   - Repita para cada objetivo

---

### Passo 3: Corrigir Campos Vazios

1. **Para cada campo vazio** (`""`):
   - **Delete** o campo se não tiver valor
   - **OU** edite e adicione um valor válido

2. **Campos obrigatórios** que devem ter valor:
   - `companyName`
   - `industry`
   - `dataSource`
   - `goals` (array com pelo menos 1 item)
   - `contact`
   - `userId`
   - `email`
   - `timestamp`

---

### Passo 4: Verificar Timestamp

1. **Clique no campo `timestamp`**
2. **Verifique o tipo:** Deve ser **timestamp** (não string)
3. **Se estiver como string:**
   - Delete o campo
   - Adicione novamente com tipo **timestamp**
   - Selecione data/hora atual

---

## ✅ Checklist de Validação

Antes de salvar, verifique:

- [ ] `companyName` é uma string não vazia
- [ ] `industry` é uma string não vazia
- [ ] `dataSource` é uma string não vazia
- [ ] `goals` é um **array** (não string) com pelo menos 1 item
- [ ] `specificQuestions` é uma string (pode ser vazia, mas não `""`)
- [ ] `contact` é uma string não vazia
- [ ] `userId` é uma string não vazia (UID válido)
- [ ] `email` é uma string não vazia (email válido)
- [ ] `timestamp` é do tipo **timestamp** (não string)

---

## 🎯 Estrutura Visual no Firebase Console

```
┌─────────────────────────────────────────────────────────┐
│ Firestore Database                                      │
├─────────────────────────────────────────────────────────┤
│ onboarding_data                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Document ID: [auto-gerado]                          │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ companyName: "Empresa Exemplo LTDA"                 │ │
│ │ industry: "E-commerce"                               │ │
│ │ dataSource: "Google Analytics"                       │ │
│ │ goals: [array]                                        │ │
│ │   ├─ [0]: "Aumentar vendas online"                  │ │
│ │   ├─ [1]: "Melhorar taxa de conversão"              │ │
│ │   └─ [2]: "Reduzir taxa de abandono"                │ │
│ │ specificQuestions: "Quero entender melhor..."        │ │
│ │ contact: "(11) 98765-4321"                          │ │
│ │ userId: "7v72v6oyEsTs1pgPjPmqF9cdo6q1"              │ │
│ │ email: "contato@empresaexemplo.com"                  │ │
│ │ timestamp: January 17, 2026 at 12:00:00 UTC-4       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🆘 Se Não Conseguir Corrigir

### Opção 1: Deletar e Recriar

1. **Delete o documento** atual
2. **Deixe a aplicação criar automaticamente** quando alguém preencher o formulário de onboarding
3. A aplicação criará com a estrutura correta

### Opção 2: Usar a Aplicação

1. **Não edite manualmente** no Firebase Console
2. **Use a aplicação** para preencher o formulário de onboarding
3. A aplicação criará o documento com a estrutura correta automaticamente

---

## 💡 DICA IMPORTANTE

**A coleção `onboarding_data` é criada automaticamente** quando alguém preenche o formulário de onboarding na aplicação. Você não precisa criar manualmente!

**Se você está vendo documentos com estrutura incorreta:**
- Eles podem ter sido criados manualmente ou por uma versão antiga do código
- **Deixe a aplicação criar novos documentos** automaticamente
- **OU** corrija os existentes seguindo este guia

---

## 📝 Notas sobre Tipos

- **string**: Texto simples
- **array**: Lista de valores (para `goals`, cada objetivo é um item)
- **timestamp**: Data/hora (use o tipo timestamp do Firestore, não string)

---

## ✅ Após Corrigir

1. **Salve o documento**
2. **Aguarde alguns segundos**
3. **Recarregue a página** da aplicação
4. **Verifique** se os dados aparecem corretamente no painel admin/vendas
