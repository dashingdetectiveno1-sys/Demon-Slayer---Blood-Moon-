/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameWorld } from './components/GameWorld';

export default function App() {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative font-sans flex text-white">
      <div className="flex-1 relative">
        <GameWorld />
      </div>
    </div>
  );
}
