import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Send, FileCode, Bot, Maximize2, Play, Code, Save } from "lucide-react";
import ModelSelector from "../components/ModelSelector";

export default function Builder() {
  const [code, setCode] = useState("// Start coding your exploit or utility script...");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<{role: string, content: string}[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("builder_model") || "");
  const [filename, setFilename] = useState("script.py");
  const [language, setLanguage] = useState("python");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleChat = async () => {
    if (!prompt || !selectedModel) {
      console.error("Prompt or model not selected");
      return;
    }
    
    setHistory(prev => [...prev, { role: "user", content: prompt }]);
    const currentPrompt = prompt;
    setPrompt(""); // Clear input
    setCode(""); // Clear editor
    
    // Auto-detect language
    const lowerPrompt = currentPrompt.toLowerCase();
    if (lowerPrompt.includes("html") || lowerPrompt.includes("website") || lowerPrompt.includes("web page")) {
        setLanguage("html");
        setFilename(prev => prev.endsWith('.py') ? 'index.html' : prev);
    } else if (lowerPrompt.includes("bash") || lowerPrompt.includes("shell script")) {
        setLanguage("shell");
        setFilename(prev => prev.endsWith('.py') ? 'script.sh' : prev);
    }

    try {
        const apiKey = localStorage.getItem("ollama_api_key");
        const host = localStorage.getItem("ollama_host") || "https://ollama.com";
        const provider = localStorage.getItem("ai_provider") || "ollama";
        const response = await fetch("/api/builder/chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "x-ollama-host": host,
                "x-ai-provider": provider
            },
            body: JSON.stringify({ prompt: currentPrompt, model: selectedModel })
        });
        
        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n\n");
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.replace("data: ", ""));
                        if (typeof data === 'string') {
                            setCode(prev => prev + data);
                        } else if (data.error) {
                            console.error("Agent error:", data.error);
                            setCode(prev => prev + `\n# ERROR: ${data.error}\n`);
                        }
                    } catch (e) { console.error("Parse error", e); }
                }
            }
        }
        setHistory(prev => [...prev, { role: "assistant", content: "Generated code in editor." }]);
    } catch (e) {
        console.error("Builder chat failed", e);
        setHistory(prev => [...prev, { role: "assistant", content: "Failed to generate code." }]);
    }
  };

  const saveFile = async () => {
    try {
      const response = await fetch("/api/builder/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, filename })
      });
      if (response.ok) alert("Saved to sandbox directory!");
      else alert("Failed to save.");
    } catch (e) {
      alert("Error saving file.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4 overflow-hidden">
      {/* AI Chat Pane */}
      <div className="w-80 flex flex-col border border-green-900 rounded bg-black/40 overflow-hidden">
        <div className="p-3 border-b border-green-900 bg-green-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <Bot size={14} /> Architect
          </div>
          <div className="w-32">
            <ModelSelector type="builder" onSelect={setSelectedModel} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          <div className="text-xs text-green-700 italic border-b border-green-900/30 pb-4">
            "Describe a script or tool you need. The Architect will generate the code directly into the editor. Adjust language and filename before generating or saving."
          </div>
          
          {history.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-2 rounded text-xs max-w-[90%] ${msg.role === 'user' ? 'bg-green-900/20 border border-green-900 text-green-300' : 'text-green-500'}`}>
                      {msg.content}
                  </div>
              </div>
          ))}
        </div>
        <div className="p-3 border-t border-green-900 bg-black">
          <div className="flex gap-2">
            <input 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask for code..."
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              className="flex-1 bg-green-900/10 border border-green-900 rounded p-2 text-xs text-green-100 focus:outline-none focus:border-green-500"
            />
            <button onClick={handleChat} className="bg-green-900 p-2 rounded hover:bg-green-800">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Pane */}
      <div className={`flex-1 flex flex-col border border-green-900 rounded bg-[#1e1e1e] overflow-hidden ${isFullScreen ? 'fixed inset-4 z-50' : 'relative'}`}>
        <div className="p-2 border-b border-green-900/30 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-green-700">
              <FileCode size={14} /> 
              <input 
                type="text" 
                value={filename} 
                onChange={e => setFilename(e.target.value)} 
                className="bg-transparent border-b border-green-900 text-green-500 focus:outline-none focus:border-green-400 w-32"
              />
            </div>
            
            <select 
              value={language} 
              onChange={e => setLanguage(e.target.value)}
              className="bg-black border border-green-900 text-green-500 text-[10px] rounded focus:outline-none px-1"
            >
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="shell">Shell</option>
              <option value="sql">SQL</option>
              <option value="dockerfile">Docker</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>

            <button onClick={saveFile} className="text-[10px] bg-green-900/20 px-2 py-0.5 rounded text-green-500 hover:bg-green-900/40 border border-green-900/50 flex items-center gap-1">
              <Save size={10} /> Save
            </button>
          </div>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="text-green-700 hover:text-green-400 p-1"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: '"JetBrains Mono", monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Preview Pane */}
      <div className="w-80 flex flex-col border border-green-900 rounded bg-black overflow-hidden relative">
        <div className="p-3 border-b border-green-900 bg-green-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <Play size={14} /> Preview
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-green-900 space-y-4">
          <Code size={48} className="opacity-10" />
          <p className="text-xs italic">"Container runtime not available. Save and run in Terminal for execution."</p>
        </div>
      </div>
    </div>
  );
}
