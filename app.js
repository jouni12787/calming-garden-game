import { AudioEngine } from './audio.js';
import { createBreathingController } from './breathing.js';

const STORAGE = {
  theme: 'calmGarden.theme', sound: 'calmGarden.sound', soundscape: 'calmGarden.soundscape',
  pattern: 'calmGarden.pattern', goal: 'calmGarden.goal', speed: 'calmGarden.speed',
  cycles: 'calmGarden.cycles', growth: 'calmGarden.growth', popped: 'calmGarden.popped',
  reflectionIndex: 'calmGarden.reflectionIndex', reflectionNote: 'calmGarden.reflectionNote'
};

const store = {
  get(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* storage is optional */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* storage is optional */ }
  }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  soundOn: store.get(STORAGE.sound, 'true') !== 'false',
  cycles: Number(store.get(STORAGE.cycles, '0')) || 0,
  growth: Number(store.get(STORAGE.growth, '0')) || 0,
  popped: Number(store.get(STORAGE.popped, '0')) || 0,
  groundingIndex: -1,
  quickTimer: null,
  bubbleTimers: new Set(),
  reflectionIndex: Number(store.get(STORAGE.reflectionIndex, '0')) || 0
};

const elements = {
  theme: $('#themeSelect'), sound: $('#soundToggle'), soundIcon: $('#soundIcon'), soundLabel: $('#soundLabel'),
  totalCycles: $('#totalCycles'), gardenStage: $('#gardenStage'), totalPopped: $('#totalPopped'),
  gardenStageDetail: $('#gardenStageDetail'), gardenGrowth: $('#gardenGrowth'), poppedDetail: $('#poppedDetail'),
  resetProgress: $('#resetProgress'), tabs: $$('.activity-tabs [role="tab"]'), panels: $$('.activity-panel'),
  activityShell: $('.activity-shell'), pattern: $('#patternSelect'), goal: $('#cycleGoal'), speed: $('#speedRange'),
  speedValue: $('#speedValue'), soundscape: $('#soundscapeSelect'), breathStart: $('#breathStart'),
  breathPause: $('#breathPause'), breathingRing: $('#breathingRing'), breathingOrb: $('#breathingOrb'),
  breathCue: $('#breathCue'), breathSeconds: $('#breathSeconds'), sessionCycles: $('#sessionCycles'),
  sessionGoal: $('#sessionGoal'), sessionProgress: $('#sessionProgress'), groundStart: $('#groundStart'),
  quickGroundStart: $('#quickGroundStart'), groundNext: $('#groundNext'), groundStop: $('#groundStop'),
  groundStepLabel: $('#groundStepLabel'), groundNumber: $('#groundNumber'), groundTitle: $('#groundTitle'),
  groundInstruction: $('#groundInstruction'), groundTimer: $('#groundTimer'), groundTimerValue: $('#groundTimerValue'),
  plant: $('#plant'), plantStem: $('#plantStem'), plantBud: $('#plantBud'), releaseBubbles: $('#releaseBubbles'),
  clearBubbles: $('#clearBubbles'), bubbleZone: $('#bubbleZone'), reflectionPrompt: $('#reflectionPrompt'),
  reflectionNote: $('#reflectionNote'), nextPrompt: $('#nextPrompt'), saveReflection: $('#saveReflection'),
  saveStatus: $('#saveStatus'), toast: $('#toast'), supportInfo: $('#supportInfo'), supportDialog: $('#supportDialog'),
  closeSupport: $('#closeSupport'), closeSupportPrimary: $('#closeSupportPrimary')
};

const groundingSteps = [
  ['5', 'Things you can see', 'Look around slowly and name five shapes, colours, or objects.'],
  ['4', 'Things you can feel', 'Notice four physical sensations: your feet, clothing, chair, or air.'],
  ['3', 'Things you can hear', 'Listen for three sounds, even very quiet ones.'],
  ['2', 'Things you can smell', 'Notice two scents, or remember two familiar calming smells.'],
  ['1', 'Thing you can taste or appreciate', 'Notice one taste, or name one small thing you appreciate right now.']
];

const prompts = [
  'What is one small kindness you can offer yourself right now?',
  'What feels steady or supportive in this moment?',
  'Name one thing you do not have to solve today.',
  'What would “gentle enough” look like for the next hour?',
  'What can you notice in your body without trying to change it?',
  'Write one sentence you would say to a close friend in your situation.'
];

const affirmations = [
  'One breath at a time', 'Slow is allowed', 'Let your shoulders soften', 'This moment can pass',
  'You do not have to rush', 'Your pace is valid', 'Come back to your feet', 'Gentle is still progress',
  'You are here now', 'Small steps count'
];

const audio = new AudioEngine(() => state.soundOn);
let toastTimer;

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2300);
}

