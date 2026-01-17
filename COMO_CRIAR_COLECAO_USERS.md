# 📋 Como Criar a Coleção `users` no Firestore

## ⚠️ IMPORTANTE

**Você NÃO precisa criar a coleção manualmente!** O Firestore cria automaticamente quando você salva o primeiro documento. Mas se quiser criar manualmente ou verificar, siga os passos abaixo.

---

## 🎯 OPÇÃO 1: Criar Automaticamente (RECOMENDADO)

A coleção será criada automaticamente quando:

1. **Alguém criar uma conta** na aplicação (botão "Criar conta")
2. **Você criar o documento do usuário admin** manualmente (veja Opção 2)

**Não precisa fazer nada!** Apenas crie o documento e a coleção aparecerá.

---

## 🎯 OPÇÃO 2: Criar Manualmente (Passo a Passo)

### Passo 1: Acessar o Firestore

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **farol-360**
3. No menu lateral, clique em: **Firestore Database**
4. Clique na aba: **Data** (no topo)

---

### Passo 2: Criar a Coleção

1. Se você ver a mensagem **"Iniciar uma coleção"** ou **"Start collection"**:
   - Clique em **"Iniciar uma coleção"** ou **"Start collection"**

2. Se você já tiver outras coleções:
   - Clique no botão **"+ Adicionar coleção"** ou **"+ Add collection"** (no topo)

---

### Passo 3: Configurar a Coleção

1. **Nome da coleção:**
   ```
   users
   ```
   ⚠️ **IMPORTANTE:** O nome deve ser exatamente `users` (minúsculas, sem espaços)

2. **ID do documento:**
   - Escolha: **"Definir ID do documento"** ou **"Set document ID"**
   - Digite o **UID do usuário admin** (você vai pegar isso no próximo passo)

---

### Passo 4: Pegar o UID do Usuário Admin

1. **Ainda no Firebase Console**, vá em: **Authentication** → **Users**
2. **Procure** pelo usuário `admin@creattive.com`
3. **Clique no usuário** para abrir os detalhes
4. **Copie o UID** (é um código longo, tipo: `7v72v6oyEsTs1pgPjPmqF9cdo6q1`)

**OU** se você ainda não criou o usuário:
1. Vá em: **Authentication** → **Users** → **Add user**
2. Crie o usuário com email `admin@creattive.com` e senha `admin123`
3. Depois copie o UID

---

### Passo 5: Criar o Documento

1. **Volte para:** Firestore Database → Data
2. **Coleção:** `users`
3. **ID do documento:** Cole o UID que você copiou
4. **Clique em:** "Próximo" ou "Next"

---

### Passo 6: Adicionar os Campos

Adicione os seguintes campos (um por um):

#### Campo 1: `email`
- **Tipo:** `string`
- **Valor:** `admin@creattive.com`

#### Campo 2: `name`
- **Tipo:** `string`
- **Valor:** `Administrador`

#### Campo 3: `role`
- **Tipo:** `string`
- **Valor:** `admin`
- ⚠️ **IMPORTANTE:** Deve ser exatamente `admin` (minúsculas)

#### Campo 4: `onboardingCompleted`
- **Tipo:** `boolean`
- **Valor:** `true`

#### Campo 5: `createdAt`
- **Tipo:** `timestamp`
- **Valor:** Clique em "Selecionar data" e escolha a data/hora atual
- **OU** deixe o Firebase preencher automaticamente

#### Campo 6: `trialEndDate`
- **Tipo:** `timestamp`
- **Valor:** Escolha uma data 10 anos no futuro (ex: 2034-01-17)

---

### Passo 7: Salvar

1. **Clique em:** "Salvar" ou "Save"
2. **Pronto!** A coleção `users` foi criada com o documento do admin

---

## 📊 Estrutura Final do Documento

O documento deve ficar assim:

```json
{
  "email": "admin@creattive.com",
  "name": "Administrador",
  "role": "admin",
  "onboardingCompleted": true,
  "createdAt": "2024-01-17T00:00:00Z",
  "trialEndDate": "2034-01-17T00:00:00Z"
}
```

---

## ✅ Verificação

Após criar, você deve ver:

1. **Firestore Database** → **Data**
2. **Coleção:** `users`
3. **Documento:** Com o UID do usuário admin
4. **Campos:** Todos os 6 campos listados acima

---

## 🎯 Estrutura Visual

```
Firestore Database
└── users (coleção)
    └── [UID do usuário] (documento)
        ├── email: "admin@creattive.com"
        ├── name: "Administrador"
        ├── role: "admin"
        ├── onboardingCompleted: true
        ├── createdAt: [timestamp]
        └── trialEndDate: [timestamp]
```

---

## ⚠️ IMPORTANTE: Tipos de Dados

- **`email`**: `string` (texto)
- **`name`**: `string` (texto)
- **`role`**: `string` (texto) - valores possíveis: `"admin"`, `"vendas"`, `"user"`
- **`onboardingCompleted`**: `boolean` (verdadeiro/falso)
- **`createdAt`**: `timestamp` (data/hora)
- **`trialEndDate`**: `timestamp` (data/hora)

---

## 🆘 Problemas Comuns

### "Não consigo criar a coleção"
- Verifique se o Firestore está em **Native mode** (não Datastore mode)
- Verifique se você tem permissões de administrador no projeto

### "O documento não aparece"
- Aguarde alguns segundos e recarregue a página
- Verifique se você está na aba **Data** (não Rules ou Indexes)

### "Erro ao salvar"
- Verifique se as regras do Firestore estão publicadas
- Verifique se você está autenticado no Firebase Console

---

## 💡 DICA

**Se você já tem o usuário criado no Firebase Auth**, você pode usar o código da aplicação para criar o documento automaticamente:

1. Faça login com `admin@creattive.com` / `admin123` (se o fallback funcionar)
2. O sistema tentará criar o documento automaticamente
3. Se não funcionar, crie manualmente seguindo os passos acima

---

## 📸 Screenshots de Referência

### Tela de Criação de Coleção:
```
┌─────────────────────────────────────┐
│ Firestore Database                   │
├─────────────────────────────────────┤
│ [Data] [Rules] [Indexes] [Usage]     │
├─────────────────────────────────────┤
│                                     │
│  + Adicionar coleção                │
│                                     │
│  Ou:                                │
│  Iniciar uma coleção                │
│                                     │
└─────────────────────────────────────┘
```

### Tela de Adicionar Campos:
```
┌─────────────────────────────────────┐
│ Adicionar campo                     │
├─────────────────────────────────────┤
│ Nome do campo: [email        ]     │
│ Tipo: [string ▼]                    │
│ Valor: [admin@creattive.com]        │
│                                     │
│ [Cancelar] [Adicionar campo]       │
└─────────────────────────────────────┘
```

---

## ✅ Checklist Final

- [ ] Coleção `users` criada
- [ ] Documento criado com o UID do usuário admin
- [ ] Campo `email` = `admin@creattive.com`
- [ ] Campo `name` = `Administrador`
- [ ] Campo `role` = `admin` (minúsculas)
- [ ] Campo `onboardingCompleted` = `true`
- [ ] Campo `createdAt` = timestamp atual
- [ ] Campo `trialEndDate` = timestamp futuro (10 anos)
- [ ] Documento salvo com sucesso

---

Após completar, você poderá fazer login com `admin@creattive.com` e será redirecionado para `/admin`! 🎉
