#!/usr/bin/env python3
"""
FIRST ALERT — Commander Map server
Run:  python3 serve.py [port]
Then open http://<your-machine-ip>:<port> in Safari on iPad.
"""
import http.server
import socketserver
import sys
import socket
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silent

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    ip = get_local_ip()
    print(f"\n  FIRST ALERT — Commander Map")
    print(f"  ────────────────────────────────────")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  iPad:    http://{ip}:{PORT}")
    print(f"\n  Open the URL above in Safari on your iPad.")
    print(f"  Press Ctrl+C to stop.\n")
    httpd.serve_forever()
