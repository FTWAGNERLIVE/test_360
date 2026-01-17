# 🔍 Verificar Documento no Firestore

## 📋 ID do Documento: `g7fMkfGnzOeX7LdU3pk8`

Esse ID foi gerado automaticamente pelo Firestore. Pode ser de uma das seguintes coleções:

### 1. **Coleção `onboarding_data`** (Mais Provável)
- Criado quando alguém preenche o formulário de onboarding
- ID gerado automaticamente com `addDoc()`

### 2. **Coleção `support_messages`**
- Criado quando alguém envia uma mensagem de suporte
- ID gerado automaticamente com `addDoc()`

### 3. **Coleção `users`** (Menos Provável)
- Normalmente usa o UID do Firebase Auth como ID
- Mas pode ter sido criado manualmente ou pela migração

---

## ✅ Como Verificar no Firebase Console:

1. **Acesse o Firebase Console:**
   - https://console.firebase.google.com/
   - Selecione o projeto **farol-360**

2. **Vá para Firestore Database:**
   - Menu lateral → **Firestore Database**
   - Clique na aba **Data**

3. **Procure pelo ID:**
   - Procure nas coleções: `onboarding_data`, `support_messages`, ou `users`
   - Clique na coleção
   - Procure pelo documento com ID `g7fMkfGnzOeX7LdU3pk8`

4. **Veja os dados:**
   - Clique no documento para ver os campos
   - Verifique se os dados estão corretos

---

## 📊 O que Esperar Ver:

### Se for `onboarding_data`:
```json
{
  "companyName": "...",
  "industry": "...",
  "dataSource": "...",
  "goals": [...],
  "specificQuestions": "...",
  "contact": "...",
  "userId": "...",
  "email": "...",
  "timestamp": "..."
}
```

### Se for `support_messages`:
```json
{
  "userId": "...",
  "userEmail": "...",
  "userName": "...",
  "subject": "...",
  "message": "...",
  "status": "pending",
  "timestamp": "..."
}
```

### Se for `users`:
```json
{
  "email": "...",
  "name": "...",
  "role": "user" | "admin" | "vendas",
  "onboardingCompleted": true | false,
  "createdAt": "...",
  "trialEndDate": "..."
}
```

---

## ✅ Se o Documento Existe:

**Isso significa que:**
- ✅ O Firestore está funcionando
- ✅ As regras permitem criar documentos
- ✅ A aplicação conseguiu salvar dados

**Próximos passos:**
- Verifique se os dados estão corretos
- Teste criar mais dados na aplicação
- Verifique se consegue ler os dados no painel admin

---

## ❌ Se o Documento NÃO Existe ou Está Vazio:

**Possíveis problemas:**
1. **Regras do Firestore muito restritivas**
   - Verifique se as regras foram publicadas
   - Veja o arquivo `firestore.rules`

2. **Erro ao salvar**
   - Verifique o console do navegador (F12)
   - Procure por erros de permissão

3. **Firestore offline**
   - Verifique sua conexão
   - Aguarde alguns segundos e recarregue

---

## 🧪 Teste Rápido:

1. **Crie uma conta** na aplicação
2. **Preencha o onboarding**
3. **Volte ao Firebase Console**
4. **Verifique se apareceu um novo documento**

Se apareceu, está tudo funcionando! 🎉

---

## 📝 Nota:

IDs automáticos do Firestore (como `g7fMkfGnzOeX7LdU3pk8`) são gerados quando você usa `addDoc()`. Eles são únicos e aleatórios, perfeitos para documentos que não precisam de um ID específico.
