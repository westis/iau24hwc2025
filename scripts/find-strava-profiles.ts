#!/usr/bin/env tsx
// scripts/find-strava-profiles.ts - Helper to find and add Strava profiles

import { config } from 'dotenv'
import { resolve } from 'path'
import * as readline from 'readline'

config({ path: resolve(process.cwd(), '.env.local') })

import { getDatabase } from '../lib/db/database'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  const db = getDatabase()

  console.log('Loading runners from database...\n')
  const result = await db.query(`
    SELECT id, entry_id, firstname, lastname, nationality, duv_id, strava_url
    FROM runners
    ORDER BY entry_id
  `)

  const runners = result.rows
  console.log(`Found ${runners.length} runners\n`)

  // Filter options
  const filter = process.argv[2] || 'missing'

  let runnersToProcess = runners
  if (filter === 'missing') {
    runnersToProcess = runners.filter((r: any) => !r.strava_url)
    console.log(`Showing ${runnersToProcess.length} runners without Strava links\n`)
  }

  console.log('Instructions:')
  console.log('- Enter Strava URL (e.g., https://www.strava.com/athletes/12345)')
  console.log('- Press Enter to skip')
  console.log('- Type "quit" to exit\n')
  console.log('Tip: Google search opens automatically for each runner\n')

  for (const runner of runnersToProcess) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`${runner.firstname} ${runner.lastname} (${runner.nationality})`)
    console.log(`Entry ID: ${runner.entry_id} | DUV ID: ${runner.duv_id || 'N/A'}`)

    // Build Google search URL
    const searchQuery = encodeURIComponent(`${runner.firstname} ${runner.lastname} strava ultrarunning`)
    const googleUrl = `https://www.google.com/search?q=${searchQuery}`

    console.log(`\nGoogle search: ${googleUrl}`)
    console.log(`(Open this URL in your browser to find their Strava profile)\n`)

    const answer = await question('Strava URL (or Enter to skip, "quit" to exit): ')

    if (answer.toLowerCase() === 'quit') {
      console.log('\nExiting...')
      break
    }

    if (answer.trim() && answer.includes('strava.com')) {
      try {
        await db.query(
          'UPDATE runners SET strava_url = $1 WHERE id = $2',
          [answer.trim(), runner.id]
        )
        console.log('✓ Updated!')
      } catch (error) {
        console.error('✗ Error updating:', error)
      }
    } else if (answer.trim()) {
      console.log('⚠ Invalid URL (must contain strava.com)')
    } else {
      console.log('⊘ Skipped')
    }
  }

  rl.close()
  console.log('\n\nDone!')
  process.exit(0)
}

main().catch(console.error)
