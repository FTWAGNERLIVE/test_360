# Farol 360 - Creattive

Dashboard interativo para análise de dados com IA, desenvolvido pela Creattive para atrair clientes e demonstrar o poder do Farol 360.

## 🚀 Funcionalidades

- **Sistema de Autenticação**: Login seguro para acesso ao dashboard
- **Onboarding Personalizado**: Formulário inicial para coletar informações do cliente e personalizar a análise
- **Upload de CSV**: Interface drag-and-drop para upload de arquivos CSV
- **Visualizações Interativas**: Gráficos de barras, linhas e pizza usando Recharts
- **Agente 360**: Assistente inteligente que analisa os dados e responde perguntas
- **Design Moderno**: Interface com cores inspiradas no Google e design limpo

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🛠️ Instalação

1. Clone o repositório ou navegue até a pasta do projeto
2. Instale as dependências:

```bash
npm install
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse `http://localhost:3000` no navegador

## 📦 Build para Produção

```bash
npm run build
```

Os arquivos otimizados estarão na pasta `dist/`.

## 🎯 Como Usar

1. **Login**: Faça login com qualquer email e senha (sistema de autenticação simulado)
2. **Onboarding**: Preencha o formulário com informações sobre sua empresa e objetivos
3. **Upload CSV**: Faça upload do seu arquivo CSV através da interface drag-and-drop
4. **Visualização**: Explore os gráficos e tabelas gerados automaticamente
5. **Chatbot**: Interaja com o assistente de IA para fazer perguntas sobre seus dados

## 🏗️ Estrutura do Projeto

```
├── src/
│   ├── components/      # Componentes reutilizáveis
│   │   ├── CSVUploader.tsx
│   │   ├── DataVisualization.tsx
│   │   └── ChatBot.tsx
│   ├── context/         # Context API para gerenciamento de estado
│   │   └── AuthContext.tsx
│   ├── pages/           # Páginas principais
│   │   ├── Login.tsx
│   │   ├── Onboarding.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx          # Componente principal
│   └── main.tsx         # Entry point
├── index.html
└── package.json
```

## 🎨 Tecnologias Utilizadas

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **React Router** - Roteamento
- **Recharts** - Gráficos e visualizações
- **PapaParse** - Parser de CSV
- **Lucide React** - Ícones modernos

## 🔐 Autenticação

O sistema de autenticação é simulado e armazena os dados no localStorage. Em produção, isso deve ser substituído por uma API real com autenticação segura.

## 📊 Análise de Dados

O sistema identifica automaticamente:
- Colunas numéricas para visualização
- Estatísticas básicas (média, máximo, mínimo)
- Padrões nos dados
- Distribuições e tendências

## 💬 Chatbot IA

O chatbot utiliza as informações do onboarding e os dados carregados para fornecer análises contextuais. Ele pode responder perguntas sobre:
- Total de registros
- Colunas e campos
- Estatísticas numéricas
- Padrões e tendências
- Análises específicas

## 🎯 Próximos Passos

Para integrar com a plataforma real:
1. Substituir a autenticação simulada por API real
2. Integrar com backend para processamento de dados
3. Conectar Agente 360 com modelo de IA real (OpenAI, etc.)
4. Adicionar mais tipos de visualizações
5. Implementar exportação de relatórios

## 📝 Licença

Este projeto é um beta test desenvolvido para demonstração.
