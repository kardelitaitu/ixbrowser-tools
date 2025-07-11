# Replace with actual 30 profile IDs
$profileIDs = @("id1", "id2", "id3", "id4", ..., "id30")
$apiURL = "http://127.0.0.1:XXXX/api/browser/open"

foreach ($id in $profileIDs) {
    $body = @{ profile_id = $id } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Uri $apiURL -Method Post -Body $body -ContentType "application/json"
        Write-Host "Launched Profile ID: $id"
        Start-Sleep -Milliseconds 300  # Optional delay
    } catch {
        Write-Warning "Failed to launch $id: $_"
    }
}
