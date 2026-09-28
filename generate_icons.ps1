Add-Type -AssemblyName System.Drawing

$baseDir = Get-Location
$logoPath = Join-Path $baseDir "assets\logo.png"

if (-not (Test-Path $logoPath)) {
    Write-Error "logo.png not found"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($logoPath)
Write-Host "Loaded logo: $($src.Width) x $($src.Height)"

# Exact bounding box of the Christus Rex emblem in assets/logo.png:
# X: 12 to 122 (W = 111), Y: 5 to 71 (H = 67)
$srcX = 12
$srcY = 5
$emblemW = 111
$emblemH = 67

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
    "store" = 512
}

foreach ($name in $sizes.Keys) {
    $dim = $sizes[$name]
    $bmp = New-Object System.Drawing.Bitmap $dim, $dim
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Draw an elegant gold circular ring with safety margin
    $borderW = [float][Math]::Max(1.5, [double]$dim / 28.0)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(218, 165, 32)), $borderW
    $inset = [float]($borderW / 2.0 + 1.0)
    $g.DrawEllipse($pen, $inset, $inset, [float]($dim - ($inset * 2)), [float]($dim - ($inset * 2)))
    $pen.Dispose()

    # Scale emblem to 62% of the icon diameter so it stays safely within circular/squircle masks
    $drawW = [int]($dim * 0.62)
    $drawH = [int]($drawW * ($emblemH / $emblemW))
    $drawX = [int](($dim - $drawW) / 2)
    $drawY = [int](($dim - $drawH) / 2)

    $srcRect = New-Object System.Drawing.Rectangle $srcX, $srcY, $emblemW, $emblemH
    $destRect = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawW, $drawH
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    if ($name -eq "store") {
        $outPath = Join-Path $baseDir "assets\app_icon_512.png"
    } else {
        $dir = Join-Path $baseDir "android\app\src\main\res\$name"
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $outPath = Join-Path $dir "ic_launcher.png"
        $roundPath = Join-Path $dir "ic_launcher_round.png"
        $bmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $outPath ($dim x $dim)"
}

# Also generate a crisp, centered assets/rex_emblem.png (256x256) for in-app crests
$embDim = 256
$embBmp = New-Object System.Drawing.Bitmap $embDim, $embDim
$gEmb = [System.Drawing.Graphics]::FromImage($embBmp)
$gEmb.Clear([System.Drawing.Color]::Transparent)
$gEmb.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gEmb.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gEmb.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Size emblem to 75% of canvas with equal padding on all sides
$drawW = [int]($embDim * 0.75)
$drawH = [int]($drawW * ($emblemH / $emblemW))
$drawX = [int](($embDim - $drawW) / 2)
$drawY = [int](($embDim - $drawH) / 2)

$srcRect = New-Object System.Drawing.Rectangle $srcX, $srcY, $emblemW, $emblemH
$destRect = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawW, $drawH
$gEmb.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$gEmb.Dispose()

$emblemOut = Join-Path $baseDir "assets\rex_emblem.png"
$embBmp.Save($emblemOut, [System.Drawing.Imaging.ImageFormat]::Png)
$embBmp.Dispose()
Write-Host "Created centered: $emblemOut"

$src.Dispose()
Write-Host "All icons & emblem generated with full visibility and zero clipping!"
