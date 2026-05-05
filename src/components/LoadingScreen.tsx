import React from 'react';
import { motion } from 'motion/react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden">
      {/* Background Grid & Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,128,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,128,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      <div className="absolute inset-0 bg-transparent scanline"></div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-6xl font-black text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
        >
          G.N.Æ.K.
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-green-500 font-mono text-sm tracking-tighter"
        >
          Genetic Neural Æther Konstruktor
        </motion.p>

        {/* Loader */}
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="w-12 h-12 border-4 border-green-900/50 border-t-green-500 rounded-full mt-4"
        />

        {/* Loading text */}
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-green-800 font-mono text-xs uppercase"
        >
          Loading...
        </motion.p>
      </div>

      {/* Floating Particles/UI Elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        className="absolute top-10 left-10 w-2 h-2 bg-green-500 rounded-full animate-pulse"
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        className="absolute bottom-10 right-10 w-3 h-3 bg-teal-500 rounded-full animate-ping"
      />
    </div>
  );
};

export default LoadingScreen;
