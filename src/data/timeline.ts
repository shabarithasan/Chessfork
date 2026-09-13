export interface TimelineMedia {
  id: string;
  videoUrl: string;
  title: string;
  subtitle: string;
  cta?: string;
  ctaUrl?: string;
}

export const cinematicTimeline = {
  media: [
    {
      id: "slide-01",
      videoUrl: "/cinematic/scene-01.mp4",
      title: "THE OPENING",
      subtitle: "Every master was once a beginner. Every grandmaster was once a master. The journey starts with a single move.",
      cta: "START ANALYZING",
      ctaUrl: "/analyze"
    },
    {
      id: "slide-02",
      videoUrl: "/cinematic/scene-02.mp4",
      title: "THE PSYCHOLOGY",
      subtitle: "Read the player, not just the board. Chess is a war of minds disguised as a game of pieces.",
      cta: "MEET THE COACH",
      ctaUrl: "/coach"
    },
    {
      id: "slide-03",
      videoUrl: "/cinematic/scene-03.mp4",
      title: "THE TACTIC",
      subtitle: "Precision calculation under pressure. Every fork, pin and skewer is a story of anticipation.",
      cta: "TRAIN TACTICS",
      ctaUrl: "/puzzles"
    },
    {
      id: "slide-04",
      videoUrl: "/cinematic/scene-04.mp4",
      title: "CHECKMATE",
      subtitle: "The final move is inevitable when every preceding move was intentional. This is your moment.",
      cta: "PLAY LOCAL",
      ctaUrl: "/play/local"
    }
  ] as TimelineMedia[],

  chapters: [
    { label: "01", name: "START ANALYZING" },
    { label: "02", name: "MEET THE COACH" },
    { label: "03", name: "TRAIN TACTICS" },
    { label: "04", name: "PLAY LOCAL" }
  ]
};
