<?php
declare(strict_types=1);

// Minimal IMAP client (TLS on port 993). Works without PHP's imap extension, which newer PHP versions dropped.
final class Imap
{
    private $s;
    private int $n = 0;

    public function __construct(string $host, int $port, string $user, string $pass, int $timeout = 30)
    {
        $scheme = ($port === 143 || (config('debug') && $host === '127.0.0.1')) ? 'tcp' : 'ssl';
        $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true]]);
        $this->s = @stream_socket_client("$scheme://$host:$port", $errno, $err, $timeout, STREAM_CLIENT_CONNECT, $ctx);
        if (!$this->s) throw new ApiError(502, "Could not connect to the mailbox ($host:$port): $err");
        stream_set_timeout($this->s, $timeout);
        $this->line(); // greeting
        $this->cmd('LOGIN ' . $this->quote($user) . ' ' . $this->quote($pass), 'Mailbox sign-in failed. Check the address and password in Settings.');
    }

    public function select(string $box = 'INBOX'): void
    {
        $this->cmd('SELECT ' . $this->quote($box));
    }

    /** @return int[] */
    public function unseen(): array
    {
        $ids = [];
        foreach ($this->cmd('UID SEARCH UNSEEN') as $l) {
            if (str_starts_with($l, '* SEARCH')) {
                foreach (preg_split('/\s+/', trim(substr($l, 8))) as $id) if ($id !== '') $ids[] = (int)$id;
            }
        }
        sort($ids);
        return $ids;
    }

    public function fetch(int $uid): string
    {
        $tag = $this->send("UID FETCH $uid BODY.PEEK[]");
        $raw = '';
        while (true) {
            $l = $this->line();
            if (preg_match('/\{(\d+)\}\r\n$/', $l, $m)) {
                $raw = $this->read((int)$m[1]);
                continue;
            }
            if (str_starts_with($l, "$tag ")) {
                if (!str_starts_with($l, "$tag OK")) throw new ApiError(502, 'Could not read an email: ' . trim($l));
                break;
            }
        }
        return $raw;
    }

    public function markSeen(int $uid): void
    {
        $this->cmd("UID STORE $uid +FLAGS.SILENT (\\Seen)");
    }

    public function close(): void
    {
        if ($this->s) {
            @fwrite($this->s, 'Z LOGOUT' . "\r\n");
            @fclose($this->s);
            $this->s = null;
        }
    }

    public function __destruct()
    {
        $this->close();
    }

    private function quote(string $v): string
    {
        return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $v) . '"';
    }

    private function send(string $command): string
    {
        $tag = 'A' . (++$this->n);
        fwrite($this->s, "$tag $command\r\n");
        return $tag;
    }

    private function cmd(string $command, string $fail = ''): array
    {
        $tag = $this->send($command);
        $lines = [];
        while (true) {
            $l = $this->line();
            if (preg_match('/\{(\d+)\}\r\n$/', $l, $m)) {
                $l .= $this->read((int)$m[1]);
            }
            if (str_starts_with($l, "$tag ")) {
                if (!str_starts_with($l, "$tag OK")) throw new ApiError(502, $fail ?: ('Mailbox error: ' . trim($l)));
                return $lines;
            }
            $lines[] = rtrim($l);
        }
    }

    private function line(): string
    {
        $l = fgets($this->s);
        if ($l === false) throw new ApiError(502, 'The mailbox closed the connection.');
        return $l;
    }

    private function read(int $len): string
    {
        $buf = '';
        while (strlen($buf) < $len) {
            $chunk = fread($this->s, min(65536, $len - strlen($buf)));
            if ($chunk === false || $chunk === '') throw new ApiError(502, 'The mailbox closed the connection.');
            $buf .= $chunk;
        }
        return $buf;
    }
}
