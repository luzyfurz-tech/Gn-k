import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Zap, Bug, Wrench, Activity, Globe, ShieldAlert, ExternalLink, TrendingUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Dashboard() {
  const [stats, setStats] = useState({ targets: 0, scans: 0, findings: 0, toolsInstalled: 0 });
  const [marketData, setMarketData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error("Dashboard stats fetch error", e);
      }
    };

    const fetchMarketIntel = async () => {
      try {
        const res = await fetch("/api/market-intel");
        if (res.ok) {
          const data = await res.json();
          setMarketData(data);
        }
      } catch (e) {
        console.error("Market intel fetch error", e);
      }
    };

    fetchStats();
    fetchMarketIntel();
    const interval = setInterval(() => {
      fetchStats();
      fetchMarketIntel();
    }, 86400000); // 24h refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Targets" value={stats.targets} icon={LayoutDashboard} />
        <StatCard title="Active Scans" value={stats.scans} icon={Zap} />
        <StatCard title="Critical Findings" value={stats.findings} icon={Bug} color="text-red-500" />
        <StatCard title="Tools Installed" value={stats.toolsInstalled} icon={Wrench} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Trending Exploits (Market Intel) - Now full width or centered */}
        <div className="border border-green-900 bg-black/40 rounded-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b border-green-900 flex justify-between items-center bg-green-900/10">
             <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-green-400">Market Intelligence Feed</h2>
             </div>
             <div className="text-[10px] text-green-800 font-mono italic">"Aggregated live from global security clearinghouses"</div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <TrendingExploits exploits={marketData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-green-900 bg-black/40 p-4 rounded-lg">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-green-400 border-b border-green-900/50 pb-2">
            <Zap size={16} className="text-yellow-500" /> Active Operations
          </h2>
          <div className="space-y-3">
             <div className="flex items-center justify-between p-2 hover:bg-green-900/10 rounded group transition-colors cursor-pointer border border-transparent hover:border-green-900/30">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded bg-green-900/20 flex items-center justify-center text-green-500">
                      <Search size={14} />
                   </div>
                   <div>
                      <div className="text-xs font-bold text-green-100">INTERNAL_AUDIT_X7</div>
                      <div className="text-[10px] text-green-700 font-mono">TARGET: 10.0.4.21</div>
                   </div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-bold text-green-500">84% DONE</div>
                   <div className="w-20 h-1 bg-green-900/30 rounded-full mt-1">
                      <div className="h-full bg-green-500 w-[84%]" />
                   </div>
                </div>
             </div>
             <div className="text-sm text-green-900 italic text-center py-4">View more in Operations center...</div>
          </div>
        </div>

        <div className="border border-green-900 bg-black/40 p-4 rounded-lg flex flex-col justify-center items-center text-center">
           <div className="text-[10px] text-green-700 uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
             Global Cyber Threat Index
             <div className={`w-2 h-2 rounded-full ${isOllamaOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'} animate-pulse`} title={isOllamaOnline ? "Ollama Node Online" : "Ollama Node Offline"} />
           </div>
           <ThreatIndex exploits={marketData} />
           <p className="text-[10px] text-green-900 italic mt-4 max-w-xs uppercase">Calculated based on real-time CVE delta and severity distribution across active feeds.</p>
        </div>
      </div>

      {/* Mission Log Section */}
      <div className="mt-8 border border-green-900/30 bg-black/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4 border-b border-green-900/30 pb-2">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-green-400 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" /> Operational Mission Log
          </h3>
          <span className="text-[9px] font-mono text-green-800 uppercase">Real-time persistence layer active</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {missionLog.length > 0 ? missionLog.map((log, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 border border-green-900/10 bg-black/40 rounded hover:bg-green-900/5 transition-colors"
            >
              <div className={`mt-1 p-1 rounded ${log.type === 'finding' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {log.type === 'finding' ? <ShieldAlert size={10} /> : <Scan size={10} />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-green-200 truncate uppercase tracking-tight">{log.detail}</div>
                <div className="text-[8px] text-green-800 font-mono mt-1">{new Date(log.created_at).toLocaleString()}</div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-4 text-center text-[10px] text-green-900 uppercase italic">-- No recent missions recorded --</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendingExploits({ exploits }: { exploits: any[] }) {
  if (!exploits || exploits.length === 0) {
    return (
      <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-3 opacity-50">
        <Activity size={32} className="animate-pulse text-green-500" />
        <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Synching with primary feed...</span>
      </div>
    );
  }

  return (
    <>
      {exploits.map((e, i) => (
        <motion.div 
          key={e.cve + i}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="bg-black/60 border border-green-900/30 p-4 rounded hover:border-green-500/50 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono text-orange-500 font-bold">{e.cve}</span>
            <span className={`text-[8px] px-1 rounded font-black uppercase ${
              e.severity === 'Critical' ? 'bg-red-500/20 text-red-500' : 
              e.severity === 'High' ? 'bg-orange-500/20 text-orange-500' : 
              'bg-blue-500/20 text-blue-500'
            }`}>
              {e.severity}
            </span>
          </div>
          <h4 className="text-xs font-bold text-green-100 group-hover:text-green-400 transition-colors uppercase tracking-tight mb-3 line-clamp-2 min-h-[32px]">{e.title}</h4>
          
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="flex gap-1 items-center">
                <div className="w-12 h-1 bg-green-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${(e.score/10)*100}%` }} />
                </div>
                <span className="text-[8px] text-green-800 font-bold">{e.score} CVSS</span>
              </div>
              {e.trending && (
               <div className="flex items-center gap-1 text-[8px] text-red-500 font-bold uppercase">
                 <TrendingUp size={8} /> Elevated Threat
               </div>
              )}
            </div>
            
            <a 
              href={e.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-green-700 hover:text-green-300 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform"
            >
              Analyze <ExternalLink size={10} />
            </a>
          </div>
        </motion.div>
      ))}
    </>
  );
}

function ThreatIndex({ exploits }: { exploits: any[] }) {
  const avgScore = exploits.length > 0 ? exploits.reduce((acc, curr) => acc + curr.score, 0) / exploits.length : 0;
  const threatLevel = avgScore > 8 ? "Extreme" : avgScore > 7 ? "High" : avgScore > 5 ? "Elevated" : "Moderate";
  const levels = ["Extreme", "High", "Elevated", "Moderate"];
  const colors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500"];
  
  return (
    <div className="flex flex-col items-center">
      <div className={`text-6xl font-black mb-2 tabular-nums ${colors[levels.indexOf(threatLevel)]}`}>
        {avgScore.toFixed(1)}
      </div>
      <div className={`text-sm font-black uppercase tracking-[0.4em] ${colors[levels.indexOf(threatLevel)]}`}>
        {threatLevel}
      </div>
      <div className="flex gap-1 mt-4">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i} 
            className={`w-3 h-1 rounded-full ${i < avgScore ? colors[levels.indexOf(threatLevel)].replace('text', 'bg') : 'bg-green-900/20'}`} 
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-green-400" }: any) {
  return (
    <div className="border border-green-900 bg-black/40 p-4 rounded-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={48} />
      </div>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-[10px] text-green-700 uppercase font-black tracking-[0.2em]">{title}</p>
          <p className="text-2xl font-black mt-1 text-green-100 tabular-nums">{value}</p>
        </div>
        <Icon size={20} className={color} />
      </div>
    </div>
  );
}

