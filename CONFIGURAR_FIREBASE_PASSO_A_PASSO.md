# 🔧 Configurar Firebase - Passo a Passo Completo

## 📍 Onde você está agora:
- ✅ Firebase inicializado no código
- ❌ Domínio do Vercel não autorizado (erro 400)
- ❌ Regras do Firestore não publicadas (erro "client is offline")

---

## 🎯 PASSO 1: Autorizar Domínio do Vercel

**Tempo:** 2 minutos  
**Resolve:** Erro 400 ao criar conta

### Como fazer:

1. **Acesse o Firebase Console:**
   - Vá para: https://console.firebase.google.com/
   - Faça login com sua conta Google

2. **Selecione o projeto:**
   - Clique no projeto **farol-360**

3. **Vá para Authentication:**
   - No menu lateral esquerdo, clique em **Authentication**

4. **Abra as configurações:**
   - Clique no ícone de **engrenagem ⚙️** no topo da página
   - Ou clique em **Settings** se aparecer

5. **Encontre "Authorized domains":**
   - Role a página para baixo
   - Procure pela seção **Authorized domains**
   - Você verá uma lista com domínios como `localhost`

6. **Adicione o domínio do Vercel:**
   - Clique no botão **Add domain**
   - Digite o domínio do seu projeto no Vercel
   - Exemplo: `test-360.vercel.app` ou `seu-projeto.vercel.app`
   - ⚠️ **IMPORTANTE:**
     - ❌ NÃO coloque `https://`
     - ❌ NÃO coloque barra no final `/`
     - ✅ Apenas: `seu-projeto.vercel.app`
   - Clique em **Add**

7. **Aguarde:**
   - Aguarde 2-3 minutos para propagação
   - O domínio deve aparecer na lista

**✅ Pronto! Erro 400 resolvido.**

---

## 🎯 PASSO 2: Habilitar Email/Password

**Tempo:** 1 minuto  
**Resolve:** Não conseguir criar contas

### Como fazer:

1. **Ainda no Firebase Console:**
   - Você deve estar em **Authentication**

2. **Vá para Sign-in method:**
   - Clique na aba **Sign-in method** (no topo da página)

3. **Habilite Email/Password:**
   - Procure por **Email/Password** na lista
   - Clique nele
   - Habilite a primeira opção: **Enable**
   - Clique em **Save**

**✅ Pronto! Agora pode criar contas.**

---

## 🎯 PASSO 3: Verificar/Criar Firestore Database

**Tempo:** 2 minutos  
**Resolve:** Erro "client is offline"

### Como fazer:

1. **Vá para Firestore Database:**
   - No menu lateral esquerdo, clique em **Firestore Database**

2. **Se aparecer "Create database":**
   - Clique em **Create database**
   - Escolha **Start in production mode**
   - Selecione a localização:
     - Para Brasil: `southamerica-east1`
     - Ou escolha a mais próxima de você
   - Clique em **Enable**
   - Aguarde alguns segundos

3. **Se já estiver criado:**
   - Verifique se está em **Native mode**
   - Se estiver em **Datastore mode**, você precisa criar um novo em Native mode

**✅ Pronto! Firestore está habilitado.**

---

## 🎯 PASSO 4: Publicar Regras do Firestore

**Tempo:** 2 minutos  
**Resolve:** Erro "client is offline" e "permission denied"

### Como fazer:

1. **Ainda em Firestore Database:**
   - Clique na aba **Rules** (no topo da página)

2. **Copie as regras:**
   - Abra o arquivo `firestore.rules` do projeto
   - Ou copie as regras abaixo:

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

3. **Cole no Firebase Console:**
   - **APAGUE** tudo que está na caixa de texto
   - **COLE** as regras acima
   - Verifique se não há erros (deve aparecer "Valid rules" ou similar)

4. **Publique:**
   - Clique no botão **Publish** (botão azul no topo)
   - Aguarde aparecer "Published" (não "Draft")
   - ⚠️ **IMPORTANTE:** Deve aparecer "Published", não "Draft"

**✅ Pronto! Erro "client is offline" resolvido.**

