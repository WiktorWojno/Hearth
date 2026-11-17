import http.server, os, urllib.parse
D = os.path.expanduser('~/storage/downloads')
class H(http.server.BaseHTTPRequestHandler):
    def _c(s):
        s.send_header('Access-Control-Allow-Origin', '*')
        s.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(s):
        s.send_response(204); s._c(); s.end_headers()
    def do_POST(s):
        n = int(s.headers.get('Content-Length', 0))
        name = os.path.basename(urllib.parse.unquote(s.path.strip('/'))) or 'hearth-backup.json'
        open(os.path.join(D, name), 'wb').write(s.rfile.read(n))
        s.send_response(200); s._c(); s.end_headers(); s.wfile.write(b'saved')
    def log_message(s, *a): pass
print('Waiting for Hearth on 127.0.0.1:8765 ... (Ctrl+C to stop)')
http.server.HTTPServer(('127.0.0.1', 8765), H).serve_forever()
