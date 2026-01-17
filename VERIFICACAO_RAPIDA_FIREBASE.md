# ⚡ Verificação Rápida - Erro 400 e Firestore Offline

## 🚨 Problemas Identificados

1. **Erro 400 ao criar conta** (`accounts:signUp`)
2. **Firestore "client is offline"**

---

## ✅ CHECKLIST RÁPIDO (5 minutos)

### 1. 🔐 Firebase Authentication - Domínios Autorizados (CRÍTICO)

**Isso resolve o erro 400!**

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **farol-360**
3. Vá em: **Authentication** → **Settings** (engrenagem ⚙️)
4. Role até: **Authorized domains**
5. **VERIFIQUE** se o domínio do Vercel está listado:
   - Exemplo: `seu-projeto.vercel.app`
   - **NÃO** coloque `https://`
   - **NÃO** coloque `/` no final
6. Se **NÃO** estiver, clique em **Add domain** e adicione
7. **Aguarde 2-3 minutos** após adicionar

**✅ Se o domínio não estiver autorizado, você receberá erro 400!**

---

### 2. 🔑 Firebase Authentication - Método Email/Password

**Isso também resolve o erro 400!**

1. Ainda em **Authentication**
2. Vá na aba: **Sign-in method**
3. Clique em **Email/Password**
4. **HABILITE** a primeira opção: **Enable**
5. Clique em **Save**

**✅ Se não estiver habilitado, você receberá erro 400!**

---

### 3. 🗄️ Firestore Database - Regras Publicadas

**Isso resolve o erro "client is offline"!**

1. Vá em: **Firestore Database** → **Rules**
2. **VERIFIQUE** se está escrito **"Published"** (não "Draft")
3. Se estiver em "Draft", **cole as regras** do arquivo `firestore.rules` e clique em **Publish**
4. **Aguarde 1-2 minutos** após publicar

**✅ Se as regras não estiverem publicadas, o Firestore vai para offline!**

---

### 4. 🗄️ Firestore Database - Modo e Status

1. Vá em: **Firestore Database**
2. **VERIFIQUE** se está em **Native mode** (não Datastore mode)
3. **VERIFIQUE** se o banco está criado e habilitado

**✅ Se estiver em Datastore mode, você precisa criar um novo em Native mode!**

---

### 5. ⚙️ Vercel - Variáveis de Ambiente

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings** → **Environment Variables**
4. **VERIFIQUE** se todas as variáveis estão configuradas:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID` (opcional)
5. **Após qualquer alteração, faça um novo deploy!**

---

## 🧪 TESTE APÓS CONFIGURAR

1. **Aguarde 2-3 minutos** após fazer as alterações
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Recarregue a página** (F5)
4. **Tente criar uma conta novamente**

---

## 📊 O QUE ESPERAR

### ✅ Se estiver tudo configurado:
- Criação de conta funciona sem erro 400
- Firestore conecta sem erro "offline"
- Login funciona normalmente

### ❌ Se ainda houver problemas:
- **Erro 400**: Domínio não autorizado OU Email/Password não habilitado
- **Erro "offline"**: Regras não publicadas OU Firestore em modo errado

---

## 🆘 SE NADA FUNCIONAR

1. **Screenshot do console** (F12) com todos os erros
2. **Screenshot da aba Network** mostrando as requisições
3. **Screenshot das configurações do Firebase**:
   - Authorized domains
   - Sign-in method (Email/Password)
   - Firestore Rules (mostrando "Published")
4. **URL completa** onde está testando

---

## 💡 DICA IMPORTANTE

**A maioria dos erros 400 é causada por:**
- ❌ Domínio do Vercel não autorizado (mais comum)
- ❌ Email/Password não habilitado

**A maioria dos erros "offline" é causada por:**
- ❌ Regras do Firestore não publicadas (mais comum)
- ❌ Firestore em Datastore mode (deve ser Native mode)
