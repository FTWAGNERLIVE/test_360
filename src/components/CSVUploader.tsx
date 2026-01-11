import { useState, useRef } from 'react'
import { Upload, FileCheck, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'
import './CSVUploader.css'

interface CSVUploaderProps {
  onFileUploaded: (data: any[], headers: string[]) => void
}

export default function CSVUploader({ onFileUploaded }: CSVUploaderProps) {
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
        <div className="upload-info">
          <FileCheck size={16} />
          <span>Seus dados serão processados de forma segura e privada</span>
        </div>
      )}
    </div>
  )
}
