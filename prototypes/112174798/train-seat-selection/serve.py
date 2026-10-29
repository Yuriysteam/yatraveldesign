from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import sys
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8780
root = Path(__file__).resolve().parent
print(f"Prototype: http://127.0.0.1:{port}/", flush=True)
print(f"Screens: http://127.0.0.1:{port}/screens.html", flush=True)
try:
    ThreadingHTTPServer(("127.0.0.1", port), partial(SimpleHTTPRequestHandler, directory=str(root))).serve_forever()
except KeyboardInterrupt:
    pass
