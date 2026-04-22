import { useState, useRef } from 'react'
import { Upload, FileCheck, AlertCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import './CSVUploader.css'

interface OnboardingData {
  companyName?: string
  industry?: string
  dataSource?: string
  goals?: string[]
  specificQuestions?: string
  contact?: string
}

interface CSVUploaderProps {
  onFileUploaded: (data: any[], headers: string[], fileName?: string, fileContent?: string) => void
  onboardingData?: OnboardingData
}

// Mapeamento de indústria para modelo CSV
const getModeloCSV = (industry: string): string | null => {
  const mapping: Record<string, string> = {
    'E-commerce': 'ecommerce',
    'Saúde': 'saude',
    'Financeiro': 'financeiro',
    'Educação': 'educacao',
    'Tecnologia': 'vendas',
    'Varejo': 'vendas',
    'Manufatura': 'vendas',
    'Outro': 'outro'
  }
  return mapping[industry] || null
}

// Mapeamento de fonte de dados para modelo CSV
const getModeloCSVByDataSource = (dataSource: string): string | null => {
  const mapping: Record<string, string> = {
    'Vendas': 'vendas',
    'Marketing': 'marketing',
    'Recursos Humanos': 'rh',
    'Financeiro': 'financeiro',
    'Clientes': 'ecommerce',
    'Outro': 'outro'
  }
  return mapping[dataSource] || null
}

export default function CSVUploader({ onFileUploaded, onboardingData }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    const isCsv = file.name.endsWith('.csv')
    const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx')

    if (!isCsv && !isExcel) {
      setError('Por favor, envie apenas arquivos CSV ou Excel (.xls, .xlsx)')
      return
    }

    setIsProcessing(true)
    setError('')

    // Tentar ler o conteúdo como texto para o caso de CSV (para histórico/salvamento)
    let fileContent = ''
    if (isCsv) {
      try {
        fileContent = await file.text()
      } catch (error) {
        console.warn('⚠️ Não foi possível ler o conteúdo do arquivo:', error)
      }
    }

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('Erro ao processar o arquivo CSV. Verifique o formato.')
            setIsProcessing(false)
            return
          }

          const data = results.data as any[]
          const headers = results.meta.fields || []

          if (data.length === 0) {
            setError('O arquivo CSV está vazio')
            setIsProcessing(false)
            return
          }

          setTimeout(() => {
            onFileUploaded(data, headers, file.name, fileContent)
            setIsProcessing(false)
          }, 1500)
        },
        error: (error) => {
          setError('Erro ao ler o arquivo CSV: ' + error.message)
          setIsProcessing(false)
        }
      })
    } else if (isExcel) {
      try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        
        // Pega a primeira planilha
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Lê como array 2D para inspecionar a estrutura
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        // Heurística para detectar o "Relatório Financeiro do Clube" (que é todo desestruturado)
        const isRelatorioBaguncado = rawData.slice(0, 20).some(row => {
          if (!row) return false;
          const rowStr = row.join(' ').toLowerCase();
          return rowStr.includes('tempo atraso') || 
                 rowStr.includes('categoria associado') ||
                 rowStr.includes('parcelas em atraso');
        });

        let data: any[] = [];
        let headers: string[] = [];

        if (isRelatorioBaguncado) {
          console.log('Detectado relatório financeiro desestruturado. Limpando dados...');
          headers = ["Número", "Nome", "Categoria Associado", "Tempo Atraso", "Parcelas em atraso", "Data", "Total"];
          
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length < 5) continue;
            
            // Baseado na estrutura do XLS analisado
            const numero = row[2];
            const nome = row[4];
            
            if (numero && nome && String(numero).trim() !== 'Número' && String(nome).trim() !== 'Nome') {
              data.push({
                "Número": String(numero).trim(),
                "Nome": String(nome).trim(),
                "Categoria Associado": row[13] || '',
                "Tempo Atraso": row[14] || '',
                "Parcelas em atraso": row[19] || '',
                "Data": row[23] || '',
                "Total": row[28] || 0
              });
            }
          }
        } else {
          // Converte para JSON padrão (array de objetos) se for uma planilha normal
          data = XLSX.utils.sheet_to_json(worksheet) as any[];
          if (data.length > 0) {
            headers = Object.keys(data[0]);
          }
        }
        
        if (data.length === 0) {
          setError('A planilha Excel está vazia ou não possui dados reconhecíveis')
          setIsProcessing(false)
          return
        }

        // Opcional: Converter dados de volta para CSV como string para passar no fileContent se precisar
        const csvContent = isRelatorioBaguncado 
          ? Papa.unparse(data) // Gera um CSV limpo do relatório
          : XLSX.utils.sheet_to_csv(worksheet);

        setTimeout(() => {
          onFileUploaded(data, headers, file.name, csvContent)
          setIsProcessing(false)
        }, 1500)
      } catch (err: any) {
        setError('Erro ao ler a planilha Excel: ' + (err.message || 'Formato inválido'))
        setIsProcessing(false)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDownloadExample = async () => {
    // Determinar qual modelo CSV baixar baseado no onboarding
    let modelo = 'outro' // padrão
    
    if (onboardingData?.industry) {
      const modeloByIndustry = getModeloCSV(onboardingData.industry)
      if (modeloByIndustry) {
        modelo = modeloByIndustry
      }
    } else if (onboardingData?.dataSource) {
      const modeloByDataSource = getModeloCSVByDataSource(onboardingData.dataSource)
      if (modeloByDataSource) {
        modelo = modeloByDataSource
      }
    }
    
    // Baixar o arquivo CSV da pasta public/modelos
    try {
      const response = await fetch(`/modelos/${modelo}.csv`)
      if (!response.ok) {
        throw new Error('Arquivo não encontrado')
      }
      
      const csvContent = await response.text()
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      // Nome do arquivo baseado no modelo
      const nomeArquivo = onboardingData?.industry 
        ? `modelo-${onboardingData.industry.toLowerCase().replace(/\s+/g, '-')}.csv`
        : onboardingData?.dataSource
          ? `modelo-${onboardingData.dataSource.toLowerCase().replace(/\s+/g, '-')}.csv`
          : `modelo-${modelo}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', nomeArquivo)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar modelo CSV:', error)
      // Fallback para exemplo genérico
      const exampleCSV = `Produto,Categoria,Vendas,Data,Região
Notebook,Electrônicos,15000,2024-01-15,Sudeste
Smartphone,Electrônicos,25000,2024-01-16,Nordeste
Tablet,Electrônicos,8000,2024-01-17,Sul
Mouse,Periféricos,5000,2024-01-18,Sudeste
Teclado,Periféricos,6000,2024-01-19,Norte`

      const blob = new Blob(['\uFEFF' + exampleCSV], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', 'exemplo-dados.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="csv-uploader">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {isProcessing ? (
          <>
            <div className="spinner"></div>
            <p>Processando arquivo com Lupa Analytics AI...</p>
          </>
        ) : (
          <>
            <Upload size={48} className="upload-icon" />
            <p className="upload-text">
              <strong>Clique aqui</strong> ou arraste uma planilha
            </p>
            <p className="upload-hint">Formatos suportados: .csv, .xls, .xlsx</p>
          </>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!isProcessing && (
        <>
          <div className="upload-info">
            <FileCheck size={16} />
            <span>Seus dados serão processados de forma segura e privada</span>
          </div>
          <button 
            type="button"
            className="download-example-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleDownloadExample()
            }}
          >
            <Download size={18} />
            {onboardingData?.industry 
              ? `Baixar modelo CSV para ${onboardingData.industry}`
              : onboardingData?.dataSource
                ? `Baixar modelo CSV para ${onboardingData.dataSource}`
                : 'Baixar exemplo CSV'}
          </button>
        </>
      )}
    </div>
  )
}
