# Backend Services Implementation Notes

## Overview
This document details the implementation of the IAU 24h World Championships backend services, including PDF parsing, DUV API integration, and auto-matching algorithms.

## Files Created

### PDF Parser (Python + Dockling)
- **`lib/pdf/parse-entry-list.py`** - Main PDF parser using Dockling library
- **`lib/pdf/requirements.txt`** - Python dependencies (docling>=2.17.0)
- **`lib/pdf/test-parser.py`** - Test script for parser validation

### DUV API Client (TypeScript)
- **`lib/api/duv-client.ts`** - Rate-limited DUV API client
- **`lib/api/test-duv-client.ts`** - Test script demonstrating API usage

### Auto-Matching Algorithm (TypeScript)
- **`lib/matching/matcher.ts`** - Auto-matching algorithm with confidence scoring
- **`lib/matching/test-matcher.ts`** - Test script with mock data

## NPM Packages Installed
- **bottleneck@2.19.5** - Rate limiting for API requests (1 req/sec)

## Implementation Details

### 1. PDF Parser (`lib/pdf/parse-entry-list.py`)

#### Features
- Uses Dockling library for robust PDF parsing
- Handles tables, multi-column layouts, and various PDF formats
- Supports flexible column name matching (multilingual: English, German, French)
- Normalizes data to match Runner type structure
- Outputs JSON array to stdout

#### Edge Cases Handled
1. **Missing Fields**: Generates entry IDs if missing, validates required fields
2. **Format Variations**:
   - Gender normalization: M/Male/Men → 'M', W/F/Female/Women → 'W'
   - Nationality mapping: US→USA, GB/UK→GBR, DE→DEU, etc.
   - Name normalization: Titlecase, trimming whitespace
3. **Duplicate Entries**: Removes duplicates by entryId
4. **Table Extraction Failure**: Falls back to regex-based text extraction
5. **Encoding Issues**: Handles non-ASCII characters properly

#### Usage
```bash
# Install dependencies
pip install -r lib/pdf/requirements.txt

# Parse PDF
python lib/pdf/parse-entry-list.py entry-list.pdf > runners.json

# Test parser structure
python lib/pdf/test-parser.py
```

#### Output Format
```json
[
  {
    "entryId": "1",
    "firstname": "John",
    "lastname": "Smith",
    "nationality": "USA",
    "gender": "M"
  }
]
```

### 2. DUV API Client (`lib/api/duv-client.ts`)

#### Features
- Rate-limited to 1 request/second using Bottleneck
- Two main functions:
  1. `searchRunners(lastname, firstname, gender)` - Search by name
  2. `getRunnerProfile(personId)` - Fetch detailed profile
- Custom error handling with `DUVApiError` class
- Batch operations: `batchSearchRunners()`, `batchGetRunnerProfiles()`

#### Edge Cases Handled
1. **Network Errors**: Wrapped in try-catch with descriptive error messages
2. **Invalid Response Format**: Validates response structure, provides defaults
3. **404 Errors**: Specific handling for runner not found
4. **Rate Limiting**: Automatic queuing via Bottleneck (1 req/sec)
5. **Empty Results**: Returns empty array instead of throwing error
6. **JSON Parsing Errors**: Catches and wraps in DUVApiError

#### Rate Limiting Implementation
```typescript
const limiter = new Bottleneck({
  minTime: 1000,    // 1 request per second
  maxConcurrent: 1, // One request at a time
})

export const searchRunners = limiter.wrap(async (...) => { ... })
```

#### Usage
```typescript
import { searchRunners, getRunnerProfile } from '@/lib/api/duv-client'

// Search for runner
const results = await searchRunners('Smith', 'John', 'M')

// Get profile
const profile = await getRunnerProfile(12345)

// Batch search (automatically rate-limited)
const results = await batchSearchRunners([
  { lastname: 'Smith', firstname: 'John', gender: 'M' },
  { lastname: 'Doe', firstname: 'Jane', gender: 'W' },
])
```

### 3. Auto-Matching Algorithm (`lib/matching/matcher.ts`)

#### Confidence Scoring System
- **Exact lastname match**: +0.4 (40%)
- **Exact firstname match**: +0.3 (30%)
- **Nation match**: +0.2 (20%)
- **Gender match**: +0.1 (10%)
- **Auto-match threshold**: ≥0.8 (80%)

#### Algorithm Flow
1. Search DUV API with runner's name and gender
2. Score each candidate (0-1 confidence)
3. Auto-match if top candidate ≥ 0.8 confidence
4. Otherwise, return candidates for manual review

