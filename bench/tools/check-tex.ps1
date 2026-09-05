Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('D:\engine_compare\aquarium\aquarium\assets\MediumFishA_DM.jpg')
$w = $img.Width; $h = $img.Height
Write-Host "size: ${w}x${h}"
$c1 = $img.GetPixel(0,0);            Write-Host "(0,0) R=$($c1.R) G=$($c1.G) B=$($c1.B)"
$c2 = $img.GetPixel($w-1,0);         Write-Host "(w,0) R=$($c2.R) G=$($c2.G) B=$($c2.B)"
$c3 = $img.GetPixel(0,$h-1);         Write-Host "(0,h) R=$($c3.R) G=$($c3.G) B=$($c3.B)"
$c4 = $img.GetPixel($w-1,$h-1);      Write-Host "(w,h) R=$($c4.R) G=$($c4.G) B=$($c4.B)"
$c5 = $img.GetPixel([int]($w/2),[int]($h/2)); Write-Host "(center) R=$($c5.R) G=$($c5.G) B=$($c5.B)"
$img.Dispose()
