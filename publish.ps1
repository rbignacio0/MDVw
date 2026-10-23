param(
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRoot = $PSScriptRoot
$DeployDir = Join-Path $ProjectRoot '.mdviewer-deploy'
$PublishedDir = Join-Path $DeployDir 'publish'
$Dockerfile = Join-Path $DeployDir 'Dockerfile'
$DockerIgnore = Join-Path $DeployDir 'Dockerfile.dockerignore'
$NginxConfig = Join-Path $DeployDir 'default.conf'

$ImageName = 'mdviewer:local'
$NetworkName = 'mdviewer-net'
$AppContainer = 'mdviewer-app'
$NginxContainer = 'mdviewer-nginx'

if ($Port -lt 1 -or $Port -gt 65535) {
    throw 'Port must be between 1 and 65535.'
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI was not found. Install Docker Desktop and try again.'
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw '.NET SDK was not found. Install the .NET 10 SDK and try again.'
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not running or is not available.'
}

New-Item -ItemType Directory -Path $DeployDir -Force | Out-Null

@'
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
COPY publish/ .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MdViewer.dll"]
'@ | Set-Content -Path $Dockerfile -Encoding ascii

@'
**/bin
**/obj
publish-check
default.conf
'@ | Set-Content -Path $DockerIgnore -Encoding ascii

@'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://mdviewer-app:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
    }
}
'@ | Set-Content -Path $NginxConfig -Encoding ascii

if (Test-Path -LiteralPath $PublishedDir) {
    Remove-Item -LiteralPath $PublishedDir -Recurse -Force
}

& dotnet publish (Join-Path $ProjectRoot 'MdViewer\MdViewer.csproj') `
    --configuration Release `
    --output $PublishedDir
if ($LASTEXITCODE -ne 0) {
    throw '.NET publish failed.'
}

$BlazorWebScript = Join-Path $PublishedDir 'wwwroot\_framework\blazor.web.js'
if (-not (Test-Path -LiteralPath $BlazorWebScript)) {
    throw "Published Blazor bootstrap script is missing: $BlazorWebScript"
}

& docker build --pull --tag $ImageName --file $Dockerfile $DeployDir
if ($LASTEXITCODE -ne 0) {
    throw 'Docker image build failed.'
}

& docker network inspect $NetworkName *> $null
if ($LASTEXITCODE -ne 0) {
    & docker network create $NetworkName
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not create the Docker network.'
    }
}

foreach ($Container in @($NginxContainer, $AppContainer)) {
    & docker container inspect $Container *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker rm --force $Container
        if ($LASTEXITCODE -ne 0) {
            throw "Could not replace container '$Container'."
        }
    }
}

& docker run --detach `
    --name $AppContainer `
    --network $NetworkName `
    --restart unless-stopped `
    $ImageName
if ($LASTEXITCODE -ne 0) {
    throw 'Could not start the MDViewer app container.'
}

& docker run --detach `
    --name $NginxContainer `
    --network $NetworkName `
    --publish "${Port}:80" `
    --mount "type=bind,source=$NginxConfig,target=/etc/nginx/conf.d/default.conf,readonly" `
    --restart unless-stopped `
    nginx:alpine
if ($LASTEXITCODE -ne 0) {
    throw 'Could not start the Nginx container.'
}

Write-Host "MDViewer is available at http://localhost:$Port"