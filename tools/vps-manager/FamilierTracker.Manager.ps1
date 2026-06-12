Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic

[System.Windows.Forms.Application]::EnableVisualStyles()

$createdNew = $false
$Script:SingleInstanceMutex = New-Object System.Threading.Mutex($true, "FamilierTrackerVpsManager", [ref]$createdNew)
if (-not $createdNew) {
    [System.Windows.Forms.MessageBox]::Show(
        "Le gestionnaire Familier Tracker est déjà ouvert.",
        "Gestionnaire VPS",
        "OK",
        "Information"
    ) | Out-Null
    exit
}

$Script:ManagerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:ProjectDir = Split-Path -Parent (Split-Path -Parent $Script:ManagerDir)
$Script:ConfigPath = Join-Path $Script:ManagerDir "manager.config.json"
$Script:ExamplePath = Join-Path $Script:ManagerDir "manager.config.example.json"
$gitFromPath = Get-Command git.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
$gitFromDesktop = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop" -Filter git.exe -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like "*\resources\app\git\cmd\git.exe" } |
    Sort-Object FullName -Descending |
    Select-Object -ExpandProperty FullName -First 1
$Script:GitCandidates = @($gitFromPath, $gitFromDesktop) | Where-Object { $_ -and (Test-Path $_) }
$Script:GitExe = $Script:GitCandidates | Select-Object -First 1
$Script:SshExe = Get-Command ssh.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1

function Load-ManagerConfig {
    if (-not (Test-Path $Script:ConfigPath)) {
        Copy-Item $Script:ExamplePath $Script:ConfigPath
    }
    return Get-Content -Raw -Encoding UTF8 $Script:ConfigPath | ConvertFrom-Json
}

function Save-ManagerConfig {
    $config = [ordered]@{
        host = $txtHost.Text.Trim()
        port = [int]$numPort.Value
        user = $txtUser.Text.Trim()
        remotePath = $txtRemotePath.Text.Trim()
        branch = $txtBranch.Text.Trim()
        siteUrl = $txtSiteUrl.Text.Trim()
        sshKey = $txtSshKey.Text.Trim()
        launchAtWindowsStartup = if ($null -ne $chkWindowsStartup) { [bool]$chkWindowsStartup.Checked } else { $true }
    }
    $config | ConvertTo-Json | Set-Content -Encoding UTF8 $Script:ConfigPath
    return [pscustomobject]$config
}

function Assert-ManagerConfig {
    $config = Save-ManagerConfig
    if (-not $config.host -or -not $config.user -or -not $config.remotePath -or -not $config.branch) {
        throw "L'adresse VPS, l'utilisateur, le dossier distant et la branche sont obligatoires."
    }
    $forbiddenCharacters = [char[]]@(39, 34, 59, 38, 124, 10, 13)
    foreach ($value in @($config.host, $config.user, $config.remotePath, $config.branch)) {
        if ($value.IndexOfAny($forbiddenCharacters) -ge 0) {
            throw "Un parametre de connexion contient un caractere non autorise."
        }
    }
    return $config
}

