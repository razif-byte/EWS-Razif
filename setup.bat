@echo off
echo ==================================================
echo Web App Native Builder Setup
echo ==================================================
echo This script will package your web app into portable formats.
echo Requires: Node.js, npm, and native toolchains mapped.

:: Build Web HTML structure
echo [1] Building static HTML Portable Webapp...
call npm run build

:: Instructions for .exe (Windows)
echo [2] Building .exe (Windows Portable) via Electron/Nativefier...
:: npm install -g nativefier
:: nativefier --name "MyApp" "./dist" 

:: Instructions for .apk (Android)
echo [3] Building .apk (Android) via Capacitor...
:: npm install @capacitor/core @capacitor/cli
:: npx cap init
:: npx cap add android
:: npx cap build android

:: Instructions for .iso / .deb (Linux)
echo [4] Building .deb (Debian) via Electron Builder...
:: (Requires electron-builder configuration in package.json)

echo.
echo NOTE: Direct generation of .iso, .apk, and .deb requires 
echo platform-specific toolchains (Android Studio, Linux fakeroot)
echo which must be run on your local machine, not in the cloud IDE.
echo.
echo Process sequence completed. Check ./dist for web files.
pause
