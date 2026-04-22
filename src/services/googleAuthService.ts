/**
 * Serviço para gerenciar Autenticação Google OAuth2 (Google Identity Services)
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export class GoogleAuthService {
  private static tokenClient: any = null;

  /**
   * Inicializa o cliente de token do Google
   */
  static init(callback: (response: GoogleTokenResponse) => void) {
    if (typeof window === 'undefined' || !window.google) {
      console.error('Google Identity Services não carregado');
      return;
    }

    if (!CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID não configurado no .env');
      return; // Não inicializa se não houver Client ID
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: callback,
    });
  }

  /**
   * Solicita um token de acesso ao usuário
   */
  static requestToken() {
    if (!this.tokenClient) {
      throw new Error('Google Auth não inicializado. Chame GoogleAuthService.init() primeiro.');
    }
    this.tokenClient.requestAccessToken();
  }

  /**
   * Revoga o token de acesso (Logout do Google no contexto do app)
   */
  static revokeToken(accessToken: string) {
    if (window.google) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revogado');
      });
    }
  }
}

// Declaração global para evitar erros de TS com a lib do Google carregada via script tag
declare global {
  interface Window {
    google: any;
  }
}
