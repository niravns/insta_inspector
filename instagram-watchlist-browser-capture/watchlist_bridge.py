#!/usr/bin/env python3
"""Local-only bridge from the Chrome extension to the existing Watchlist MCP."""
from __future__ import annotations

import importlib.util
import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

SERVER_PATH = Path(os.environ.get(
    "IG_WATCHLIST_SERVER",
    "/Users/niravs/instagram_watchlist_mcp/server.py",
))
PORT = 8765

spec = importlib.util.spec_from_file_location("instagram_watchlist_server", SERVER_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Cannot load Watchlist server at {SERVER_PATH}")
watchlist = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watchlist)


class Handler(BaseHTTPRequestHandler):
    def _extension_request(self) -> bool:
        origin = self.headers.get("Origin", "")
        if not origin.startswith("chrome-extension://"):
            self.send_error(403, "Chrome extension requests only")
            return False
        return True

    def do_OPTIONS(self) -> None:
        if not self._extension_request():
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers["Origin"])
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/capture":
            self.send_error(404)
            return
        origin = self.headers.get("Origin", "")
        if not origin.startswith("chrome-extension://"):
            self.send_error(403, "Chrome extension requests only")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096:
                raise ValueError("Invalid request size")
            payload = json.loads(self.rfile.read(length))
            url = payload.get("url", "")
            if not isinstance(url, str) or not re.fullmatch(
                r"https://www\.instagram\.com/reels?/[A-Za-z0-9_-]+/?", url
            ):
                raise ValueError("Expected an Instagram Reel URL")
            result = watchlist.add_reel(url=url)
            response = {"saved": True, "url": result["item"]["url"]}
            status = 200
        except Exception as exc:
            response = {"error": str(exc)}
            status = 400

        encoded = json.dumps(response).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args: object) -> None:
        print("Watchlist bridge:", format % args)


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Watchlist browser capture listening on http://127.0.0.1:{PORT}")
    print(f"Using Watchlist server: {SERVER_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nWatchlist browser capture stopped.")
    finally:
        server.server_close()
