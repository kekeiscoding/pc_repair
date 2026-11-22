let pashLine = 'Hey, I’m PASH. This workstation stopped booting after it was moved. The next class needs it for their practical exam, so let’s check the hardware and get Windows running.';
let pashVoice = false;

function pashMarkup() {
  return '<aside class="pash-dialogue" aria-label="PASH, your lab partner"><img src="pash-logo.png" width="54" height="54" alt=""><div><span class="pash-name">PASH <small>LAB PARTNER</small></span><p aria-live="polite">' + pashLine + '</p></div></aside>';
}

function speakPash() {
  if (!pashVoice || !voiceClip.paused) return;
  if (voiceClip.ended) voiceClip.currentTime = 0;
  voiceClip.play().catch(error => {
    if (error.name === 'AbortError') return;
    setPashVoice(false);
    voiceButton.title = 'The recording could not play. Select to retry.';
  });
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
  else {
    voiceClip.pause();
    voiceClip.currentTime = 0;
  }
}

const voiceButton = document.querySelector('#pash-voice');
const voiceClip = document.querySelector('#pash-voice-clip');
if (voiceClip.canPlayType('audio/mp4; codecs="mp4a.40.2"')) {
  voiceButton.hidden = false;
  voiceButton.addEventListener('click', () => {
    voiceButton.removeAttribute('title');
    setPashVoice(!pashVoice);
  });
}

