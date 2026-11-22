let pashLine = 'Hey, I’m PASH. This workstation stopped booting after it was moved. The next class needs it for their practical exam, so let’s check the hardware and get Windows running.';
let pashVoice = false;
const pashPlayback = new Audio();
const pashHasBrowserVoice = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const pashDialogue = document.querySelector('.pash-dialogue');
const pashCaption = pashDialogue.querySelector('p');
const pashMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let pashCaptionAnimation;

function showPashDialogue() {
  pashCaption.textContent = pashLine;
  pashDialogue.hidden = false;
}

function speakPash() {
  if (!pashVoice) return;
  stopPashSpeech();
  const text = pashLine;
  const recording = pashVoiceFiles[text];
  if (recording) {
    pashPlayback.src = 'voice/' + recording;
    pashPlayback.play().catch(error => {
      if (error.name !== 'AbortError' && pashVoice && text === pashLine) speakWithBrowserVoice(text);
    });
  } else {
    speakWithBrowserVoice(text);
  }
}

function speakWithBrowserVoice(text) {
  if (!pashHasBrowserVoice) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en';
  utterance.rate = .95;
  window.speechSynthesis.speak(utterance);
}

function stopPashSpeech() {
  pashPlayback.pause();
  if (pashHasBrowserVoice) window.speechSynthesis.cancel();
}

function pashSay(line, speak = true) {
  if (pashLine !== line) {
    pashLine = line;
    pashCaption.textContent = line;
    pashCaptionAnimation?.cancel();
    if (!pashMotion.matches) {
      pashCaptionAnimation = pashCaption.animate?.([
        {opacity: .25, transform: 'translateY(7px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 290, easing: 'cubic-bezier(.2,.75,.25,1)'});
    }
  }
  if (speak) speakPash();
}

function setPashVoice(enabled) {
  pashVoice = enabled;
  voiceButton.textContent = enabled ? 'PASH voice on' : 'PASH voice off';
  voiceButton.setAttribute('aria-pressed', enabled);
  if (pashVoice) speakPash();
  else stopPashSpeech();
}

const voiceButton = document.querySelector('#pash-voice');
if (pashPlayback.canPlayType('audio/mpeg') || pashHasBrowserVoice) {
  voiceButton.hidden = false;
  voiceButton.title = 'Play PASH’s dialogue. On-demand hints may use your browser voice.';
  voiceButton.addEventListener('click', () => setPashVoice(!pashVoice));
}

