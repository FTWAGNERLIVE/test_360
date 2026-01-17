# 🔧 Resolver: Problema ao Salvar Dados de Contas Normais

## 🚨 Problema Identificado

Contas de **admin** funcionam normalmente, mas **contas normais** não conseguem salvar dados de onboarding.

---

## 🔍 Causa do Problema

O problema estava relacionado ao `userId` que estava sendo passado para salvar os dados. As regras do Firestore verificam se:

```firestore
request.resource.data.userId == request.auth.uid
```

Isso significa que o `userId` no documento deve ser **exatamente igual** ao `uid` do usuário autenticado no Firebase Auth.

**O que estava acontecendo:**
- O `user.id` pode não estar correspondendo ao `request.auth.uid`
- Isso causava erro de `permission-denied` nas regras do Firestore

---

## ✅ SOLUÇÃO IMPLEMENTADA

O código foi corrigido para:

1. **Sempre usar o UID do Firebase Auth atual** (`auth.currentUser.uid`)
2. **Verificar se o usuário está autenticado** antes de tentar salvar
3. **Usar o email do usuário autenticado** se não foi passado
4. **Adicionar logs detalhados** para debug

---

## 🧪 Como Testar

### 1. Criar uma Conta Normal

1. **Vá para a tela de login**
2. **Clique em "Criar conta"**
3. **Preencha:**
   - Nome
   - Email
   - Senha
4. **Clique em "Criar conta"**

### 2. Preencher o Formulário de Onboarding

1. **Após criar a conta**, você será redirecionado para `/onboarding`
2. **Preencha todos os campos:**
   - Nome da Empresa
   - Setor/Indústria
   - Fonte de Dados
   - Objetivos (pelo menos 1)
   - Perguntas Específicas (opcional)
   - Contato
3. **Clique em "Salvar dados"**

### 3. Verificar se Salvou

1. **Abra o Console** (F12)
2. **Procure por:**
   - ✅ `💾 Tentando salvar dados de onboarding:` → Salvamento iniciado
   - ✅ `✅ Dados de onboarding salvos com sucesso. ID: ...` → Salvou!
   - ❌ `❌ Erro ao salvar dados de onboarding:` → Erro (veja o código)

3. **Verifique no Firestore:**
   - Firebase Console → Firestore Database → Data
   - Coleção: `onboarding_data`
   - Procure por um documento novo com dados preenchidos

---

## 🔍 Verificações Importantes

### 1. Verificar se o Usuário Está Autenticado

**No Console (F12):**
- Procure por: `🔐 onAuthStateChange: Usuário autenticado: [email]`
- Se não aparecer, o usuário não está autenticado

**Solução:**
- Faça logout e login novamente
- Verifique se o documento do usuário existe no Firestore

---

### 2. Verificar se o Documento do Usuário Existe

1. **Firebase Console** → **Firestore Database** → **Data**
2. **Coleção:** `users`
3. **Procure** pelo documento com o UID do usuário

**Se não existir:**
- O sistema criará automaticamente quando você fizer login
- Aguarde alguns segundos após fazer login
- Verifique novamente

---

### 3. Verificar Regras do Firestore

1. **Firebase Console** → **Firestore Database** → **Rules**
2. **Verifique** se está escrito **"Published"** (não "Draft")
3. **Verifique** se as regras incluem:

```firestore
match /onboarding_data/{onboardingId} {
  allow create: if isAuthenticated() && 
                   request.resource.data.userId == request.auth.uid;
}
```

**Se não estiver publicado:**
- Cole as regras do arquivo `firestore.rules`
- Clique em **"Publish"**
- Aguarde 1-2 minutos

---

## 📊 Logs de Debug

O código agora mostra logs detalhados no console:

```
💾 Tentando salvar dados de onboarding: {
  userIdUsado: "7v72v6oyEsTs1pgPjPmqF9cdo6q1",
  email: "usuario@email.com",
  companyName: "Minha Empresa",
  industry: "Varejo",
  uidAtual: "7v72v6oyEsTs1pgPjPmqF9cdo6q1"
}
```

**Se `userIdUsado` e `uidAtual` forem diferentes**, isso pode causar erro de permissão.

---

## ⚠️ Erros Comuns

### Erro: "Usuário não autenticado"

**Causa:** O usuário não está logado ou a sessão expirou

**Solução:**
- Faça logout e login novamente
- Verifique se o Firebase Auth está funcionando

---

### Erro: "Permissão negada"

**Causa:** O `userId` não corresponde ao `uid` do usuário autenticado

**Solução:**
- O código agora corrige isso automaticamente
- Se ainda houver erro, verifique as regras do Firestore
- Verifique se o documento do usuário existe no Firestore

---

### Erro: "Preencha todos os campos obrigatórios"

**Causa:** Algum campo obrigatório não foi preenchido

**Solução:**
- Preencha todos os campos do formulário
- Campos obrigatórios:
  - Nome da Empresa
  - Setor/Indústria
  - Fonte de Dados
  - Pelo menos 1 objetivo

---

## ✅ Checklist de Verificação

Antes de testar, verifique:

- [ ] Conta normal criada com sucesso
- [ ] Usuário está autenticado (fez login)
- [ ] Documento do usuário existe no Firestore (coleção `users`)
- [ ] Regras do Firestore estão **publicadas** (não Draft)
- [ ] Todos os campos do formulário foram preenchidos
- [ ] Console do navegador não mostra erros de permissão

---

## 🆘 Se Ainda Não Funcionar

1. **Screenshot do console** (F12) com todos os logs
2. **Screenshot da aba Network** mostrando requisições para `firestore.googleapis.com`
3. **Screenshot das regras do Firestore** (mostrando "Published")
4. **Informações:**
   - O usuário está autenticado? (sim/não)
   - O documento do usuário existe no Firestore? (sim/não)
   - Qual erro aparece no console?

---

## 💡 DICA IMPORTANTE

**A correção garante que sempre use o UID correto do Firebase Auth!**

Mesmo que o `user.id` esteja incorreto, o código agora:
1. Pega o UID do `auth.currentUser.uid`
2. Usa esse UID para salvar os dados
3. Garante que as regras do Firestore funcionem corretamente

**Isso resolve o problema para contas normais!** 🎉

---

## 📝 Resumo

**O que foi corrigido:**
- ✅ Código agora sempre usa o UID do Firebase Auth atual
- ✅ Verifica se o usuário está autenticado antes de salvar
- ✅ Logs detalhados para debug
- ✅ Tratamento de erros melhorado

**O que você precisa fazer:**
- ✅ Testar criando uma conta normal
- ✅ Preencher o formulário de onboarding
- ✅ Verificar se os dados são salvos corretamente
