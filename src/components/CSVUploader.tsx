import { useState, useRef } from 'react'
import { Upload, FileCheck, AlertCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
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
  onFileUploaded: (data: any[], headers: string[]) => void
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

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Por favor, envie apenas arquivos CSV')
      return
    }

    setIsProcessing(true)
    setError('')

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

        // Simular processamento
        setTimeout(() => {
          onFileUploaded(data, headers)
          setIsProcessing(false)
        }, 1500)
      },
      error: (error) => {
        setError('Erro ao ler o arquivo: ' + error.message)
        setIsProcessing(false)
      }
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
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
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {isProcessing ? (
          <>
            <div className="spinner"></div>
            <p>Processando arquivo com Farol 360...</p>
          </>
        ) : (
          <>
            <Upload size={48} className="upload-icon" />
            <p className="upload-text">
              <strong>Clique aqui</strong> ou arraste um arquivo CSV
            </p>
            <p className="upload-hint">Formatos suportados: .csv</p>
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
