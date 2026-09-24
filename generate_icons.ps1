Add-Type -AssemblyName System.Drawing

$baseDir = Get-Location
$logoPath = Join-Path $baseDir "assets\logo.png"

if (-not (Test-Path $logoPath)) {
    Write-Error "logo.png not found"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($logoPath)
Write-Host "Loaded logo: $($src.Width) x $($src.Height)"

# Sizes for Android launcher icons:
# mdpi: 48x48
# hdpi: 72x72
# xhdpi: 96x96
# xxhdpi: 144x144
# xxxhdpi: 192x192
# 512x512 for high-res store icon
$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
    "store" = 512
}

# The emblem is on the left: x=0 to 100, y=0 to 76
# Let's crop emblem with nice white circular or rounded background
$emblemW = 100
$emblemH = 76

foreach ($name in $sizes.Keys) {
    $dim = $sizes[$name]
    $bmp = New-Object System.Drawing.Bitmap $dim, $dim
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Draw a gold circular ring
    $borderW = [float][Math]::Max(1.0, [double]$dim / 32.0)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(218, 165, 32)), $borderW
    $g.DrawEllipse($pen, [float]2.0, [float]2.0, [float]($dim - 4), [float]($dim - 4))
    $pen.Dispose()

    # Padding inside the circle
    $pad = [int]($dim * 0.12)
    $drawW = $dim - ($pad * 2)
    $drawH = [int]($drawW * ($emblemH / $emblemW))
    $drawX = $pad
    $drawY = [int](($dim - $drawH) / 2)

    $srcRect = New-Object System.Drawing.Rectangle 0, 0, $emblemW, $emblemH
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

# Also create a cropped rex_emblem.png with white background for use in app
$embBmp = New-Object System.Drawing.Bitmap 200, 200
$gEmb = [System.Drawing.Graphics]::FromImage($embBmp)
$gEmb.Clear([System.Drawing.Color]::White)
$gEmb.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gEmb.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$pad = 15
$drawW = 200 - ($pad * 2)
$drawH = [int]($drawW * ($emblemH / $emblemW))
$drawY = [int]((200 - $drawH) / 2)
$srcRect = New-Object System.Drawing.Rectangle 0, 0, $emblemW, $emblemH
$destRect = New-Object System.Drawing.Rectangle $pad, $drawY, $drawW, $drawH
$gEmb.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$gEmb.Dispose()
$embBmp.Save((Join-Path $baseDir "assets\rex_emblem.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$embBmp.Dispose()

# Also create a high-contrast white-background banner: assets/rex_banner_white.png
$bannerBmp = New-Object System.Drawing.Bitmap ($src.Width + 24), ($src.Height + 16)
$gBan = [System.Drawing.Graphics]::FromImage($bannerBmp)
$gBan.Clear([System.Drawing.Color]::White)
$gBan.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gBan.DrawImage($src, 12, 8, $src.Width, $src.Height)
$gBan.Dispose()
$bannerBmp.Save((Join-Path $baseDir "assets\rex_banner_white.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bannerBmp.Dispose()

$src.Dispose()
Write-Host "All icons generated successfully!"
