import http.server
import os
import urllib.parse

D = os.path.expanduser('~/storage/downloads')
os.makedirs(D, exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def _c(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self._c()
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        name = os.path.basename(urllib.parse.unquote(self.path.strip('/'))) or 'hearth-backup.json'
        path = os.path.join(D, name)
        with open(path, 'wb') as f:
            f.write(self.rfile.read(n))
        self.send_response(200)
        self._c()
        self.end_headers()
        self.wfile.write(b'saved')

    def log_message(self, format, *args):
        pass

print('Waiting for Hearth on 127.0.0.1:8765 ... (Ctrl+C to stop)')
http.server.HTTPServer(('127.0.0.1', 8765), H).serve_forever()
