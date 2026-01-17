# Guia de Deploy no Vercel

## Configuração de Variáveis de Ambiente

No Vercel, você precisa configurar as variáveis de ambiente no painel do projeto:

1. Acesse seu projeto no Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:

```
VITE_FIREBASE_API_KEY=AIzaSyD3mWWM58sGLu7WmxTlbjF4Zy4Yr1Gj648
VITE_FIREBASE_AUTH_DOMAIN=farol-360.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=farol-360
VITE_FIREBASE_STORAGE_BUCKET=farol-360.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=651344183552
VITE_FIREBASE_APP_ID=1:651344183552:web:750ba5022af2c45a88f3e5
VITE_FIREBASE_MEASUREMENT_ID=G-Q1FCV8G4HB
```

⚠️ **Importante**: Após adicionar as variáveis, faça um novo deploy.

## Configurar Domínios Autorizados no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Authentication** > **Settings** > **Authorized domains**
3. Adicione o domínio do Vercel (ex: `seu-projeto.vercel.app`)
4. Se tiver domínio customizado, adicione também

## Problemas Comuns

### Erro: "Firebase não está configurado"
- Verifique se as variáveis de ambiente estão configuradas no Vercel
- Certifique-se de que o prefixo `VITE_` está presente
- Faça um novo deploy após adicionar as variáveis

### Erro: "auth/unauthorized-domain"
- Adicione o domínio do Vercel nas configurações do Firebase Authentication
- Verifique se o domínio está na lista de domínios autorizados

### Erro: "Failed to get document" ou "Firestore offline"
- Verifique se as regras do Firestore estão configuradas corretamente
- Certifique-se de que o usuário está autenticado
- Verifique se o Firestore Database está habilitado no Firebase Console
- Verifique se o modo do Firestore está correto (Native mode, não Datastore mode)
- Tente fazer login com a conta admin temporária primeiro: `admin@creattive.com` / `admin123`

### Erro de CORS
- Verifique se o domínio está autorizado no Firebase
- Verifique as configurações de CORS no Firebase Console

## Build Settings no Vercel

O Vercel detecta automaticamente projetos Vite. Certifique-se de que:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Testando o Deploy

Após o deploy, teste:
1. Login com conta admin temporária: `admin@creattive.com` / `admin123`
2. Login com conta do Firebase
3. Login com Google (se configurado)
