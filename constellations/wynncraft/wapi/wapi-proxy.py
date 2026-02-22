from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

HOST = "127.0.0.1"
PORT = 8787
UPSTREAM_BASE = "https://api.wynncraft.com"
UPSTREAM_PREFIX = "/v3"


class WapiProxyHandler(BaseHTTPRequestHandler):
    server_version = "WapiProxy/1.0"

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if not self.path.startswith(UPSTREAM_PREFIX):
            self.send_json(404, b'{"error":"Use /v3/* paths"}')
            return

        upstream_url = self.build_upstream_url(self.path)

        try:
            request = Request(
                upstream_url,
                method="GET",
                headers={
                    "Accept": "application/json",
                    "User-Agent": "Atlas-Of-Constellations-WAPI-Proxy/1.0"
                }
            )

            with urlopen(request, timeout=20) as response:
                body = response.read()
                content_type = response.headers.get("Content-Type", "application/json")
                self.send_response(response.status)
                self.send_cors_headers()
                self.send_header("Content-Type", content_type)
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except HTTPError as error:
            body = error.read() if error.fp else b'{"error":"Upstream HTTP error"}'
            content_type = error.headers.get("Content-Type", "application/json") if error.headers else "application/json"
            self.send_response(error.code)
            self.send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.end_headers()
            self.wfile.write(body)
        except URLError as error:
            message = f'{{"error":"Upstream unreachable","details":"{str(error.reason)}"}}'.encode("utf-8")
            self.send_json(502, message)
        except Exception as error:
            message = f'{{"error":"Proxy failure","details":"{str(error)}"}}'.encode("utf-8")
            self.send_json(500, message)

    def build_upstream_url(self, incoming_path):
        parts = urlsplit(incoming_path)
        path = parts.path
        if not path.startswith(UPSTREAM_PREFIX):
            path = f"{UPSTREAM_PREFIX}{path}"

        return urlunsplit(("https", "api.wynncraft.com", path, parts.query, ""))

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Vary", "Origin")

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(payload)


def run():
    server = ThreadingHTTPServer((HOST, PORT), WapiProxyHandler)
    print(f"WAPI proxy listening on http://{HOST}:{PORT}")
    print("Forwarding /v3/* -> https://api.wynncraft.com/v3/*")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping WAPI proxy...")
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
