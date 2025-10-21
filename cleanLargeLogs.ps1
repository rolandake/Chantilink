# ===============================================
# 🚀 Nettoyage automatique des logs volumineux pour Git
# ===============================================

# Taille limite pour GitHub en bytes (100 MB)
$maxSize = 100MB

# Dossier contenant les logs
$logFolder = "backend/logs"

# Vérifie que le dossier existe
if (!(Test-Path $logFolder)) {
    Write-Host "⚠️ Dossier $logFolder introuvable."
    exit
}

# Cherche tous les fichiers .log dépassant $maxSize
$largeLogs = Get-ChildItem -Path $logFolder -Filter *.log | Where-Object { $_.Length -gt $maxSize }

if ($largeLogs.Count -eq 0) {
    Write-Host "✅ Aucun fichier log volumineux trouvé."
} else {
    Write-Host "⚠️ Fichiers log volumineux détectés :"
    $largeLogs | ForEach-Object { Write-Host $_.FullName }

    # Supprimer du suivi Git
    foreach ($file in $largeLogs) {
        git rm --cached $file.FullName
        Write-Host "📌 Retiré du suivi Git : $($file.FullName)"
    }

    # Ajouter les logs au .gitignore
    $gitignorePath = ".gitignore"
    if (!(Test-Path $gitignorePath)) {
        New-Item -ItemType File -Path $gitignorePath -Force
    }

    $ignoreLine = "$logFolder/*.log"
    if (-not (Select-String -Path $gitignorePath -Pattern [regex]::Escape($ignoreLine))) {
        Add-Content -Path $gitignorePath -Value $ignoreLine
        Write-Host "✅ Ajouté au .gitignore : $ignoreLine"
    } else {
        Write-Host "ℹ️ Ligne déjà présente dans .gitignore"
    }

    # Commit automatique
    git add .gitignore
    git commit -m "Remove large log files and ignore logs"
    Write-Host "✅ Commit créé avec succès"
}

Write-Host "`n💡 Script terminé. Tu peux maintenant faire : git push origin main"
