import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Zap, Bug, Wrench, Activity, Globe, ShieldAlert, ExternalLink, TrendingUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Dashboard() {
  const [stats, setStats] = useState({ targets: 0, scans: 0, findings: 0, toolsInstalled: 0 });

  useEffect(() => {
    const fetchStats = () => {
      fetch("/api/stats")
        .then(res => res.json())
        .then(setStats)
        .catch(() => {});
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
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
             <div className="text-[10px] text-green-800 font-mono italic">"Aggregated from 12+ darknet and security clearinghouses"</div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <TrendingExploits />
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

        <div className="border border-green-900 bg-black/40 p-4 rounded-lg">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-green-400 border-b border-green-900/50 pb-2">
            <Activity size={16} className="text-blue-500" /> System Core
          </h2>
          <div className="space-y-4">
            <HealthBar label="CPU Core Load" value={12} />
            <HealthBar label="Memory Reserved" value={45} />
            <HealthBar label="V-Disk Array" value={68} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendingExploits() {
  const exploits = [
    { cve: "CVE-2024-38063", title: "Windows TCP/IP RCE", severity: "Critical", score: 9.8, trending: true, link: "https://nvd.nist.gov/vuln/detail/CVE-2024-38063" },
    { cve: "CVE-2024-43451", title: "NTLM Hash Disclosure", severity: "High", score: 8.1, trending: true, link: "https://nvd.nist.gov/vuln/detail/CVE-2024-43451" },
    { cve: "CVE-2024-38112", title: "Windows MHTML Spoofing", severity: "Medium", score: 6.5, trending: false, link: "https://nvd.nist.gov/vuln/detail/CVE-2024-38112" },
    { cve: "CVE-2024-38077", title: "Windows RDL RCE", severity: "Critical", score: 9.8, trending: true, link: "https://nvd.nist.gov/vuln/detail/CVE-2024-38077" },
    { cve: "CVE-2024-21413", title: "Outlook RCE (MonikerLink)", severity: "Critical", score: 9.8, trending: false, link: "https://nvd.nist.gov/vuln/detail/CVE-2024-21413" },
    { cve: "CVE-2023-38831", title: "WinRAR Arbitrary Code", severity: "High", score: 7.8, trending: false, link: "https://nvd.nist.gov/vuln/detail/CVE-2023-38831" },
  ];

  return (
    <>
      {exploits.map((e, i) => (
        <motion.div 
          key={e.cve}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
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
          <h4 className="text-xs font-bold text-green-100 group-hover:text-green-400 transition-colors uppercase tracking-tight mb-3">{e.title}</h4>
          
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
                 <TrendingUp size={8} /> Trending Threat
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

function HealthBar({ label, value }: { label: string, value: number }) {
  const getColor = (v: number) => {
    if (v > 80) return "bg-red-500";
    if (v > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1 uppercase font-bold text-green-700 tracking-wider">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-2 bg-green-900/20 rounded-sm overflow-hidden border border-green-900/30">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={`h-full ${getColor(value)} shadow-[0_0_10px_rgba(34,197,94,0.3)]`} 
        />
      </div>
    </div>
  );
}

