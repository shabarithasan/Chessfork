export function playSound(name: string) {
  try {
    const audio = new Audio(`/sounds/standard/${name}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}
