const patterns = {
  '4-2-6': [
    { phase: 'inhale', label: 'Inhale', seconds: 4, tone: 432 },
    { phase: 'hold', label: 'Hold gently', seconds: 2, tone: 523 },
    { phase: 'exhale', label: 'Exhale', seconds: 6, tone: 392 }
  ],
  '4-4-4-4': [
    { phase: 'inhale', label: 'Inhale', seconds: 4, tone: 432 },
    { phase: 'hold', label: 'Hold gently', seconds: 4, tone: 523 },
    { phase: 'exhale', label: 'Exhale', seconds: 4, tone: 392 },
    { phase: 'hold2', label: 'Rest', seconds: 4, tone: 466 }
  ],
  '4-7-8': [
    { phase: 'inhale', label: 'Inhale', seconds: 4, tone: 432 },
    { phase: 'hold', label: 'Hold gently', seconds: 7, tone: 523 },
    { phase: 'exhale', label: 'Long exhale', seconds: 8, tone: 349 }
  ],
  '5-5-5': [
    { phase: 'inhale', label: 'Inhale', seconds: 5, tone: 432 },
    { phase: 'hold', label: 'Rest', seconds: 5, tone: 494 },
    { phase: 'exhale', label: 'Exhale', seconds: 5, tone: 392 }
  ]
};

export function createBreathingController({ elements, audio, onCycle, onMessage }) {
  let running = false;
  let runId = 0;
  let sessionCycles = 0;

  function wait(milliseconds, activeRunId) {
    return new Promise((resolve) => {
      const started = performance.now();
      const tick = () => {
        if (!running || activeRunId !== runId) return resolve(false);
        if (performance.now() - started >= milliseconds) return resolve(true);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function showPhase(phase, remaining, duration, progress) {
    elements.orb.dataset.phase = phase.phase;
    elements.orb.style.setProperty('--breath-duration', `${duration}s`);
    elements.cue.textContent = phase.label;
    elements.seconds.textContent = String(remaining);
    elements.ring.style.setProperty('--progress', String(progress));
  }

  function resetVisual(message = 'Ready') {
    elements.orb.removeAttribute('data-phase');
    elements.cue.textContent = message;
    elements.seconds.textContent = '—';
    elements.ring.style.setProperty('--progress', '0');
  }

  function stop(showMessage = true) {
    running = false;
    runId += 1;
    elements.start.disabled = false;
    elements.pause.disabled = true;
    elements.start.textContent = sessionCycles > 0 ? 'Start again' : 'Start session';
    resetVisual(sessionCycles > 0 ? 'Paused' : 'Ready');
    audio.stopAmbient();
    if (showMessage) onMessage('Breathing paused. Continue whenever you are ready.');
  }

  async function start() {
    if (running) return;
    running = true;
    runId += 1;
    const activeRunId = runId;
    sessionCycles = 0;
    elements.sessionCycles.textContent = '0';
    elements.sessionProgress.style.width = '0%';
    elements.start.disabled = true;
    elements.pause.disabled = false;
    elements.start.textContent = 'Session running';

    const goal = Number(elements.goal.value);
    const speed = Number(elements.speed.value);
    const sequence = patterns[elements.pattern.value] || patterns['4-2-6'];
    const totalSeconds = sequence.reduce((sum, phase) => sum + phase.seconds, 0);
    audio.ensureContext();
    audio.startAmbient(elements.soundscape.value);

    while (running && activeRunId === runId && sessionCycles < goal) {
      let elapsed = 0;
      for (const phase of sequence) {
        if (!running || activeRunId !== runId) break;
        const duration = phase.seconds / speed;
        audio.chime(phase.tone, 0.18, 0.026);
        for (let remaining = phase.seconds; remaining >= 1; remaining -= 1) {
          if (!running || activeRunId !== runId) break;
          const progress = ((elapsed + phase.seconds - remaining) / totalSeconds) * 100;
          showPhase(phase, remaining, duration, progress);
          const completed = await wait(1000 / speed, activeRunId);
          if (!completed) break;
        }
        elapsed += phase.seconds;
      }

      if (!running || activeRunId !== runId) break;
      sessionCycles += 1;
      elements.sessionCycles.textContent = String(sessionCycles);
      elements.sessionProgress.style.width = `${Math.min(100, (sessionCycles / goal) * 100)}%`;
      onCycle();
    }

    if (running && sessionCycles >= goal) {
      stop(false);
      elements.cue.textContent = 'Complete';
      elements.seconds.textContent = '✓';
      elements.ring.style.setProperty('--progress', '100');
      audio.chime(659, 0.26, 0.04);
      window.setTimeout(() => audio.chime(784, 0.28, 0.035), 130);
      onMessage('Session complete. Your garden grew a little.');
    }
  }

  return {
    start,
    stop,
    isRunning: () => running,
    resetSession() {
      sessionCycles = 0;
      elements.sessionCycles.textContent = '0';
      elements.sessionProgress.style.width = '0%';
      resetVisual();
    }
  };
}
