# ⚠️ IMPORTANTE: NÃO Crie Coleções Manualmente!

## 🎯 Você está vendo a tela "Iniciar uma coleção"?

**AÇÃO:** Clique em **"Cancelar"** e feche essa tela!

---

## ✅ Por que não precisa criar manualmente?

O Firestore **cria coleções automaticamente** quando você salva o primeiro documento. O código da aplicação já faz isso quando:

1. **Alguém cria uma conta** → Cria a coleção `users`
2. **Alguém preenche o onboarding** → Cria a coleção `onboarding_data`
3. **Alguém envia mensagem de suporte** → Cria a coleção `support_messages`

---

## 📋 O que você PRECISA fazer no Firebase:

### 1. ✅ Publicar as Regras do Firestore (OBRIGATÓRIO)

1. No Firebase Console, vá em **Firestore Database**
2. Clique na aba **Rules**
3. Cole as regras do arquivo `firestore.rules`
4. Clique em **Publish**

**Isso é OBRIGATÓRIO!** Sem as regras, a aplicação não consegue salvar dados.

### 2. ✅ Autorizar Domínio do Vercel (OBRIGATÓRIO)

1. Vá em **Authentication** > **Settings** (engrenagem)
2. Role até **Authorized domains**
3. Adicione o domínio do Vercel
4. Aguarde 2-3 minutos

### 3. ✅ Habilitar Email/Password (OBRIGATÓRIO)

1. Vá em **Authentication** > **Sign-in method**
2. Clique em **Email/Password**
3. Habilite e salve

---

## 🧪 Como testar se está funcionando:

1. **Feche a tela de criar coleção** (clique em Cancelar)
2. **Configure as regras** (passo 1 acima)
3. **Vá para sua aplicação**
4. **Tente criar uma conta**
5. **Volte ao Firebase Console** > **Firestore Database** > **Data**
6. **Você verá a coleção `users` criada automaticamente!** 🎉

---

## ❓ "Mas a tela pede para criar uma coleção..."

Isso é apenas uma opção do Firebase Console para quem quer criar manualmente. **Você não precisa!**

O Firestore funciona assim:
- **Coleção vazia?** Não existe ainda
- **Primeiro documento salvo?** Coleção é criada automaticamente
- **Pronto!** A coleção aparece no console

---

## ✅ Resumo:

- ❌ **NÃO** crie coleções manualmente
- ✅ **SIM** publique as regras do Firestore
- ✅ **SIM** autorize o domínio do Vercel
- ✅ **SIM** habilite Email/Password
- ✅ **SIM** teste criando uma conta na aplicação

As coleções serão criadas automaticamente quando necessário! 🚀
