param(
    [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Net.Http

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

$httpClient = [System.Net.Http.HttpClient]::new()

function Add-CorsHeaders {
    param($Response)
    $Response.Headers['Access-Control-Allow-Origin'] = '*'
    $Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    $Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
}

Write-Host "WAPI local proxy listening on $prefix"
Write-Host "Health: http://127.0.0.1:$Port/health"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
        Add-CorsHeaders -Response $response

        if ($request.HttpMethod -eq 'OPTIONS') {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        if ($request.RawUrl -eq '/health') {
            $json = '{"ok":true,"service":"wapi_proxy"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.StatusCode = 200
            $response.ContentType = 'application/json; charset=utf-8'
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        $targetUrl = "https://api.wynncraft.com$($request.RawUrl)"
        $method = [System.Net.Http.HttpMethod]::new($request.HttpMethod)
        $upstreamRequest = [System.Net.Http.HttpRequestMessage]::new($method, $targetUrl)

        if ($request.HasEntityBody) {
            $memory = [System.IO.MemoryStream]::new()
            $request.InputStream.CopyTo($memory)
            $payload = $memory.ToArray()
            $content = [System.Net.Http.ByteArrayContent]::new($payload)
            if ($request.ContentType) {
                $null = $content.Headers.TryAddWithoutValidation('Content-Type', $request.ContentType)
            }
            $upstreamRequest.Content = $content
        }

        $upstreamResponse = $httpClient.SendAsync($upstreamRequest).GetAwaiter().GetResult()
        $response.StatusCode = [int]$upstreamResponse.StatusCode

        if ($upstreamResponse.Content.Headers.ContentType) {
            $response.ContentType = $upstreamResponse.Content.Headers.ContentType.ToString()
        }

        $passHeaders = @('Cache-Control', 'Expires', 'Version', 'RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Limit')
        foreach ($headerName in $passHeaders) {
            $values = $null
            if ($upstreamResponse.Headers.TryGetValues($headerName, [ref]$values)) {
                $response.Headers[$headerName] = ($values -join ', ')
            } else {
                $values = $null
                if ($upstreamResponse.Content.Headers.TryGetValues($headerName, [ref]$values)) {
                    $response.Headers[$headerName] = ($values -join ', ')
                }
            }
        }

        $body = $upstreamResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        $response.OutputStream.Write($body, 0, $body.Length)
        $response.Close()
    }
    catch {
        $errorPayload = @{
            error = 'Proxy request failed'
            message = $_.Exception.Message
        } | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($errorPayload)

        if (-not $response.OutputStream.CanWrite) {
            continue
        }

        Add-CorsHeaders -Response $response
        $response.StatusCode = 502
        $response.ContentType = 'application/json; charset=utf-8'
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    }
}