# Batch create looping mp4 videos from all images in public/images
# Requirements:
# - Windows PowerShell
# - ffmpeg installed and available in PATH
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\make-videos-from-images.ps1

$imagesDir = "public/images"
$files = Get-ChildItem -Path $imagesDir -Include *.jpg, *.jpeg, *.png -File -Recurse
if ($files.Count -eq 0) {
    Write-Host "No images found in $imagesDir"
    exit 0
}

$ffmpeg = "ffmpeg"
try { & $ffmpeg -version > $null 2>&1 } catch { Write-Error "ffmpeg not found in PATH. Install ffmpeg and ensure it's available from PowerShell."; exit 2 }

foreach ($f in $files) {
    $src = $f.FullName
    $base = [IO.Path]::GetFileNameWithoutExtension($f.Name)
    $dst = Join-Path $f.DirectoryName ($base + ".mp4")

    # Skip if destination is newer than source
    if (Test-Path $dst) {
        $srcTime = (Get-Item $src).LastWriteTimeUtc
        $dstTime = (Get-Item $dst).LastWriteTimeUtc
        if ($dstTime -gt $srcTime) {
            Write-Host "Skipping $dst (up-to-date)"
            continue
        }
    }

    Write-Host "Creating video for $src -> $dst"
    # subtle Ken Burns (slow zoom) + loop
    & $ffmpeg -y -loop 1 -i $src -filter_complex "zoompan=z='if(lte(pzoom,1.0),1.0, pzoom+0.0006)':d=250,format=yuv420p" -t 10 -r 25 -movflags +faststart $dst

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Created $dst"
    } else {
        Write-Error "ffmpeg failed for $src"
    }
}

Write-Host "Done. Videos are available in $imagesDir"