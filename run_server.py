import os
import sys
import socket

# Ensure UTF-8 output encoding on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import uvicorn

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    local_ip = get_local_ip()
    port = 8000
    
    print("=" * 65)
    print("      GURUJI SUPERMART - FORTUNE RESIDENCY")
    print("=" * 65)
    print(f" Customer Webstore:      http://localhost:{port}")
    print(f" On Mobile / Society:    http://{local_ip}:{port}")
    print(f" Merchant Admin Portal:  http://localhost:{port}/admin (PIN: 2607)")
    print(f" Live Order Tracking:    http://localhost:{port}/track")
    print("=" * 65)
    print(" Press Ctrl+C to stop the store server.")
    print("=" * 65)
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, log_level="info")
