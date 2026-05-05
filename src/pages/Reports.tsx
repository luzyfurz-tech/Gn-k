import { useState, useEffect, useRef } from "react";
import { FileText, Download, Briefcase, Calendar, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Reports() {
  const [stats, setStats] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetch("/api/stats").then(res => res.json()).then(setStats);
    fetch("/api/targets").then(res => res.json()).then(setTargets);
  }, []);

  const exportToPdf = async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0a0a0a' // match background
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('opsec_report.pdf');
    } catch (e) {
      console.error("Failed to generate PDF", e);
      alert("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="text-blue-400" /> Reporting Hub
        </h2>
        <button 
          onClick={exportToPdf}
          disabled={isExporting}
          className="bg-green-900 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-green-100 px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
          <Download size={14} /> {isExporting ? "Generating..." : "Generate PDF Assessment"}
        </button>
      </div>

      <div ref={reportRef} className="border border-green-900 bg-[#0a0a0a] p-8 rounded shadow-2xl relative overflow-hidden shrink-0 min-h-[297mm] text-green-400">
        {/* Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none rotate-12 scale-150">
          <Briefcase size={200} />
        </div>

        <div className="space-y-12 relative z-10">
          <header className="border-b-4 border-green-900 pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-green-100">SECURITY ASSESSMENT REPORT</h1>
              <p className="text-xs text-green-700 font-bold uppercase tracking-widest">Confidential Operational Document</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold">OPSEC_CTRL v1.0.4</p>
              <p className="text-[10px] text-green-800">GENERATED: {new Date().toLocaleString()}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase border-b border-green-900/50 pb-1 text-green-700">Engagement Overview</h3>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                   <span className="text-green-900">Targets Audited:</span>
                   <span className="font-bold text-green-300">{stats?.targets || 0}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                   <span className="text-green-900">Total Scans Performed:</span>
                   <span className="font-bold text-green-300">{stats?.scans || 0}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                   <span className="text-green-900">Critical Findings:</span>
                   <span className="font-bold text-red-500">{stats?.findings || 0}</span>
                 </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase border-b border-green-900/50 pb-1 text-green-700">Scope Verification</h3>
              <div className="space-y-1">
                {targets.slice(0, 5).map(t => (
                  <div key={t.id} className="text-[10px] flex items-center gap-2">
                    <CheckCircle size={10} className="text-green-800" />
                    <span>{t.hostname} <span className="text-green-950">({t.ipRange})</span></span>
                  </div>
                ))}
                {targets.length > 5 && <p className="text-[10px] text-green-950 italic">+{targets.length - 5} more targets in full report...</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
             <h3 className="text-xs font-bold uppercase border-b border-green-900/50 pb-1 text-green-700">Vulnerability Summary</h3>
             <div className="h-48 border border-green-900/30 rounded flex items-center justify-center italic text-green-900 text-sm">
                Data visualization module offline... charts would be rendered here.
             </div>
          </section>

          <footer className="pt-12 text-center text-[10px] text-green-900 italic">
            This document contains sensitive security findings. Handle according to OPSEC policy "ORCON". 
          </footer>
        </div>
      </div>
    </div>
  );
}
