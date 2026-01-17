# 🔧 Configuração Completa do Firebase - Passo a Passo

Este guia mostra **exatamente** como configurar o Firebase para que o salvamento de dados funcione corretamente.

---

## 📋 CHECKLIST PRÉ-REQUISITOS

Antes de começar, você precisa ter:
- [ ] Conta no Google (para acessar Firebase Console)
- [ ] Projeto Firebase criado (ex: `farol-360`)
- [ ] Acesso ao Firebase Console

---

## 🎯 PASSO 1: Verificar/Criar Firestore Database

### 1.1 Acessar o Firestore

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto: **farol-360**
3. No menu lateral, clique em: **Firestore Database**

### 1.2 Criar o Database (se não existir)

**Se aparecer "Criar banco de dados" ou "Create database":**

1. Clique em **"Criar banco de dados"**
2. Escolha: **"Iniciar no modo de produção"** ou **"Start in production mode"**
3. Selecione a **localização** (ex: `southamerica-east1` para Brasil)
4. Clique em **"Habilitar"** ou **"Enable"**
5. Aguarde alguns minutos enquanto o banco é criado

**Se já existir:**
- Verifique se está em **Native mode** (não Datastore mode)
- Se estiver em Datastore mode, você precisa criar um novo em Native mode

---

## 🎯 PASSO 2: Configurar Regras do Firestore (CRÍTICO)

### 2.1 Acessar as Regras

1. Ainda em **Firestore Database**
2. Clique na aba **"Regras"** ou **"Rules"** (no topo)

### 2.2 Copiar as Regras

**Copie EXATAMENTE este código:**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função: Verificar se está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Função: Verificar se é o dono do documento
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Função: Verificar se é admin
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Função: Verificar se é admin ou vendas
    function isAdminOrVendas() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'vendas');
    }
    
    // Regras para coleção 'users'
    match /users/{userId} {
      // Ler: próprio usuário, admin ou vendas
      allow read: if isOwner(userId) || isAdminOrVendas();
      // Criar: usuário autenticado criando seu próprio documento
      allow create: if isAuthenticated() && request.auth.uid == userId;
      // Atualizar: próprio usuário ou admin
      allow update: if isOwner(userId) || isAdmin();
      // Deletar: apenas admin
      allow delete: if isAdmin();
    }
    
    // Regras para coleção 'onboarding_data' (DADOS DOS CLIENTES)
    match /onboarding_data/{onboardingId} {
      // Ler: próprio usuário (seus dados) ou admin/vendas
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdminOrVendas());
      // Criar: usuário autenticado criando documento com seu próprio userId
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      // Atualizar/Deletar: apenas admin
      allow update, delete: if isAdmin();
    }
    
    // Regras para coleção 'support_messages'
    match /support_messages/{messageId} {
      // Ler: próprio usuário ou admin
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      // Criar: usuário autenticado criando mensagem com seu próprio userId
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      // Atualizar/Deletar: apenas admin
      allow update, delete: if isAdmin();
    }
    
    // Negar acesso a todas as outras coleções
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.3 Colar e Publicar

1. **APAGUE** tudo que está no editor de regras
2. **COLE** o código acima
3. Clique em **"Publicar"** ou **"Publish"** (botão azul no topo)
4. **AGUARDE** aparecer "Publicado" ou "Published" (não "Rascunho" ou "Draft")
5. Aguarde **1-2 minutos** para as regras se propagarem

**⚠️ IMPORTANTE:** As regras devem estar **PUBLICADAS**, não em rascunho!

---

## 🎯 PASSO 3: Configurar Authentication

### 3.1 Habilitar Email/Password

1. No Firebase Console, vá em: **Authentication**
2. Clique na aba **"Sign-in method"** ou **"Método de login"**
3. Clique em **"Email/Password"**
4. **Habilite** a primeira opção: **"Enable"**
5. Clique em **"Salvar"** ou **"Save"**

### 3.2 Autorizar Domínios

1. Ainda em **Authentication**
2. Clique no ícone de **engrenagem ⚙️** no topo (Settings)
3. Role até **"Authorized domains"** ou **"Domínios autorizados"**
4. **Verifique** se os seguintes domínios estão listados:
   - `localhost` (já vem por padrão)
   - Seu domínio do Vercel (ex: `seu-projeto.vercel.app`)
   - Seu domínio customizado (se tiver)

5. **Se o domínio do Vercel NÃO estiver:**
   - Clique em **"Add domain"** ou **"Adicionar domínio"**
   - Digite o domínio (ex: `seu-projeto.vercel.app`)
   - **NÃO** coloque `https://`
   - **NÃO** coloque `/` no final
   - Clique em **"Add"** ou **"Adicionar"**
   - Aguarde **2-3 minutos**

---

## 🎯 PASSO 4: Verificar Variáveis de Ambiente no Vercel

### 4.1 Acessar o Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto

### 4.2 Configurar Variáveis

1. Vá em: **Settings** → **Environment Variables**
2. **Verifique** se todas estas variáveis estão configuradas:

```
VITE_FIREBASE_API_KEY=AIzaSyD3mWWM58sGLu7WmxTlbjF4Zy4Yr1Gj648
VITE_FIREBASE_AUTH_DOMAIN=farol-360.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=farol-360
VITE_FIREBASE_STORAGE_BUCKET=farol-360.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=651344183552
VITE_FIREBASE_APP_ID=1:651344183552:web:750ba5022af2c45a88f3e5
VITE_FIREBASE_MEASUREMENT_ID=G-Q1FCV8G4HB
```

