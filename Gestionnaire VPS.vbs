Set shell = CreateObject("WScript.Shell")
base = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
launcher = base & "\tools\vps-manager\Lancer Gestionnaire.vbs"
shell.Run "wscript.exe " & Chr(34) & launcher & Chr(34), 0, False
