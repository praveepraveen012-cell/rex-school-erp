$src = "C:\Users\prave\.gemini\antigravity-ide\scratch\rex_school_erp_flutter"
$dest = "C:\Users\prave\OneDrive\Desktop\rex_school_erp_source_code.zip"
$tmp = "C:\Users\prave\.gemini\antigravity-ide\scratch\zip_staging"

if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null

Copy-Item (Join-Path $src "lib") (Join-Path $tmp "lib") -Recurse
Copy-Item (Join-Path $src "assets") (Join-Path $tmp "assets") -Recurse
Copy-Item (Join-Path $src "android") (Join-Path $tmp "android") -Recurse
Copy-Item (Join-Path $src "web") (Join-Path $tmp "web") -Recurse
Copy-Item (Join-Path $src "pubspec.yaml") (Join-Path $tmp "pubspec.yaml")
Copy-Item (Join-Path $src "README.md") (Join-Path $tmp "README.md")
Copy-Item (Join-Path $src ".github") (Join-Path $tmp ".github") -Recurse

if (Test-Path $dest) { Remove-Item -Force $dest }
Compress-Archive -Path "$tmp\*" -DestinationPath $dest -Force
Remove-Item -Recurse -Force $tmp
Write-Host "Desktop zip successfully updated! Size:" (Get-Item $dest).Length "bytes"
