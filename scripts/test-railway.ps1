param(
  [Parameter(Mandatory = $false)]
  [string]$WorkerUrl,

  [Parameter(Mandatory = $false)]
  [string]$ApiKey
)

$ErrorActionPreference = "Stop"

if (-not $WorkerUrl) { $WorkerUrl = $env:WORKER_URL }
if (-not $ApiKey) { $ApiKey = $env:RENDER_API_KEY }

if (-not $WorkerUrl -or -not $ApiKey) {
  Write-Host "Usage:"
  Write-Host "  .\scripts\test-railway.ps1 -WorkerUrl ""https://<your-railway-domain>"" -ApiKey ""<your-render-api-key>"""
  Write-Host ""
  Write-Host "Or set env vars and run without args:"
  Write-Host "  `$env:WORKER_URL=""https://<your-railway-domain>"""
  Write-Host "  `$env:RENDER_API_KEY=""<your-render-api-key>"""
  Write-Host "  .\scripts\test-railway.ps1"
  exit 2
}

if ($WorkerUrl.EndsWith("/")) {
  $WorkerUrl = $WorkerUrl.TrimEnd("/")
}

$endpoint = "$WorkerUrl/render-pdf"

$payload = @{
  html   = "<!doctype html><html><body><h1>hello</h1></body></html>"
  width  = "10in"
  height = "7.5in"
} | ConvertTo-Json -Compress

Write-Host "POST $endpoint"
Write-Host "x-api-key length: $($ApiKey.Length)"

# Write payload to a temp file (avoids PowerShell/curl quoting issues on Windows).
$tmp = Join-Path $env:TEMP ("expdf-payload-" + [guid]::NewGuid().ToString() + ".json")
[System.IO.File]::WriteAllText($tmp, $payload, (New-Object System.Text.UTF8Encoding($false)))

# Use curl.exe explicitly (PowerShell aliases `curl` to Invoke-WebRequest on Windows).
& curl.exe -i $endpoint `
  -X POST `
  -H "content-type: application/json" `
  -H "x-api-key: $ApiKey" `
  --data-binary "@$tmp"

Remove-Item $tmp -ErrorAction SilentlyContinue

