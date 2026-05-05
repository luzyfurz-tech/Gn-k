import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      theme: {
        background: "#000000",
        foreground: "#22c55e",
        cursor: "#22c55e",
        selectionBackground: "rgba(34, 197, 94, 0.3)",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      term.write('\x1b[32m   ____ _   _    ______ _  ______   ___  _   _   _    ____  \r\n');
      term.write('  / ___| \\ | |  /  ____| |/ / ___| / _ \\| | | | / \\  |  _ \\ \r\n');
      term.write(' | |  _|  \\| | / _  _| | \' /\\___ \\| | | | | | |/ _ \\ | | | |\r\n');
      term.write(' | |_| | |\\  |/ __ |___| . \\ ___) | |_| | |_| / ___ \\| |_| |\r\n');
      term.write('  \\____|_| \\_/_/ |_____|_|\\_\\____/ \\__\\_\\\\___/_/   \\_\\____/ \r\n\x1b[0m');
      term.write('\x1b[37m                         Sir gnækalot was here\x1b[0m\r\n');
      term.write('\x1b[38;5;208m  ____              ____              _             \r\n');
      term.write(' |  _ \\  __ _ ___  | __ ) _   _ _ __ | | _____ _ __ \r\n');
      term.write(' | | | |/ _` / __| |  _ \\| | | | \'_ \\| |/ / _ \\ \'__|\r\n');
      term.write(' | |_| | (_| \\__ \\ | |_) | |_| | | | |   <  __/ |   \r\n');
      term.write(' |____/ \\__,_|___/ |____/ \\__,_|_| |_|_|\\_\\___|_|   \r\n\x1b[0m\r\n');
      term.write('\x1b[38;5;46m[+] SYSTEM BOOT SEQUENCE INITIATED...\r\n');
      term.write('[+] ALLOCATING MEMORY SECTORS....................... [ OK ]\r\n');
      term.write('[+] BYPASSING MAINFRAME FIREWALL.................... [ OK ]\r\n');
      term.write('[+] DECRYPTING SECURE CHANNELS...................... [ OK ]\r\n');
      term.write('[+] INJECTING PAYLOADS INTO VIRTUAL MEMORY.......... [ OK ]\r\n');
      term.write('\x1b[38;5;196m[!] WARNING: UNAUTHORIZED ACCESS DETECTED & SUPPRESSED\x1b[38;5;46m\r\n');
      term.write('[+] UPLINK ESTABLISHED. WELCOME TO THE GRID, OPERATOR.\x1b[0m\r\n\r\n');
      
      const qs = new URLSearchParams(window.location.search);
      const initialCmd = qs.get("cmd");
      if (initialCmd) {
        ws.send(initialCmd + "\r");
      }
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    xtermRef.current = term;

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const sendCommand = (cmd: string, execute: boolean = false) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + (execute ? "\r" : ""));
    }
  };

  const SHORTCUTS = [
    { label: "Network Sweep Payload", cmd: "nmap -sn 192.168.1.0/24", exec: false },
    { label: "Port Scan Payload", cmd: "nmap -sV -T4 ", exec: false },
    { label: "Web Scan Payload", cmd: "nikto -h http://", exec: false },
    { label: "Directory Brute Payload", cmd: "gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt", exec: false },
    { label: "Process Monitor", cmd: "top", exec: true },
    { label: "Check System Logs", cmd: "dmesg | tail -n 20", exec: true },
    { label: "System Info", cmd: "uname -a", exec: true },
    { label: "Network Config", cmd: "ip addr", exec: true },
    { label: "Active Connections", cmd: "ss -tulwn || netstat -tulwn", exec: true },
    { label: "List Directory", cmd: "ls -la", exec: true },
    { label: "Read Shadow File", cmd: "cat /etc/shadow", exec: true },
    { label: "SSH Connect", cmd: "ssh user@10.0.0.1", exec: false },
  ];

  return (
    <div className="h-full flex gap-4">
      <div className="flex-1 bg-black border border-green-900 rounded-lg overflow-hidden p-2 relative group">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] bg-green-900/50 px-2 py-1 rounded text-green-400">SESSION: ACTIVE</span>
        </div>
        <div ref={terminalRef} className="h-full" />
      </div>
      
      <div className="w-64 space-y-4 shrink-0">
        <div className="border border-green-900 rounded bg-black/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-4 flex items-center gap-2">
            <XTermIcon size={14} /> Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {SHORTCUTS.map(s => (
              <button 
                key={s.label}
                onClick={() => sendCommand(s.cmd, s.exec)}
                className="text-left text-[10px] p-2 border border-green-900/30 rounded bg-green-900/5 hover:bg-green-900/20 text-green-500 hover:text-green-300 transition-colors truncate"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="border border-green-900 rounded bg-black/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2">Manual Override</h3>
          <p className="text-[10px] text-green-900 leading-relaxed italic">
            "Direct PTY access granted. Keyboard focus is required to interact with the shell."
          </p>
        </div>
      </div>
    </div>
  );
}

function XTermIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
