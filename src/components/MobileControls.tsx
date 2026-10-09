/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Focus, Sword, Wind, Flame, Droplets, ArrowUp, Zap } from 'lucide-react';

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
  onJump: (isPressed: boolean) => void;
  onInteract: (isPressed: boolean) => void;
  onAttack: (isPressed: boolean) => void;
  onDash: (isPressed: boolean) => void;
  onSkill1: (isPressed: boolean) => void;
  onSkill2: (isPressed: boolean) => void;
  onSkill3: (isPressed: boolean) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ 
  onMove, onJump, onInteract, onAttack, onDash, onSkill1, onSkill2, onSkill3 
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [joystickOrigin, setJoystickOrigin] = useState({ x: 0, y: 0 });

  const maxRadius = 45;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      
      setJoystickOrigin({ x: originX, y: originY });
      setJoystickActive(true);
      
      const joystickEl = joystickRef.current;
      joystickEl.setPointerCapture(e.pointerId);
      updateJoystick(e.clientX, e.clientY, originX, originY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!joystickActive) return;
    updateJoystick(e.clientX, e.clientY, joystickOrigin.x, joystickOrigin.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
    if (joystickRef.current) {
      joystickRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const updateJoystick = (clientX: number, clientY: number, originX: number, originY: number) => {
    const dx = clientX - originX;
    const dy = clientY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let knobX = dx;
    let knobY = dy;
    
    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      knobX = dx * ratio;
      knobY = dy * ratio;
    }
    
    setJoystickPos({ x: knobX, y: knobY });
    onMove({ x: knobX / maxRadius, y: knobY / maxRadius });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      
      {/* Left side: Joystick */}
      <div className="absolute bottom-6 left-6 sm:bottom-12 sm:left-12 [@media(max-height:480px)]:bottom-3 [@media(max-height:480px)]:left-3 [@media(max-height:480px)]:scale-[0.7] flex justify-start items-end pointer-events-auto origin-bottom-left">
        <div 
          className="w-32 h-32 sm:w-40 sm:h-40 bg-black/20 border-2 border-white/20 rounded-full backdrop-blur-md shadow-xl flex items-center justify-center relative touch-none"
          ref={joystickRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="absolute text-white/30 tracking-widest text-[10px] sm:text-xs font-mono mb-20 sm:mb-24 uppercase font-bold text-shadow pointer-events-none">Movement</div>
          <div 
            className="w-12 h-12 sm:w-16 sm:h-16 bg-white/80 rounded-full shadow-lg absolute transition-transform duration-75 pointer-events-none"
            style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
          />
        </div>
      </div>

      {/* Right side: Action Cluster */}
      <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 pointer-events-none touch-none">
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 origin-bottom-right transform scale-90 sm:scale-100 [@media(max-height:480px)]:scale-[0.7]">
          
          {/* Dash (Top Left) */}
          <button
            className="absolute top-0 left-0 w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/40 active:bg-emerald-500/80 border border-emerald-400 rounded-full shadow-xl backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onDash(true)}
            onPointerUp={() => onDash(false)}
            onPointerLeave={() => onDash(false)}
            onPointerCancel={() => onDash(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Wind className="w-5 h-5 sm:w-6 sm:h-6 shadow-sm" />
          </button>

          {/* Skill 1 - Water (Top Right) */}
          <button
            className="absolute top-0 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600/60 active:bg-blue-500 border border-blue-400 rounded-full shadow-[0_0_15px_rgba(0,100,255,0.5)] backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onSkill1(true)}
            onPointerUp={() => onSkill1(false)}
            onPointerLeave={() => onSkill1(false)}
            onPointerCancel={() => onSkill1(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Droplets className="w-5 h-5 sm:w-6 sm:h-6 shadow-sm" />
          </button>

          {/* Skill 3 - Thunder (Center Upper Right) */}
          <button
            className="absolute top-4 right-[4.5rem] sm:right-[5.5rem] w-12 h-12 sm:w-14 sm:h-14 bg-amber-500/60 active:bg-amber-400 border border-amber-400 rounded-full shadow-[0_0_15px_rgba(255,200,0,0.5)] backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onSkill3(true)}
            onPointerUp={() => onSkill3(false)}
            onPointerLeave={() => onSkill3(false)}
            onPointerCancel={() => onSkill3(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 shadow-sm text-yellow-300" />
          </button>

          {/* Skill 2 - Fire (Far Right Center) */}
          <button
            className="absolute top-14 sm:top-16 -right-2 sm:-right-4 w-14 h-14 sm:w-16 sm:h-16 bg-red-600/70 active:bg-red-500 border border-red-500 rounded-full shadow-[0_0_20px_rgba(255,50,0,0.6)] backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onSkill2(true)}
            onPointerUp={() => onSkill2(false)}
            onPointerLeave={() => onSkill2(false)}
            onPointerCancel={() => onSkill2(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 shadow-sm" />
          </button>

          {/* Attack (Center/Bottom Left) */}
          <button
            className="absolute bottom-10 sm:bottom-12 left-6 sm:left-8 w-14 h-14 sm:w-16 sm:h-16 bg-slate-200/40 active:bg-white/80 border border-white/60 rounded-full shadow-xl backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onAttack(true)}
            onPointerUp={() => onAttack(false)}
            onPointerLeave={() => onAttack(false)}
            onPointerCancel={() => onAttack(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Sword className="w-7 h-7 sm:w-8 sm:h-8 shadow-sm" />
          </button>

          {/* Jump (Bottom Right) */}
          <button
            className="absolute bottom-0 right-8 sm:right-10 w-12 h-12 sm:w-14 sm:h-14 bg-gray-500/40 active:bg-gray-500/80 border border-gray-400 rounded-full shadow-xl backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onJump(true)}
            onPointerUp={() => onJump(false)}
            onPointerLeave={() => onJump(false)}
            onPointerCancel={() => onJump(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 shadow-sm" />
          </button>

          {/* Interact (Far Left Bottom) */}
          <button
            className="absolute bottom-0 left-0 w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/40 active:bg-indigo-500/80 border border-indigo-400 rounded-full shadow-xl backdrop-blur-md flex items-center justify-center text-white pointer-events-auto touch-none select-none [-webkit-touch-callout:none] active:scale-95 transition-transform"
            onPointerDown={() => onInteract(true)}
            onPointerUp={() => onInteract(false)}
            onPointerLeave={() => onInteract(false)}
            onPointerCancel={() => onInteract(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Focus className="w-4 h-4 sm:w-5 sm:h-5 shadow-sm" />
          </button>

        </div>
      </div>
    </div>
  );
};
