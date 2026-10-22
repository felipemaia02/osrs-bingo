import socket

from app.server import dual_stack_socket


def test_server_socket_accepts_ipv4_clients() -> None:
    server = dual_stack_socket(0)
    server.listen()
    port = server.getsockname()[1]
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            pass
    finally:
        server.close()
