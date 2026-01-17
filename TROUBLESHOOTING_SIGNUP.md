# Troubleshooting - Erro 400 ao Criar Conta

## Erro: `accounts:signUp?key=... 400`

Este erro indica que a requisição de criação de conta está sendo rejeitada pelo Firebase Authentication.

## Possíveis Causas e Soluções

### 1. Domínio Não Autorizado

**Sintoma:** Erro 400 ao tentar criar conta em produção (Vercel)

**Solução:**
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Authentication** > **Settings** > **Authorized domains**
3. Adicione o domínio do Vercel:
   - `seu-projeto.vercel.app`
   - Se tiver domínio customizado, adicione também
4. Salve as alterações
5. Aguarde alguns minutos para propagação
6. Tente criar a conta novamente

### 2. Email Já Cadastrado

**Sintoma:** Erro ao tentar criar conta com email existente

**Solução:**
- Use um email diferente
- Ou faça login com o email existente
- Ou use a opção "Esqueceu sua senha?"

### 3. Senha Muito Fraca

**Sintoma:** Erro ao criar conta com senha curta

**Solução:**
- Use senha com pelo menos 6 caracteres
- Preferencialmente use senha mais forte (letras, números, símbolos)

### 4. Regras do Firestore Bloqueando

**Sintoma:** Usuário criado no Auth mas erro ao salvar no Firestore

**Solução:**
1. Verifique se as regras do Firestore estão corretas:
   ```javascript
   match /users/{userId} {
     allow create: if isAuthenticated() && request.auth.uid == userId;
   }
   ```
2. Certifique-se de que as regras foram publicadas no Firebase Console
3. Verifique se não há erros de sintaxe nas regras

### 5. Variáveis de Ambiente Não Configuradas

**Sintoma:** Erro "Firebase não está configurado"

**Solução:**
1. No Vercel, vá em **Settings** > **Environment Variables**
2. Adicione todas as variáveis com prefixo `VITE_`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
3. Faça um novo deploy após adicionar as variáveis

### 6. Problemas de Rede/Conexão

**Sintoma:** Erro intermitente ao criar conta

**Solução:**
- Verifique sua conexão com a internet
- Tente novamente em alguns instantes
- Limpe o cache do navegador
- Tente em modo anônimo/privado

## Como Verificar o Erro Específico

1. Abra o **Console do Navegador** (F12)
2. Vá na aba **Network** (Rede)
3. Tente criar a conta novamente
4. Procure pela requisição `accounts:signUp`
5. Clique nela e veja a aba **Response** para ver a mensagem de erro completa

## Mensagens de Erro Comuns

- **"Este email já está cadastrado"**: Email já existe, faça login
- **"Email inválido"**: Verifique o formato do email
- **"A senha é muito fraca"**: Use senha com pelo menos 6 caracteres
- **"Domínio não autorizado"**: Adicione o domínio no Firebase Console
- **"Permissão negada"**: Verifique as regras do Firestore
- **"Erro de conexão"**: Problema de rede, tente novamente

## Teste Rápido

1. Tente criar uma conta com:
   - Email válido (ex: `teste@exemplo.com`)
   - Senha com pelo menos 6 caracteres
   - Nome preenchido

2. Se ainda der erro, verifique:
   - Console do navegador para mensagens de erro
   - Firebase Console > Authentication > Users (se o usuário foi criado)
   - Firebase Console > Firestore > users (se o documento foi criado)

## Contato

Se o problema persistir após seguir todos os passos acima, entre em contato com o suporte técnico fornecendo:
- Mensagem de erro completa do console
- URL onde está tentando criar a conta
- Email que está tentando usar (sem a senha)
- Screenshot do erro, se possível
