# Installs the li-* skills into ~/.claude/skills. No git needed.
# Run in PowerShell:
#   irm https://raw.githubusercontent.com/dillonyjames-cpu/linkedin-agent-skill/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo   = 'dillonyjames-cpu/linkedin-agent-skill'
$branch = if ($env:LI_BRANCH) { $env:LI_BRANCH } else { 'main' }

$claudeDir = Join-Path $HOME '.claude'
$skillsDir = Join-Path $claudeDir 'skills'
$voiceDir  = Join-Path $claudeDir 'linkedin'
$tmp       = Join-Path ([IO.Path]::GetTempPath()) ("li-skill-" + [guid]::NewGuid())

try {
    New-Item -ItemType Directory -Force $tmp, $skillsDir, $voiceDir | Out-Null

    Write-Host "Downloading $repo ($branch)..."
    $zip = Join-Path $tmp 'repo.zip'
    Invoke-WebRequest "https://github.com/$repo/archive/refs/heads/$branch.zip" -OutFile $zip -UseBasicParsing
    Expand-Archive $zip -DestinationPath $tmp -Force
    $src = Get-ChildItem $tmp -Directory | Select-Object -First 1

    $skills = Get-ChildItem (Join-Path $src.FullName 'skills') -Directory -Filter 'li-*'
    foreach ($s in $skills) {
        $dest = Join-Path $skillsDir $s.Name
        if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
        Copy-Item -Recurse $s.FullName $dest
        Write-Host "  installed /$($s.Name)"
    }

    # Never overwrite a voice.md the user already filled in.
    $voice = Join-Path $voiceDir 'voice.md'
    if (-not (Test-Path $voice)) {
        Copy-Item (Join-Path $src.FullName 'templates\voice.md') $voice
        Write-Host "  created $voice (fill this in)"
    } else {
        Write-Host "  kept your existing $voice"
    }

    Write-Host "`nDone: $($skills.Count) skills in $skillsDir"
    Write-Host "Start Claude Code with 'claude' and type /li- to see them."
}
finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
