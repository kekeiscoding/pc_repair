let pashLine = 'Hey, I’m PASH. This workstation stopped booting after it was moved. The next class needs it for their practical exam, so let’s check the hardware and get Windows running.';
let pashVoice = false;

function pashMarkup() {
  return '<aside class="pash-dialogue" aria-label="PASH, your lab partner"><img src="pash-logo.png" width="54" height="54" alt=""><div><span class="pash-name">PASH <small>LAB PARTNER</small></span><p aria-live="polite">' + pashLine + '</p></div></aside>';
}

function speakPash() {
  if (!pashVoice) return;
  window.speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(pashLine);
  line.lang = 'en';
  line.rate = .95;
  window.speechSynthesis.speak(line);
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
  else window.speechSynthesis.cancel();
}

const voiceButton = document.querySelector('#pash-voice');
if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
  voiceButton.hidden = false;
  voiceButton.title = 'Reads PASH’s dialogue using your browser voice.';
  voiceButton.addEventListener('click', () => setPashVoice(!pashVoice));
}

