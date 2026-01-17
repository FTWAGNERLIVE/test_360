# Checklist - Resolver Erro 400 ao Criar Conta

## ✅ Passo a Passo para Resolver

### 1. Verificar Domínios Autorizados no Firebase

**CRÍTICO - Esta é a causa mais comum do erro 400**

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **farol-360**
3. Vá em: **Authentication** > **Settings** (ícone de engrenagem)
4. Role até: **Authorized domains**
5. Verifique se o domínio do Vercel está listado:
   - Exemplo: `seu-projeto.vercel.app`
   - Se tiver domínio customizado, adicione também
6. Se NÃO estiver, clique em **Add domain** e adicione:
   - O domínio completo do Vercel (ex: `test-360.vercel.app`)
   - Sem `https://` e sem barra no final
7. Aguarde 2-3 minutos para propagação

### 2. Verificar se Email/Senha está Habilitado

1. No Firebase Console, vá em: **Authentication** > **Sign-in method**
2. Verifique se **Email/Password** está habilitado
3. Se não estiver, clique em **Email/Password** e habilite:
   - ✅ **Enable** (primeira opção)
   - Clique em **Save**

### 3. Verificar Variáveis de Ambiente no Vercel

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

### 4. Verificar Regras do Firestore

1. No Firebase Console, vá em: **Firestore Database** > **Rules**
2. Certifique-se de que as regras estão assim:
   ```javascript
   match /users/{userId} {
     allow create: if isAuthenticated() && request.auth.uid == userId;
   }
   ```
3. Clique em **Publish** se fez alterações

### 5. Testar no Console do Navegador

1. Abra o site no Vercel
2. Pressione **F12** para abrir o DevTools
3. Vá na aba **Console**
4. Tente criar uma conta
5. Veja os logs que aparecem:
   - `Tentando criar usuário com email: ...`
   - `Auth configurado: true/false`
   - `Auth domain: ...`
   - Qualquer erro detalhado

### 6. Verificar a Requisição na Aba Network

1. No DevTools, vá na aba **Network** (Rede)
2. Filtre por: `signUp` ou `accounts`
3. Tente criar conta novamente
4. Clique na requisição `accounts:signUp`
5. Veja:
   - **Status**: Deve ser 200 (sucesso) ou mostrar o erro específico
   - **Response**: Veja a mensagem de erro completa
   - **Headers**: Verifique se a requisição está sendo feita corretamente

## 🔍 Diagnóstico Rápido

### Se o erro for "unauthorized-domain":
- ✅ Adicione o domínio do Vercel nos domínios autorizados (Passo 1)

### Se o erro for "operation-not-allowed":
- ✅ Habilite Email/Password no Firebase (Passo 2)

### Se o erro for "invalid-api-key":
- ✅ Verifique as variáveis de ambiente no Vercel (Passo 3)
- ✅ Faça um novo deploy após alterar

### Se não houver código de erro específico:
- ✅ Verifique os logs no console do navegador
- ✅ Verifique a resposta na aba Network
- ✅ Verifique se o Firebase está inicializado corretamente

## 📝 Informações para Debug

Quando reportar o erro, forneça:

1. **URL completa** onde está tentando criar a conta
2. **Mensagem de erro completa** do console do navegador
3. **Status code** da requisição na aba Network (ex: 400, 403, etc.)
4. **Response body** da requisição `accounts:signUp` na aba Network
5. **Screenshot** do erro, se possível

## ⚡ Solução Rápida

Se precisar testar rapidamente:

1. Adicione o domínio do Vercel nos domínios autorizados
2. Aguarde 2-3 minutos
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Tente criar conta novamente

## 🆘 Se Nada Funcionar

1. Verifique se consegue fazer login com a conta admin temporária:
   - Email: `admin@creattive.com`
   - Senha: `admin123`
   
2. Se o login admin funcionar, o problema é específico da criação de conta

3. Entre em contato com o suporte fornecendo:
   - Todos os logs do console
   - Screenshot do erro
   - URL do site
