Add-Type -AssemblyName System.Drawing

# reprocess fish: keep only the LARGEST connected component (fish body),
# discard text/labels/watermark (small disconnected blobs)

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

  # 1. build foreground mask: non-white (RGB < 240)
  $mask = New-Object 'bool[,]' $w, $h
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $mask[$x, $y] = -not ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240)
    }
  }

  # 2. connected components (flood fill), track component size + bounds
  $comp = New-Object 'int[,]' $w, $h
  $size = New-Object System.Collections.ArrayList
  $minX = New-Object System.Collections.ArrayList
  $minY = New-Object System.Collections.ArrayList
  $maxX = New-Object System.Collections.ArrayList
  $maxY = New-Object System.Collections.ArrayList
  $cid = 0
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if ($mask[$x, $y] -and $comp[$x, $y] -eq 0) {
        $cid++
        $q = New-Object System.Collections.Queue
        $q.Enqueue(@($x, $y))
        $comp[$x, $y] = $cid
        $cnt = 0
        $mnx = $x; $mny = $y; $mxx = $x; $mxy = $y
        while ($q.Count -gt 0) {
          $pt = $q.Dequeue()
          $px = $pt[0]; $py = $pt[1]
          $cnt++
          if ($px -lt $mnx) { $mnx = $px }
          if ($px -gt $mxx) { $mxx = $px }
          if ($py -lt $mny) { $mny = $py }
          if ($py -gt $mxy) { $mxy = $py }
          foreach ($d in @(@(-1,0),@(1,0),@(0,-1),@(0,1),@(-1,-1),@(-1,1),@(1,-1),@(1,1))) {
            $nx = $px + $d[0]; $ny = $py + $d[1]
            if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h) {
              if ($mask[$nx, $ny] -and $comp[$nx, $ny] -eq 0) {
                $comp[$nx, $ny] = $cid
                $q.Enqueue(@($nx, $ny))
              }
            }
          }
        }
        [void]$size.Add($cnt)
        [void]$minX.Add($mnx); [void]$minY.Add($mny); [void]$maxX.Add($mxx); [void]$maxY.Add($mxy)
      }
    }
  }

  Write-Host ("fish_$($i+1): 连通块数=$cid")
  if ($cid -eq 0) { Write-Host "  全白，跳过"; continue }

  # 3. find largest component
  $largest = 0; $li = 0
  for ($k = 0; $k -lt $size.Count; $k++) {
    if ($size[$k] -gt $largest) { $largest = $size[$k]; $li = $k }
  }

  # 4. build output: only largest component kept, transparent bg
  $alpha = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if ($comp[$x, $y] -eq ($li + 1)) {
        $c = $bmp.GetPixel($x, $y)
        $alpha.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
      } else {
        $alpha.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      }
    }
  }

  # 5. crop to largest component bounds
  $mnx = $minX[$li]; $mny = $minY[$li]; $mxx = $maxX[$li]; $mxy = $maxY[$li]
  $cw = $mxx - $mnx + 1; $ch = $mxy - $mny + 1
  $crop = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($alpha, (New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)), (New-Object System.Drawing.Rectangle($mnx, $mny, $cw, $ch)), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  # 6. scale to 96 height
  $th = 96
  $tw = [int]($cw * $th / $ch)
  if ($tw -lt 1) { $tw = 1 }
  $final = New-Object System.Drawing.Bitmap($tw, $th, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g2 = [System.Drawing.Graphics]::FromImage($final)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.DrawImage($crop, 0, 0, $tw, $th)
  $g2.Dispose()

  $tmpP = $out + '.tmp.png'
  $final.Save($tmpP, [System.Drawing.Imaging.ImageFormat]::Png)
  $final.Dispose()
  Move-Item $tmpP $out -Force

  $bmp.Dispose(); $alpha.Dispose(); $crop.Dispose()
  Write-Host ("  -> 最大块 $cw x $ch ($largest px) -> $tw x $th")
}
Write-Host "DONE"
