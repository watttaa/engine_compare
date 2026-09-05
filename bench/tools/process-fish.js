/**
 * 鱼图处理：白格/白底抠透明 + 自动裁剪到内容边界 + 统一缩放
 * 用法：node bench/tools/process-fish.js
 * 输入：D:\Downloads\2D扁平卡通鱼精灵图生成*.png
 * 输出：bench/assets/fish/fish_1.png / fish_2.png / fish_3.png
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INPUT = [
  'D:/Downloads/2D扁平卡通鱼精灵图生成.png',
  'D:/Downloads/2D扁平卡通鱼精灵图生成 (1).png',
  'D:/Downloads/2D扁平卡通鱼精灵图生成 (2).png'
];
const OUT_DIR = 'D:/engine_compare/bench/assets/fish';

// 用 PowerShell + System.Drawing 处理（无外部依赖）
const ps = (script) => execSync(`powershell -NoProfile -Command "${script}"`, { encoding: 'utf8' });

fs.mkdirSync(OUT_DIR, { recursive: true });

INPUT.forEach((src, idx) => {
  const outPng = path.join(OUT_DIR, `fish_${idx + 1}.png`);
  const script = `
Add-Type -AssemblyName System.Drawing
$src = '${src.replace(/'/g, "''")}'
$out = '${outPng.replace(/'/g, "''")}'
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$w = $bmp.Width; $h = $bmp.Height

# 1. 白格/白底转透明：亮度>245 视为背景
$alpha = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y=0; $y -lt $h; $y++) {
  for ($x=0; $x -lt $w; $x++) {
    $c = $bmp.GetPixel($x, $y)
    $lum = (0.299*$c.R + 0.587*$c.G + 0.114*$c.B)
    if ($lum -gt 245) {
      $alpha.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
    } else {
      $alpha.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
    }
  }
}

# 2. 自动裁剪到不透明内容边界
$minX=$w; $minY=$h; $maxX=-1; $maxY=-1
for ($y=0; $y -lt $h; $y++) {
  for ($x=0; $x -lt $w; $x++) {
    if ($alpha.GetPixel($x,$y).A -gt 0) {
      if ($x -lt $minX){$minX=$x}; if ($x -gt $maxX){$maxX=$x}
      if ($y -lt $minY){$minY=$y}; if ($y -gt $maxY){$maxY=$y}
    }
  }
}
if ($maxX -lt 0) { Write-Host 'ERR: 全透明'; exit 1 }
$cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
$crop = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($alpha, (New-Object System.Drawing.Rectangle(0,0,$cw,$ch)), (New-Object System.Drawing.Rectangle($minX,$minY,$cw,$ch)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# 3. 统一缩放：高度 96px，宽度等比
$tw = [int]($cw * 96 / $ch); $th = 96
$final = New-Object System.Drawing.Bitmap($tw, $th, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($final)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($crop, 0, 0, $tw, $th)
$g2.Dispose()

$final.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $alpha.Dispose(); $crop.Dispose(); $final.Dispose()
Write-Host ("${idx}: " + $cw + "x" + $ch + " -> " + $tw + "x" + $th)
`;
  try {
    const r = ps(script);
    console.log(`fish_${idx + 1}: ` + r.trim());
  } catch (e) {
    console.error(`fish_${idx + 1} 失败:`, e.stderr || e.message);
  }
});
console.log('完成 → bench/assets/fish/');
