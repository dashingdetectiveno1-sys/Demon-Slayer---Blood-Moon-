import React, { useEffect, useRef, useState } from 'react';
import { AsteroidsEngine, GameState } from '../game/AsteroidsEngine';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Crosshair, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    lives: 3,
    level: 1
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Set internal resolution
    canvasRef.current.width = 1000;
    canvasRef.current.height = 700;
    
    const engine = new AsteroidsEngine(canvasRef.current, (newState) => {
      setGameState(newState);
    });
    
    engine.mount();
    engineRef.current = engine;
    
    return () => {
      engine.unmount();
    };
  }, []);

  const handleStart = () => {
    engineRef.current?.startGame();
  };

  return (
    <div className="relative border border-gray-800 rounded-xl overflow-hidden shadow-2xl bg-[#050510]">
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div>
          <div className="text-gray-500 font-mono text-sm uppercase tracking-widest mb-1 shadow-black drop-shadow-md">Score</div>
          <div className="text-4xl font-bold text-white font-sans tabular-nums leading-none tracking-tight shadow-black drop-shadow-lg">
            {gameState.score.toString().padStart(6, '0')}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-gray-500 font-mono text-sm uppercase tracking-widest mb-2 shadow-black drop-shadow-md">Integrity</div>
          <div className="flex justify-end gap-1.5">
            {Array.from({ length: Math.max(3, gameState.lives) }).map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 ${
                  i < gameState.lives 
                    ? 'bg-[#00ffff] border-[#00ffff] shadow-[0_0_10px_#00ffff]' 
                    : 'border-gray-800 bg-transparent'
                } transition-all duration-300`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas 
        ref={canvasRef} 
        className="block" 
        style={{ width: '1000px', height: '700px', maxWidth: '100%', objectFit: 'contain' }}
      />
      
      {/* UI Overlays */}
      <AnimatePresence>
        {gameState.status === 'START' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20"
          >
            <Crosshair className="w-16 h-16 text-[#00ffff] mb-6 animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-4 text-center">
              COSMIC<br/><span className="text-[#00ffff]">SURVIVAL</span>
            </h1>
            <p className="text-gray-400 font-mono mb-10 max-w-sm text-center">
              A minimalist arcade shooter. Destroy all asteroids to advance the sector.
            </p>
            
            <button 
              onClick={handleStart}
              className="group relative px-8 py-4 bg-[#00ffff]/10 border border-[#00ffff]/50 text-[#00ffff] font-bold tracking-widest uppercase hover:bg-[#00ffff] hover:text-black transition-all duration-300 cursor-pointer overflow-hidden rounded-sm flex items-center gap-3"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Initialize Engine</span>
            </button>
            
            <div className="mt-12 flex gap-8 text-gray-500 font-mono text-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></span>
                  <span className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ArrowUp className="w-4 h-4" /></span>
                  <span className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ArrowRight className="w-4 h-4" /></span>
                </div>
                <span>Navigate</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="h-8 px-6 rounded border border-gray-700 flex items-center justify-center">SPACE</span>
                <span>Fire Weapon</span>
              </div>
            </div>
          </motion.div>
        )}
        
        {gameState.status === 'GAMEOVER' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20"
          >
             <h2 className="text-6xl font-bold text-white tracking-tighter mb-2">SYSTEM FAILURE</h2>
             <p className="text-[#ff00ff] font-mono text-xl mb-8">FINAL SCORE: {gameState.score.toString().padStart(6, '0')}</p>
             
             <button 
              onClick={handleStart}
              className="px-8 py-4 bg-white text-black font-bold tracking-widest uppercase hover:bg-gray-200 transition-all duration-300 cursor-pointer rounded-sm flex items-center gap-3"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Restart System</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
