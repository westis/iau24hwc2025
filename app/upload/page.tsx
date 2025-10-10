'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Runner } from '@/types/runner'
import { RunnerTable } from '@/components/tables/runner-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [runners, setRunners] = React.useState<Runner[]>([])
  const [isParsing, setIsParsing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load runners from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('runners')
    if (stored) {
      try {
        const parsedRunners = JSON.parse(stored) as Runner[]
        setRunners(parsedRunners)
      } catch (error) {
        console.error('Error loading runners from localStorage:', error)
      }
    }
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a valid PDF file')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') {
        setError('Please select a valid PDF file')
        setFile(null)
        return
      }
      setFile(droppedFile)
      setError(null)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleUploadAndParse = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsParsing(true)
    setError(null)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)

      // Call API
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse PDF')
      }

      const data = await response.json()
      const parsedRunners = data.runners as Runner[]

      // Save to state and localStorage
      setRunners(parsedRunners)
      localStorage.setItem('runners', JSON.stringify(parsedRunners))

      // Clear file input
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to parse PDF')
    } finally {
      setIsParsing(false)
    }
  }

  const handleStartMatching = () => {
    if (runners.length === 0) {
      setError('No runners to match. Please upload a PDF first.')
      return
    }
    router.push('/matching')
  }

  const handleManualMatch = (runner: Runner) => {
    // Not used on upload page
    console.log('Manual match:', runner)
  }

  const handleRowClick = (runnerId: number) => {
    router.push(`/runners/${runnerId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">IAU 24h World Championships 2025</h1>
          <p className="text-xl text-muted-foreground">Runner Analytics Platform</p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Entry List
            </CardTitle>
            <CardDescription>
              Upload the PDF entry list to extract runner information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-muted-foreground transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Drop PDF here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts .pdf files only
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleUploadAndParse}
                disabled={!file || isParsing}
                className="flex-1"
                size="lg"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing PDF...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Parse
                  </>
                )}
              </Button>

              {runners.length > 0 && (
                <Button
                  onClick={handleStartMatching}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Start Matching ({runners.length} runners)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Runners Table */}
        {runners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parsed Runners ({runners.length})</CardTitle>
              <CardDescription>
                Review the extracted runner data before matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RunnerTable
                runners={runners}
                metric="last-3-years"
                onManualMatch={handleManualMatch}
                onRowClick={handleRowClick}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
