import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '@/lib/axios'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'

export function ExcelImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const onDrop = (accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setError('')
      setResult(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      // In a real implementation we would have an endpoint for this. We will assume /api/v1/opportunities/admin/import/
      const res = await api.post('/opportunities/admin/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      setFile(null)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Import failed. Please prepare the API endpoint.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Excel Import</h1>
        <p className="text-muted-foreground mt-1">Bulk create opportunities from Excel files</p>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div {...getRootProps()} className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 bg-muted/20'}`}>
           <input {...getInputProps()} />
           <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
           <h3 className="text-lg font-medium mb-1">{file ? file.name : 'Upload Excel File'}</h3>
           <p className="text-sm text-muted-foreground">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drag and drop an .xlsx file here, or click to browse'}</p>
        </div>

        {error && <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
        
        {result && (
          <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center">
             <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
             <h3 className="text-lg font-bold text-emerald-800">Import Successful</h3>
             <p className="text-emerald-700">{result.created} created, {result.updated} updated.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={handleUpload} disabled={!file || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
            <Upload className="h-4 w-4" /> {loading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
