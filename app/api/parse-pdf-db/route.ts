// app/api/parse-pdf-db/route.ts - Database-backed PDF parsing
import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { getRunners } from '@/lib/db/database'

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are accepted.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = new Date().getTime()
    tempFilePath = path.join(tmpdir(), `entry-list-${timestamp}.pdf`)
    await writeFile(tempFilePath, buffer)

    const scriptPath = path.join(process.cwd(), 'scripts', 'parse-pdf-backend.py')
    const dbPath = path.join(process.cwd(), 'data', 'iau24hwc.db')

    const python = spawn('python', [scriptPath, tempFilePath, '--db-path', dbPath])

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => { stdout += data.toString() })
    python.stderr.on('data', (data) => { stderr += data.toString() })

    const exitCode = await new Promise<number>((resolve) => {
      python.on('close', (code) => resolve(code || 0))
    })

    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {})
    }

    if (exitCode !== 0) {
      console.error('Python parser error:', stderr)
      return NextResponse.json(
        { error: 'Failed to parse PDF', details: stderr },
        { status: 500 }
      )
    }

    const runners = await getRunners()

    return NextResponse.json({
      success: true,
      runners,
      count: runners.length,
      log: stderr,
    })

  } catch (error) {
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {})
    }

    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
