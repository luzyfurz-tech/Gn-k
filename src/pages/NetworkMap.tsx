import { useState, useEffect } from "react";
import { Share2, Target, Shield, Globe } from "lucide-react";

export default function NetworkMap() {
  const [targets, setTargets] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/targets").then(res => res.json()).then(setTargets);
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Share2 className="text-blue-500" /> Network Topology
        </h2>
        <div className="text-[10px] text-green-700 italic">"Visualizing ingress points and internal nodes."</div>
      </div>

      <div className="flex-1 bg-black/40 border border-green-900 rounded-lg relative overflow-hidden flex items-center justify-center p-8">
        {/* Simplified Hex Grid for Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]" />
        
        {targets.length === 0 ? (
          <div className="text-green-900 animate-pulse">Waiting for target acquisition...</div>
        ) : (
          <div className="relative w-full h-full">
            {targets.map((t, idx) => {
              const angle = (idx / targets.length) * 2 * Math.PI;
              const radius = 150;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div 
                  key={t.id}
                  style={{ transform: `translate(calc(50% + ${x}px), calc(50% + ${y}px))` }}
                  className="absolute -ml-12 -mt-12 w-24 h-24 group cursor-pointer"
                >
                   {/* Connections to center */}
                  <div className="absolute top-1/2 left-1/2 w-[200px] h-[1px] bg-green-500/20 origin-left" 
                       style={{ transform: `rotate(${angle + Math.PI}rad)` }} />
                  
                  <div className="relative bg-black border border-green-500 p-2 rounded-lg flex flex-col items-center justify-center space-y-1 shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:scale-110 transition-transform z-10">
                    <Target size={16} className="text-green-400" />
                    <span className="text-[10px] font-bold text-green-100 truncate w-full text-center">{t.hostname}</span>
                    <span className="text-[8px] text-green-700">{t.ipRange}</span>
                  </div>
                </div>
              );
            })}

            {/* Hub node */}
            <div className="absolute top-1/2 left-1/2 -ml-8 -mt-8 w-16 h-16 bg-green-900/20 border-2 border-green-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.4)]">
              <Shield className="text-green-400" size={24} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
