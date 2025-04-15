$port = 8090
$folderPath = Get-Location

Write-Host "Запуск сервера на порту $port в директории $folderPath"

# Запускаем сервер
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

# Открываем браузер
Start-Process "http://localhost:$port/index.html"

Write-Host "Сервер запущен! Открываем браузер с NeuroMail..."
Write-Host "Нажмите Ctrl+C для остановки сервера"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        $localPath = $localPath.TrimStart('/')
        
        if ($localPath -eq '') {
            $localPath = 'index.html'
        }
        
        $path = Join-Path $folderPath $localPath
        
        Write-Host "Запрос: $path"
        
        if (Test-Path -Path $path -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($path)
            $response.ContentLength64 = $content.Length
            
            # Определяем Content-Type
            $extension = [System.IO.Path]::GetExtension($path)
            switch ($extension) {
                '.html' { $response.ContentType = 'text/html' }
                '.css'  { $response.ContentType = 'text/css' }
                '.js'   { $response.ContentType = 'application/javascript' }
                '.json' { $response.ContentType = 'application/json' }
                '.svg'  { $response.ContentType = 'image/svg+xml' }
                '.png'  { $response.ContentType = 'image/png' }
                '.jpg'  { $response.ContentType = 'image/jpeg' }
                '.ico'  { $response.ContentType = 'image/x-icon' }
                default { $response.ContentType = 'application/octet-stream' }
            }
            
            $output = $response.OutputStream
            $output.Write($content, 0, $content.Length)
            $output.Close()
        } else {
            $response.StatusCode = 404
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
} 