#include <WiFi.h>
#include <esp_wifi.h>

// Upstream Router credentials (Air)
const char* ssid_upstream = "Air";
const char* password_upstream = "00000000";

// Repeater/SoftAP credentials (AiTiny)
const char* ssid_ap = "AiTiny";
const char* password_ap = "@Nikrazif1";

void setup() {
  Serial.begin(115200);
  Serial.println("\n[*] Starting ESP32 WiFi Repeater (NAT)");

  // 1. Initialize Station (Connect to Upstream WiFi)
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(ssid_upstream, password_upstream);
  
  Serial.print("[*] Connecting to Upstream");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[+] Connected to Upstream Router!");
  Serial.print("[INFO] ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  // 2. Initialize SoftAP (Provide downstream WiFi)
  WiFi.softAP(ssid_ap, password_ap);
  Serial.print("[+] Repeater AP Started. SSID: ");
  Serial.println(ssid_ap);
  Serial.print("[INFO] Repeater IP: ");
  Serial.println(WiFi.softAPIP());

  // Note: True NAT routing requires enabling IP Forwarding in lwIP or using an external NAT library.
  // This sketch provides the basic dual-interface WiFi setup.
}

void loop() {
  // Keep alive / handling clients
  delay(1000);
}
