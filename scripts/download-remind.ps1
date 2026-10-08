# Downloads the pre-operative MRI study of one ReMIND patient from TCIA's public web API
# into data/remind/<PatientID>/preop (gitignored). No extra software needed.
# Run from the repo root:  .\scripts\download-remind.ps1 -PatientID ReMIND-001
param([Parameter(Mandatory = $true)][string]$PatientID)

$ErrorActionPreference = 'Stop'
$api = 'https://services.cancerimagingarchive.net/nbia-api/services/v1'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "data\remind\$PatientID\preop"

# Assign first: Windows PowerShell passes the whole reply down a pipeline as ONE object,
# which would make the filter below let every series through.
$all = Invoke-RestMethod "$api/getSeries?Collection=ReMIND&PatientID=$PatientID" -TimeoutSec 120
$series = @($all | Where-Object {
  $_.PatientID -eq $PatientID -and $_.StudyDesc -eq 'Preop' -and $_.Modality -eq 'MR'
})
if ($series.Count -eq 0) { throw "No pre-op MR series found for $PatientID" }
Write-Host "$PatientID pre-op MR: $($series.Count) series"

if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force $out | Out-Null

foreach ($s in $series) {
  $name = '{0:00}_{1}' -f [int]$s.SeriesNumber, ($s.SeriesDescription -replace '[^A-Za-z0-9_]', '_')
  $zip = Join-Path $out "$name.zip"
  $done = $false
  foreach ($attempt in 1..4) {
    try {
      Invoke-WebRequest "$api/getImage?SeriesInstanceUID=$($s.SeriesInstanceUID)" -OutFile $zip -UseBasicParsing -TimeoutSec 900
      Expand-Archive $zip (Join-Path $out $name) -Force
      $done = $true
      break
    } catch {
      Write-Host "  attempt $attempt failed for ${name}: $($_.Exception.Message)"
      Start-Sleep -Seconds 5
    }
  }
  if (Test-Path $zip) { Remove-Item $zip }
  if (-not $done) { throw "Could not download series $name" }

  $files = @(Get-ChildItem (Join-Path $out $name) -Filter *.dcm)
  if ($files.Count -ne [int]$s.ImageCount) {
    throw "Series $name has $($files.Count) files, expected $($s.ImageCount)"
  }
  Write-Host ("{0}: {1} images, {2:N1} MB" -f $name, $files.Count, (($files | Measure-Object Length -Sum).Sum / 1MB))
}
