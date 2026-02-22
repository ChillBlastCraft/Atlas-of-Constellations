import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UPSTREAM_BASE = 'https://api.wynncraft.com'
PORT = int(os.environ.get('WAPI_PROXY_PORT', '8765'))


class WapiProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        self._proxy_request()

    def do_POST(self):
        self._proxy_request()

    def _proxy_request(self):
        if self.path == '/health':
            self._send_json(200, {'ok': True, 'service': 'wapi_proxy'})
            return

        target_url = f'{UPSTREAM_BASE}{self.path}'
        content_length = int(self.headers.get('Content-Length', '0') or 0)
        body = self.rfile.read(content_length) if content_length > 0 else None

        upstream_headers = {}
        if self.headers.get('Content-Type'):
            upstream_headers['Content-Type'] = self.headers.get('Content-Type')

        request = urllib.request.Request(
            target_url,
            data=body,
            headers=upstream_headers,
            method=self.command,
        )

        try:
            with urllib.request.urlopen(request, timeout=45) as upstream_response:
                response_body = upstream_response.read()
                status_code = upstream_response.status
                response_headers = upstream_response.headers
        except urllib.error.HTTPError as error:
            response_body = error.read()
            status_code = error.code
            response_headers = error.headers
        except Exception as error:
            self._send_json(502, {
                'error': 'Proxy request failed',
                'message': str(error),
                'target': target_url
            })
            return

        self.send_response(status_code)
        self._set_cors_headers()

        passthrough_header_names = {
            'Content-Type',
            'Cache-Control',
            'Expires',
            'Date',
            'Version',
            'RateLimit-Remaining',
            'RateLimit-Reset',
            'RateLimit-Limit',
        }

        for header_name, header_value in response_headers.items():
            if header_name in passthrough_header_names:
                self.send_header(header_name, header_value)

        self.end_headers()
        self.wfile.write(response_body)

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self._set_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', PORT), WapiProxyHandler)
    print(f'WAPI local proxy listening on http://127.0.0.1:{PORT}')
    print('Health check: http://127.0.0.1:{}/health'.format(PORT))
    server.serve_forever()