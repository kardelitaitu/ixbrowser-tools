$apiURL = "http://127.0.0.1:XXXX/api/profiles"  # Update port if needed
$outputPath = "$PSScriptRoot\ixbrowser_profiles.txt"

$response = Invoke-RestMethod -Uri $apiURL -Method Get
$profiles = $response.data  # Adjust if your JSON structure is different

# Extract profile IDs and write to file
$profileIDs = $profiles | ForEach-Object { $_.id }
$profileIDs | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "Saved $($profileIDs.Count) profile IDs to $outputPath"
