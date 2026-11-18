#!/usr/bin/env python3
"""Hearth backup receiver for Termux.

The Android app can start this automatically through the Termux RUN_COMMAND
service, or you can run it yourself:

    python3 server.py

It listens only on 127.0.0.1:8765 and writes each POSTed backup into
~/storage/downloads/ (run `termux-setup-storage` once if that folder is
missing).
"""
import argparse
import http.server
import os
import sys
import urllib.parse

PORT = 8765
DEFAULT_DIR = os.path.expanduser('~/storage/downloads')
MAX_BYTES = 128 * 1024 * 1024


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = 'HearthBackup/1.0'

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store')

    def _send(self, code, body=b'', ctype='text/plain; charset=utf-8'):
        self.send_response(code)
        self._cors()
        if code != 204:
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path.rstrip('/')
        if path in ('', '/ping', '/health'):
            self._send(200, b'ok')
        else:
            self._send(404, b'not found')

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', 0))
        except ValueError:
            return self._send(400, b'bad content-length')
        if n <= 0 or n > MAX_BYTES:
            return self._send(413, b'backup too large or empty')
        name = os.path.basename(urllib.parse.unquote(self.path.strip('/'))) or 'hearth-backup.json'
        if not name.lower().endswith('.json'):
            name += '.json'
        name = ''.join(c for c in name if c.isalnum() or c in '._-') or 'hearth-backup.json'
        path = os.path.join(self.server.backup_dir, name)
        try:
            remaining = n
            with open(path, 'wb') as f:
                while remaining:
                    chunk = self.rfile.read(min(65536, remaining))
                    if not chunk:
                        raise IOError('connection closed early')
                    f.write(chunk)
                    remaining -= len(chunk)
        except Exception as e:
            return self._send(500, ('could not save: %s' % e).encode())
        self._send(200, b'saved')

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler, backup_dir):
        self.backup_dir = backup_dir
        super().__init__(addr, handler)


def main():
    ap = argparse.ArgumentParser(description='Receive Hearth backups from the Android app.')
    ap.add_argument('--port', type=int, default=PORT)
    ap.add_argument('--dir', default=DEFAULT_DIR)
    args = ap.parse_args()
    os.makedirs(args.dir, exist_ok=True)
    try:
        srv = Server(('127.0.0.1', args.port), Handler, args.dir)
    except OSError as e:
        if getattr(e, 'errno', None) in (48, 98, 10048):
            print('Hearth backup server is already running on 127.0.0.1:%d' % args.port)
            return
        raise
    print('Waiting for Hearth on 127.0.0.1:%d (saving to %s)' % (args.port, args.dir))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


if __name__ == '__main__':
    main()
