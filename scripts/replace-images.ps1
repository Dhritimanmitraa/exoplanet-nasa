$ErrorActionPreference = 'Continue'

function Download-FirstOk {
    param(
        [string[]]$Urls,
        [string]$OutFull
    )
    foreach ($u in $Urls) {
        try {
            Invoke-WebRequest -Uri $u -OutFile $OutFull -UseBasicParsing -ErrorAction Stop
            Write-Host ("OK   => " + $u + " -> " + $OutFull)
            return $true
        } catch {
            Write-Host ("FAIL => " + $u + " : " + $_.Exception.Message)
        }
    }
    return $false
}

$items = @(
    @{ Name = 'Kepler-186f'; Out = '..\public\images\kepler-186f.jpg'; Urls = @(
        'https://upload.wikimedia.org/wikipedia/commons/c/c1/Kepler186f-ArtistConcept-20140417.jpg',
        'https://science.nasa.gov/wp-content/uploads/2023/07/kepler186f_artistconcept-20140417-full.jpg'
    )},
    @{ Name = 'Proxima Centauri b'; Out = '..\public\images\proxima-centauri-b.jpg'; Urls = @(
        'https://cdn.eso.org/images/large/eso1629a.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/8/81/Artist%E2%80%99s_impression_of_Proxima_Centauri_b_shown_hypothetically_as_an_arid_rocky_super-earth.jpg'
    )},
    @{ Name = 'TRAPPIST-1e'; Out = '..\public\images\trappist-1e.jpg'; Urls = @(
        'https://images-assets.nasa.gov/image/PIA22094/PIA22094~orig.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/3/38/TRAPPIST-1e_artist_impression_2018.png'
    )},
    @{ Name = 'TOI-715 b'; Out = '..\public\images\toi-715-b.jpg'; Urls = @(
        'https://science.nasa.gov/wp-content/uploads/2024/01/toi-715b-illustration.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/2/2e/PIA22080-Exoplanet-Illustration.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/4/4a/Exoplanet_artist_impression_generic.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Exoplanet_artist_impression_generic.jpg/1200px-Exoplanet_artist_impression_generic.jpg'
    )},
    @{ Name = 'HD 40307g'; Out = '..\public\images\hd-40307g.jpg'; Urls = @(
        'https://upload.wikimedia.org/wikipedia/commons/3/3f/HD_40307g_-_Super-Earth_%28artist%27s_impression%29.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/9/9f/HD_40307g_artist%27s_impression.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/6/60/Exoplanet_artist_impression2.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Exoplanet_artist_impression2.jpg/1200px-Exoplanet_artist_impression2.jpg'
    )},
    @{ Name = '55 Cancri e'; Out = '..\public\images\55-cancri-e.jpg'; Urls = @(
        'https://images-assets.nasa.gov/image/PIA18006/PIA18006~orig.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/9/92/Super-Earth_Exoplanet_55_Cancri_e_%28Artist%E2%80%99s_Concept%29_%282024-102%29.png'
    )},
    @{ Name = 'WASP-12b'; Out = '..\public\images\wasp-12b.jpg'; Urls = @(
        'https://upload.wikimedia.org/wikipedia/commons/1/1b/Hot_Jupiter_WASP-12b.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/5/5b/Exoplanet_Comparison_WASP-12_b.png'
    )},
    @{ Name = 'K2-18 b'; Out = '..\public\images\k2-18b.jpg'; Urls = @(
        'https://cdn.esawebb.org/archives/images/wallpaper2/weic2326a.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/2/27/Exoplanet_K2-18_b_%28Illustration%29.jpg'
    )},
    @{ Name = 'Gliese 667 Cc'; Out = '..\public\images\gliese-667cc.jpg'; Urls = @(
        'https://cdn.eso.org/images/large/eso1328e.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/e/e8/Gliese_667_planetary_system_%28artist%27s_impression%29.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/1/19/Gliese_667C_artist_impression.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Gliese_667C_artist_impression.jpg/1200px-Gliese_667C_artist_impression.jpg'
    )},
    @{ Name = 'GJ 1002 b'; Out = '..\public\images\gj-1002b.jpg'; Urls = @(
        'https://cdn.eso.org/images/large/eso2216a.jpg',
        'https://cdn.eso.org/images/large/eso2216b.jpg'
    )}
)

foreach ($it in $items) {
    $outFull = Join-Path $PSScriptRoot $it.Out
    $dir = Split-Path -Parent $outFull
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Write-Host ("==> " + $it.Name)
    $ok = Download-FirstOk -Urls $it.Urls -OutFull $outFull
    if (-not $ok) { Write-Host ("NONE => " + $it.Name + " (kept existing image)") }
}