function Write-Log([string]$Text, [string]$Level = "INFO") {
    if (-not $Text) { return }
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { [System.Drawing.Color]::FromArgb(198, 40, 40) }
        "OK" { [System.Drawing.Color]::FromArgb(20, 125, 65) }
        "WARN" { [System.Drawing.Color]::FromArgb(190, 105, 12) }
        default { [System.Drawing.Color]::FromArgb(55, 45, 35) }
    }
    $txtLog.SelectionStart = $txtLog.TextLength
    $txtLog.SelectionColor = $color
    $txtLog.AppendText("[$timestamp] $Text`r`n")
    $txtLog.SelectionColor = $txtLog.ForeColor
    $txtLog.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function Quote-Argument([string]$Value) {
    if ($null -eq $Value) { return '""' }
    return '"' + ($Value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
}

function Invoke-ProcessLogged([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory = $Script:ProjectDir) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ($Arguments | ForEach-Object { Quote-Argument $_ }) -join " "
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $psi.CreateNoWindow = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($stdout.Trim()) { Write-Log $stdout.Trim() }
    if ($stderr.Trim()) { Write-Log $stderr.Trim() $(if ($process.ExitCode) { "ERROR" } else { "WARN" }) }
    if ($process.ExitCode -ne 0) { throw "La commande a échoué avec le code $($process.ExitCode)." }
    return $stdout
}

function Get-SshArguments([string]$RemoteCommand) {
    $config = Assert-ManagerConfig
    $args = @("-o", "BatchMode=yes", "-o", "ConnectTimeout=12", "-p", [string]$config.port)
    if ($config.sshKey) { $args += @("-i", $config.sshKey) }
    $args += @("$($config.user)@$($config.host)", $RemoteCommand)
    return $args
}

function Invoke-Ssh([string]$Command) {
    if (-not $Script:SshExe) { throw "OpenSSH est introuvable sur Windows." }
    return Invoke-ProcessLogged $Script:SshExe (Get-SshArguments "export LANG=C.UTF-8 LC_ALL=C.UTF-8; $Command")
}

function Get-DeployRemoteCommand {
    $config = Assert-ManagerConfig
    return "cd '$($config.remotePath)' && git fetch origin '$($config.branch)' && git checkout '$($config.branch)' && git pull --ff-only origin '$($config.branch)' && PYKUR_APP_DIR='$($config.remotePath)' PYKUR_BRANCH='$($config.branch)' bash '$($config.remotePath)/server/scripts/vps-deploy.sh'"
}

function Set-Busy([bool]$Busy, [string]$Text = "") {
    $form.UseWaitCursor = $Busy
    foreach ($button in $Script:ActionButtons) { $button.Enabled = -not $Busy }
    $statusLabel.Text = if ($Busy) { $Text } else { "Prêt" }
    [System.Windows.Forms.Application]::DoEvents()
}

function Run-Action([string]$Name, [scriptblock]$Action) {
    try {
        Set-Busy $true $Name
        Write-Log $Name
        & $Action
        Write-Log "$Name : terminé." "OK"
    } catch {
        Write-Log $_.Exception.Message "ERROR"
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Familier Tracker Manager", "OK", "Error") | Out-Null
    } finally {
        Set-Busy $false
    }
}

function New-ActionButton([string]$Text, [int]$X, [int]$Y, [int]$Width, [System.Drawing.Color]$Color, [scriptblock]$Click) {
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text
    $button.Location = New-Object System.Drawing.Point($X, $Y)
    $button.Size = New-Object System.Drawing.Size($Width, 42)
    $button.FlatStyle = "Flat"
    $button.FlatAppearance.BorderSize = 0
    $button.BackColor = $Color
    $button.ForeColor = [System.Drawing.Color]::White
    $button.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)
    $button.Add_Click($Click)
    $form.Controls.Add($button)
    $Script:ActionButtons += $button
    return $button
}

$config = Load-ManagerConfig
$Script:ActionButtons = @()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Familier Tracker - Gestion VPS"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(930, 690)
$form.MinimumSize = New-Object System.Drawing.Size(820, 620)
$form.ShowInTaskbar = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(244, 238, 221)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Familier Tracker - Centre de déploiement"
$title.Location = New-Object System.Drawing.Point(24, 18)
$title.AutoSize = $true
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 17)
$title.ForeColor = [System.Drawing.Color]::FromArgb(73, 42, 18)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Publiez, redémarrez et surveillez le VPS sans retaper les commandes."
$subtitle.Location = New-Object System.Drawing.Point(27, 52)
$subtitle.AutoSize = $true
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(103, 83, 62)
$form.Controls.Add($subtitle)

