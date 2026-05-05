import React, { useState, useEffect, useRef } from "react";
import { Folder, File, ChevronRight, ChevronDown, Upload, Save, X, HardDrive, FileCode, RefreshCcw } from "lucide-react";

interface FSItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export default function FileExplorer() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<FSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async (path = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath]);

  const handleFileClick = async (item: FSItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    } else {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(item.path)}`);
      const data = await res.json();
      setEditingFile({ path: item.path, content: data.content });
    }
  };

  const handleSave = async () => {
    if (!editingFile) return;
    await fetch("/api/fs/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: editingFile.path, content: editingFile.content })
    });
    setEditingFile(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await fetch("/api/fs/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-file-name": file.name,
          "x-dest-dir": currentPath
        },
        body: await file.arrayBuffer()
      });
      fetchItems(currentPath);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setEditingFile(null);
    }
  };

  const goUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  return (
    <div className="h-full flex flex-col border border-green-900 rounded bg-black/40 overflow-hidden text-xs relative">
      <div className="bg-green-900/20 p-2 border-b border-green-900 flex justify-between items-center">
        <div className="flex items-center gap-2 truncate">
          <HardDrive size={14} className="text-green-700" />
          <span className="font-mono text-green-500 truncate">{currentPath || "/root"}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => fetchItems(currentPath)}
            className="p-1 hover:bg-green-900/30 text-green-700 hover:text-green-400"
            title="Refresh"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-1 hover:bg-green-900/30 text-green-700 hover:text-green-400"
            title="Upload File"
          >
            <Upload size={14} className={uploading ? "animate-bounce" : ""} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentPath && (
          <div 
            onClick={goUp}
            className="flex items-center gap-2 p-2 hover:bg-green-900/10 cursor-pointer text-green-800"
          >
            <ChevronRight size={14} className="rotate-180" />
            <span>.. (Up)</span>
          </div>
        )}
        
        {loading ? (
          <div className="p-4 text-center text-green-900 animate-pulse font-mono uppercase text-[10px]">Scanning Disk...</div>
        ) : (
          items.map(item => (
            <div 
              key={item.path}
              onClick={() => handleFileClick(item)}
              className="flex items-center gap-2 p-2 hover:bg-green-900/10 cursor-pointer group"
            >
              {item.isDirectory ? (
                <Folder size={14} className="text-blue-900" />
              ) : (
                <FileCode size={14} className="text-green-900" />
              )}
              <span className={`truncate ${item.isDirectory ? "text-green-700 font-bold" : "text-green-900 group-hover:text-green-500"}`}>
                {item.name}
              </span>
            </div>
          ))
        )}
      </div>

      {editingFile && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col p-4">
          <div className="flex justify-between items-center mb-4 border-b border-green-900 pb-2">
            <div className="flex items-center gap-2">
              <File size={16} className="text-green-500" />
              <span className="text-green-100 font-mono text-[10px] truncate max-w-md">{editingFile.path}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="bg-green-900 hover:bg-green-800 text-green-100 px-3 py-1 rounded text-[10px] flex items-center gap-1"
              >
                <Save size={12} /> Save
              </button>
              <button 
                onClick={() => setEditingFile(null)}
                className="text-green-900 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <textarea 
            value={editingFile.content}
            onChange={e => setEditingFile({ ...editingFile, content: e.target.value })}
            className="flex-1 bg-black/40 border border-green-900/30 rounded p-4 font-mono text-[11px] text-green-400 focus:outline-none focus:border-green-500 custom-scrollbar resize-none"
          />
        </div>
      )}
    </div>
  );
}
