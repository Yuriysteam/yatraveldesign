"""Serve the unpacked prototype on loopback using Python's standard library."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Start the adaptive filters prototype")
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent

    class Handler(SimpleHTTPRequestHandler):
        extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                          ".mjs": "text/javascript", ".js": "text/javascript"}

    with ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(root))) as server:
        url = f"http://127.0.0.1:{server.server_port}/index.html"
        print(f"Prototype: {url}\nPress Ctrl+C to stop.", flush=True)
        if not args.no_browser:
            threading.Timer(0.3, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
