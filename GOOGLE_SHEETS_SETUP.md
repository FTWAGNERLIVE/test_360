# Como Configurar Google Sheets para Receber Dados

## Passo 1: Criar a Planilha no Google Sheets

1. Acesse https://sheets.google.com
2. Crie uma nova planilha chamada "Farol 360 - Dados de Onboarding"
3. Na primeira linha, adicione os cabeçalhos:
   - Data/Hora
   - Email do Usuário
   - Nome da Empresa
   - Setor/Indústria
   - Fonte de Dados
   - Objetivos
   - Perguntas Específicas
   - Telefone

## Passo 2: Criar o Script (Google Apps Script)

1. Na planilha, vá em **Extensões** > **Apps Script**
2. Cole o código abaixo e salve
3. Publique como aplicativo web (veja instruções abaixo)

## Passo 3: Obter a URL do Webhook

Após publicar, você receberá uma URL que será usada no código.

## Código do Google Apps Script:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    const row = [
      new Date(),
      data.email || '',
      data.companyName || '',
      data.industry || '',
      data.dataSource || '',
      data.goals ? data.goals.join(', ') : '',
      data.specificQuestions || '',
      data.contact || ''
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Dados salvos com sucesso'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Webhook ativo! Use POST para enviar dados.');
}
```

## Como Publicar:

1. No Apps Script, clique em **Publicar** > **Implantar como aplicativo da web**
2. Execute como: **Eu mesmo**
3. Quem tem acesso: **Qualquer pessoa, mesmo anônima**
4. Clique em **Implantar**
5. Copie a URL gerada (será algo como: https://script.google.com/macros/s/...)

## Passo 4: Configurar no Código

Adicione a URL no arquivo `.env` ou diretamente no código (veja exemplo abaixo).
