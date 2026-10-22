"""Production entry point: one dual-stack socket so Railway's private network
(IPv6, and IPv4 in newer environments) and its health checks can reach the API.

uvicorn's own ``--host ::`` creates an IPv6-only socket, so the socket is opened here.
"""

import os
import socket

import uvicorn

DEFAULT_PORT = 8000


def dual_stack_socket(port: int) -> socket.socket:
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        address: tuple[str, int] = ("::", port)
    except OSError:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        address = ("0.0.0.0", port)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(address)
    sock.set_inheritable(True)
    return sock


def main() -> None:
    config = uvicorn.Config(
        "app.main:app",
        # Private service: only the web proxy reaches it, and it forwards the client IP.
        proxy_headers=True,
        forwarded_allow_ips="*",
        server_header=False,
    )
    sock = dual_stack_socket(int(os.environ.get("PORT", DEFAULT_PORT)))
    uvicorn.Server(config).run(sockets=[sock])


if __name__ == "__main__":
    main()
