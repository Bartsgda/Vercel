(function(){

function normalize(s){ return (s||"").toLowerCase(); }

let VOICES = [];
let HEADING_VOICE = null;
let TEXT_VOICE = null;

function loadVoices(){
  VOICES = speechSynthesis.getVoices() || [];
  if(!VOICES.length) return;
  HEADING_VOICE = pickMalePlVoice(VOICES) || pickPlVoice(VOICES) || VOICES[0];
  TEXT_VOICE = pickFemalePlVoice(VOICES) || pickPlVoice(VOICES) || VOICES[0];
}

function pickPlVoice(voices){
  return voices.find(v => normalize(v.lang).startsWith("pl")) || null;
}

function pickMalePlVoice(voices){
  const pl = voices.filter(v => normalize(v.lang).startsWith("pl"));
  if(!pl.length) return null;
  const maleHints = ["male","adam","jacek","jan","tomasz","bartek","pawel","piotr","krzysztof","marek","wiktor"];
  return pl.find(v => maleHints.some(h => normalize(v.name).includes(h))) || null;
}

function pickFemalePlVoice(voices){
  const pl = voices.filter(v => normalize(v.lang).startsWith("pl"));
  if(!pl.length) return null;
  const femaleHints = ["female","anna","zofia","ewa","agata","monika","aleksandra","katarzyna","paulina","zosia","marta"];
  return pl.find(v => femaleHints.some(h => normalize(v.name).includes(h))) || null;
}

loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function splitSentences(text){
  const m = text.match(/[^\.!\?]+[\.!\?]+|[^\.!\?]+$/g);
  if(!m) return [text];
  return m.map(s => s.trim()).filter(Boolean);
}

const reader = window.reader = {
  rate: 1.1,
  index: 0,
  queue: [],
  prepared: false,

  prepare(){
    if(this.prepared) return;

    const root = document.getElementById("article");
    if(!root) return;

    const targets = root.querySelectorAll("h1, h2, p, li, blockquote.quote");
    const queue = [];
    let globalIndex = 0;

    targets.forEach(el => {
      const tag = (el.tagName || "").toLowerCase();
      const text = (el.innerText || "").trim();
      if(!text) return;

      const type = (tag === "h1" || tag === "h2") ? "heading" : "text";
      const parts = splitSentences(text);

      el.innerHTML = "";

      parts.forEach((part) => {
        const span = document.createElement("span");
        span.className = "sentence";
        span.dataset.type = type;
        span.dataset.index = String(globalIndex);
        span.textContent = part + " ";
        span.title = "Kliknij dwa razy, aby czytać od tego miejsca";
        span.addEventListener("dblclick", () => {
          this.startFrom(globalIndex);
        });
        el.appendChild(span);
        queue.push(span);
        globalIndex++;
      });
    });

    this.queue = queue;
    this.prepared = true;
  },

  startFrom(idx){
    this.prepare();
    speechSynthesis.cancel();
    this.clearActive();
    this.index = idx;
    this.speak();
  },

  clearActive(){
    document.querySelectorAll(".sentence.active").forEach(e => e.classList.remove("active"));
  },

  play(){
    this.prepare();
    if(!this.queue.length) return;

    if(speechSynthesis.paused){
      speechSynthesis.resume();
      return;
    }

    if(speechSynthesis.speaking) return;

    this.speak();
  },

  speak(){
    if(this.index >= this.queue.length) return;

    this.clearActive();

    const el = this.queue[this.index];
    el.classList.add("active");
    el.scrollIntoView({behavior:"smooth", block:"center"});

    const utter = new SpeechSynthesisUtterance(el.textContent.trim());
    utter.lang = "pl-PL";
    utter.rate = this.rate;

    const type = el.dataset.type || "text";
    const voice = type === "heading" ? HEADING_VOICE : TEXT_VOICE;

    if(!HEADING_VOICE || !TEXT_VOICE) loadVoices();
    if(voice) utter.voice = voice;

    utter.onend = () => {
      this.index++;
      this.speak();
    };

    utter.onerror = () => {
      this.index++;
      this.speak();
    };

    speechSynthesis.speak(utter);
  },

  pause(){
    if(speechSynthesis.speaking) speechSynthesis.pause();
  },

  resume(){
    if(speechSynthesis.paused) speechSynthesis.resume();
    else this.play();
  },

  stop(){
    speechSynthesis.cancel();
    this.index = 0;
    this.clearActive();
  }
};

const speed = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

if(speed){
  speed.addEventListener("input", e => {
    reader.rate = parseFloat(e.target.value);
    if(speedValue) speedValue.textContent = e.target.value;
  });
}

const track = document.getElementById("carouselTrack");
const dotsWrap = document.getElementById("carouselDots");

const gallery = window.gallery = {
  index:0,
  slides:[],
  dots:[],

  init(){
    if(!track) return;

    this.slides = Array.from(track.children);
    if(!this.slides.length) return;

    if(dotsWrap){
      dotsWrap.innerHTML = "";
      this.dots = this.slides.map((_, i) => {
        const d = document.createElement("div");
        d.className = "dot" + (i===0 ? " active" : "");
        dotsWrap.appendChild(d);
        return d;
      });
    }

    track.addEventListener("scroll", () => {
      const w = track.clientWidth || 1;
      const i = Math.round(track.scrollLeft / w);
      this.set(i, false);
    }, {passive:true});
  },

  set(i, scroll=true){
    if(!this.slides.length) return;
    this.index = (i + this.slides.length) % this.slides.length;

    if(scroll){
      track.scrollTo({left: track.clientWidth * this.index, behavior:"smooth"});
    }

    if(this.dots.length){
      this.dots.forEach((d, idx) => d.classList.toggle("active", idx === this.index));
    }
  },

  next(){ this.set(this.index + 1); },
  prev(){ this.set(this.index - 1); }
};

gallery.init();

})();