# 🔧 Resolver: Dados Não Estão Sendo Salvos

## 🚨 Problema

Quando você clica em "Salvar dados" no formulário de onboarding, os dados não são salvos no Firestore.

---

## 🔍 Como Diagnosticar

### 1. Abrir o Console do Navegador (F12)

1. **Pressione F12** no navegador
2. Vá na aba **Console**
3. **Tente salvar os dados** novamente
4. **Procure por mensagens** como:
   - ✅ `💾 Tentando salvar dados de onboarding:` → Salvamento iniciado
   - ✅ `✅ Dados de onboarding salvos com sucesso. ID: ...` → Salvou com sucesso
   - ❌ `❌ Erro ao salvar dados de onboarding:` → Erro ao salvar
   - ❌ `permission-denied` → Problema de permissão
   - ❌ `unavailable` → Firestore offline

---

## ✅ SOLUÇÕES (Siga na Ordem)

### Solução 1: Verificar se Está Autenticado

**Sintoma:** Erro `permission-denied` ou "Dados do usuário incompletos"

**Como resolver:**
1. **Faça logout** e **faça login novamente**
2. **Verifique** se você está realmente autenticado
3. **Tente salvar** novamente

---

### Solução 2: Verificar Regras do Firestore (MAIS COMUM)

**Sintoma:** Erro `permission-denied` no console

**Como resolver:**
1. **Firebase Console** → **Firestore Database** → **Rules**
2. **Verifique** se está escrito **"Published"** (não "Draft")
3. **Se estiver em Draft:**
   - Cole as regras do arquivo `firestore.rules`
   - Clique em **"Publish"**
   - Aguarde 1-2 minutos
4. **Tente salvar** novamente

**Regra importante para `onboarding_data`:**
```firestore
match /onboarding_data/{onboardingId} {
  allow create: if isAuthenticated() && 
                   request.resource.data.userId == request.auth.uid;
}
```

Esta regra permite que usuários autenticados criem documentos onde o `userId` do documento seja igual ao `uid` do usuário autenticado.

---

### Solução 3: Verificar se Firestore Está Online

**Sintoma:** Erro `unavailable` ou "client is offline"

**Como resolver:**
1. **Firebase Console** → **Firestore Database**
2. **Verifique** se está em **Native mode** (não Datastore mode)
3. **Verifique** se o banco está criado e habilitado
4. **Aguarde alguns minutos** e tente novamente

---

### Solução 4: Verificar Dados do Usuário

**Sintoma:** Erro "Dados do usuário incompletos"

**Como resolver:**
1. **Verifique** se você está logado
2. **Verifique** se o documento do usuário existe no Firestore:
   - Firebase Console → Firestore Database → Data
   - Coleção: `users`
   - Procure pelo seu UID
3. **Se não existir:**
   - Faça logout e login novamente
   - O sistema criará automaticamente

---

### Solução 5: Verificar Campos Obrigatórios

**Sintoma:** Erro "Preencha todos os campos obrigatórios"

**Como resolver:**
1. **Verifique** se preencheu:
   - ✅ Nome da Empresa
   - ✅ Setor/Indústria
   - ✅ Fonte de Dados
   - ✅ Pelo menos 1 objetivo
2. **Preencha** todos os campos obrigatórios
3. **Tente salvar** novamente

---

## 🧪 Teste Passo a Passo

1. **Abra o Console** (F12)
2. **Limpe o console** (ícone de limpar ou Ctrl+L)
3. **Preencha o formulário** de onboarding
4. **Clique em "Salvar dados"**
5. **Observe as mensagens** no console:
   - Se aparecer `✅ Dados de onboarding salvos com sucesso` → **Funcionou!**
   - Se aparecer `❌ Erro ao salvar` → Veja o código do erro abaixo

---

## 📊 Códigos de Erro Comuns

### `permission-denied`
**Causa:** Regras do Firestore bloqueando ou usuário não autenticado

**Solução:**
- Verificar se está autenticado
- Verificar se as regras estão publicadas
- Verificar se o `userId` do documento é igual ao `uid` do usuário autenticado

---

### `unavailable`
**Causa:** Firestore offline ou não consegue conectar

**Solução:**
- Verificar se Firestore está habilitado
- Verificar se está em Native mode
- Aguardar alguns minutos e tentar novamente

---

### `failed-precondition`
**Causa:** Firestore não está inicializado corretamente

**Solução:**
- Recarregar a página (F5)
- Verificar variáveis de ambiente no Vercel
- Verificar se Firebase está configurado

---

### `deadline-exceeded`
**Causa:** Timeout na requisição

**Solução:**
- Verificar conexão com internet
- Tentar novamente
- Verificar se há muitos dados para salvar

---

## 🔍 Verificar se os Dados Foram Salvos

1. **Firebase Console** → **Firestore Database** → **Data**
2. **Coleção:** `onboarding_data`
3. **Procure** por um documento recente com:
   - `userId` = Seu UID
   - `email` = Seu email
   - `companyName` = Nome que você preencheu

**Se encontrar:** Os dados foram salvos! ✅

**Se não encontrar:** Os dados não foram salvos. Siga as soluções acima.

---

## 🆘 Se Nada Funcionar

1. **Screenshot do console** (F12) com todos os erros
2. **Screenshot da aba Network** (F12 → Network) mostrando requisições para `firestore.googleapis.com`
3. **Screenshot das regras do Firestore** (mostrando "Published")
4. **Informações:**
   - Você está autenticado? (sim/não)
   - Qual erro aparece no console?
   - As regras estão publicadas? (sim/não)

---

## 💡 DICA IMPORTANTE

**A mensagem de erro agora é mais específica!** 

Se você ver uma mensagem de erro na tela, ela indicará exatamente qual é o problema:
- "Permissão negada" → Verifique regras do Firestore
- "Serviço indisponível" → Firestore offline, aguarde
- "Dados incompletos" → Faça login novamente
- "Preencha todos os campos" → Complete o formulário

**Não navegue para o dashboard se houver erro!** O sistema agora não navega automaticamente quando há erro, permitindo que você tente novamente.

---

## ✅ Checklist de Verificação

Antes de tentar salvar, verifique:

- [ ] Você está autenticado (fez login)
- [ ] Regras do Firestore estão **publicadas** (não Draft)
- [ ] Firestore está em **Native mode** (não Datastore)
- [ ] Firestore Database está **habilitado**
- [ ] Você preencheu **todos os campos obrigatórios**
- [ ] Console do navegador não mostra erros de permissão

---

Após seguir estas soluções, os dados devem ser salvos corretamente! 🎉
