Add-Type -AssemblyName System.Drawing

$inputs = @(
  'D:\Downloads\fish_raw_1.png',
  'D:\Downloads\fish_raw_2.png',
  'D:\Downloads\fish_raw_3.png'
)
$outDir = 'D:\engine_compare\bench\assets\fish'

for ($i = 0; $i -lt $inputs.Count; $i++) {
  $src = $inputs[$i]
  $out = Join-Path $outDir ("fish_" + ($i + 1) + ".png")
  $bmp = [System.Drawing.Bitmap]::FromFile($src)
  $w = $bmp.Width; $h = $bmp.Height

  # 纯白背景：RGB 都 > 240 视为背景
  $alpha = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      if ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
        $alpha.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
      } else {
        $alpha.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
      }
    }
  }

  # 裁边
  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if ($alpha.GetPixel($x, $y).A -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { Write-Host "ERR: $src 全透明"; continue }
  $cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
  $crop = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($alpha, (New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)), (New-Object System.Drawing.Rectangle($minX, $minY, $cw, $ch)), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  # 统一高度 96
  $th = 96
  $tw = [int]($cw * $th / $ch)
  $final = New-Object System.Drawing.Bitmap($tw, $th, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g2 = [System.Drawing.Graphics]::FromImage($final)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.DrawImage($crop, 0, 0, $tw, $th)
  $g2.Dispose()

  $final.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $alpha.Dispose(); $crop.Dispose(); $final.Dispose()
  Write-Host ("fish_" + ($i + 1) + ": " + $cw + "x" + $ch + " -> " + $tw + "x" + $th)
}
Write-Host "DONE"