#### Edge Cases Handled
1. **Multiple Exact Matches**: Returns all with scores, highest first
2. **No Results**: Returns empty candidates array, no error
3. **API Errors**: Catches DUVApiError, returns empty candidates
4. **Nationality Variations**: Normalizes codes (GBR/UK/GB → GBR, USA/US → USA)
5. **Name Variations**: Case-insensitive, accent-insensitive comparison
6. **Below Threshold**: Returns candidates for manual review instead of auto-matching

#### String Normalization
```typescript
// Normalizes for comparison: lowercase, removes accents, trims
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim()
}
```

#### Usage
```typescript
import { autoMatchRunner, batchAutoMatchRunners, getMatchingStats } from '@/lib/matching/matcher'

// Auto-match single runner
const result = await autoMatchRunner(runner)
if (result.selectedDuvId) {
  console.log(`Auto-matched to DUV ID: ${result.selectedDuvId}`)
} else {
  console.log(`Manual review needed (${result.candidates.length} candidates)`)
}

// Batch auto-match
const results = await batchAutoMatchRunners(runners)

// Get statistics
const stats = getMatchingStats(results)
console.log(`Auto-matched: ${stats.autoMatched}/${stats.total}`)
```

## Validation Results

### TypeScript Type Check
```bash
npm run type-check
# ✓ All types compile successfully
```

### PDF Parser Test
```bash
python lib/pdf/test-parser.py
# [PASS] JSON output structure validation passed
# [PASS] All normalization tests passed
# [SUCCESS] All tests passed!
```

### Integration
- All imports resolve correctly
- Types match existing definitions in `types/` and `lib/api/types.ts`
- No conflicts with Next.js 15.5.4 or React 19

## Gotchas and Best Practices

### PDF Parser
- **Dockling Installation**: Requires Python 3.9+ and pip
- **PDF Format Variations**: Parser handles tables and text, but may need adjustment for specific formats
- **Encoding**: Always use UTF-8 for JSON output (handled automatically)

### DUV API Client
- **Rate Limiting**: CRITICAL - Do not bypass the limiter or make direct fetch calls
- **API Availability**: DUV API may have downtime; handle errors gracefully
- **Batch Operations**: Process large batches in chunks to avoid memory issues

### Auto-Matching Algorithm
- **Confidence Threshold**: 0.8 is conservative; adjust based on accuracy needs
- **Manual Review**: Always provide UI for manual review of below-threshold matches
- **Nationality Codes**: Extend mapping in `normalizeNationality()` as needed
- **Multiple Matches**: Even with 1.0 confidence, verify before final storage

## Next Steps

1. **Create API Routes** (Next.js App Router):
   ```typescript
   // app/api/parse-pdf/route.ts
   // app/api/match-runners/route.ts
   ```

2. **Create UI Components**:
   - PDF upload form
   - Match review interface
   - Confidence score visualization

3. **Database Integration**:
   - Store matched runners
   - Track manual overrides
   - Performance history

4. **Error Monitoring**:
   - Log API failures
   - Track matching accuracy
   - Monitor rate limits

## Testing

### Manual Testing
```bash
# Test DUV API client (requires internet)
npx tsx lib/api/test-duv-client.ts

# Test matching algorithm (mock data)
npx tsx lib/matching/test-matcher.ts

# Test PDF parser (requires Python + docling)
python lib/pdf/test-parser.py
python lib/pdf/parse-entry-list.py <path-to-pdf>
```

### Integration Testing
Create integration tests that:
1. Parse sample PDF
2. Match runners via API
3. Validate confidence scores
4. Test error scenarios

## Performance Considerations

### Rate Limiting
- DUV API: 1 req/sec (enforced by Bottleneck)
- For 100 runners: ~100 seconds (~1.7 minutes)
- Consider background job for large batches

### Optimization Strategies
1. **Caching**: Cache DUV search results by name
2. **Parallel Processing**: Use worker threads for PDF parsing
3. **Incremental Matching**: Match in batches, save progress
4. **Smart Retries**: Exponential backoff for API failures

## Error Scenarios

### PDF Parser
- **File not found**: Exits with error code 1
- **Invalid PDF**: Catches exception, logs to stderr
- **No data extracted**: Returns empty array

### DUV API Client
- **Network error**: Throws DUVApiError with details
- **404 Runner**: Throws DUVApiError with 404 status
- **Invalid JSON**: Throws DUVApiError for parsing errors

### Auto-Matching
- **API failure**: Returns empty candidates, logs error
- **No matches**: Returns MatchCandidate with empty candidates array
- **Unexpected error**: Re-throws for debugging