$settings = New-Object System.Windows.Forms.GroupBox
$settings.Text = "Connexion sécurisée"
$settings.Location = New-Object System.Drawing.Point(24, 82)
$settings.Size = New-Object System.Drawing.Size(866, 125)
$settings.Anchor = "Top,Left,Right"
$form.Controls.Add($settings)

function Add-Field($Parent, $Label, $Value, $X, $Y, $Width) {
    $lab = New-Object System.Windows.Forms.Label
    $lab.Text = $Label
    $lab.Location = New-Object System.Drawing.Point($X, $Y)
    $lab.AutoSize = $true
    $Parent.Controls.Add($lab)
    $box = New-Object System.Windows.Forms.TextBox
    $box.Text = [string]$Value
    $box.Location = New-Object System.Drawing.Point($X, ($Y + 21))
    $box.Size = New-Object System.Drawing.Size($Width, 25)
    $Parent.Controls.Add($box)
    return $box
}

$txtHost = Add-Field $settings "Adresse VPS" $config.host 16 25 145
$txtUser = Add-Field $settings "Utilisateur" $config.user 172 25 90
$txtRemotePath = Add-Field $settings "Dossier distant" $config.remotePath 273 25 220
$txtBranch = Add-Field $settings "Branche" $config.branch 504 25 80
$txtSiteUrl = Add-Field $settings "Adresse du site" $config.siteUrl 595 25 245

$portLabel = New-Object System.Windows.Forms.Label
$portLabel.Text = "Port SSH"
$portLabel.Location = New-Object System.Drawing.Point(16, 79)
$portLabel.AutoSize = $true
$settings.Controls.Add($portLabel)
$numPort = New-Object System.Windows.Forms.NumericUpDown
$numPort.Value = [decimal]$config.port
$numPort.Minimum = 1
$numPort.Maximum = 65535
$numPort.Location = New-Object System.Drawing.Point(82, 75)
$numPort.Size = New-Object System.Drawing.Size(70, 25)
$settings.Controls.Add($numPort)

$sshKeyLabel = New-Object System.Windows.Forms.Label
$sshKeyLabel.Text = "Clé SSH"
$sshKeyLabel.Location = New-Object System.Drawing.Point(172, 79)
$sshKeyLabel.AutoSize = $true
$settings.Controls.Add($sshKeyLabel)
$txtSshKey = New-Object System.Windows.Forms.TextBox
$txtSshKey.Text = [string]$config.sshKey
$txtSshKey.Location = New-Object System.Drawing.Point(235, 75)
$txtSshKey.Size = New-Object System.Drawing.Size(410, 25)
$settings.Controls.Add($txtSshKey)

$sshHint = New-Object System.Windows.Forms.Label
$sshHint.Text = "Aucun mot de passe n'est stocké"
$sshHint.Location = New-Object System.Drawing.Point(660, 79)
$sshHint.AutoSize = $true
$sshHint.ForeColor = [System.Drawing.Color]::FromArgb(103, 83, 62)
$settings.Controls.Add($sshHint)

$blue = [System.Drawing.Color]::FromArgb(42, 101, 220)
$green = [System.Drawing.Color]::FromArgb(24, 137, 67)
$orange = [System.Drawing.Color]::FromArgb(204, 105, 16)
$gray = [System.Drawing.Color]::FromArgb(93, 103, 122)
$red = [System.Drawing.Color]::FromArgb(191, 40, 32)

