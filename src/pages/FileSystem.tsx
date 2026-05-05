import { Folder } from "lucide-react";
import FileExplorer from "../components/FileExplorer";

export default function FileSystem() {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Folder className="text-blue-500" /> Filesystem Explorer
        </h2>
        <div className="text-[10px] text-green-700 italic">"Full access to the operational environment's disk structure."</div>
      </div>

      <div className="flex-1 bg-black/20 rounded-lg overflow-hidden border border-green-900/30">
        <FileExplorer />
      </div>
    </div>
  );
}
