// scripts/verify-supabase.ts
// Verify data was imported correctly into Supabase

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') })

async function verify() {
  console.log('🔍 Verifying Supabase data...\n')

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set!')
  }

  const pg = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    // Check connection
    await pg.query('SELECT NOW()')
    console.log('✅ Connected to Supabase!\n')

    // Check runners
    const runnersResult = await pg.query('SELECT COUNT(*) FROM runners')
    const runnersCount = parseInt(runnersResult.rows[0].count)
    console.log(`👥 Runners: ${runnersCount} ${runnersCount === 397 ? '✅' : '❌ Expected 397'}`)

    // Check performances
    const performancesResult = await pg.query('SELECT COUNT(*) FROM performances')
    const performancesCount = parseInt(performancesResult.rows[0].count)
    console.log(`🏃 Performances: ${performancesCount} ${performancesCount === 14248 ? '✅' : '❌ Expected 14248'}`)

    // Check match_candidates
    const candidatesResult = await pg.query('SELECT COUNT(*) FROM match_candidates')
    const candidatesCount = parseInt(candidatesResult.rows[0].count)
    console.log(`🔍 Match Candidates: ${candidatesCount} ${candidatesCount === 765 ? '✅' : '❌ Expected 765'}`)

    // Check teams
    const teamsResult = await pg.query('SELECT COUNT(*) FROM teams')
    const teamsCount = parseInt(teamsResult.rows[0].count)
    console.log(`🏆 Teams: ${teamsCount} ${teamsCount === 174 ? '✅' : '❌ Expected 174'}`)

    // Sample a few runners
    console.log('\n📋 Sample runners:')
    const sampleRunners = await pg.query('SELECT entry_id, firstname, lastname, nationality, gender, dns FROM runners LIMIT 5')
    sampleRunners.rows.forEach(r => {
      console.log(`   - ${r.entry_id}: ${r.firstname} ${r.lastname} (${r.nationality}/${r.gender}) DNS: ${r.dns}`)
    })

    const allGood =
      runnersCount === 397 &&
      performancesCount === 14248 &&
      candidatesCount === 765 &&
      teamsCount === 174

    if (allGood) {
      console.log('\n🎉 All data verified successfully!')
    } else {
      console.log('\n⚠️  Some counts don\'t match - you may need to re-import some files')
    }

  } catch (error) {
    console.error('❌ Verification failed:', error)
    throw error
  } finally {
    await pg.end()
  }
}

verify().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
