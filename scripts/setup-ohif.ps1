# Downloads the prebuilt OHIF Viewer v3 into tools/ohif (gitignored) and applies
# our local server settings. Run from the repo root:  .\scripts\setup-ohif.ps1
$ErrorActionPreference = 'Stop'
$version = '3.13.12'
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'tools\ohif'

if (Test-Path $target) { Remove-Item -Recurse -Force $target }
New-Item -ItemType Directory -Force $target | Out-Null

Push-Location $target
try {
  npm pack "@ohif/app@$version" --silent
  tar -xzf "ohif-app-$version.tgz"
  Remove-Item "ohif-app-$version.tgz"
} finally {
  Pop-Location
}

Copy-Item (Join-Path $root 'viewer\serve.json') (Join-Path $target 'package\dist\serve.json')
Copy-Item (Join-Path $root 'viewer\app-config.js') (Join-Path $target 'package\dist\app-config.js') -Force
Write-Host "OHIF $version ready. Start it with:  npx serve tools/ohif/package/dist -l 3000"
