@echo off
echo ==================================================
echo ESP32-S3 Auto-Upload Script for WiFi Repeater
echo ==================================================

:: This script requires Arduino CLI to be installed and added to PATH
:: Download: https://arduino.github.io/arduino-cli/
echo Checking for Arduino CLI...
where arduino-cli >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] arduino-cli not found in PATH!
    echo Please install it first to continue.
    pause
    exit /b
)

echo [1/3] Adding ESP32 Board URL...
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json

echo [2/3] Installing ESP32 Core...
arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json

echo [3/3] Compiling and Uploading to COM3...
arduino-cli compile --fqbn esp32:esp32:esp32s3 src\esp32_repeater.ino
arduino-cli upload -p COM3 --fqbn esp32:esp32:esp32s3 src\esp32_repeater.ino

if %errorlevel% equ 0 (
    echo ==================================================
    echo SUCCESS: uploaded softly to ESP32-S3 on COM3!
    echo Upstream: Air (00000000)
    echo Repeater: AiTiny (@Nikrazif1)
    echo ==================================================
) else (
    echo [ERROR] Build or Upload Failed. Please check the COM port.
)
pause
