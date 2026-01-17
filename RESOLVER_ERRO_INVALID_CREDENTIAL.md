# 🔧 Resolver Erro: auth/invalid-credential

## 🚨 Problema

Você está recebendo o erro `auth/invalid-credential` ao tentar fazer login com `admin@creattive.com`.

---

## 🔍 O que significa esse erro?

O erro `auth/invalid-credential` significa que:
- O email **não existe** no Firebase Authentication, OU
- A senha está **incorreta**, OU
- O usuário foi **deletado** do Firebase Auth

---

## ✅ SOLUÇÕES

### Opção 1: Criar a conta admin no Firebase (RECOMENDADO)

1. **Acesse o Firebase Console:** https://console.firebase.google.com/
2. **Selecione o projeto:** `farol-360`
3. **Vá em:** Authentication → Users
4. **Clique em:** "Add user"
5. **Preencha:**
   - Email: `admin@creattive.com`
   - Senha: `admin123` (ou outra senha segura)
   - **NÃO** marque "Send email verification" (opcional)
6. **Clique em:** "Add user"

**Após criar:**
- O usuário poderá fazer login normalmente
- Você precisará atualizar o documento no Firestore para dar role de 'admin'

---

### Opção 2: Usar o fallback temporário (já implementado)

O código já tem um fallback que permite login com `admin@creattive.com` / `admin123` **mesmo sem Firebase**, mas parece que está tentando o Firebase primeiro.

**Para testar o fallback:**
- Certifique-se de que o Firebase está realmente configurado
- Se não estiver, o fallback deve funcionar automaticamente

---

### Opção 3: Verificar se o usuário já existe

1. **Firebase Console** → **Authentication** → **Users**
2. **Procure** por `admin@creattive.com`
3. **Se existir:**
   - Clique no usuário
   - Clique em "Reset password" para definir uma nova senha
   - Ou use "Delete user" e crie novamente

---

## 🔐 Depois de criar o usuário no Firebase Auth

Você precisa criar/atualizar o documento no Firestore para dar role de 'admin':

1. **Firebase Console** → **Firestore Database** → **Data**
2. **Procure** pela coleção `users`
3. **Encontre** o documento com o UID do usuário `admin@creattive.com`
4. **Se não existir**, crie um novo documento com:
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
5. **Se existir**, edite e altere `role` para `"admin"`

---

## ⚠️ IMPORTANTE: Verificar Variáveis de Ambiente no Vercel

O log mostra `projectId: 'farol-360.firebasestorage.app'` quando deveria ser apenas `'farol-360'`.

**Isso indica que a variável `VITE_FIREBASE_PROJECT_ID` no Vercel pode estar incorreta!**

### Como corrigir:

1. **Acesse:** https://vercel.com/dashboard
2. **Selecione seu projeto**
3. **Vá em:** Settings → Environment Variables
4. **Verifique** a variável `VITE_FIREBASE_PROJECT_ID`:
   - ✅ **Correto:** `farol-360`
   - ❌ **Incorreto:** `farol-360.firebasestorage.app` (isso é o storageBucket!)
5. **Se estiver incorreto:**
   - Edite e corrija para `farol-360`
   - **Faça um novo deploy** após corrigir

---

## 🧪 TESTE APÓS CORRIGIR

1. **Aguarde 2-3 minutos** após criar o usuário no Firebase
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Recarregue a página** (F5)
4. **Tente fazer login** com:
   - Email: `admin@creattive.com`
   - Senha: `admin123` (ou a senha que você definiu)

---

## 📊 O QUE ESPERAR

### ✅ Se estiver tudo correto:
- Login funciona sem erro
- Você é redirecionado para `/admin`
- O console mostra logs de sucesso

### ❌ Se ainda houver erro:
- **auth/invalid-credential**: Usuário não existe OU senha incorreta
- **auth/unauthorized-domain**: Domínio não autorizado
- **400 Bad Request**: Variáveis de ambiente incorretas OU domínio não autorizado

---

## 🆘 SE NADA FUNCIONAR

1. **Verifique** se o usuário existe em Firebase Console → Authentication → Users
2. **Verifique** se o domínio do Vercel está autorizado
3. **Verifique** se as variáveis de ambiente no Vercel estão corretas
4. **Tente criar uma nova conta** através da interface de login (botão "Criar conta")
5. **Use essa nova conta** para fazer login e depois promova para admin no painel
