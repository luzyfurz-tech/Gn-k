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

  const sendCommand = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + "\r");
    }
  };

  const SHORTCUTS = [
    { label: "Network Sweep", cmd: "nmap -sn 192.168.1.0/24" },
    { label: "Port Scan", cmd: "nmap -sV -T4 " },
    { label: "Web Scan", cmd: "nikto -h http://localhost" },
    { label: "Directory Brute", cmd: "gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt" },
    { label: "Process Monitor", cmd: "htop" },
    { label: "Check Logs", cmd: "tail -f /var/log/syslog" },
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
                onClick={() => sendCommand(s.cmd)}
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
