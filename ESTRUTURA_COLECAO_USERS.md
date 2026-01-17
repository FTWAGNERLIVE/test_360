# 📋 Estrutura da Coleção `users` - Resumo Rápido

## 🎯 Estrutura Completa

```
Coleção: users
└── Documento ID: [UID do usuário do Firebase Auth]
    ├── email (string): "admin@creattive.com"
    ├── name (string): "Administrador"
    ├── role (string): "admin"
    ├── onboardingCompleted (boolean): true
    ├── createdAt (timestamp): [data atual]
    └── trialEndDate (timestamp): [data + 10 anos]
```

---

## 📝 Valores Exatos para o Admin

Quando criar o documento, use estes valores:

| Campo | Tipo | Valor |
|-------|------|-------|
| `email` | string | `admin@creattive.com` |
| `name` | string | `Administrador` |
| `role` | string | `admin` ⚠️ (minúsculas) |
| `onboardingCompleted` | boolean | `true` |
| `createdAt` | timestamp | Data/hora atual |
| `trialEndDate` | timestamp | Data/hora + 10 anos |

---

## 🔧 Como Criar (Resumo)

1. **Firebase Console** → **Firestore Database** → **Data**
2. Clique em **"+ Adicionar coleção"** ou **"Iniciar uma coleção"**
3. **Nome da coleção:** `users`
4. **ID do documento:** Cole o UID do usuário (pegue em Authentication → Users)
5. **Adicione os 6 campos** acima
6. **Salve**

---

## ⚠️ IMPORTANTE

- **Nome da coleção:** `users` (minúsculas, sem espaços)
- **Campo `role`:** Deve ser exatamente `admin` (não `Admin` ou `ADMIN`)
- **ID do documento:** Use o UID do Firebase Auth (não invente um)

---

## 🎯 Exemplo Visual no Firebase Console

```
┌─────────────────────────────────────────────┐
│ Firestore Database                          │
├─────────────────────────────────────────────┤
│ users                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ Document ID: 7v72v6oyEsTs1pgPjPmqF9cdo6q1│ │
│ ├─────────────────────────────────────────┤ │
│ │ email: "admin@creattive.com"            │ │
│ │ name: "Administrador"                   │ │
│ │ role: "admin"                           │ │
│ │ onboardingCompleted: true               │ │
│ │ createdAt: January 17, 2024 at 12:00:00 │ │
│ │ trialEndDate: January 17, 2034 at 12:00:00│ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## ✅ Depois de Criar

1. **Aguarde 1-2 minutos**
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Recarregue a página** (F5)
4. **Faça login** com `admin@creattive.com` / `admin123`
5. **Você será redirecionado para `/admin`** ✅

---

## 🆘 Se Não Funcionar

1. Verifique se o **UID do documento** é o mesmo do usuário em Authentication
2. Verifique se o campo `role` está escrito exatamente `admin` (minúsculas)
3. Verifique se as **regras do Firestore estão publicadas**
4. Verifique se o **domínio do Vercel está autorizado** no Firebase Auth
