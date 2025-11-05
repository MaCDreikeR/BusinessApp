#!/bin/bash
# Wrapper para usar o adb.exe do Windows no WSL
exec /mnt/c/Users/borge/AppData/Local/Android/Sdk/platform-tools/adb.exe "$@"
