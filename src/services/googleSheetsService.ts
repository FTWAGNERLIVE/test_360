/**
 * Serviço para buscar dados da API do Google Sheets
 */

export interface SheetDataResponse {
  values: string[][];
  range: string;
  majorDimension: string;
}

export class GoogleSheetsService {
  /**
   * Busca os valores de uma planilha usando o ID e o Intervalo (Range)
   */
  static async getSheetValues(spreadsheetId: string, range: string, accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao buscar dados da planilha');
      }

      const data: SheetDataResponse = await response.json();
      
      if (!data.values || data.values.length === 0) {
        return [];
      }

      // Converter array de arrays para array de objetos (formato padrão do dashboard)
      const headers = data.values[0];
      const rows = data.values.slice(1);

      return rows.map((row) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    } catch (error: any) {
      console.error('Erro no GoogleSheetsService:', error);
      throw error;
    }
  }

  /**
   * Extrai o ID da planilha de uma URL do Google Sheets
   */
  static extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
}
