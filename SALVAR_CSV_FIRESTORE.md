# 💾 Salvar CSV no Firestore - Sincronização Entre Dispositivos

## 🎯 Problema Resolvido

Antes, quando um usuário trocava de equipamento, ele precisava fazer upload novamente do CSV. Agora, o CSV é salvo no Firestore e sincronizado automaticamente entre todos os dispositivos.

---

## ✅ O Que Foi Implementado

### 1. **Novo Serviço de CSV** (`src/services/csvService.ts`)

Criado serviço completo para gerenciar dados do CSV no Firestore:

- ✅ `saveCSVData()` - Salva dados do CSV no Firestore
- ✅ `loadCSVData()` - Carrega dados do CSV do Firestore
- ✅ `deleteCSVData()` - Remove dados do CSV do Firestore

**Coleção criada:** `user_csv_data`
- Um documento por usuário (ID = userId)
- Armazena: dados parseados, headers, nome do arquivo, conteúdo original

---

### 2. **Dashboard Atualizado** (`src/pages/Dashboard.tsx`)

**Ao fazer upload:**
- ✅ Salva no localStorage (cache local rápido)
- ✅ Salva no Firestore (sincronização entre dispositivos)
- ✅ Se Firestore falhar, continua funcionando com localStorage

**Ao carregar:**
- ✅ Primeiro tenta carregar do Firestore
- ✅ Se não encontrar, tenta localStorage (fallback)
- ✅ Se encontrar no localStorage, sincroniza com Firestore em background

**Ao limpar:**
- ✅ Remove de ambos (localStorage e Firestore)

---

### 3. **CSVUploader Atualizado** (`src/components/CSVUploader.tsx`)

- ✅ Agora lê o conteúdo original do arquivo CSV
- ✅ Passa nome do arquivo e conteúdo para o Dashboard
- ✅ Permite salvar o arquivo original para download futuro

---

### 4. **Regras do Firestore Atualizadas** (`firestore.rules`)

Adicionadas regras para a coleção `user_csv_data`:

```firestore
match /user_csv_data/{userId} {
  // Usuário pode ler/atualizar apenas seus próprios dados
  // Admin e vendas podem ler dados de qualquer usuário
  allow read: if isAuthenticated() && 
                 (request.auth.uid == userId || isAdminOrVendas());
  allow create, update: if isAuthenticated() && request.auth.uid == userId;
  allow delete: if isAuthenticated() && 
                    (request.auth.uid == userId || isAdmin());
}
```

---

## 🔄 Como Funciona

### Fluxo de Upload:

1. **Usuário faz upload do CSV**
   - CSV é parseado pelo PapaParse
   - Dados são exibidos na tela
   - Dados são salvos no localStorage (cache)
   - Dados são salvos no Firestore (sincronização)

### Fluxo de Carregamento:

1. **Usuário acessa o Dashboard**
   - Sistema tenta carregar do Firestore primeiro
   - Se encontrar: carrega e sincroniza com localStorage
   - Se não encontrar: tenta localStorage
   - Se encontrar no localStorage: sincroniza com Firestore em background

### Fluxo de Limpeza:

1. **Usuário clica em "Carregar Novo Arquivo"**
   - Remove dados do localStorage
   - Remove dados do Firestore
   - Limpa a tela

---

## 📋 Estrutura dos Dados no Firestore

```
Coleção: user_csv_data
└── Documento ID: [userId do usuário]
    ├── userId (string): ID do usuário
    ├── csvData (array): Dados parseados do CSV
    ├── csvHeaders (array): Cabeçalhos das colunas
    ├── csvFileName (string): Nome do arquivo original
    ├── csvFileContent (string): Conteúdo original do CSV
    ├── uploadedAt (timestamp): Data do upload
    └── updatedAt (timestamp): Data da última atualização
```

---

## 🚀 Benefícios

1. ✅ **Sincronização entre dispositivos** - Acesse seus dados de qualquer lugar
2. ✅ **Backup automático** - Dados sempre seguros no Firestore
3. ✅ **Performance** - localStorage como cache local rápido
4. ✅ **Resiliência** - Funciona mesmo se Firestore estiver temporariamente indisponível
5. ✅ **Histórico** - Mantém nome do arquivo e conteúdo original

---

## ⚠️ IMPORTANTE: Publicar Regras do Firestore

**CRÍTICO:** As novas regras precisam ser publicadas no Firebase Console!

1. **Firebase Console:** https://console.firebase.google.com/
2. **Projeto:** `farol-360`
3. **Menu:** Firestore Database → **Rules**
4. **Cole o conteúdo atualizado** do arquivo `firestore.rules`
5. **Clique em "Publicar"** ou **"Publish"**
6. **AGUARDE** aparecer **"Published"**
7. **AGUARDE 2-3 minutos** para as regras se propagarem

---

## 🧪 Como Testar

### Teste 1: Upload e Sincronização

1. Faça login em um dispositivo
2. Faça upload de um CSV
3. Verifique no Firebase Console → Firestore → `user_csv_data` se o documento foi criado
4. Faça logout e login em outro dispositivo
5. Os dados devem aparecer automaticamente

### Teste 2: Fallback para localStorage

1. Desabilite temporariamente o Firestore (ou simule erro)
2. Faça upload de um CSV
3. Os dados devem ser salvos apenas no localStorage
4. Recarregue a página
5. Os dados devem aparecer do localStorage

### Teste 3: Limpeza

1. Faça upload de um CSV
2. Clique em "Carregar Novo Arquivo"
3. Verifique no Firebase Console se o documento foi limpo
4. Verifique no localStorage se os dados foram removidos

---

## 📊 Logs no Console

O sistema agora mostra logs detalhados:

**Ao salvar:**
```
💾 Salvando dados do CSV no Firestore...
✅ Dados do CSV salvos com sucesso no Firestore!
```

**Ao carregar:**
```
🔍 Buscando dados do CSV no Firestore...
✅ Dados do CSV carregados com sucesso!
```

**Em caso de erro:**
```
❌ Erro ao salvar dados do CSV: ...
⚠️ Dados salvos apenas localmente. Tente novamente mais tarde.
```

---

## 🔧 Troubleshooting

### Problema: Dados não aparecem em outro dispositivo

**Solução:**
1. Verifique se as regras do Firestore estão publicadas
2. Verifique no Firebase Console se o documento existe em `user_csv_data`
3. Verifique o console do navegador para erros
4. Tente fazer logout e login novamente

### Problema: Erro de permissão

**Solução:**
1. Verifique se as regras do Firestore estão publicadas
2. Verifique se o usuário está autenticado
3. Verifique se o userId corresponde ao documento

### Problema: Dados não são salvos

**Solução:**
1. Verifique o console do navegador para erros
2. Verifique se o Firestore está configurado corretamente
3. Os dados ainda funcionam com localStorage como fallback

---

## ✅ Checklist de Implementação

- [x] Serviço `csvService.ts` criado
- [x] Dashboard atualizado para salvar no Firestore
- [x] Dashboard atualizado para carregar do Firestore
- [x] CSVUploader atualizado para passar arquivo original
- [x] Regras do Firestore atualizadas
- [x] Fallback para localStorage mantido
- [x] Logs detalhados adicionados
- [ ] **Regras publicadas no Firebase Console** ⚠️ IMPORTANTE!

---

Após publicar as regras no Firebase Console, o sistema estará totalmente funcional! 🚀
