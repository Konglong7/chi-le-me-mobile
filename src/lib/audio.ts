export function playWheelSpinSound() {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  void context.resume?.();

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.value = 520;
  gainNode.gain.value = 0.0001;
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.04);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
  oscillator.frequency.setValueAtTime?.(520, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime?.(180, context.currentTime + 0.8);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.82);
}
