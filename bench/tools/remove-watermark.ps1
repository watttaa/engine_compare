Add-Type -AssemblyName System.Drawing

$p = 'D:\engine_compare\bench\assets\aquarium_bg.png'
$tmpP = 'D:\engine_compare\bench\assets\aquarium_bg_fixed.png'

# load then clone to release file lock
$tmp = [System.Drawing.Bitmap]::FromFile($p)
$bmp = $tmp.Clone()
$tmp.Dispose()

$w = $bmp.Width; $h = $bmp.Height
$coverW = 360; $coverH = 80
$x0 = $w - $coverW - 6
$y0 = $h - $coverH - 6

$g = [System.Drawing.Graphics]::FromImage($bmp)
$srcRect = New-Object System.Drawing.Rectangle (($x0 - $coverW), $y0, $coverW, $coverH)
$dstRect = New-Object System.Drawing.Rectangle ($x0, $y0, $coverW, $coverH)
$g.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$bmp.Save($tmpP, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Move-Item $tmpP $p -Force
Write-Host "DONE: watermark region ($x0,$y0) ${coverW}x${coverH} covered, saved"
