# Usage:
# - Install ffmpeg and ensure it's in PATH.
# - From project root run: powershell -ExecutionPolicy Bypass -File .\scripts\make-video-from-image.ps1

$src = "public/images/blackhole.jpg"
$dst = "public/images/blackhole.mp4"
if (!(Test-Path $src)) {
    Write-Error "Source image $src not found. Put blackhole.jpg into public/images and rerun."
    exit 1
}
$ffmpeg = "ffmpeg"
$ffCheck = & $ffmpeg -version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "ffmpeg not found in PATH. Install ffmpeg and ensure it's available from PowerShell."
    exit 2
}

# Create a 10s looping mp4 from the image with subtle zoom using filter_complex
& $ffmpeg -y -loop 1 -i $src -filter_complex "zoompan=z='if(lte(pzoom,1.0),1.0, pzoom+0.0008)':d=250,format=yuv420p" -t 10 -r 25 -movflags +faststart $dst
if ($LASTEXITCODE -eq 0) {
    Write-Host "Created $dst"
} else {
    Write-Error "ffmpeg failed to create video"
    exit 3
}
