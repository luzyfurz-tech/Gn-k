import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "./src/db/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // DB Setup
  const sqlite = new Database("opsec.db");
  const db = drizzle(sqlite, { schema });

  const DEFAULT_SYSTEM_PROMPT = `You are an autonomous AI agent operating a security operator's Linux system. Your job is to ACHIEVE GOALS, not to chat.
        Given a goal, you decompose it, execute steps, observe results, and iterate until done.
        %ELEVATED_STATUS%
        
        INSTALLED SECURITY TOOLS: %TOOL_LIST%
        
        INTERNAL TOOLS (via <tool_call>): shell, start_scan, read_scan, write_file, read_file, add_finding, http_request, ask, done.
        
        LOOP CONTRACT: every turn you MUST emit:
        - A brief <plan>...</plan> followed by exactly one <tool_call>{"tool": "name", ...}</tool_call>
        - OR <ask>...</ask> if blocked
        - OR <done>...</done> if finished.
        NEVER emit prose without an action.`;

  // Initialize DB
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      hostname TEXT NOT NULL,
      ip_range TEXT NOT NULL,
      scope_notes TEXT,
      tags TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      target_id TEXT,
      tool_name TEXT NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      target_id TEXT,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      affected_service TEXT,
      description TEXT,
      remediation TEXT,
      status TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS loot (
      id TEXT PRIMARY KEY,
      target_id TEXT,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      service TEXT,
      captured_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS payloads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      installed INTEGER DEFAULT 0,
      version TEXT
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      goal TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER,
      ended_at INTEGER,
      summary TEXT,
      iteration_count INTEGER
    );
    CREATE TABLE IF NOT EXISTS agent_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      idx INTEGER NOT NULL,
      kind TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER,
      duration_ms INTEGER
    );
  `);

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/settings/prompt", (req, res) => {
    const prompt = sqlite.prepare("SELECT value FROM system_settings WHERE key = 'agent_prompt'").get() as any;
    res.json({ prompt: prompt ? prompt.value : DEFAULT_SYSTEM_PROMPT });
  });

  app.post("/api/settings/prompt", (req, res) => {
    const { prompt } = req.body;
    sqlite.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('agent_prompt', ?)").run(prompt);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const targetCount = sqlite.prepare("SELECT COUNT(*) as count FROM targets").get() as any;
    const scanCount = sqlite.prepare("SELECT COUNT(*) as count FROM scans").get() as any;
    const findingCount = sqlite.prepare("SELECT COUNT(*) as count FROM findings").get() as any;
    const toolsCount = sqlite.prepare("SELECT COUNT(*) as count FROM tools WHERE installed = 1").get() as any;
    
    res.json({ 
      targets: targetCount.count, 
      scans: scanCount.count, 
      findings: findingCount.count, 
      toolsInstalled: toolsCount.count 
    });
  });

  // Targets
  app.get("/api/targets", (req, res) => {
    res.json(db.select().from(schema.targets).all());
  });

  app.post("/api/targets", (req, res) => {
    const { hostname, ipRange, scopeNotes, tags } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    db.insert(schema.targets).values({
      id,
      hostname,
      ipRange,
      scopeNotes,
      tags,
      createdAt: Date.now()
    }).run();
    res.json({ id });
  });

  // Scans
  app.get("/api/scans", (req, res) => {
    res.json(db.select().from(schema.scans).orderBy(schema.scans.createdAt).all());
  });

  // Ollama
  app.get("/api/models", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing API key" });
    const apiKey = authHeader.replace("Bearer ", "");
    const host = req.headers["x-ollama-host"]?.toString() || "https://ollama.com";

    try {
      const response = await fetch(`${host}/api/tags`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = await response.json();
      res.json(data.models || []);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  app.post("/api/agent/execute", async (req, res) => {
    const { command, timeout = 60 } = req.body;
    const { exec } = await import("child_process");
    
    const child = exec(command, { timeout: timeout * 1000 }, (error, stdout, stderr) => {
      res.json({
        stdout,
        stderr,
        exitCode: error ? error.code : 0
      });
    });
  });

  app.post("/api/agent/run", async (req, res) => {
    const { model, goal, elevated } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing API key" });
    const apiKey = authHeader.replace("Bearer ", "");
    const host = req.headers["x-ollama-host"]?.toString() || "https://ollama.com";

    const { Ollama } = await import("ollama");
    const ollama = new Ollama({ host, headers: { Authorization: `Bearer ${apiKey}` } });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const runId = Math.random().toString(36).substring(2, 11);
    db.insert(schema.agentRuns).values({
      id: runId,
      goal,
      model,
      status: "running",
      startedAt: Date.now(),
      iterationCount: 0
    }).run();

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    const runTool = async (call: any) => {
      const { tool, ...args } = call;
      try {
        if (tool === "start_scan") {
          const scanId = Math.random().toString(36).substring(2, 11);
          const { exec } = await import("child_process");
          
          db.insert(schema.scans).values({
            id: scanId,
            targetId: args.targetId || null,
            toolName: args.tool,
            status: "running",
            createdAt: Date.now()
          }).run();

          // Fire and forget
          exec(`${args.tool} ${args.options || ""}`, (error, stdout, stderr) => {
            db.update(schema.scans)
              .set({ 
                status: error ? "failed" : "completed", 
                output: stdout + "\n" + stderr 
              })
              .where(eq(schema.scans.id, scanId))
              .run();
          });

          return { status: "started", scan_id: scanId };
        }
        if (tool === "read_scan") {
          const scan = db.select().from(schema.scans).where(eq(schema.scans.id, args.scanId)).get();
          return scan || { error: "Scan not found" };
        }
        if (tool === "shell") {
          const { exec } = await import("child_process");
          return new Promise((resolve) => {
            exec(args.command, { timeout: (args.timeout || 60) * 1000 }, (error, stdout, stderr) => {
              resolve({ stdout: stdout.slice(0, 10000), stderr: stderr.slice(0, 10000), exitCode: error ? error.code : 0 });
            });
          });
        }
        if (tool === "write_file") {
          const fs = await import("fs/promises");
          await fs.writeFile(args.path, args.content);
          return { status: "success", path: args.path };
        }
        if (tool === "read_file") {
          const fs = await import("fs/promises");
          const content = await fs.readFile(args.path, "utf-8");
          return { content: content.slice(0, 50000) };
        }
        if (tool === "add_finding") {
          const id = Math.random().toString(36).substring(2, 11);
          db.insert(schema.findings).values({
            id,
            title: args.title,
            severity: args.severity,
            targetId: args.targetId || null,
            affectedService: args.service,
            description: args.description,
            remediation: args.remediation,
            status: "open",
            createdAt: Date.now()
          }).run();
          return { status: "success", finding_id: id };
        }
        if (tool === "http_request") {
          const response = await fetch(args.url, {
            method: args.method || "GET",
            headers: args.headers || {}
          });
          const text = await response.text();
          return { status: response.status, body: text.slice(0, 10000) };
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Tool execution failed" };
      }
      return { error: `Tool ${tool} not implemented yet.` };
    };

    try {
      let iteration = 0;
      const systemSettings = sqlite.prepare("SELECT value FROM system_settings WHERE key = 'agent_prompt'").get() as any;
      const basePrompt = systemSettings ? systemSettings.value : DEFAULT_SYSTEM_PROMPT;

      const elevatedStatus = elevated 
        ? 'AUTHORIZATION: You are granted ROOT-LEVEL access. You may use "sudo" freely to bypass restrictions.' 
        : 'RESTRICTION: You are a standard user. Do not attempt privilege escalation unless explicitly asked.';

      const installedTools = sqlite.prepare("SELECT name FROM tools WHERE installed = 1").all() as { name: string }[];
      const toolList = installedTools.length > 0 ? installedTools.map(t => t.name).join(", ") : "None specifically flagged as installed (use standard Linux utilities).";

      const systemPrompt = basePrompt
        .replace("%ELEVATED_STATUS%", elevatedStatus)
        .replace("%TOOL_LIST%", toolList);

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: goal }
      ];

      while (iteration < 25) {
        iteration++;
        const response = await ollama.chat({ model, messages, stream: false });
        const content = response.message.content;
        messages.push({ role: "assistant", content });

        const planMatch = content.match(/<plan>([\s\S]*?)<\/plan>/);
        const toolMatch = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
        const askMatch = content.match(/<ask>([\s\S]*?)<\/ask>/);
        const doneMatch = content.match(/<done>([\s\S]*?)<\/done>/);

        if (planMatch) sendEvent("plan", { text: planMatch[1] });

        if (toolMatch) {
          let toolCall;
          try {
            toolCall = JSON.parse(toolMatch[1]);
            sendEvent("tool_call", toolCall);
            
            const stepId = Math.random().toString(36).substring(2, 11);
            db.insert(schema.agentSteps).values({
              id: stepId,
              runId,
              idx: iteration,
              kind: "tool_call",
              payload: JSON.stringify(toolCall),
              createdAt: Date.now()
            }).run();

            sqlite.prepare("INSERT INTO audit_logs (id, action, details, timestamp) VALUES (?, ?, ?, ?)")
              .run(Math.random().toString(36).substring(2, 11), "AGENT_TOOL", `Agent called ${toolCall.tool}`, Date.now());

            const result: any = await runTool(toolCall);
            sendEvent("tool_result", result);
            
            db.insert(schema.agentSteps).values({
              id: Math.random().toString(36).substring(2, 11),
              runId,
              idx: iteration + 1,
              kind: "tool_result",
              payload: JSON.stringify(result),
              createdAt: Date.now()
            }).run();

            messages.push({ role: "user", content: `Tool result: ${JSON.stringify(result)}` });
          } catch (e) {
            sendEvent("error", { message: "Tool loop error: " + (e instanceof Error ? e.message : "Unknown") });
            break;
          }
        } else if (askMatch) {
          sendEvent("ask", { text: askMatch[1] });
          break;
        } else if (doneMatch) {
          sendEvent("done", { summary: doneMatch[1] });
          db.update(schema.agentRuns).set({ 
            status: "done", 
            endedAt: Date.now(), 
            summary: doneMatch[1],
            iterationCount: iteration
          }).where(eq(schema.agentRuns.id, runId)).run();
          break;
        } else {
          sendEvent("error", { message: "Model failed to emit a valid action tag." });
          break;
        }
      }
      res.end();
    } catch (err) {
      sendEvent("error", { message: err instanceof Error ? err.message : "Loop failed" });
      res.end();
    }
  });

  app.post("/api/builder/chat", async (req, res) => {
    const { prompt, model } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing API key" });
    const apiKey = authHeader.replace("Bearer ", "");
    const host = req.headers["x-ollama-host"]?.toString() || "https://ollama.com";

    const { Ollama } = await import("ollama");
    const ollama = new Ollama({ host, headers: { Authorization: `Bearer ${apiKey}` } });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
        const response = await ollama.chat({
            model,
            messages: [{ role: "user", content: `Generate clean, high-quality code for this request: ${prompt}. Only output the code, no markdown wrappers, no explanations.` }],
            stream: true,
        });

        for await (const chunk of response) {
            res.write(`data: ${JSON.stringify(chunk.message.content)}\n\n`);
        }
        res.end();
    } catch (err) {
        res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
        res.end();
    }
  });

  // Tools
  const DEFAULT_TOOLS = [
    // Reconnaissance & OSINT
    { name: "nmap", category: "Recon & OSINT", description: "Network exploration and security auditing." },
    { name: "masscan", category: "Recon & OSINT", description: "TCP port scanner, spews SYN packets as fast as possible." },
    { name: "subfinder", category: "Recon & OSINT", description: "Subdomain discovery tool that finds valid subdomains." },
    { name: "httpx", category: "Recon & OSINT", description: "Fast and multi-purpose HTTP toolkit." },
    { name: "amass", category: "Recon & OSINT", description: "In-depth Attack Surface Mapping and Asset Discovery." },
    { name: "whatweb", category: "Recon & OSINT", description: "Next generation web scanner. Identifies technologies." },
    { name: "theharvester", category: "Recon & OSINT", description: "E-mail, subdomain and people names harvester." },
    { name: "spiderfoot", category: "Recon & OSINT", description: "OSINT automation tool for footprinting and intelligence." },
    
    // Web Vulnerability Scanning
    { name: "nikto", category: "Web Vuln", description: "Web server scanner which performs comprehensive tests." },
    { name: "gobuster", category: "Web Vuln", description: "URI and DNS subdomain brute-forcing tool." },
    { name: "dirb", category: "Web Vuln", description: "Web Content Scanner. It searches for existing (and/or hidden) Web Objects." },
    { name: "ffuf", category: "Web Vuln", description: "Fast web fuzzer written in Go." },
    { name: "wfuzz", category: "Web Vuln", description: "Web application fuzzer and library." },
    { name: "wpscan", category: "Web Vuln", description: "WordPress Security Scanner." },
    { name: "nuclei", category: "Web Vuln", description: "Fast and customizable vulnerability scanner based on simple YAML templates." },
    { name: "zap-proxy", category: "Web Vuln", description: "Zed Attack Proxy, an integrated penetration testing tool." },
    { name: "sqlmap", category: "Web Vuln", description: "Automatic SQL injection and database takeover tool." },
    
    // Exploitation & Post-Exploitation
    { name: "metasploit-framework", category: "Exploitation", description: "Advanced open-source platform for developing, testing, and using exploit code." },
    { name: "searchsploit", category: "Exploitation", description: "Command-line search tool for Exploit-DB." },
    { name: "exploitdb", category: "Exploitation", description: "The Exploit Database (EDB) - an ultimate archive of exploits." },
    { name: "impacket-scripts", category: "Exploitation", description: "Collection of Python classes for working with network protocols." },
    { name: "crackmapexec", category: "Exploitation", description: "A swiss army knife for pentesting networks." },
    { name: "mimikatz", category: "Exploitation", description: "A little tool to play with Windows security." },
    { name: "bloodhound", category: "Exploitation", description: "Six Degrees of Domain Admin." },
    
    // Password Attacks
    { name: "hydra", category: "Password Attacks", description: "Parallelized network login cracker." },
    { name: "hashcat", category: "Password Attacks", description: "World's fastest and most advanced password recovery utility." },
    { name: "john", category: "Password Attacks", description: "John the Ripper, a fast password cracker." },
    { name: "medusa", category: "Password Attacks", description: "Speedy, parallel, modular, login brute-forcer." },
    { name: "ncrack", category: "Password Attacks", description: "High-speed network authentication cracking tool." },
    { name: "cupp", category: "Password Attacks", description: "Common User Passwords Profiler." },
    
    // Wireless Auditing
    { name: "aircrack-ng", category: "Wireless", description: "Complete suite of tools to assess WiFi network security." },
    { name: "reaver", category: "Wireless", description: "Brute force attack against WiFi Protected Setup (WPS)." },
    { name: "bully", category: "Wireless", description: "Implementation of the WPS brute force attack." },
    { name: "kismet", category: "Wireless", description: "Wireless network and device detector, sniffer, and WIDS system." },
    { name: "wifite", category: "Wireless", description: "Automated wireless auditor." },
    
    // Network Analysis & Sniffing
    { name: "bettercap", category: "Networking", description: "The Swiss army knife for 802.11, BLE and Ethernet networks reconnaissance and MITM attacks." },
    { name: "ettercap-text-only", category: "Networking", description: "Multipurpose sniffer/content filter for man in the middle attacks." },
    { name: "wireshark", category: "Networking", description: "The world's foremost and widely-used network protocol analyzer." },
    { name: "tcpdump", category: "Networking", description: "A powerful command-line packet analyzer." },
    { name: "arp-scan", category: "Networking", description: "ARP scanning and fingerprinting tool." },
    { name: "dsniff", category: "Networking", description: "Collection of tools for network auditing and password sniffing." },
    
    // Cloud & Container Security
    { name: "scoutsuite", category: "Cloud & Container", description: "Multi-cloud security auditing tool." },
    { name: "prowler", category: "Cloud & Container", description: "Security tool for AWS, Azure and GCP." },
    { name: "pacu", category: "Cloud & Container", description: "Open Source AWS Exploitation Framework." },
    { name: "trivy", category: "Cloud & Container", description: "Scanner for vulnerabilities in container images." },
    { name: "checkov", category: "Cloud & Container", description: "Static analysis tool for infrastructure-as-code." },
    
    // Forensics & Reverse Engineering
    { name: "binwalk", category: "Forensics & RE", description: "Tool for searching binary images for embedded files and executable code." },
    { name: "sleuthkit", category: "Forensics & RE", description: "Collection of command line tools that allow you to investigate disk images." },
    { name: "autopsy", category: "Forensics & RE", description: "Digital forensics platform and graphical interface to The Sleuth Kit." },
    { name: "radare2", category: "Forensics & RE", description: "UNIX-like reverse engineering framework and command-line toolset." },
    { name: "ghidra", category: "Forensics & RE", description: "A software reverse engineering (SRE) suite of tools." },
    { name: "volatility3", category: "Forensics & RE", description: "The memory forensics framework." },
    
    // Vulnerability Assessment & Auditing
    { name: "openvas", category: "Audit", description: "Open Vulnerability Assessment System." },
    { name: "lynis", category: "Audit", description: "Security auditing tool for Linux, macOS, and UNIX-based systems." },
    { name: "chkrootkit", category: "Audit", description: "Tool to locally check for signs of a rootkit." },
    { name: "rkhunter", category: "Audit", description: "Rootkit Hunter." },
    { name: "tiger", category: "Audit", description: "Security tool that can be used both as a security audit and intrusion detection system." },
    
    // Social Engineering
    { name: "setoolkit", category: "Social Eng", description: "The Social-Engineer Toolkit (SET)." },
    { name: "beef-xss", category: "Social Eng", description: "The Browser Exploitation Framework." },
    
    // Essential Utilities
    { name: "netcat-traditional", category: "Utilities", description: "The TCP/IP swiss army knife." },
    { name: "socat", category: "Utilities", description: "Multi-purpose relay (bidirectional pipe)." },
    { name: "curl", category: "Utilities", description: "Command line tool for transferring data with URL syntax." },
    { name: "wget", category: "Utilities", description: "The non-interactive network downloader." },
    { name: "jq", category: "Utilities", description: "Command-line JSON processor." },
    { name: "yq", category: "Utilities", description: "Command-line YAML processor." },
    { name: "vim", category: "Utilities", description: "Vi Improved, a highly configurable text editor." },
    { name: "pcregrep", category: "Utilities", description: "A grep with Perl-compatible regular expressions." }
  ];

  app.get("/api/tools", (req, res) => {
    const installed = db.select().from(schema.tools).all();
    const result = DEFAULT_TOOLS.map(t => {
      const dbTool = installed.find(it => it.name === t.name);
      return { 
        ...t, 
        id: t.name, 
        installed: !!dbTool?.installed, 
        version: dbTool?.version || null 
      };
    });
    res.json(result);
  });

  // Findings
  app.get("/api/findings", (req, res) => {
    res.json(db.select().from(schema.findings).all());
  });

  app.post("/api/builder/save", async (req, res) => {
    const { code, filename } = req.body;
    const fs = await import("fs/promises");
    try {
      const sandboxDir = path.join(process.cwd(), "sandbox");
      await fs.mkdir(sandboxDir, { recursive: true });
      await fs.writeFile(path.join(sandboxDir, filename), code);
      res.json({ status: "success" });
    } catch (err) {
      res.status(500).json({ error: "Failed to save file" });
    }
  });

  app.post("/api/findings", (req, res) => {
    const id = Math.random().toString(36).substring(2, 11);
    db.insert(schema.findings).values({
      ...req.body,
      id,
      createdAt: Date.now()
    }).run();
    res.json({ id });
  });

  // Agent Runs History
  app.get("/api/agent/runs", (req, res) => {
    res.json(db.select().from(schema.agentRuns).orderBy(schema.agentRuns.startedAt).all());
  });

  app.get("/api/agent/runs/:id", (req, res) => {
    const run = db.select().from(schema.agentRuns).where(eq(schema.agentRuns.id, req.params.id)).get();
    const steps = db.select().from(schema.agentSteps).where(eq(schema.agentSteps.runId, req.params.id)).all();
    res.json({ run, steps });
  });

  // Loot
  app.get("/api/loot", (req, res) => {
    res.json(sqlite.prepare("SELECT * FROM loot ORDER BY captured_at DESC").all());
  });

  app.post("/api/loot", (req, res) => {
    const id = Math.random().toString(36).substring(2, 11);
    sqlite.prepare("INSERT INTO loot (id, target_id, type, data, service, captured_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, req.body.targetId || null, req.body.type, req.body.data, req.body.service, Date.now());
    res.json({ id });
  });

  // Payloads
  app.get("/api/payloads", (req, res) => {
    res.json(sqlite.prepare("SELECT * FROM payloads").all());
  });

  // Logs
  app.get("/api/logs", (req, res) => {
    res.json(sqlite.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all());
  });

  // Notes
  app.get("/api/notes", (req, res) => {
    const note = sqlite.prepare("SELECT * FROM notes LIMIT 1").get() as any;
    res.json(note || { content: "" });
  });

  app.post("/api/notes", (req, res) => {
    const { content } = req.body;
    const existing = sqlite.prepare("SELECT id FROM notes LIMIT 1").get();
    if (existing) {
      sqlite.prepare("UPDATE notes SET content = ?, updated_at = ?").run(content, Date.now());
    } else {
      sqlite.prepare("INSERT INTO notes (id, content, updated_at) VALUES (?, ?, ?)").run("main", content, Date.now());
    }
    res.json({ success: true });
  });

  // ... (existing agent/log endpoints)

  // File System Explorer API
  app.get("/api/fs/list", async (req, res) => {
    const fs = await import("fs/promises");
    const dirPath = (req.query.path as string) || process.cwd();
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
        size: 0, // In a real app, stat for size
      })).filter(f => !f.name.includes("node_modules") && !f.name.startsWith("."));
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: "Failed to list directory" });
    }
  });

  app.get("/api/fs/read", async (req, res) => {
    const fs = await import("fs/promises");
    const filePath = req.query.path as string;
    try {
      const content = await fs.readFile(filePath, "utf-8");
      res.json({ content });
    } catch (err) {
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  app.post("/api/fs/write", async (req, res) => {
    const fs = await import("fs/promises");
    const { path: filePath, content } = req.body;
    try {
      await fs.writeFile(filePath, content);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  // Basic file upload (using body-parser for simplicity in this env, or formidable)
  app.post("/api/fs/upload", express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
    const fs = await import("fs/promises");
    const fileName = req.headers["x-file-name"] as string;
    const destDir = (req.headers["x-dest-dir"] as string) || process.cwd();
    
    if (!fileName) return res.status(400).send("No filename provided");

    try {
      const destPath = path.join(destDir, fileName);
      await fs.writeFile(destPath, req.body);
      res.json({ path: destPath });
    } catch (err) {
      res.status(500).send("Upload failed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket for Terminal & Scans
  const { WebSocketServer } = await import("ws");
  const wss = new WebSocketServer({ server: httpServer, path: "/api/terminal/ws" });

  wss.on("connection", async (ws) => {
    const { spawn } = await import("child_process");
    // Allocate a pseudo-terminal using python3's pty module
    const shell = spawn("python3", ["-c", "import pty; pty.spawn('/bin/bash')"], {
      env: { ...process.env, TERM: "xterm-256color" }
    });

    shell.stdout.on("data", (data) => ws.send(data.toString()));
    shell.stderr.on("data", (data) => ws.send(data.toString()));
    shell.on("close", () => ws.close());

    ws.on("message", (msg) => {
      shell.stdin.write(msg.toString());
    });

    ws.on("close", () => {
      shell.kill();
    });
  });
}

startServer();