---

## 🎯 PASSO 5: Verificar Variáveis no Vercel (Opcional)

**Tempo:** 2 minutos  
**Garante:** Que as configurações estão corretas em produção

### Como fazer:

1. **Acesse o Vercel:**
   - Vá para: https://vercel.com/
   - Faça login e selecione seu projeto

2. **Vá para Settings:**
   - Clique em **Settings** (no topo)
   - Clique em **Environment Variables** (menu lateral)

3. **Verifique as variáveis:**
   - Deve ter estas variáveis configuradas:
     ```
     VITE_FIREBASE_API_KEY
     VITE_FIREBASE_AUTH_DOMAIN
     VITE_FIREBASE_PROJECT_ID
     VITE_FIREBASE_STORAGE_BUCKET
     VITE_FIREBASE_MESSAGING_SENDER_ID
     VITE_FIREBASE_APP_ID
     VITE_FIREBASE_MEASUREMENT_ID
     ```

4. **Se faltar alguma:**
   - Clique em **Add New**
   - Adicione o nome e valor
   - Clique em **Save**

5. **Faça um novo deploy:**
   - Vá em **Deployments**
   - Clique nos 3 pontinhos do último deploy
   - Clique em **Redeploy**

**✅ Pronto! Variáveis configuradas.**

---

## ✅ CHECKLIST FINAL

Marque cada item após fazer:

- [ ] **PASSO 1:** Domínio do Vercel adicionado em Authorized domains
- [ ] **PASSO 2:** Email/Password habilitado
- [ ] **PASSO 3:** Firestore criado e em Native mode
- [ ] **PASSO 4:** Regras do Firestore publicadas (não Draft)
- [ ] **PASSO 5:** Variáveis de ambiente verificadas no Vercel

---

## 🧪 TESTE APÓS CONFIGURAR

1. **Aguarde 2-3 minutos** após fazer as alterações
2. **Limpe o cache do navegador:**
   - Pressione `Ctrl + Shift + Delete`
   - Marque "Cached images and files"
   - Clique em "Clear data"
3. **Recarregue a página** (F5)
4. **Tente criar uma conta:**
   - Deve funcionar sem erro 400
   - Deve salvar no Firestore sem erro "offline"

---

## 📸 ONDE ENCONTRAR CADA COISA

### No Firebase Console:

```
Firebase Console
├── Authentication
│   ├── Users (lista de usuários)
│   ├── Sign-in method (habilitar Email/Password)
│   └── Settings ⚙️ (Authorized domains) ← AQUI
│
└── Firestore Database
    ├── Data (dados salvos)
    └── Rules (regras de segurança) ← AQUI
```

---

## ❓ PROBLEMAS COMUNS

### "Não encontro Authorized domains"
- Você está em **Authentication > Settings**?
- Role a página para baixo
- Procure por "Authorized domains" ou "Domínios autorizados"

### "Não encontro Sign-in method"
- Você está em **Authentication**?
- Procure por abas no topo: "Users", "Sign-in method", etc.

### "Não encontro Rules"
- Você está em **Firestore Database**?
- Procure por abas no topo: "Data", "Rules", "Indexes", etc.

### "As regras não publicam"
- Verifique se não há erros de sintaxe
- Certifique-se de copiar TUDO, incluindo `rules_version = '2';`
- Tente salvar novamente

---

## 🆘 AINDA COM PROBLEMAS?

Se após seguir todos os passos ainda houver erro:

1. **Verifique o console do navegador (F12):**
   - Veja se há mensagens de erro
   - Procure por "Firebase inicializado com sucesso"

2. **Verifique no Firebase Console:**
   - Authentication > Users: seu usuário está lá?
   - Firestore > Data: há dados salvos?

3. **Envie estas informações:**
   - URL do site no Vercel
   - Screenshot de Authorized domains
   - Screenshot de Firestore Rules (mostrando "Published")
   - Mensagens de erro do console

---

## ⏱️ TEMPO TOTAL ESTIMADO: 5-10 minutos

Siga os passos na ordem e marque o checklist. Tudo deve funcionar! 🚀
