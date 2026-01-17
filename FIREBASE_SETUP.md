# Configuração do Firebase

Este projeto está configurado para salvar os dados de onboarding dos clientes no Firebase Firestore.

## 📋 Pré-requisitos

1. Conta no Google Firebase
2. Projeto Firebase criado
3. Firestore Database habilitado

## 🚀 Passos para Configuração

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Preencha o nome do projeto
4. Siga as instruções para criar o projeto

### 2. Habilitar Firestore Database

1. No menu lateral, vá em **Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha o modo de produção (ou modo de teste para desenvolvimento)
4. Selecione a localização do banco de dados
5. Clique em **Habilitar**

### 3. Obter Credenciais de Configuração

1. No Firebase Console, vá em **Configurações do Projeto** (ícone de engrenagem)
2. Role até a seção **Seus apps**
3. Se ainda não tiver um app web, clique em **Adicionar app** > **Web** (ícone `</>`)
4. Copie as credenciais de configuração

### 4. Configurar Variáveis de Ambiente

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione as seguintes variáveis com os valores do seu projeto Firebase:

```env
VITE_FIREBASE_API_KEY=sua-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-messaging-sender-id
VITE_FIREBASE_APP_ID=seu-app-id
```

### 5. Configurar Regras de Segurança do Firestore

No Firebase Console, vá em **Firestore Database** > **Regras** e configure as regras de segurança.

**Importante**: As regras padrão do Firebase são muito restritivas. Você precisa configurar regras adequadas para permitir que usuários autenticados acessem seus dados.

#### Opção 1: Usar o arquivo de regras fornecido

Copie o conteúdo do arquivo `firestore.rules` na raiz do projeto e cole no Firebase Console.

#### Opção 2: Configurar manualmente

No Firebase Console, vá em **Firestore Database** > **Regras** e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita para onboarding_data
    match /onboarding_data/{document} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

**Nota:** Para desenvolvimento, você pode usar regras mais permissivas temporariamente:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Apenas para desenvolvimento!
    }
  }
}
```

⚠️ **IMPORTANTE:** Não use regras permissivas em produção!

## 📊 Estrutura de Dados

Os dados de onboarding são salvos na coleção `onboarding_data` com a seguinte estrutura:

```typescript
{
  companyName: string
  industry: string
  dataSource: string
  goals: string[]
  specificQuestions: string
  contact: string
  userId: string
  email: string
  timestamp: Timestamp
}
```

## 🔍 Verificar Dados Salvos

1. Acesse o Firebase Console
2. Vá em **Firestore Database**
3. Você verá a coleção `onboarding_data` com todos os dados salvos

## 🛠️ Funcionalidades Implementadas

- ✅ Salvar dados de onboarding no Firestore
- ✅ Fallback para localStorage caso Firebase não esteja configurado
- ✅ Mensagens de sucesso/erro ao salvar
- ✅ Timestamp automático para cada registro

## 📝 Notas Importantes

- O sistema funciona mesmo sem Firebase configurado (usa localStorage como fallback)
- Os dados são salvos automaticamente quando o cliente completa o onboarding
- Apenas admins podem visualizar todos os dados (via página Admin)
