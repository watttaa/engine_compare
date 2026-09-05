Add-Type -AssemblyName System.Drawing

$src = 'D:\Downloads\bg_raw.png'
$out = 'D:\engine_compare\bench\assets\aquarium_bg.png'
$tw = 1280
$th = 720

$bmp = [System.Drawing.Bitmap]::FromFile($src)
$final = New-Object System.Drawing.Bitmap($tw, $th, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($final)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, 0, 0, $tw, $th)
$g.Dispose()

$final.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $final.Dispose()
Write-Host "背景已处理: $out (1280x720)"
