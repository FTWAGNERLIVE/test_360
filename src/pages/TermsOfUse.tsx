import { useNavigate } from 'react-router-dom'
import './Legal.css'

export default function TermsOfUse() {
  const navigate = useNavigate()

  return (
    <div className="legal-container">
      <header className="legal-header">
        <div className="legal-header-content">
          <h1>Termos de Uso</h1>
          <p>Regras e diretrizes para utilização da Lupa Analytics AI</p>
          <button onClick={() => navigate(-1)} className="back-btn">Voltar</button>
        </div>
      </header>

      <main className="legal-content">
        <section className="legal-text-section">
          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar a plataforma Lupa Analytics AI, você concorda em cumprir e estar vinculado aos seguintes Termos de Uso. 
            Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
          </p>

          <h2>2. Descrição do Serviço</h2>
          <p>
            A Lupa Analytics AI é uma ferramenta de Business Intelligence baseada em Inteligência Artificial que processa arquivos de dados (CSV) 
            fornecidos pelo usuário para gerar visualizações, métricas e insights automáticos.
          </p>

          <h2>3. Responsabilidade pelos Dados</h2>
          <p>
            O usuário é o único responsável pela veracidade, legalidade e integridade dos dados carregados na plataforma. 
            A Lupa Analytics AI não realiza auditoria nos dados fornecidos e não se responsabiliza por conclusões baseadas em dados incorretos ou parciais.
          </p>

          <h2>4. Uso da Inteligência Artificial</h2>
          <p>
            Você reconhece que os "insights" e sugestões gerados pela plataforma são fruto de modelos de processamento de linguagem natural e análise estatística. 
            <strong>A Inteligência Artificial pode gerar informações imprecisas ou incompletas.</strong> Toda decisão de negócio baseada nos dados da plataforma 
            deve ser revisada e validada por um profissional humano qualificado.
          </p>

          <h2>5. Propriedade Intelectual</h2>
          <p>
            Todo o software, design, logotipos e algoritmos da Lupa Analytics AI são de propriedade exclusiva de seus desenvolvedores (FTWagner). 
            O uso da plataforma não concede ao usuário qualquer direito de propriedade sobre a tecnologia subjacente.
          </p>

          <h2>6. Limitação de Responsabilidade</h2>
          <p>
            Em nenhuma circunstância a Lupa Analytics AI será responsável por quaisquer danos diretos, indiretos, incidentais ou consequentes 
            (incluindo, sem limitação, lucros cessantes ou interrupção de negócios) decorrentes do uso ou da incapacidade de usar os serviços da plataforma.
          </p>

          <h2>7. Suspensão e Cancelamento</h2>
          <p>
            Reservamo-nos o direito de suspender ou encerrar o acesso de usuários que violem estes termos, tentem realizar engenharia reversa na plataforma 
            ou utilizem o serviço de forma abusiva que prejudique a estabilidade do sistema.
          </p>

          <h2>8. Alterações nos Termos</h2>
          <p>
            Estes termos podem ser atualizados periodicamente. Recomendamos a revisão regular desta página. O uso continuado da plataforma 
            após alterações constitui aceitação dos novos termos.
          </p>

          <h2>9. Contato</h2>
          <p>
            Para questões relacionadas a estes termos, entre em contato através do nosso canal de suporte integrado na plataforma.
          </p>
        </section>

        <footer className="legal-footer">
          <p>&copy; 2026 Lupa Analytics AI - Desenvolvido por FTWagner</p>
          <p>Última atualização: 29 de Abril de 2026</p>
        </footer>
      </main>
    </div>
  )
}
