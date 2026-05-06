/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, Route, Switch, useRoute } from 'wouter';
import React from 'react';
import { LayoutDashboard, Target, Zap, Bug, Terminal, Bot, Settings as SettingsIcon, AlertTriangle, ChevronDown, ChevronRight, Shield, Search, Zap as PayloadIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AgentControl from './pages/AgentControl';
import Exploit from './pages/Exploit';
import Console from './pages/Console';
import Intel from './pages/Intel';
import LoadingScreen from './components/LoadingScreen';

const NavLink = ({ href, children, icon: Icon }: { href: string, children: React.ReactNode, icon: any }) => {
  const [isActive] = useRoute(href);
  return (
    <Link href={href} className={`flex items-center gap-3 p-2 rounded text-sm transition-all ${isActive ? 'bg-green-900/40 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'text-green-700 hover:bg-green-900/10 hover:text-green-500'}`}>
      <Icon size={16} />
      <span>{children}</span>
    </Link>
  );
};

const NavSection = ({ title, icon: Icon, children, defaultOpen = true }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Icon size={12} className="opacity-50 group-hover:opacity-100" />
          {title}
        </div>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {isOpen && (
        <div className="pl-2 space-y-1 border-l border-green-950/30 ml-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const apiKey = localStorage.getItem("ollama_api_key");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col relative overflow-hidden">
      <div className="scanline" />
      {!apiKey && (
        <div className="bg-yellow-900/20 border-b border-yellow-900 text-yellow-500 p-2 text-center text-xs flex items-center justify-center gap-2">
          <AlertTriangle size={14} />
          <span>⚠ No Ollama Cloud API key — AI features disabled. Set one in Settings.</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 border-r border-green-900 p-4 shrink-0 flex flex-col gap-6 bg-black/40 backdrop-blur-sm custom-scrollbar overflow-y-auto">
          <Link href="/">
            <div className="p-2 cursor-pointer transition-colors group">
              <h1 className="text-xl font-black text-white tracking-widest group-hover:text-green-300 transition-colors">G.N.Æ.K.</h1>
              <p className="text-green-500 font-mono text-[9px] tracking-tighter mt-0.5">Genetic Neural Æther Konstruktor</p>
            </div>
          </Link>
          
          <div className="space-y-6">
            <NavSection title="Control Center" icon={Shield}>
              <NavLink href="/dashboard" icon={LayoutDashboard}>Overview</NavLink>
              <NavLink href="/" icon={Bot}>Agent Control</NavLink>
              <NavLink href="/exploit" icon={PayloadIcon}>Exploit</NavLink>
              <NavLink href="/intel" icon={Search}>Intel</NavLink>
              <NavLink href="/console" icon={Terminal}>Console</NavLink>
              <NavLink href="/settings" icon={SettingsIcon}>Settings</NavLink>
            </NavSection>
          </div>
        </nav>
        <main className="flex-1 p-6 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          <Switch>
            <Route path="/"><AgentControl /></Route>
            <Route path="/dashboard"><Dashboard /></Route>
            <Route path="/intel"><Intel /></Route>
            <Route path="/exploit"><Exploit /></Route>
            <Route path="/console"><Console /></Route>
            <Route path="/settings"><Settings /></Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}

