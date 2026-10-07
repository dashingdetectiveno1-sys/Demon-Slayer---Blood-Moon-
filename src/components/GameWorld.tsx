/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { MobileControls } from './MobileControls';
import { Flame, Heart, Zap, Skull, ShieldAlert, Droplets, ArrowUp, Sword, Coins, Star, Menu, X, ChevronRight, Info, ShoppingBag, Award, CheckCircle2, Lock, Unlock, Save, BookOpen, Compass, HelpCircle, Volume2, Eye, EyeOff, Navigation, Settings } from 'lucide-react';
import { audioManager } from '../audio';
import { motion, AnimatePresence } from 'motion/react';

const RANKS = ['New Moon', 'Crescent', 'Quarter', 'Gibbous', 'Full Moon', 'Red Crescent', 'Red Quarter', 'Red Gibbous', 'Blood Moon', 'Eclipse'];

const OBFUSCATION_SALT = "weavers_peak_77";

function obfuscateData(obj: any): string {
    const json = JSON.stringify(obj);
    let result = "";
    for (let i = 0; i < json.length; i++) {
        const charCode = json.charCodeAt(i);
        const saltCode = OBFUSCATION_SALT.charCodeAt(i % OBFUSCATION_SALT.length);
        result += String.fromCharCode(charCode ^ (saltCode % 7)); 
    }
    return btoa(unescape(encodeURIComponent(result)));
}

function deobfuscateData(str: string): any {
    if (!str) return {};
    if (str.startsWith('{')) {
        try {
            return JSON.parse(str);
        } catch (e) {}
    }
    try {
        const decoded = decodeURIComponent(escape(atob(str)));
        let result = "";
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i);
            const saltCode = OBFUSCATION_SALT.charCodeAt(i % OBFUSCATION_SALT.length);
            result += String.fromCharCode(charCode ^ (saltCode % 7));
        }
        return JSON.parse(result);
    } catch (e) {
        try {
            return JSON.parse(str);
        } catch (jsonErr) {
            console.warn("Tampering or corrupt save file detected.");
            return {};
        }
    }
}

interface DialogLine {
  speaker: string;
  text: string;
  mood?: 'neutral' | 'urgent' | 'sinister' | 'calm' | 'excited' | 'sad' | 'angry' | 'serious' | 'shocked';
}

const ComboCounter = ({ count }: { count: number }) => {
  const isMilestone = [10, 25, 50, 100].includes(count);
  
  return (
    <AnimatePresence>
      {count > 1 && (
        <motion.div 
          key="combo-container"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute right-4 md:right-16 top-1/4 pointer-events-none z-30 flex flex-col items-end"
        >
           <div className="text-white font-mono text-sm md:text-xl uppercase tracking-[0.3em] font-bold opacity-80 mb-[-10px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pr-2">
             Combo
           </div>
           <motion.div 
             key={count}
             initial={{ scale: 1.5, rotate: -5 }}
             animate={{ 
               scale: 1, 
               rotate: 0,
               x: isMilestone ? [0, -10, 10, -10, 10, 0] : 0, 
               y: isMilestone ? [0, -5, 5, -5, 5, 0] : 0
             }}
             transition={{ 
               type: isMilestone ? "tween" : "spring", 
               stiffness: 300, 
               damping: 15,
               duration: isMilestone ? 0.4 : 0.2
             }}
             className="font-black italic drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]"
             style={{
               fontSize: `${Math.min(10, 4 + count * 0.15)}rem`,
               lineHeight: 1.0,
               color: `hsl(${Math.max(0, 50 - count * 2.5)}, 100%, 60%)`,
               textShadow: '0 4px 10px rgba(0,0,0,0.8)'
             }}
           >
             {count}
           </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DIALOGUES: Record<string, DialogLine[]> = {
  master_need_training: [
    { speaker: 'Master Iwato', text: 'You felt it too. The moon swells red as a wound, and the moonpetals at the gate are wilting under its light. Something on that mountain is feeding.', mood: 'calm' },
    { speaker: 'Master Iwato', text: 'Three nights ago the threads came over the wall and took little Yae from her bed. No scream. No broken lock. Just one small sandal in the snow. She is seven years old, Ren.', mood: 'urgent' },
    { speaker: 'Master Iwato', text: 'Before I open that gate, show me the water still runs through you. Three clean strikes on the oak dummy. Breathe first. Move second.', mood: 'calm' },
    { speaker: 'You', text: 'Yes, Master. Three strikes. Then I am going up that mountain to bring her home.', mood: 'serious' }
  ],
  villageIntro: [
    { speaker: 'Master Iwato', text: 'Good. The water remembers you. Listen once more: the weaver up there calls herself Shira. She does not simply eat people. She weaves them - winds their souls into silk and calls it a family.', mood: 'calm' },
    { speaker: 'Master Iwato', text: 'Three sacred cocoons anchor her power in the forest depths. Cut them, and her skin becomes mortal. Leave them, and your blade slides off like rain off a roof.', mood: 'urgent' },
    { speaker: 'You', text: 'Cut the cocoons. Free the souls. Bring Yae home. Full moon focus... Moonflow!', mood: 'serious' }
  ],
  caveIntro: [
    { speaker: 'Narrator', text: 'The cavern exhales rot and old incense. Cocoons hang from the dark like fruit left too long on the branch. Some of them are still breathing.', mood: 'sinister' },
    { speaker: 'Shrine Crow', text: 'Caw! Two were still warm when I scouted! Cut the silk, not the soul! Gently! Caw!', mood: 'urgent' },
    { speaker: 'You', text: 'Nobody turns to thread while I am still standing. Moonflow - Final Form: Endless Tide!', mood: 'serious' }
  ],
  peakArrival: [
    { speaker: 'Narrator', text: 'The snow up here falls red. The Blood Moon hangs close enough to watch it pulse. At the summit, the shrine bells ring with no hands on the rope.', mood: 'sinister' },
    { speaker: 'You', text: 'My breath comes out white and thin. Stay with me, Hana. One more climb. This mountain ends tonight.', mood: 'serious' },
    { speaker: 'Master Iwato (Memory)', text: 'A blade is only iron, boy. The thing that cuts is the reason you refuse to stop. Remember that at the top.', mood: 'calm' }
  ],
  villager_1: [
    { speaker: 'Aiko (Florist)', text: 'The moonpetals have not wilted once in my lifetime, warden. Not once. It started the night that child vanished. The flowers know what is up there.', mood: 'sad' },
    { speaker: 'You', text: 'Keep the blooms alive, Aiko. However dim they burn, that purple keeps every door in this village shut to him.', mood: 'calm' }
  ],
  villager_2: [
    { speaker: 'Saburo (Old Villager)', text: 'I survived the last red moon, sixty years gone. They took my brother. Wound him in silk like thread on a spool. Some nights I still hear him in there, warden. Still alive.', mood: 'sad' },
    { speaker: 'You', text: 'Then tonight I cut every spool on that mountain. If your brother is in there, Saburo, he is coming home.', mood: 'serious' }
  ],
  villager_3: [
    { speaker: 'Elder Zenzo (Monk)', text: 'Three cocoons hang in the deep forest, fed by stolen souls. They are her shield, her larder, her family. Pity her if you must, young blade. Pity the people inside them first.', mood: 'calm' },
    { speaker: 'You', text: 'Three cocoons. I will find them all, Elder. Mark my blade.', mood: 'serious' }
  ],
  villager_4: [
    { speaker: 'Miyu', text: 'Ren. Chain your strikes - one breath, one flow, no pause between cuts. The longer the flow holds, the harder each cut lands. Shira will try to break your rhythm. Do not let her.', mood: 'calm' },
    { speaker: 'You', text: 'One breath, unbroken. Watch me, Miyu.', mood: 'excited' }
  ],
  villager_5: [
    { speaker: 'Miyako (Shrine Maiden)', text: 'That shrine kept this mountain quiet for three hundred years. Now red threads choke the offering ropes and the bell rings backwards. Burn her webs out of my gods\' house, warden. Please.', mood: 'serious' },
    { speaker: 'You', text: 'By moonset, the only fire left on that mountain will be mine. I swear it on the Blood Moon Dance.', mood: 'excited' }
  ],
  warden_1: [
    { speaker: 'Guard Daigo', text: 'Gates stay barred until Iwato-sama signs off on your stance. Rules keep corpses off my conscience. Three strikes on the dummy. Make them clean.', mood: 'angry' }
  ],
  warden_2: [
    { speaker: 'Guard Takeru', text: 'HAH! Smell that? Spider stink! My blades are screaming for it! Carve up some bugs, warden - first to a hundred kills buys the rice!', mood: 'excited' }
  ],
  warden_3: [
    { speaker: 'Guard Sora', text: 'D-did you hear that? The bamboo just clicked. Like fingers. What if there is a spider the size of a HOUSE up there right now? You will protect me, right? Ren? RIGHT?', mood: 'sad' }
  ],
  forestWin: [
    { speaker: 'Shrine Crow', text: 'Caw! Forest spawn shredded! But the threads pull two ways - the cavern breathes below, the peak freezes above! Caw!', mood: 'urgent' },
    { speaker: 'You', text: 'Cavern first. Nobody stays breathing silk while I climb past. Then the peak. Then Shira.', mood: 'serious' }
  ],
  caveWin: [
    { speaker: 'Narrator', text: 'The last cocoon splits and its mist dissolves into nothing. From inside: cold air, old tears, and a lullaby finally, finally stopped.', mood: 'calm' },
    { speaker: 'You', text: 'Rest now. All of you. One climb left. I am coming, Shira.', mood: 'serious' }
  ],
  bossIntro: [
    { speaker: 'Shira (Moonweaver)', text: 'You smell of warm hearths. Of someone waiting at home. I had that once. Now I spin it from the people of your village. Join my family, little blade. I will even love you.', mood: 'sinister' },
    { speaker: 'You', text: 'Love is not something you wind around a spool, Shira. Let them go. All of them. Then we will talk about what you used to be.', mood: 'urgent' },
    { speaker: 'Shira (Moonweaver)', text: 'Then I will pull your sister\'s face out of your heart and keep it in silk, where nothing rots and nothing ever leaves.', mood: 'sinister' }
  ],
  bossWin: [
    { speaker: 'Shira (Moonweaver)', text: 'The threads... were never warm at all. I only wanted someone... to wait for me... when I came home.', mood: 'sad' },
    { speaker: 'You', text: 'Then go where someone is waiting. The moon is setting, Shira. It is over.', mood: 'calm' },
    { speaker: 'Shrine Crow', text: 'Caw! The Moonweaver is defeated! The Blood Moon sets! The Order will hear of this night! Caw!', mood: 'excited' }
  ]
};

const CUTSCENES: Record<string, { speaker: string; text: string; mood: string }[]> = {
  intro: [
    { speaker: 'Narrator', text: 'Three nights ago, the threads came over the wall. No scream. No broken lock. Just an empty futon, and one small sandal in the snow.', mood: 'sinister' },
    { speaker: 'Narrator', text: 'Her name is Yae. She is seven years old. Every night since, the moon has swollen redder, and the moonpetals guarding this village has wilted another inch.', mood: 'sinister' },
    { speaker: 'Master Iwato', text: 'I would not send any child of mine up that mountain on a red night. So I am asking you as your teacher, Ren: end this before another house goes quiet.', mood: 'calm' },
    { speaker: 'You', text: 'You do not have to ask, Master. I will cut every thread on Kurenai and carry her down myself. Warm my focus - then open the gate.', mood: 'serious' }
  ],
  forestEntrance: [
    { speaker: 'Guard Daigo', text: 'Iwato\'s seal confirmed. Gates open! ...Listen, warden. Past this point the trees stop whispering back. Fall here, and the mountain keeps twenty mon of your soul\'s weight. Move like water.', mood: 'urgent' },
    { speaker: 'Narrator', text: 'The bamboo closes behind you like a held breath. Threads hang between the stalks - fine as silk, red as veins. Somewhere above, something is humming a lullaby.', mood: 'sinister' },
    { speaker: 'You', text: 'Yae - if you can hear me, hold on. Moonflow, Fourth Form: Riptide!', mood: 'excited' }
  ],
  caveEntrance: [
    { speaker: 'Narrator', text: 'The cavern mouth breathes cold rot. Stalactites weep purple venom. The cocoons overhead sway, though there is no wind.', mood: 'sinister' },
    { speaker: 'You', text: 'Steady. Breathe it in - the fear, the cold, all of it. Then let it out with the cut. Moonflow - Final Form: Endless Tide!', mood: 'serious' }
  ],
  peakEntrance: [
    { speaker: 'Narrator', text: 'The snow falls red at the summit. The Blood Moon hangs so close you can watch it pulse. The shrine bells ring with no hands on the rope.', mood: 'sinister' },
    { speaker: 'You', text: 'Lungs burning. Fingers numb. Good - that means I am still alive to feel them. Stay with me, Hana. Blood Moon Dance.', mood: 'urgent' }
  ],
  bossArrival: [
    { speaker: 'Shira (Moonweaver)', text: 'You climb well, for prey. But the moon is at its zenith, little blade, and every thread on this mountain answers to me. You walked into my family\'s web the moment you loved something.', mood: 'sinister' },
    { speaker: 'You', text: 'My family was never spun from stolen souls. Water cannot be woven, Shira - and it cannot be caught! Blood Moon Dance: Pale Sky!', mood: 'urgent' },
    { speaker: 'Narrator', text: 'The air turns to wire. Shira\'s defenses drink the moonlight - watch for her thread-locks and dash through the gaps!', mood: 'urgent' }
  ]
};

const DIALOGUE_CHOICES: Record<string, {
    question: string;
    choices: {
        text: string;
        reply: string;
        effect?: (s: any) => void;
    }[];
}> = {
    master_need_training: {
        question: "Ask Master Iwato before the gate opens:",
        choices: [
            {
                text: "🌀 Ask: The secret of the Moonflow",
                reply: "Iwato taps your sternum with one finger. 'Water does not argue with the stone. It goes around it. When a demon swings, dash THROUGH it - K, or the dash button. For a heartbeat you are untouchable, and your focus doubles. Flow, boy. Do not fight the river.'"
            },
            {
                text: "🕸️ Ask: How do I break Shira's webs?",
                reply: "'Three sacred cocoons hang in the deep forest, woven from stolen souls. While even one holds, Shira's skin turns every blade. Your minimap glows where they hang. Cut all three - then her flesh remembers it can die.'"
            },
            {
                text: "🦊 Request the ancestral ward mask (+25 Max Stamina)",
                reply: "Iwato presses the old fox mask to your forehead. 'My students wore this before you. Some of them came home.' Warmth settles into your lungs. Maximum stamina permanently +25!",
                effect: (s) => {
                    if (!s.iwatoCharmGranted) {
                        s.maxStamina = (s.maxStamina || 100) + 25;
                        s.stamina = s.maxStamina;
                        s.iwatoCharmGranted = true;
                    }
                }
            },
            {
                text: "🎯 'I am ready. Watch my postures.'",
                reply: "'Then show me. Three strikes on the oak dummy to your right. Clean cuts, full focus - and the gate opens.'"
            }
        ]
    },
    villageIntro: {
        question: "One vow before the gate:",
        choices: [
            {
                text: "🔥 Swear: Protect Hana, whatever it costs (+15% Attack)",
                reply: "You bow until your forehead touches the snow. 'Hana gave up everything she was. I can give this mountain one night.' Heat flickers along your blade - slash damage permanently +15%!",
                effect: (s) => {
                    if (!s.hanaVowGranted) {
                        s.slashDamageMult = (s.slashDamageMult || 1.0) + 0.15;
                        s.hanaVowGranted = true;
                    }
                }
            },
            {
                text: "📜 Ask: Teach me the Order Ranks",
                reply: "'New Moon, Crescent, Quarter... ten steps to the Eclipse. You stand on the first stair, barefoot in the snow. Climb. Every horror you cut down is a step.'"
            },
            {
                text: "⚔️ 'Unseal the gate. I am ready.'",
                reply: "'The moonpetal barrier is lifted. The bamboo forest is old, cold, and hungry. Go, New Moon. Come back with that child - or do not come back at all.'"
            }
        ]
    },
    villager_3: {
        question: "Elder Zenzo, on the sacred cocoons:",
        choices: [
            {
                text: "🏮 Ask: How do I cut a cocoon safely?",
                reply: "Zenzo leans close. 'They burst with poison mist if you cut them point-blank. Strike from a breath away - your Tide Wheel (Skill 1) tears them open from range. Or be stubborn and bathe in the mist. Monks make few rules. That is one.'"
            },
            {
                text: "💰 Accept his offering (+25 Mon)",
                reply: "The old monk presses warm copper into your palm. 'Roku's noodle stall, when you come back down. Eat hot food. The dead envy the living most for that.' +25 Mon!",
                effect: (s) => {
                    if (!s.monkCoinsGranted) {
                        s.mon = (s.mon || 0) + 25;
                        s.monkCoinsGranted = true;
                    }
                }
            }
        ]
    }
};

export const GameWorld: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spawnParticlesRef = useRef<any>(null);
  const advanceDialogRef = useRef<any>(null);
  const [mobileMode, setMobileMode] = useState<'auto' | true | false>('auto');
  
  // Game UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory' | 'loading'>('menu');
  const [currentStage, setCurrentStage] = useState<'village' | 'forest' | 'boss'>('village');
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [dialogLineIdx, setDialogLineIdx] = useState<number>(0);

  // Expanded Story & Customization state hooks
  const [startingStance, setStartingStance] = useState<'water' | 'fire' | 'thunder'>('water');
  const [selectedChoiceReply, setSelectedChoiceReply] = useState<string | null>(null);
  const [showQuests, setShowQuests] = useState(true);
  const [openMapLabels, setOpenMapLabels] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0, rot: 0 });
  const [mapEntities, setMapEntities] = useState<any[]>([]);
  
  // Cutscene Cinematic States
  const [cutsceneId, setCutsceneId] = useState<string | null>(null);
  const [cutsceneLineIdx, setCutsceneLineIdx] = useState<number>(0);
  const advanceCutsceneRef = useRef<any>(null);
  const cameraLookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [dummyHits, setDummyHits] = useState<number>(0);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<'lore' | 'combat' | 'breathing'>('lore');
  const [moonHovered, setMoonHovered] = useState(false);
  const [cutsceneChars, setCutsceneChars] = useState(0);

  // Typewriter reveal for cutscene lines: resets per line, ~2 chars/24ms
  useEffect(() => {
      if (!cutsceneId) return;
      setCutsceneChars(0);
      const full = (CUTSCENES[cutsceneId] || [])[cutsceneLineIdx]?.text || '';
      const iv = setInterval(() => {
          setCutsceneChars(prev => {
              if (prev >= full.length) { clearInterval(iv); return prev; }
              return prev + 2;
          });
      }, 24);
      return () => clearInterval(iv);
  }, [cutsceneId, cutsceneLineIdx]);

  const [dialogChars, setDialogChars] = useState(0);
  // Typewriter reveal for NPC dialog lines and choice replies
  useEffect(() => {
      if (!dialogId) return;
      setDialogChars(0);
      const isSl = dialogId.toLowerCase().includes('warden');
      const arr = DIALOGUES[dialogId] || [{ speaker: isSl ? 'Order Warden' : 'Villager', text: isSl ? 'Maintain full moon focus! Forest demons have been very active lately.' : 'Thank goodness we have the Moonflow Order protecting our humble village!', mood: isSl ? 'urgent' : 'calm' }];
      const full = selectedChoiceReply ?? (arr[dialogLineIdx]?.text || '');
      const iv = setInterval(() => {
          setDialogChars(prev => {
              if (prev >= full.length) { clearInterval(iv); return prev; }
              return prev + 2;
          });
      }, 24);
      return () => clearInterval(iv);
  }, [dialogId, dialogLineIdx, selectedChoiceReply]);
  
  // Environment Settings
  const [envTime, setEnvTime] = useState<number>(12); // 0 to 24 (12 = noon)
  const [envWeather, setEnvWeather] = useState<'clear' | 'rain' | 'snow'>('clear');
  
  // Audio Settings
  const [volMaster, setVolMaster] = useState(1.0);
  const [volMusic, setVolMusic] = useState(1.0);
  const [volSfx, setVolSfx] = useState(1.0);
  const [volAmbient, setVolAmbient] = useState(0.8);

  // Player Progress
  const [health, setHealth] = useState(150);
  const [stamina, setStamina] = useState(100);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [rankIndex, setRankIndex] = useState(0);
  const [enemiesLeft, setEnemiesLeft] = useState(0);
  const [damageTexts, setDamageTexts] = useState<{id: string, val: number, x: number, y: number, isCrit: boolean}[]>([]);
  const [tipModal, setTipModal] = useState<{title: string, text: string} | null>(null);
  const [comboCount, setComboCount] = useState(0);

  // Shop and Quest Progress
  const [mon, setMon] = useState<number>(50);
  const [activeShop, setActiveShop] = useState<string | null>(null);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [showQuestTracker, setShowQuestTracker] = useState(() => !(('ontouchstart' in window) || navigator.maxTouchPoints > 0));
  const [acceptedQuests, setAcceptedQuests] = useState<string[]>([]);

  const saveGameData = () => {
      const s = stateRef.current;
      try {
          localStorage.setItem('cm_savegame', obfuscateData({
              stage: s.stage,
              health: s.health,
              maxHealth: s.maxHealth,
              stamina: s.stamina,
              maxStamina: s.maxStamina,
              xp: s.xp,
              level: s.level,
              rankIdx: s.rankIdx,
              stats: s.stats,
              tips: s.tips,
              mon: s.mon,
              slashDamageMult: s.slashDamageMult,
              critDamageMult: s.critDamageMult,
              umbrellaGetaActive: s.umbrellaGetaActive,
              sushiNigiriActive: s.sushiNigiriActive,
              moonpetalHealActive: s.moonpetalHealActive,
              spiritFocusMult: s.spiritFocusMult,
              swordRefinements: s.swordRefinements,
              acceptedQuests: Array.from(acceptedQuests),
              hideMainQuests: hideMainQuests,
              showQuestTracker: showQuestTracker,
              openMapLabels: openMapLabels,
              questsProgress: s.questsProgress,
          dummyHits: s.dummyHits || 0
          }));
          setSaveToastVisible(true);
          setTimeout(() => {
              setSaveToastVisible(false);
          }, 2500);
      } catch(e) {}
  };

  const loadGameData = () => {
      const saved = localStorage.getItem('cm_savegame');
      if (saved) {
          audioManager.playWater();
          startGame(false);
          setMenuOpen(false);
      }
  };
  const [quests, setQuests] = useState<Record<string, {
      title: string;
      desc: string;
      target: number;
      current: number;
      rewardMon: number;
      rewardXp: number;
      status: 'available' | 'active' | 'claimable' | 'completed';
      isMain?: boolean;
  }>>({
      merchant_ramen: { title: "Noodle Delivery", desc: "Deal 300 total points of damage inside the Training Plaza!", target: 300, current: 0, rewardMon: 40, rewardXp: 80, status: 'available', isMain: true },
      merchant_tea: { title: "Matcha Feast", desc: "Defeat 3 Bamboo training dummies or forest demons!", target: 3, current: 0, rewardMon: 50, rewardXp: 100, status: 'available' },
      merchant_forge: { title: "Blacksmith Steel", desc: "Perform 5 element-infused special attacks (Water/Fire/Thunder)!", target: 5, current: 0, rewardMon: 60, rewardXp: 120, status: 'available' },
      merchant_mask: { title: "Artisan Mask Warding", desc: "Unleash 8 swift evasive movement dashes!", target: 8, current: 0, rewardMon: 45, rewardXp: 90, status: 'available' },
      merchant_sushi: { title: "Sushicombat Perfection", desc: "Reach a continuous 12-hit strike combo streak!", target: 12, current: 0, rewardMon: 55, rewardXp: 110, status: 'available' },
      merchant_umbrella: { title: "Wind-Weaver Guarding", desc: "Block or guard 5 times during aggressive battles!", target: 5, current: 0, rewardMon: 50, rewardXp: 100, status: 'available' },
      merchant_herbs: { title: "Herbal Vitality", desc: "Stay active for 45 full seconds of steady focus!", target: 45, current: 0, rewardMon: 70, rewardXp: 140, status: 'available' },
      merchant_sake: { title: "Focus Legend", desc: "Slay 5 powerful demons!", target: 5, current: 0, rewardMon: 80, rewardXp: 160, status: 'available' }
  });
  const [hideMainQuests, setHideMainQuests] = useState(false);

  // Mutable Game Engine State
  const stateRef = useRef({
    stage: 'village',
    nextStageTrigger: false,
    
    position: new THREE.Vector3(0, 5, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: 0,
    isOnFloor: false,
    
    input: { x: 0, y: 0, jump: false, interact: false, attack: false, dash: false, skill1: false, skill2: false, skill3: false },
    activeDialog: null as string | null,
    
    // Cutscenes & Storyline Progressions
    activeCutscene: null as string | null,
    cutsceneStepIdx: 0,
    dummyHits: 0,
    
    // Stats
    health: 150, maxHealth: 150,
    stamina: 100, maxStamina: 100,
    xp: 0, level: 1, rankIdx: 0,
    invulnTimer: 0,
    
    // Shop Upgrades
    mon: 50,
    ramenBuffActive: false,
    slashDamageMult: 1.0,
    critDamageMult: 2.0,
    umbrellaGetaActive: false,
    sushiNigiriActive: false,
    moonpetalHealActive: false,
    spiritFocusMult: 1.0,
    swordRefinements: 0, // Upgradable Genta sword refinements
    hudTimer: 0,
    questsProgress: { damageDealt: 0, kills: 0, skills: 0, dashes: 0, maxCombo: 0, blocks: 0, timeSpent: 0 },

    // Tracking for performance reactive updates (Avoiding infinite Renders/Lags)
    lastSyncedHealth: 150,
    lastSyncedStamina: 100,
    lastSyncedXp: 0,
    lastSyncedLevel: 1,
    lastSyncedRankIdx: 0,
    lastSyncedEnemiesLeft: 0,
    lastSyncedComboCount: 0,
    lastSyncedMon: 50,

    hitStreak: 0,
    hitStreakTimer: 0,

    // Combat Machine
    isAttacking: false,
    attackPhase: 0, // 1, 2, 3 for combo
    attackTimer: 0,
    attackType: 'normal' as 'normal' | 'water' | 'fire',
    comboWindow: 0,
    isDashing: false, dashTimer: 0,
    isBlocking: false, blockTimer: 0,
    hitStopTimer: 0,
    shakeTrauma: 0,
    ghostTrails: [] as {pos: THREE.Vector3, rot: number, life: number}[],
    
    // NPC / Entity Interactions
    nearestInteractableDist: 999,
    nearestInteractableId: '',
    enemies: [] as any[],
    shops: [] as any[],
    projectiles: [] as any[],
    
    villageTimer: 0,
    saveTimer: 0,
    stats: { attacks: 0, dashes: 0, water: 0 },
    envTime: 12.0,
    envWeather: 'clear' as 'clear'|'rain'|'snow',
    activeTip: null as {title: string, text: string} | null,
    tips: { dash: false, water: false, fire: false }
  });

  // Security locks: prevent inspecting, right clicks, view-source, text-selection, and copying.
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', 'Alert: Code and content copy protection is active to prevent game interference.');
    };
    const preventSelectStart = (e: Event) => e.preventDefault();
    
    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'F12') {
            e.preventDefault();
            return;
        }
        const ctrlOrMeta = e.ctrlKey || e.metaKey;
        if (ctrlOrMeta) {
            const key = e.key.toLowerCase();
            if (key === 'u' || key === 's' || key === 'i' || key === 'j' || key === 'c' || key === 'a' || key === 'p') {
                e.preventDefault();
            }
        }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('selectstart', preventSelectStart);
    document.addEventListener('keydown', handleKeydown, { capture: true });

    return () => {
        document.removeEventListener('contextmenu', preventContextMenu);
        document.removeEventListener('copy', preventCopy);
        document.removeEventListener('selectstart', preventSelectStart);
        document.removeEventListener('keydown', handleKeydown, { capture: true });
    };
  }, []);

  // Sync state upward when needed
  useEffect(() => { stateRef.current.activeDialog = dialogId; }, [dialogId]);
  useEffect(() => {
      stateRef.current.activeCutscene = cutsceneId;
      stateRef.current.cutsceneStepIdx = cutsceneLineIdx;
  }, [cutsceneId, cutsceneLineIdx]);
  useEffect(() => {
      stateRef.current.dummyHits = dummyHits;
  }, [dummyHits]);
  useEffect(() => { 
      stateRef.current.envTime = envTime; 
      stateRef.current.envWeather = envWeather; 
  }, [envTime, envWeather]);

  useEffect(() => {
    const isPaused = gameState === 'menu' || menuOpen || settingsOpen;
    audioManager.setPaused(isPaused);
  }, [gameState, menuOpen, settingsOpen]);

  // Auto-pause when the tab loses focus or is backgrounded (calls, app switches, portal iframes)
  useEffect(() => {
      const pause = () => { if (gameState === 'playing') setMenuOpen(true); };
      const onVisibility = () => { if (document.visibilityState === 'hidden') pause(); };
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', pause);
      return () => {
          document.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('blur', pause);
      };
  }, [gameState]);

  useEffect(() => {
    audioManager.setVolumes(volMaster, volMusic, volSfx, volAmbient);
    audioManager.setAmbient(stateRef.current.stage || 'none', envWeather);
  }, [volMaster, volMusic, volSfx, volAmbient, envWeather]);

  useEffect(() => {
    if (mobileMode === 'auto') {
      const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      setMobileMode(isMobile);
    }
  }, [mobileMode]);

  // Main 3D Engine Initialization
  useEffect(() => {
    if (!canvasRef.current || !mountRef.current) return;
    let width = mountRef.current.clientWidth;
    let height = mountRef.current.clientHeight;

    const isMobileDevice = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: !isMobileDevice, powerPreference: 'high-performance' });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobileDevice ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isMobileDevice;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const renderPass = new RenderPass(scene, camera);
    const bloomRes = isMobileDevice ? new THREE.Vector2(256, 256) : new THREE.Vector2(512, 512);
    const bloomPass = new UnrealBloomPass(bloomRes, 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.8;
    bloomPass.strength = 2.0;
    bloomPass.radius = 0.7;

    const outputPass = new OutputPass();

    const composer = new EffectComposer(renderer);
    
    // Add SSAO
    const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
    ssaoPass.kernelRadius = 16;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.1;
    
    composer.addPass(renderPass);
    composer.addPass(ssaoPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    const handleResize = () => {
      width = mountRef.current?.clientWidth || window.innerWidth;
      height = mountRef.current?.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Context & Common Objects
    const colliders: { box: THREE.Box3 }[] = [];
    let currentLoadedStage = '';
    
    // Lighting setup mapping
    const lightsGrp = new THREE.Group();
    scene.add(lightsGrp);

    // Particle System (Global Pool)
    const maxParticles = isMobileDevice ? 500 : 2500;
    const pGeom = new THREE.BufferGeometry();
    const pPos = new Float32Array(maxParticles * 3);
    const pCol = new Float32Array(maxParticles * 3);
    const pSizes = new Float32Array(maxParticles);
    
    const posAttr = new THREE.BufferAttribute(pPos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    pGeom.setAttribute('position', posAttr);

    const colAttr = new THREE.BufferAttribute(pCol, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    pGeom.setAttribute('color', colAttr);

    const sizeAttr = new THREE.BufferAttribute(pSizes, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    pGeom.setAttribute('size', sizeAttr);

    // Optimized math & rendering reuse scopes to avoid per-frame GC spikes
    const ghostMat4 = new THREE.Matrix4();
    const ghostSharedColor = new THREE.Color(0xaaccff);
    const tempColor = new THREE.Color();

    const pMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size; attribute vec3 color; varying vec3 vColor;
        void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (10.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() { float d = distance(gl_PointCoord, vec2(0.5)); if(d > 0.5) discard; gl_FragColor = vec4(vColor * 3.0, max(0.0, 1.0 - (d * 2.0))); }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particlesSystem = new THREE.Points(pGeom, pMat);
    scene.add(particlesSystem);
    const particlesList: any[] = [];
    
    // Ghost Trails System
    const ghostGeom = new THREE.CylinderGeometry(0.5, 0.5, 2.0, 8);
    const ghostMat = new THREE.MeshBasicMaterial({color: 0xaaccff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false});
    const ghostInstanced = new THREE.InstancedMesh(ghostGeom, ghostMat, 20);
    ghostInstanced.count = 0;
    scene.add(ghostInstanced);

    const spawnParticles = (pos: THREE.Vector3, colorHex: number, count: number, type: 'blood'|'water'|'fire'|'wind'|'ash'|'thunder'|'magic') => {
       const color = new THREE.Color(colorHex);
       const actualCount = isMobileDevice ? Math.ceil(count / 3) : count;
       for(let i=0; i<actualCount; i++) {
         const vel = new THREE.Vector3((Math.random()-0.5)*10, Math.random()*8, (Math.random()-0.5)*10);
         if (type==='blood') { vel.y += 5; }
         if (type==='water') { vel.multiplyScalar(1.5); }
         if (type==='thunder') { vel.multiplyScalar(2.2); } // Extreme shockwave speed
         particlesList.push({
           pos: pos.clone().add(new THREE.Vector3((Math.random()-0.05)*1.5, Math.random()*1.5, (Math.random()-0.05)*1.5)),
           vel, color: color.clone(), life: 1.0,
           decay: type === 'blood' ? 1.5 : (type === 'fire' ? 2.5 : type === 'thunder' ? 3.0 : 1.0),
           size: type === 'blood' ? 20 : (type === 'fire' ? 60 : type === 'thunder' ? 45 : 40), type
         });
       }
    };
    spawnParticlesRef.current = spawnParticles;

    // Weather System
    const wCount = isMobileDevice ? 200 : 500;
    const wPos = new Float32Array(wCount * 3);
    const wVel = new Float32Array(wCount * 3);
    for (let i = 0; i < wCount; i++) {
        wPos[i * 3] = (Math.random() - 0.5) * 100; wPos[i * 3 + 1] = Math.random() * 50; wPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
        wVel[i * 3] = Math.random() * Math.PI * 2; wVel[i * 3 + 1] = 2.0 + Math.random() * 3.0; wVel[i * 3 + 2] = 0.5 + Math.random();
    }
    const wGeom = new THREE.BufferGeometry();
    wGeom.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
    const wMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            uIsRain: { value: 0.0 }, // 1.0 for rain
            uSize: { value: 1.0 }
        },
        vertexShader: `
            uniform float uSize;
            varying float vFade;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float dist = max(-mvPosition.z, 0.001);
                // Clamp point size and fade particles near the camera - an unclamped point at the near plane balloons to fill the whole screen
                gl_PointSize = clamp(uSize * (20.0 / dist), 0.0, 48.0);
                vFade = smoothstep(0.8, 4.0, dist);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uIsRain;
            varying float vFade;
            void main() {
                vec2 pt = gl_PointCoord - vec2(0.5);
                float dist = length(pt);
                float rainDist = length(vec2(pt.x * 6.0, pt.y)); // Elongated for rain
                float d = mix(dist, rainDist, uIsRain);
                if (d > 0.5) discard;
                float alpha = 1.0 - (d * 2.0);
                gl_FragColor = vec4(uColor, alpha * (1.0 - uIsRain * 0.4) * vFade); // rain slightly more transparent
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const weatherSystem = new THREE.Points(wGeom, wMat);
    scene.add(weatherSystem);

    // Slash Effect Grp
    const slashGrp = new THREE.Group();
    const slashShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorMain: { value: new THREE.Color(0xffffff) },
        opacityAnim: { value: 0 },
        formType: { value: 0 } // 0: normal, 1: water, 2: fire
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorMain;
        uniform float opacityAnim;
        uniform int formType;
        varying vec2 vUv;

        float random (in vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          // vUv.x goes along the trail curve (0 to 1)
          // vUv.y goes across the trail width (0 to 1)
          
          float fadeOut = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.4, 1.0, vUv.x));
          float widthFade = smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
          float baseMask = fadeOut * widthFade;
          
          vec3 finalColor = colorMain;
          float typeAlpha = 1.0;
          
          if (formType == 1) {
             // Water: Stylized Ukiyo-e wave look with crisp edges
             float waveOff = noise(vec2(vUv.x * 12.0 - time * 8.0, time * 2.0)) * 0.15;
             float n = noise(vec2(vUv.x * 20.0 - time * 20.0, (vUv.y + waveOff) * 15.0));
             float n2 = noise(vec2(vUv.x * 40.0 - time * 30.0, vUv.y * 30.0));
             
             // Create 'foam' and deep water layers
             float waterMask = smoothstep(0.4, 0.6, n + n2*0.3);
             float foamMask = smoothstep(0.65, 0.75, n + n2*0.5);
             
             finalColor = mix(vec3(0.0, 0.3, 0.9), vec3(0.0, 0.7, 1.0), waterMask);
             finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), foamMask);
             
             typeAlpha = (waterMask + foamMask * 0.5) * (0.5 + 0.5*vUv.x);
          } else if (formType == 2) {
             // Fire (Blood Moon Dance): intense burning flames, sharp distortions
             float flameOff = noise(vec2(vUv.x * 5.0 - time * 15.0, time * 3.0)) * 0.2;
             float n = noise(vec2(vUv.x * 15.0 - time * 25.0, (vUv.y + flameOff) * 8.0));
             float n2 = noise(vec2(vUv.x * 35.0 - time * 40.0, vUv.y * 15.0));
             
             float burnMask = smoothstep(0.3, 0.5, n * 0.7 + n2 * 0.3);
             float coreMask = smoothstep(0.6, 0.8, n * 0.5 + n2 * 0.5);
             
             finalColor = mix(vec3(1.0, 0.1, 0.0), vec3(1.0, 0.5, 0.0), burnMask);
             finalColor = mix(finalColor, vec3(1.0, 0.9, 0.5), coreMask);
             
             typeAlpha = (burnMask * 1.5) * (0.3 + 0.7*vUv.x);
          } else if (formType == 3) {
             // Stormstep: crackling amber-gold electric bolt pattern with extremely fast flicker
             float thunderTime = time * 55.0; 
             float arc1 = sin(vUv.x * 12.0 - thunderTime) * 0.15;
             float arc2 = cos(vUv.x * 35.0 + thunderTime * 1.4) * 0.08;
             float arc3 = noise(vec2(vUv.x * 25.0 + thunderTime, time * 10.0)) * 0.12;
             
             float dist = abs(vUv.y - 0.5 - arc1 - arc2 - arc3);
             float bolt = 1.0 - smoothstep(0.0, 0.06, dist);
             float outerGlow = 1.0 - smoothstep(0.0, 0.35, dist);
             
             finalColor = mix(vec3(1.0, 0.45, 0.0), vec3(1.0, 0.92, 0.15), bolt);
             finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), bolt * bolt * 1.5);
             
             float n = noise(vec2(vUv.x * 45.0 - thunderTime * 0.5, vUv.y * 35.0));
             float sparks = smoothstep(0.8, 0.9, n) * 2.0;
             
             typeAlpha = (bolt * 4.5 + outerGlow * 1.2 + sparks) * (0.4 + 0.6 * sin(thunderTime * 2.0));
          } else {
             // Normal slash: sharp, hyper-realistic anime blade crescent
             float edge = smoothstep(0.45, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 0.55, vUv.y));
             float motionLines = smoothstep(0.6, 0.9, noise(vec2(vUv.x * 80.0 - time * 60.0, vUv.y * 5.0)));
             
             // Core glow is white/cyan, outer is more transparent
             vec3 coreColor = vec3(1.0, 1.0, 1.0);
             vec3 outerColor = vec3(0.5, 0.8, 1.0);
             
             finalColor = mix(outerColor, coreColor, edge * 2.0);
             typeAlpha = edge * 2.5 + motionLines * 0.5;
             
             // Fade the tips of the crescent to 0
             typeAlpha *= smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
          }

          float finalOpacity = opacityAnim * baseMask * typeAlpha;
          gl_FragColor = vec4(finalColor * 3.0, finalOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    // Replace Torus with an open Cylinder to create a sweeping 3D ribbon/trail effect
    const slashMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.0, 64, 1, true, 0, Math.PI), slashShaderMat);
    slashGrp.add(slashMesh);
    scene.add(slashGrp);

    // ----- Character Builders -----
    const buildRealisticLimb = (w:number, h:number, colorStr: number, isCylinder=false) => {
      const mat = new THREE.MeshStandardMaterial({ color: colorStr, roughness: 0.8 });
      const geom = isCylinder ? new THREE.CylinderGeometry(w/2, w/2.2, h, 8) : new THREE.BoxGeometry(w, h, w);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const pivot = new THREE.Group();
      mesh.position.y = -h/2;
      pivot.add(mesh);
      return { pivot, mesh, mat };
    };

    const buildPlayerModel = () => {
      const g = new THREE.Group();
      // Textures (Ren's wave Haori pattern)
      const cCanvas = document.createElement('canvas'); cCanvas.width=64; cCanvas.height=64;
      const ctx = cCanvas.getContext('2d')!;
      ctx.fillStyle = '#161016'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#8a1428';
      for (let row = 0; row < 4; row++) {
          const y = 4 + row * 16;
          const off = (row % 2) * 8;
          for (let x = -8; x < 64; x += 16) { ctx.fillRect(x + off, y, 8, 6); }
      }
      const haoriTex = new THREE.CanvasTexture(cCanvas); haoriTex.magFilter = THREE.NearestFilter;
      const haoriMat = new THREE.MeshStandardMaterial({map: haoriTex, roughness: 1.0, side: THREE.DoubleSide});
      
      const headG = new THREE.Group();
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({color: 0xffccaa}));
      head.position.y = 1.4; head.castShadow = true;
      
      // Detailed Anime Hair Clusters (Replacing single box hair)
      const hairMat = new THREE.MeshStandardMaterial({color: 0x171722, roughness: 0.95});
      const hairMain = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.28, 0.56), hairMat);
      hairMain.position.y = 1.65;
      
      const hairSpikes = new THREE.Group();
      
      // Face framing front spikes
      for (let i = 0; i < 7; i++) {
          const spikeObj = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 4), hairMat);
          spikeObj.position.set(-0.25 + i * 0.08, 1.52, 0.23);
          spikeObj.rotation.x = 0.4 + (i % 3) * 0.1;
          spikeObj.rotation.y = (i - 3) * 0.15;
          hairSpikes.add(spikeObj);
      }
      
      // Flowing wild back spikes
      for (let i = 0; i < 5; i++) {
          const spikeObj = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), hairMat);
          spikeObj.position.set(-0.18 + i * 0.09, 1.44, -0.22);
          spikeObj.rotation.x = -0.5 - (i % 2) * 0.1;
          spikeObj.rotation.z = (i - 2) * 0.12;
          hairSpikes.add(spikeObj);
      }
      
      // Sides/temple clumps
      const lSideClump = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), hairMat);
      lSideClump.position.set(0.24, 1.42, 0.15); lSideClump.rotation.z = -0.4;
      const rSideClump = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), hairMat);
      rSideClump.position.set(-0.24, 1.42, 0.15); rSideClump.rotation.z = 0.4;
      hairSpikes.add(lSideClump, rSideClump);
      
      const scar = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshBasicMaterial({color: 0x882222}));
      scar.position.set(-0.15, 1.45, 0.26);
      
      const rEye = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshBasicMaterial({color: 0x442222}));
      rEye.position.set(0.12, 1.42, 0.26);
      const lEye = rEye.clone(); lEye.position.x = -0.12;
      
      // Crescent Earrings (pale moon-drop pattern)
      const earCanvas = document.createElement('canvas'); earCanvas.width=16; earCanvas.height=32;
      const eCtx = earCanvas.getContext('2d')!;
      eCtx.fillStyle = '#14141c'; eCtx.fillRect(0,0,16,32);
      eCtx.fillStyle = '#e8ecff'; eCtx.beginPath(); eCtx.arc(8, 12, 6, 0, Math.PI*2); eCtx.fill(); // Pale moon disc
      eCtx.fillStyle = '#14141c'; eCtx.beginPath(); eCtx.arc(10.5, 10, 5, 0, Math.PI*2); eCtx.fill(); // Cut into a crescent
      eCtx.strokeStyle = '#8a1428'; eCtx.lineWidth = 1; eCtx.strokeRect(0,0,16,32);
      const earTex = new THREE.CanvasTexture(earCanvas);
      
      const earMat = new THREE.MeshBasicMaterial({map: earTex, transparent: true, side: THREE.DoubleSide});
      const rEarring = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16), earMat);
      rEarring.position.set(0.26, 1.25, 0.06); rEarring.rotation.y = Math.PI/2;
      const lEarring = rEarring.clone(); lEarring.position.x = -0.26;
 
      headG.add(head, hairMain, hairSpikes, scar, rEye, lEye, rEarring, lEarring); g.add(headG);
 
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), haoriMat);
      torso.position.y = 0.8; torso.castShadow = true; g.add(torso);
 
      // Moonflow Order uniform details: white belt, collar trim, gold buttons
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.42), new THREE.MeshStandardMaterial({color: 0xf5f5f5, roughness: 0.85}));
      belt.position.y = 0.44; g.add(belt);
      const collarMat = new THREE.MeshStandardMaterial({color: 0xf5f5f5, roughness: 0.85});
      const lCollar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.05), collarMat);
      lCollar.position.set(-0.14, 1.2, 0.19); lCollar.rotation.z = 0.5; g.add(lCollar);
      const rCollar = lCollar.clone(); rCollar.position.x = 0.14; rCollar.rotation.z = -0.5; g.add(rCollar);
      const buttonMat = new THREE.MeshStandardMaterial({color: 0xd4af37, metalness: 0.9, roughness: 0.25});
      for (let bi = 0; bi < 3; bi++) {
          const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), buttonMat);
          btn.rotation.x = Math.PI / 2;
          btn.position.set(0, 1.05 - bi * 0.18, 0.21);
          g.add(btn);
      }
 
      const lArm = buildRealisticLimb(0.2, 0.7, 0x8a1428, true); lArm.pivot.position.set(-0.4, 1.1, 0); g.add(lArm.pivot);
      const rArm = buildRealisticLimb(0.2, 0.7, 0x8a1428, true); rArm.pivot.position.set(0.4, 1.1, 0); g.add(rArm.pivot);
      
      // Waving Haori (Kimono coat) Left, Right, & Back pivot segments
      const backFlapPivot = new THREE.Group();
      backFlapPivot.position.set(0, 0.76, -0.16);
      const backFlap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.1), haoriMat);
      backFlap.position.y = -0.3; backFlap.castShadow = true;
      backFlapPivot.add(backFlap);
      g.add(backFlapPivot);
      
      const lFlapPivot = new THREE.Group();
      lFlapPivot.position.set(-0.29, 0.76, 0);
      const lFlap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.36), haoriMat);
      lFlap.position.y = -0.3; lFlap.castShadow = true;
      lFlapPivot.add(lFlap);
      g.add(lFlapPivot);
      
      const rFlapPivot = new THREE.Group();
      rFlapPivot.position.set(0.29, 0.76, 0);
      const rFlap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.36), haoriMat);
      rFlap.position.y = -0.3; rFlap.castShadow = true;
      rFlapPivot.add(rFlap);
      g.add(rFlapPivot);
 
      // Black uniform pants
      const lLeg = buildRealisticLimb(0.25, 0.8, 0x1a1a1a); lLeg.pivot.position.set(-0.15, 0.8, 0); g.add(lLeg.pivot);
      const rLeg = buildRealisticLimb(0.25, 0.8, 0x1a1a1a); rLeg.pivot.position.set(0.15, 0.8, 0); g.add(rLeg.pivot);
 
      // Moonsteel Sword
      const swordGrp = new THREE.Group();
      
      const bladeGeom = new THREE.BoxGeometry(0.03, 1.4, 0.12);
      const blade = new THREE.Mesh(bladeGeom, new THREE.MeshStandardMaterial({color: 0x111111, metalness: 1.0, roughness: 0.15}));
      blade.position.y = 0.8;
      
      const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.4, 0.04), new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.8, roughness: 0.3}));
      bladeEdge.position.set(0, 0.8, -0.05); // white edge
      
      // Embedded glowing elemental energy core path!
      const swordGlowMat = new THREE.MeshBasicMaterial({color: 0x00aaff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending});
      const glowCore = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.3, 0.02), swordGlowMat);
      glowCore.position.set(0.012, 0.8, 0);
      
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8), new THREE.MeshStandardMaterial({color: 0x111111}));
      guard.position.y = 0.1;
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 8), new THREE.MeshStandardMaterial({color: 0xbb0000}));
      hilt.position.y = -0.05;
      
      swordGrp.add(blade, bladeEdge, glowCore, guard, hilt);
      swordGrp.position.set(0, -0.6, 0.1); swordGrp.rotation.x = Math.PI / 2;
      rArm.pivot.add(swordGrp);
 
      const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.15), new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8}));
      scabbard.position.set(-0.35, 0.8, -0.2);
      scabbard.rotation.z = Math.PI / 4;
      scabbard.rotation.x = Math.PI / 8;
      g.add(scabbard);
 
      return { group: g, headG, lArm: lArm.pivot, rArm: rArm.pivot, lLeg: lLeg.pivot, rLeg: rLeg.pivot, torso, swordGrp, backFlapPivot, lFlapPivot, rFlapPivot, swordGlowMat };
    };

    const playerObj = buildPlayerModel();
    scene.add(playerObj.group);

    const buildEnemy = (type: string, variationIndex?: number) => {
      const g = new THREE.Group();
      let scale = 1; let skinC = 0xffccaa; let clothesC = 0x221111;
      let isBoss = false; let hasMutations = false; let isWarden = false;
      
      if (type === 'boss' || type === 'greater_spawn' || type === 'elder_spawn') { scale = 2.5; isBoss = true; skinC = 0xaaccdd; }
      else if (type === 'silk_spawn') { scale = 1.6; skinC = 0xffffff; clothesC = 0xdddddd; hasMutations = true; }
      else if (type === 'warden') { scale = 1.0; skinC = 0xffccaa; clothesC = 0x1a1a1a; isWarden = true; }
      else if (type === 'greater_spawn') { scale = 2.0; skinC = 0xccffcc; clothesC = 0x111111; }
      else if (type === 'elder_spawn') { scale = 2.2; skinC = 0xffbbdd; clothesC = 0x882244; isBoss = true; }
      else if (type === 'normal') { scale = 1.0; skinC = 0xffe0cc; }
      
      const civIdx = type === 'normal' ? (variationIndex !== undefined ? variationIndex : Math.floor(Math.random() * 4)) : 0;
      
      const headG = new THREE.Group();
      const headMat = new THREE.MeshStandardMaterial({color: skinC});
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5*scale, 0.5*scale, 0.5*scale), headMat);
      head.position.y = 1.4 * scale; head.castShadow=true;
      headG.add(head);
      
      // Dynamic hair/head decorations based on civilian variation vs standard/demon
      if (type === 'normal') {
          let hairColor = 0x1a110a; // Default black
          if (civIdx === 1) hairColor = 0x3d201c; // Dark brown
          else if (civIdx === 2) hairColor = 0xdfdfdf; // Wise elder grey
          else if (civIdx === 3) hairColor = 0x222d3d; // Cool dark teal-blue
          
          const hMat = new THREE.MeshStandardMaterial({color: hairColor, roughness: 0.95});
          
          if (civIdx === 2) {
              // Elder fringe hair and broad straw hat
              const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.54 * scale, 0.12 * scale, 0.54 * scale), hMat);
              fringe.position.set(0, 1.34 * scale, -0.1 * scale);
              headG.add(fringe);
              
              const strawHat = new THREE.Mesh(new THREE.ConeGeometry(0.64 * scale, 0.22 * scale, 12), new THREE.MeshStandardMaterial({color: 0xcca65f, roughness: 0.95}));
              strawHat.position.y = 1.7 * scale;
              headG.add(strawHat);
              
              // White long beard and bushy white eyebrows
              const beard = new THREE.Mesh(new THREE.ConeGeometry(0.15 * scale, 0.46 * scale, 4), new THREE.MeshStandardMaterial({color: 0xeeeeee, roughness: 1.0}));
              beard.position.set(0, 1.15 * scale, 0.18 * scale);
              beard.rotation.x = 0.25;
              headG.add(beard);
          } else if (civIdx === 1) {
              // Geisha/Townswoman bun style
              const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 8), hMat);
              bun.position.set(0, 1.76 * scale, -0.06 * scale);
              headG.add(bun);
              
              // Kanzashi golden hair pin with red tip
              const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * scale, 0.01 * scale, 0.38 * scale, 4), new THREE.MeshStandardMaterial({color: 0xffcc33, metalness: 0.8, roughness: 0.2}));
              pin.position.set(0.16 * scale, 1.72 * scale, 0.05 * scale);
              pin.rotation.z = -1.2;
              headG.add(pin);
              
              const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 0.12 * scale, 0.52 * scale), hMat);
              bangs.position.set(0, 1.6 * scale, 0.05 * scale);
              headG.add(bangs);
          } else if (civIdx === 0) {
              // Merchant headband (Hachimaki)
              const mHair = new THREE.Mesh(new THREE.BoxGeometry(0.54 * scale, 0.2 * scale, 0.54 * scale), hMat);
              mHair.position.y = 1.63 * scale;
              headG.add(mHair);
              
              const band = new THREE.Mesh(new THREE.BoxGeometry(0.56 * scale, 0.06 * scale, 0.56 * scale), new THREE.MeshBasicMaterial({color: 0xffffff}));
              band.position.y = 1.54 * scale;
              headG.add(band);
              
              const knot = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.08 * scale, 0.14 * scale), new THREE.MeshBasicMaterial({color: 0xffffff}));
              knot.position.set(0.28 * scale, 1.54 * scale, 0.12 * scale);
              headG.add(knot);
          } else {
              // Anime spikes
              const mHair = new THREE.Mesh(new THREE.BoxGeometry(0.54 * scale, 0.22 * scale, 0.54 * scale), hMat);
              mHair.position.y = 1.63 * scale;
              headG.add(mHair);
              
              for (let i = 0; i < 5; i++) {
                  const s = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.28 * scale, 4), hMat);
                  s.position.set((-0.18 + i * 0.09) * scale, 1.52 * scale, 0.23 * scale);
                  s.rotation.x = 0.4;
                  headG.add(s);
              }
          }
      } else {
          // Wild spiky demonic/anime hair (unifying aesthetics)
          const hairColor = type === 'silk_spawn' ? 0xffffff : (isWarden ? 0xeeddaa : 0x3d2020);
          const eHairMat = new THREE.MeshStandardMaterial({color: hairColor, roughness: 0.95});
          const eHairMain = new THREE.Mesh(new THREE.BoxGeometry(0.54 * scale, 0.2 * scale, 0.54 * scale), eHairMat);
          eHairMain.position.y = 1.63 * scale;
          headG.add(eHairMain);
          
          const eHairSpikes = new THREE.Group();
          for (let i = 0; i < 6; i++) {
              const spikeObj = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.3 * scale, 4), eHairMat);
              spikeObj.position.set((-0.2 + i * 0.08) * scale, 1.5 * scale, 0.23 * scale);
              spikeObj.rotation.x = 0.35;
              spikeObj.rotation.y = (i - 2.5) * 0.15;
              eHairSpikes.add(spikeObj);
          }
          headG.add(eHairSpikes);
      }
      
      if (type === 'normal') {
          // Beautiful expressive anime eyes for villagers
          const eyeDMat = new THREE.MeshBasicMaterial({color: 0x18100d}); // Warm dark iris
          const rEye = new THREE.Mesh(new THREE.PlaneGeometry(0.08*scale, 0.08*scale), eyeDMat);
          rEye.position.set(0.11*scale, 1.43*scale, 0.261*scale);
          const lEye = rEye.clone(); lEye.position.x = -0.11*scale;
          
          const shineMat = new THREE.MeshBasicMaterial({color: 0xffffff});
          const rShine = new THREE.Mesh(new THREE.PlaneGeometry(0.028*scale, 0.028*scale), shineMat);
          rShine.position.set(0.12*scale, 1.45*scale, 0.262*scale);
          const lShine = rShine.clone(); lShine.position.x = -0.10*scale;
          
          const blushMat = new THREE.MeshBasicMaterial({color: 0xff5566, transparent: true, opacity: 0.55});
          const rBlush = new THREE.Mesh(new THREE.PlaneGeometry(0.07*scale, 0.035*scale), blushMat);
          rBlush.position.set(0.14*scale, 1.32*scale, 0.262*scale);
          const lBlush = rBlush.clone(); lBlush.position.x = -0.14*scale;
          
          headG.add(rEye, lEye, rShine, lShine, rBlush, lBlush);
      } else if (!isWarden) {
          // Demonic glowing slit eyes
          const rEye = new THREE.Mesh(new THREE.PlaneGeometry(0.1*scale, 0.05*scale), new THREE.MeshBasicMaterial({color: type==='elder_spawn'?0xffcc00:0xff1100}));
          rEye.position.set(0.15*scale, 1.42*scale, 0.26*scale);
          const lEye = rEye.clone(); lEye.position.x = -0.15*scale;
          headG.add(rEye, lEye);
          
          // Spider face web markings or blood veins
          const faceMarkMat = new THREE.MeshBasicMaterial({color: type==='silk_spawn'?0xcc0000:0xdd0033, transparent: true, opacity: 0.8});
          if (type === 'silk_spawn') {
              // spider web face lines
              const web1 = new THREE.Mesh(new THREE.PlaneGeometry(0.08*scale, 0.16*scale), faceMarkMat);
              web1.position.set(-0.14*scale, 1.34*scale, 0.261*scale);
              const web2 = web1.clone(); web2.position.x = 0.14*scale;
              headG.add(web1, web2);
          } else {
              // demonic red forehead scar / vein mark
              const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.16*scale, 0.16*scale), faceMarkMat);
              mark.position.set(-0.06*scale, 1.52*scale, 0.261*scale);
              headG.add(mark);
          }
          
          // Upper-Moon / Lower-Moon Eyeball Rank Inscriptions
          if (type === 'elder_spawn' || type === 'greater_spawn' || type === 'boss') {
              const rEHoriz = new THREE.Mesh(new THREE.PlaneGeometry(0.08*scale, 0.016*scale), new THREE.MeshBasicMaterial({color: 0x111111}));
              rEHoriz.position.set(0.15*scale, 1.42*scale, 0.262*scale);
              const rEVert = new THREE.Mesh(new THREE.PlaneGeometry(0.016*scale, 0.05*scale), new THREE.MeshBasicMaterial({color: 0x111111}));
              rEVert.position.set(0.15*scale, 1.42*scale, 0.263*scale);
              
              const lEHoriz = rEHoriz.clone(); lEHoriz.position.x = -0.15*scale;
              const lEVert = rEVert.clone(); lEVert.position.x = -0.15*scale;
              
              headG.add(rEHoriz, rEVert, lEHoriz, lEVert);
          }
          
          if (isBoss) {
              const hornTex = new THREE.MeshStandardMaterial({color: 0x7c1414, roughness: 0.5});
              const rHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12*scale, 0.5*scale, 4), hornTex);
              rHorn.position.set(0.2*scale, 1.7*scale, 0.05*scale); rHorn.rotation.z = -0.4; rHorn.rotation.x = 0.2;
              const lHorn = rHorn.clone(); lHorn.position.x = -0.2*scale; lHorn.rotation.z = 0.4;
              headG.add(rHorn, lHorn);
          }
      }

      g.add(headG);

      let torso;
      if (isWarden) {
          // Moonflow warden striped Haori over dark uniform
          const tGroup = new THREE.Group();
          const tShirt = new THREE.Mesh(new THREE.BoxGeometry(0.6*scale, 0.7*scale, 0.4*scale), new THREE.MeshStandardMaterial({color: clothesC}));
          tShirt.position.y = 0.85 * scale;
          
          // Canvas scale patterns
          const sCanvas = document.createElement('canvas'); sCanvas.width=32; sCanvas.height=32;
          const sCtx = sCanvas.getContext('2d')!;
          sCtx.fillStyle = '#26305e'; sCtx.fillRect(0,0,32,32);
          sCtx.strokeStyle = '#e8ecff'; sCtx.lineWidth = 3;
          for (let d = -32; d < 32; d += 10) {
              sCtx.beginPath(); sCtx.moveTo(d, 32); sCtx.lineTo(d + 32, 0); sCtx.stroke();
          }
          const sTex = new THREE.CanvasTexture(sCanvas); sTex.magFilter = THREE.NearestFilter;
          const sMat = new THREE.MeshStandardMaterial({map: sTex, roughness: 1.0, side: THREE.DoubleSide});
          
          const haoriCover = new THREE.Mesh(new THREE.BoxGeometry(0.64*scale, 0.68*scale, 0.44*scale), sMat);
          haoriCover.position.y = 0.88 * scale;
          
          const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62*scale, 0.1*scale, 0.42*scale), new THREE.MeshStandardMaterial({color: 0xffffff}));
          belt.position.y = 0.5 * scale;
          tGroup.add(tShirt, haoriCover, belt);
          torso = tShirt; 
          g.add(tGroup);
      } else if (type === 'normal') {
          // Dynamic beautiful canvas textures for civilians (Yukata / Happi)
          const civCanvas = document.createElement('canvas'); civCanvas.width = 64; civCanvas.height = 64;
          const civCtx = civCanvas.getContext('2d')!;
          
          if (civIdx === 0) {
              // Merchant (Happi): deep blue with white trims/lapels & back kanji '商'
              civCtx.fillStyle = '#1f3c6d'; civCtx.fillRect(0,0,64,64);
              civCtx.fillStyle = '#ffffff'; civCtx.fillRect(26,0,12,64); // tie opening
              civCtx.fillRect(0,48,64,6); // front white hem
              civCtx.fillStyle = '#101010'; civCtx.fillRect(0,28,64,8); // obi sash
              civCtx.fillStyle = '#ffffff'; civCtx.font = 'bold 20px sans-serif'; civCtx.textAlign = 'center';
              civCtx.fillText('商', 32, 22);
          } else if (civIdx === 1) {
              // Floral Pink Kimono
              civCtx.fillStyle = '#d27d97'; civCtx.fillRect(0,0,64,64);
              civCtx.fillStyle = '#fff0f5';
              for (let f=0; f<10; f++) {
                  const fx = (f * 17) % 60;
                  const fy = (f * 23) % 60;
                  civCtx.fillRect(fx, fy, 4, 4);
                  civCtx.fillRect(fx-2, fy+2, 2, 2);
                  civCtx.fillRect(fx+4, fy+2, 2, 2);
              }
              civCtx.fillStyle = '#ff2255'; civCtx.fillRect(0,28,64,10); // Red sash
          } else if (civIdx === 2) {
              // Serene Monk: warm slate brown with golden diagonal fold (Kesa)
              civCtx.fillStyle = '#5c4e46'; civCtx.fillRect(0,0,64,64);
              civCtx.fillStyle = '#dca63f';
              civCtx.beginPath();
              civCtx.moveTo(0,0); civCtx.lineTo(20,0); civCtx.lineTo(64,44); civCtx.lineTo(44,64); civCtx.closePath(); civCtx.fill();
              civCtx.fillStyle = '#222222'; civCtx.fillRect(0,32,64,6);
          } else {
              // Young Citizen stripes
              civCtx.fillStyle = '#1e6f6d'; civCtx.fillRect(0,0,64,64);
              civCtx.strokeStyle = '#90eedd'; civCtx.lineWidth = 1.5;
              for (let i = 4; i < 64; i += 12) {
                  civCtx.beginPath(); civCtx.moveTo(i,0); civCtx.lineTo(i,64); civCtx.stroke();
              }
              civCtx.fillStyle = '#111111'; civCtx.fillRect(0,28,64,8);
          }
          const civTex = new THREE.CanvasTexture(civCanvas); civTex.magFilter = THREE.NearestFilter;
          const civMat = new THREE.MeshStandardMaterial({map: civTex, roughness: 1.0, side: THREE.DoubleSide});
          
          torso = new THREE.Mesh(new THREE.BoxGeometry(0.6*scale, 0.8*scale, 0.4*scale), civMat);
          torso.position.y = 0.8 * scale; torso.castShadow=true; g.add(torso);
      } else {
          torso = new THREE.Mesh(new THREE.BoxGeometry(0.6*scale, 0.8*scale, 0.4*scale), new THREE.MeshStandardMaterial({color: clothesC}));
          torso.position.y = 0.8 * scale; torso.castShadow=true; g.add(torso);
      }
      
      // Determine limbs colors
      let limbCol = isWarden ? clothesC : skinC;
      if (type === 'normal') {
          if (civIdx === 0) limbCol = 0x1f3c6d;
          else if (civIdx === 1) limbCol = 0xd27d97;
          else if (civIdx === 2) limbCol = 0x5c4e46;
          else limbCol = 0x1e6f6d;
      }
      
      const lArm = buildRealisticLimb(0.2*scale, 0.8*scale, limbCol, true); lArm.pivot.position.set(-0.4*scale, 1.1*scale, 0); g.add(lArm.pivot);
      const rArm = buildRealisticLimb(0.2*scale, 0.8*scale, limbCol, true); rArm.pivot.position.set(0.4*scale, 1.1*scale, 0); g.add(rArm.pivot);
      
      let legCol = isWarden ? clothesC : skinC;
      if (type === 'normal') {
          legCol = (civIdx === 1) ? 0xffccaa : 0x222222; // geisha skin legs vs black pants
      }
      
      const lLeg = buildRealisticLimb(0.25*scale, 0.8*scale, legCol); lLeg.pivot.position.set(-0.2*scale, 0.8*scale, 0); g.add(lLeg.pivot);
      const rLeg = buildRealisticLimb(0.25*scale, 0.8*scale, legCol); rLeg.pivot.position.set(0.2*scale, 0.8*scale, 0); g.add(rLeg.pivot);
      
      if (isWarden) {
          const swordGrp = new THREE.Group();
          
          const bladeGeom = new THREE.BoxGeometry(0.03*scale, 1.4*scale, 0.12*scale);
          const blade = new THREE.Mesh(bladeGeom, new THREE.MeshStandardMaterial({color: 0x111111, metalness: 1.0, roughness: 0.15}));
          blade.position.y = 0.8 * scale;
          
          const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.035*scale, 1.4*scale, 0.04*scale), new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.8, roughness: 0.3}));
          bladeEdge.position.set(0, 0.8*scale, -0.05*scale);
          
          // Glimmering element hilt core line for wardens
          const slayCoreGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04*scale, 1.3*scale, 0.02*scale), new THREE.MeshBasicMaterial({color: 0xffea00, blending: THREE.AdditiveBlending}));
          slayCoreGlow.position.set(0.01*scale, 0.8*scale, 0);
          
          const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.12*scale, 0.12*scale, 0.05*scale, 8), new THREE.MeshStandardMaterial({color: 0xcca300}));
          guard.position.y = 0.1 * scale;
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.045*scale, 0.045*scale, 0.3*scale, 8), new THREE.MeshStandardMaterial({color: 0xcca300}));
          hilt.position.y = -0.05 * scale;
          
          swordGrp.add(blade, bladeEdge, slayCoreGlow, guard, hilt);
          swordGrp.position.set(0, -0.6*scale, 0.1*scale); swordGrp.rotation.x = Math.PI / 2;
          rArm.pivot.add(swordGrp);
      }

      if (hasMutations) {
          // Extra spider demon back-claws representing scary mutations
          const lArm2 = buildRealisticLimb(0.15*scale, 0.8*scale, skinC, true); lArm2.pivot.position.set(-0.4*scale, 0.8*scale, -0.2*scale); lArm2.pivot.rotation.x = Math.PI/3; g.add(lArm2.pivot);
          const rArm2 = buildRealisticLimb(0.15*scale, 0.8*scale, skinC, true); rArm2.pivot.position.set(0.4*scale, 0.8*scale, -0.2*scale); rArm2.pivot.rotation.x = Math.PI/3; g.add(rArm2.pivot);
      }
      
      if (isBoss && !hasMutations) {
          // Dynamic demonic spine arches/wings instead of plain cylinders
          const spineMat = new THREE.MeshStandardMaterial({color: 0x1d1314, roughness: 0.8});
          for(let i=0; i<4; i++){
              const leg = buildRealisticLimb(0.15*scale, 1.4*scale, 0x1a0f0f, true);
              leg.pivot.position.set((i%2===0?1:-1)*0.6*scale, 1.2*scale, -0.21*scale);
              // Spine/wing bend rotation
              leg.pivot.rotation.z = (i%2===0?-1:1) * Math.PI/2.5;
              leg.pivot.rotation.x = (i<2?0.6:-0.6);
              leg.mesh.material = spineMat; // black skeletal spine
              g.add(leg.pivot);
          }
      }

      return { group: g, lArm:lArm.pivot, rArm:rArm.pivot, lLeg:lLeg.pivot, rLeg:rLeg.pivot, head: headG, torso,
               materials: [torso.material, head.material, lArm.mat, rArm.mat, lLeg.mat, rLeg.mat] };
    };

    // ----- Stage Loaders -----
    const environmentGrp = new THREE.Group();
    scene.add(environmentGrp);
    
    const buildToriiGate = (x:number, y:number, z:number, ry:number, scale:number=1) => {
        const torii = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({color: 0x991111, roughness: 0.9});
        const darkWoodMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8});
        
        const rPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6*scale, 0.6*scale, 10*scale, 12), woodMat);
        rPillar.position.set(4*scale, 5*scale, 0); rPillar.castShadow = true;
        const lPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6*scale, 0.6*scale, 10*scale, 12), woodMat);
        lPillar.position.set(-4*scale, 5*scale, 0); lPillar.castShadow = true;
        
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(11*scale, 0.8*scale, 1.2*scale), woodMat);
        topBeam.position.set(0, 9.5*scale, 0); topBeam.castShadow = true;
        
        const topRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.7*scale, 0.7*scale, 12*scale, 3), darkWoodMat);
        topRoof.position.set(0, 10*scale, 0); topRoof.rotation.z = Math.PI/2; topRoof.castShadow = true;
        
        const midBeam = new THREE.Mesh(new THREE.BoxGeometry(9*scale, 0.6*scale, 0.8*scale), woodMat);
        midBeam.position.set(0, 7.5*scale, 0); midBeam.castShadow = true;
        
        const centerStrut = new THREE.Mesh(new THREE.BoxGeometry(0.5*scale, 2*scale, 0.5*scale), woodMat);
        centerStrut.position.set(0, 8.5*scale, 0); centerStrut.castShadow = true;
        
        torii.add(rPillar, lPillar, topBeam, topRoof, midBeam, centerStrut);
        
        // Lanterns
        const lanternGeom = new THREE.CylinderGeometry(0.6*scale, 0.6*scale, 1.2*scale, 8);
        const lanternMat = new THREE.MeshStandardMaterial({color: 0xffddaa, emissive: 0xffaa00, emissiveIntensity: 0.5, roughness: 1.0});
        
        const rLantern = new THREE.Mesh(lanternGeom, lanternMat);
        rLantern.position.set(3*scale, 6.5*scale, 0);
        const lLantern = new THREE.Mesh(lanternGeom, lanternMat);
        lLantern.position.set(-3*scale, 6.5*scale, 0);
        
        const rLight = new THREE.PointLight(0xffaa00, 1.0, 15*scale);
        rLight.position.set(3*scale, 6.5*scale, 0);
        const lLight = new THREE.PointLight(0xffaa00, 1.0, 15*scale);
        lLight.position.set(-3*scale, 6.5*scale, 0);
        
        torii.add(rLantern, lLantern, rLight, lLight);

        torii.position.set(x, y, z);
        torii.rotation.y = ry;
        return torii;
    };

    const buildShopStall = (x:number, y:number, z:number, ry:number, shopType:string) => {
        const stall = new THREE.Group();
        
        const matWoodLight = new THREE.MeshStandardMaterial({color: 0x8a6f4e, roughness: 0.9});
        const matWoodDark = new THREE.MeshStandardMaterial({color: 0x3b2a1a, roughness: 0.9});
        
        // 1. Counter base
        const counter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.0, 1.8), matWoodDark);
        counter.position.y = 0.5; counter.castShadow = true; counter.receiveShadow = true;
        stall.add(counter);
        
        // 2. Pillars/Supporting struts
        const pillMat = matWoodLight;
        const pil1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5), pillMat);
        pil1.position.set(-1.6, 2.0, -0.8); pil1.castShadow = true;
        const pil2 = pil1.clone(); pil2.position.set(1.6, 2.0, -0.8);
        const pil3 = pil1.clone(); pil3.position.set(-1.6, 2.0, 0.8);
        const pil4 = pil1.clone(); pil4.position.set(1.6, 2.0, 0.8);
        stall.add(pil1, pil2, pil3, pil4);
        
        // 3. Fabric Awning (Canopy) with custom striped color textures mapped to canvas
        const stripeCanvas = document.createElement('canvas'); stripeCanvas.width = 32; stripeCanvas.height = 32;
        const sCtx = stripeCanvas.getContext('2d')!;
        let primaryColor = '#881111'; let secondaryColor = '#e6dfd1';
        if (shopType === 'tea') { primaryColor = '#10523e'; secondaryColor = '#e1dfbc'; }
        else if (shopType === 'weapon') { primaryColor = '#222222'; secondaryColor = '#555555'; }
        else if (shopType === 'mask') { primaryColor = '#a84c1e'; secondaryColor = '#f0d9c0'; }
        else if (shopType === 'sushi') { primaryColor = '#1a1a1a'; secondaryColor = '#dcae7a'; }
        else if (shopType === 'umbrella') { primaryColor = '#9c2a2a'; secondaryColor = '#f0a2a2'; }
        else if (shopType === 'herbs') { primaryColor = '#3a5311'; secondaryColor = '#c1d3be'; }
        else if (shopType === 'sake') { primaryColor = '#0f2c59'; secondaryColor = '#dfd6c0'; }
        
        // Paint striped curtain canopies
        for (let j = 0; j < 4; j++) {
            sCtx.fillStyle = j % 2 === 0 ? primaryColor : secondaryColor;
            sCtx.fillRect(j * 8, 0, 8, 32);
        }
        const canopyTex = new THREE.CanvasTexture(stripeCanvas); canopyTex.magFilter = THREE.NearestFilter;
        const canopyMat = new THREE.MeshStandardMaterial({map: canopyTex, roughness: 1.0, side: THREE.DoubleSide});
        
        // Angled sloped visual canopy mesh
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 2.2), canopyMat);
        canopy.position.set(0, 3.25, 0); canopy.rotation.x = 0.15; canopy.castShadow = true;
        stall.add(canopy);
        
        // Front fabric noren curtains hanging down slightly
        const hangingNoren = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 0.05), canopyMat);
        hangingNoren.position.set(0, 2.95, 1.0); hangingNoren.castShadow = true;
        stall.add(hangingNoren);
        
        // 4. Shopkeeper banners or hanging lanterns
        const bannerCanvas = document.createElement('canvas'); bannerCanvas.width = 32; bannerCanvas.height = 64;
        const bCtx = bannerCanvas.getContext('2d')!;
        bCtx.fillStyle = secondaryColor; bCtx.fillRect(0,0,32,64);
        bCtx.strokeStyle = primaryColor; bCtx.lineWidth = 2; bCtx.strokeRect(2,2,28,60);
        bCtx.fillStyle = primaryColor; bCtx.font = 'bold 12px Arial'; bCtx.textAlign = 'center';
        // vertical writing
        let chars = ['喰']; 
        if (shopType === 'tea') chars = ['茶', '庵'];
        else if (shopType === 'weapon') chars = ['打', '刀'];
        else if (shopType === 'mask') chars = ['お', '面'];
        else if (shopType === 'sushi') chars = ['寿', '司'];
        else if (shopType === 'umbrella') chars = ['和', '傘'];
        else if (shopType === 'herbs') chars = ['薬', '草'];
        else if (shopType === 'sake') chars = ['酒', '蔵'];
        else chars = ['拉', '麺'];
        
        chars.forEach((c, cIdx) => {
            bCtx.fillText(c, 16, 20 + cIdx * 20);
        });
        const bannerTex = new THREE.CanvasTexture(bannerCanvas); bannerTex.magFilter = THREE.NearestFilter;
        const bannerMat = new THREE.MeshStandardMaterial({map: bannerTex, roughness: 1.0, side: THREE.DoubleSide});
        
        const sideSign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), bannerMat);
        sideSign.position.set(-1.8, 2.2, 0); sideSign.rotation.y = Math.PI/2;
        stall.add(sideSign);
        
        // Small bright red/warm hanging lantern on the side of the shop
        const sLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), new THREE.MeshStandardMaterial({color: 0xff3300, emissive: 0xffaa00, emissiveIntensity: 0.8}));
        sLantern.position.set(1.5, 2.7, 0.8);
        stall.add(sLantern);
        
        const sLight = new THREE.PointLight(0xff5500, 2.0, 6);
        sLight.position.set(1.5, 2.6, 0.8);
        sLight.userData = { baseIntensity: 2.0, phaseOffset: Math.random() * 8.0 };
        lightsGrp.add(sLight);
        stall.add(sLantern);
        
        // 5. Food / Tool props on the counter!
        if (shopType === 'ramen' || shopType === 'tea') {
            // Little bowls/cups
            const bowlGeom = new THREE.CylinderGeometry(0.15, 0.08, 0.12, 8);
            const bowlMat = new THREE.MeshStandardMaterial({color: 0xeeeeee, roughness: 0.5});
            
            const b1 = new THREE.Mesh(bowlGeom, bowlMat); b1.position.set(-0.8, 1.06, 0.2);
            const b2 = new THREE.Mesh(bowlGeom, bowlMat); b2.position.set(0.6, 1.06, -0.3);
            
            // Sweet dango stick skewering colored balls (white, pink, green)
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), matWoodLight);
            stick.rotation.z = Math.PI/2.5; stick.position.set(-0.2, 1.06, -0.1);
            
            const dm1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({color: 0xffaac2})); dm1.position.set(-0.32, 1.1, -0.05); // pink
            const dm2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({color: 0xffffff})); dm2.position.set(-0.24, 1.1, -0.05); // white
            const dm3 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({color: 0xaaff88})); dm3.position.set(-0.16, 1.1, -0.05); // green
            
            stall.add(b1, b2, stick, dm1, dm2, dm3);
        } else if (shopType === 'weapon') {
            // Displayed swords!
            const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.5), matWoodDark);
            rack.position.set(0, 1.2, 0);
            
            const miniatureWep = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.5), new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.2, metalness: 0.8}));
            miniatureWep.position.set(0, 1.35, 0);
            miniatureWep.rotation.y = 0.1;
            
            stall.add(rack, miniatureWep);
        } else if (shopType === 'mask') {
            // Hanging theatrical masks
            const pegBoard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.15), matWoodDark);
            pegBoard.position.set(0, 1.6, -0.4);
            
            // Fox mask (white with red painted details)
            const foxMask = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.1), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.8}));
            foxMask.position.set(-0.4, 1.6, -0.32);
            
            const redPaint = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.02), new THREE.MeshBasicMaterial({color: 0xcc0000}));
            redPaint.position.set(-0.4, 1.7, -0.26);
            
            // Tengu mask (red with prominent nose)
            const tMask = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.1), new THREE.MeshStandardMaterial({color: 0xcc2222, roughness: 0.8}));
            tMask.position.set(0.4, 1.6, -0.32);
            const tNose = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), new THREE.MeshStandardMaterial({color: 0xcc2222}));
            tNose.rotation.x = Math.PI/2; tNose.position.set(0.4, 1.55, -0.22);
            
            stall.add(pegBoard, foxMask, redPaint, tMask, tNose);
        } else if (shopType === 'sushi') {
            // Bento tray and sushi rolls
            const trayMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.1});
            const tray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), trayMat);
            tray.position.set(0, 1.05, 0);
            
            const sushi1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 8), new THREE.MeshStandardMaterial({color: 0x112211}));
            sushi1.position.set(-0.3, 1.12, 0);
            const inside1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), new THREE.MeshStandardMaterial({color: 0xff4422})); 
            inside1.position.set(-0.3, 1.12, 0);
            
            const sushi2 = sushi1.clone(); sushi2.position.set(0, 1.12, 0.15);
            const inside2 = inside1.clone(); inside2.position.set(0, 1.12, 0.15);
            const sushi3 = sushi1.clone(); sushi3.position.set(0.3, 1.12, -0.1);
            const inside3 = inside1.clone(); inside3.position.set(0.3, 1.12, -0.1);
            
            stall.add(tray, sushi1, inside1, sushi2, inside2, sushi3, inside3);
        } else if (shopType === 'umbrella') {
            // Little colorful parasols leaning on the side
            const pMat = new THREE.MeshStandardMaterial({color: 0xdd1133});
            const shaftAmbient = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), matWoodLight);
            shaftAmbient.position.set(0.8, 1.2, 0); shaftAmbient.rotation.z = 0.2;
            const topConic = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8), pMat);
            topConic.position.set(0.9, 1.6, 0); topConic.rotation.z = 0.2;
            
            stall.add(shaftAmbient, topConic);
        } else if (shopType === 'herbs') {
            // Wooden box filled with organic healer leaves
            const woodBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.8), matWoodDark);
            woodBox.position.set(0, 1.15, 0);
            const greenLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), new THREE.MeshStandardMaterial({color: 0x44aa22, roughness: 1.0}));
            greenLeaf.position.set(0, 1.35, 0);
            
            stall.add(woodBox, greenLeaf);
        } else if (shopType === 'sake') {
            // Stout sake barrels
            const bMat = new THREE.MeshStandardMaterial({color: 0xbfb69c, roughness: 0.9});
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 12), bMat);
            barrel.position.set(-0.8, 1.3, -0.2);
            
            const barrel2 = barrel.clone();
            barrel2.position.set(0.8, 1.3, -0.2);
            
            const cup = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), matWoodLight);
            cup.position.set(0, 1.1, 0.1);
            
            stall.add(barrel, barrel2, cup);
        }
        
        stall.position.set(x, y, z);
        stall.rotation.y = ry;
        environmentGrp.add(stall);
        colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 1.2, z), new THREE.Vector3(4.0, 3.5, 2.2))});
        
        return stall;
    };

    const loadStage = (stageName: string) => {
        environmentGrp.clear(); lightsGrp.clear(); colliders.length = 0; stateRef.current.enemies = [];
        stateRef.current.projectiles.forEach(p => scene.remove(p.mesh));
        stateRef.current.projectiles = [];
        scene.fog = new THREE.FogExp2(stageName === 'village' ? 0x3a1a0f : 0x0a101d, stageName === 'forest' ? 0.03 : 0.015);
        scene.background = new THREE.Color(stageName === 'boss' ? 0x1a0505 : (stageName === 'village' ? 0x200b05 : 0x0a101d));

        audioManager.setMusicTheme(stageName === 'boss' ? 'boss' : stageName === 'forest' ? 'battle' : 'ambient');
        audioManager.setAmbient(stageName as any);

        // Core Lighting
        const amb = new THREE.AmbientLight(stageName === 'boss' ? 0x221111 : (stageName === 'village' ? 0x3a251c : 0x2a3b5c), 1.5);
        amb.name = 'ambLight';
        const dir = new THREE.DirectionalLight(stageName === 'boss' ? 0xff4444 : (stageName === 'village' ? 0xff8855 : 0xcceeff), 2.0);
        dir.name = 'dirLight';
        dir.position.set(50, 100, -20); dir.castShadow = !isMobileDevice;
        if(dir.shadow) { dir.shadow.camera.left = -60; dir.shadow.camera.right = 60; dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60; }
        lightsGrp.add(amb, dir);

        // Moon / Sun
        const moonMat = new THREE.MeshBasicMaterial({ color: stageName === 'boss' ? 0xff2222 : (stageName === 'village' ? 0xffaa33 : 0xffffee) });
        const moon = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 32), moonMat);
        moon.position.set(100, 100, -200); environmentGrp.add(moon);

        // Core Ground Textures with premium procedural detailing
        let groundMat;
        if (stageName === 'village') {
            const blockCanvas = document.createElement('canvas');
            blockCanvas.width = 128; blockCanvas.height = 128;
            const bCtxG = blockCanvas.getContext('2d')!;
            bCtxG.fillStyle = '#3a2d22'; bCtxG.fillRect(0, 0, 128, 128); // Earthy background
            bCtxG.strokeStyle = '#221a14'; bCtxG.lineWidth = 1;
            // Draw nice soft diagonal paving hashes to represent gravel lanes
            for (let i = -128; i < 128; i += 16) {
                bCtxG.beginPath(); bCtxG.moveTo(i, 0); bCtxG.lineTo(i + 128, 128); bCtxG.stroke();
                bCtxG.beginPath(); bCtxG.moveTo(i + 128, 0); bCtxG.lineTo(i, 128); bCtxG.stroke();
            }
            const gTex = new THREE.CanvasTexture(blockCanvas);
            gTex.wrapS = THREE.RepeatWrapping; gTex.wrapT = THREE.RepeatWrapping;
            gTex.repeat.set(15, 15);
            groundMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 1.0 });
        } else if (stageName === 'forest') {
            const forestCanvas = document.createElement('canvas');
            forestCanvas.width = 128; forestCanvas.height = 128;
            const fCtx = forestCanvas.getContext('2d')!;
            fCtx.fillStyle = '#102213'; fCtx.fillRect(0, 0, 128, 128); // Forest grass moss
            // Moss variations
            for (let i = 0; i < 30; i++) {
                const rx = Math.random() * 128; const ry = Math.random() * 128; const rr = 6 + Math.random() * 10;
                const grad = fCtx.createRadialGradient(rx, ry, 0, rx, ry, rr);
                grad.addColorStop(0, '#1c3d22'); grad.addColorStop(1, '#102213');
                fCtx.fillStyle = grad; fCtx.beginPath(); fCtx.arc(rx, ry, rr, 0, Math.PI*2); fCtx.fill();
            }
            // Fallen Sakura petals
            fCtx.fillStyle = '#ffb7c5';
            for (let i = 0; i < 25; i++) {
                const sx = Math.random() * 128; const sy = Math.random() * 128;
                fCtx.beginPath(); fCtx.ellipse(sx, sy, 3, 1.5, Math.random()*Math.PI, 0, Math.PI*2); fCtx.fill();
            }
            const gTex = new THREE.CanvasTexture(forestCanvas);
            gTex.wrapS = THREE.RepeatWrapping; gTex.wrapT = THREE.RepeatWrapping;
            gTex.repeat.set(12, 12);
            groundMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.95 });
        } else {
            // Boss Volcanic lava garden ground
            const bossCanvas = document.createElement('canvas');
            bossCanvas.width = 256; bossCanvas.height = 256;
            const bCtxT = bossCanvas.getContext('2d')!;
            bCtxT.fillStyle = '#0f0f0f'; bCtxT.fillRect(0, 0, 256, 256);
            bCtxT.strokeStyle = '#ff2200'; bCtxT.lineWidth = 1.2;
            bCtxT.shadowColor = '#ff5500'; bCtxT.shadowBlur = 5;
            for (let i = 0; i < 15; i++) {
                bCtxT.beginPath();
                let curX = Math.random() * 256; let curY = 0;
                bCtxT.moveTo(curX, curY);
                while (curY < 256) {
                    const nextX = curX + (Math.random() - 0.5) * 20;
                    const nextY = curY + Math.random() * 24 + 10;
                    bCtxT.lineTo(nextX, nextY);
                    curX = nextX; curY = nextY;
                }
                bCtxT.stroke();
            }
            bCtxT.shadowBlur = 0;
            // Draw circular slate slabs on top
            bCtxT.fillStyle = '#1c1c1c'; bCtxT.strokeStyle = '#991100'; bCtxT.lineWidth = 0.5;
            for (let i = 0; i < 12; i++) {
                bCtxT.beginPath(); bCtxT.arc(Math.random()*256, Math.random()*256, 12 + Math.random()*12, 0, Math.PI*2); bCtxT.fill(); bCtxT.stroke();
            }
            const gTex = new THREE.CanvasTexture(bossCanvas);
            gTex.wrapS = THREE.RepeatWrapping; gTex.wrapT = THREE.RepeatWrapping;
            gTex.repeat.set(10, 10);
            groundMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.8 });
        }

        const groundGeom = new THREE.PlaneGeometry(300, 300, 16, 16);
        const ground = new THREE.Mesh(groundGeom, groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
        environmentGrp.add(ground);
        
        // Borders
        colliders.push({box: new THREE.Box3(new THREE.Vector3(-105, -10, -105), new THREE.Vector3(-100, 50, 105))});
        colliders.push({box: new THREE.Box3(new THREE.Vector3(100, -10, -105), new THREE.Vector3(105, 50, 105))});
        colliders.push({box: new THREE.Box3(new THREE.Vector3(-105, -10, -105), new THREE.Vector3(105, 50, -100))});
        colliders.push({box: new THREE.Box3(new THREE.Vector3(-105, -10, 100), new THREE.Vector3(105, 50, 105))});

        if (stageName === 'village') {
            playerObj.group.position.set(0, 5, 20); playerObj.group.rotation.y = Math.PI;

            // --- Hand-Crafted Stone Pavements ("Ishidatami") and Curbs ---
            const stoneGeom = new THREE.BoxGeometry(1.6, 0.08, 1.2);
            const stonesCount = 1800;
            const matStoneColors = [
                new THREE.MeshStandardMaterial({color: 0x3d3d40, roughness: 0.8}), // Slate gray
                new THREE.MeshStandardMaterial({color: 0x2e2f32, roughness: 0.85}), // Charcoal
                new THREE.MeshStandardMaterial({color: 0x515154, roughness: 0.75}), // Light granite
                new THREE.MeshStandardMaterial({color: 0x423830, roughness: 0.85})  // Earthy sandstone
            ];
            
            const instStones = matStoneColors.map(mat => {
                const im = new THREE.InstancedMesh(stoneGeom, mat, Math.ceil(stonesCount / 4));
                im.receiveShadow = true;
                im.castShadow = true;
                return im;
            });

            const stoneDummy = new THREE.Object3D();
            const stoneCounters = [0, 0, 0, 0];

            const tryAddStone = (x: number, y: number, z: number, rScaleX = 1.0, rScaleZ = 1.0) => {
                const matIdx = Math.floor(Math.random() * 4);
                const idx = stoneCounters[matIdx];
                if (idx < instStones[matIdx].count) {
                    const rx = x + (Math.random() - 0.5) * 0.35;
                    const rz = z + (Math.random() - 0.5) * 0.35;
                    const ry = (Math.random() - 0.5) * 0.2;
                    stoneDummy.position.set(rx, y, rz);
                    stoneDummy.rotation.set((Math.random() - 0.5) * 0.04, ry, (Math.random() - 0.5) * 0.04);
                    stoneDummy.scale.set(rScaleX * (0.85 + Math.random() * 0.3), 1.0, rScaleZ * (0.85 + Math.random() * 0.3));
                    stoneDummy.updateMatrix();
                    instStones[matIdx].setMatrixAt(idx, stoneDummy.matrix);
                    stoneCounters[matIdx]++;
                }
            };

            // 1. Pave Main Z-Axis Center Street: X from -5.5 to 5.5, Z from -50 to 50
            for (let z = -50; z <= 50; z += 1.4) {
                for (let x = -5.5; x <= 5.5; x += 1.8) {
                    tryAddStone(x, 0.04, z, 1.0, 1.0);
                }
            }

            // 2. Pave Crossroad Lanes going East-West (at Z = 15, Z = -10, Z = -22)
            const paveEastWestStreet = (centerZ: number) => {
                for (let x = -40; x <= 40; x += 1.4) {
                    if (Math.abs(x) <= 5.0) continue; // Skip intersecting central main street
                    for (let z = centerZ - 4.5; z <= centerZ + 4.5; z += 1.8) {
                        tryAddStone(x, 0.04, z, 0.9, 0.9);
                    }
                }
            };
            paveEastWestStreet(15);
            paveEastWestStreet(-10);
            paveEastWestStreet(-22);

            instStones.forEach(im => {
                im.instanceMatrix.needsUpdate = true;
                environmentGrp.add(im);
            });

            // 3. Elegant Curbs: Wooden beams framing the streets for elevated depth
            const curbGeom = new THREE.BoxGeometry(0.3, 0.22, 6.0);
            const matCurb = new THREE.MeshStandardMaterial({color: 0x22130c, roughness: 0.9}); // Dark weathered wood
            const curbCount = 150;
            const instCurbs = new THREE.InstancedMesh(curbGeom, matCurb, curbCount);
            instCurbs.receiveShadow = true; instCurbs.castShadow = true;

            let curbIdx = 0;
            const addCurb = (x: number, z: number, ry: number) => {
                if (curbIdx < curbCount) {
                    stoneDummy.position.set(x, 0.1, z);
                    stoneDummy.rotation.set(0, ry, 0);
                    stoneDummy.scale.set(1, 1, 1);
                    stoneDummy.updateMatrix();
                    instCurbs.setMatrixAt(curbIdx, stoneDummy.matrix);
                    curbIdx++;
                }
            };

            // Frame main central street (at X = -6.4 and X = 6.4)
            for (let z = -48; z <= 48; z += 6.0) {
                // Skip intersections
                if (Math.abs(z - 15) < 6 || Math.abs(z + 10) < 6 || Math.abs(z + 22) < 6) continue;
                addCurb(-6.4, z, 0);
                addCurb(6.4, z, 0);
            }

            // Frame Horizontal Streets (at Z = centerZ - 5.5 and Z = centerZ + 5.5)
            const frameHorizontalStreet = (centerZ: number) => {
                for (let x = -38; x <= 38; x += 6.0) {
                    if (Math.abs(x) < 7.5) continue; // Skip main central intersection
                    addCurb(x, centerZ - 5.5, Math.PI / 2);
                    addCurb(x, centerZ + 5.5, Math.PI / 2);
                }
            };
            frameHorizontalStreet(15);
            frameHorizontalStreet(-10);
            frameHorizontalStreet(-22);

            instCurbs.instanceMatrix.needsUpdate = true;
            environmentGrp.add(instCurbs);

            // 4. Colorful flower hedges and bamboo elements along horizontal streets and curbs
            const hedgeGeom = new THREE.BoxGeometry(1.2, 0.8, 1.2);
            // Red flower hedge, Purple flower hedge, Green grass bush
            const matHedgeColors = [
                new THREE.MeshStandardMaterial({color: 0x2e5c1e, roughness: 0.95}), // Green base
                new THREE.MeshStandardMaterial({color: 0xb52424, roughness: 0.95}), // Red camellia
                new THREE.MeshStandardMaterial({color: 0x76208a, roughness: 0.95})  // Purple moonpetal bush
            ];
            const hedgeCount = 120;
            const instHedges = matHedgeColors.map(mat => {
                const im = new THREE.InstancedMesh(hedgeGeom, mat, Math.ceil(hedgeCount / 3));
                im.castShadow = true; im.receiveShadow = true;
                return im;
            });

            let hedgeCounters = [0, 0, 0];
            const addHedge = (x: number, z: number, colorIdx: number) => {
                const idx = hedgeCounters[colorIdx];
                if (idx < instHedges[colorIdx].count) {
                    stoneDummy.position.set(x, 0.4, z);
                    stoneDummy.rotation.set((Math.random() - 0.5)*0.1, (Math.random() - 0.5)*2.0, (Math.random() - 0.5)*0.1);
                    const scaleFactor = 0.85 + Math.random() * 0.3;
                    stoneDummy.scale.set(scaleFactor, 0.7 + Math.random() * 0.4, scaleFactor);
                    stoneDummy.updateMatrix();
                    instHedges[colorIdx].setMatrixAt(idx, stoneDummy.matrix);
                    hedgeCounters[colorIdx]++;
                }
            };

            // Distribute hedges at roadside/corners
            for (let z = -45; z <= 45; z += 12.0) {
                if (Math.abs(z - 15) < 8 || Math.abs(z + 10) < 8 || Math.abs(z + 22) < 8) continue;
                addHedge(-7.5, z, 0);
                addHedge(7.5, z, 1);
                addHedge(-7.5, z + 3, 2);
                addHedge(7.5, z - 3, 0);
            }
            // Hedges bordering crossroads
            const borderCrossHedges = (centerZ: number) => {
                for (let x = -30; x <= 30; x += 10) {
                    if (Math.abs(x) < 8) continue;
                    addHedge(x, centerZ - 6.5, 0);
                    addHedge(x + 2, centerZ - 6.5, 2);
                    addHedge(x - 2, centerZ + 6.5, 1);
                }
            };
            borderCrossHedges(15);
            borderCrossHedges(-10);
            borderCrossHedges(-22);

            instHedges.forEach(im => {
                im.instanceMatrix.needsUpdate = true;
                environmentGrp.add(im);
            });
            
            // Large City Map with InstancedMeshes and Multi-story structured layout
            const matWoodLight = new THREE.MeshStandardMaterial({color: 0x8a6f4e, roughness: 0.9});
            const matWoodDark = new THREE.MeshStandardMaterial({color: 0x3b2a1a, roughness: 0.9});
            
            // Procedurally generated high-fidelity Japanese Shoji window lattice grid
            const shojiCanvas = document.createElement('canvas'); shojiCanvas.width = 64; shojiCanvas.height = 64;
            const sCtx2 = shojiCanvas.getContext('2d')!;
            sCtx2.fillStyle = '#ffeed0'; sCtx2.fillRect(0,0,64,64);
            sCtx2.strokeStyle = '#3b2a1a'; sCtx2.lineWidth = 2.5;
            sCtx2.strokeRect(0,0,64,64); // Frame border
            sCtx2.beginPath(); sCtx2.moveTo(32, 0); sCtx2.lineTo(32, 64); sCtx2.stroke(); // Mid vertical
            sCtx2.beginPath(); sCtx2.moveTo(0, 32); sCtx2.lineTo(64, 32); sCtx2.stroke(); // Mid horiz
            sCtx2.strokeStyle = '#3b2a1a'; sCtx2.lineWidth = 1.0;
            // Draw inner lattice grids
            for (let xOffset = 0; xOffset < 64; xOffset += 16) {
                sCtx2.beginPath(); sCtx2.moveTo(xOffset, 0); sCtx2.lineTo(xOffset, 64); sCtx2.stroke();
            }
            for (let yOffset = 0; yOffset < 64; yOffset += 16) {
                sCtx2.beginPath(); sCtx2.moveTo(0, yOffset); sCtx2.lineTo(64, yOffset); sCtx2.stroke();
            }
            const shojiTex = new THREE.CanvasTexture(shojiCanvas); shojiTex.magFilter = THREE.NearestFilter;
            
            const matShoji = new THREE.MeshStandardMaterial({map: shojiTex, roughness: 0.85, emissive: 0x443311, emissiveIntensity: 1.0});
            const matRoof = new THREE.MeshStandardMaterial({color: 0x1c1c1c, roughness: 0.6});
            const matLantern = new THREE.MeshStandardMaterial({color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 0.9});
            const matWalkway = new THREE.MeshStandardMaterial({color: 0x4a3422, roughness: 1.0});

            // Grid size parameters
            const numBlocksX = 3; // 3 blocks wide
            const numBlocksZ = 4; // 4 blocks long
            const blockSize = 24;
            const streetWidth = 14;
            // Each block has 4 houses (2x2)
            const housesPerBlock = 4;
            const numHouses = numBlocksX * numBlocksZ * housesPerBlock * 2; // times 2 for upper floors

            const instBase = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 0.6, 8), matWoodDark, numHouses);
            const instBackWall = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 3, 0.4), matWoodLight, numHouses);
            const instSideWall = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 3, 7), matWoodLight, numHouses * 2);
            const instShoji = new THREE.InstancedMesh(new THREE.BoxGeometry(5.5, 3, 0.2), matShoji, numHouses);
            const instPorch = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 0.2, 2.5), matWoodDark, numHouses);
            const instPillar = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 4, 0.4), matWoodDark, numHouses * 4);
            const instRoof = new THREE.InstancedMesh(new THREE.ConeGeometry(7.5, 3.5, 4), matRoof, numHouses);
            const instHLantern = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8), matLantern, numHouses * 2);

            instBase.castShadow = true; instBase.receiveShadow = true;
            instShoji.castShadow = true; instRoof.castShadow = true;

            const dummy = new THREE.Object3D();
            
            let hIdx = 0;

            const makeMatrix = (px:number, py:number, pz:number, rx:number = 0, ry:number = 0, rz:number = 0, scale:number=1) => {
                dummy.scale.set(scale, scale, scale);
                dummy.position.set(px, py, pz);
                dummy.rotation.set(rx, ry, rz);
                dummy.updateMatrix(); return dummy.matrix;
            };

            // Huge City Walls (Entertainment District style)
            const matCityWall = new THREE.MeshStandardMaterial({color: 0x333538, roughness: 1.0}); // grey stone
            const wallLength = (numBlocksX * (blockSize + streetWidth)) + 40;
            const wallDepth = (numBlocksZ * (blockSize + streetWidth)) + 40;
            const wallHeight = 25;
            const wallThickness = 8;
            
            const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, wallDepth), matCityWall);
            wallW.position.set(-wallLength/2, wallHeight/2, 0);
            const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, wallDepth), matCityWall);
            wallE.position.set(wallLength/2, wallHeight/2, 0);
            const wallN = new THREE.Mesh(new THREE.BoxGeometry(wallLength, wallHeight, wallThickness), matCityWall);
            wallN.position.set(0, wallHeight/2, -wallDepth/2);
            const wallS = new THREE.Mesh(new THREE.BoxGeometry(wallLength, wallHeight, wallThickness), matCityWall);
            wallS.position.set(0, wallHeight/2, wallDepth/2);
            
            environmentGrp.add(wallW, wallE, wallN, wallS);
            colliders.push({box: new THREE.Box3().setFromObject(wallW)});
            colliders.push({box: new THREE.Box3().setFromObject(wallE)});
            colliders.push({box: new THREE.Box3().setFromObject(wallN)});
            colliders.push({box: new THREE.Box3().setFromObject(wallS)});

            for (let bx = -Math.floor(numBlocksX/2); bx <= Math.floor(numBlocksX/2); bx++) {
                for (let bz = -Math.floor(numBlocksZ/2); bz <= Math.floor(numBlocksZ/2); bz++) {
                    const blockCx = bx * (blockSize + streetWidth);
                    const blockCz = bz * (blockSize + streetWidth);

                    // Add 4 houses per block
                    const houseOffsets = [
                        {x: -blockSize/3, z: -blockSize/3, rot: Math.PI/2},
                        {x: blockSize/3, z: -blockSize/3, rot: 0},
                        {x: -blockSize/3, z: blockSize/3, rot: Math.PI},
                        {x: blockSize/3, z: blockSize/3, rot: -Math.PI/2}
                    ];

                    houseOffsets.forEach((ho, idx) => {
                        const hx = blockCx + ho.x;
                        const hz = blockCz + ho.z;

                        // Create two stories
                        for(let story=0; story<2; story++) {
                            const sy = story * 3.5;
                            dummy.position.set(hx, 0, hz);
                            dummy.rotation.y = ho.rot;
                            dummy.updateMatrix();
                            const bm = dummy.matrix.clone();

                            const applyLocal = (px:number, py:number, pz:number, ry:number=0) => {
                                dummy.matrix.copy(bm);
                                const localM = new THREE.Matrix4().makeTranslation(px, py + sy, pz);
                                if (ry) localM.multiply(new THREE.Matrix4().makeRotationY(ry));
                                dummy.matrix.multiply(localM);
                                return dummy.matrix;
                            };

                            instBase.setMatrixAt(hIdx, applyLocal(0, 0.3, 0));
                            instBackWall.setMatrixAt(hIdx, applyLocal(0, 2.1, -3.3));
                            instSideWall.setMatrixAt(hIdx*2, applyLocal(-3.3, 2.1, 0));
                            instSideWall.setMatrixAt(hIdx*2+1, applyLocal(3.3, 2.1, 0));
                            instShoji.setMatrixAt(hIdx, applyLocal(0, 2.1, 3.3));
                            instPorch.setMatrixAt(hIdx, applyLocal(0, 0.6, 4));
                            
                            instPillar.setMatrixAt(hIdx*4, applyLocal(-3.8, 2.3, -3.8));
                            instPillar.setMatrixAt(hIdx*4+1, applyLocal(3.8, 2.3, -3.8));
                            instPillar.setMatrixAt(hIdx*4+2, applyLocal(-3.8, 2.3, 3.8));
                            instPillar.setMatrixAt(hIdx*4+3, applyLocal(3.8, 2.3, 3.8));

                            if (story === 1) { // Roof only on top story
                                instRoof.setMatrixAt(hIdx, applyLocal(0, 6.0, 0, Math.PI/4));
                            } else {
                                // hide roof for floor 0
                                dummy.scale.set(0,0,0); dummy.updateMatrix(); instRoof.setMatrixAt(hIdx, dummy.matrix); dummy.scale.set(1,1,1);
                            }

                            instHLantern.setMatrixAt(hIdx*2, applyLocal(-3.8, 3.2, 4.0));
                            instHLantern.setMatrixAt(hIdx*2+1, applyLocal(3.8, 3.2, 4.0));
                            
                            hIdx++;
                        }
                        
                        colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(hx, 5, hz), new THREE.Vector3(9, 10, 9))});
                    });
                }
            }
            
            environmentGrp.add(instBase, instBackWall, instSideWall, instShoji, instPorch, instPillar, instRoof, instHLantern);

            // Decorative Elements Helpers in Village
            const createSakuraTree = (tx: number, ty: number, tz: number) => {
                const treeGrp = new THREE.Group();
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 5.0, 8), new THREE.MeshStandardMaterial({color: 0x4d3319, roughness: 0.9}));
                trunk.position.y = 2.5; trunk.castShadow = true; trunk.receiveShadow = true;
                treeGrp.add(trunk);
                
                // Sakura blossom clusters
                const bMat = new THREE.MeshStandardMaterial({color: 0xffadc6, roughness: 1.0, emissive: 0xff6688, emissiveIntensity: 0.15});
                const crown1 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), bMat); crown1.position.set(0, 5.0, 0); crown1.scale.set(1.2, 0.8, 1.2);
                const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 8), bMat); crown2.position.set(1.0, 4.5, 0.6);
                const crown3 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), bMat); crown3.position.set(-0.8, 4.2, -0.8);
                treeGrp.add(crown1, crown2, crown3);
                
                treeGrp.position.set(tx, ty, tz);
                environmentGrp.add(treeGrp);
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(tx, ty + 2.5, tz), new THREE.Vector3(1.2, 5.0, 1.2))});
            };

            const createStoneLantern = (lx: number, ly: number, lz: number) => {
                const lantern = new THREE.Group();
                const matStone = new THREE.MeshStandardMaterial({color: 0x5a5d64, roughness: 0.9});
                
                const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), matStone); base.position.y = 0.2; base.castShadow = true;
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), matStone); shaft.position.y = 1.0; shaft.castShadow = true;
                const platform = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), matStone); platform.position.y = 1.7; platform.castShadow = true;
                
                // Light box
                const sCanvas = document.createElement('canvas'); sCanvas.width=16; sCanvas.height=16;
                const sCtx = sCanvas.getContext('2d')!; sCtx.fillStyle='#ffffff'; sCtx.fillRect(0,0,16,16);
                sCtx.strokeStyle='#333333'; sCtx.lineWidth=2; sCtx.strokeRect(0,0,16,16);
                const sTex = new THREE.CanvasTexture(sCanvas); sTex.magFilter = THREE.NearestFilter;
                
                const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), new THREE.MeshStandardMaterial({map: sTex, emissive: 0xff9900, emissiveIntensity: 1.2}));
                box.position.y = 2.1; box.castShadow = true;
                
                const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 4), matStone); cap.position.y = 2.5; cap.rotation.y = Math.PI/4; cap.castShadow = true;
                
                lantern.add(base, shaft, platform, box, cap);
                lantern.position.set(lx, ly, lz);
                environmentGrp.add(lantern);
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(lx, ly + 1.2, lz), new THREE.Vector3(0.8, 2.5, 0.8))});
                
                const pLight = new THREE.PointLight(0xff5500, 1.5, 8);
                pLight.position.set(lx, ly + 2.1, lz);
                pLight.userData = { baseIntensity: 1.5, phaseOffset: Math.random() * 6.2 };
                lightsGrp.add(pLight);
            };

            const createRestBench = (bx: number, bz: number, ry: number) => {
                const bench = new THREE.Group();
                const matRed = new THREE.MeshStandardMaterial({color: 0x9e1e1e, roughness: 0.8});
                const matWood = new THREE.MeshStandardMaterial({color: 0x4a3422, roughness: 0.9});
                
                const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.0), matRed); seat.position.y = 0.5; seat.castShadow = true;
                const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.8), matWood); leg1.position.set(-0.9, 0.25, 0); leg1.castShadow = true;
                const leg2 = leg1.clone(); leg2.position.set(0.9, 0.25, 0);
                
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), matWood); pole.position.set(0, 1.4, 0); pole.castShadow = true;
                const topUmbrella = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.4, 0.5, 16, 1, true), matRed); topUmbrella.position.set(0, 2.65, 0); topUmbrella.castShadow = true;
                
                bench.add(seat, leg1, leg2, pole, topUmbrella);
                bench.position.set(bx, 0, bz);
                bench.rotation.y = ry;
                
                environmentGrp.add(bench);
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(bx, 0.5, bz), new THREE.Vector3(2.6, 1.0, 1.2))});
            };

            // Spawning spectacular high-fidelity Japanese Shop Stalls across the town lanes!
            const ramenStall = buildShopStall(8, 0, 15, Math.PI, 'ramen'); // Ramen stall on the right main street
            const teaStall = buildShopStall(-8, 0, 15, 0, 'tea');       // Tea dango stall on the left main street
            const weaponStall = buildShopStall(-12, 0, -22, Math.PI / 2, 'weapon'); // moonsteel smith near the plaza
            const maskStall = buildShopStall(12, 0, -22, -Math.PI / 2, 'mask');  // Traditional theatrical mask stall near the plaza
            const sushiStall = buildShopStall(14, 0, 10, -Math.PI / 4, 'sushi'); // Sushi bento shop on right street
            const umbrellaStall = buildShopStall(-14, 0, 10, Math.PI / 4, 'umbrella'); // Umbrella shop on left street
            const herbStall = buildShopStall(-12, 0, -10, Math.PI / 2, 'herbs'); // Herb shop near crossroad
            const sakeStall = buildShopStall(12, 0, -10, -Math.PI / 2, 'sake'); // Sake shop near crossroad

            stateRef.current.shops = [
                {id: 'ramen', x: 8, z: 15, type: 'ramen'},
                {id: 'tea', x: -8, z: 15, type: 'tea'},
                {id: 'weapon', x: -12, z: -22, type: 'weapon'},
                {id: 'mask', x: 12, z: -22, type: 'mask'},
                {id: 'sushi', x: 14, z: 10, type: 'sushi'},
                {id: 'umbrella', x: -14, z: 10, type: 'umbrella'},
                {id: 'herbs', x: -12, z: -10, type: 'herbs'},
                {id: 'sake', x: 12, z: -10, type: 'sake'}
            ];

            // Populate Town Decorations
            createSakuraTree(0, 0, -12);
            createSakuraTree(-18, 0, 28);
            createSakuraTree(18, 0, 28);
            createSakuraTree(-21, 0, -21);
            createSakuraTree(21, 0, -21);

            createStoneLantern(-6, 0, 36);
            createStoneLantern(6, 0, 36);
            createStoneLantern(-6, 0, 20);
            createStoneLantern(6, 0, 20);
            createStoneLantern(-6, 0, 0);
            createStoneLantern(6, 0, 0);
            createStoneLantern(-6, 0, -14);
            createStoneLantern(6, 0, -14);

            createRestBench(-14, 26, Math.PI/4);
            createRestBench(14, 26, -Math.PI/4);
            createRestBench(-16, -16, Math.PI/2);
            createRestBench(16, -16, -Math.PI/2);

            // Villager NPCs and Order wardens
            const villagerPos = [
                // General street citizens (moving/patrolling)
                { id: 'villager_1', type: 'normal', pos: new THREE.Vector3(8, 0, 28), variation: 1, stationary: false }, // Townswoman in pink floral kimono
                { id: 'villager_2', type: 'normal', pos: new THREE.Vector3(-14, 0, 18), variation: 3, stationary: false }, // Young man in teal Yukata
                { id: 'villager_3', type: 'normal', pos: new THREE.Vector3(12, 0, -10), variation: 2, stationary: false }, // Wise elderly monk
                { id: 'villager_4', type: 'normal', pos: new THREE.Vector3(-8, 0, 32), variation: 1, stationary: false }, // Another townswoman in pink floral kimono
                { id: 'villager_5', type: 'normal', pos: new THREE.Vector3(18, 0, 6), variation: 3, stationary: false }, // Another citizen in teal Yukata
                
                // Order wardens patrolling the streets
                { id: 'warden_1', type: 'warden', pos: new THREE.Vector3(14, 0, 42), variation: 0, stationary: false },
                { id: 'warden_2', type: 'warden', pos: new THREE.Vector3(-18, 0, 4), variation: 0, stationary: false },
                { id: 'warden_3', type: 'warden', pos: new THREE.Vector3(0, 0, 36), variation: 0, stationary: false },

                // Stall merchants (stationary, Style 0)
                { id: 'merchant_ramen', type: 'normal', pos: new THREE.Vector3(8, 0, 16.2), rotationY: Math.PI, variation: 0, stationary: true },
                { id: 'merchant_tea', type: 'normal', pos: new THREE.Vector3(-8, 0, 13.8), rotationY: 0, variation: 1, stationary: true }, // Sweet geisha lady sells tea
                { id: 'merchant_forge', type: 'normal', pos: new THREE.Vector3(-13.2, 0, -22), rotationY: Math.PI / 2, variation: 0, stationary: true },
                { id: 'merchant_mask', type: 'normal', pos: new THREE.Vector3(13.2, 0, -22), rotationY: -Math.PI / 2, variation: 2, stationary: true },
                { id: 'merchant_sushi', type: 'normal', pos: new THREE.Vector3(14.8, 0, 11.2), rotationY: -Math.PI / 4, variation: 3, stationary: true },
                { id: 'merchant_umbrella', type: 'normal', pos: new THREE.Vector3(-14.8, 0, 11.2), rotationY: Math.PI / 4, variation: 1, stationary: true },
                { id: 'merchant_herbs', type: 'normal', pos: new THREE.Vector3(-10.8, 0, -10), rotationY: Math.PI / 2, variation: 2, stationary: true },
                { id: 'merchant_sake', type: 'normal', pos: new THREE.Vector3(10.8, 0, -10), rotationY: -Math.PI / 2, variation: 0, stationary: true }
            ];
            
            villagerPos.forEach(v => {
                const vil = buildEnemy(v.type, v.variation);
                vil.group.position.copy(v.pos);
                if (v.rotationY !== undefined) {
                    vil.group.rotation.y = v.rotationY;
                } else {
                    vil.group.rotation.y = (Math.random() - 0.5) * Math.PI;
                }
                
                const interactHaloVil = new THREE.Mesh(new THREE.RingGeometry(1, 1.2, 16), new THREE.MeshBasicMaterial({color: 0xffff00, transparent:true, opacity:0.3, side:THREE.DoubleSide}));
                interactHaloVil.rotation.x = Math.PI/2; interactHaloVil.position.y = 0.1;
                vil.group.add(interactHaloVil);
                
                environmentGrp.add(vil.group);
                
                const actionState = v.stationary ? 'bt_wait' : 'bt_idle';
                const btSequence = v.stationary ? ['bt_wait'] : undefined;
                
                stateRef.current.enemies.push({ 
                    id: v.id, 
                    group: vil.group, 
                    type: 'npc', 
                    active: true, 
                    box: new THREE.Box3(), 
                    health: 9999, 
                    maxHealth: 9999, 
                    velocity: new THREE.Vector3(), 
                    damageTimer: 0, 
                    animParams: vil, 
                    actionState: actionState, 
                    actionTimer: 0,
                    btSequence: btSequence,
                    isStationary: v.stationary
                });
            });
            
            // Master NPC (in a plaza space)
            const master = buildEnemy('normal', 2);
            master.group.position.set(0, 0, -streetWidth*1.5);
            master.group.lookAt(0,0,0);
            master.torso.material = new THREE.MeshStandardMaterial({color: 0x1a2b4c}); 
            const matHat = new THREE.MeshStandardMaterial({color: 0xcca65f, roughness: 0.9});
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.4, 16), matHat);
            hat.position.set(0, 1.8, 0);
            master.group.add(hat);
            
            // Tengu Mask
            const maskGeom = new THREE.BoxGeometry(0.55, 0.55, 0.1);
            const maskMat = new THREE.MeshStandardMaterial({color: 0xcc2222, roughness: 0.5}); // Red mask
            const mask = new THREE.Mesh(maskGeom, maskMat);
            mask.position.set(0, 1.4, 0.26);
            
            // Tengu Nose
            const noseGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
            const nose = new THREE.Mesh(noseGeom, maskMat);
            nose.position.set(0, 1.35, 0.4);
            nose.rotation.x = Math.PI / 2;
            
            master.head.add(mask, nose);

            const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), matWoodDark);
            staff.position.set(0.5, 1.0, 0.4); staff.rotation.x = Math.PI / 6;
            master.group.add(staff);
            
            // Structured Charcoal Stone Pavements (Ishidatami tile segments)
            const pathCanvas = document.createElement('canvas');
            pathCanvas.width = 128; pathCanvas.height = 128;
            const pCtx = pathCanvas.getContext('2d')!;
            pCtx.fillStyle = '#242426'; pCtx.fillRect(0, 0, 128, 128); // Dark granite slate base
            pCtx.strokeStyle = '#121213'; pCtx.lineWidth = 1.5;
            // Draw interlocking brick grid
            for (let y = 0; y < 128; y += 16) {
                pCtx.beginPath(); pCtx.moveTo(0, y); pCtx.lineTo(128, y); pCtx.stroke();
                const shift = (y/16) % 2 === 0 ? 0 : 8;
                for (let x = shift; x < 128; x += 16) {
                    const rTint = Math.random();
                    pCtx.fillStyle = rTint > 0.75 ? '#333436' : (rTint > 0.4 ? '#1d1e1f' : '#27282a');
                    pCtx.fillRect(x + 1, y + 1, 14, 14);
                    pCtx.beginPath(); pCtx.moveTo(x, y); pCtx.lineTo(x, y + 16); pCtx.stroke();
                }
            }
            const pathTexH = new THREE.CanvasTexture(pathCanvas);
            pathTexH.wrapS = THREE.RepeatWrapping; pathTexH.wrapT = THREE.RepeatWrapping;
            pathTexH.repeat.set(30, 2.5); // stretched along horizontal length
            
            const pathTexV = pathTexH.clone();
            pathTexV.repeat.set(2.5, 30); // stretched along vertical length
            
            const matPathH = new THREE.MeshStandardMaterial({map: pathTexH, roughness: 0.85});
            const matPathV = new THREE.MeshStandardMaterial({map: pathTexV, roughness: 0.85});

            for(let bx = -Math.floor(numBlocksX/2)-1; bx <= Math.floor(numBlocksX/2)+1; bx++){
                const pathH = new THREE.Mesh(new THREE.PlaneGeometry(300, streetWidth), matPathH);
                pathH.rotation.x = -Math.PI/2; 
                pathH.position.set(0, 0.02, bx * (blockSize + streetWidth) + blockSize/2 + streetWidth/2);
                environmentGrp.add(pathH);
            }
            for(let bz = -Math.floor(numBlocksZ/2)-1; bz <= Math.floor(numBlocksZ/2)+1; bz++){
                const pathV = new THREE.Mesh(new THREE.PlaneGeometry(streetWidth, 300), matPathV);
                pathV.rotation.x = -Math.PI/2; 
                pathV.position.set(bz * (blockSize + streetWidth) + blockSize/2 + streetWidth/2, 0.03, 0);
                environmentGrp.add(pathV);
            }

            // Path lanterns (Street lights)
            const matLanternPole = new THREE.MeshStandardMaterial({color: 0x2b1e15});
            const matRedLantern = new THREE.MeshStandardMaterial({color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 0.9});
            const numPoles = 100;
            const instPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 8), matLanternPole, numPoles);
            const instRedLantern = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 8), matRedLantern, numPoles);
            let pIdx = 0;
            for(let bz = -Math.floor(numBlocksZ/2); bz <= Math.floor(numBlocksZ/2); bz++){
                for(let bx = -Math.floor(numBlocksX/2); bx <= Math.floor(numBlocksX/2); bx++){
                     // Place lanterns at the 4 corners of blocks
                     const cx = bx * (blockSize + streetWidth);
                     const cz = bz * (blockSize + streetWidth);
                     const corners = [{x: cx-blockSize/2, z:cz-blockSize/2}, {x: cx+blockSize/2, z:cz-blockSize/2}, {x: cx-blockSize/2, z:cz+blockSize/2}, {x: cx+blockSize/2, z:cz+blockSize/2}];
                     corners.forEach(c => {
                         if (pIdx < numPoles) {
                             instPole.setMatrixAt(pIdx, makeMatrix(c.x, 2, c.z));
                             instRedLantern.setMatrixAt(pIdx, makeMatrix(c.x, 4, c.z));
                             pIdx++;
                         }
                     });
                }
            }
            environmentGrp.add(instPole, instRedLantern);
            
            // Add decorative trees/bamboo around the edges
            const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3e5a3a, roughness: 0.8 });
            const instBamboo = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 18, 6), bambooMat, 200);
            const matLeaf = new THREE.MeshStandardMaterial({color: 0xffb7c5}); // sakura pink
            const instLeaf = new THREE.InstancedMesh(new THREE.SphereGeometry(4, 8, 8), matLeaf, 200);
            
            const dummyBam = new THREE.Object3D();
            for(let i=0; i<200; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 60 + Math.random() * 40;
                dummyBam.position.set(Math.cos(angle)*radius, 9, Math.sin(angle)*radius);
                dummyBam.rotation.x = (Math.random()-0.5)*0.1; dummyBam.rotation.z = (Math.random()-0.5)*0.1;
                dummyBam.updateMatrix();
                instBamboo.setMatrixAt(i, dummyBam.matrix);
                dummyBam.position.set(Math.cos(angle)*radius, 16, Math.sin(angle)*radius);
                dummyBam.updateMatrix();
                instLeaf.setMatrixAt(i, dummyBam.matrix);
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(Math.cos(angle)*radius, 5, Math.sin(angle)*radius), new THREE.Vector3(1, 10, 1))});
            }
            environmentGrp.add(instBamboo, instLeaf);
            
            // Add a training dummy
            const dummyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 8), matWoodDark);
            dummyBase.position.set(8, 0.2, 5);
            const dummyPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 8), matWoodDark);
            dummyPole.position.set(8, 1, 5);
            const dummyBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.3), matWoodLight);
            dummyBody.position.set(8, 1.6, 5);
            const dummyHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), matWoodLight);
            dummyHead.position.set(8, 2.5, 5);
            const dummyArm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), matWoodDark);
            dummyArm.position.set(8, 1.6, 5.15);
            const dummyGrp = new THREE.Group();
            dummyGrp.add(dummyBase, dummyPole, dummyBody, dummyHead, dummyArm);
            environmentGrp.add(dummyGrp);
            colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(8, 1, 5), new THREE.Vector3(1, 4, 1))});

            // Traditional military banner flags (Nobori) printed with the Order crest
            const bannerPositions = [
                {x: -4.5, y: 0.2, z: 9.8},
                {x: 4.5, y: 0.2, z: 9.8},
                {x: -12, y: 0.2, z: -15},
                {x: 12, y: 0.2, z: -15},
                {x: -24, y: 0.2, z: 24},
                {x: 24, y: 0.2, z: 24}
            ];
            
            bannerPositions.forEach((bp, bIdx) => {
                const bGroup = new THREE.Group();
                bGroup.name = 'swaying_banner';
                bGroup.position.set(bp.x, 0, bp.z);
                
                // Bamboo vertical and cross hilt banner support
                const bPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.5, 6), matWoodDark);
                bPole.position.y = 3.25; bPole.castShadow = true;
                bGroup.add(bPole);
                
                const bArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), matWoodDark);
                bArm.rotation.z = Math.PI / 2; bArm.position.set(0.6, 6.0, 0); bArm.castShadow = true;
                bGroup.add(bArm);
                
                // Create specialized clan crest texture with moon and slash kanji
                const bCanvas = document.createElement('canvas'); bCanvas.width = 64; bCanvas.height = 128;
                const bCtx = bCanvas.getContext('2d')!;
                bCtx.fillStyle = bIdx % 2 === 0 ? '#121212' : '#881111';
                bCtx.fillRect(0, 0, 64, 128);
                bCtx.strokeStyle = '#ffffff'; bCtx.lineWidth = 4;
                // Circular emblem
                bCtx.beginPath(); bCtx.arc(32, 32, 16, 0, Math.PI*2); bCtx.stroke();
                bCtx.fillStyle = '#ffffff';
                // Japanese kanji text labels
                bCtx.font = 'bold 24px sans-serif'; bCtx.fillText('月', 20, 78);
                bCtx.font = 'bold 16px sans-serif'; bCtx.fillText('斬', 24, 110);
                
                const bTex = new THREE.CanvasTexture(bCanvas); bTex.magFilter = THREE.NearestFilter;
                const bMat = new THREE.MeshStandardMaterial({map: bTex, roughness: 1.0, side: THREE.DoubleSide});
                
                const fabric = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.8, 0.02), bMat);
                fabric.position.set(0.6, 3.4, 0); fabric.castShadow = true;
                bGroup.add(fabric);
                environmentGrp.add(bGroup);
            });

            // Ambient warm amber and crimson pointlights to highlight city alleys
            const lightPoints = [
                {x: -12, y: 4, z: 12, color: 0xffaa44, intensity: 4.5},
                {x: 12, y: 4, z: -12, color: 0xff9922, intensity: 4.5},
                {x: -3, y: 4.5, z: 10, color: 0xff4400, intensity: 4.0}, // Left Torii pillar
                {x: 3, y: 4.5, z: 10, color: 0xff4400, intensity: 4.0}, // Right Torii pillar
                {x: 0, y: 4, z: -streetWidth*1.5 - 3, color: 0xffab47, intensity: 5.0} // Training Plaza light
            ];
            
            lightPoints.forEach(lp => {
                const pLight = new THREE.PointLight(lp.color, lp.intensity, 18);
                pLight.position.set(lp.x, lp.y, lp.z);
                pLight.userData = { baseIntensity: lp.intensity, phaseOffset: Math.random() * 12 };
                lightsGrp.add(pLight);
            });

            // Torii Gate at the entrance
            const matTorii = new THREE.MeshStandardMaterial({color: 0x992222, roughness: 0.7});
            const matToriiBlack = new THREE.MeshStandardMaterial({color: 0x111111});
            const torii = new THREE.Group();
            const tp1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 8, 8), matTorii);
            tp1.position.set(-3, 4, 0); torii.add(tp1);
            const tpb1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8), matToriiBlack);
            tpb1.position.set(-3, 0.2, 0); torii.add(tpb1);
            const tp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 8, 8), matTorii);
            tp2.position.set(3, 4, 0); torii.add(tp2);
            const tpb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8), matToriiBlack);
            tpb2.position.set(3, 0.2, 0); torii.add(tpb2);
            const tTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.6, 0.6), matTorii);
            tTop.position.set(0, 7.8, 0); torii.add(tTop);
            const tTopUp = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 0.4), matToriiBlack);
            tTopUp.position.set(0, 8.2, 0); torii.add(tTopUp);
            const tMid = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 0.4), matTorii);
            tMid.position.set(0, 6, 0); torii.add(tMid);
            torii.position.set(0, 0, 10);
            environmentGrp.add(torii);
            colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3, 4, 10), new THREE.Vector3(1, 8, 1))});
            colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3, 4, 10), new THREE.Vector3(1, 8, 1))});

            // Register dummy as a targetable but non-aggressive enemy for practice
            stateRef.current.enemies.push({
                id: 'dummy',
                group: dummyGrp,
                type: 'dummy',
                active: true,
                box: new THREE.Box3(),
                health: 99999,
                maxHealth: 99999,
                velocity: new THREE.Vector3(),
                damageTimer: 0,
                animParams: { 
                    group: dummyGrp, 
                    torso: dummyBody,
                    head: dummyHead,
                    lArm: dummyArm, 
                    rArm: { rotation: {x:0, y:0, z:0} }, 
                    lLeg: { rotation: {x:0, y:0, z:0} }, 
                    rLeg: { rotation: {x:0, y:0, z:0} },
                    materials: [dummyBase.material, dummyPole.material, dummyBody.material, dummyHead.material, dummyArm.material]
                },
                actionState: 'bt_idle',
                actionTimer: 0
            });

            // Interaction visualizer
            const interactHalo = new THREE.Mesh(new THREE.RingGeometry(1, 1.2, 16), new THREE.MeshBasicMaterial({color: 0xffff00, transparent:true, opacity:0.5, side:THREE.DoubleSide}));
            interactHalo.rotation.x = Math.PI/2; interactHalo.position.y = 0.1;
            master.group.add(interactHalo);

            environmentGrp.add(master.group);
            stateRef.current.enemies.push({ id:'master', group: master.group, type:'npc', active:true, box: new THREE.Box3(), health: 9999, maxHealth:9999, velocity: new THREE.Vector3(), damageTimer: 0, animParams: master, actionState: 'bt_idle', actionTimer: 0 });
        } 
        else if (stageName === 'forest') {
            playerObj.group.position.set(0, 5, 40); playerObj.group.rotation.y = Math.PI;
            
            // Neon-glowing ancient spiritual stepping stones that form a gorgeous winding trail
            const stepGeom = new THREE.BoxGeometry(2.4, 0.12, 1.8);
            const matGlowStone = new THREE.MeshStandardMaterial({
                color: 0x3acfc3, 
                emissive: 0x1a8c82, 
                emissiveIntensity: 1.8,
                roughness: 0.2
            });
            const numSteps = 70;
            const instSteps = new THREE.InstancedMesh(stepGeom, matGlowStone, numSteps);
            instSteps.receiveShadow = true;
            const dummyStep = new THREE.Object3D();
            for (let i = 0; i < numSteps; i++) {
                const t = i / (numSteps - 1);
                // Create a beautiful winding sinusoidal snake trail guiding the player safely through the bamboo maze!
                const z = 60 - t * 120;
                const x = Math.sin(t * Math.PI * 3.5) * 20 + Math.cos(t * Math.PI * 1.5) * 8;
                
                dummyStep.position.set(x, 0.05, z);
                dummyStep.rotation.set(0, Math.sin(t * Math.PI) * 0.5, 0);
                dummyStep.scale.set(0.9 + Math.random()*0.2, 1.0, 0.9 + Math.random()*0.2);
                dummyStep.updateMatrix();
                instSteps.setMatrixAt(i, dummyStep.matrix);
            }
            instSteps.instanceMatrix.needsUpdate = true;
            environmentGrp.add(instSteps);

            const bambooMat = new THREE.MeshStandardMaterial({ color: 0x2e4a2a, roughness: 0.8 });
            const instBamboo = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 25, 6), bambooMat, isMobileDevice?150:400);
            instBamboo.castShadow = !isMobileDevice;
            const dummy = new THREE.Object3D();
            for(let i=0; i<instBamboo.count; i++) {
                const x = THREE.MathUtils.randFloatSpread(180); const z = THREE.MathUtils.randFloatSpread(180);
                if (x*x + z*z < 100) continue;
                
                // Avoid spawning bamboo directly on top of the winding glowing path so the walkthrough is clean
                let onPath = false;
                for (let j = 0; j < numSteps; j += 4) {
                    const t = j / (numSteps - 1);
                    const pz = 60 - t * 120;
                    const px = Math.sin(t * Math.PI * 3.5) * 20 + Math.cos(t * Math.PI * 1.5) * 8;
                    const dx = x - px;
                    const dz = z - pz;
                    if (dx*dx + dz*dz < 16) {
                        onPath = true;
                        break;
                    }
                }
                if (onPath) continue;

                dummy.position.set(x, 12.5, z); dummy.rotation.y = Math.random()*Math.PI; dummy.rotation.x = (Math.random()-0.5)*0.1; dummy.updateMatrix();
                instBamboo.setMatrixAt(i, dummy.matrix);
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 12, z), new THREE.Vector3(1.0, 25, 1.0))});
            }
            environmentGrp.add(instBamboo);

            // Spawn Demons
            for(let i=0; i< (isMobileDevice?15:30); i++){
                const demonTypeRand = Math.random();
                let typeStr = 'normal';
                if (demonTypeRand > 0.85) typeStr = 'silk_spawn';
                else if (demonTypeRand > 0.95) typeStr = 'greater_spawn';
                
                const e = buildEnemy(typeStr);
                const angle = Math.random() * Math.PI * 2; const dist = 20 + Math.random() * 60;
                e.group.position.set(Math.cos(angle)*dist, 0, Math.sin(angle)*dist);
                
                // Demonic Rank Generation
                const ranks = ['Low', 'Mid', 'High'];
                const rankIdx = (typeStr === 'greater_spawn' ? 2 : (typeStr === 'silk_spawn' ? 1 : 0));
                const rankStr = ranks[rankIdx];
                const rankMult = 1.0 + (rankIdx * 1.5); // 1.0, 2.5, 4.0
                
                // Scale physical size slightly based on rank
                e.group.scale.set(1 + rankIdx*0.1, 1 + rankIdx*0.1, 1 + rankIdx*0.1);
                
                environmentGrp.add(e.group);
                stateRef.current.enemies.push({ 
                    id:`demon_${i}`, group: e.group, type:'demon', 
                    demonicRank: rankStr, rankMult: rankMult,
                    active:true, health: 150 * rankMult, maxHealth: 150 * rankMult, velocity: new THREE.Vector3(), box: new THREE.Box3(), animParams: e, damageTimer: 0 
                });
            }

            // Spawn 3 Sacred Spider-Cocoons physically around Mount Kurenai forest depths
            const cocoonPositions = [
                { id: 'cocoon_alpha', name: 'Scarlet Cocoon (Alpha)', pos: new THREE.Vector3(-25, 0, 15), color: 0xff3355, emissive: 0xaa0033 },
                { id: 'cocoon_beta', name: 'Amethyst Cocoon (Beta)', pos: new THREE.Vector3(25, 0, -25), color: 0xb533ff, emissive: 0x4400aa },
                { id: 'cocoon_gamma', name: 'Azure Cocoon (Gamma)', pos: new THREE.Vector3(-5, 0, -55), color: 0x33b5ff, emissive: 0x0044aa }
            ];

            cocoonPositions.forEach((cp, idx) => {
                const grp = new THREE.Group();
                const mGeom = new THREE.CylinderGeometry(1.2, 1.8, 4.5, 12);
                const mMat = new THREE.MeshStandardMaterial({
                    color: cp.color,
                    emissive: cp.emissive,
                    emissiveIntensity: 1.8,
                    roughness: 0.8
                });
                const mesh = new THREE.Mesh(mGeom, mMat);
                mesh.position.y = 2.25;
                grp.add(mesh);

                // Add a glowing ring anchor on the forest floor
                const hGeom = new THREE.RingGeometry(1.8, 2.1, 16);
                const hMat = new THREE.MeshBasicMaterial({ color: cp.color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                const halo = new THREE.Mesh(hGeom, hMat);
                halo.rotation.x = Math.PI / 2;
                halo.position.y = 0.08;
                grp.add(halo);

                grp.position.copy(cp.pos);
                environmentGrp.add(grp);

                stateRef.current.enemies.push({
                    id: cp.id,
                    group: grp,
                    type: 'cocoon',
                    active: true,
                    health: 300,
                    maxHealth: 300,
                    velocity: new THREE.Vector3(),
                    box: new THREE.Box3(),
                    damageTimer: 0,
                    animParams: {
                        group: grp,
                        torso: mesh,
                        head: mesh,
                        materials: [mMat]
                    }
                });
                
                // Add collider block
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(cp.pos, new THREE.Vector3(2.5, 5, 2.5))});
            });
        }
        else if (stageName === 'boss') {
            playerObj.group.position.set(0, 5, 30); playerObj.group.rotation.y = Math.PI;
            
            // Shrine Ruins
            const stoneMat = new THREE.MeshStandardMaterial({color: 0x444444, roughness:0.9});
            const pGeom = new THREE.CylinderGeometry(1, 1, 10, 8);
            for(let i=0; i<8; i++){
                const angle = (i/8)*Math.PI*2;
                const mesh = new THREE.Mesh(pGeom, stoneMat); mesh.castShadow=true;
                mesh.position.set(Math.cos(angle)*25, 5, Math.sin(angle)*25);
                environmentGrp.add(mesh);
                colliders.push({box: new THREE.Box3().setFromCenterAndSize(mesh.position, new THREE.Vector3(2, 10, 2))});
            }
            
            // Add Torii Gates
            environmentGrp.add(buildToriiGate(0, 0, 35, 0, 1.5));
            environmentGrp.add(buildToriiGate(0, 0, -35, 0, 1.5));
            environmentGrp.add(buildToriiGate(35, 0, 0, Math.PI/2, 1.5));
            environmentGrp.add(buildToriiGate(-35, 0, 0, Math.PI/2, 1.5));

            // Boss Demon
            const bossVariations = ['boss', 'elder_spawn'];
            const bossType = bossVariations[Math.floor(Math.random()*bossVariations.length)];
            const boss = buildEnemy(bossType);
            boss.group.position.set(0, 0, -20);
            environmentGrp.add(boss.group);
            stateRef.current.enemies.push({ 
                id:'boss', group: boss.group, type:'boss', 
                demonicRank: bossType === 'elder_spawn' ? 'Elder Horror' : 'Thread Horror', rankMult: bossType === 'elder_spawn' ? 6.0 : 3.0,
                active:true, health: bossType === 'elder_spawn' ? 6000 : 3000, maxHealth: bossType === 'elder_spawn' ? 6000 : 3000, velocity: new THREE.Vector3(), box: new THREE.Box3(), animParams: boss, damageTimer: 0, actionTimer: 0, actionState: 'idle' 
            });
        }
        
        const s = stateRef.current;
        s.position.copy(playerObj.group.position);
        s.rotation = playerObj.group.rotation.y;
        s.velocity.set(0, 0, 0);
        s.isOnFloor = false;
        
        currentLoadedStage = stageName;
    };

    // ----- Inputs -----
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setActiveShop(null);
            setDialogId(null);
        }
        if (stateRef.current.activeDialog !== null) {
            if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
                e.preventDefault();
                advanceDialogRef.current?.();
                return;
            }
        }
        if (stateRef.current.activeCutscene !== null) {
            if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
                e.preventDefault();
                advanceCutsceneRef.current?.();
                return;
            }
        }
        keys[e.key.toLowerCase()] = true;
    };
    const ku = (e: KeyboardEvent) => keys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // ----- Main Game Loop -----
    let lastTime = performance.now();
    let animId: number;

    const gameLoop = (timeNow: number) => {
      animId = requestAnimationFrame(gameLoop);
      const time = timeNow / 1000;
      let realDelta = Math.min((timeNow - lastTime) / 1000, 0.1);
      lastTime = timeNow;

      const s = stateRef.current;
      
      // Calculate active alive combatants for slow-motion victory
      const activeThreats = s.enemies ? s.enemies.filter(e => e.active && e.type !== 'npc').length : 0;
      let timeMultiplier = 1.0;
      if (s.health <= 0) {
          timeMultiplier = 0.18; // Slow down dramatically on death
      } else if (s.stage === 'boss' && activeThreats === 0) {
          timeMultiplier = 0.25; // Majestic boss defeat camera slow-mo
      } else if (s.stage === 'forest' && activeThreats === 0) {
          timeMultiplier = 0.35; // Stage clear slow-mo
      }
      realDelta *= timeMultiplier;
      
      if (s.hitStopTimer > 0) {
          s.hitStopTimer -= realDelta;
          realDelta *= 0.05; // dramatic slowdown
      }
      
      const delta = realDelta;
      
      // State transition checks
      if (currentLoadedStage !== s.stage) { loadStage(s.stage); }
      
      let isPaused = s.activeDialog !== null || s.activeCutscene !== null || menuOpen || s.activeTip !== null || activeShop !== null;
      
      // Update persistent updates
      if (!isPaused && s.health > 0) {
          if (s.questsProgress) {
              s.questsProgress.timeSpent = (s.questsProgress.timeSpent || 0) + delta;
          }
          if (s.moonpetalHealActive) {
              s.health = Math.min(s.maxHealth, s.health + 2.5 * delta);
              if (Math.random() < 0.08) spawnParticles(s.position, 0xe8bdff, 1, 'wind');
          }
      }

      // Progress tracking metrics updated below.

      let moveX = 0; let moveZ = 0;

      if (!isPaused && s.health > 0) {
        if (keys['w'] || keys['arrowup']) moveZ -= 1;
        if (keys['s'] || keys['arrowdown']) moveZ += 1;
        if (keys['a'] || keys['arrowleft']) moveX -= 1;
        if (keys['d'] || keys['arrowright']) moveX += 1;
        if (s.input.x !== 0 || s.input.y !== 0) { moveX = s.input.x; moveZ = s.input.y; }

        if ((keys[' '] || s.input.jump) && s.isOnFloor && !s.isAttacking && !s.isDashing) {
          s.velocity.y = 12; s.isOnFloor = false;
        }

        // Action Triggers
        const autoTarget = () => {
            let closestDir = null;
            let closestDist = 20;
            s.enemies.forEach(e => {
                if (!e.active || e.type === 'dummy' || e.type === 'npc') return;
                const dist = s.position.distanceTo(e.group.position);
                if (dist < closestDist) {
                   closestDist = dist;
                   closestDir = e.group.position.clone().sub(s.position).normalize();
                }
            });
            if (closestDir) {
                s.rotation = Math.atan2(closestDir.x, closestDir.z);
            }
        };

        const attackReq = keys['j'] || s.input.attack;
        if (attackReq && (!s.isAttacking || (s.attackPhase < 3 && s.comboWindow > 0)) && !s.isDashing) {
            autoTarget();
            s.stats.attacks++;
            if (!s.isAttacking) { s.isAttacking = true; s.attackPhase = 1; }
            else if (s.comboWindow > 0) { s.attackPhase++; }
            s.attackTimer = 0; s.attackType = 'normal'; s.comboWindow = 0;
            audioManager.playSlash();
            keys['j'] = false; s.input.attack = false; // consume trigger
        }
        
        if ((keys['o'] || s.input.skill1) && !s.isAttacking && !s.isDashing && s.stamina >= 30) {
            autoTarget();
            s.stats.water++;
            s.isAttacking = true; s.attackPhase = 1; s.attackTimer = 0; s.attackType = 'water'; s.stamina -= 30; s.velocity.y = 10; s.isOnFloor = false;
            if (s.questsProgress) s.questsProgress.skills = (s.questsProgress.skills || 0) + 1;
            audioManager.playWater();
            keys['o'] = false; s.input.skill1 = false;
        }

        if ((keys['l'] || s.input.skill2) && !s.isAttacking && !s.isDashing && s.stamina >= 50) {
            autoTarget();
            s.isAttacking = true; s.attackPhase = 1; s.attackTimer = 0; s.attackType = 'fire'; s.stamina -= 50;
            if (s.questsProgress) s.questsProgress.skills = (s.questsProgress.skills || 0) + 1;
            audioManager.playFire();
            keys['l'] = false; s.input.skill2 = false;
        }

        if ((keys['u'] || s.input.skill3) && !s.isAttacking && !s.isDashing && s.stamina >= 40) {
            autoTarget();
            s.isAttacking = true; s.attackPhase = 1; s.attackTimer = 0; s.attackType = 'thunder'; s.stamina -= 40;
            if (s.questsProgress) s.questsProgress.skills = (s.questsProgress.skills || 0) + 1;
            audioManager.playThunder();
            keys['u'] = false; s.input.skill3 = false;
        }

        if ((keys['k'] || keys['shift'] || s.input.dash) && !s.isDashing && !s.isAttacking && !s.isBlocking && s.stamina >= (s.umbrellaGetaActive ? 7 : 15)) {
            s.stats.dashes++;
            s.isDashing = true; s.dashTimer = 0; s.stamina -= (s.umbrellaGetaActive ? 7 : 15);
            s.invulnTimer = Math.max(s.invulnTimer, 0.4); // I-frames
            if (s.questsProgress) s.questsProgress.dashes = (s.questsProgress.dashes || 0) + 1;
            audioManager.playDash();
            spawnParticles(s.position, 0xffffff, 15, 'wind');
            keys['k'] = false; keys['shift'] = false; s.input.dash = false;
        }

        if ((keys['q'] || keys['i'] || s.input.interact) && !s.isDashing && !s.isAttacking && s.isOnFloor && !s.nearestInteractableId.startsWith('merchant_')) {
            if (!s.isBlocking) {
                s.isBlocking = true;
                s.blockTimer = 0;
                if (s.questsProgress) s.questsProgress.blocks = (s.questsProgress.blocks || 0) + 1;
            }
            s.blockTimer += delta;
        } else {
            s.isBlocking = false;
        }
        
        // NPC Interact / Merchant Shop Systems
        if ((keys['e'] || s.input.interact) && s.nearestInteractableDist < 4.0) {
            if (s.stage === 'village' && s.nearestInteractableId) {
                if (s.nearestInteractableId.startsWith('merchant_')) {
                    setActiveShop(s.nearestInteractableId);
                    (audioManager as any).playMenuOpen?.();
                } else if (s.nearestInteractableId === 'master') {
                    if ((s.dummyHits || 0) < 3) {
                        setDialogId('master_need_training');
                    } else {
                        setDialogId('villageIntro');
                    }
                    setDialogLineIdx(0);
                } else if (s.nearestInteractableId !== 'master') {
                    setDialogId(s.nearestInteractableId);
                    setDialogLineIdx(0);
                }
            }
            keys['e'] = false; s.input.interact = false;
        }
      }

      // Physics & Movement
      const inputLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (inputLength > 1) { moveX /= inputLength; moveZ /= inputLength; }
      
      if (!s.isDashing && !s.isAttacking && s.stamina < s.maxStamina) {
          if (inputLength === 0) {
             s.stamina += 40 * delta; // full moon focus regen
             if (Math.random() < 0.1) spawnParticles(s.position, 0x00ff88, 1, 'magic');
          } else {
             s.stamina += 15 * delta;
          }
      }
      if (s.stamina > s.maxStamina) s.stamina = s.maxStamina;
      if (s.invulnTimer > 0) s.invulnTimer -= delta;

      const SPEED = 12.0; const DASH_SPEED = 40.0; const ACCEL = 40.0; const FRICTION = 30.0; const GRAVITY = 25.0;
      
      if (s.isDashing) {
          s.dashTimer += delta;
          const fwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation);
          s.velocity.x = fwd.x * DASH_SPEED; s.velocity.z = fwd.z * DASH_SPEED;
          spawnParticles(s.position, 0xcceeff, 2, 'wind');
          if (s.ghostTrails.length < 5 || Math.random() < 0.3) {
              s.ghostTrails.push({pos: s.position.clone(), rot: s.rotation, life: 1.0});
          }
          if (s.dashTimer > 0.25) s.isDashing = false;
      } else {
          let spdMult = s.isAttacking ? (s.attackType === 'fire' ? 1.5 : 0.2) : (s.isBlocking ? 0.3 : 1.0);
          // Low-framerate stability: THREE.MathUtils.lerp does not clamp t, so at the
          // clamped max delta (0.1s) ACCEL*delta = 4.0 and FRICTION*delta = 3.0 overshoot
          // and diverge geometrically (x3 / x2 per frame), slingshotting the player across
          // the map on any slow frame. Clamp t to 1 so velocity snaps without overshoot.
          const accelT = Math.min(1, ACCEL * delta);
          const fricT = Math.min(1, FRICTION * delta);
          if (inputLength > 0) {
              s.velocity.x = THREE.MathUtils.lerp(s.velocity.x, moveX * SPEED * spdMult, accelT);
              s.velocity.z = THREE.MathUtils.lerp(s.velocity.z, moveZ * SPEED * spdMult, accelT);
              if (!s.isAttacking) {
                const targetAngle = Math.atan2(s.velocity.x, s.velocity.z);
                const diff = targetAngle - s.rotation;
                s.rotation += Math.atan2(Math.sin(diff), Math.cos(diff)) * 12 * delta;
              }
          } else {
              s.velocity.x = THREE.MathUtils.lerp(s.velocity.x, 0, fricT);
              s.velocity.z = THREE.MathUtils.lerp(s.velocity.z, 0, fricT);
          }
      }

      if (!s.isOnFloor) s.velocity.y -= GRAVITY * delta;

      // Player Collisions
      const moveDelta = s.velocity.clone().multiplyScalar(delta);
      const playerBox = new THREE.Box3();
      const pR = 0.4; const pH = 1.8;
      const getPBox = (px:number, py:number, pz:number) => playerBox.set(new THREE.Vector3(px-pR, py, pz-pR), new THREE.Vector3(px+pR, py+pH, pz+pR));
      const checkCol = (b: THREE.Box3) => colliders.some(c => b.intersectsBox(c.box));

      getPBox(s.position.x + moveDelta.x, s.position.y, s.position.z);
      if (!checkCol(playerBox)) s.position.x += moveDelta.x; else s.velocity.x = 0;
      getPBox(s.position.x, s.position.y, s.position.z + moveDelta.z);
      if (!checkCol(playerBox)) s.position.z += moveDelta.z; else s.velocity.z = 0;

      // World boundary: soft radial wall around the stage so the player can never walk
      // out of the playable area into empty sky/fog (content lives within ~90m of origin,
      // ground plane spans +/-150m). Slides along the wall instead of hard-stopping.
      const WORLD_R = 98;
      const pDistXZ = Math.sqrt(s.position.x * s.position.x + s.position.z * s.position.z);
      if (pDistXZ > WORLD_R) {
          const invR = WORLD_R / pDistXZ;
          s.position.x *= invR; s.position.z *= invR;
          const bnx = s.position.x / WORLD_R; const bnz = s.position.z / WORLD_R;
          const vOut = s.velocity.x * bnx + s.velocity.z * bnz;
          if (vOut > 0) { s.velocity.x -= bnx * vOut; s.velocity.z -= bnz * vOut; }
      }

      s.position.y += moveDelta.y;
      if (s.position.y <= 0) {
          s.position.y=0;
          // Anime landing dust burst on hard touchdowns
          if (!s.isOnFloor && s.velocity.y < -8) {
              spawnParticles(s.position.clone(), 0xcbbba0, 14, 'wind');
              s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.15);
          }
          s.velocity.y=0; s.isOnFloor=true;
      } else { s.isOnFloor=false; }

      // Update Player Mesh
      playerObj.group.position.copy(s.position);
      playerObj.group.rotation.y = s.rotation;
      
      const wF = (s.isDashing || s.isAttacking) ? 0 : inputLength;
      
      // Moonflow / Idle
      let headRotY = 0;
      let headRotX = 0;
      
      // Look at nearest enemy
      let nearestEnemDir = null;
      let nearestEnemDist = 15;
      s.enemies.forEach(e => {
         if(!e.active || e.type === 'dummy' || e.type === 'npc') return;
         const dist = s.position.distanceTo(e.group.position);
         if(dist < nearestEnemDist) {
             nearestEnemDist = dist;
             nearestEnemDir = e.group.position.clone().sub(s.position).normalize();
         }
      });
      if (nearestEnemDir) {
         // calculate relative angle between body facing and target direction
         const bodyFwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation);
         const angle = Math.atan2(nearestEnemDir.x, nearestEnemDir.z) - Math.atan2(bodyFwd.x, bodyFwd.z);
         // wrap to -PI, PI
         let wrappedAngle = angle;
         while(wrappedAngle <= -Math.PI) wrappedAngle += Math.PI*2;
         while(wrappedAngle > Math.PI) wrappedAngle -= Math.PI*2;
         headRotY = THREE.MathUtils.clamp(wrappedAngle, -Math.PI/3, Math.PI/3);
         headRotX = THREE.MathUtils.clamp(-nearestEnemDir.y, -Math.PI/6, Math.PI/6);
      } else {
         headRotY = Math.sin(time)*0.1;
      }

      // Smooth pose transitions: frame-rate-independent tweens toward per-state targets so no state switch snaps
      const poseTween = 1 - Math.exp(-14 * delta);
      const poseTweenFast = 1 - Math.exp(-22 * delta);
      (playerObj as any).walkAmp = THREE.MathUtils.lerp((playerObj as any).walkAmp ?? 0, wF, 1 - Math.exp(-8 * delta));
      const wAmp = (playerObj as any).walkAmp;

      if (wF === 0 && !s.isAttacking && !s.isBlocking) {
          playerObj.torso.scale.set(1, 1 + Math.sin(time*2)*0.02, 1 + Math.sin(time*2)*0.02);
          playerObj.lArm.rotation.z = THREE.MathUtils.lerp(playerObj.lArm.rotation.z, 0.1 + Math.sin(time*2)*0.05, poseTween);
          playerObj.rArm.rotation.z = THREE.MathUtils.lerp(playerObj.rArm.rotation.z, -0.1 - Math.sin(time*2)*0.05, poseTween);
          playerObj.headG.rotation.y = THREE.MathUtils.lerp(playerObj.headG.rotation.y, headRotY, 5*delta);
          playerObj.headG.rotation.x = THREE.MathUtils.lerp(playerObj.headG.rotation.x, headRotX, 5*delta);
      } else {
          playerObj.torso.scale.set(1, 1, 1);
          playerObj.lArm.rotation.z = THREE.MathUtils.lerp(playerObj.lArm.rotation.z, 0, poseTween);
          playerObj.rArm.rotation.z = THREE.MathUtils.lerp(playerObj.rArm.rotation.z, 0, poseTween);
          playerObj.headG.rotation.y = THREE.MathUtils.lerp(playerObj.headG.rotation.y, headRotY * 0.5, 10*delta);
          playerObj.headG.rotation.x = THREE.MathUtils.lerp(playerObj.headG.rotation.x, headRotX * 0.5, 10*delta);
      }

      if (!s.isOnFloor) {
          // Jumping / Falling animation (tweened so takeoff and landing don't snap)
          playerObj.lLeg.rotation.x = THREE.MathUtils.lerp(playerObj.lLeg.rotation.x, -Math.PI / 4, poseTweenFast);
          playerObj.rLeg.rotation.x = THREE.MathUtils.lerp(playerObj.rLeg.rotation.x, -Math.PI / 4, poseTweenFast);
          if (!s.isAttacking) {
              playerObj.lArm.rotation.x = THREE.MathUtils.lerp(playerObj.lArm.rotation.x, Math.PI / 6, poseTweenFast);
              playerObj.rArm.rotation.x = THREE.MathUtils.lerp(playerObj.rArm.rotation.x, Math.PI / 6, poseTweenFast);
              playerObj.lArm.rotation.z = THREE.MathUtils.lerp(playerObj.lArm.rotation.z, Math.PI / 8, poseTweenFast);
              playerObj.rArm.rotation.z = THREE.MathUtils.lerp(playerObj.rArm.rotation.z, -Math.PI / 8, poseTweenFast);
          }
      } else {
          // Walk cycle: amplitude eases in/out (wAmp) and rotations tween toward the cycle so start/stop/land never snap
          const legSwing = Math.sin(time*15) * 0.9 * wAmp;
          playerObj.lLeg.rotation.x = THREE.MathUtils.lerp(playerObj.lLeg.rotation.x, legSwing, poseTweenFast);
          playerObj.rLeg.rotation.x = THREE.MathUtils.lerp(playerObj.rLeg.rotation.x, -legSwing, poseTweenFast);
          if (!s.isAttacking) {
              if (s.isBlocking) {
                  playerObj.rArm.rotation.x = THREE.MathUtils.lerp(playerObj.rArm.rotation.x, Math.PI / 4, poseTweenFast);
                  playerObj.rArm.rotation.z = THREE.MathUtils.lerp(playerObj.rArm.rotation.z, Math.PI / 4, poseTweenFast);
                  playerObj.lArm.rotation.x = THREE.MathUtils.lerp(playerObj.lArm.rotation.x, Math.PI / 3, poseTweenFast);
                  playerObj.lArm.rotation.z = THREE.MathUtils.lerp(playerObj.lArm.rotation.z, -Math.PI / 4, poseTweenFast);
              } else {
                  playerObj.rArm.rotation.x = THREE.MathUtils.lerp(playerObj.rArm.rotation.x, -Math.sin(time*15) * 0.6 * wAmp, poseTweenFast);
              }
          }
          playerObj.lArm.rotation.x = THREE.MathUtils.lerp(playerObj.lArm.rotation.x, s.isBlocking ? Math.PI / 3 : Math.sin(time*15) * 0.6 * wAmp, poseTweenFast);
      }

      // Anime-style ninja sprint pose while dashing: forward lean, arms swept back, blurred fast leg cycle
      if (s.isDashing) {
          playerObj.group.rotation.x = THREE.MathUtils.lerp(playerObj.group.rotation.x, 0.32, 14 * delta);
          playerObj.lArm.rotation.x = THREE.MathUtils.lerp(playerObj.lArm.rotation.x, -Math.PI / 1.8, 16 * delta);
          playerObj.rArm.rotation.x = THREE.MathUtils.lerp(playerObj.rArm.rotation.x, -Math.PI / 1.8, 16 * delta);
          playerObj.lArm.rotation.z = THREE.MathUtils.lerp(playerObj.lArm.rotation.z, 0.35, 16 * delta);
          playerObj.rArm.rotation.z = THREE.MathUtils.lerp(playerObj.rArm.rotation.z, -0.35, 16 * delta);
          playerObj.lLeg.rotation.x = Math.sin(time*30) * 1.1;
          playerObj.rLeg.rotation.x = -Math.sin(time*30) * 1.1;
      } else if (!s.isAttacking && s.isOnFloor) {
          playerObj.group.rotation.x = THREE.MathUtils.lerp(playerObj.group.rotation.x, 0, 10 * delta);
      }

      // 1. Dynamic Haori/Kimono cape physics flapping
      const speedLength = Math.sqrt(s.velocity.x * s.velocity.x + s.velocity.z * s.velocity.z);
      const isMoving = speedLength > 0.1 || wF > 0;
      
      let targetBackFlapX = Math.PI / 16;
      let targetSideFlapsZ = 0.05;
      
      if (isMoving) {
          const flapFreq = s.isDashing ? 24.0 : 16.0;
          const gust = Math.sin(time * flapFreq) * 0.14;
          const ratio = Math.min(1.0, speedLength / DASH_SPEED);
          targetBackFlapX = ratio * (Math.PI / 2.8) + gust;
          targetSideFlapsZ = 0.1 + ratio * (Math.PI / 4.5) + Math.abs(gust);
      } else {
          // Idle sway motion
          targetBackFlapX = Math.PI / 16 + Math.sin(time * 3.0) * 0.03;
          targetSideFlapsZ = 0.05 + Math.sin(time * 3.0) * 0.02;
      }
      
      if (!s.isOnFloor) {
          // Wing backwards on jumps
          targetBackFlapX += Math.PI / 3.5;
          targetSideFlapsZ += Math.PI / 6;
      }
      
      playerObj.backFlapPivot.rotation.x = THREE.MathUtils.lerp(playerObj.backFlapPivot.rotation.x, targetBackFlapX, 8 * delta);
      playerObj.lFlapPivot.rotation.z = THREE.MathUtils.lerp(playerObj.lFlapPivot.rotation.z, -targetSideFlapsZ, 8 * delta);
      playerObj.rFlapPivot.rotation.z = THREE.MathUtils.lerp(playerObj.rFlapPivot.rotation.z, targetSideFlapsZ, 8 * delta);
      
      // Update Sword Dimension based on Genta refinements
      if (playerObj.swordGrp) {
          const refinements = s.swordRefinements || 0;
          const targetSwordScale = 1.0 + refinements * 0.16; // grows larger and more legendary!
          playerObj.swordGrp.scale.set(targetSwordScale, targetSwordScale, targetSwordScale);
      }

      // 2. Glowing katana core animations matching Moonflow style colors
      if (playerObj.swordGlowMat) {
          if (s.isAttacking || s.comboWindow > 0) {
              if (s.attackType === 'water') {
                  playerObj.swordGlowMat.color.setHex(0x0088ff);
                  playerObj.swordGlowMat.opacity = 0.7 + Math.sin(time * 20) * 0.3;
              } else if (s.attackType === 'fire') {
                  playerObj.swordGlowMat.color.setHex(0xff3300);
                  playerObj.swordGlowMat.opacity = 0.8 + Math.sin(time * 25) * 0.2;
              } else if (s.attackType === 'thunder') {
                  playerObj.swordGlowMat.color.setHex(0xffea00);
                  playerObj.swordGlowMat.opacity = 0.9 + Math.sin(time * 35) * 0.1;
              } else {
                  playerObj.swordGlowMat.color.setHex(0xeef5ff);
                  playerObj.swordGlowMat.opacity = 0.6 + Math.sin(time * 12) * 0.2;
              }
              
              // Spawn gorgeous glowing particle trails when attacking
              if (s.isAttacking && playerObj.swordGrp) {
                  const refinements = s.swordRefinements || 0;
                  // Tip offset scaled matches the physical weapon length
                  const tipOffset = new THREE.Vector3(0, 1.4 * (1.0 + refinements * 0.16), 0);
                  const currentTipWorld = tipOffset.clone();
                  playerObj.swordGrp.localToWorld(currentTipWorld);
                  
                  let trailColor = 0xeef5ff;
                  let pType: 'blood'|'water'|'fire'|'wind'|'ash'|'thunder'|'magic' = 'wind';
                  if (s.attackType === 'water') {
                      trailColor = 0x1177ff; pType = 'water';
                  } else if (s.attackType === 'fire') {
                      trailColor = 0xff2200; pType = 'fire';
                  } else if (s.attackType === 'thunder') {
                      trailColor = 0xffea00; pType = 'thunder';
                  }
                  
                  // Refinement level scales particle volume and density!
                  const pCount = Math.floor(2 + refinements * 2);
                  spawnParticles(currentTipWorld, trailColor, pCount, pType);
              }
          } else {
              // Idle style glow (Moonflow is Ren's default)
              playerObj.swordGlowMat.color.setHex(0x00aaff);
              playerObj.swordGlowMat.opacity = 0.45 + Math.sin(time * 4) * 0.15;
          }
      }
      
      // 3. Environment & City sways
      // Sway traditional banner signs
      environmentGrp.traverse((node: any) => {
          if (node.name === 'swaying_banner') {
              const bRatio = Math.sin(time * 2.5 + node.position.x) * 0.08;
              node.rotation.z = bRatio;
              node.rotation.x = Math.cos(time * 2.0 + node.position.z) * 0.04;
          }
      });
      
      // Lantern dynamic flickers scaled matching time of day (flares up in sunset/night)
      const isNight = s.envTime >= 19.5 || s.envTime < 4.5;
      const isSunset = s.envTime >= 16.5 && s.envTime < 19.5;
      
      let lightFactor = 0.05; // very dim during bright midday daylight
      if (isNight) {
          lightFactor = 1.65; // blazing warm flares at night
      } else if (isSunset) {
          lightFactor = 0.05 + 1.60 * ((s.envTime - 16.5) / 3.0);
      } else if (s.envTime >= 4.5 && s.envTime < 6.5) {
          lightFactor = 1.65 - 1.60 * ((s.envTime - 4.5) / 2.0);
      }

      lightsGrp.children.forEach((l: any) => {
          if (l.isPointLight && l.userData && l.userData.baseIntensity) {
              const pulse = Math.sin(time * 18.0 + l.userData.phaseOffset) * (isNight ? 0.30 : 0.12) + Math.cos(time * 8.0 + l.userData.phaseOffset) * (isNight ? 0.20 : 0.08);
              l.intensity = l.userData.baseIntensity * lightFactor * (1.0 + pulse);
              if (isNight || isSunset) {
                  l.color.setHex(0xff4c11); // hot burning flame amber orange at night
              } else {
                  l.color.setHex(0xffaa44);
              }
          }
      });

      // Combat Mechanics State Machine
      slashShaderMat.uniforms.opacityAnim.value = 0;
      slashShaderMat.uniforms.time.value = time;
      slashGrp.clear(); slashGrp.add(slashMesh);
      if (s.comboWindow > 0) s.comboWindow -= delta;
      if (s.hitStreakTimer > 0) {
          s.hitStreakTimer -= delta;
          if (s.hitStreakTimer <= 0) s.hitStreak = 0;
      }

      if (s.isAttacking) {
          if (s.attackTimer === 0) (s as any).attackFromX = playerObj.rArm.rotation.x; // swing starts from the arm's live pose, not a hard-coded angle
          s.attackTimer += delta;
          const phase = Math.min(s.attackTimer / 0.25, 1.0);
          
          let activeColor = s.attackType === 'water' ? 0x2288ff : (s.attackType === 'fire' ? 0xff4411 : (s.attackType === 'thunder' ? 0xffea00 : 0xffffff));
          if (s.attackTimer > 0.05 && s.attackTimer < 0.2) {
              const fwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation).multiplyScalar(2.0 + Math.random()*1.0);
              const swordPos = s.position.clone().add(new THREE.Vector3((Math.random()-0.5)*1.5, 1.0 + (Math.random()*1.5), (Math.random()-0.5)*1.5)).add(fwd);
              spawnParticles(swordPos, activeColor, s.attackType === 'normal' ? 2 : 4, 'wind');
          }
          
          let damageActive = false;
          let dmgMult = 1.0;
          let range = 3.5;
          let knockback = 12;

          if (s.attackType === 'normal') {
              // 3-hit combo visual
              if (s.attackPhase === 3) dmgMult = 1.5;
              const angleSwing = s.attackPhase % 2 === 0 ? Math.PI/2 : -Math.PI/2;
              const easeSwing = 1 - Math.pow(1 - phase, 3); // easeOutCubic: snappy wind-up, smooth follow-through
              playerObj.rArm.rotation.x = THREE.MathUtils.lerp((s as any).attackFromX ?? Math.PI/1.5, angleSwing, easeSwing);
              playerObj.rArm.rotation.z = Math.sin(phase*Math.PI) * 0.5;
              
              if (s.attackTimer > 0.02) {
                  const pFrac = Math.min((s.attackTimer - 0.02) / 0.23, 1.0);
                  slashShaderMat.uniforms.opacityAnim.value = Math.sin(pFrac * Math.PI) * 0.95;
                  slashShaderMat.uniforms.formType.value = 0;
                  slashShaderMat.uniforms.colorMain.value.setHex(0xeef5ff);
                  slashMesh.position.copy(s.position).add(new THREE.Vector3(0, 1.2, 0));
                  
                  // Phase 1: Horizontal, Phase 2: Diagonal up, Phase 3: Vertical down
                  if (s.attackPhase === 1) slashMesh.rotation.set(0, s.rotation, 0);
                  else if (s.attackPhase === 2) slashMesh.rotation.set(Math.PI/6, s.rotation, Math.PI/4);
                  else slashMesh.rotation.set(Math.PI/2, s.rotation, -Math.PI/4);
                  
                  slashMesh.scale.set(1.5, 1.5, 1.5);
              }
              if (s.attackTimer > 0.05 && s.attackTimer < 0.15) {
                  damageActive = true;
              }
              if (s.attackTimer >= 0.25) { s.comboWindow = 0.3; s.isAttacking = false; }
          }
          else if (s.attackType === 'water') {
              // Water Wheel (Jump spin)
              playerObj.group.rotation.x = phase * Math.PI * 4;
              playerObj.rArm.rotation.x = Math.PI;
              dmgMult = 2.0; range = 4.0;
              
              if (s.attackTimer > 0.02) {
                  const pFrac = Math.min((s.attackTimer - 0.02) / 0.48, 1.0);
                  slashShaderMat.uniforms.opacityAnim.value = Math.sin(pFrac * Math.PI) * 1.0;
                  slashShaderMat.uniforms.formType.value = 1;
                  slashShaderMat.uniforms.colorMain.value.setHex(0x0088ff);
                  slashMesh.position.copy(s.position).add(new THREE.Vector3(0, 1, 0));
                  // Rotating spin over time!
                  slashMesh.rotation.set(Math.PI/2 + (phase * Math.PI * 4.0), s.rotation, 0, 'YXZ');
                  slashMesh.scale.set(2.5, 2.5, 2.5);
              }
              if (s.attackTimer > 0.1 && s.attackTimer < 0.3) {
                  spawnParticles(s.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x0088ff, 24, 'water');
                  s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.2); // fluid splash feedback
                  damageActive = true;
              }
              if (s.attackTimer >= 0.5) { s.isAttacking = false; playerObj.group.rotation.x = 0; }
          }
          else if (s.attackType === 'fire') {
              // Blood Moon Dance (Forward spin clear blue sky)
              playerObj.group.rotation.y = s.rotation + phase * Math.PI * 6;
              playerObj.rArm.rotation.x = Math.PI/2; playerObj.rArm.rotation.z = Math.PI/2;
              dmgMult = 4.0; range = 6.0; knockback = 20;
              
              // Force forward
              const fwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation);
              s.velocity.x = fwd.x * DASH_SPEED * 0.8; s.velocity.z = fwd.z * DASH_SPEED * 0.8;

              if (s.attackTimer > 0.02) {
                  const pFrac = Math.min((s.attackTimer - 0.02) / 0.48, 1.0);
                  slashShaderMat.uniforms.opacityAnim.value = Math.sin(pFrac * Math.PI) * 1.0;
                  slashShaderMat.uniforms.formType.value = 2;
                  slashShaderMat.uniforms.colorMain.value.setHex(0xff3300);
                  slashMesh.position.copy(s.position).add(new THREE.Vector3(0, 1.2, 0));
                  slashMesh.rotation.set(Math.PI/8, s.rotation - phase * Math.PI * 2, 0, 'YXZ');
                  slashMesh.scale.set(3.5, 3.5, 3.5);
              }
              if (s.attackTimer > 0.1 && s.attackTimer < 0.4) {
                  spawnParticles(s.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xff3300, 32, 'fire');
                  s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.45); // crackling heat rumble
                  damageActive = true;
              }
              if (s.attackTimer >= 0.5) { s.isAttacking = false; }
          }
          else if (s.attackType === 'thunder') {
              // Stormstep - Skyrend (Ultra-fast teleport slash)
              playerObj.group.rotation.y = s.rotation;
              // Aerodynamic forward-pointing arm pose
              playerObj.lArm.rotation.x = Math.PI - 0.2;
              playerObj.rArm.rotation.x = Math.PI - 0.3;
              
              dmgMult = 3.5; range = 5.2; knockback = 10;
              
              // Direct extreme forward dash impulse representing lightning dash warp
              const fwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation);
              const thunderSpeed = DASH_SPEED * 2.3;
              s.velocity.x = fwd.x * thunderSpeed * (1.1 - phase);
              s.velocity.z = fwd.z * thunderSpeed * (1.1 - phase);

              if (s.attackTimer > 0.01) {
                  const pFrac = Math.min((s.attackTimer - 0.01) / 0.44, 1.0);
                  slashShaderMat.uniforms.opacityAnim.value = Math.sin(pFrac * Math.PI) * 1.25;
                  slashShaderMat.uniforms.formType.value = 3;
                  slashShaderMat.uniforms.colorMain.value.setHex(0xffea00); // Amber yellow
                  slashMesh.position.copy(s.position).add(new THREE.Vector3(0, 1.1, 0));
                  slashMesh.rotation.set(0, s.rotation, Math.PI / 2, 'YXZ');
                  slashMesh.scale.set(4.8, 1.4, 1.4);
              }
              if (s.attackTimer > 0.05 && s.attackTimer < 0.3) {
                  // Spawn thunder lightning particles along player track
                  spawnParticles(s.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xffea00, 30, 'thunder' as any);
                  // Spawn sonic boom physical dust clouds
                  spawnParticles(s.position, 0xffffff, 15, 'wind');
                  damageActive = true;
                  
                  // Massive camera shake representing shockwave
                  s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.9);
              }
              if (s.attackTimer >= 0.45) { s.isAttacking = false; }
          }

          // Apply Damage
          if (damageActive) {
            let newDmtTexts: any[] = [];
            s.enemies.forEach(e => {
                if (!e.active || e.damageTimer > 0 || e.type==='npc') return;
                const dToEnemy = s.position.distanceTo(e.group.position);
                if (dToEnemy < range) {
                    let hitBoxValid = true;
                    if (s.attackType === 'normal') {
                        const dirE = e.group.position.clone().sub(s.position).normalize();
                        const pFwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation);
                        if (dirE.dot(pFwd) < 0.4) hitBoxValid = false;
                    }
                    if (hitBoxValid) {
                        // Tactical Check: Is the boss shielded by cocoons?
                        const cocoonsLeft = s.enemies.filter(e => e.type === 'cocoon' && e.active).length;
                        if (e.type === 'boss' && cocoonsLeft > 0) {
                            // Target is invulnerable! Spark some defensive clashing particles.
                            spawnParticles(e.group.position, 0xffffff, 5, 'wind');
                            s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.1);
                            audioManager.playDamage(); // blunt impact sound
                            return;
                        }

                        const isCrit = Math.random() < 0.25;
                        let dmgMultFromShop = (s.slashDamageMult || 1.0);
                        if (s.ramenBuffActive) dmgMultFromShop *= 1.20;
                        if (s.swordRefinements) dmgMultFromShop *= (1 + s.swordRefinements * 0.15); // Genta refinement 15% per level
                        const critMultFromShop = isCrit ? (s.critDamageMult || 2.0) : 1.0;
                        const finalMult = dmgMult * critMultFromShop * dmgMultFromShop;
                        const dmg = Math.floor((Math.random() * 8 + 8) * finalMult * (1 + (s.level - 1) * 0.4));
                        if (e.id === 'dummy') {
                            e.health = 99999;
                            s.dummyHits = (s.dummyHits || 0) + 1;
                            setDummyHits(s.dummyHits);
                        } else {
                            e.health -= dmg;
                        }
                        e.damageTimer = 0.4;
                        s.hitStreak++; s.hitStreakTimer = 3.0;
                        if (s.questsProgress) {
                            s.questsProgress.damageDealt = (s.questsProgress.damageDealt || 0) + dmg;
                            s.questsProgress.maxCombo = Math.max(s.questsProgress.maxCombo || 0, s.hitStreak);
                        }
                        
                        e.velocity.add(e.group.position.clone().sub(s.position).normalize().multiplyScalar(knockback));
                        spawnParticles(e.group.position, 0xff0000, 20, 'blood');
                        // Anime impact flash: white burst at chest height
                        spawnParticles(e.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffffff, 8, 'wind');
                        if (s.attackType === 'normal' && s.attackPhase === 3) {
                            // Combo finisher: extra burst and rumble
                            spawnParticles(e.group.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xfff2cc, 14, 'wind');
                            s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.25);
                        }
                        if (s.attackType === 'water') {
                            spawnParticles(e.group.position, 0x0088ff, 15, 'water');
                        } else if (s.attackType === 'fire') {
                            spawnParticles(e.group.position, 0xff5500, 15, 'fire');
                        } else if (s.attackType === 'thunder') {
                            spawnParticles(e.group.position, 0xffea00, 20, 'thunder');
                        }
                        
                  if (e.health <= 0) {
                      s.hitStopTimer = 0.25; // Execution hitstop
                      s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.8);
                      spawnParticles(e.group.position, 0xff0000, 50, 'blood');
                      if (s.attackType === 'water') {
                          spawnParticles(e.group.position, 0x00aaff, 35, 'water');
                      } else if (s.attackType === 'fire') {
                          spawnParticles(e.group.position, 0xff6600, 35, 'fire');
                      } else if (s.attackType === 'thunder') {
                          spawnParticles(e.group.position, 0xffea00, 45, 'thunder');
                      }
                  } else if (isCrit) {
                      audioManager.playCrit();
                      s.hitStopTimer = 0.08;
                      s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.5);
                  } else {
                      audioManager.playDamage();
                      s.hitStopTimer = 0.03;
                      s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.2);
                  }
                        
                        // Spawn Damage Text
                        const screenPos = e.group.position.clone().add(new THREE.Vector3(0, 2, 0)).project(camera);
                        const vx = (screenPos.x * 0.5 + 0.5) * 100;
                        const vy = (-(screenPos.y * 0.5) + 0.5) * 100;
                        const idStr = Math.random().toString(36).substr(2, 9);
                        newDmtTexts.push({ id: idStr, val: dmg, x: vx, y: vy, isCrit });
                        
                        if (e.health <= 0) {
                            s.xp += (e.type==='boss'?500: Math.floor(50 * (e.rankMult || 1.0)));
                            spawnParticles(e.group.position, 0x221111, 40, 'ash');
                            const monReward = e.type === 'boss' ? 150 : Math.floor((Math.random() * 15 + 10) * (e.rankMult || 1.0));
                            s.mon = (s.mon || 0) + monReward;
                            if (s.questsProgress) {
                                s.questsProgress.kills = (s.questsProgress.kills || 0) + 1;
                            }
                        }
                    }
                }
            });
            if (newDmtTexts.length > 0) {
                setDamageTexts(prev => {
                    const next = [...prev, ...newDmtTexts];
                    return next.slice(-20);
                });
                setTimeout(() => {
                    setDamageTexts(prev => prev.filter(t => !newDmtTexts.find((nt:any) => nt.id === t.id)));
                }, 1000);
            }
          }
      }

      // Enemies AI & Update
      let actEnemies = 0; let nNearest = 999;
      s.enemies.forEach(e => {
          if (!e.active) return;
          const dToPlayer = e.group.position.distanceTo(s.position);
          
          if (e.animParams && e.animParams.torso && e.type !== 'dummy') {
              const eBreath = Math.sin(time * 3 + e.group.position.x) * 0.03;
              e.animParams.torso.scale.set(1.0 + eBreath * 0.5, 1.0 + eBreath, 1.0 + eBreath * 0.5);
              if (e.animParams.head) {
                  // Make head tilt slightly realistically
                  e.animParams.head.rotation.z = Math.sin(time*1.5 + e.group.position.z)*0.05;
              }
          }
          
          if (e.damageTimer > 0 && e.animParams && e.animParams.torso) {
              e.animParams.torso.rotation.x = Math.sin(e.damageTimer * 25) * 0.3;
              if (e.animParams.head) e.animParams.head.rotation.x = -0.3;
          } else if (e.animParams && e.animParams.torso) {
              e.animParams.torso.rotation.x = THREE.MathUtils.lerp(e.animParams.torso.rotation.x, 0, 10 * delta);
              if (e.animParams.head) e.animParams.head.rotation.x = THREE.MathUtils.lerp(e.animParams.head.rotation.x, 0, 10 * delta);
          }
          
          if (e.type === 'dummy') {
              if (e.damageTimer > 0) e.damageTimer -= delta;
              
              // Flash Red
              if (e.animParams && e.animParams.materials) {
                  e.animParams.materials.forEach((m:any) => m.emissive.setHex(e.damageTimer>0 ? 0x660000 : 0x000000));
              }
              
              return;
          }

          if (e.type === 'cocoon') {
              // Sacred cocoons are inanimate soul anchors: they have no limbs in animParams,
              // so the combat AI below would crash every frame it aggroed them. Keep them
              // stationary, just tick their damage flash timer.
              if (e.damageTimer > 0) e.damageTimer -= delta;
              return;
          }

          if (e.type === 'npc') {
              if (dToPlayer < nNearest) { nNearest = dToPlayer; s.nearestInteractableId = e.id; }
              
              if (e.actionTimer === undefined) { e.actionTimer = 0; e.actionState = 'bt_idle'; }
              if (e.actionTimer > 0) e.actionTimer -= delta;

              // Complex Behavior Tree Sequence Node Simulation
              if (e.btSequence === undefined) {
                  e.btSequence = ['bt_wait', 'bt_patrol', 'bt_wait', 'bt_look_left', 'bt_wait', 'bt_patrol', 'bt_look_right'];
                  e.btIndex = 0;
                  const base = e.group.position.clone();
                  e.patrolPoints = [
                      base.clone().add(new THREE.Vector3(5, 0, 5)),
                      base.clone().add(new THREE.Vector3(-5, 0, 5)),
                      base.clone().add(new THREE.Vector3(-5, 0, -5)),
                      base.clone().add(new THREE.Vector3(5, 0, -5))
                  ];
                  e.patrolIdx = 0;
              }
              if (e.actionTimer <= 0) {
                  e.actionState = e.btSequence[e.btIndex];
                  if (e.actionState === 'bt_wait') {
                      e.actionTimer = 2.0 + Math.random() * 2.0;
                  } else if (e.actionState === 'bt_look_left' || e.actionState === 'bt_look_right') {
                      e.actionTimer = 1.0 + Math.random() * 1.0;
                  } else if (e.actionState === 'bt_patrol') {
                      e.actionTimer = 6.0; // max patrol time
                  } else {
                      e.actionTimer = 1.0;
                  }
                  e.btIndex = (e.btIndex + 1) % e.btSequence.length;
              }

              if (e.animParams) {
                  const breath = Math.sin(time * 2) * 0.05;
                  e.animParams.torso.rotation.x = breath;
                  e.animParams.lArm.rotation.x = breath * 0.5;
                  e.animParams.rArm.rotation.x = breath * 0.5;
                  
                  if (e.actionState === 'bt_look_left') {
                      e.group.rotation.y = THREE.MathUtils.lerp(e.group.rotation.y, Math.PI + Math.PI/4, 2*delta);
                      e.animParams.head.rotation.y = THREE.MathUtils.lerp(e.animParams.head.rotation.y, Math.PI/4, 4*delta);
                      e.animParams.lLeg.rotation.x = 0;
                      e.animParams.rLeg.rotation.x = 0;
                  } else if (e.actionState === 'bt_look_right') {
                      e.group.rotation.y = THREE.MathUtils.lerp(e.group.rotation.y, Math.PI - Math.PI/4, 2*delta);
                      e.animParams.head.rotation.y = THREE.MathUtils.lerp(e.animParams.head.rotation.y, -Math.PI/4, 4*delta);
                      e.animParams.lLeg.rotation.x = 0;
                      e.animParams.rLeg.rotation.x = 0;
                  } else if (e.actionState === 'bt_patrol') {
                      const target = e.patrolPoints[e.patrolIdx];
                      const dToTarget = e.group.position.distanceTo(target);
                      if (dToTarget < 0.5) {
                          e.actionTimer = 0; // force sequence advance
                          e.patrolIdx = (e.patrolIdx + 1) % e.patrolPoints.length;
                          e.animParams.lLeg.rotation.x = 0;
                          e.animParams.rLeg.rotation.x = 0;
                      } else {
                          const pDir = target.clone().sub(e.group.position).normalize();
                          const targetY = Math.atan2(pDir.x, pDir.z);
                          let diff = targetY - e.group.rotation.y;
                          while (diff < -Math.PI) diff += Math.PI * 2;
                          while (diff > Math.PI) diff -= Math.PI * 2;
                          e.group.rotation.y += diff * 4 * delta;
                          
                          e.group.position.add(pDir.multiplyScalar(2.0 * delta));
                          
                          e.animParams.lLeg.rotation.x = Math.sin(time*10)*0.5;
                          e.animParams.rLeg.rotation.x = -Math.sin(time*10)*0.5;
                          e.animParams.head.rotation.y = THREE.MathUtils.lerp(e.animParams.head.rotation.y, 0, 4*delta);
                      }
                  } else {
                      const dir = s.position.clone().sub(e.group.position).normalize();
                      const targetY = Math.atan2(dir.x, dir.z);
                      
                      // normalize angles for smooth lerp
                      let diff = targetY - e.group.rotation.y;
                      while (diff < -Math.PI) diff += Math.PI * 2;
                      while (diff > Math.PI) diff -= Math.PI * 2;
                      
                      e.group.rotation.y += diff * 4 * delta;
                      e.animParams.head.rotation.y = THREE.MathUtils.lerp(e.animParams.head.rotation.y, 0, 4*delta);
                      e.animParams.lLeg.rotation.x = 0;
                      e.animParams.rLeg.rotation.x = 0;
                  }
                  e.animParams.head.rotation.x = -breath * 0.5;
              }
              return;
          }

          if (e.health <= 0) {
              e.active = false; scene.remove(e.group);
              return;
          }
          actEnemies++;
          if (e.damageTimer > 0) e.damageTimer -= delta;

          // AI Logic
          if (e.damageTimer <= 0) {
              const dir = s.position.clone().sub(e.group.position).normalize();
              
              if (e.type === 'boss') {
                  e.group.rotation.y = Math.atan2(dir.x, dir.z);
                  
                  if (e.actionTimer === undefined) { e.actionTimer = 0; e.actionState = 'idle'; }
                  if (e.actionTimer > 0) e.actionTimer -= delta;
                  
                  const isPhase2 = (e.health / (e.maxHealth || 1)) < 0.5;
                  
                  // BT Selector Node processing
                  if (e.actionTimer <= 0) {
                      // Proper Behavior Tree Selector Node implementation
                      const runSelectorNode = (nodes: {condition: () => boolean, action: string}[]) => {
                          for (const node of nodes) {
                              if (node.condition()) return node.action;
                          }
                          return 'idle';
                      };
                      
                      const dashProb = isPhase2 ? 0.15 : 0.05;
                      const projProb = isPhase2 ? 0.1 : 0.05;
                      
                      const newState = runSelectorNode([
                          { condition: () => dToPlayer > 15 && Math.random() < projProb, action: 'projectile' },
                          { condition: () => dToPlayer > 5 && dToPlayer <= 15 && Math.random() < dashProb, action: 'dash' },
                          { condition: () => true, action: 'idle' }
                      ]);
                      
                      if (newState !== e.actionState) {
                          e.actionState = newState;
                          if (newState === 'projectile') {
                              e.actionTimer = isPhase2 ? 0.6 : 1.0;
                              spawnParticles(e.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff0000, 15, 'blood');
                          } else if (newState === 'dash') {
                              e.actionTimer = isPhase2 ? 0.5 : 0.8;
                              const dSpd = isPhase2 ? 35.0 : 25.0;
                              e.velocity.x = dir.x * dSpd; e.velocity.z = dir.z * dSpd; // powerful dash
                              spawnParticles(e.group.position, 0xffff00, 20, 'wind');
                          }
                      }
                  }

                  // Execute current state logic (Action Nodes execution)
                  if (e.actionState === 'dash') {
                      e.animParams.lLeg.rotation.x = 0.5; e.animParams.rLeg.rotation.x = -0.5;
                      e.animParams.lArm.rotation.x = Math.PI; e.animParams.rArm.rotation.x = Math.PI;
                      if (e.actionTimer <= 0) e.actionState = 'idle';
                  } else if (e.actionState === 'projectile') {
                      e.velocity.x = 0; e.velocity.z = 0;
                      e.animParams.lArm.rotation.x -= (isPhase2 ? 15 : 10)*delta;
                      if (e.actionTimer <= 0) {
                          s.projectiles.push({
                              mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({color: isPhase2 ? 0xff0000 : 0x8800ff, wireframe: true})),
                              position: e.group.position.clone().add(new THREE.Vector3(0, 3, 0)),
                              velocity: dir.clone().multiplyScalar(isPhase2 ? 22 : 15),
                              life: 3.0,
                              radius: 1
                          });
                          scene.add(s.projectiles[s.projectiles.length-1].mesh);
                          e.actionState = 'idle';
                          e.actionTimer = isPhase2 ? 0.8 : 1.5; // cool down before next BT evaluation
                      }
                  } else {
                      // Active generic idle / following state
                      if (dToPlayer > 1.8 && dToPlayer < 40) {
                          const spd = isPhase2 ? 8.0 : 4.0;
                          e.velocity.x = dir.x * spd; e.velocity.z = dir.z * spd;
                          const aSpd = isPhase2 ? 16 : 10;
                          e.animParams.lLeg.rotation.x = Math.sin(time*aSpd)*0.6; e.animParams.rLeg.rotation.x = -Math.sin(time*aSpd)*0.6;
                          e.animParams.lArm.rotation.x = -Math.sin(time*aSpd)*0.4 + Math.PI/3; e.animParams.rArm.rotation.x = Math.sin(time*aSpd)*0.4 + Math.PI/3;
                      } else {
                          e.velocity.x = THREE.MathUtils.lerp(e.velocity.x, 0, 10*delta); e.velocity.z = THREE.MathUtils.lerp(e.velocity.z, 0, 10*delta);
                          e.animParams.lLeg.rotation.x = 0; e.animParams.rLeg.rotation.x = 0;
                      }
                  }
              } else {
                  // regular demon AI - aggression scaled by Demonic Rank
                  const aggroRadius = 30 + 10 * (e.rankMult || 1.0);
                  if (dToPlayer < aggroRadius) {
                      if (e.actionState !== 'combat') { e.actionState = 'combat'; e.combatMode = 'chase'; e.combatTimer = 0; }
                      if (e.combatTimer !== undefined) e.combatTimer -= delta;

                      if (e.combatTimer <= 0) {
                          const r = Math.random();
                          if (r < 0.3 && dToPlayer < 8) {
                              e.combatMode = 'evade';
                              e.combatTimer = 0.5 + Math.random() * 0.5;
                              e.evadeDir = (Math.random() < 0.5 ? 1 : -1);
                          } else if (r < 0.5 && dToPlayer > 4 && dToPlayer < 12) {
                              e.combatMode = 'dash_attack';
                              e.combatTimer = 0.6;
                              spawnParticles(e.group.position, 0xffaa00, 10, 'wind');
                          } else if (r < 0.6 && dToPlayer < 5) {
                              e.combatMode = 'wait';
                              e.combatTimer = 0.3 + Math.random() * 0.5;
                          } else {
                              e.combatMode = 'chase';
                              e.combatTimer = 1.0 + Math.random() * 1.5;
                          }
                      }

                      if (e.combatMode === 'chase' || e.combatMode === 'dash_attack') {
                          e.group.rotation.y = Math.atan2(dir.x, dir.z);
                          if (dToPlayer > 1.8) {
                              const spdMult = e.combatMode === 'dash_attack' ? 3.0 : 1.0;
                              const spd = (5.0 + 2.0 * (e.rankMult || 1.0)) * spdMult;
                              e.velocity.x = dir.x * spd; e.velocity.z = dir.z * spd;
                              
                              // Anim
                              e.animParams.lLeg.rotation.x = Math.sin(time*10*spdMult)*0.6; e.animParams.rLeg.rotation.x = -Math.sin(time*10*spdMult)*0.6;
                              e.animParams.lArm.rotation.x = -Math.sin(time*10*spdMult)*0.4 + Math.PI/3; e.animParams.rArm.rotation.x = Math.sin(time*10*spdMult)*0.4 + Math.PI/3;
                          } else {
                              e.velocity.x = THREE.MathUtils.lerp(e.velocity.x, 0, 10*delta); e.velocity.z = THREE.MathUtils.lerp(e.velocity.z, 0, 10*delta);
                              e.animParams.lLeg.rotation.x = 0; e.animParams.rLeg.rotation.x = 0;
                          }
                      } else if (e.combatMode === 'evade') {
                          const right = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(e.evadeDir);
                          const back = dir.clone().multiplyScalar(-0.5);
                          const evadeVec = right.add(back).normalize();
                          const spd = 12.0 + 3.0 * (e.rankMult || 1.0);
                          e.velocity.x = evadeVec.x * spd; e.velocity.z = evadeVec.z * spd;
                          e.group.rotation.y = Math.atan2(-evadeVec.x, -evadeVec.z); // look evasion dir

                          e.animParams.lLeg.rotation.x = Math.sin(time*15)*0.6; e.animParams.rLeg.rotation.x = -Math.sin(time*15)*0.6;
                      } else if (e.combatMode === 'wait') {
                          e.group.rotation.y = Math.atan2(dir.x, dir.z);
                          e.velocity.x = THREE.MathUtils.lerp(e.velocity.x, 0, 10*delta); e.velocity.z = THREE.MathUtils.lerp(e.velocity.z, 0, 10*delta);
                          e.animParams.lLeg.rotation.x = 0; e.animParams.rLeg.rotation.x = 0;
                      }
                  } else {
                      // Patrol Behavior Tree Node
                      if (e.actionState !== 'patrol') {
                          e.actionState = 'patrol';
                          if (!e.patrolPoints) {
                              const base = e.group.position.clone();
                              e.patrolPoints = [
                                  base.clone().add(new THREE.Vector3(10, 0, 10)),
                                  base.clone().add(new THREE.Vector3(-10, 0, 10)),
                                  base.clone().add(new THREE.Vector3(-10, 0, -10)),
                                  base.clone().add(new THREE.Vector3(10, 0, -10))
                              ];
                              e.patrolIdx = 0;
                              e.actionTimer = 0;
                          }
                      }
                      
                      const target = e.patrolPoints[e.patrolIdx];
                      const dToTarget = e.group.position.distanceTo(target);
                      
                      if (dToTarget < 1.0) {
                          if (e.actionTimer === undefined || e.actionTimer <= 0) {
                              e.actionTimer = 2.0 + Math.random() * 2.0;
                              e.velocity.x = 0; e.velocity.z = 0;
                              e.animParams.lLeg.rotation.x = 0; e.animParams.rLeg.rotation.x = 0;
                          } else {
                              e.actionTimer -= delta;
                              if (e.actionTimer <= 0) {
                                  e.patrolIdx = (e.patrolIdx + 1) % e.patrolPoints.length;
                              }
                          }
                      } else {
                          const pDir = target.clone().sub(e.group.position).normalize();
                          const targetY = Math.atan2(pDir.x, pDir.z);
                          let diff = targetY - e.group.rotation.y;
                          while (diff < -Math.PI) diff += Math.PI * 2;
                          while (diff > Math.PI) diff -= Math.PI * 2;
                          e.group.rotation.y += diff * 4 * delta;
                          
                          const walkSpd = 2.5;
                          e.velocity.x = Math.sin(e.group.rotation.y) * walkSpd; 
                          e.velocity.z = Math.cos(e.group.rotation.y) * walkSpd;
                          
                          e.animParams.lLeg.rotation.x = Math.sin(time*6)*0.4; e.animParams.rLeg.rotation.x = -Math.sin(time*6)*0.4;
                          e.animParams.lArm.rotation.x = -Math.sin(time*6)*0.2; e.animParams.rArm.rotation.x = Math.sin(time*6)*0.2;
                      }
                  }
              }
          } else {
              e.velocity.x = THREE.MathUtils.lerp(e.velocity.x, 0, 10*delta); e.velocity.z = THREE.MathUtils.lerp(e.velocity.z, 0, 10*delta);
              e.animParams.lLeg.rotation.x = 0; e.animParams.rLeg.rotation.x = 0;
          }

          // Damage Player
          if (dToPlayer <= 2.2 && s.invulnTimer <= 0 && e.damageTimer <= 0 && !isPaused) {
              const baseDamage = e.type==='boss'?40: Math.floor(15 * (e.rankMult || 1.0));
              if (s.isBlocking) {
                  const fwd = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), s.rotation);
                  const isFacingEnemy = fwd.dot(e.group.position.clone().sub(s.position).normalize()) > 0;
                  if (isFacingEnemy) {
                      if (s.blockTimer < 0.25) {
                          // Perfect Parry!
                          s.invulnTimer = 0.5;
                          s.hitStopTimer = 0.15;
                          s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.6);
                          e.damageTimer = 1.0; // Stun enemy
                          spawnParticles(s.position.clone().add(fwd), 0xffffff, 40, 'magic');
                          e.velocity.add(s.position.clone().sub(e.group.position).normalize().multiplyScalar(-20)); // Knock back enemy
                          // audioManager.playParry(); (omitted because there is no parry sound, we play slash instead or critique)
                          audioManager.playSlash();
                      } else {
                          // Regular block
                          s.health -= baseDamage * 0.2;
                          s.stamina -= 15;
                          s.invulnTimer = 0.5;
                          s.velocity.add(s.position.clone().sub(e.group.position).normalize().multiplyScalar(5));
                          spawnParticles(s.position.clone().add(fwd), 0xcccccc, 10, 'ash');
                          audioManager.playDamage();
                      }
                  } else {
                      s.health -= baseDamage; s.invulnTimer = 1.0;
                      s.velocity.add(s.position.clone().sub(e.group.position).normalize().multiplyScalar(15));
                      spawnParticles(s.position, 0xff0000, 20, 'blood');
                      audioManager.playDamage();
                      s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.8);
                      s.hitStopTimer = 0.1;
                  }
              } else {
                  s.health -= baseDamage; s.invulnTimer = 1.0;
                  s.velocity.add(s.position.clone().sub(e.group.position).normalize().multiplyScalar(15));
                  spawnParticles(s.position, 0xff0000, 20, 'blood');
                  audioManager.playDamage();
                  s.shakeTrauma = Math.min(1.0, s.shakeTrauma + 0.8);
                  s.hitStopTimer = 0.1;
              }
          }

          // Physics
          e.velocity.y -= GRAVITY * delta;
          const eMove = e.velocity.clone().multiplyScalar(delta);
          e.group.position.x += eMove.x; e.group.position.z += eMove.z; e.group.position.y += eMove.y;
          if (e.group.position.y <= 0) { e.group.position.y = 0; e.velocity.y = 0; }
          
          // Flash Red
          if (e.animParams && e.animParams.materials) {
              e.animParams.materials.forEach((m:any) => m.emissive.setHex(e.damageTimer>0 ? 0x660000 : 0x000000));
          }
      });
      s.nearestInteractableDist = nNearest;
      s.nextStageTrigger = (actEnemies === 0 && s.stage === 'village'); 

      // Projectiles Update
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
          const p = s.projectiles[i];
          p.life -= delta;
          p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
          p.mesh.rotation.y += 10*delta;
          
          if (p.mesh.position.distanceTo(s.position) < 2.5 && s.invulnTimer <= 0) {
              s.health -= 25; s.invulnTimer = 1.0;
              s.velocity.add(p.velocity.clone().normalize().multiplyScalar(10));
              spawnParticles(s.position, 0xff0000, 20, 'blood');
              p.life = -1; // destroy
          }
          
          if (p.life <= 0) {
              scene.remove(p.mesh);
              s.projectiles.splice(i, 1);
          }
      }

      // Leveling Up Check
      let lvlThreshold = s.level * 100;
      if (s.xp >= lvlThreshold) {
          s.level++; s.xp -= lvlThreshold; s.maxHealth += 20; s.maxStamina += 10; s.health = s.maxHealth; s.stamina = s.maxStamina;
          s.slashDamageMult = (s.slashDamageMult || 1.0) * 1.05; // 5% base attack increase per level
          if (s.rankIdx < RANKS.length-1) s.rankIdx++;
          audioManager.playLevelUp();
          spawnParticles(s.position, 0xffff00, 100, 'ash'); // level up burst
      }

      // Village Tips Accumulation
      if (s.stage === 'village' && s.activeDialog === null && s.activeTip === null && !isPaused && actEnemies === 0) {
          s.villageTimer += delta;
          if (s.villageTimer > 2 && s.stats.attacks > 0 && !s.tips.dash) {
              s.tips.dash = true;
              s.activeTip = { title: 'Evasive Dash', text: 'You can chain strikes with movement. Press K (or Dash button) to traverse quickly and evade impending attacks.' };
              setTipModal(s.activeTip);
          } else if (s.stats.dashes > 0 && !s.tips.water) {
              s.tips.water = true;
              s.activeTip = { title: 'Water Wheel', text: 'Concentrate your Spirit! Press O (or Skill 1). Costs 30 Spirit. A powerful area attack to strike multiple foes around you.' };
              setTipModal(s.activeTip);
          } else if (s.stats.water > 0 && !s.tips.fire) {
              s.tips.fire = true;
              s.activeTip = { title: 'Fire God', text: 'Unleash your true potential. Press L (or Skill 2). Costs 50 Spirit. A devastating vertical strike that cleaves through strong enemies.' };
              setTipModal(s.activeTip);
          }
      }

      // Progression Triggers
      if (s.stage === 'forest' && actEnemies === 0 && s.activeDialog === null) { setDialogId('forestWin'); setDialogLineIdx(0); }
      if (s.stage === 'boss' && actEnemies === 0 && s.activeDialog === null) { setDialogId('bossWin'); setDialogLineIdx(0); }
      if (s.health <= 0) { setGameState('gameover'); }

      // Update React HUD states periodically to save renders and prevent frame-level lags
      if (s.hudTimer === undefined) s.hudTimer = 0;
      s.hudTimer += delta;
      
      if (s.hudTimer > 0.16) {
         const hpDiff = Math.abs(s.health - s.lastSyncedHealth) > 0.5;
         const stDiff = Math.abs(s.stamina - s.lastSyncedStamina) > 0.5;
         const xpDiff = s.xp !== s.lastSyncedXp;
         const lvlDiff = s.level !== s.lastSyncedLevel;
         const enemiesDiff = actEnemies !== s.lastSyncedEnemiesLeft;
         const comboDiff = s.hitStreak !== s.lastSyncedComboCount;
         const monDiff = s.mon !== s.lastSyncedMon;
         
         if (hpDiff || stDiff || xpDiff || lvlDiff || enemiesDiff || comboDiff || monDiff) {
             setHealth(Math.max(0, s.health));
             setStamina(s.stamina);
             setXp(s.xp);
             setLevel(s.level);
             setRankIndex(s.rankIdx);
             setEnemiesLeft(actEnemies);
             setComboCount(s.hitStreak);
             setMon(s.mon);
             
             s.lastSyncedHealth = s.health;
             s.lastSyncedStamina = s.stamina;
             s.lastSyncedXp = s.xp;
             s.lastSyncedLevel = s.level;
             s.lastSyncedRankIdx = s.rankIdx;
             s.lastSyncedEnemiesLeft = actEnemies;
             s.lastSyncedComboCount = s.hitStreak;
             s.lastSyncedMon = s.mon;
         }
         
         // Sync Quests state under the single throttled schedule
         setQuests(prev => {
             let changed = false;
             const next = { ...prev };
             
             // Ramen
             if (next.merchant_ramen.current !== s.questsProgress.damageDealt) {
                 next.merchant_ramen.current = s.questsProgress.damageDealt;
                 if (next.merchant_ramen.status === 'active' && next.merchant_ramen.current >= next.merchant_ramen.target) {
                     next.merchant_ramen.status = 'claimable';
                 }
                 changed = true;
             }
             // Tea
             if (next.merchant_tea.current !== s.questsProgress.kills) {
                 next.merchant_tea.current = s.questsProgress.kills;
                 if (next.merchant_tea.status === 'active' && next.merchant_tea.current >= next.merchant_tea.target) {
                     next.merchant_tea.status = 'claimable';
                 }
                 changed = true;
             }
             // Forge
             if (next.merchant_forge.current !== s.questsProgress.skills) {
                 next.merchant_forge.current = s.questsProgress.skills;
                 if (next.merchant_forge.status === 'active' && next.merchant_forge.current >= next.merchant_forge.target) {
                     next.merchant_forge.status = 'claimable';
                 }
                 changed = true;
              }
              // Mask
              if (next.merchant_mask.current !== s.questsProgress.dashes) {
                  next.merchant_mask.current = s.questsProgress.dashes;
                  if (next.merchant_mask.status === 'active' && next.merchant_mask.current >= next.merchant_mask.target) {
                      next.merchant_mask.status = 'claimable';
                  }
                  changed = true;
              }
              // Sushi
              if (next.merchant_sushi.current !== s.questsProgress.maxCombo) {
                  next.merchant_sushi.current = s.questsProgress.maxCombo;
                  if (next.merchant_sushi.status === 'active' && next.merchant_sushi.current >= next.merchant_sushi.target) {
                      next.merchant_sushi.status = 'claimable';
                  }
                  changed = true;
              }
              // Umbrella
              if (next.merchant_umbrella.current !== s.questsProgress.blocks) {
                  next.merchant_umbrella.current = s.questsProgress.blocks;
                  if (next.merchant_umbrella.status === 'active' && next.merchant_umbrella.current >= next.merchant_umbrella.target) {
                      next.merchant_umbrella.status = 'claimable';
                  }
                  changed = true;
              }
              // Herbs
              const secondsElapsed = Math.floor(s.questsProgress.timeSpent || 0);
              if (next.merchant_herbs.current !== secondsElapsed) {
                  next.merchant_herbs.current = secondsElapsed;
                  if (next.merchant_herbs.status === 'active' && next.merchant_herbs.current >= next.merchant_herbs.target) {
                      next.merchant_herbs.status = 'claimable';
                  }
                  changed = true;
              }
              // Sake
              if (next.merchant_sake.current !== s.questsProgress.kills) {
                  next.merchant_sake.current = s.questsProgress.kills;
                  if (next.merchant_sake.status === 'active' && next.merchant_sake.current >= next.merchant_sake.target) {
                      next.merchant_sake.status = 'claimable';
                  }
                  changed = true;
              }
              return changed ? next : prev;
         });
         
         // Sync Stage state to React
         if (s.stage !== currentStage) {
             setCurrentStage(s.stage as any);
         }
         
         // Sync Player position & orientation
         setPlayerPos({
             x: s.position.x,
             z: s.position.z,
             rot: s.rotation
         });

         // Sync Dummy Hits
         if (s.dummyHits !== undefined) {
            setDummyHits(s.dummyHits);
         }

         // Sync Map Entities
         if (s.enemies) {
             const items = s.enemies
                 .filter(e => e.active)
                 .map(e => ({
                     id: e.id,
                     type: e.type,
                     x: e.group ? e.group.position.x : 0,
                     z: e.group ? e.group.position.z : 0,
                     health: e.health,
                     maxHealth: e.maxHealth
                 }));
                 
             // Add fixed shops/stalls to map
             if (s.shops) {
                 s.shops.forEach((shop: any) => {
                     items.push({
                         id: shop.id,
                         type: 'shop',
                         x: shop.x,
                         z: shop.z,
                         health: 1,
                         maxHealth: 1
                     });
                 });
             }
             
             setMapEntities(items);
         }
         
         s.hudTimer = 0;
      }

      // Auto-save logic incorporating all user progression states and upgrades
      s.saveTimer += delta;
      if (s.saveTimer > 2.0 && gameState === 'playing' && s.health > 0) { // save every 2 seconds
          s.saveTimer = 0;
          try {
              localStorage.setItem('cm_savegame', obfuscateData({
                  stage: s.stage,
                  health: s.health,
                  maxHealth: s.maxHealth,
                  stamina: s.stamina,
                  maxStamina: s.maxStamina,
                  xp: s.xp,
                  level: s.level,
                  rankIdx: s.rankIdx,
                  stats: s.stats,
                  tips: s.tips,
                  mon: s.mon,
                  slashDamageMult: s.slashDamageMult,
                  critDamageMult: s.critDamageMult,
                  umbrellaGetaActive: s.umbrellaGetaActive,
                  sushiNigiriActive: s.sushiNigiriActive,
                  moonpetalHealActive: s.moonpetalHealActive,
                  spiritFocusMult: s.spiritFocusMult,
                  swordRefinements: s.swordRefinements,
                  acceptedQuests: Array.from(acceptedQuests),
                  hideMainQuests: hideMainQuests,
                  showQuestTracker: showQuestTracker,
                  openMapLabels: openMapLabels,
                  questsProgress: s.questsProgress,
              dummyHits: s.dummyHits || 0
              }));
          } catch(e) {}
      }

      // Dynamic night-time demon spawning!
      if (s.stage === 'forest' && !isPaused && s.health > 0) {
          const isNight = s.envTime >= 19.5 || s.envTime < 4.5;
          const maxAllowed = isNight ? 18 : 10;
          const aliveDemons = s.enemies ? s.enemies.filter(e => e.active && e.type === 'demon').length : 0;
          
          if (aliveDemons < maxAllowed && Math.random() < (isNight ? 0.08 : 0.02) * delta) {
               // Spawn a new demon!
               const demonTypeRand = Math.random();
               let typeStr = 'normal';
               // Considerably more frequent silk spawns and greater spawns in night darkness!
               if (isNight) {
                   if (demonTypeRand > 0.4) typeStr = 'silk_spawn'; 
                   if (demonTypeRand > 0.8) typeStr = 'greater_spawn';    
               } else {
                   if (demonTypeRand > 0.85) typeStr = 'silk_spawn';
                   if (demonTypeRand > 0.95) typeStr = 'greater_spawn';
               }
               
               const e = buildEnemy(typeStr);
               const angle = Math.random() * Math.PI * 2;
               const dist = 30 + Math.random() * 40;
               const spawnX = s.position.x + Math.cos(angle) * dist;
               const spawnZ = s.position.z + Math.sin(angle) * dist;
               
               // Constrain coordinates bounds of Bamboo Forest
               const boundedX = THREE.MathUtils.clamp(spawnX, -85, 85);
               const boundedZ = THREE.MathUtils.clamp(spawnZ, -85, 85);
               
               e.group.position.set(boundedX, 0, boundedZ);
               
               const ranks = ['Low', 'Mid', 'High'];
               const rankIdx = (typeStr === 'greater_spawn' ? 2 : (typeStr === 'silk_spawn' ? 1 : 0));
               const rankStr = ranks[rankIdx];
               const nightMult = isNight ? 1.4 : 1.0;
               const rankMult = (1.0 + (rankIdx * 1.5)) * nightMult;
               
               e.group.scale.set(1 + rankIdx*0.1, 1 + rankIdx*0.1, 1 + rankIdx*0.1);
               environmentGrp.add(e.group);
               
               const newId = `demon_dynamic_${Date.now()}_${Math.floor(Math.random()*1000)}`;
               s.enemies.push({ 
                   id: newId, 
                   group: e.group, 
                   type: 'demon', 
                   demonicRank: rankStr, 
                   rankMult: rankMult,
                   active: true, 
                   health: 150 * rankMult, 
                   maxHealth: 150 * rankMult, 
                   velocity: new THREE.Vector3(), 
                   box: new THREE.Box3(), 
                   animParams: e, 
                   damageTimer: 0 
               });
               
               // Spark dark smoky mist particles to announce portal birth of demon!
               spawnParticles(new THREE.Vector3(boundedX, 1, boundedZ), 0x990022, 15, 'wind');
          }
      }

      // Particles Update
      let pIdx = 0;
      for (let i = particlesList.length - 1; i >= 0; i--) {
          const p = particlesList[i];
          p.life -= delta * p.decay;
          if (p.life <= 0) { particlesList.splice(i, 1); continue; }
          
          if (p.type === 'blood' && p.pos.y <= 0) {
              p.vel.set(0, 0, 0); // splat
              p.decay = 0.5; // linger longer on the ground
          } else {
              if (p.type === 'water') {
                  // Helical spiraling wave vortex motion
                  const swirlSpeed = 16.0;
                  const r = 0.06 * (1.0 - p.life);
                  p.pos.x += Math.sin(p.life * swirlSpeed + i) * r;
                  p.pos.z += Math.cos(p.life * swirlSpeed + i) * r;
              } else if (p.type === 'fire') {
                  // Rising turbulent heat ember movement
                  p.vel.y += 18.0 * delta; 
                  p.vel.x += (Math.random() - 0.5) * 3.5 * delta;
                  p.vel.z += (Math.random() - 0.5) * 3.5 * delta;
                  
                  // Dynamic color degradation from yellow-hot to deep ember red
                  p.color.g = Math.max(0.0, p.life * 0.95 - 0.05);
                  p.color.b = Math.max(0.0, p.life * 0.6 - 0.25);
              } else if (p.type === 'thunder') {
                  // Sharp lightning bolt branching electrostatic jitter
                  const jitter = 0.16 * p.life;
                  p.pos.x += (Math.random() - 0.5) * jitter;
                  p.pos.y += (Math.random() - 0.5) * jitter;
                  p.pos.z += (Math.random() - 0.5) * jitter;
                  p.vel.multiplyScalar(0.85); // Rapid speed decay representing a sudden bright flash
              }
              
              p.pos.add(p.vel.clone().multiplyScalar(delta));
              if (p.type !== 'fire' && p.type !== 'thunder') p.vel.y -= GRAVITY * 0.4 * delta;
              if (p.pos.y < 0.1) {
                  p.pos.y = 0.1;
                  if (p.type === 'blood') {
                      p.vel.set(0,0,0);
                      p.decay = 0.2; // linger heavily
                  }
              }
          }

          pPos[pIdx*3] = p.pos.x; pPos[pIdx*3+1] = p.pos.y; pPos[pIdx*3+2] = p.pos.z;
          pCol[pIdx*3] = p.color.r * p.life; pCol[pIdx*3+1] = p.color.g * p.life; pCol[pIdx*3+2] = p.color.b * p.life;
          pSizes[pIdx] = p.size * p.life;
          pIdx++;
      }
      
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      pGeom.setDrawRange(0, pIdx);
      
      // Update Ghost Trails
      let ghostCount = 0;
      for (let i = s.ghostTrails.length - 1; i >= 0; i--) {
          const gt = s.ghostTrails[i];
          gt.life -= delta * 3.0; // Fade out quickly
          if (gt.life <= 0) {
              s.ghostTrails.splice(i, 1);
              continue;
          }
          if (ghostCount < 20) {
              ghostMat4.makeRotationY(gt.rot);
              ghostMat4.setPosition(gt.pos.x, gt.pos.y + 1, gt.pos.z);
              ghostInstanced.setMatrixAt(ghostCount, ghostMat4);
              ghostInstanced.setColorAt(ghostCount, tempColor.copy(ghostSharedColor).multiplyScalar(gt.life));
              ghostCount++;
          }
      }
      ghostInstanced.count = ghostCount;
      if (ghostCount > 0) {
          ghostInstanced.instanceMatrix.needsUpdate = true;
          if (ghostInstanced.instanceColor) ghostInstanced.instanceColor.needsUpdate = true;
      }
      
      // Weather Update
      const stage = s.stage;
      if (stage === 'village' || stage === 'forest' || stage === 'cave' || stage === 'peak' || stage === 'boss') {
          weatherSystem.visible = true;
          // Leaves in village, Rain in forest, Ash/Embers in boss, Venom in cave, Snow in peak
          if (stage === 'village') {
              wMat.uniforms.uColor.value.setHex(0xffbbee); // Sakura petals
              wMat.uniforms.uSize.value = 16.0;
              wMat.uniforms.uIsRain.value = 0.0;
          } else if (stage === 'forest') {
              wMat.uniforms.uColor.value.setHex(0xaaaaee);
              wMat.uniforms.uSize.value = 20.0;
              wMat.uniforms.uIsRain.value = 1.0;
          } else if (stage === 'cave') {
              wMat.uniforms.uColor.value.setHex(0xaa22ff); // Venom drips
              wMat.uniforms.uSize.value = 24.0;
              wMat.uniforms.uIsRain.value = 1.0;
          } else if (stage === 'peak') {
              wMat.uniforms.uColor.value.setHex(0xffffff); // Snow
              wMat.uniforms.uSize.value = 18.0;
              wMat.uniforms.uIsRain.value = 0.0;
          } else {
              wMat.uniforms.uColor.value.setHex(0xff4422);
              wMat.uniforms.uSize.value = 12.0;
              wMat.uniforms.uIsRain.value = 0.0;
          }
          
          for (let i = 0; i < wCount; i++) {
              let px = wPos[i * 3];
              let py = wPos[i * 3 + 1];
              let pz = wPos[i * 3 + 2];
              
              let phase = wVel[i * 3];
              let speed = wVel[i * 3 + 1];
              let wSpeed = wVel[i * 3 + 2];
              
              phase += wSpeed * delta;
              wVel[i * 3] = phase;
              
              let fallDir = 1.0;
              let fallSpeed = speed;
              if (stage === 'boss') { fallDir = -0.5; fallSpeed = speed; }
              else if (stage === 'forest' || stage === 'cave') { fallDir = 1.0; fallSpeed = 12.0; }
              else if (stage === 'peak') { fallDir = 1.0; fallSpeed = 3.0; } // slow fall for snow
              
              py -= fallSpeed * delta * fallDir; 
              px += Math.sin(phase) * delta * (stage === 'forest' || stage === 'peak' ? 0.5 : 2.0); 
              pz += Math.cos(phase) * delta * (stage === 'forest' || stage === 'peak' ? 0.5 : 2.0);
              
              if (py < 0 && stage !== 'boss') {
                  py = 50 + Math.random() * 10; px = s.position.x + (Math.random() - 0.5) * 80; pz = s.position.z + (Math.random() - 0.5) * 80;
              } else if (py > 50 && stage === 'boss') {
                  py = 0; px = s.position.x + (Math.random() - 0.5) * 80; pz = s.position.z + (Math.random() - 0.5) * 80;
              }
              
              // Wrap around camera loosely
              if (Math.abs(px - s.position.x) > 60) px = s.position.x - Math.sign(px - s.position.x) * 50;
              if (Math.abs(pz - s.position.z) > 60) pz = s.position.z - Math.sign(pz - s.position.z) * 50;
              
              wPos[i * 3] = px; wPos[i * 3 + 1] = py; wPos[i * 3 + 2] = pz;
          }
          wGeom.attributes.position.needsUpdate = true;
      } else {
          weatherSystem.visible = false;
      }

      playerObj.group.visible = (s.invulnTimer <= 0) || Math.floor(timeNow / 100) % 2 === 0;

      // Camera Controller
      const tCamPos = s.position.clone().add(new THREE.Vector3(0, 10, 16));
      if (s.attackType === 'fire' && s.isAttacking) tCamPos.z += 5; // zoom out for big skill
      
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (s.shakeTrauma > 0) {
          const shake = s.shakeTrauma * s.shakeTrauma;
          shakeOffsetX = (Math.random() - 0.5) * shake * 2.0;
          shakeOffsetY = (Math.random() - 0.5) * shake * 2.0;
          s.shakeTrauma = Math.max(0, s.shakeTrauma - (delta > 0 ? delta : 0.016));
      }
      tCamPos.add(new THREE.Vector3(shakeOffsetX, shakeOffsetY, 0));

      // Camera obstruction clamp (gameplay only): never let a building, stall or
      // tree sit between the player and the follow camera. The fixed (0,10,16)
      // offset could come to rest inside a roof/wall and render a full black
      // screen until reload. Sample the player-head -> camera segment against
      // the world colliders and pull the camera in front of the first hit.
      if (!s.activeCutscene) {
          const headPos = new THREE.Vector3(s.position.x, s.position.y + 2.0, s.position.z);
          const camSeg = tCamPos.clone().sub(headPos);
          const camBox = new THREE.Box3();
          const CAM_CLR = 0.8;
          const camPointBlocked = (px: number, py: number, pz: number) => {
              camBox.set(new THREE.Vector3(px - CAM_CLR, py - CAM_CLR, pz - CAM_CLR), new THREE.Vector3(px + CAM_CLR, py + CAM_CLR, pz + CAM_CLR));
              return colliders.some(c => camBox.intersectsBox(c.box));
          };
          let hitT = -1;
          for (let t = 0.3; t <= 1.0001; t += 0.05) {
              if (camPointBlocked(headPos.x + camSeg.x * t, headPos.y + camSeg.y * t, headPos.z + camSeg.z * t)) { hitT = t; break; }
          }
          if (hitT > 0) {
              const useT = Math.max(0.18, hitT - 0.08);
              tCamPos.copy(headPos).addScaledVector(camSeg, useT);
          }
      }

      let tLook = s.position.clone().add(new THREE.Vector3(0, 2, 0));
      tLook.add(new THREE.Vector3(shakeOffsetX, shakeOffsetY, 0));

      if (s.activeCutscene) {
          const cutsceneId = s.activeCutscene;
          const idx = s.cutsceneStepIdx || 0;
          if (cutsceneId === 'intro') {
              if (idx === 0) {
                  tCamPos.set(12, 35, 45); tLook.set(50, 45, -20);
              } else if (idx === 1) {
                  tCamPos.set(4, 5, -12); tLook.set(0, 1.6, -21);
              } else if (idx === 2) {
                  tCamPos.set(13, 4, 11); tLook.set(8, 1.8, 5);
              } else if (idx === 3) {
                  tCamPos.set(0, 5, 30); tLook.copy(s.position).add(new THREE.Vector3(0, 1.5, 0));
              }
          } else if (cutsceneId === 'forestEntrance') {
              if (idx === 0) {
                  tCamPos.set(0, 6, 44); tLook.set(0, 2, 35);
              } else if (idx === 1) {
                  tCamPos.set(0, 18, 55); tLook.set(0, 4, 85);
              } else if (idx === 2) {
                  tCamPos.copy(s.position).add(new THREE.Vector3(-4, 3, 5)); tLook.copy(s.position).add(new THREE.Vector3(0, 1.2, -2));
              }
          } else if (cutsceneId === 'caveEntrance') {
              if (idx === 0) {
                  tCamPos.set(0, 4, -40); tLook.set(0, 1, -60);
              } else if (idx === 1) {
                  tCamPos.set(10, 8, -50); tLook.set(0, 2, -70);
              }
          } else if (cutsceneId === 'peakEntrance') {
              if (idx === 0) {
                  tCamPos.set(0, 25, 100); tLook.set(0, 30, -50);
              } else if (idx === 1) {
                  tCamPos.set(0, 5, 20); tLook.copy(s.position).add(new THREE.Vector3(0, 2, 0));
              }
          } else if (cutsceneId === 'bossArrival') {
              if (idx === 0) {
                  tCamPos.set(0, 18, -48); tLook.set(0, 6, -20);
              } else if (idx === 1) {
                  tCamPos.set(-6, 3, -28); tLook.set(0, 1.6, -20);
              } else if (idx === 2) {
                  tCamPos.copy(s.position).add(new THREE.Vector3(0, 3, 7)); tLook.copy(s.position).add(new THREE.Vector3(0, 1.2, -3));
              }
          }
      }

      camera.position.lerp(tCamPos, 6.0 * (delta > 0 ? delta : 0.016));

      // Hard post-lerp constraint: the lerp path itself can sweep the camera
      // through geometry (fast target jumps after attack lunges), and a target-
      // only clamp cannot pull an already-buried camera out. If the ACTUAL
      // camera position is inside a collider, snap it along the head->camera
      // segment to the last clear point immediately (no smoothing inside walls).
      if (!s.activeCutscene) {
          const headNow = new THREE.Vector3(s.position.x, s.position.y + 2.0, s.position.z);
          const segNow = camera.position.clone().sub(headNow);
          const segLen = segNow.length();
          if (segLen > 0.001) {
              const boxNow = new THREE.Box3();
              const CLR2 = 0.8;
              const blockedNow = (px: number, py: number, pz: number) => {
                  boxNow.set(new THREE.Vector3(px - CLR2, py - CLR2, pz - CLR2), new THREE.Vector3(px + CLR2, py + CLR2, pz + CLR2));
                  return colliders.some(c => boxNow.intersectsBox(c.box));
              };
              if (blockedNow(camera.position.x, camera.position.y, camera.position.z)) {
                  let clearT = 0.15;
                  for (let t = 0.15; t <= 1.0001; t += 0.05) {
                      if (blockedNow(headNow.x + segNow.x * t, headNow.y + segNow.y * t, headNow.z + segNow.z * t)) break;
                      clearT = t;
                  }
                  camera.position.copy(headNow).addScaledVector(segNow, Math.max(0.12, clearT - 0.05));
              }
          }
      }
      
      // Breathtakingly smooth camera look rotation using our lerp target ref
      if (cameraLookTargetRef.current.lengthSq() === 0) {
          cameraLookTargetRef.current.copy(tLook);
      } else {
          cameraLookTargetRef.current.lerp(tLook, 8.0 * (delta > 0 ? delta : 0.016));
      }
      camera.lookAt(cameraLookTargetRef.current);

      // FOV Kick Effect
      let targetFov = 60;
      if (s.isAttacking && (s.attackType === 'fire' || s.attackType === 'water')) {
          if (s.attackTimer < 0.1) {
              targetFov = 90; // sudden wide kick outward
          } else {
              targetFov = 50; // sharp zoom in
          }
      } else if (s.isDashing) {
          targetFov = 75; // zoom out on dash
      } else if (s.hitStopTimer > 0) {
          targetFov = 50; // zoom in on hit
      }
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 12.0 * delta);
      camera.updateProjectionMatrix();

      // Dynamic Environment (Time of Day & Weather)
      // Advance time slowly if playing
      if (!isPaused && actEnemies > 0) {
          s.envTime = (s.envTime + (delta / 60) * 12) % 24; // 12 hours every 60 seconds of battle (fast cycle for experience)
      }

      const getSkyColor = (t: number) => {
          if (t >= 0 && t < 4) return new THREE.Color(0x02030c); // creepy starry midnight
          if (t >= 4 && t < 7) return new THREE.Color(0x02030c).lerp(new THREE.Color(0xd15d1f), (t-4)/3); // sunrise to soft ochre amber
          if (t >= 7 && t < 15) return new THREE.Color(0xd15d1f).lerp(new THREE.Color(0x5a8fcb), (t-7)/8); // warm daily sky
          if (t >= 15 && t < 19.5) return new THREE.Color(0x5a8fcb).lerp(new THREE.Color(0xba4513), (t-15)/4.5); // vibrant ochre dusk sunset
          if (t >= 19.5 && t <= 24) return new THREE.Color(0xba4513).lerp(new THREE.Color(0x02030c), (t-19.5)/4.5); // evening transition
          return new THREE.Color(0x02030c);
      };
      
      const getDirColor = (t: number) => {
          if (t < 4 || t > 19.5) return new THREE.Color(0x4a65a0); // pale moon
          if (t >= 4 && t < 7) return new THREE.Color(0xffaa44);
          if (t >= 7 && t <= 15) return new THREE.Color(0xfffdf0);
          if (t > 15 && t <= 19.5) return new THREE.Color(0xff5500); // fiery orange sunset
          return new THREE.Color(0xffeedd);
      };
      
      if (s.stage !== 'boss') { // Boss has its own fixed sinister lighting
          const skyC = getSkyColor(s.envTime);
          const dirC = getDirColor(s.envTime);
          scene.background = skyC;
          if (scene.fog) scene.fog.color.copy(skyC);
          
          const ambL = lightsGrp.getObjectByName('ambLight') as THREE.AmbientLight;
          if (ambL) ambL.color.copy(skyC).multiplyScalar(0.7);
          
          const dirL = lightsGrp.getObjectByName('dirLight') as THREE.DirectionalLight;
          if (dirL) {
              dirL.color.copy(dirC);
              // move sun around
              const angle = (s.envTime / 24) * Math.PI * 2 - Math.PI/2; 
              // Math.sin(angle) > 0 means sun is in sky
              dirL.position.set(Math.cos(angle)*100, Math.sin(angle)*100 + 20, -20);
          }
          
          const currentNight = s.envTime >= 19.5 || s.envTime < 4.5;
          const currentSunset = s.envTime >= 16.5 && s.envTime < 19.5;

          if (s.envWeather === 'rain') {
              if (scene.fog) (scene.fog as THREE.FogExp2).density = 0.036;
              if (dirL) dirL.intensity = 0.4;
              if (ambL) ambL.intensity = 0.6;
          } else if (s.envWeather === 'snow') {
              if (scene.fog) { (scene.fog as THREE.FogExp2).density = 0.042; scene.fog.color.setHex(0xeef5ff); scene.background = new THREE.Color(0xaaaaaa); }
              if (dirL) dirL.intensity = 0.6;
              if (ambL) ambL.intensity = 0.8;
          } else {
              let targetFog = s.stage === 'village' ? 0.016 : 0.01;
              let targetDirInt = 2.0;
              let targetAmbInt = 1.0;
              if (currentNight) {
                  targetFog = 0.036; // creepy night fog, capped so the world never washes out on small screens
                  targetDirInt = 0.18; // moonlight
                  targetAmbInt = 0.22;
              } else if (currentSunset) {
                  targetFog = 0.026; // sunset mist
                  targetDirInt = 1.15;
                  targetAmbInt = 0.75;
              }
              if (scene.fog) (scene.fog as THREE.FogExp2).density = targetFog;
              if (dirL) dirL.intensity = targetDirInt;
              if (ambL) {
                  ambL.intensity = targetAmbInt;
                  if (currentNight) {
                      ambL.color.setHex(0x101530); // indigo moon tint
                  } else if (currentSunset) {
                      ambL.color.setHex(0x3e2025); // sunset rose/ochre tint
                  } else {
                      ambL.color.copy(skyC).multiplyScalar(0.75);
                  }
              }
          }
      }

      // Dynamic Bloom based on Spirit (stamina)
      const staminaRatio = Math.max(0, s.stamina / s.maxStamina);
      const pulseRate = 3.0 + staminaRatio * 15.0; 
      const pulse = Math.sin(timeNow / 1000 * pulseRate) * 0.5 + 0.5;
      const targetBloomStrength = 0.5 + (staminaRatio * 2.5) + (pulse * staminaRatio * 1.5);
      bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, targetBloomStrength, delta * 3.0);

      composer.render();
    };
    
    animId = requestAnimationFrame(gameLoop);
    return () => { 
      cancelAnimationFrame(animId); 
      window.removeEventListener('resize', handleResize); 
      window.removeEventListener('keydown', kd); 
      window.removeEventListener('keyup', ku); 
      scene.traverse((object: any) => {
          if (object.isMesh) {
              if (object.geometry) object.geometry.dispose();
              if (object.material) {
                  if (Array.isArray(object.material)) {
                      object.material.forEach((mat: any) => mat.dispose());
                  } else {
                      object.material.dispose();
                  }
              }
          }
      });
      scene.clear(); 
      renderer.dispose(); 
      if (gameState !== 'playing') {
          audioManager.setMusicTheme('none');
          audioManager.setAmbient('none');
      }
    };
  }, [gameState]); // React to massive state restarts if needed, but we keep it inside playing

  // Handlers for UI Buttons
  const handleRespawn = () => {
      const s = stateRef.current;
      
      const penalty = s.mon >= 5 ? 5 : s.mon;
      s.mon = Math.max(0, s.mon - penalty);
      setMon(s.mon);
      s.lastSyncedMon = s.mon;

      s.health = s.maxHealth;
      setHealth(s.health);
      s.lastSyncedHealth = s.health;

      s.stamina = s.maxStamina;
      setStamina(s.stamina);
      s.lastSyncedStamina = s.stamina;

      s.stage = 'village';

      try {
          localStorage.setItem('cm_savegame', obfuscateData({
              stage: s.stage,
              health: s.health,
              maxHealth: s.maxHealth,
              stamina: s.stamina,
              maxStamina: s.maxStamina,
              xp: s.xp,
              level: s.level,
              rankIdx: s.rankIdx,
              stats: s.stats,
              tips: s.tips,
              mon: s.mon,
              slashDamageMult: s.slashDamageMult,
              critDamageMult: s.critDamageMult,
              umbrellaGetaActive: s.umbrellaGetaActive,
              sushiNigiriActive: s.sushiNigiriActive,
              moonpetalHealActive: s.moonpetalHealActive,
              spiritFocusMult: s.spiritFocusMult,
              swordRefinements: s.swordRefinements,
              acceptedQuests: Array.from(acceptedQuests),
              hideMainQuests: hideMainQuests,
              showQuestTracker: showQuestTracker,
              openMapLabels: openMapLabels,
              questsProgress: s.questsProgress,
          dummyHits: s.dummyHits || 0
          }));
      } catch(e) {}

      setGameState('playing');
  };

  const hasSave = !!localStorage.getItem('cm_savegame');

  const startGame = (isNewGame: boolean) => {
      audioManager.init();
      const s = stateRef.current;
      
      if (!isNewGame && hasSave) {
          try {
              const data = deobfuscateData(localStorage.getItem('cm_savegame') || '{}');
              s.stage = data.stage || 'village';
              s.health = data.health || 150;
              s.maxHealth = data.maxHealth || 150;
              s.stamina = data.stamina || 100;
              s.maxStamina = data.maxStamina || 100;
              s.xp = data.xp || 0;
              s.level = data.level || 1;
              s.rankIdx = data.rankIdx || 0;
              if (data.stats) s.stats = data.stats;
              if (data.tips) s.tips = data.tips;
              s.dummyHits = data.dummyHits || 0;
              
              // Load saved achievements and purchases
              s.mon = data.mon !== undefined ? data.mon : 50;
              s.slashDamageMult = data.slashDamageMult || 1.0;
              s.critDamageMult = data.critDamageMult || 2.0;
              s.umbrellaGetaActive = !!data.umbrellaGetaActive;
              s.sushiNigiriActive = !!data.sushiNigiriActive;
              s.moonpetalHealActive = !!data.moonpetalHealActive;
              s.spiritFocusMult = data.spiritFocusMult || 1.0;
              s.swordRefinements = data.swordRefinements !== undefined ? data.swordRefinements : 0;
              s.questsProgress = data.questsProgress || { damageDealt: 0, kills: 0, skills: 0, dashes: 0, maxCombo: 0, blocks: 0, timeSpent: 0 };
              
              // Seed synchronization baselines correctly to match loaded values
              s.lastSyncedHealth = s.health;
              s.lastSyncedStamina = s.stamina;
              s.lastSyncedXp = s.xp;
              s.lastSyncedLevel = s.level;
              s.lastSyncedRankIdx = s.rankIdx;
              s.lastSyncedMon = s.mon;
              s.lastSyncedComboCount = 0;
              s.lastSyncedEnemiesLeft = 0;

              setHealth(s.health);
              setStamina(s.stamina);
              setXp(s.xp);
              setLevel(s.level);
              setRankIndex(s.rankIdx);
              setMon(s.mon);
              if (data.acceptedQuests) setAcceptedQuests(data.acceptedQuests);
              if (data.hideMainQuests !== undefined) setHideMainQuests(data.hideMainQuests);
              if (data.showQuestTracker !== undefined) setShowQuestTracker(data.showQuestTracker);
              if (data.openMapLabels !== undefined) setOpenMapLabels(data.openMapLabels);
          } catch(e) {
              s.health = s.maxHealth;
              s.stage = 'village';
          }
      } else {
          s.stage = 'village';
          s.health = 150;
          s.maxHealth = 150;
          s.stamina = 100;
          s.maxStamina = 100;
          s.xp = 0;
          s.level = 1;
          s.rankIdx = 0;
          s.stats = { attacks: 0, dashes: 0, water: 0 };
          s.tips = { dash: false, water: false, fire: false };
          s.dummyHits = 0;
          s.enemies = [];
          
          s.mon = 50;
          s.slashDamageMult = 1.0;
          s.critDamageMult = 2.0;
          s.umbrellaGetaActive = false;
          s.sushiNigiriActive = false;
          s.moonpetalHealActive = false;
          s.spiritFocusMult = 1.0;
          s.swordRefinements = 0;

          s.lastSyncedHealth = 150;
          s.lastSyncedStamina = 100;
          s.lastSyncedXp = 0;
          s.lastSyncedLevel = 1;
          s.lastSyncedRankIdx = 0;
          s.lastSyncedMon = 50;
          s.lastSyncedComboCount = 0;
          s.lastSyncedEnemiesLeft = 0;

          setHealth(150);
          setStamina(100);
          setXp(0);
          setLevel(1);
          setRankIndex(0);
          setMon(50);
          localStorage.removeItem('cm_savegame');
      }
      
      setGameState('playing');
      if (isNewGame) {
          setCutsceneId('intro');
          setCutsceneLineIdx(0);
      }
  };

  const advanceDialog = () => {
      const isWarden = dialogId ? dialogId.toLowerCase().includes('warden') : false;
      const defaultSpeaker = isWarden ? 'Order Warden' : 'Villager';
      const defaultText = isWarden 
        ? 'Maintain full moon focus! Forest demons have been very active lately.' 
        : 'Thank goodness we have the Moonflow Order protecting our humble village!';
      const defaultMood = isWarden ? 'urgent' : 'calm';

      const diagArr = DIALOGUES[dialogId!] || [
          { speaker: defaultSpeaker, text: defaultText, mood: defaultMood }
      ];
      
      const hasChoices = dialogId ? DIALOGUE_CHOICES[dialogId] : null;

      const curText = selectedChoiceReply ?? (diagArr[dialogLineIdx]?.text || '');
      if (dialogChars < curText.length) { setDialogChars(curText.length); return; }

      if (dialogLineIdx >= diagArr.length - 1) {
          if (hasChoices && selectedChoiceReply === null) {
              // Wait for user to select a choice
              return;
          }
          if (hasChoices && selectedChoiceReply !== null) {
              setSelectedChoiceReply(null);
          }

          // Finish Dialog Logic
          const finishedId = dialogId;
          setDialogId(null);
          if (finishedId === 'villageIntro') {
             setCutsceneId('forestEntrance');
             setCutsceneLineIdx(0);
          } else if (finishedId === 'forestWin') {
             setCutsceneId('caveEntrance');
             setCutsceneLineIdx(0);
          } else if (finishedId === 'caveWin') {
             setCutsceneId('peakEntrance');
             setCutsceneLineIdx(0);
          } else if (finishedId === 'bossWin') {
             setGameState('victory');
          }
      } else {
          setDialogLineIdx(prev => prev + 1);
      }
  };

  const handleQuestAction = (questId: string) => {
      const s = stateRef.current;
      const targetQuest = (quests as any)[questId];
      if (!targetQuest) return;

      if (targetQuest.status === 'available') {
          setQuests(prev => ({
              ...prev,
              [questId]: { ...prev[questId], status: 'active' }
          }));
          setAcceptedQuests(prev => Array.from(new Set([...prev, questId])));
          audioManager.playSlash();
      } else if (targetQuest.status === 'claimable') {
          // claim rewards!
          s.mon += targetQuest.rewardMon;
          s.xp += targetQuest.rewardXp;
          setMon(s.mon);
          
          let req = s.level * 100;
          if (s.xp >= req) {
              s.xp -= req;
              s.level += 1;
              audioManager.playLevelUp();
              setTipModal({ title: "Level Up & Promotion!", text: `Congratulations! You climbed to Level ${s.level} and gained stronger stats!` });
          }
          
          setQuests(prev => ({
              ...prev,
              [questId]: { ...prev[questId], status: 'completed' }
          }));
          
          audioManager.playCrit();
          spawnParticlesRef.current?.(s.position, 0xffff00, 30, 'thunder');
          saveGameData();
      }
  };

  advanceDialogRef.current = advanceDialog;

  const advanceCutscene = () => {
      const diagArr = CUTSCENES[cutsceneId!] || [];
      const curLine = diagArr[cutsceneLineIdx];
      if (curLine && cutsceneChars < curLine.text.length) { setCutsceneChars(curLine.text.length); return; }
      if (cutsceneLineIdx >= diagArr.length - 1) {
          const finishedId = cutsceneId;
          setCutsceneId(null);
          setCutsceneLineIdx(0);
          if (finishedId === 'intro') {
              stateRef.current.dummyHits = 0;
              setGameState('playing');
          } else if (finishedId === 'forestEntrance') {
              stateRef.current.stage = 'forest';
          } else if (finishedId === 'caveEntrance') {
              stateRef.current.stage = 'cave';
          } else if (finishedId === 'peakEntrance') {
              stateRef.current.stage = 'peak';
          } else if (finishedId === 'bossArrival') {
              stateRef.current.stage = 'boss';
          }
      } else {
          setCutsceneLineIdx(prev => prev + 1);
      }
  };

  advanceCutsceneRef.current = advanceCutscene;

  const saveDetails = React.useMemo(() => {
      if (!hasSave) return null;
      try {
          return deobfuscateData(localStorage.getItem('cm_savegame') || '{}');
      } catch (e) {
          return null;
      }
  }, [hasSave, gameState]);

  return (
    <div className="relative w-full h-full bg-[#050505] text-white overflow-hidden font-sans select-none">
      
      {/* --- Engine View --- */}
      {gameState !== 'menu' && (
        <div ref={mountRef} className="absolute inset-0">
          <canvas ref={canvasRef} className="block w-full h-full focus:outline-none" />
        </div>
      )}

      {gameState === 'menu' && (
        <div className="absolute inset-0 flex justify-center bg-[#030303] z-50 overflow-y-auto select-none">
            {/* Immersive Dark Crimson Background Gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d0606] via-[#050101] to-[#020202]" />
            
            {/* Subtle Grid overlay for traditional Japanese screen effect */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Glowing red background core behind the moon */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 0.25 }}
              transition={{ duration: 4, ease: "easeOut" }}
              className="absolute top-[20%] left-[30%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-700 rounded-full blur-[120px] pointer-events-none"
            />
            
            {/* Slow Drifting Crimson Embers & Sakura Petals */}
            {Array.from({ length: 35 }).map((_, i) => {
              const startX = Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200);
              const isSakura = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  className={`absolute rounded-full pointer-events-none ${
                    isSakura 
                      ? "bg-gradient-to-tr from-pink-500/20 to-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]" 
                      : "bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,0.75)]"
                  }`}
                  style={{
                     width: isSakura ? (Math.random() * 6 + 4) + "px" : (Math.random() * 3 + 2) + "px",
                     height: isSakura ? (Math.random() * 8 + 4) + "px" : (Math.random() * 3 + 2) + "px",
                     borderRadius: isSakura ? "50% 10% 50% 50%" : "50%"
                  }}
                  initial={{ 
                    x: startX, 
                    y: (typeof window !== 'undefined' ? window.innerHeight : 1000) + Math.random() * 200,
                    opacity: Math.random() * 0.8 + 0.1,
                    rotate: Math.random() * 360
                  }}
                  animate={{ 
                    y: -100, 
                    x: `+=${(Math.random() - 0.5) * 260}`,
                    rotate: isSakura ? [0, 180, 360] : 0,
                    opacity: [0, 0.9, 0] 
                  }}
                  transition={{ 
                    duration: 6 + Math.random() * 9, 
                    repeat: Infinity, 
                    ease: "linear",
                    delay: Math.random() * 6
                  }}
                />
              );
            })}

            {/* Main Interactive Dual-Pane container */}
            <div className="w-full max-w-7xl mx-auto px-6 min-h-full my-auto flex flex-col justify-between py-6 sm:py-12 relative z-10">
                
                {/* TOP HEADER: Traditional Hanko Branded Signature & Mount Kurenai Arc Marker */}
                <div className="flex items-center justify-between w-full border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        {/* Branded Red Hanko Seal (Square Japanese Ink stamp) */}
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: -2 }}
                          className="w-11 h-11 shrink-0 bg-[#b22222] border-2 border-[#800000] rounded-sm flex flex-col items-center justify-center text-white relative shadow-[inset_0_0_8px_rgba(0,0,0,0.5),0_0_15px_rgba(178,34,34,0.4)] cursor-help"
                          title="RJ Branded Seal of Quality"
                        >
                            <span className="font-serif text-[13px] leading-none font-bold uppercase tracking-tighter">烙印</span>
                            <span className="font-black text-[13px] leading-none tracking-tight">RJ</span>
                            {/* Grungy ink overlay */}
                            <div className="absolute inset-0 bg-white/5 pointer-events-none bg-gradient-radial from-transparent via-transparent to-red-950/40 mix-blend-overlay" />
                        </motion.div>
                        <div>
                           <div className="text-[10px] uppercase font-mono tracking-[0.25em] text-red-500 font-bold block">Kurenai Sacred Mountain</div>
                           <div className="text-xs uppercase tracking-[0.1em] text-gray-500 font-light block">Chapter I: Threads of the Weaver</div>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-full backdrop-blur-sm shadow-md">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">Audio System Engine Active</span>
                    </div>
                </div>

                {/* MIDDLE SECTION: Dynamic Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center flex-1 my-6 overflow-y-auto lg:overflow-visible py-4 scrollbar-thin">
                    
                    {/* LEFT PANEL: Logo, Slashed Title, Blood Moon Orb, Controls */}
                    <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left h-full justify-center">
                        
                        {/* Title & Glowing Japanese subtitle */}
                        <div className="relative mb-6">
                            <motion.div 
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 1 }}
                              className="text-amber-500/90 font-mono text-sm uppercase tracking-[0.6em] font-extrabold flex items-center gap-2 justify-center lg:justify-start"
                            >
                                <span>紅月</span>
                                <span className="text-white/20">|</span>
                                <span className="text-red-500 uppercase tracking-[0.3em]">Kurenai Episode</span>
                            </motion.div>
                            
                            <motion.h1 
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ duration: 1.2, delay: 0.1 }}
                              className="text-5xl md:text-7xl font-sans font-black tracking-[-0.03em] uppercase bg-gradient-to-b from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] mt-1 font-sans"
                            >
                              CRIMSON MOON
                            </motion.h1>

                            {/* Massive Slash Accent with Blood Moon subtitle */}
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 1.4, delay: 0.3 }}
                              className="relative inline-flex items-center gap-3 mt-1.5"
                            >
                                <span className="absolute -left-12 -right-12 h-[1px] bg-gradient-to-r from-transparent via-red-600 to-transparent blur-[1px] transform -rotate-1 pointer-events-none" />
                                <span className="font-mono text-xl md:text-2xl font-black uppercase text-red-500 tracking-[0.45em] drop-shadow-[0_0_15px_rgba(255,0,0,0.85)] flex items-center gap-1">
                                  THREADS OF THE WEAVER <span className="animate-pulse">🌕</span>
                                </span>
                            </motion.div>
                        </div>

                        {/* Interactive Dynamic Moon Sphere Widget */}
                        <div className="relative w-full max-w-xs h-36 flex items-center justify-center lg:justify-start my-4 group pointer-events-auto">
                            
                            {/* Decorative Spider Threads Behind Moon */}
                            <svg className="absolute inset-0 opacity-20 pointer-events-none w-full h-full text-red-500" viewBox="0 0 200 100">
                                <path d="M10,50 Q100,5 190,50" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                <path d="M10,50 Q100,95 190,50" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                <line x1="100" y1="5" x2="100" y2="95" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,3" />
                                <line x1="10" y1="50" x2="190" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,3" />
                            </svg>

                            <motion.div
                              onMouseEnter={() => setMoonHovered(true)}
                              onMouseLeave={() => setMoonHovered(false)}
                              onClick={() => {
                                  audioManager.playThunder();
                                  setMoonHovered(true);
                                  setTimeout(() => setMoonHovered(false), 500);
                              }}
                              className="relative cursor-pointer select-none"
                            >
                                {/* Multi-layered glowing rings */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/15 blur-[25px] transition-all duration-700 ${moonHovered ? 'w-40 h-40 bg-red-500/30' : 'w-24 h-24'}`} />
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/20 blur-[1px] transition-all duration-700 ${moonHovered ? 'w-32 h-32 scale-110' : 'w-20 h-20 animate-[spin_10s_linear_infinite]'}`} />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-red-500/40 animate-ping opacity-30 pointer-events-none" />

                                {/* Main Blood Moon Orb */}
                                <motion.div 
                                  animate={moonHovered ? { scale: 1.15, rotate: 10 } : { scale: 1.0, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 200 }}
                                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-950 via-red-600 to-amber-400 relative shadow-[0_0_40px_rgba(255,0,0,0.8)] overflow-hidden border border-red-500/70 shrink-0"
                                >
                                  {/* Crater-like aesthetic details */}
                                  <div className="absolute top-2 left-3 w-5 h-5 rounded-full bg-red-900/40 blur-[1px]" />
                                  <div className="absolute bottom-3 right-4 w-4 h-4 rounded-full bg-red-950/60 blur-[1.5px]" />
                                  <div className="absolute top-6 right-2 w-3 h-3 rounded-full bg-red-900/30 blur-[0.5px]" />
                                  {/* Shadow overlay */}
                                  <div className="absolute inset-0 bg-[linear-gradient(225deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />
                                </motion.div>
                            </motion.div>

                            <div className="ml-4 text-left hidden sm:block pointer-events-none">
                                <span className={`font-mono text-[10px] uppercase font-bold text-red-500 block mb-0.5 tracking-wider transition-all duration-300 ${moonHovered ? 'text-amber-400 scale-102 glow-text' : ''}`}>
                                    {moonHovered ? '✦ CURST ENERGY BURSTS ✦' : '✦ INTERACTIVE BLOOD ORB ✦'}
                                </span>
                                <p className="text-xs text-neutral-400 leading-relaxed font-sans max-w-[200px]">
                                    Click moon to invoke storm sparks. The Moonweaver's barrier reaches full zenith!
                                </p>
                            </div>
                        </div>

                        {/* Summary Editorial tagline */}
                        <p className="text-sm text-neutral-300 max-w-lg mb-8 leading-relaxed font-sans font-light">
                           Conquer Kurenai Forest and cut the Moonweaver's soul-threads. Flowing Moonflow forms woven with blazing Blood Moon strikes. Your blade is the only beacon in the dark crimson forest.
                        </p>

                        {/* Interactive Main Action Selection */}
                        <div className="w-full max-w-md flex flex-col gap-4 pointer-events-auto">
                            {hasSave && saveDetails ? (
                              <div className="flex flex-col gap-3.5 w-full">
                                {/* CONTINUE EXPEDITION SLOT (STYLIZED STEAM CARD) */}
                                <button 
                                    onClick={() => {
                                        audioManager.playWater();
                                        startGame(false);
                                    }}
                                    className="relative w-full text-left p-4 rounded-xl border border-red-500/30 hover:border-red-500 bg-red-950/15 hover:bg-red-950/25 transition-all duration-300 group flex items-center justify-between overflow-hidden shadow-[0_4px_25px_rgba(255,0,0,0.06)] hover:shadow-[0_4px_35px_rgba(255,0,0,0.18)] hover:-translate-y-0.5"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-red-500/15 transition-all duration-500" />
                                    
                                    <div className="flex items-start gap-3 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 mt-0.5 group-hover:bg-red-500/20 transition-all duration-300">
                                            <Sword className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-red-400 mb-0.5">RESUME CURRENT MISSION</div>
                                            <div className="font-serif text-lg text-white font-black group-hover:text-red-300 transition-colors">Continue Expedition</div>
                                            
                                            {/* Live save details indicators */}
                                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] font-mono text-gray-400">
                                              <span className="bg-red-900/30 px-2 py-0.5 rounded border border-red-500/20 text-red-300 font-bold">
                                                  LVL {saveDetails.level || 1}
                                              </span>
                                              <span className="font-bold text-gray-300 uppercase">
                                                  Rank: {saveDetails.rankIdx !== undefined ? RANKS[saveDetails.rankIdx] : 'New Moon'}
                                              </span>
                                              <span className="text-amber-500 flex items-center gap-0.5 font-bold">
                                                  🪙 {saveDetails.mon || 50} MON
                                              </span>
                                              <span className="text-gray-400 uppercase">
                                                  📍 Stage: {saveDetails.stage || 'VILLAGE'}
                                              </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-7 h-7 text-neutral-500 group-hover:text-red-400 group-hover:translate-x-2 transition-all duration-300 shrink-0" />
                                </button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => {
                                            audioManager.playWater();
                                            startGame(false);
                                        }}
                                        className="py-3 px-4 rounded-lg bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 hover:border-red-400 font-mono text-[11px] text-white uppercase tracking-widest transition-all duration-200 text-center flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-3.5 h-3.5" /> LOAD DATA SLOT
                                    </button>
                                    <button 
                                        onClick={() => {
                                            audioManager.playFire();
                                            startGame(true);
                                        }}
                                        className="py-3 px-4 rounded-lg bg-black/40 hover:bg-neutral-900 border border-white/5 hover:border-red-500/30 font-mono text-[11px] text-gray-400 hover:text-white uppercase tracking-widest transition-all duration-200 text-center flex items-center justify-center gap-1.5"
                                    >
                                        RESET & NEW GAME
                                    </button>
                                    <button 
                                        onClick={() => {
                                            audioManager.playWater();
                                            setEnvTime(stateRef.current.envTime);
                                            setSettingsOpen(true);
                                        }}
                                        className="py-3 px-4 rounded-lg bg-black/40 hover:bg-neutral-900 border border-white/5 hover:border-neutral-700 font-mono text-[11px] text-gray-400 hover:text-white uppercase tracking-widest transition-all duration-200 text-center"
                                    >
                                        GAME SETTINGS
                                    </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3 w-full">
                                {/* GLOWING "START FIRST EXPEDITION" BUTTON */}
                                <button 
                                    onClick={() => {
                                        audioManager.playWater();
                                        startGame(true);
                                    }}
                                    className="relative w-full text-left p-5 rounded-xl border border-red-500/40 hover:border-red-500 bg-red-950/20 hover:bg-red-950/30 transition-all duration-300 group flex items-center justify-between overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.15)] hover:shadow-[0_0_50px_rgba(255,0,0,0.35)] hover:-translate-y-0.5"
                                >
                                    <span className="absolute inset-x-0 bottom-0 h-1 bg-red-600 blur-[2px] transition-all duration-500 group-hover:h-full group-hover:opacity-10" />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-11 h-11 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 group-hover:scale-110 group-hover:bg-red-500/30 group-hover:text-red-400 transition-all duration-300">
                                            <Sword className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="font-mono text-[10px] uppercase font-black tracking-[0.25em] text-red-400 mb-0.5">INITIATE GAME FLOW</div>
                                            <div className="font-serif text-xl text-white font-black">Focus & Enter Mission</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-7 h-7 text-red-500 group-hover:text-red-400 group-hover:translate-x-2.5 transition-all duration-300 shrink-0" />
                                </button>

                                <button 
                                    onClick={() => {
                                        audioManager.playWater();
                                        setEnvTime(stateRef.current.envTime);
                                        setSettingsOpen(true);
                                    }}
                                    className="py-3 px-4 rounded-lg bg-black/40 hover:bg-neutral-900 border border-white/5 hover:border-neutral-700 font-mono text-[11px] text-gray-400 hover:text-white uppercase tracking-widest transition-all duration-200 text-center"
                                >
                                    GAME SETTINGS
                                </button>
                              </div>
                            )}
                        </div>

                    </div>

                    {/* RIGHT PANEL: Highly detailed Story / Combos / Moonflow Techniques handbook tab component */}
                    <div className="lg:col-span-6 flex flex-col h-full justify-center pointer-events-auto">
                        <div className="bg-[#0b0303]/75 border border-red-950/40 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col min-h-[420px] max-w-xl mx-auto lg:mx-0 w-full">
                            {/* Spider nest details */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-600/5 to-transparent blur-xl pointer-events-none" />
                            
                            {/* Hand-drawn styled Tab Triggers */}
                            <div className="flex items-center gap-1.5 border-b border-white/5 pb-3">
                                {[
                                  { id: 'lore', label: 'THE EPISODE LORE', icon: BookOpen },
                                  { id: 'combat', label: 'COMBAT DRILLS', icon: Compass },
                                  { id: 'breathing', label: 'MOONFLOW MANUAL', icon: Flame }
                                ].map(tab => {
                                  const IconComponent = tab.icon;
                                  const isActive = menuTab === tab.id;
                                  return (
                                    <button
                                      key={tab.id}
                                      onClick={() => {
                                          audioManager.playSlash();
                                          setMenuTab(tab.id as any);
                                      }}
                                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-mono text-[10px] sm:text-xs uppercase font-extrabold tracking-widest transition-all duration-300 ${
                                          isActive 
                                            ? 'bg-red-950/40 text-red-400 border border-red-500/30 shadow-inner' 
                                            : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                      }`}
                                    >
                                      <IconComponent className="w-3.5 h-3.5" />
                                      {tab.label}
                                    </button>
                                  );
                                })}
                            </div>

                            {/* Tab Panels Contents */}
                            <div className="flex-1 mt-5 flex flex-col justify-between">
                                <AnimatePresence mode="wait">
                                    {menuTab === 'lore' && (
                                      <motion.div
                                        key="lore"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-4"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                           <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                           <h3 className="font-serif text-[15px] font-bold text-red-400 uppercase tracking-wide">Mount Kurenai Shadow</h3>
                                        </div>
                                        <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                                          The dark slopes of <span className="text-white font-bold">Mount Kurenai</span> are covered in steel spiderwebs. 
                                          Together with her woven proxy "family," <span className="text-red-400 font-bold">Shira the Moonweaver</span> conducts 
                                          a profane ritual to pull down the village barrier and drink the moonpetal fields dry. If she finishes beneath the zenith of the Blood Moon, every soul in the valley joins her web.
                                        </p>
                                        <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                                          Guided by your mentor, <span className="text-white font-normal">Master Iwato</span>, you travel into this webbed domain. 
                                          Synchronize your Moonflow rhythm, slice through lower-tier thread weaver spider-scouts, and confront the Moonweaver.
                                        </p>
                                        
                                        {/* Lore Warning Tip */}
                                        <div className="mt-4 bg-red-950/20 border border-red-950/70 p-3 rounded-lg flex gap-2.5">
                                           <HelpCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                                           <p className="text-[10px] text-neutral-400 leading-normal">
                                             <span className="text-white font-bold">MON COST WARNING:</span> Dying in Mt. Kurenai will transport you back to the village gates, and cost you <span className="text-red-400 font-bold">20 Mon silver coins</span>. Keep health items ready!
                                           </p>
                                        </div>
                                      </motion.div>
                                    )}

                                    {menuTab === 'combat' && (
                                      <motion.div
                                        key="combat"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-3"
                                      >
                                        <h3 className="font-serif text-sm font-bold text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <span>⚔️ Combat Postures Training</span>
                                        </h3>
                                        
                                        {/* Combat Key Guide Row 1 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                           <div className="bg-black/60 border border-white/5 p-2 rounded-lg flex items-center gap-2">
                                              <span className="w-7 h-7 bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center justify-center rounded font-mono font-bold shrink-0 shadow">J / L Click</span>
                                              <div>
                                                 <div className="text-[10px] font-mono text-gray-300 font-extrabold uppercase">WATER CHARGE SLASH</div>
                                                 <p className="text-[9px] text-gray-400">Chain consecutive hits to increase crit damage multiplier!</p>
                                              </div>
                                           </div>
                                           
                                           <div className="bg-black/60 border border-white/5 p-2 rounded-lg flex items-center gap-2">
                                              <span className="w-7 h-7 bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center justify-center rounded font-mono font-bold shrink-0 shadow">K / Space</span>
                                              <div>
                                                 <div className="text-[10px] font-mono text-gray-300 font-extrabold uppercase">EVASIVE DASH</div>
                                                 <p className="text-[9px] text-gray-400">Short speed dash. Grants full invincibility frames.</p>
                                              </div>
                                           </div>

                                           <div className="bg-black/60 border border-white/5 p-2 rounded-lg flex items-center gap-2">
                                              <span className="w-7 h-7 bg-amber-950/40 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center rounded font-mono font-bold shrink-0 shadow">I / Block</span>
                                              <div>
                                                 <div className="text-[10px] font-mono text-amber-500 font-extrabold uppercase">PERFECT PARRY</div>
                                                 <p className="text-[9px] text-gray-400">Parry within 0.25s of impact to stun and knock back enemies!</p>
                                              </div>
                                           </div>

                                           <div className="bg-black/60 border border-white/5 p-2 rounded-lg flex items-center gap-2">
                                              <span className="w-7 h-7 bg-amber-950/40 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center rounded font-mono font-bold shrink-0 shadow">E / Key</span>
                                              <div>
                                                 <div className="text-[10px] font-mono text-amber-505 font-extrabold uppercase">INTERACTION</div>
                                                 <p className="text-[9px] text-gray-400">Speak to Iwato, shop merchandise, or use buttons.</p>
                                              </div>
                                           </div>
                                        </div>

                                        <div className="bg-red-950/10 border border-red-950/55 p-2.5 rounded-lg text-[10px] text-gray-400">
                                            <span className="font-extrabold text-white">PRO TACTICAL TIP:</span> Shira is shielded by <span className="text-red-400 font-bold">Three Sacred Spider-Cocoons</span>. They absorb his kinetic damage completely. Always destroy the cocoons first on the battlefield!
                                        </div>
                                      </motion.div>
                                    )}

                                    {menuTab === 'breathing' && (
                                      <motion.div
                                        key="breathing"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-3.5"
                                      >
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-serif text-sm font-bold text-red-400 uppercase tracking-wide">🔥 Moonflow Styles handbook</h3>
                                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Interactive Audio Preview</span>
                                        </div>
                                        
                                        {/* Style selector list with real click sfx */}
                                        <div className="space-y-2">
                                           {/* Water style */}
                                           <div className="bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between transition-all group">
                                               <div className="flex items-center gap-3">
                                                   <div className="w-8 h-8 rounded-lg bg-indigo-950/55 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">💧</div>
                                                   <div>
                                                       <div className="text-[11px] font-mono text-white font-extrabold uppercase group-hover:text-indigo-400 transition-colors">Moonflow Style</div>
                                                       <div className="text-[9px] text-gray-500">Fluid wave slices, multi-strike stability.</div>
                                                   </div>
                                               </div>
                                               <button
                                                 onClick={() => audioManager.playWater()}
                                                 className="px-3 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all"
                                               >
                                                 Test Sound
                                               </button>
                                           </div>

                                           {/* Fire style */}
                                           <div className="bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between transition-all group">
                                               <div className="flex items-center gap-3">
                                                   <div className="w-8 h-8 rounded-lg bg-red-950/55 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-sm">🔥</div>
                                                   <div>
                                                       <div className="text-[11px] font-mono text-white font-extrabold uppercase group-hover:text-red-400 transition-colors">Blood Moon Dance Style</div>
                                                       <div className="text-[9px] text-gray-500">Intense solar fire bursts, high stamina damage.</div>
                                                   </div>
                                               </div>
                                               <button
                                                 onClick={() => audioManager.playFire()}
                                                 className="px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 hover:text-red-300 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all"
                                               >
                                                 Test Sound
                                               </button>
                                           </div>

                                           {/* Thunder style */}
                                           <div className="bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between transition-all group">
                                               <div className="flex items-center gap-3">
                                                   <div className="w-8 h-8 rounded-lg bg-yellow-950/55 border border-yellow-500/30 flex items-center justify-center text-yellow-500 font-bold text-sm">⚡</div>
                                                   <div>
                                                       <div className="text-[11px] font-mono text-white font-extrabold uppercase group-hover:text-yellow-400 transition-colors">Stormstep Stance</div>
                                                       <div className="text-[9px] text-gray-500">Unleashes crit multiplier spikes.</div>
                                                   </div>
                                               </div>
                                               <button
                                                 onClick={() => audioManager.playThunder()}
                                                 className="px-3 py-1 bg-yellow-950/60 hover:bg-yellow-900 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all"
                                               >
                                                 Test Sound
                                               </button>
                                           </div>
                                        </div>
                                      </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Bottom Tab Footer */}
                                <div className="border-t border-white/5 pt-4 flex items-center justify-between text-[10px] font-mono text-gray-500">
                                   <span>Active Guild: Moonflow Order</span>
                                   <span className="text-red-600 font-bold uppercase tracking-widest animate-pulse">KURENAI EXCLUSIVES</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* BOTTOM FOOTER: Setting Trigger, Controls Indicator, Contribution Label */}
                <div className="flex flex-col sm:flex-row items-center justify-between w-full border-t border-white/5 pt-4 text-center sm:text-left gap-4">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                       Crimson Moon: Threads of the Weaver v1.0 • © 2026. Made with true design craft.
                    </div>
                    
                    <div className="flex items-center gap-5">
                       <button
                         onClick={() => {
                             audioManager.playWater();
                             setSettingsOpen(true);
                         }}
                         className="px-5 py-2 hover:bg-white/5 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-white rounded-full font-mono text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5"
                       >
                         <Volume2 className="w-3.5 h-3.5 text-red-500" /> Toggle Audio / Volumes
                       </button>

                       <span className="text-xs font-mono text-gray-600 block">
                           PRODUCED BY <span className="text-red-500 font-extrabold uppercase tracking-widest">RJ • CORP</span>
                       </span>
                    </div>
                </div>

            </div>

            {/* Immersive Outer Vignette Ring */}
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,1)] pointer-events-none" />
        </div>
      )}

      {/* --- Cinematic Overlays --- */}
      {gameState === 'playing' && (
          <>
            <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
          </>
      )}

      {/* --- In-Game HUD --- */}
      {/* Combo Counter Overlay */}
      <ComboCounter count={comboCount} />

      {/* Damage Numbers Overlay */}
      {gameState === 'playing' && damageTexts.map(dt => (
        <div 
          key={dt.id} 
          className={`absolute pointer-events-none select-none font-bold animate-float-up z-30 flex flex-col items-center ${dt.isCrit ? 'text-amber-400 text-3xl' : 'text-white text-xl'}`} 
          style={{ left: `${dt.x}%`, top: `${dt.y}%`, transform: 'translate(-50%, -50%)', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
            {dt.val}
            {dt.isCrit && <span className="text-[10px] text-amber-200 uppercase -mt-1 tracking-widest font-mono">Critical</span>}
        </div>
      ))}
      
      {/* Low Health Screen Vignette Alert */}
      {gameState === 'playing' && health < 55 && (
        <div 
          className={`absolute inset-0 pointer-events-none z-15 transition-all duration-500 rounded-none mix-blend-color-burn ${health < 25 ? 'animate-pulse bg-red-800/10' : ''}`}
          style={{ 
             boxShadow: health < 25 
               ? 'inset 0 0 110px rgba(220, 0, 0, 0.85)' 
               : 'inset 0 0 75px rgba(180, 0, 0, 0.6)'
          }}
        />
      )}

      {/* Cinematic Boss Health Bar Overlay */}
      {gameState === 'playing' && currentStage === 'boss' && (() => {
        const boss = stateRef.current.enemies ? stateRef.current.enemies.find(e => e.type === 'boss' && e.active) : null;
        if (!boss) return null;
        const hpPct = Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100));
        const isUpper = boss.demonicRank === 'Elder Horror';
        
        return (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-xl px-6 z-25 pointer-events-none select-none">
             <div className="flex flex-col items-center w-full">
               {/* Name & Title */}
               <div className="flex items-center space-x-2.5 mb-2">
                 <span className="text-[9px] tracking-[0.25em] font-mono font-bold text-red-500 uppercase bg-red-950/40 px-2 py-0.5 border border-red-500/20 rounded">
                   {boss.demonicRank || "Horror Boss"}
                 </span>
                 <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                   {isUpper ? "Brood Mother • Shira's Brood" : "Weaver Spawn"}
                 </h4>
               </div>
               
               {/* HP segments & bar container */}
               <div className="w-full bg-black/70 border border-red-500/30 p-2 rounded-lg flex items-center space-x-3 shadow-[0_0_20px_rgba(255,0,0,0.25)] backdrop-blur-md">
                  {/* Demon symbol indicator */}
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-[10px] font-mono ${isUpper ? 'border-amber-500 bg-amber-950 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'border-purple-500 bg-purple-950 text-purple-300'} animate-pulse`}>
                    鬼
                  </div>
                  {/* Track */}
                  <div className="flex-1 h-3 bg-gray-950 rounded-sm overflow-hidden relative border border-white/5">
                    {/* Health Fill */}
                    <div 
                      className="h-full bg-gradient-to-r from-red-800 via-red-600 to-amber-500 transition-all duration-300"
                      style={{ width: `${hpPct}%` }}
                    />
                    {/* Segment markings for authentic action RPG feel */}
                    <div className="absolute inset-x-0 inset-y-0 flex justify-between pointer-events-none">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <div key={idx} className="w-px h-full bg-black/40" />
                      ))}
                    </div>
                  </div>
                  {/* HP Value Display */}
                  <span className="text-[9px] font-mono font-bold text-red-400 tracking-wider">
                     {Math.max(0, Math.floor(boss.health))} / {boss.maxHealth}
                  </span>
               </div>
             </div>
          </div>
        );
      })()}

      {gameState === 'playing' && cutsceneId === null && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 right-4 flex justify-between pointer-events-none z-20">
            {/* Player Stats Corner */}
            <div className="w-full max-w-[220px] sm:max-w-sm [@media(max-height:480px)]:max-w-[180px]">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-black/60 border border-white/20 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md">
                        <span className="text-xl font-bold font-mono text-white">{level}</span>
                    </div>
                    <div>
                        <h3 className="font-bold uppercase tracking-widest text-sm text-gray-200">{RANKS[rankIndex]}</h3>
                        <div className="w-32 h-1 bg-black/50 mt-1 rounded"><div className="h-full bg-yellow-400" style={{width:`${(xp/(level*100))*100}%`}} /></div>
                    </div>
                </div>

                <div className="bg-black/40 border border-white/10 p-2.5 sm:p-4 rounded-xl backdrop-blur-md shadow-xl">
                    <div className="mb-3">
                        <div className="flex justify-between text-[10px] font-bold font-mono tracking-widest text-[#ff4444] mb-1">
                            <span className="flex items-center"><Heart className="w-3 h-3 mr-1"/> VITALITY</span>
                            <span>{Math.floor(health)} / {stateRef.current.maxHealth}</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-700 to-red-400 transition-all duration-300" style={{ width: `${(health/stateRef.current.maxHealth)*100}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] font-bold font-mono tracking-widest text-[#4488ff] mb-1">
                            <span className="flex items-center"><Zap className="w-3 h-3 mr-1"/> SPIRIT</span>
                            <span>{Math.floor(stamina)} / {stateRef.current.maxStamina}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-700 to-cyan-400 transition-all duration-75 shadow-[0_0_10px_rgba(0,150,255,0.5)]" style={{ width: `${(stamina/stateRef.current.maxStamina)*100}%` }} />
                        </div>
                    </div>
                </div>
                
                {/* --- Training Goal Tracker --- */}
                {stateRef.current.stage === 'village' && dummyHits < 3 && !hideMainQuests && (
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-4 [@media(max-height:480px)]:mt-2 bg-amber-950/20 border border-amber-500/30 p-2.5 sm:p-3.5 [@media(max-height:480px)]:p-2 rounded-xl flex items-start gap-2.5 sm:gap-3 backdrop-blur-md max-w-[220px] sm:max-w-sm [@media(max-height:480px)]:max-w-[180px] pointer-events-auto group/quest"
                  >
                    <Star className="text-amber-500 w-5 h-5 animate-pulse shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-mono text-[10px] uppercase font-bold tracking-[0.15em] text-amber-500">Dummy Training Quest</h4>
                        <button 
                          onClick={() => setHideMainQuests(true)}
                          className="text-amber-500/40 hover:text-amber-400 opacity-0 group-hover/quest:opacity-100 transition-opacity"
                          title="Hide Objective"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 font-sans leading-relaxed [@media(max-height:480px)]:hidden">
                        Strike the oak dummy with your steel <span className="font-bold text-amber-400">3 times</span> to prove your Moonflow stance to Master Iwato.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[10px] text-gray-400">Progress:</span>
                        <div className="w-24 h-1.5 bg-black/60 rounded overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-300"
                            style={{ width: `${(dummyHits / 3) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-amber-400">{dummyHits}/3 Hits</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* --- Training Completed Guide --- */}
                {stateRef.current.stage === 'village' && dummyHits >= 3 && !hideMainQuests && (
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-4 [@media(max-height:480px)]:mt-2 bg-emerald-950/20 border border-emerald-500/30 p-2.5 sm:p-3.5 [@media(max-height:480px)]:p-2 rounded-xl flex items-start gap-2.5 sm:gap-3 backdrop-blur-md max-w-[220px] sm:max-w-sm [@media(max-height:480px)]:max-w-[180px] pointer-events-auto group/quest"
                  >
                    <CheckCircle2 className="text-emerald-500 w-5 h-5 animate-pulse shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-mono text-[10px] uppercase font-bold tracking-[0.15em] text-emerald-500">Training Verified</h4>
                        <button 
                          onClick={() => setHideMainQuests(true)}
                          className="text-emerald-500/40 hover:text-emerald-400 opacity-0 group-hover/quest:opacity-100 transition-opacity"
                          title="Hide Objective"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 font-sans leading-relaxed [@media(max-height:480px)]:hidden">
                        Speak to <span className="font-bold text-white">Master Iwato</span> to lift the village barrier and cross into the Bamboo Forest.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* --- Quest Tracker Toggle --- */}
                <div className="mt-4 pointer-events-auto flex flex-col gap-2 [@media(max-height:480px)]:fixed [@media(max-height:480px)]:left-1/2 [@media(max-height:480px)]:-translate-x-1/2 [@media(max-height:480px)]:bottom-2 [@media(max-height:480px)]:mt-0 [@media(max-height:480px)]:z-30">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowQuestTracker(!showQuestTracker)}
                            className="bg-black/60 border border-white/20 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono whitespace-nowrap text-gray-300 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5 sm:gap-2 backdrop-blur-md"
                        >
                            {showQuestTracker ? <EyeOff className="w-3.5 h-3.5 text-red-400" /> : <Eye className="w-3.5 h-3.5 text-green-400" />}
                            {showQuestTracker ? 'HIDE QUEST LOG' : 'SHOW QUEST LOG'}
                        </button>
                        
                        <button 
                            onClick={() => setOpenMapLabels(!openMapLabels)}
                            className={`bg-black/60 border border-white/20 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono whitespace-nowrap transition flex items-center gap-1.5 sm:gap-2 backdrop-blur-md ${openMapLabels ? 'text-amber-400' : 'text-gray-400'}`}
                        >
                            <Navigation className="w-3.5 h-3.5" />
                            {openMapLabels ? 'HIDE MINIMAP' : 'SHOW MINIMAP'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {showQuestTracker && (
                             <button 
                                onClick={() => setHideMainQuests(!hideMainQuests)}
                                className={`bg-black/60 border border-white/20 px-3 py-1.5 rounded-lg text-[9px] font-mono transition flex items-center gap-2 backdrop-blur-md ${hideMainQuests ? 'text-gray-500' : 'text-amber-500'}`}
                             >
                                 <Star className="w-3 h-3" />
                                 {hideMainQuests ? 'MAIN HIDDEN' : 'SHOWING MAIN'}
                             </button>
                        )}
                    </div>
                    
                    <AnimatePresence>
                        {showQuestTracker && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 space-y-2 overflow-hidden"
                            >
                                 {(Object.entries(quests) as [string, any][])
                                  .filter(([id, q]) => {
                                      const isAccepted = acceptedQuests.includes(id);
                                      if (!isAccepted) return false;
                                      if (q.status === 'completed') return false;
                                      if (q.isMain && hideMainQuests) return false;
                                      return true;
                                  })
                                  .map(([id, q]) => (
                                    <div key={id} className="w-full max-w-xs bg-black/40 border border-white/10 p-2.5 rounded-lg backdrop-blur-md shadow-lg group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[10px] uppercase font-mono tracking-widest drop-shadow-md truncate max-w-[160px] ${q.isMain ? 'text-amber-500 font-bold' : 'text-blue-400'}`} title={q.title}>
                                                {q.isMain && '★ '}{q.title}
                                            </span>
                                            {q.status === 'claimable' ? (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuestAction(id);
                                                    }}
                                                    className="text-[10px] font-mono font-bold text-green-400 animate-pulse hover:text-green-300 transition-colors cursor-pointer"
                                                >
                                                    CLAIM REWARD
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-mono font-bold text-blue-400">
                                                    {q.current}/{q.target}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[9px] text-gray-400 font-sans line-clamp-1 group-hover:line-clamp-none transition-all">
                                            {q.desc}
                                        </div>
                                    </div>
                                ))}
                                {(Object.entries(quests) as [string, any][]).filter(([id, q]) => {
                                      const isAccepted = acceptedQuests.includes(id);
                                      if (!isAccepted) return false;
                                      if (q.status === 'completed') return false;
                                      if (q.isMain && hideMainQuests) return false;
                                      return true;
                                }).length === 0 && (
                                    <div className="text-[9px] font-mono text-gray-500 italic px-2 bg-black/20 rounded py-1">No active objectives accepted.</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Top Right Objectives / Pause */}
            <div className="flex flex-col items-end space-y-4">
                <div className="flex items-center gap-3">
                    <button 
                        className="pointer-events-auto p-2 bg-black/50 border border-white/20 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md shadow-lg"
                        onClick={() => setOpenMapLabels(!openMapLabels)}
                        title="Toggle Map Overlay"
                    >
                        <Compass className="w-6 h-6 text-amber-400" />
                    </button>
                    <button 
                      className="pointer-events-auto p-2 bg-black/50 border border-white/20 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
                      onClick={() => setMenuOpen(!menuOpen)}
                    >
                      {menuOpen ? <X className="w-6 h-6 text-white"/> : <Menu className="w-6 h-6 text-white"/>}
                    </button>
                </div>
                
                {enemiesLeft > 0 && (
                  <div className="bg-red-950/60 border border-red-500/30 px-4 py-2 rounded-lg backdrop-blur-md flex items-center space-x-3 shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                      <Skull className="w-5 h-5 text-red-400 animate-pulse" />
                      <span className="text-xl font-mono font-bold text-white tracking-widest">{enemiesLeft}</span>
                  </div>
                )}
                
                {/* --- Minimap Overlay --- */}
                <AnimatePresence>
                {openMapLabels && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="bg-black/60 border-2 border-[#bb8844]/40 p-2 rounded-full w-40 h-40 md:w-48 md:h-48 backdrop-blur-md shadow-[0_0_30px_rgba(187,136,68,0.2)] relative overflow-hidden pointer-events-auto"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black/40 to-black/80"></div>
                        <div className="absolute inset-0 border border-white/10 rounded-full m-2"></div>
                        {/* Compass N point */}
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono text-amber-500 font-bold z-10 drop-shadow-[0_0_3px_rgba(0,0,0,1)]">N</div>
                        
                        {/* Map entities rendered relative to player - Now Static North Up */}
                        <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 z-0">
                            {mapEntities.map((ent, idx) => {
                                // Scale world coords to minimap coords
                                const viewRadius = 100; // Increased radius for better overview
                                const mapRadius = 70; // 70px inside the minimap
                                
                                const rx = ent.x - playerPos.x;
                                const rz = ent.z - playerPos.z;
                                
                                // Check distance
                                const dist = Math.sqrt(rx*rx + rz*rz);
                                if (dist > viewRadius) return null;
                                
                                // Map coords (center is 0,0). -Z is Forward (Up)
                                const mx = (rx / viewRadius) * mapRadius;
                                const mz = (rz / viewRadius) * mapRadius;
                                
                                let blipColor = 'bg-white';
                                let blipScale = 'w-1.5 h-1.5';
                                if (ent.type === 'demon' || ent.type === 'boss') {
                                    blipColor = 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,1)] z-10 opacity-80';
                                } else if (ent.type === 'npc' || ent.type === 'warden') {
                                    blipColor = 'bg-blue-400 shadow-[0_0_8px_rgba(100,150,255,1)] opacity-70';
                                    if (ent.id === 'master') {
                                        blipColor = 'bg-amber-400 shadow-[0_0_10px_rgba(255,200,0,1)] z-30 scale-125';
                                    }
                                } else if (ent.type === 'shop') {
                                    blipColor = 'bg-green-400 shadow-[0_0_8px_rgba(0,255,100,1)] opacity-80';
                                } else if (ent.type === 'dummy') {
                                    blipColor = 'bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,1)] z-20 animate-pulse';
                                } else if (ent.type === 'cocoon') {
                                    blipColor = 'bg-purple-500 shadow-[0_0_12px_rgba(180,0,255,1)] saturate-200 animate-pulse z-20 w-2.5 h-2.5';
                                }
                                
                                return (
                                    <div key={idx} 
                                         className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 border border-white/20 transition-all duration-300 ${blipColor} ${blipScale}`} 
                                         style={{ left: `calc(50% + ${mx}px)`, top: `calc(50% + ${mz}px)` }}
                                    />
                                );
                            })}
                        </div>
                        {/* Player Icon at Center (Rotating) */}
                        <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 text-white z-20 flex justify-center items-center drop-shadow-[0_0_5px_rgba(187,136,68,1)]"
                             style={{ transform: `translate(-50%, -50%) rotate(${playerPos.rot + Math.PI}rad)` }}>
                            <Navigation className="w-4 h-4 fill-white text-amber-500 mb-[2px]" />
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
      )}

      {/* --- Pause Menu Overlay --- */}
      {menuOpen && gameState === 'playing' && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center">
            <div className="w-full max-w-md bg-gray-900 border border-white/10 p-5 sm:p-8 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto mx-4">
               <h2 className="text-2xl font-mono font-bold uppercase tracking-widest text-center mb-8 border-b border-white/10 pb-4">Paused</h2>
               <div className="space-y-4">
                  <button onClick={()=>setMenuOpen(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2.5 mx-auto">
                     <CheckCircle2 className="w-4 h-4 text-green-400" /> Resume Game
                  </button>
                  <button onClick={saveGameData} className="w-full py-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded font-mono uppercase tracking-widest transition-all text-blue-200 flex items-center justify-center gap-2.5 mx-auto">
                     <Save className="w-4 h-4 text-blue-400" /> Save Progress
                  </button>
                  <button onClick={() => { setEnvTime(stateRef.current.envTime); setSettingsOpen(true); }} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded font-mono uppercase tracking-widest transition-colors">Settings</button>
                  <button onClick={()=>{setMenuOpen(false); setGameState('menu');}} className="w-full py-4 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded font-mono uppercase tracking-widest transition-colors text-red-200">Abandon Mission</button>
               </div>
               <div className="mt-8 pt-4 border-t border-white/5 text-center">
                  <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Rank: {RANKS[rankIndex]}</p>
                  {/* Game Management */}
                  <div>
                     <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-gray-500 mb-4 border-l-2 border-gray-600 pl-3">Data & Experience</h3>
                     
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                           <div className="flex flex-col">
                              <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Persistence Engine</span>
                              <span className="text-[10px] text-gray-500">Save or resume your progress.</span>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                 onClick={loadGameData}
                                 className="px-4 py-2 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-500/30 text-blue-400 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                 <BookOpen className="w-3.5 h-3.5" /> Load
                              </button>
                              <button 
                                 onClick={saveGameData}
                                 className="px-4 py-2 bg-green-900/30 hover:bg-green-800/50 border border-green-500/30 text-green-400 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                 <Save className="w-3.5 h-3.5" /> Save
                              </button>
                           </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                           <div className="flex flex-col">
                              <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Interface: HUD</span>
                              <span className="text-[10px] text-gray-500">Toggle story objectives visibility.</span>
                           </div>
                           <button 
                              onClick={() => setHideMainQuests(!hideMainQuests)}
                              className={`px-4 py-2 border text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all ${hideMainQuests ? 'bg-red-950/40 border-red-500/30 text-red-400' : 'bg-green-950/40 border-green-500/30 text-green-400'}`}
                           >
                              {hideMainQuests ? 'Main Hidden' : 'Main Visible'}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- Tip Modal Overlay --- */}
      {tipModal !== null && gameState === 'playing' && (
         <div className="absolute inset-x-4 top-24 max-h-[calc(100vh-8rem)] overflow-y-auto md:inset-x-auto md:w-[400px] md:right-8 bg-black/80 backdrop-blur-xl border border-blue-500/50 p-6 rounded-xl shadow-[0_0_30px_rgba(0,100,255,0.2)] z-50 animate-in slide-in-from-right-10 rounded-tl-3xl rounded-br-3xl pointer-events-auto">
            <div className="flex items-center space-x-3 mb-4 border-b border-blue-500/30 pb-3">
               <Info className="text-blue-400 w-6 h-6" />
               <h3 className="font-mono text-blue-200 uppercase tracking-[0.2em] font-bold text-sm">Combat Tip</h3>
            </div>
            <h4 className="text-xl font-bold text-white mb-2 font-mono">{tipModal.title}</h4>
            <p className="text-blue-100/70 text-sm leading-relaxed mb-6">
                {tipModal.text}
            </p>
            <button 
                onClick={() => { stateRef.current.activeTip = null; setTipModal(null); }}
                className="w-full py-3 bg-blue-900/40 hover:bg-blue-800/60 transition-colors border border-blue-500/40 rounded-lg text-blue-100 font-mono uppercase tracking-widest text-xs pointer-events-auto shadow-[0_0_15px_rgba(0,100,255,0.3)]"
            >
                Understood
            </button>
         </div>
      )}

      {/* --- Cinematic Cutscene Overlay --- */}
      {cutsceneId !== null && (
        <div className="absolute inset-0 z-50 pointer-events-auto flex flex-col justify-between overflow-hidden">
          {/* Top Black Bar */}
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="w-full h-[12vh] bg-black border-b border-neutral-900 flex items-center justify-between px-8 z-10 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-red-500 font-bold">Cinematic Sequence</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                  onClick={() => { setEnvTime(stateRef.current.envTime); setSettingsOpen(true); }}
                  className="pointer-events-auto p-2 bg-white/5 border border-white/20 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md"
                  title="Settings"
              >
                  <Settings className="w-4 h-4 text-gray-300" />
              </button>
              <button 
                onClick={() => {
                    setCutsceneId(null);
                    setCutsceneLineIdx(0);
                    if (cutsceneId === 'intro') {
                        stateRef.current.dummyHits = 0;
                        setGameState('playing');
                    } else if (cutsceneId === 'forestEntrance') {
                        stateRef.current.stage = 'forest';
                    } else if (cutsceneId === 'bossArrival') {
                        stateRef.current.stage = 'boss';
                    }
                }}
                className="pointer-events-auto px-5 py-2 rounded-full border border-red-500/30 hover:border-red-500/70 bg-red-950/20 text-red-400 hover:text-red-300 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 hover:scale-105"
              >
                Skip Scene <span>➔</span>
              </button>
            </div>
          </motion.div>

          {/* Central Atmospheric Overlay */}
          <div className="flex-1 flex items-center justify-center bg-transparent relative pointer-events-none overflow-hidden">
            {/* Ambient vignette */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/80 pointer-events-none z-10" />
            
            {/* Dynamic VFX Layer based on Mood */}
            {(() => {
                const step = (CUTSCENES[cutsceneId] || [])[cutsceneLineIdx] || { speaker: 'Narrator', text: '', mood: 'calm' };
                if (step.mood === 'sinister') {
                    return (
                        <div className="absolute inset-0 z-0 opacity-40">
                             <div className="absolute inset-0 bg-red-900/30 mix-blend-overlay animate-pulse" />
                             <div className="absolute top-0 left-0 w-full h-[200%] bg-[radial-gradient(circle_at_center,_transparent,_#500)] animate-[spin_20s_linear_infinite] opacity-50" />
                        </div>
                    );
                } else if (step.mood === 'calm') {
                    return (
                        <div className="absolute inset-0 z-0 opacity-20">
                             <div className="absolute inset-0 bg-blue-900/40 mix-blend-overlay" />
                             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-400/10 to-transparent animate-pulse" />
                        </div>
                    );
                } else if (step.mood === 'urgent') {
                    return (
                        <div className="absolute inset-0 z-0 opacity-30">
                             <div className="absolute inset-0 bg-amber-900/40 mix-blend-overlay" />
                             {/* Flash effect */}
                             <div className="absolute inset-0 bg-white/5 animate-ping mx-auto my-auto w-10 h-10 rounded-full" />
                        </div>
                    );
                }
                return null;
            })()}
          </div>

          {/* Bottom Black Bar */}
          <motion.div 
            initial={{ y: 150 }}
            animate={{ y: 0 }}
            onClick={advanceCutscene}
            className="w-full min-h-[22vh] bg-[#0c0c0c] border-t border-neutral-900 pointer-events-auto cursor-pointer p-6 md:p-8 flex flex-col justify-center relative shadow-[0_-15px_35px_rgba(0,0,0,0.8)] z-10"
          >
            {(() => {
                const step = (CUTSCENES[cutsceneId] || [])[cutsceneLineIdx] || { speaker: 'Narrator', text: '', mood: 'calm' };
                let moodBorder = "border-amber-600/25";
                let textGlow = "";
                if (step.mood === 'sinister') {
                    moodBorder = "border-red-600/40 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                    textGlow = "hover:text-red-200";
                } else if (step.mood === 'urgent') {
                    moodBorder = "border-yellow-600/40 text-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
                }
                
                return (
                  <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-5">
                    <div className="shrink-0 flex items-center gap-2">
                      <div className={`px-4 py-1.5 rounded bg-black/80 border ${moodBorder} font-mono text-xs uppercase tracking-[0.2em] font-black text-amber-500 pr-6 shadow-md`}>
                        {step.speaker}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-base md:text-lg lg:text-xl text-neutral-200 font-sans tracking-wide leading-relaxed font-light ${textGlow}`}>
                        {step.text.slice(0, cutsceneChars)}{cutsceneChars < step.text.length ? '▍' : ''}
                      </p>
                    </div>
                  </div>
                );
            })()}

            <div className="absolute bottom-4 right-12 text-[9px] uppercase font-mono tracking-widest text-amber-600/70 select-none animate-pulse">
              Click or Space / Enter to advance ➔
            </div>
          </motion.div>
        </div>
      )}

      {/* --- Narrator Overlay --- */}
      {dialogId !== null && gameState === 'playing' && !menuOpen && (() => {
        const isWarden = dialogId.toLowerCase().includes('warden');
        const defaultSpeaker = isWarden ? 'Order Warden' : 'Villager';
        const defaultText = isWarden 
          ? 'Maintain full moon focus! Forest demons have been very active lately.' 
          : 'Thank goodness we have the Moonflow Order protecting our humble village!';
        const defaultMood = isWarden ? 'urgent' : 'calm';

        const line = (DIALOGUES[dialogId] || [
          { speaker: defaultSpeaker, text: defaultText, mood: defaultMood }
        ])[dialogLineIdx] || { speaker: defaultSpeaker, text: defaultText, mood: defaultMood };
        
        let moodClass = "border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.1)]";
        let iconColor = "text-yellow-500";
        switch (line.mood) {
           case 'urgent': moodClass = "border-red-500/50 shadow-[0_0_40px_rgba(255,0,0,0.3)]"; iconColor = "text-red-500"; break;
           case 'sinister': moodClass = "border-purple-500/50 shadow-[0_0_40px_rgba(128,0,128,0.3)]"; iconColor = "text-purple-500"; break;
           case 'calm': moodClass = "border-blue-500/50 shadow-[0_0_40px_rgba(0,100,255,0.3)]"; iconColor = "text-blue-500"; break;
           case 'excited': moodClass = "border-yellow-500/50 shadow-[0_0_40px_rgba(255,255,0,0.3)]"; iconColor = "text-yellow-400"; break;
           case 'sad': moodClass = "border-gray-500/50 shadow-[0_0_40px_rgba(128,128,128,0.3)]"; iconColor = "text-gray-400"; break;
        }

        return (
         <div 
           className="absolute inset-0 z-40 bg-black/45 backdrop-blur-[2px] flex flex-col justify-end p-4 md:p-8 cursor-pointer pointer-events-auto"
           onClick={advanceDialog}
         >
           <div 
             onClick={(e) => { e.stopPropagation(); advanceDialog(); }}
             className={`w-full max-w-4xl mx-auto mb-6 md:mb-12 bg-[#0c0c0c]/98 border-2 p-6 md:p-8 rounded-xl relative hover:border-amber-500/40 transition-colors shadow-2xl cursor-default ${moodClass}`}
           >
             <div className="flex items-start space-x-4">
               <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Star className={`${iconColor} w-6 h-6 animate-pulse`} />
               </div>
               <div className="flex-1">
                 <h3 className="text-amber-500 font-bold font-mono text-xs uppercase tracking-[0.2em] mb-3 border-b border-white/10 inline-block pr-8 pb-1">
                   {line.speaker}
                 </h3>
                 {selectedChoiceReply ? (
                     <p className="text-base md:text-xl text-amber-200 font-sans leading-relaxed tracking-wide min-h-[3rem] select-none text-gray-205 italic">
                       "{selectedChoiceReply.slice(0, dialogChars)}{dialogChars < selectedChoiceReply.length ? '▍' : ''}"
                     </p>
                 ) : (
                     <p className="text-base md:text-xl text-gray-100 font-sans leading-relaxed tracking-wide min-h-[3rem] select-none text-gray-205">
                       {line.text.slice(0, dialogChars)}{dialogChars < line.text.length ? '▍' : ''}
                     </p>
                 )}
                 
                 {/* Display Choices if at last line of dialog and no choice made yet */}
                 {dialogId && DIALOGUE_CHOICES[dialogId] && dialogLineIdx >= (DIALOGUES[dialogId]?.length || 0) - 1 && selectedChoiceReply === null && dialogChars >= line.text.length && (
                     <div className="mt-6 flex flex-col space-y-3" onClick={e => e.stopPropagation()}>
                         <p className="font-mono text-xs text-amber-500/70 uppercase tracking-widest mb-2 border-b border-white/5 pb-1 inline-block">
                             {DIALOGUE_CHOICES[dialogId].question}
                         </p>
                         {DIALOGUE_CHOICES[dialogId].choices.map((choice, idx) => (
                             <button
                                 key={idx}
                                 onClick={() => {
                                     if (choice.effect) choice.effect(stateRef.current);
                                     setSelectedChoiceReply(choice.reply);
                                 }}
                                 className="text-left w-full max-w-2xl bg-white/5 hover:bg-amber-900/30 border border-white/10 hover:border-amber-500/50 p-3 rounded-lg font-mono text-sm tracking-wide text-gray-300 hover:text-amber-300 transition-all shadow-md group border-l-2 hover:border-l-amber-500"
                             >
                                 <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 font-bold mr-2">❯</span>
                                 {choice.text}
                             </button>
                         ))}
                     </div>
                 )}
               </div>
             </div>
             {(!dialogId || !DIALOGUE_CHOICES[dialogId] || selectedChoiceReply !== null || dialogLineIdx < (DIALOGUES[dialogId]?.length || 0) - 1) && (
                 <div className="absolute bottom-4 right-6 text-[10px] uppercase font-mono tracking-widest text-amber-500 hover:text-amber-400 font-bold animate-pulse cursor-pointer flex items-center gap-1.5 bg-amber-950/45 border border-amber-500/20 px-3 py-1 rounded-full">
                   <span>Tap / Click Anywhere to Continue</span> ➔
                 </div>
             )}
           </div>
         </div>
        );
      })()}

      {/* --- Premium Japanese Shop & Bounty Ledger --- */}
      {activeShop !== null && (() => {
          const SHOP_INFO: Record<string, {
              name: string; proprietor: string; item: string; flavor: string; cost: number; upgradeDesc: string;
          }> = {
              merchant_ramen: { name: "Noodle Stall", proprietor: "Chef Roku", item: "Special Chashu Noodle Bowl", flavor: "A warm, slow-simmered pork bone broth with rich miso to replenish physical stamina.", cost: 40, upgradeDesc: "Noodle Attack Buff (+20% strike damage multiplier)" },
              merchant_tea: { name: "Tsujiri Tea Parlor", proprietor: "Lady Chiyo", item: "Uji Matcha Dango Combo", flavor: "Organic hand-whipped green tea served with sweet dango mochi sticks.", cost: 35, upgradeDesc: "Instantly fully restores health & permanently awards +20 Max Stamina" },
              merchant_forge: { name: "Genta's Steel Forge", proprietor: "Genta", item: "Sword Edge Polish", flavor: "Precision grindstone polish using ancestral coal coals to expand steel density.", cost: 60, upgradeDesc: "Moonsteel Sharpening (+15% permanent basic basic strike damage)" },
              merchant_mask: { name: "Traditional Ward-Masks", proprietor: "Master Iwato", item: "Dragon Fox Mask", flavor: "A ceremonial fox warding mask imbued with heavy protection runes.", cost: 50, upgradeDesc: "Tengu Critical (Permanent +2.5x critical strike output)" },
              merchant_sushi: { name: "Sushi Ginza Saku", proprietor: "Saku San", item: "Fatty Otoro Bluefin Sushi", flavor: "Surgical tuna slices that melt on the tongue, feeding the flow.", cost: 45, upgradeDesc: "Concentrator Feast (Instantly awards +150 Experience points)" },
              merchant_umbrella: { name: "Cedar & Silk Parasols", proprietor: "Aoi Chan", item: "Sturdy Umbrella Geta", flavor: "Ancient cedar-wood platform sandals bound by robust weather-proof hemp cords.", cost: 50, upgradeDesc: "Half Stamina cost on every evasive movement dash" },
              merchant_herbs: { name: "Moonpetal Apothecary", proprietor: "Ume", item: "Moonpetal Healing Elixir", flavor: "A dynamic purple extract brewed from rare medical moonpetal pollen.", cost: 55, upgradeDesc: "Dynamic passive health regeneration (+2.5 Health per second passively)" },
              merchant_sake: { name: "Red Moon Distillery", proprietor: "Kiku", item: "Sacred Moon Brew", flavor: "Fierce fire-heated sacred sake crafted in high shrines during holy spring.", cost: 75, upgradeDesc: "Flame Breathing Charge (+35% ultimate attack charging speed)" }
          };
          
          const s = stateRef.current;
          const currentLevel = s.swordRefinements || 0;

          let info = { ...SHOP_INFO[activeShop] };
          if (activeShop === 'merchant_forge') {
              if (currentLevel >= 5) {
                  info.item = "Moonsteel Blade Refinement V (MAX)";
                  info.upgradeDesc = "Moonsteel blade polished and refined to ultimate grade power (+125% Slash Damage). Weapon length and elemental trails are maximized.";
                  info.cost = 9999;
              } else {
                  const romanDigits = ["I", "II", "III", "IV", "V"];
                  info.item = `Moonsteel Blade Refinement ${romanDigits[currentLevel]}`;
                  info.upgradeDesc = `Polish and temper the steel further. Maximizes weapon dimensions, damage (+25% per level), and yields larger breathing particle trails. (Current: level ${currentLevel}/5, Damage: +${currentLevel * 25}%)`;
                  info.cost = 45 + currentLevel * 15;
              }
          }

          if (!info) return null;
          
          let alreadyOwned = false;
          if (activeShop === 'merchant_ramen') alreadyOwned = s.ramenBuffActive;
          else if (activeShop === 'merchant_forge') alreadyOwned = currentLevel >= 5;
          else if (activeShop === 'merchant_mask') alreadyOwned = s.critDamageMult > 2.0;
          else if (activeShop === 'merchant_umbrella') alreadyOwned = s.umbrellaGetaActive;
          else if (activeShop === 'merchant_herbs') alreadyOwned = s.moonpetalHealActive;
          else if (activeShop === 'merchant_sake') alreadyOwned = s.spiritFocusMult > 1.0;
          
          const quest = quests[activeShop];
          
          // Transaction Handler
          const handlePurchase = () => {
              if (s.mon < info.cost) {
                  audioManager.playDamage?.(); // error sound
                  return;
              }
              s.mon -= info.cost;
              setMon(s.mon);
              
              if (activeShop === 'merchant_ramen') { s.ramenBuffActive = true; }
              else if (activeShop === 'merchant_tea') {
                  s.health = s.maxHealth; s.stamina = s.maxStamina;
                  setHealth(s.maxHealth); setStamina(s.maxStamina);
                  s.maxStamina = (s.maxStamina || 100) + 20;
              }
              else if (activeShop === 'merchant_forge') { 
                  s.swordRefinements = currentLevel + 1;
                  s.slashDamageMult = 1.0 + (currentLevel + 1) * 0.25;
                  spawnParticlesRef.current?.(s.position, 0x00ffff, 35, 'thunder');
              }
              else if (activeShop === 'merchant_mask') { s.critDamageMult = 2.5; }
              else if (activeShop === 'merchant_sushi') {
                  s.xp += 150;
                  let req = s.level * 100;
                  if (s.xp >= req) {
                      s.xp -= req;
                      s.level += 1;
                      audioManager.playLevelUp();
                      setTipModal({ title: "Level Up / Promotion!", text: `You are now Level ${s.level}!` });
                  }
              }
              else if (activeShop === 'merchant_umbrella') { s.umbrellaGetaActive = true; }
              else if (activeShop === 'merchant_herbs') { s.moonpetalHealActive = true; }
              else if (activeShop === 'merchant_sake') { s.spiritFocusMult = 1.35; }
              
              (audioManager as any).playCrit?.();
              spawnParticlesRef.current?.(s.position, 0xffaa00, 20, 'wind');
              saveGameData();
          };
          
          // Quest Actions
          const handleQuestAction = (questId?: string) => {
              const qId = questId || activeShop;
              const targetQuest = quests[qId];
              if (!targetQuest) return;

              if (targetQuest.status === 'available') {
                  setQuests(prev => ({
                      ...prev,
                      [qId]: { ...prev[qId], status: 'active' }
                  }));
                  setAcceptedQuests(prev => Array.from(new Set([...prev, qId])));
                  (audioManager as any).playSlash?.();
              } else if (targetQuest.status === 'claimable') {
                  // claim rewards!
                  s.mon += targetQuest.rewardMon;
                  s.xp += targetQuest.rewardXp;
                  setMon(s.mon);
                  
                  let req = s.level * 100;
                  if (s.xp >= req) {
                      s.xp -= req;
                      s.level += 1;
                      audioManager.playLevelUp();
                      setTipModal({ title: "Level Up & Promotion!", text: `Congratulations! You climbed to Level ${s.level} and gained stronger stats!` });
                  }
                  
                  setQuests(prev => ({
                      ...prev,
                      [qId]: { ...prev[qId], status: 'completed' }
                  }));
                  
                  (audioManager as any).playCrit?.();
                  spawnParticlesRef.current?.(s.position, 0xffff00, 30, 'thunder');
                  saveGameData();
              }
          };

          return (
              <div id="shop-overlay" className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md z-45 flex flex-col items-center justify-center p-4 text-white font-sans pointer-events-auto">
                  
                  {/* Ledger Board Frame */}
                  <div className="w-full max-w-4xl bg-neutral-900 border-2 border-amber-900/50 shadow-[0_0_50px_rgba(217,119,6,0.15)] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                      
                      {/* Top Shop Banner */}
                      <div className="bg-amber-950/40 p-6 border-b border-amber-900/40 flex items-center justify-between">
                          <div>
                              <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-amber-500">Traditional Merchant Guild</span>
                              <h2 className="text-2xl md:text-3xl font-serif font-black tracking-wide text-amber-100 flex items-center gap-2">
                                  <ShoppingBag className="w-6 h-6 text-amber-500" />
                                  {info.name}
                              </h2>
                              <p className="text-xs text-neutral-400 mt-1 italic">Proprietor: <strong className="text-neutral-200">{info.proprietor}</strong> — &ldquo;{info.flavor}&rdquo;</p>
                          </div>
                          
                          <button 
                              id="btn-close-shop"
                              onClick={() => { setActiveShop(null); audioManager.playSlash?.(); }}
                              className="p-2 hover:bg-white/10 rounded-full transition-colors border border-white/10"
                          >
                              <X className="w-6 h-6 text-neutral-400 hover:text-white" />
                          </button>
                      </div>

                      {/* Header Currency Purse */}
                      <div className="bg-neutral-950/80 px-6 py-3 border-b border-white/5 flex items-center justify-between text-sm">
                          <span className="text-neutral-400 font-mono">Your Coin Purse:</span>
                          <span className="flex items-center gap-1.5 font-mono text-base font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                              <Coins className="w-4 h-4" /> {mon} 文 (Mon)
                          </span>
                      </div>

                      {/* Split Bento Panels */}
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                          
                          {/* Left Panel: Buy / Purchase Upgrade */}
                          <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                              <div>
                                  <h3 className="text-xs tracking-[0.2em] font-mono uppercase text-amber-400 mb-3 border-b border-white/5 pb-2">Trading Counter</h3>
                                  <div className="flex items-start gap-4">
                                      <div className="w-14 h-14 bg-amber-950/20 border border-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-400">
                                          <ShoppingBag className="w-8 h-8" />
                                      </div>
                                      <div>
                                          <h4 className="text-lg font-serif font-bold text-white">{info.item}</h4>
                                          <p className="text-xs text-neutral-400 mt-1 min-h-[3rem]">{info.upgradeDesc}</p>
                                      </div>
                                  </div>
                              </div>

                              <div className="mt-8 border-t border-white/5 pt-4">
                                  <div className="flex items-center justify-between text-sm mb-4">
                                      <span className="text-neutral-400 font-mono">Purchase Cost:</span>
                                      <span className="font-mono text-yellow-400 font-extrabold flex items-center gap-1">{info.cost} 文 Mon</span>
                                  </div>
                                  
                                  {alreadyOwned ? (
                                      <button disabled className="w-full py-3 bg-neutral-800 text-neutral-400 rounded-lg font-mono text-xs uppercase tracking-wider border border-white/5 flex items-center justify-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Upgrade Already Active
                                      </button>
                                  ) : (
                                      <button 
                                          id="btn-buy-goods"
                                          onClick={handlePurchase}
                                          disabled={mon < info.cost}
                                          className={`w-full py-3 font-mono text-xs uppercase tracking-wider rounded-lg transition-all border flex items-center justify-center gap-2 ${mon >= info.cost ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]' : 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed'}`}
                                      >
                                          Buy Premium Goods
                                      </button>
                                  )}
                              </div>
                          </div>

                          {/* Right Panel: Eclipse Bounty / Quest */}
                          {quest && (
                              <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                                  <div>
                                      <h3 className="text-xs tracking-[0.2em] font-mono uppercase text-red-400 mb-3 border-b border-white/5 pb-2">Eclipse Bounty Quest</h3>
                                      <div className="flex items-start gap-4">
                                          <div className="w-14 h-14 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0 text-red-400">
                                              <Award className="w-8 h-8" />
                                          </div>
                                          <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                  <h4 className="text-lg font-serif font-bold text-white">{quest.title}</h4>
                                                  
                                                  {/* Badge Status */}
                                                  {quest.status === 'available' && <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 font-mono text-[9px] rounded uppercase border border-neutral-700">Enlistable</span>}
                                                  {quest.status === 'active' && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 font-mono text-[9px] rounded uppercase border border-blue-500/30 animate-pulse">In Progress</span>}
                                                  {quest.status === 'claimable' && <span className="px-2 py-0.5 bg-yellow-950/40 text-yellow-400 font-mono text-[9px] rounded uppercase border border-yellow-500/40 animate-bounce">Claimable</span>}
                                                  {quest.status === 'completed' && <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 font-mono text-[9px] rounded uppercase border border-emerald-500/40">Succeeded</span>}
                                              </div>
                                              <p className="text-xs text-neutral-400 mt-1">{quest.desc}</p>
                                          </div>
                                      </div>

                                      {/* Quest Progress Bar */}
                                      {quest.status !== 'available' && (
                                          <div className="mt-5 bg-neutral-900 border border-white/5 p-3 rounded-lg">
                                              <div className="flex justify-between text-xs font-mono mb-1 text-neutral-400">
                                                  <span>Assessment:</span>
                                                  <span className="text-white">{Math.min(quest.current, quest.target)} / {quest.target}</span>
                                              </div>
                                              <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-white/5">
                                                  <div 
                                                      className={`h-full transition-all duration-300 ${quest.status === 'completed' ? 'bg-emerald-500' : (quest.status === 'claimable' ? 'bg-yellow-400' : 'bg-sky-500')}`}
                                                      style={{ width: `${(Math.min(quest.current, quest.target) / quest.target) * 100}%` }}
                                                  />
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  <div className="mt-5 border-t border-white/5 pt-4">
                                      <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4">
                                          <div className="bg-neutral-950/60 p-2 rounded border border-white/5">
                                              <p className="text-neutral-500 uppercase text-[9px]">Mon Payout</p>
                                              <p className="text-yellow-400 text-sm font-bold flex items-center gap-1 mt-0.5">+{quest.rewardMon} 文</p>
                                          </div>
                                          <div className="bg-neutral-950/60 p-2 rounded border border-white/5">
                                              <p className="text-neutral-500 uppercase text-[9px]">XP Reward</p>
                                              <p className="text-blue-400 text-sm font-bold flex items-center gap-1 mt-0.5">+{quest.rewardXp} XP</p>
                                          </div>
                                      </div>

                                      {/* Action Buttons */}
                                      {quest.status === 'available' && (
                                          <button 
                                              id="btn-accept-quest"
                                              onClick={handleQuestAction}
                                              className="w-full py-3 bg-neutral-800 text-white hover:bg-neutral-700 transition-colors rounded-lg font-mono text-xs uppercase tracking-wider border border-white/10 flex items-center justify-center gap-2 pointer-events-auto"
                                          >
                                              Enlist Warden Bounty
                                          </button>
                                      )}

                                      {quest.status === 'active' && (
                                          <button disabled className="w-full py-3 bg-neutral-900 border border-neutral-800 text-neutral-500 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                              Bounty Challenge In Progress
                                          </button>
                                      )}

                                      {quest.status === 'claimable' && (
                                          <button 
                                              id="btn-claim-quest"
                                              onClick={handleQuestAction}
                                              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-neutral-950 transition-colors font-bold font-mono text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 pointer-events-auto animate-bounce shadow-[0_0_20px_rgba(234,179,8,0.5)] border border-yellow-300"
                                          >
                                              Claim Quest Reward ➔
                                          </button>
                                      )}

                                      {quest.status === 'completed' && (
                                          <button disabled className="w-full py-3 bg-neutral-900 border border-neutral-800 text-emerald-500/50 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bounty Completed
                                          </button>
                                      )}
                                  </div>
                              </div>
                          )}

                      </div>

                      {/* Paper Footer guidelines */}
                      <div className="bg-neutral-950 border-t border-white/5 px-6 py-4 text-center text-xs text-neutral-500 font-mono">
                          Press <kbd className="px-1.5 py-0.5 bg-neutral-900 text-neutral-400 border border-white/10 rounded">ESC</kbd> or click the <kbd className="px-1.5 py-0.5 bg-neutral-900 text-neutral-400 border border-white/10 rounded">X</kbd> to return to active game exploration.
                      </div>

                  </div>
              </div>
          );
      })()}

      {/* --- Game Over & Victory States --- */}
      {gameState === 'gameover' && (() => {
         const penalty = mon >= 5 ? 5 : mon;
         return (
           <div className="absolute inset-0 z-50 bg-red-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000 select-none">
             <ShieldAlert className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(255,0,0,1)]" />
             <h2 className="text-6xl md:text-8xl font-black text-white font-sans drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] uppercase tracking-[0.2em] mb-4">
               Slain
             </h2>
             <p className="max-w-md text-gray-300 font-sans text-sm md:text-base leading-relaxed tracking-wide mb-8">
               Your physical shell was shattered. The moonpetal blossoms guide your wandering spirit back to safety in the Village.
             </p>
             
             <div className="bg-red-950/50 border border-red-500/20 px-6 py-4 rounded-xl mb-8 font-mono">
               <div className="text-xs text-red-400 uppercase tracking-widest mb-1 font-bold">Moonpetal Preservation</div>
               {penalty > 0 ? (
                 <div className="text-sm text-gray-200 flex items-center justify-center gap-1.5 font-bold">
                   <span>Penalty:</span>
                   <span className="text-amber-500 flex items-center bg-amber-950 px-2.5 py-0.5 rounded border border-amber-500/20">
                     <Coins className="w-3.5 h-3.5 mr-1 text-amber-500" /> -{penalty} Mon
                   </span>
                 </div>
               ) : (
                 <div className="text-sm text-green-400 font-bold">
                   No coins held (Free Respawn)
                 </div>
               )}
             </div>

             <div className="flex flex-col md:flex-row gap-4 items-center">
               <button 
                 onClick={handleRespawn} 
                 className="px-8 py-4 bg-red-800 text-white font-bold font-mono uppercase tracking-widest hover:bg-red-700 hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] border border-red-500 rounded transition-all duration-300 scale-100 hover:scale-105 active:scale-95"
               >
                  Respawn in Village
               </button>
               <button 
                 onClick={() => setGameState('menu')} 
                 className="px-6 py-3 bg-transparent text-gray-400 font-bold font-mono uppercase tracking-widest hover:text-white hover:bg-white/5 border border-white/10 rounded transition-all duration-300"
               >
                  Main Menu
               </button>
             </div>
           </div>
         );
      })()}

      {gameState === 'victory' && (
        <div className="absolute inset-0 z-50 bg-[#001122]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
          <Sword className="w-24 h-24 text-blue-400 mb-6 drop-shadow-[0_0_15px_rgba(0,100,255,1)]" />
          <h2 className="text-6xl md:text-8xl font-black text-white font-sans drop-shadow-[0_0_20px_rgba(0,100,255,0.8)] uppercase tracking-[0.2em] mb-2">
            Victory
          </h2>
          <p className="text-xl text-blue-200 font-mono tracking-widest uppercase mb-12">Rank Achieved: {RANKS[rankIndex]}</p>
          <button onClick={() => setGameState('menu')} className="mt-8 px-10 py-4 bg-white/10 text-white font-bold font-mono uppercase tracking-widest hover:bg-white/20 transition-colors rounded shadow-lg border border-white/30 backdrop-blur-md">
             Complete Mission
          </button>
        </div>
      )}

      {/* --- Controls Mapping --- */}
      {mobileMode && gameState === 'playing' && dialogId === null && !menuOpen && cutsceneId === null && (
        <MobileControls 
            onMove={(vec) => { stateRef.current.input.x = vec.x; stateRef.current.input.y = vec.y; }}
            onJump={(pressed) => { stateRef.current.input.jump = pressed; }}
            onInteract={(pressed) => { stateRef.current.input.interact = pressed; }}
            onAttack={(pressed) => { stateRef.current.input.attack = pressed; }}
            onDash={(pressed) => { stateRef.current.input.dash = pressed; }}
            onSkill1={(pressed) => { stateRef.current.input.skill1 = pressed; }}
            onSkill2={(pressed) => { stateRef.current.input.skill2 = pressed; }}
            onSkill3={(pressed) => { stateRef.current.input.skill3 = pressed; }}
        />
      )}
      
      {!mobileMode && gameState === 'playing' && dialogId === null && !menuOpen && cutsceneId === null && (
         <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md p-5 rounded-xl border border-white/10 hidden md:block z-30 shadow-2xl">
            <h4 className="text-[#aaffaa] font-mono text-xs mb-3 uppercase tracking-[0.2em] font-bold border-b border-white/10 pb-2">Combat Protocol</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-gray-400 font-mono text-[10px] tracking-widest uppercase">
                <div><strong className="text-white bg-white/10 px-1 rounded mr-2">WASD</strong> Move</div>
                <div><strong className="text-white bg-white/10 px-1 rounded mr-2">SPC</strong> Jump</div>
                <div><strong className="text-white bg-white/10 px-1 rounded mr-2">J</strong> Strike</div>
                <div><strong className="text-white bg-white/10 px-1 rounded mr-2">K</strong> Dash <span className="text-gray-500">(15)</span></div>
                <div><strong className="text-blue-400 bg-blue-900/30 px-1 rounded mr-2">O</strong> Water Wheel <span className="text-gray-500">(30)</span></div>
                <div><strong className="text-red-400 bg-red-900/30 px-1 rounded mr-2">L</strong> Fire God <span className="text-gray-500">(50)</span></div>
                <div className="col-span-2"><strong className="text-amber-400 bg-amber-950/30 px-1 rounded mr-2">U</strong> God Speed <span className="text-gray-500">(40)</span></div>
                <div className="col-span-2 pt-2 border-t border-white/5"><strong className="text-yellow-400 bg-yellow-900/30 px-1 rounded mr-2">E</strong> Interact</div>
            </div>
         </div>
      )}

      {/* Interaction Prompts in World bounds */}
      {!mobileMode && stateRef.current.nearestInteractableDist < 4.0 && gameState === 'playing' && dialogId === null && !menuOpen && cutsceneId === null && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-32 bg-black/80 border-2 border-yellow-500/60 px-6 py-3 rounded-full pointer-events-none animate-bounce shadow-[0_0_20px_rgba(255,200,0,0.3)] backdrop-blur-md z-30">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-400 font-bold">
            Press <span className="text-white bg-white/20 px-2 py-0.5 rounded mx-1">E</span>
          </p>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
           <div className="w-full max-w-xl bg-gray-900 border border-white/10 p-6 md:p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,1)] flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                 <h2 className="text-2xl font-mono font-bold uppercase tracking-widest text-[#dcae7a]">Environment & Audio</h2>
                 <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-white pb-2 flex items-center justify-center pointer-events-auto">
                    <X className="w-8 h-8" />
                 </button>
              </div>

              <div className="space-y-8 pointer-events-auto select-auto">
                 {/* Env Settings */}
                 <div>
                    <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-gray-500 mb-4 border-l-2 border-gray-600 pl-3">World Conditions</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                       <button onClick={() => setEnvWeather('clear')} className={`p-3 border rounded text-xs font-mono uppercase tracking-widest ${envWeather === 'clear' ? 'bg-blue-900/50 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'} hover:bg-white/10`}>Clear Setup</button>
                       <button onClick={() => setEnvWeather('rain')} className={`p-3 border rounded text-xs font-mono uppercase tracking-widest ${envWeather === 'rain' ? 'bg-blue-900/50 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'} hover:bg-white/10`}>Gentle Rain</button>
                       <button onClick={() => setEnvWeather('snow')} className={`col-span-2 p-3 border rounded text-xs font-mono uppercase tracking-widest ${envWeather === 'snow' ? 'bg-blue-900/50 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'} hover:bg-white/10`}>Light Snow</button>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                       <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-gray-300">
                           <span>Time of Day</span>
                           <span>{Math.floor(envTime).toString().padStart(2, '0')}:00</span>
                       </div>
                       <input type="range" min="0" max="23.9" step="0.1" value={envTime} onChange={(e) => setEnvTime(parseFloat(e.target.value))} className="w-full accent-yellow-500" />
                    </div>
                 </div>

                 {/* Volume Sliders */}
                 <div>
                    <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-gray-500 mb-4 border-l-2 border-gray-600 pl-3">Acoustics</h3>
                    
                    <div className="space-y-5">
                       <div className="flex flex-col gap-2">
                           <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-gray-300">
                               <span>Master Volume</span>
                               <span>{Math.round(volMaster * 100)}%</span>
                           </div>
                           <input type="range" min="0" max="1" step="0.05" value={volMaster} onChange={(e) => setVolMaster(parseFloat(e.target.value))} className="w-full accent-[#dcae7a]" />
                       </div>

                       <div className="flex flex-col gap-2">
                           <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-gray-300">
                               <span>Music</span>
                               <span>{Math.round(volMusic * 100)}%</span>
                           </div>
                           <input type="range" min="0" max="1" step="0.05" value={volMusic} onChange={(e) => setVolMusic(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                       </div>

                       <div className="flex flex-col gap-2">
                           <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-gray-300">
                               <span>Sound Effects</span>
                               <span>{Math.round(volSfx * 100)}%</span>
                           </div>
                           <input type="range" min="0" max="1" step="0.05" value={volSfx} onChange={(e) => setVolSfx(parseFloat(e.target.value))} className="w-full accent-red-500" />
                       </div>

                       <div className="flex flex-col gap-2">
                           <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-gray-300">
                               <span>Ambient (Rain & Wind)</span>
                               <span>{Math.round(volAmbient * 100)}%</span>
                           </div>
                           <input type="range" min="0" max="1" step="0.05" value={volAmbient} onChange={(e) => setVolAmbient(parseFloat(e.target.value))} className="w-full accent-[#b6d0e2]" />
                       </div>
                    </div>
                 </div>

              </div>
           </div>
        </div>
      )}

      <AnimatePresence>
        {saveToastVisible && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            className="absolute top-24 left-1/2 z-50 bg-blue-950/90 border border-blue-500 text-blue-100 px-6 py-4 rounded-xl shadow-[0_0_35px_rgba(59,130,246,0.5)] backdrop-blur-md flex items-center gap-3 font-mono text-sm max-w-sm pointer-events-none"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <div className="font-bold uppercase tracking-wider text-green-400 font-mono">Progression Secured</div>
              <div className="text-xs text-blue-300">Your journey was safely sealed. It can be resumed anytime!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