function stageName(growth) {
  if (growth < 2) return 'Seed';
  if (growth < 5) return 'Sprout';
  if (growth < 9) return 'Young plant';
  if (growth < 14) return 'Blooming';
  return 'Calm garden';
}

function saveProgress() {
  store.set(STORAGE.cycles, state.cycles);
  store.set(STORAGE.growth, state.growth);
  store.set(STORAGE.popped, state.popped);
}

function renderPlant() {
  $$('.plant__leaf', elements.plant).forEach((leaf) => leaf.remove());
  const count = Math.min(state.growth, 12);
  const stemHeight = 72 + Math.min(state.growth * 7, 100);
  elements.plantStem.style.height = `${stemHeight}px`;
  elements.plantBud.style.bottom = `${stemHeight - 5}px`;
  elements.plantBud.style.transform = `translateX(-50%) rotate(18deg) scale(${Math.min(0.82 + state.growth * 0.04, 1.3)})`;
  for (let index = 0; index < count; index += 1) {
    const leaf = document.createElement('span');
    const side = index % 2 === 0 ? -1 : 1;
    leaf.className = 'plant__leaf';
    leaf.style.setProperty('--angle', `${side * (34 + (index % 3) * 6)}deg`);
    leaf.style.setProperty('--bottom', `${30 + index * 10}px`);
    leaf.style.setProperty('--height', `${42 + (index % 4) * 7}px`);
    leaf.style.animationDelay = `${index * -0.25}s`;
    elements.plant.appendChild(leaf);
  }
}

function renderProgress() {
  const stage = stageName(state.growth);
  elements.totalCycles.textContent = String(state.cycles);
  elements.gardenStage.textContent = stage;
  elements.totalPopped.textContent = String(state.popped);
  elements.gardenStageDetail.textContent = stage;
  elements.gardenGrowth.textContent = String(state.growth);
  elements.poppedDetail.textContent = String(state.popped);
  renderPlant();
}

function setTheme(theme) {
  const accepted = ['forest', 'ocean', 'dusk', 'blossom'];
  const safeTheme = accepted.includes(theme) ? theme : 'forest';
  document.body.dataset.theme = safeTheme;
  elements.theme.value = safeTheme;
  store.set(STORAGE.theme, safeTheme);
  const colours = { forest: '#173c32', ocean: '#164656', dusk: '#352b56', blossom: '#503044' };
  $('meta[name="theme-color"]')?.setAttribute('content', colours[safeTheme]);
}

function updateSoundButton() {
  elements.sound.setAttribute('aria-pressed', String(state.soundOn));
  elements.sound.setAttribute('aria-label', state.soundOn ? 'Turn sound off' : 'Turn sound on');
  elements.soundIcon.textContent = state.soundOn ? '♪' : '×';
  elements.soundLabel.textContent = state.soundOn ? 'Sound on' : 'Sound off';
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  store.set(STORAGE.sound, state.soundOn);
  updateSoundButton();
  if (state.soundOn) {
    audio.chime(523, 0.16, 0.035);
    audio.startAmbient(elements.soundscape.value);
  } else {
    audio.stopAmbient();
  }
}

