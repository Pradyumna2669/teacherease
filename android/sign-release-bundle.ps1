param(
    [Parameter(Mandatory=$true)]
    [string]$KeystorePassword,

    [Parameter(Mandatory=$false)]
    [string]$KeyAlias = "papergen"
)

$ErrorActionPreference = "Stop"

$JavaBin = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\bin"
$Jarsigner = "$JavaBin\jarsigner.exe"
$Keytool = "$JavaBin\keytool.exe"

$Keystore = "U:\paper-gen\android\release.keystore"
$UnsignedAab = "U:\paper-gen\store-assets\bundle\papergen-release-unsigned.aab"
$SignedAab = "U:\paper-gen\store-assets\bundle\papergen-release.aab"

Write-Host "==> Verifying keystore password..." -ForegroundColor Cyan
& $Keytool -list -keystore $Keystore -storepass $KeystorePassword | Out-Null

Write-Host "==> Signing AAB with $KeyAlias..." -ForegroundColor Cyan
Copy-Item $UnsignedAab $SignedAab -Force

& $Jarsigner -keystore $Keystore `
  -storepass $KeystorePassword `
  -sigalg SHA256withRSA `
  -digestalg SHA-256 `
  $SignedAab $KeyAlias

Write-Host "==> Verifying signature..." -ForegroundColor Cyan
& $Jarsigner -verify -certs $SignedAab

Write-Host "`nSUCCESS! Your signed Play Store bundle is ready:" -ForegroundColor Green
Write-Host "File: $SignedAab" -ForegroundColor Yellow
