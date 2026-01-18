# 🚨 RESOLVER: Firestore "client is offline" - Solução Definitiva

## 🎯 Problema Identificado

O Firestore está indo direto para "offline" e travando a aplicação. Isso acontece **antes** de tentar salvar dados, durante o `onAuthStateChange`.

---

## 🔍 CAUSA RAIZ

O erro `"Failed to get document because the client is offline"` geralmente indica:

1. **Regras do Firestore não publicadas** (mais comum - 90% dos casos)
2. **Firestore em modo errado** (Datastore em vez de Native)
3. **Regras bloqueando silenciosamente** (permission-denied sendo interpretado como offline)

---

## ✅ SOLUÇÃO PASSO A PASSO

### PASSO 1: Verificar/Criar Firestore (2 minutos)

1. **Firebase Console:** https://console.firebase.google.com/
2. **Projeto:** `farol-360`
3. **Menu:** Firestore Database
4. **Verifique:**
   - ✅ Está criado?
   - ✅ Está em **Native mode** (não Datastore mode)

**Se não estiver criado:**
- Clique em "Criar banco de dados"
- Escolha "Iniciar no modo de produção"
- Selecione localização (ex: `southamerica-east1`)
- Clique em "Habilitar"
- Aguarde alguns minutos

---

### PASSO 2: PUBLICAR REGRAS DO FIRESTORE (CRÍTICO - 3 minutos)

**Este é o passo MAIS IMPORTANTE!**

1. **Firebase Console** → **Firestore Database** → **Rules**

2. **VERIFIQUE se está escrito "Published"** (não "Draft" ou "Rascunho")

3. **Se estiver em Draft:**
   - **APAGUE** tudo que está no editor
   - **COLE** as regras abaixo:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isAdminOrVendas() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'vendas');
    }
    
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdminOrVendas();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    match /onboarding_data/{onboardingId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdminOrVendas());
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }
    
    match /support_messages/{messageId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. **Clique em "Publicar"** ou **"Publish"** (botão azul no topo)

5. **AGUARDE** aparecer **"Published"** (não "Draft")

6. **AGUARDE 2-3 minutos** para as regras se propagarem

**⚠️ CRÍTICO:** As regras DEVEM estar "Published", não "Draft"!

---

### PASSO 3: Corrigir Variável de Ambiente no Vercel (2 minutos)

**O log mostra `projectId: "farol-360.firebasestorage.app"` - isso está ERRADO!**

1. **Vercel Dashboard:** https://vercel.com/dashboard
2. **Seu projeto** → **Settings** → **Environment Variables**
3. **Procure:** `VITE_FIREBASE_PROJECT_ID`
4. **Verifique o valor:**
   - ❌ **ERRADO:** `farol-360.firebasestorage.app`
   - ✅ **CORRETO:** `farol-360`

5. **Se estiver errado:**
   - Clique em **Edit**
   - Altere para: `farol-360`
   - Clique em **Save**

6. **Faça um novo deploy** após alterar

---

### PASSO 4: Autorizar Domínio do Vercel (2 minutos)

1. **Firebase Console** → **Authentication** → **Settings** (engrenagem ⚙️)
2. **Role até:** "Authorized domains"
3. **Verifique** se o domínio do Vercel está listado
4. **Se não estiver:**
   - Clique em "Add domain"
   - Digite: `seu-projeto.vercel.app` (sem `https://` e sem `/`)
   - Clique em "Add"
   - Aguarde 2-3 minutos

---

## 🧪 TESTE APÓS CONFIGURAR

1. **Aguarde 3-5 minutos** após fazer todas as alterações
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Recarregue a página** (F5)
4. **Abra o Console** (F12)
5. **Tente fazer login** ou criar conta
6. **Observe os logs:**
   - ✅ `✅ Dados do usuário encontrados no Firestore` → Funcionou!
   - ❌ `⚠️ Tentativa de buscar dados do Firestore falhou` → Ainda há problema

---

## 🔍 VERIFICAÇÃO RÁPIDA

### No Firebase Console:

- [ ] Firestore Database está criado
- [ ] Firestore está em **Native mode**
- [ ] Regras estão **PUBLICADAS** (não Draft)
- [ ] Domínio do Vercel está autorizado

### No Vercel:

- [ ] `VITE_FIREBASE_PROJECT_ID` = `farol-360` (não `farol-360.firebasestorage.app`)
- [ ] Todas as variáveis `VITE_FIREBASE_*` estão configuradas
- [ ] Novo deploy feito após alterar variáveis

---

## 🆘 SE AINDA NÃO FUNCIONAR

### Verificar Status do Firestore

1. **Firebase Console** → **Firestore Database**
2. **Verifique** se aparece "Firestore Database" (não "Cloud Datastore")
3. **Verifique** se há algum aviso ou erro

### Testar Regras Temporariamente (APENAS PARA TESTE)

**⚠️ ATENÇÃO: Use apenas para testar, depois volte às regras corretas!**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Se funcionar com essas regras permissivas:**
- O problema é nas regras originais
- Volte às regras corretas e verifique se publicou

**Se não funcionar:**
- O problema é no Firestore ou conexão
- Verifique se está em Native mode
- Verifique sua conexão com internet

---

## 📊 O QUE ESPERAR APÓS CORRIGIR

### ✅ Se estiver tudo correto:

```
✅ Firebase inicializado com sucesso
🔐 onAuthStateChange: Usuário autenticado: email@exemplo.com
✅ Dados do usuário encontrados no Firestore
💾 Tentando salvar dados de onboarding
✅ Dados salvos com sucesso! ID do documento: ...
```

### ❌ Se ainda houver problema:

```
✅ Firebase inicializado com sucesso
🔐 onAuthStateChange: Usuário autenticado: email@exemplo.com
⚠️ Tentativa de buscar dados do Firestore falhou (1/3): {code: 'unavailable'...}
```

---

## 💡 DICA IMPORTANTE

**O problema "client is offline" geralmente NÃO é problema de conexão!**

Na maioria dos casos, é:
- ❌ **Regras não publicadas** (90% dos casos)
- ❌ **Regras bloqueando** (permission-denied sendo interpretado como offline)
- ❌ **Firestore em modo errado** (Datastore em vez de Native)

**Siga os passos acima na ordem e o problema será resolvido!** 🎉

---

## ✅ CHECKLIST FINAL

Antes de testar, confirme:

- [ ] **PASSO 1:** Firestore criado e em Native mode
- [ ] **PASSO 2:** Regras estão **PUBLICADAS** (não Draft)
- [ ] **PASSO 3:** `VITE_FIREBASE_PROJECT_ID` = `farol-360` no Vercel
- [ ] **PASSO 4:** Domínio do Vercel autorizado
- [ ] **Aguardou 3-5 minutos** após fazer alterações
- [ ] **Fez novo deploy** no Vercel (se alterou variáveis)
- [ ] **Limpou cache** do navegador

---

Após seguir todos os passos, o Firestore deve conectar normalmente! 🚀
