export type OverlayAction = 
  | { type: 'analysis'; start: number; end: number; evaluation: string; text: string; position: { x: number; y: number } }
  | { type: 'cut-to-black'; start: number; end: number; text: string };

export interface ChapterData {
  id: string;
  videoUrl: string;
  title: string;
  subtitle: string;
  theme: 'dark' | 'light';
  actions?: OverlayAction[];
}

export const chapters: ChapterData[] = [
  {
    id: "01",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    title: "THE OPENING",
    subtitle: "A NEW ERA OF MASTERY",
    theme: "dark",
  },
  {
    id: "02",
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    title: "THE MIDGAME",
    subtitle: "COMPLEXITY MEETS CLARITY",
    theme: "dark",
    actions: [
      {
        type: 'analysis',
        start: 0.4,
        end: 0.8,
        evaluation: "+2.4",
        text: "BEST MOVE",
        position: { x: 70, y: 30 }
      }
    ]
  },
  {
    id: "03",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    title: "THE ENDGAME",
    subtitle: "PRECISION CALCULATION",
    theme: "dark",
    actions: [
      {
        type: 'cut-to-black',
        start: 0.6,
        end: 0.75,
        text: "CHESSFORK"
      }
    ]
  },
  {
    id: "04",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    title: "CHECKMATE",
    subtitle: "YOUR MOVE",
    theme: "dark",
  }
];
