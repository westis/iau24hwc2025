# Backfill missing lap data for top 20 runners
# Run this once to populate historical lap times

$url = "https://iau24hwc2025.ultramarathon.se/api/admin/backfill-laps"

Write-Host "Starting lap backfill for top 20 runners..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "Authorization" = "Bearer $env:CRON_SECRET"
        "Content-Type" = "application/json"
    } -Body '{"topN":20}'

    Write-Host "`n✅ Backfill completed successfully!" -ForegroundColor Green
    Write-Host "`nRunners backfilled: $($response.runnersBackfilled)" -ForegroundColor Yellow
    Write-Host "Laps inserted: $($response.lapsInserted)" -ForegroundColor Yellow

    if ($response.runners) {
        Write-Host "`nDetails:" -ForegroundColor Cyan
        foreach ($runner in $response.runners) {
            Write-Host "  Bib $($runner.bib): $($runner.name) - Lap $($runner.currentLap) (was $($runner.previousMaxLap))"
        }
    }
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response
}
