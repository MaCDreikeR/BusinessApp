# Script para substituir TODAS as cores hardcoded por referências do tema
# Executar: powershell -ExecutionPolicy Bypass -File fix-all-colors.ps1

$appPath = "E:\BusinessApp\app\(app)"
$files = Get-ChildItem -Path $appPath -Filter "*.tsx" -Recurse

Write-Host "🎨 Corrigindo cores hardcoded em TODOS os arquivos..." -ForegroundColor Cyan

$replacements = @{
    "'`#10B981'" = "colors.success"
    "`"#10B981`"" = "colors.success"
    "'`#4CAF50'" = "colors.success"
    "`"#4CAF50`"" = "colors.success"
    "'`#EF4444'" = "colors.error"
    "`"#EF4444`"" = "colors.error"
    "'`#DC2626'" = "colors.errorDark"
    "`"#DC2626`"" = "colors.errorDark"
    "'`#F59E0B'" = "colors.warning"
    "`"#F59E0B`"" = "colors.warning"
    "'`#3B82F6'" = "colors.info"
    "`"#3B82F6`"" = "colors.info"
    "'`#7C3AED'" = "colors.primary"
    "`"#7C3AED`"" = "colors.primary"
    "'`#111827'" = "colors.text"
    "`"#111827`"" = "colors.text"
    "'`#1F2937'" = "colors.text"
    "`"#1F2937`"" = "colors.text"
    "'`#333'" = "colors.text"
    "`"#333`"" = "colors.text"
    "'`#666'" = "colors.textSecondary"
    "`"#666`"" = "colors.textSecondary"
    "'`#F3E8FF'" = "colors.primaryBackground"
    "`"#F3E8FF`"" = "colors.primaryBackground"
    "'`#EDE9FE'" = "colors.primaryBackground"
    "`"#EDE9FE`"" = "colors.primaryBackground"
    "'`#D1FAE5'" = "colors.successBackground"
    "`"#D1FAE5`"" = "colors.successBackground"
    "'`#FEE2E2'" = "colors.errorBackground"
    "`"#FEE2E2`"" = "colors.errorBackground"
    "'`#E5E7EB'" = "colors.border"
    "`"#E5E7EB`"" = "colors.border"
    "'`#F3F4F6'" = "colors.borderLight"
    "`"#F3F4F6`"" = "colors.borderLight"
    "'`#fff'" = "colors.white"
    "`"#fff`"" = "colors.white"
}

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($pattern in $replacements.Keys) {
        $replacement = $replacements[$pattern]
        $count = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
        if ($count -gt 0) {
            $content = $content -replace [regex]::Escape($pattern), $replacement
            $fileReplacements += $count
        }
    }
    
    if ($fileReplacements -gt 0) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $totalReplacements += $fileReplacements
        Write-Host "  ✓ $($file.Name): $fileReplacements substituições" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Concluído!" -ForegroundColor Green
Write-Host "  📁 Arquivos corrigidos: $totalFiles" -ForegroundColor Cyan
Write-Host "  🎨 Total de substituições: $totalReplacements" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Verifique se há erros de compilação!" -ForegroundColor Yellow
Write-Host "   Algumas cores podem ter contexto específico que precisa revisão manual." -ForegroundColor Yellow
