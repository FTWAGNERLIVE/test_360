import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Link, Loader2, AlertCircle, CheckCircle2, Globe, ShieldCheck, Key } from 'lucide-react';
import { GoogleAuthService, GoogleTokenResponse } from '../services/googleAuthService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import './GoogleSheetsImporter.css';

interface GoogleSheetsImporterProps {
  onDataLoaded: (data: any[], headers: string[], fileName: string) => void;
}

export default function GoogleSheetsImporter({ onDataLoaded }: GoogleSheetsImporterProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Inicializar o Google Auth
  useEffect(() => {
    const handleTokenResponse = (response: GoogleTokenResponse) => {
      if (response && response.access_token) {
        setAccessToken(response.access_token);
        setError('');
      } else {
        setError('Não foi possível obter permissão do Google.');
      }
    };

    if (window.google) {
      GoogleAuthService.init(handleTokenResponse);
    } else {
      // Tentar novamente em 1 segundo se a lib ainda não carregou
      const timer = setTimeout(() => {
        if (window.google) GoogleAuthService.init(handleTokenResponse);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConnectGoogle = () => {
    try {
      GoogleAuthService.requestToken();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const convertToCsvUrl = (inputUrl: string): string | null => {
    try {
      const gsheetRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
      const match = inputUrl.match(gsheetRegex);
      
      if (!match) return null;
      
      const sheetId = match[1];
      // Tentar extrair o GID (aba específica) se presente
      const gidRegex = /gid=([0-9]+)/;
      const gidMatch = inputUrl.match(gidRegex);
      const gid = gidMatch ? gidMatch[1] : '0';
      
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } catch (e) {
      return null;
    }
  };

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Por favor, insira a URL da planilha');
      return;
    }

    const spreadsheetId = GoogleSheetsService.extractSpreadsheetId(url);
    if (!spreadsheetId) {
      setError('URL do Google Sheets inválida.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      let data: any[] = [];
      let headers: string[] = [];

      if (accessToken) {
        // MODO SEGURO (OAuth)
        // Por padrão tenta a primeira aba ('Sheet1' ou 'Página1' é difícil prever, 
        // mas a API aceita 'A1:Z500' para pegar a primeira aba ativa)
        const range = 'A1:Z1000'; 
        data = await GoogleSheetsService.getSheetValues(spreadsheetId, range, accessToken);
        
        if (data.length > 0) {
          headers = Object.keys(data[0]);
        }
      } else {
        // MODO PÚBLICO (CSV Export)
        const csvUrl = convertToCsvUrl(url);
        if (!csvUrl) throw new Error('Não foi possível gerar link de exportação.');
        
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Planilha não está pública ou link inválido.');
        
        const csvText = await response.text();
        const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject
          });
        });

        data = results.data;
        headers = results.meta.fields || [];
      }

      if (data.length === 0) {
        throw new Error('A planilha parece estar vazia.');
      }

      setSuccess(true);
      setTimeout(() => {
        onDataLoaded(data, headers, 'Google Sheet');
        setIsLoading(false);
      }, 1000);

    } catch (err: any) {
      console.error('Erro ao importar Google Sheet:', err);
      setError(err.message || 'Erro ao conectar com o Google Sheets.');
      setIsLoading(false);
    }
  };

  return (
    <div className="gsheets-importer">
      <div className="gsheets-header">
        <Globe size={20} className="gsheets-icon" />
        <h3>Importar do Google Sheets</h3>
        {accessToken && <ShieldCheck size={18} className="secure-badge" />}
      </div>
      
      {!accessToken ? (
        <div className="auth-prompt">
          <p className="gsheets-description">
            Conecte sua conta para importar planilhas <strong>privadas</strong> com total segurança, sem precisar publicá-las na web.
          </p>
          <button onClick={handleConnectGoogle} className="google-connect-btn">
            <Key size={18} />
            Conectar Conta Google
          </button>
          <div className="divider">ou use o método público</div>
        </div>
      ) : (
        <div className="auth-status">
          <CheckCircle2 size={16} />
          <span>Conectado com sucesso!</span>
          <button onClick={() => setAccessToken(null)} className="disconnect-btn">Sair</button>
        </div>
      )}

      <p className="gsheets-description">
        {accessToken 
          ? 'Cole o link da sua planilha privada abaixo para importar os dados com segurança.' 
          : 'Cole o link da sua planilha (ela deve estar Publicada na Web se não estiver autenticado).'}
      </p>

      <div className="input-group">
        <div className="url-input-wrapper">
          <Link size={18} className="input-icon" />
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button 
          onClick={handleImport} 
          disabled={isLoading || !url.trim()}
          className={`import-btn ${isLoading ? 'loading' : ''} ${accessToken ? 'secure' : ''}`}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : (accessToken ? 'Importar Seguro' : 'Importar')}
        </button>
      </div>

      {error && (
        <div className="gsheets-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="gsheets-success">
          <CheckCircle2 size={16} />
          <span>Dados importados com sucesso!</span>
        </div>
      )}

      <div className="gsheets-help">
        <h4>Como publicar sua planilha:</h4>
        <ol>
          <li>No Google Sheets: <strong>Arquivo</strong> &gt; <strong>Compartilhar</strong> &gt; <strong>Publicar na Web</strong></li>
          <li>Escolha <strong>Valores separados por vírgula (.csv)</strong></li>
          <li>Clique em <strong>Publicar</strong> e cole o link aqui.</li>
        </ol>
      </div>
    </div>
  );
}
