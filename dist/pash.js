let pashLine = 'Hey, I’m PASH. This workstation stopped booting after it was moved. The next class needs it for their practical exam, so let’s check the hardware and get Windows running.';
let pashVoice = false;
const pashPlayback = new Audio();
const pashHasBrowserVoice = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function pashMarkup() {
  return '<aside class="pash-dialogue" aria-label="PASH, your lab partner"><img src="pash-logo.png" width="54" height="54" alt=""><div><span class="pash-name">PASH <small>LAB PARTNER</small></span><p aria-live="polite">' + pashLine + '</p></div></aside>';
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
  pashLine = line;
  const caption = app.querySelector('.pash-dialogue p');
  if (caption) caption.textContent = line;
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

