import { useState, useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function ModelSelector({ type, onSelect }: { type: 'agent' | 'builder', onSelect?: (model: string) => void }) {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const apiKey = localStorage.getItem("ollama_api_key");
  const host = localStorage.getItem("ollama_host") || "https://ollama.com";
  const provider = localStorage.getItem("ai_provider") || "ollama";
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem(`${type}_model`) || localStorage.getItem("default_model") || "");

  const fetchModels = async () => {
    if (provider === "gemini") {
        setModels([
            { name: "gemini-2.0-flash" },
            { name: "gemini-1.5-pro" },
            { name: "gemini-1.5-flash" }
        ]);
        if (!selectedModel) handleSelect("gemini-1.5-flash");
        return;
    }

    if (!apiKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/models", {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          "x-ollama-host": host
        }
      });
      if (res.status === 401) throw new Error("Invalid API key — check Settings");
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      
      const combinedModels = data.length > 0 ? data : [
        { name: "llama3" },
        { name: "mistral" },
        { name: "codellama" }
      ];
      
      setModels(combinedModels);
      if (combinedModels.length > 0 && !selectedModel) {
        handleSelect(combinedModels[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
      // Fallback for UI even on error
      setModels([{ name: "llama3" }, { name: "mistral" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSelect = (val: string) => {
    setSelectedModel(val);
    localStorage.setItem(`${type}_model`, val);
    if (onSelect) onSelect(val);
  };

  if (provider === "ollama" && !apiKey) {
    return (
      <div className="bg-black border border-green-900 p-2 rounded text-xs text-green-700 flex items-center justify-center italic">
        -- set API key in Settings --
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <select
          value={selectedModel}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={loading}
          className="w-full bg-black border border-green-900 p-2 rounded text-xs text-green-100 appearance-none focus:outline-none focus:border-green-500 disabled:opacity-50"
        >
          {models.length === 0 && !loading && <option value="">No models available</option>}
          {models.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
        {loading && <div className="absolute right-8 top-2.5 w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />}
      </div>
      <button 
        onClick={fetchModels}
        className="p-2 border border-green-900 rounded hover:bg-green-900/20 text-green-700 hover:text-green-500"
        title="Refresh models"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </button>
      {error && <AlertCircle size={14} className="text-red-500" title={error} />}
    </div>
  );
}
