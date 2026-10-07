// Opening cinematic: full-bleed key-art frames with Ken Burns moves, crossfades,
// VO per frame, typewriter captions. Art drop-in = replace public/opening/*.jpg
// and (if framing changes) tweak kb here. No video files, no 3D, no new lights.
export interface OpeningFrame {
    img: string;          // path under public/
    vo: string | null;    // voice clip name from SoundEngine.VOICE_FILES (null = silent frame)
    speaker: string;
    text: string;
    // Ken Burns: scale range + x/y drift in % of frame size over the frame's duration
    kb: { scale: [number, number]; x: [number, number]; y: [number, number] };
    fallbackMs: number;   // used until the VO buffer is decoded (or when vo is null)
}

export const OPENING_FRAMES: OpeningFrame[] = [
    {
        img: 'opening/f1.jpg',
        vo: 'iwato_1',
        speaker: 'Master Iwato',
        text: 'You felt it too. The moon swells red as a wound, and the moonpetals at the gate are wilting under its light. Something on that mountain is feeding.',
        kb: { scale: [1.0, 1.12], x: [0, -2], y: [0, -3] },
        fallbackMs: 15000,
    },
    {
        img: 'opening/f2.jpg',
        vo: 'narr_intro',
        speaker: 'Narrator',
        text: 'Three nights ago, the threads came over the wall. No scream. No broken lock. Just an empty futon, and one small sandal in the snow.',
        kb: { scale: [1.06, 1.14], x: [-2.5, 2.5], y: [0, 0] },
        fallbackMs: 13500,
    },
    {
        img: 'opening/f3.jpg',
        vo: 'iwato_2',
        speaker: 'Master Iwato',
        text: 'Three nights ago the threads came over the wall and took little Yae from her bed. No scream. No broken lock. Just one small sandal in the snow. She is seven years old, Ren.',
        kb: { scale: [1.14, 1.02], x: [0, 0], y: [-2, 1] },
        fallbackMs: 18500,
    },
    {
        img: 'opening/f4.jpg',
        vo: 'iwato_farewell',
        speaker: 'Master Iwato',
        text: 'I would not send any child of mine up that mountain on a red night. So I am asking you as your teacher, Ren: end this before another house goes quiet.',
        kb: { scale: [1.02, 1.12], x: [1.5, -1.5], y: [0, -2] },
        fallbackMs: 15000,
    },
    {
        img: 'opening/f5.jpg',
        vo: 'narr_ren',
        speaker: 'Narrator',
        text: 'Ren said nothing. He bound his blade tight, bowed to his teacher, and walked through the gate into the red dark.',
        kb: { scale: [1.05, 1.15], x: [0, 0], y: [2, -3] },
        fallbackMs: 9000,
    },
    {
        img: 'opening/f6.jpg',
        vo: 'narr_climb',
        speaker: 'Narrator',
        text: 'Three cocoons. One weaver. One mountain between the moon and dawn. He climbs.',
        kb: { scale: [1.15, 1.0], x: [0, 0], y: [-2, 0] },
        fallbackMs: 8000,
    },
];
