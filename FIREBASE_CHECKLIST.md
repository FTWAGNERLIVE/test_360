# Checklist - Configurações do Firebase

## ✅ O que você PRECISA verificar/configurar no Firebase

### 1. 🔐 Authentication - Domínios Autorizados (CRÍTICO)

**Por que:** O erro 400 geralmente é causado por domínio não autorizado.

**Como fazer:**
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **farol-360**
3. Vá em: **Authentication** > **Settings** (ícone de engrenagem no topo)
4. Role até a seção: **Authorized domains**
5. Verifique se o domínio do Vercel está listado:
   - Exemplo: `seu-projeto.vercel.app`
   - Se tiver domínio customizado, adicione também
6. Se NÃO estiver, clique em **Add domain** e adicione:
   - O domínio completo (ex: `test-360.vercel.app`)
   - Sem `https://` e sem barra no final
7. Aguarde 2-3 minutos para propagação

**Domínios que devem estar listados:**
- `localhost` (já vem por padrão)
- `seu-projeto.vercel.app` (adicione este)
- Seu domínio customizado (se tiver)

---

### 2. 🔑 Authentication - Método de Login

**Por que:** Precisa estar habilitado para criar contas.

**Como fazer:**
1. No Firebase Console, vá em: **Authentication** > **Sign-in method**
2. Verifique se **Email/Password** está habilitado
3. Se não estiver:
   - Clique em **Email/Password**
   - Habilite a primeira opção (Enable)
   - Clique em **Save**

**Métodos que devem estar habilitados:**
- ✅ **Email/Password** (obrigatório)
- ✅ **Google** (se quiser login com Google)

---

### 3. 🗄️ Firestore Database - Verificar se está habilitado

**Por que:** O erro "client is offline" pode ocorrer se o Firestore não estiver habilitado.

**Como fazer:**
1. No Firebase Console, vá em: **Firestore Database**
2. Se não estiver criado:
   - Clique em **Create database**
   - Escolha **Start in production mode** (ou test mode para desenvolvimento)
   - Selecione a localização (ex: `southamerica-east1` para Brasil)
   - Clique em **Enable**
3. Se já estiver criado, verifique se está em **Native mode** (não Datastore mode)

**Importante:** Deve estar em modo **Native mode**, não Datastore mode.

---

### 4. 🔒 Firestore Database - Regras de Segurança

**Por que:** As regras podem estar bloqueando leitura/escrita.

**Como fazer:**
1. No Firebase Console, vá em: **Firestore Database** > **Rules**
2. Copie e cole as regras do arquivo `firestore.rules` do projeto
3. Clique em **Publish** para publicar as regras

**Regras que devem estar publicadas:**
```javascript
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

4. Após colar, clique em **Publish**
5. Verifique se aparece "Published" (não "Draft")

---

### 5. 📊 Verificar Variáveis de Ambiente no Vercel

**Por que:** As variáveis podem não estar configuradas corretamente.

**Como fazer:**
1. Acesse seu projeto no Vercel
2. Vá em: **Settings** > **Environment Variables**
3. Verifique se TODAS estas variáveis estão configuradas:

```
VITE_FIREBASE_API_KEY=AIzaSyD3mWWM58sGLu7WmxTlbjF4Zy4Yr1Gj648
VITE_FIREBASE_AUTH_DOMAIN=farol-360.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=farol-360
VITE_FIREBASE_STORAGE_BUCKET=farol-360.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=651344183552
VITE_FIREBASE_APP_ID=1:651344183552:web:750ba5022af2c45a88f3e5
VITE_FIREBASE_MEASUREMENT_ID=G-Q1FCV8G4HB
```

4. ⚠️ **IMPORTANTE**: Após adicionar/alterar variáveis, faça um **novo deploy**

---

## 📋 Checklist Rápido

Marque cada item após verificar:

- [ ] **Domínio do Vercel adicionado** em Authentication > Settings > Authorized domains
- [ ] **Email/Password habilitado** em Authentication > Sign-in method
- [ ] **Firestore Database criado** e em Native mode
- [ ] **Regras do Firestore publicadas** (não Draft)
- [ ] **Variáveis de ambiente configuradas** no Vercel
- [ ] **Novo deploy feito** no Vercel após alterar variáveis

---

## 🚨 Problemas Comuns

### "Erro 400" ao criar conta
- ✅ Verifique se o domínio está autorizado (Item 1)
- ✅ Verifique se Email/Password está habilitado (Item 2)

### "Client is offline" ou "Failed to get document"
- ✅ Verifique se Firestore está criado (Item 3)
- ✅ Verifique se as regras estão publicadas (Item 4)
- ✅ Verifique se as variáveis de ambiente estão corretas (Item 5)

### "Permission denied"
- ✅ Verifique se as regras do Firestore estão publicadas (Item 4)
- ✅ Verifique se o usuário está autenticado

---

## 🔍 Como Verificar se Está Tudo OK

1. **Teste criar uma conta:**
   - Deve funcionar sem erro 400
   - Deve salvar no Firestore

2. **Teste fazer login:**
   - Deve buscar dados do Firestore
   - Não deve mostrar "client is offline"

3. **Verifique no Firebase Console:**
   - Authentication > Users: deve ter o usuário criado
   - Firestore > Data > users: deve ter o documento do usuário
   - Firestore > Data > onboarding_data: deve ter os dados de onboarding

---

## 📞 Se Ainda Não Funcionar

1. Verifique os logs no console do navegador (F12)
2. Verifique a aba Network para ver requisições falhando
3. Verifique se todas as configurações acima foram feitas
4. Aguarde alguns minutos após fazer alterações (propagação)

---

## ✅ Resumo

**O que você PRECISA fazer no Firebase:**

1. ✅ Adicionar domínio do Vercel em **Authorized domains**
2. ✅ Habilitar **Email/Password** em Sign-in method
3. ✅ Verificar se **Firestore** está criado
4. ✅ Publicar as **regras do Firestore**
5. ✅ Verificar **variáveis de ambiente** no Vercel
6. ✅ Fazer **novo deploy** no Vercel

**Tempo estimado:** 5-10 minutos
