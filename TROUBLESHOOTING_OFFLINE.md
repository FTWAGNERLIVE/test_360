# Troubleshooting - Erros "Client is Offline" e 400/404

## Erros Reportados

1. **Erro 400**: `Failed to load resource: the server responded with a status of 400`
2. **Firestore Offline**: `Failed to get document because the client is offline`
3. **Erro 404**: `Failed to load resource: the server responded with a status of 404`

## Possíveis Causas

### 1. Firestore "Client is Offline"

Este erro geralmente ocorre quando:

#### A. Regras do Firestore Bloqueando
- As regras podem estar bloqueando a leitura
- O usuário pode não estar autenticado corretamente

**Solução:**
1. Verifique as regras do Firestore no Firebase Console
2. Certifique-se de que a regra permite leitura para usuários autenticados:
   ```javascript
   match /users/{userId} {
     allow read: if isAuthenticated() && request.auth.uid == userId;
   }
   ```

#### B. Firestore Não Inicializado Corretamente
- Problemas na inicialização do Firebase
- Variáveis de ambiente incorretas

**Solução:**
1. Verifique o console do navegador para ver se o Firebase foi inicializado
2. Procure por: `Firebase inicializado com sucesso`
3. Se não aparecer, verifique as variáveis de ambiente no Vercel

#### C. Problemas de Rede/Conexão
- Conexão instável
- Firewall bloqueando
- CORS issues

**Solução:**
1. Verifique sua conexão com a internet
2. Tente em outra rede
3. Verifique se não há firewall bloqueando

### 2. Erro 400

Pode ser causado por:

#### A. Requisição Inválida ao Firebase
- Dados malformados
- Autenticação inválida

**Solução:**
1. Verifique os logs no console do navegador
2. Veja qual requisição está retornando 400 na aba Network
3. Verifique se o usuário está autenticado

#### B. Domínio Não Autorizado
- Domínio do Vercel não está na lista de autorizados

**Solução:**
1. Firebase Console > Authentication > Settings > Authorized domains
2. Adicione o domínio do Vercel

### 3. Erro 404

Pode ser causado por:

#### A. Recurso Não Encontrado
- Arquivo estático não encontrado
- Rota não existe

**Solução:**
1. Verifique na aba Network qual recurso está retornando 404
2. Pode ser um arquivo estático (CSS, JS, imagem)
3. Verifique se o build foi feito corretamente

## Melhorias Implementadas

### 1. Logs Detalhados
- Agora o sistema mostra logs mais detalhados no console
- Facilita identificar o problema específico

### 2. Retry Inteligente
- Sistema tenta novamente automaticamente quando detecta erro offline
- Aguarda progressivamente mais tempo entre tentativas

### 3. Fallback para Dados Básicos
- Se não conseguir buscar do Firestore, usa dados básicos do Firebase Auth
- Permite que o usuário continue usando a aplicação

## Como Diagnosticar

### 1. Abra o Console do Navegador (F12)

Procure por:
- `Firebase inicializado com sucesso` - Firebase está OK
- `Tentativa de buscar dados do Firestore falhou` - Problema ao buscar dados
- `Não foi possível buscar dados do Firestore` - Firestore offline

### 2. Verifique a Aba Network

1. Filtre por `firestore` ou `firebase`
2. Veja quais requisições estão falhando
3. Clique na requisição e veja:
   - **Status**: 400, 403, 404, etc.
   - **Response**: Mensagem de erro completa
   - **Headers**: Verifique se a autenticação está sendo enviada

### 3. Verifique as Regras do Firestore

1. Firebase Console > Firestore Database > Rules
2. Certifique-se de que as regras estão publicadas
3. Teste as regras usando o simulador

## Solução Rápida

Se o erro persistir:

1. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
2. **Faça logout e login novamente**
3. **Verifique se consegue fazer login com a conta admin temporária**:
   - Email: `admin@creattive.com`
   - Senha: `admin123`

Se o login admin funcionar, o problema é específico do Firestore.

## Verificações no Firebase Console

1. **Firestore Database está habilitado?**
   - Firebase Console > Firestore Database
   - Deve estar em modo "Native mode" (não Datastore)

2. **Regras estão publicadas?**
   - Firestore Database > Rules
   - Deve mostrar "Published" (não "Draft")

3. **Usuário existe no Firestore?**
   - Firestore Database > Data
   - Verifique se há um documento em `users/{userId}`

4. **Autenticação está funcionando?**
   - Authentication > Users
   - Verifique se o usuário está listado

## Se Nada Funcionar

1. Verifique os logs completos no console
2. Faça screenshot dos erros
3. Verifique:
   - URL completa onde está ocorrendo o erro
   - Status code das requisições na aba Network
   - Mensagens de erro completas

## Nota Importante

O sistema agora tem um **fallback inteligente**: mesmo se o Firestore estiver offline, o usuário pode continuar usando a aplicação com dados básicos do Firebase Auth. Isso evita que a aplicação trave completamente.
