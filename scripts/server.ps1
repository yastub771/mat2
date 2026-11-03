$port = 8080
$rootPath = Split-Path -Parent $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
} catch {
    $port = 8081
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Calculus 2 Ogrenim Portali Baslatildi!" -ForegroundColor Green
Write-Host " Adres: http://localhost:$port" -ForegroundColor Yellow
Write-Host " Tarayici otomatik aciliyor... (Kapatmak icin bu pencereyi kapatin)" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process "http://localhost:$port"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $localPath = $request.Url.LocalPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    if ([string]::IsNullOrEmpty($localPath)) {
        $localPath = "index.html"
    }
    
    $filePath = Join-Path $rootPath $localPath
    
    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = "text/html; charset=utf-8"
        if ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
        elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
        elseif ($ext -eq ".json") { $contentType = "application/json; charset=utf-8" }
        elseif ($ext -eq ".md") { $contentType = "text/markdown; charset=utf-8" }
        elseif ($ext -eq ".png") { $contentType = "image/png" }
        elseif ($ext -eq ".svg") { $contentType = "image/svg+xml" }
        
        $response.ContentType = $contentType
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