function openActivity(activity, scroll = true) {
  const selected = elements.tabs.find((tab) => tab.dataset.activity === activity);
  if (!selected) return;
  elements.tabs.forEach((tab) => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  elements.panels.forEach((panel) => { panel.hidden = panel.id !== `panel-${activity}`; });
  if (scroll) elements.activityShell.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

const breathing = createBreathingController({
  elements: {
    pattern: elements.pattern, goal: elements.goal, speed: elements.speed, soundscape: elements.soundscape,
    start: elements.breathStart, pause: elements.breathPause, ring: elements.breathingRing, orb: elements.breathingOrb,
    cue: elements.breathCue, seconds: elements.breathSeconds, sessionCycles: elements.sessionCycles,
    sessionProgress: elements.sessionProgress
  },
  audio,
  onCycle() {
    state.cycles += 1;
    if (state.cycles % 2 === 0) state.growth += 1;
    saveProgress();
    renderProgress();
  },
  onMessage: toast
});

function resetGrounding() {
  window.clearInterval(state.quickTimer);
  state.quickTimer = null;
  state.groundingIndex = -1;
  elements.groundStepLabel.textContent = 'Ready when you are';
  elements.groundNumber.textContent = '5';
  elements.groundTitle.textContent = 'Notice your surroundings';
  elements.groundInstruction.textContent = 'Press begin and take this one sense at a time.';
  elements.groundTimer.hidden = true;
  elements.groundStart.disabled = false;
  elements.quickGroundStart.disabled = false;
  elements.groundNext.disabled = true;
  elements.groundStop.disabled = true;
  elements.groundNext.textContent = 'Next sense';
}

function renderGrounding() {
  const step = groundingSteps[state.groundingIndex];
  if (!step) return;
  elements.groundStepLabel.textContent = `Step ${state.groundingIndex + 1} of ${groundingSteps.length}`;
  elements.groundNumber.textContent = step[0];
  elements.groundTitle.textContent = step[1];
  elements.groundInstruction.textContent = step[2];
  elements.groundNext.textContent = state.groundingIndex === groundingSteps.length - 1 ? 'Finish' : 'Next sense';
  audio.chime(494 + state.groundingIndex * 24, 0.18, 0.025);
}

function beginGrounding() {
  resetGrounding();
  state.groundingIndex = 0;
  elements.groundStart.disabled = true;
  elements.quickGroundStart.disabled = true;
  elements.groundNext.disabled = false;
  elements.groundStop.disabled = false;
  renderGrounding();
}

function nextGrounding() {
  if (state.groundingIndex < 0) return;
  if (state.groundingIndex === groundingSteps.length - 1) {
    resetGrounding();
    audio.chime(659, 0.25, 0.035);
    toast('You are back here. Take the next moment slowly.');
    return;
  }
  state.groundingIndex += 1;
  renderGrounding();
}

function beginQuickGrounding() {
  resetGrounding();
  state.groundingIndex = 0;
  let seconds = 30;
  let elapsed = 0;
  elements.groundStart.disabled = true;
  elements.quickGroundStart.disabled = true;
  elements.groundStop.disabled = false;
  elements.groundTimer.hidden = false;
  elements.groundTimerValue.textContent = String(seconds);
  renderGrounding();
  state.quickTimer = window.setInterval(() => {
    seconds -= 1;
    elapsed += 1;
    elements.groundTimerValue.textContent = String(Math.max(0, seconds));
    if (elapsed % 6 === 0 && state.groundingIndex < groundingSteps.length - 1) {
      state.groundingIndex += 1;
      renderGrounding();
    }
    if (seconds <= 0) {
      resetGrounding();
      audio.chime(659, 0.25, 0.035);
      toast('Thirty seconds complete. Notice what feels different.');
    }
  }, 1000);
}

function clearBubbles() {
  state.bubbleTimers.forEach((timer) => clearTimeout(timer));
  state.bubbleTimers.clear();
  $$('.bubble, .affirmation', elements.bubbleZone).forEach((element) => element.remove());
}

function popBubble(bubble) {
  if (!bubble.isConnected || bubble.dataset.popped) return;
  bubble.dataset.popped = 'true';
  const rect = bubble.getBoundingClientRect();
  const zone = elements.bubbleZone.getBoundingClientRect();
  const affirmation = document.createElement('span');
  affirmation.className = 'affirmation';
  affirmation.textContent = affirmations[Math.floor(Math.random() * affirmations.length)];
  affirmation.style.left = `${rect.left - zone.left + rect.width / 2}px`;
  affirmation.style.top = `${rect.top - zone.top + rect.height / 2}px`;
  bubble.remove();
  elements.bubbleZone.appendChild(affirmation);
  setTimeout(() => affirmation.remove(), 1750);
  state.popped += 1;
  saveProgress();
  renderProgress();
  audio.chime(720, 0.09, 0.026);
}

function releaseBubbles(count = 14) {
  const width = Math.max(elements.bubbleZone.clientWidth, 260);
  const height = Math.max(elements.bubbleZone.clientHeight, 180);
  for (let index = 0; index < count; index += 1) {
    const bubble = document.createElement('button');
    const size = Math.round(30 + Math.random() * 42);
    const duration = Math.round(7000 + Math.random() * 4500);
    bubble.type = 'button';
    bubble.className = 'bubble';
    bubble.setAttribute('aria-label', 'Pop calming bubble');
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.max(2, Math.random() * (width - size - 4))}px`;
    bubble.style.top = `${Math.max(8, height - size - Math.random() * 26)}px`;
    bubble.style.setProperty('--duration', `${duration}ms`);
    bubble.addEventListener('click', () => popBubble(bubble), { once: true });
    elements.bubbleZone.appendChild(bubble);
    const timer = setTimeout(() => {
      bubble.remove();
      state.bubbleTimers.delete(timer);
    }, duration + 300);
    state.bubbleTimers.add(timer);
  }
}

function renderPrompt() {
  state.reflectionIndex %= prompts.length;
  elements.reflectionPrompt.textContent = prompts[state.reflectionIndex];
  store.set(STORAGE.reflectionIndex, state.reflectionIndex);
}

function saveReflection(showMessage = true) {
  store.set(STORAGE.reflectionNote, elements.reflectionNote.value);
  elements.saveStatus.textContent = 'Saved locally just now';
  if (showMessage) toast('Reflection saved on this device.');
}

function resetProgress() {
  if (!confirm('Reset breathing, garden, and bubble progress? Your reflection note will stay saved.')) return;
  breathing.stop(false);
  breathing.resetSession();
  state.cycles = 0;
  state.growth = 0;
  state.popped = 0;
  [STORAGE.cycles, STORAGE.growth, STORAGE.popped].forEach((key) => store.remove(key));
  clearBubbles();
  renderProgress();
  toast('Your activity progress has been reset.');
}

function bindEvents() {
  elements.theme.addEventListener('change', () => setTheme(elements.theme.value));
  elements.sound.addEventListener('click', toggleSound);
  elements.resetProgress.addEventListener('click', resetProgress);
  elements.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => openActivity(tab.dataset.activity, false));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowLeft') next = (index - 1 + elements.tabs.length) % elements.tabs.length;
      if (event.key === 'ArrowRight') next = (index + 1) % elements.tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = elements.tabs.length - 1;
      elements.tabs[next].focus();
      openActivity(elements.tabs[next].dataset.activity, false);
    });
  });
  $$('[data-open-activity]').forEach((button) => button.addEventListener('click', () => openActivity(button.dataset.openActivity)));

  elements.pattern.addEventListener('change', () => { store.set(STORAGE.pattern, elements.pattern.value); if (breathing.isRunning()) breathing.stop(); });
  elements.goal.addEventListener('change', () => { store.set(STORAGE.goal, elements.goal.value); elements.sessionGoal.textContent = elements.goal.value; if (breathing.isRunning()) breathing.stop(); });
  elements.speed.addEventListener('input', () => {
    const speed = Number(elements.speed.value);
    elements.speedValue.textContent = `${speed.toFixed(2).replace(/\.00$/, '')}×`;
    store.set(STORAGE.speed, speed);
    if (breathing.isRunning()) breathing.stop();
  });
  elements.soundscape.addEventListener('change', () => { store.set(STORAGE.soundscape, elements.soundscape.value); audio.startAmbient(elements.soundscape.value); });
  elements.breathStart.addEventListener('click', breathing.start);
  elements.breathPause.addEventListener('click', () => breathing.stop());

  elements.groundStart.addEventListener('click', beginGrounding);
  elements.quickGroundStart.addEventListener('click', beginQuickGrounding);
  elements.groundNext.addEventListener('click', nextGrounding);
  elements.groundStop.addEventListener('click', () => { resetGrounding(); toast('Grounding stopped. You can return whenever you like.'); });
  elements.releaseBubbles.addEventListener('click', () => releaseBubbles());
  elements.clearBubbles.addEventListener('click', clearBubbles);

  elements.nextPrompt.addEventListener('click', () => { state.reflectionIndex = (state.reflectionIndex + 1) % prompts.length; renderPrompt(); audio.chime(523, 0.15, 0.02); });
  elements.saveReflection.addEventListener('click', () => saveReflection(true));
  elements.reflectionNote.addEventListener('input', () => {
    elements.saveStatus.textContent = 'Unsaved changes';
    clearTimeout(elements.reflectionNote.saveTimer);
    elements.reflectionNote.saveTimer = setTimeout(() => saveReflection(false), 800);
  });

  elements.supportInfo.addEventListener('click', () => elements.supportDialog.showModal());
  elements.closeSupport.addEventListener('click', () => elements.supportDialog.close());
  elements.closeSupportPrimary.addEventListener('click', () => elements.supportDialog.close());
  elements.supportDialog.addEventListener('click', (event) => { if (event.target === elements.supportDialog) elements.supportDialog.close(); });

  addEventListener('keydown', (event) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      if ($('#panel-breathe').hidden) openActivity('breathe');
      breathing.isRunning() ? breathing.stop() : breathing.start();
    }
    if (event.key.toLowerCase() === 'm') toggleSound();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && breathing.isRunning()) breathing.stop(false);
    if (document.hidden) audio.stopAmbient();
  });
}

function initialise() {
  setTheme(store.get(STORAGE.theme, 'forest'));
  updateSoundButton();
  elements.pattern.value = store.get(STORAGE.pattern, '4-2-6');
  elements.goal.value = store.get(STORAGE.goal, '5');
  elements.speed.value = store.get(STORAGE.speed, '1');
  elements.soundscape.value = store.get(STORAGE.soundscape, 'off');
  elements.speedValue.textContent = `${Number(elements.speed.value).toFixed(2).replace(/\.00$/, '')}×`;
  elements.sessionGoal.textContent = elements.goal.value;
  elements.reflectionNote.value = store.get(STORAGE.reflectionNote, '');
  if (state.reflectionIndex >= prompts.length) state.reflectionIndex = 0;
  renderProgress();
  resetGrounding();
  renderPrompt();
  bindEvents();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

initialise();
