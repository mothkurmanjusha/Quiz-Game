/* Upgraded Quiz Game script
   Features:
   - Per-question timer (auto-advance)
   - Random (shuffled) questions
   - Score summary with time taken
   - Review answers with highlights
   - Sound effects using WebAudio
   - Simple fade animations (toggle-able)
*/

(() => {
  // -----------------------
  // QUESTION BANK (editable)
  // -----------------------
  const QUESTIONS = [
    { q: "What is the capital of France?", opts: ["Paris","Rome","Madrid","Berlin"], a: 0 },
    { q: "Which planet is called the Red Planet?", opts: ["Venus","Mars","Jupiter","Saturn"], a: 1 },
    { q: "What is 9 × 7?", opts: ["56","63","72","49"], a: 1 },
    { q: "Which gas do plants primarily absorb?", opts: ["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"], a: 2 },
    { q: "The Statue of Liberty was gifted by?", opts: ["UK","Germany","France","Spain"], a: 2 },
    { q: "Which language runs in a web browser?", opts: ["Python","C++","JavaScript","Java"], a: 2 },
    { q: "Which element's chemical symbol is 'O'?", opts: ["Gold","Oxygen","Silver","Iron"], a: 1 },
    { q: "Who painted the Mona Lisa?", opts: ["Van Gogh","Picasso","Leonardo da Vinci","Rembrandt"], a: 2 },
    { q: "Speed of light is approx.?", opts: ["3 × 10^5 km/s","3 × 10^8 m/s","3 × 10^5 m/s","3 × 10^8 km/s"], a: 1 },
    { q: "Which is the smallest prime number?", opts: ["0","1","2","3"], a: 2 },
    // add more questions as needed
  ];

  // -----------------------
  // Helpers
  // -----------------------
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  // Shuffle (Fisher-Yates)
  function shuffle(arr){
    const a = arr.slice();
    for(let i = a.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // -----------------------
  // Elements
  // -----------------------
  const startScreen = $('#start-screen');
  const quizScreen = $('#quiz-screen');
  const resultScreen = $('#result-screen');
  const reviewScreen = $('#review-screen');

  const startBtn = $('#startBtn');
  const numQSelect = $('#numQ');
  const timePerQSelect = $('#timePerQ');
  const animateToggle = $('#animateToggle');

  const qCount = $('#qCount');
  const questionText = $('#questionText');
  const optionsEl = $('#options');
  const timeLabel = $('#timeLabel');
  const timerFill = $('#timerFill');
  const progressFill = $('#progressFill');
  const progressText = $('#progressText');
  const nextBtn = $('#nextBtn');
  const skipBtn = $('#skipBtn');

  const finalScore = $('#finalScore');
  const finalPercent = $('#finalPercent');
  const totalCorrect = $('#totalCorrect');
  const totalWrong = $('#totalWrong');
  const totalTimeEl = $('#totalTime');
  const reviewBtn = $('#reviewBtn');
  const playAgainBtn = $('#playAgainBtn');

  const reviewList = $('#reviewList');
  const backHomeBtn = $('#backHomeBtn');
  const playAgainBtn2 = $('#playAgainBtn2');

  // -----------------------
  // State
  // -----------------------
  let questionSet = [];
  let currentIndex = 0;
  let userAnswers = []; // {selected: idx or null, timeTaken: sec}
  let timerInterval = null;
  let timeLeft = 0;
  let timePerQuestion = 12;
  let quizStartTime = 0;
  let totalElapsed = 0;

  // -----------------------
  // Sound (WebAudio) — no external files
  // -----------------------
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playSound(type){
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if(type === 'correct'){ o.type='sine'; o.frequency.setValueAtTime(880, now); g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.2, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.28); }
    else if(type === 'wrong'){ o.type='square'; o.frequency.setValueAtTime(200, now); g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.18, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.45); }
    else { o.type='sine'; o.frequency.setValueAtTime(440, now); g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.12, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.12); }
    o.start(now); o.stop(now+0.5);
  }

  // -----------------------
  // Render functions
  // -----------------------
  function showScreen(screen){
    [startScreen, quizScreen, resultScreen, reviewScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  function renderQuestion(){
    const qObj = questionSet[currentIndex];
    qCount.textContent = `Question ${currentIndex+1} / ${questionSet.length}`;
    questionText.textContent = qObj.q;

    // animation toggle
    if(animateToggle.checked){
      questionText.classList.add('animate-fade');
      optionsEl.classList.add('animate-fade');
      setTimeout(()=>{ questionText.classList.remove('animate-fade'); optionsEl.classList.remove('animate-fade'); }, 350);
    }

    optionsEl.innerHTML = '';
    qObj.opts.forEach((opt, idx) => {
      const btn = document.createElement('div');
      btn.className = 'option';
      btn.dataset.index = idx;
      btn.innerHTML = `<div class="label">${String.fromCharCode(65+idx)}</div><div class="text">${opt}</div>`;
      btn.addEventListener('click', () => selectOption(idx, btn));
      optionsEl.appendChild(btn);
    });

    // update progress
    const percent = Math.round((currentIndex / questionSet.length) * 100);
    progressFill.style.width = percent + '%';
    progressText.textContent = `Progress ${percent}%`;

    // timer
    timeLeft = timePerQuestion;
    timeLabel.textContent = `Time: ${timeLeft}s`;
    timerFill.style.width = '100%';

    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      const pct = Math.max(0, (timeLeft / timePerQuestion) * 100);
      timerFill.style.width = pct + '%';
      timeLabel.textContent = `Time: ${timeLeft}s`;

      if(timeLeft <= 0){
        clearInterval(timerInterval);
        // mark unanswered and advance
        recordAnswer(null, timePerQuestion);
        autoAdvance();
      }
    }, 1000);
  }

  // -----------------------
  // Interactions
  // -----------------------
  function selectOption(idx, btnEl){
    if(timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    // disable further clicks
    $all('.option').forEach(o => o.style.pointerEvents = 'none');

    const qObj = questionSet[currentIndex];
    const correct = qObj.a === idx;

    // visual
    $all('.option').forEach((o, i) => {
      if(i === qObj.a) o.classList.add('correct');
      if(i === idx && i !== qObj.a) o.classList.add('wrong');
    });

    // play sound
    playSound(correct ? 'correct' : 'wrong');

    // record answer with time taken
    const timeTaken = timePerQuestion - timeLeft;
    recordAnswer(idx, timeTaken);

    // enable next
    nextBtn.disabled = false;
  }

  function recordAnswer(selected, timeTaken){
    userAnswers[currentIndex] = { selected: selected, timeTaken: timeTaken };
  }

  function autoAdvance(){
    // mark unanswered only if not already answered
    if(!userAnswers[currentIndex]) recordAnswer(null, timePerQuestion);
    // show correct option visually then move on after short delay
    $all('.option').forEach((o, i) => {
      const qObj = questionSet[currentIndex];
      if(i === qObj.a) o.classList.add('correct');
      o.style.pointerEvents = 'none';
    });
    playSound('wrong');
    nextBtn.disabled = false;
  }

  function goNext(){
    currentIndex++;
    nextBtn.disabled = true;
    if(currentIndex < questionSet.length){
      renderQuestion();
    } else {
      endQuiz();
    }
  }

  function skipQuestion(){
    if(timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    // record as skipped
    recordAnswer(null, timePerQuestion);
    // show correct then advance
    $all('.option').forEach((o, i) => {
      const qObj = questionSet[currentIndex];
      if(i === qObj.a) o.classList.add('correct');
      o.style.pointerEvents = 'none';
    });
    nextBtn.disabled = false;
  }

  // -----------------------
  // Quiz lifecycle
  // -----------------------
  startBtn.addEventListener('click', () => {
    // wake audio context on some browsers via user gesture
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const numQ = parseInt(numQSelect.value);
    timePerQuestion = parseInt(timePerQSelect.value);

    // build a random set of questions
    const max = Math.min(numQ, QUESTIONS.length);
    questionSet = shuffle(QUESTIONS).slice(0, max);
    currentIndex = 0;
    userAnswers = new Array(questionSet.length);
    quizStartTime = Date.now();

    showScreen(quizScreen);
    renderQuestion();
    nextBtn.disabled = true;
    progressFill.style.width = '0%';
    progressText.textContent = 'Progress 0%';
  });

  nextBtn.addEventListener('click', () => {
    // if user hasn't answered (but clicked Next), ensure we have an entry
    if(!userAnswers[currentIndex]) recordAnswer(null, timePerQuestion);
    goNext();
  });

  skipBtn.addEventListener('click', () => {
    skipQuestion();
  });

  function endQuiz(){
    if(timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    totalElapsed = Math.round((Date.now() - quizStartTime) / 1000);

    // compute stats
    const correctCount = userAnswers.reduce((acc, val, idx) => acc + ((val && val.selected === questionSet[idx].a) ? 1 : 0), 0);
    const wrongCount = questionSet.length - correctCount;
    const percentage = Math.round((correctCount / questionSet.length) * 100);

    finalScore.textContent = `${correctCount} / ${questionSet.length}`;
    finalPercent.textContent = `${percentage}%`;
    totalCorrect.textContent = correctCount;
    totalWrong.textContent = wrongCount;
    totalTimeEl.textContent = `${totalElapsed}s`;

    showScreen(resultScreen);
  }

  // -----------------------
  // Review
  // -----------------------
  reviewBtn.addEventListener('click', () => {
    renderReview();
    showScreen(reviewScreen);
  });

  playAgainBtn.addEventListener('click', () => {
    showScreen(startScreen);
  });

  backHomeBtn.addEventListener('click', () => showScreen(startScreen));
  playAgainBtn2.addEventListener('click', () => showScreen(startScreen));

  function renderReview(){
    reviewList.innerHTML = '';
    questionSet.forEach((qObj, idx) => {
      const ua = userAnswers[idx];
      const wrapper = document.createElement('div');
      wrapper.className = 'review-item';

      const qtext = document.createElement('div');
      qtext.className = 'qtext';
      qtext.textContent = `Q${idx+1}. ${qObj.q}`;
      wrapper.appendChild(qtext);

      const optsWrap = document.createElement('div');
      optsWrap.className = 'review-options';
      qObj.opts.forEach((opt, oi) => {
        const div = document.createElement('div');
        div.className = 'review-choice';
        if(oi === qObj.a) div.classList.add('correct');
        if(ua && ua.selected === oi && oi !== qObj.a) div.classList.add('wrong');

        div.textContent = `${String.fromCharCode(65+oi)}. ${opt}`;
        optsWrap.appendChild(div);
      });
      wrapper.appendChild(optsWrap);

      const meta = document.createElement('div');
      meta.className = 'muted small';
      const you = (ua && ua.selected !== null && ua.selected !== undefined) ? String.fromCharCode(65 + ua.selected) : 'No answer';
      const taken = ua ? `${ua.timeTaken}s` : '-';
      const correctMark = (ua && ua.selected === qObj.a) ? 'Correct' : 'Incorrect';
      meta.textContent = `Your answer: ${you} • ${correctMark} • Time: ${taken}`;
      wrapper.appendChild(meta);

      reviewList.appendChild(wrapper);
    });
  }

  // initial screen
  showScreen(startScreen);

  // keyboard support
  document.addEventListener('keydown', (e) => {
    if(quizScreen.classList.contains('hidden')) return;
    if(e.key >= '1' && e.key <= '4'){
      const idx = parseInt(e.key) - 1;
      const optionEls = $all('.option');
      if(optionEls[idx]) optionEls[idx].click();
    }
    if(e.key === 'n') nextBtn.click();
    if(e.key === 's') skipBtn.click();
  });

})();