[void](New-ActionButton "Commit + publier" 24 226 190 $green {
    Run-Action "Publication complète" {
        if (-not $Script:GitExe) { throw "Git est introuvable. Installez GitHub Desktop ou Git pour Windows." }
        $status = Invoke-ProcessLogged $Script:GitExe @("status", "--porcelain")
        if ($status.Trim()) {
            $confirmation = [System.Windows.Forms.MessageBox]::Show(
                "Les fichiers suivants seront ajoutés au commit :`r`n`r`n$($status.Trim())`r`n`r`nContinuer ?",
                "Vérifier le commit",
                "YesNo",
                "Question"
            )
            if ($confirmation -ne "Yes") { throw "Publication annulée avant la création du commit." }
            $message = [Microsoft.VisualBasic.Interaction]::InputBox(
                "Décrivez brièvement cette mise à jour :",
                "Créer le commit GitHub",
                "Mise à jour Familier Tracker"
            ).Trim()
            if (-not $message) { throw "Publication annulée : le message de commit est vide." }
            Invoke-ProcessLogged $Script:GitExe @("add", "--all")
            Invoke-ProcessLogged $Script:GitExe @("commit", "-m", $message)
        }
        $config = Assert-ManagerConfig
        Invoke-ProcessLogged $Script:GitExe @("push", "origin", $config.branch)
        Invoke-Ssh (Get-DeployRemoteCommand)
    }
})

[void](New-ActionButton "Déployer GitHub" 224 226 155 $blue {
    Run-Action "Déploiement du dernier GitHub" {
        Invoke-Ssh (Get-DeployRemoteCommand)
    }
})

[void](New-ActionButton "Redémarrer le site" 389 226 160 $orange {
    Run-Action "Redémarrage du site" {
        $config = Save-ManagerConfig
        Invoke-Ssh "PYKUR_APP_DIR='$($config.remotePath)' bash '$($config.remotePath)/server/scripts/vps-start.sh'"
    }
})

[void](New-ActionButton "État du VPS" 559 226 135 $gray {
    Run-Action "Vérification du VPS" {
        $config = Save-ManagerConfig
        Invoke-Ssh "bash '$($config.remotePath)/server/scripts/vps-status.sh'"
    }
})

[void](New-ActionButton "Ouvrir le site" 704 226 135 $blue {
    Run-Action "Ouverture du site" {
        $config = Save-ManagerConfig
        Start-Process $config.siteUrl
    }
})

[void](New-ActionButton "Logs API" 24 278 130 $gray {
    Run-Action "Lecture des logs API" { Invoke-Ssh "pm2 logs pykur-api --lines 120 --nostream" }
})

[void](New-ActionButton "Logs Nginx" 164 278 130 $gray {
    Run-Action "Lecture des logs Nginx" { Invoke-Ssh "journalctl -u nginx -n 100 --no-pager" }
})

[void](New-ActionButton "Tester SSH" 304 278 125 $blue {
    Run-Action "Test de connexion SSH" { Invoke-Ssh "echo Connexion SSH OK && hostname && uptime" }
})

[void](New-ActionButton "Auto-démarrage VPS" 439 278 170 $orange {
    Run-Action "Configuration du démarrage automatique VPS" {
        $config = Save-ManagerConfig
        Invoke-Ssh "PYKUR_APP_DIR='$($config.remotePath)' bash '$($config.remotePath)/server/scripts/vps-bootstrap.sh'"
    }
})

[void](New-ActionButton "Générer clé SSH" 619 278 145 $green {
    Run-Action "Création de la clé SSH" {
        $keyPath = Join-Path $env:USERPROFILE ".ssh\familier_tracker_ed25519"
        if (-not (Test-Path $keyPath)) {
            New-Item -ItemType Directory -Path (Split-Path $keyPath) -Force | Out-Null
            Invoke-ProcessLogged "ssh-keygen.exe" @("-t", "ed25519", "-f", $keyPath, "-N", "", "-C", "familier-tracker-manager")
        }
        $txtSshKey.Text = $keyPath
        Save-ManagerConfig | Out-Null
        Get-Content "$keyPath.pub" | Set-Clipboard
        Write-Log "Clé publique copiée. Ajoutez-la une fois dans /root/.ssh/authorized_keys sur le VPS." "WARN"
    }
})