3. **⚠️ IMPORTANTE:** 
   - `VITE_FIREBASE_PROJECT_ID` deve ser **`farol-360`** (não `farol-360.firebasestorage.app`)
   - Todas as variáveis devem ter o prefixo `VITE_`

4. **Se alguma estiver faltando ou incorreta:**
   - Adicione/edite a variável
   - Clique em **"Save"**
   - **Faça um novo deploy** após alterar

---

## 🎯 PASSO 5: Verificar Estrutura das Coleções

### 5.1 Coleção `users`

**Não precisa criar manualmente!** Será criada automaticamente quando:
- Alguém criar uma conta
- Alguém fizer login pela primeira vez

**Estrutura esperada:**
```
users/
  └── [UID do usuário]/
      ├── email: string
      ├── name: string
      ├── role: "admin" | "vendas" | "user"
      ├── onboardingCompleted: boolean
      ├── createdAt: timestamp
      └── trialEndDate: timestamp
```

### 5.2 Coleção `onboarding_data`

**Não precisa criar manualmente!** Será criada automaticamente quando:
- Um cliente preencher o formulário de onboarding
- Clicar em "Salvar dados"

**Estrutura esperada:**
```
onboarding_data/
  └── [ID auto-gerado]/
      ├── companyName: string
      ├── industry: string
      ├── dataSource: string
      ├── goals: array
      ├── specificQuestions: string
      ├── contact: string
      ├── userId: string (UID do usuário)
      ├── email: string
      └── timestamp: timestamp
```

---

## ✅ VERIFICAÇÃO FINAL

Após configurar tudo, verifique:

### Checklist:

- [ ] **Firestore Database** criado e em **Native mode**
- [ ] **Regras do Firestore** estão **PUBLICADAS** (não Draft)
- [ ] **Email/Password** está **habilitado** em Authentication
- [ ] **Domínio do Vercel** está **autorizado** em Authentication
- [ ] **Variáveis de ambiente** estão configuradas no Vercel
- [ ] **Novo deploy** feito no Vercel (após alterar variáveis)

---

## 🧪 TESTE APÓS CONFIGURAR

### 1. Criar uma Conta de Teste

1. Acesse sua aplicação
2. Clique em **"Criar conta"**
3. Preencha:
   - Nome
   - Email
   - Senha
4. Clique em **"Criar conta"**

### 2. Preencher Formulário de Onboarding

1. Após criar a conta, você será redirecionado para `/onboarding`
2. Preencha **todos os campos**:
   - Nome da Empresa
   - Setor/Indústria
   - Fonte de Dados
   - Objetivos (pelo menos 1)
   - Perguntas Específicas (opcional)
   - Contato
3. Clique em **"Salvar dados"**

### 3. Verificar se Salvou

**No Console do Navegador (F12):**
- Procure por: `✅ Dados salvos com sucesso! ID do documento: ...`

**No Firebase Console:**
1. Vá em: **Firestore Database** → **Data**
2. Coleção: `onboarding_data`
3. Procure por um documento **novo** com dados preenchidos

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Permissão negada"

**Causa:** Regras do Firestore não publicadas ou incorretas

**Solução:**
1. Vá em Firestore Database → Rules
2. Verifique se está "Published"
3. Se não estiver, publique as regras
4. Aguarde 1-2 minutos

---

### Erro: "Firestore indisponível"

**Causa:** Firestore não habilitado ou em modo errado

**Solução:**
1. Verifique se o Firestore está criado
2. Verifique se está em **Native mode** (não Datastore)
3. Aguarde alguns minutos e tente novamente

---

### Erro: "Operação demorou muito"

**Causa:** Timeout (20 segundos) - geralmente indica problema de regras ou conexão

**Solução:**
1. Verifique se as regras estão publicadas
2. Verifique sua conexão com a internet
3. Verifique se o Firestore está online

---

### Erro: "Usuário não autenticado"

**Causa:** Sessão expirada ou usuário não logado

**Solução:**
1. Faça logout e login novamente
2. Verifique se o documento do usuário existe no Firestore

---

## 📊 ESTRUTURA VISUAL DAS REGRAS

```
Firestore Rules
├── users/
│   ├── Ler: próprio usuário OU admin/vendas
│   ├── Criar: usuário autenticado (seu próprio documento)
│   ├── Atualizar: próprio usuário OU admin
│   └── Deletar: apenas admin
│
├── onboarding_data/ (DADOS DOS CLIENTES)
│   ├── Ler: próprio usuário (seus dados) OU admin/vendas
│   ├── Criar: usuário autenticado (userId == uid)
│   ├── Atualizar: apenas admin
│   └── Deletar: apenas admin
│
└── support_messages/
    ├── Ler: próprio usuário OU admin
    ├── Criar: usuário autenticado (userId == uid)
    ├── Atualizar: apenas admin
    └── Deletar: apenas admin
```

---

## 💡 DICA IMPORTANTE

**A regra mais importante para salvar dados de onboarding:**

```firestore
allow create: if isAuthenticated() && 
                 request.resource.data.userId == request.auth.uid;
```

Isso significa:
- ✅ Usuário deve estar **autenticado**
- ✅ O `userId` no documento deve ser **igual** ao `uid` do usuário autenticado

**O código agora garante isso automaticamente!** 🎉

---

## ✅ Após Configurar

1. **Aguarde 2-3 minutos** para tudo se propagar
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Recarregue a página** (F5)
4. **Teste criando uma conta** e salvando dados
5. **Verifique no Firestore** se os dados foram salvos

---

Se ainda houver problemas após seguir este guia, compartilhe:
- Screenshot das regras do Firestore (mostrando "Published")
- Screenshot do console do navegador com o erro
- Screenshot da aba Network mostrando requisições para `firestore.googleapis.com`
