import { Shield, Lock, EyeOff, Server, Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Legal.css'

export default function SecurityStatement() {
  const navigate = useNavigate()

  return (
    <div className="legal-container">
      <header className="legal-header">
        <div className="legal-header-content">
          <h1>Políticas de Segurança e Dados</h1>
          <p>Como a Lupa Analytics AI protege suas informações</p>
          <button onClick={() => navigate(-1)} className="back-btn">Voltar</button>
        </div>
      </header>

      <main className="legal-content">
        <section className="security-hero">
          <div className="hero-icon">
            <Shield size={64} />
          </div>
          <h2>Sua segurança é nossa prioridade absoluta.</h2>
          <p>
            Desenvolvemos a Lupa Analytics AI com uma arquitetura de "Privacidade por Design", 
            garantindo que seus dados sensíveis sejam processados com o mais alto rigor técnico.
          </p>
        </section>

        <div className="security-grid">
          <div className="security-card">
            <Lock className="card-icon" />
            <h3>Processamento Efêmero</h3>
            <p>
              Os dados de suas planilhas CSV não são armazenados de forma persistente em nossos servidores de banco de dados. 
              O processamento ocorre na memória durante a sessão de análise.
            </p>
          </div>

          <div className="security-card">
            <EyeOff className="card-icon" />
            <h3>Isolamento de Dados</h3>
            <p>
              Utilizamos a infraestrutura da Groq Cloud para o processamento de IA. Seguimos as políticas de conformidade da Groq, 
              que garantem que seus dados não são utilizados para treinamento de modelos globais.
            </p>
          </div>

          <div className="security-card">
            <Server className="card-icon" />
            <h3>Criptografia de Ponta</h3>
            <p>
              Toda comunicação entre seu navegador e nossos serviços é protegida por protocolos TLS/SSL de 256 bits, 
              garantindo que ninguém possa interceptar suas informações.
            </p>
          </div>

          <div className="security-card">
            <Database className="card-icon" />
            <h3>Conformidade LGPD</h3>
            <p>
              Estamos alinhados com a Lei Geral de Proteção de Dados (Brasil). Você tem controle total sobre seus dados e pode 
              solicitar a exclusão de sua conta e metadados a qualquer momento.
            </p>
          </div>
        </div>

        <section className="legal-text-section">
          <h2>Perguntas Frequentes sobre Segurança</h2>
          
          <div className="faq-item">
            <h4>A Lupa AI lê meus dados bancários?</h4>
            <p>A Lupa AI apenas processa os arquivos que VOCÊ faz upload. Não temos acesso direto às suas contas bancárias ou sistemas externos, a menos que você configure uma integração específica.</p>
          </div>

          <div className="faq-item">
            <h4>Meus dados são usados para treinar a IA?</h4>
            <p>Não. Utilizamos modelos através de APIs profissionais (Groq/Meta) que possuem cláusulas de privacidade que impedem o uso de dados de clientes para treinamento de modelos base.</p>
          </div>

          <div className="faq-item">
            <h4>Onde os dados ficam guardados?</h4>
            <p>Apenas metadados de conta (nome, email, empresa) são salvos no Google Firebase (USA). O conteúdo das planilhas é processado e descartado após a análise.</p>
          </div>
        </section>

        <footer className="legal-footer">
          <p>&copy; 2026 Lupa Analytics AI - Desenvolvido por FTWagner</p>
          <p>Versão 1.1 - Última atualização: 30 de Abril de 2026</p>
        </footer>
      </main>
    </div>
  )
}