[void](New-ActionButton "Reboot VPS" 774 278 115 $red {
    $answer = [System.Windows.Forms.MessageBox]::Show("Redémarrer maintenant le VPS ?", "Confirmation", "YesNo", "Warning")
    if ($answer -eq "Yes") { Run-Action "Redémarrage du VPS" { Invoke-Ssh "nohup sh -c 'sleep 1; reboot' >/dev/null 2>&1 &" } }
})

$chkWindowsStartup = New-Object System.Windows.Forms.CheckBox
$chkWindowsStartup.Text = "Lancer ce gestionnaire au démarrage de Windows"
$chkWindowsStartup.Location = New-Object System.Drawing.Point(27, 333)
$chkWindowsStartup.AutoSize = $true
$form.Controls.Add($chkWindowsStartup)

$startupPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Familier Tracker Manager.lnk"

function Set-WindowsStartupShortcut([bool]$Enabled) {
    if ($Enabled) {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($startupPath)
        $shortcut.TargetPath = "wscript.exe"
        $shortcut.Arguments = '"' + (Join-Path $Script:ManagerDir "Lancer Gestionnaire.vbs") + '"'
        $shortcut.WorkingDirectory = $Script:ManagerDir
        $shortcut.Save()
    } else {
        Remove-Item $startupPath -Force -ErrorAction SilentlyContinue
    }
}

$startupEnabled = if ($null -eq $config.launchAtWindowsStartup) { $true } else { [bool]$config.launchAtWindowsStartup }
$chkWindowsStartup.Checked = $startupEnabled
Set-WindowsStartupShortcut $startupEnabled
$chkWindowsStartup.Add_CheckedChanged({
    try {
        Set-WindowsStartupShortcut $chkWindowsStartup.Checked
        Save-ManagerConfig | Out-Null
        if ($chkWindowsStartup.Checked) {
            Write-Log "Démarrage automatique Windows activé." "OK"
        } else {
            Write-Log "Démarrage automatique Windows désactivé."
        }
    } catch { Write-Log $_.Exception.Message "ERROR" }
})

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Prêt"
$statusLabel.Location = New-Object System.Drawing.Point(705, 333)
$statusLabel.Size = New-Object System.Drawing.Size(185, 22)
$statusLabel.TextAlign = "MiddleRight"
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(85, 72, 60)
$statusLabel.Anchor = "Top,Right"
$form.Controls.Add($statusLabel)

$txtLog = New-Object System.Windows.Forms.RichTextBox
$txtLog.Location = New-Object System.Drawing.Point(24, 366)
$txtLog.Size = New-Object System.Drawing.Size(866, 245)
$txtLog.Anchor = "Top,Bottom,Left,Right"
$txtLog.ReadOnly = $true
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(252, 250, 244)
$txtLog.BorderStyle = "FixedSingle"
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($txtLog)

$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "Effacer les logs"
$clearButton.Location = New-Object System.Drawing.Point(760, 618)
$clearButton.Size = New-Object System.Drawing.Size(130, 28)
$clearButton.Anchor = "Bottom,Right"
$clearButton.Add_Click({ $txtLog.Clear() })
$form.Controls.Add($clearButton)

$form.Add_Shown({
    $form.Activate()
    $form.BringToFront()
})
$form.Add_FormClosing({
    Save-ManagerConfig | Out-Null
    if ($Script:SingleInstanceMutex) {
        $Script:SingleInstanceMutex.ReleaseMutex()
        $Script:SingleInstanceMutex.Dispose()
    }
})
if (-not $Script:GitExe) { Write-Log "Git est introuvable : installez GitHub Desktop ou Git pour Windows." "WARN" }
if (-not $Script:SshExe) { Write-Log "OpenSSH est introuvable : activez le client OpenSSH de Windows." "WARN" }
Write-Log "Gestionnaire prêt. Configurez une clé SSH avant la première utilisation." "OK"
[void]$form.ShowDialog()
