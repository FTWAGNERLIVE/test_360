# 🚀 Solução Rápida - Configurar Firebase (5 minutos)

## ⚠️ PROBLEMAS IDENTIFICADOS

1. **Erro 400 ao criar conta** → Domínio não autorizado
2. **Firestore "client is offline"** → Regras ou Firestore não configurado

---

## ✅ PASSO 1: Autorizar Domínio do Vercel (2 minutos)

**Isso resolve o erro 400!**

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **farol-360**
3. No menu lateral, clique em: **Authentication**
4. Clique na engrenagem ⚙️ no topo (Settings)
5. Role até encontrar: **Authorized domains**
6. Clique em **Add domain**
7. Digite o domínio do Vercel (ex: `seu-projeto.vercel.app`)
   - **NÃO** coloque `https://`
   - **NÃO** coloque barra no final
   - Apenas: `seu-projeto.vercel.app`
8. Clique em **Add**
9. Aguarde 2-3 minutos

**✅ Pronto! Isso resolve o erro 400.**

---

## ✅ PASSO 2: Habilitar Email/Password (1 minuto)

1. Ainda no Firebase Console, em **Authentication**
2. Clique em **Sign-in method** (aba no topo)
3. Procure por **Email/Password**
4. Clique nele
5. Habilite a primeira opção: **Enable**
6. Clique em **Save**

**✅ Pronto! Agora pode criar contas.**

---

## ✅ PASSO 3: Verificar/Criar Firestore (2 minutos)

1. No Firebase Console, clique em **Firestore Database** (menu lateral)
2. Se aparecer "Create database":
   - Clique em **Create database**
   - Escolha **Start in production mode**
   - Selecione a localização (ex: `southamerica-east1` para Brasil)
   - Clique em **Enable**
3. Se já estiver criado:
   - Verifique se está em **Native mode** (não Datastore mode)
   - Se estiver em Datastore mode, você precisa criar um novo em Native mode

**✅ Pronto! Firestore está habilitado.**

---

## ✅ PASSO 4: Publicar Regras do Firestore (1 minuto)

**Isso resolve o erro "client is offline"!**

1. Ainda em **Firestore Database**
2. Clique na aba **Rules** (no topo)
3. **APAGUE** tudo que está lá
4. **COLE** as regras abaixo:

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

5. Clique em **Publish** (botão azul no topo)
6. Aguarde aparecer "Published" (não "Draft")

**✅ Pronto! Isso resolve o erro "client is offline".**

---

## 📋 CHECKLIST FINAL

Marque cada item:

- [ ] Domínio do Vercel adicionado em **Authentication > Settings > Authorized domains**
- [ ] **Email/Password** habilitado em **Authentication > Sign-in method**
- [ ] **Firestore Database** criado e em **Native mode**
- [ ] **Regras do Firestore** publicadas (não Draft)

---

## 🧪 TESTE

Após fazer tudo acima:

1. Aguarde 2-3 minutos
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Tente criar uma conta novamente
4. Deve funcionar sem erro 400
5. O Firestore deve conectar sem erro "offline"

---

## ❓ AINDA NÃO FUNCIONA?

### Se o erro 400 persistir:
- Verifique se o domínio está EXATAMENTE como aparece no Vercel
- Aguarde mais alguns minutos (propagação pode demorar)
- Tente em modo anônimo/privado

### Se o "client is offline" persistir:
- Verifique se as regras foram **PUBLICADAS** (não Draft)
- Verifique se o Firestore está em **Native mode**
- Verifique se o usuário está autenticado (deve aparecer no Firebase Console > Authentication > Users)

---

## 📞 PRECISA DE AJUDA?

Envie:
1. Screenshot de **Authentication > Settings > Authorized domains**
2. Screenshot de **Firestore Database > Rules** (mostrando "Published")
3. URL completa do site no Vercel
