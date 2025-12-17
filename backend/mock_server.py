#!/usr/bin/env python3
"""
MOCK AI DETECTION SERVER
========================
A simple mock server for testing the frontend without real AI models.
Returns fake detection results instantly.

Run with: python3 mock_server.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import random
import hashlib
import cgi
from urllib.parse import urlparse

PORT = 8000

class MockAPIHandler(BaseHTTPRequestHandler):
    
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self._set_headers(200)
    
    def do_GET(self):
        """Handle GET requests"""
        path = urlparse(self.path).path
        
        if path == '/':
            self._set_headers()
            response = {
                "name": "AI Content Attestation API (Mock)",
                "version": "1.0.0-mock",
                "docs": "/docs",
                "note": "This is a mock server for testing"
            }
            self.wfile.write(json.dumps(response).encode())
        
        elif path == '/api/health':
            self._set_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode())
        
        elif path == '/api/status':
            self._set_headers()
            response = {
                "status": "operational",
                "services": {
                    "text_detection": {"model": "mock-text-v1", "loaded": True, "device": "cpu"},
                    "deepfake_detection": {"model": "mock-deepfake-v1", "loaded": True, "device": "cpu"},
                    "ai_image_detection": {"model": "mock-image-v1", "loaded": True, "device": "cpu"}
                }
            }
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def do_POST(self):
        """Handle POST requests"""
        path = urlparse(self.path).path
        
        if path == '/api/detect/text':
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body)
                text = data.get('text', '')
            except:
                text = ''
            
            # Generate mock result
            content_hash = hashlib.sha256(text.encode()).hexdigest()
            ai_prob = random.uniform(20, 85)
            
            if ai_prob > 70:
                classification = "ai"
            elif ai_prob < 30:
                classification = "human"
            else:
                classification = "mixed"
            
            response = {
                "aiProbability": round(ai_prob, 2),
                "humanProbability": round(100 - ai_prob, 2),
                "classification": classification,
                "confidence": round(abs(ai_prob - 50) * 2, 2),
                "detectionModel": "mock-text-detector-v1",
                "contentHash": content_hash
            }
            
            self._set_headers()
            self.wfile.write(json.dumps(response).encode())
        
        elif path == '/api/detect/image':
            # Parse multipart form data
            content_type = self.headers.get('Content-Type', '')
            
            # Generate mock result
            ai_prob = random.uniform(15, 90)
            is_deepfake = random.random() > 0.7
            
            response = {
                "aiProbability": round(ai_prob, 2),
                "isDeepfake": is_deepfake,
                "sourceModel": random.choice(["DALL-E", "Midjourney", "Stable Diffusion", None]),
                "confidence": round(abs(ai_prob - 50) * 2, 2),
                "detectionModel": "mock-image-detector-v1"
            }
            
            self._set_headers()
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def run_server():
    server = HTTPServer(('0.0.0.0', PORT), MockAPIHandler)
    print("\n" + "="*60)
    print("🚀 MOCK AI DETECTION SERVER")
    print("="*60)
    print(f"\n✅ Server running at: http://localhost:{PORT}")
    print(f"📚 Health check: http://localhost:{PORT}/api/health")
    print(f"\n⚠️  This is a MOCK server - returns random results!")
    print("    Use for frontend testing only.\n")
    print("="*60)
    print("\nPress Ctrl+C to stop...\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped.")
        server.shutdown()


if __name__ == '__main__':
    run_server()
