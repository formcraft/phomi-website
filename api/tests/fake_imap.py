# A tiny IMAP server for tests: serves the .eml files given on the command line, then exits.
import socket, sys, re
port = int(sys.argv[1]); files = sys.argv[2:]
msgs = {i + 1: open(f, 'rb').read() for i, f in enumerate(files)}
seen = set()
srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(('127.0.0.1', port)); srv.listen(1)
print('ready', flush=True)
for _ in range(2):  # the test connects twice: "test" and "run"
    c, _a = srv.accept(); f = c.makefile('rb')
    c.sendall(b'* OK fake IMAP ready\r\n')
    while True:
        line = f.readline()
        if not line: break
        tag, cmd = line.decode().strip().split(' ', 1)
        u = cmd.upper()
        if u.startswith('LOGIN'):
            ok = '"updates@phomi.test" "secret pass"' in cmd
            c.sendall(f'{tag} {"OK" if ok else "NO"} LOGIN\r\n'.encode())
        elif u.startswith('SELECT'):
            c.sendall(f'* {len(msgs)} EXISTS\r\n{tag} OK [READ-WRITE] SELECT\r\n'.encode())
        elif u.startswith('UID SEARCH'):
            ids = ' '.join(str(i) for i in msgs if i not in seen)
            c.sendall(f'* SEARCH {ids}\r\n{tag} OK SEARCH\r\n'.encode())
        elif u.startswith('UID FETCH'):
            uid = int(cmd.split()[2]); body = msgs[uid]
            c.sendall(f'* {uid} FETCH (UID {uid} BODY[] {{{len(body)}}}\r\n'.encode() + body + f')\r\n{tag} OK FETCH\r\n'.encode())
        elif u.startswith('UID STORE'):
            seen.add(int(cmd.split()[2])); c.sendall(f'{tag} OK STORE\r\n'.encode())
        elif u.startswith('LOGOUT'):
            c.sendall(b'* BYE\r\n' + f'{tag} OK LOGOUT\r\n'.encode()); break
        else:
            c.sendall(f'{tag} BAD\r\n'.encode())
    c.close()
