// ── CSS injectie voor uitleg-scherm ──────────────────────────────
(function(){
  var stijl = document.createElement('style');
  stijl.textContent = `
#screen-uitleg-interactief{
  display:none;flex-direction:column;
  width:100vw;min-height:100vh;
  background:var(--bg);
  padding:0;
  position:fixed;inset:0;
  z-index:100;
  overflow-y:auto;
}
#screen-uitleg-interactief.active{display:flex;}
.uitleg-int-header{
  display:flex;align-items:center;justify-content:center;
  padding:18px 28px 14px 20px;
  background:var(--card);
  border-bottom:2px solid var(--border);
  flex-shrink:0;
  width:100%;
  box-sizing:border-box;
  position:relative;
}
.uitleg-int-titel{
  font-size:calc(var(--font-size)*1.4);
  font-weight:800;color:var(--text);
  text-align:center;
}
.uitleg-int-terug-wrap{
  position:absolute;left:16px;
}
.uitleg-som-container{
  display:flex;justify-content:center;
  padding:24px 20px 16px 20px;
  flex-shrink:0;
}
.uitleg-interactief td.uitleg-highlight{
  border-color:#FCD34D!important;
  box-shadow:0 0 0 3px #FCD34D!important;
  background:#3d3200!important;
  color:#FCD34D!important;
}
/* Uitleg tabel opmaak */
.uitleg-interactief td{
  color:var(--text)!important;
  background:var(--cell-static-bg)!important;
}
.uitleg-interactief th,
.uitleg-interactief td.uitleg-lbl{
  color:var(--blue-mid)!important;
  background:transparent!important;
  border:none!important;
  font-weight:800;
}
.uitleg-interactief td.uitleg-op{
  color:#FCD34D!important;
  background:transparent!important;
  border:none!important;
  font-weight:800;
}
.uitleg-interactief td.uitleg-input{
  background:var(--cell-input-bg)!important;
  color:var(--cell-input-color)!important;
  border:2px solid var(--border)!important;
  min-width:1em;
  min-height:1em;
  width:1.8em;
  height:1.8em;
}
.uitleg-interactief tr.uitleg-hr td{
  border:none!important;
  border-top:3px solid var(--calc-line)!important;
  background:transparent!important;
  height:4px;padding:0;
}
.uitleg-stap-kaart{
  margin:20px auto 0 auto;
  max-width:900px;width:90%;
  background:var(--card);
  border:2px solid var(--border);
  border-radius:var(--radius);
  padding:28px 36px;
}
.uitleg-stap-nr-wrap{
  display:flex;align-items:center;gap:14px;
  margin-bottom:14px;
}
.uitleg-stap-badge{
  background:var(--blue-mid);color:#fff;
  border-radius:50%;
  min-width:calc(var(--font-size)*1.8);
  height:calc(var(--font-size)*1.8);
  display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:calc(var(--font-size)*1.1);
  flex-shrink:0;
}
.uitleg-stap-titel-tekst{
  font-size:calc(var(--font-size)*1.15);
  font-weight:800;color:var(--text);
}
.uitleg-stap-uitleg{
  font-size:calc(var(--font-size)*1.05);
  color:var(--text);
  line-height:1.6;
}
.uitleg-nav{
  display:flex;justify-content:center;gap:16px;
  padding:20px;
  flex-shrink:0;
}
/* Stap-kaart met uil-pijlen links en rechts */
.uitleg-stap-kaart-wrap{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:16px;
  margin:20px auto 0 auto;
  max-width:1200px;
  width:96%;
  padding:0 8px;
  box-sizing:border-box;
}
.uitleg-stap-kaart{
  flex:1;
  min-width:0;
}
.uitleg-uil-pijl{
  flex-shrink:0;
  width:120px;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  opacity:0.85;
  transition:opacity 0.15s;
}
.uitleg-uil-pijl:hover{opacity:1;}
.uitleg-uil-pijl img{
  width:100%;
  height:auto;
  max-height:160px;
  object-fit:contain;
  display:block;
}
.uitleg-uil-pijl.verborgen{visibility:hidden;}
.uitleg-int-knoppen{
  display:flex;gap:8px;margin-left:auto;align-items:center;
}
.uitleg-ctrl-btn{
  background:var(--surface);border:2px solid var(--border);
  color:var(--text);border-radius:var(--radius-sm);
  padding:6px 14px;font-family:var(--font);font-size:0.95em;
  font-weight:700;cursor:pointer;transition:background 0.15s;
  white-space:nowrap;
}
.uitleg-ctrl-btn:hover{background:var(--blue-light);}
.uitleg-voorlees-btn{font-size:1.1em;padding:6px 10px;}
.uitleg-som-container{
  display:flex;
  justify-content:center;
  align-items:flex-start;
  padding:40px 20px 24px 20px;
  flex-shrink:0;
}
.uitleg-som-container .uitleg-table{
  font-size:3.2em;
  border-spacing:0;
}
.uitleg-som-container .uitleg-table td,
.uitleg-som-container .uitleg-table th{
  min-width:1.6em;
  min-height:1.6em;
  width:1.6em;
  height:1.6em;
  padding:4px;
}

  `;
  document.head.appendChild(stijl);
})();

/* ================================================================
   uitleg.js  -  Interactieve stap-voor-stap uitleg voor Oehoe Rekenen
   ================================================================ */

'use strict';

var UITLEG_ANIMATIE_STAP_MS = 400;

var _uitlegActief       = false;
var _uitlegDef          = null;
var _uitlegStapIdx      = 0;
var _uitlegDeelstapIdx  = 0;
var _uitlegAnimTimeout  = null;
var _uitlegCells        = {};
function _uitlegSpreek(tekst) {
  if (typeof speakTekst === 'function' && cfg && cfg.autoVoorlezen) {
    speakTekst(tekst, true);
  }
}

function _uitlegClearHighlights() {
  Object.values(_uitlegCells).forEach(function(td) {
    td.classList.remove('uitleg-highlight');
  });
}

function _uitlegHighlight(sleutels) {
  _uitlegClearHighlights();
  (sleutels || []).forEach(function(s) {
    if (_uitlegCells[s]) _uitlegCells[s].classList.add('uitleg-highlight');
  });
}

function _uitlegVulIn(sleutel, waarde, klasse) {
  var td = _uitlegCells[sleutel];
  if (!td) return;
  td.textContent = waarde;
  td.className = klasse ? ('uitleg-input ' + klasse) : 'uitleg-input';
}

function _uitlegWis(sleutel) {
  var td = _uitlegCells[sleutel];
  if (!td) return;
  td.textContent = '';
  td.className = 'uitleg-input';
}

function _bouwTabel(tabelDef) {
  _uitlegCells = {};
  var tbl = document.createElement('table');
  tbl.className = 'uitleg-table uitleg-interactief';

  tabelDef.forEach(function(rij, ri) {
    var tr = tbl.insertRow();
    if (rij.type === 'hr') {
      tr.className = 'uitleg-hr';
      var td = tr.insertCell();
      td.colSpan = rij.colspan || 10;
      return;
    }
    rij.cellen.forEach(function(cel, ci) {
      var td = tr.insertCell();
      td.textContent = cel.tekst || '';
      switch (cel.type) {
        case 'op':    td.className = 'uitleg-op';  break;
        case 'lbl':   td.className = 'uitleg-lbl'; break;
        case 'input': td.className = 'uitleg-input'; break;
        default:      td.className = '';
      }
      if (cel.cls) td.classList.add(cel.cls);
      var sleutel = 'r' + ri + 'c' + ci;
      _uitlegCells[sleutel] = td;
      if (cel.id) _uitlegCells[cel.id] = td;
    });
  });
  return tbl;
}

function _vindSom(stapIdx) {
  for (var i = stapIdx; i >= 0; i--) {
    if (_uitlegDef.stappen[i].som) return _uitlegDef.stappen[i].som;
  }
  return null;
}

function _aantalDeelstappen(si) {
  var stap = _uitlegDef.stappen[si];
  return stap && stap.deelstappen ? stap.deelstappen.length : 1;
}

function _isLaatsteDeelstap(stapIdx, deelstapIdx) {
  return (stapIdx === _uitlegDef.stappen.length - 1) &&
         (deelstapIdx === _aantalDeelstappen(stapIdx) - 1);
}

function _voerActieUit(actie) {
  switch (actie.type) {
    case 'vulIn':         _uitlegVulIn(actie.cel, actie.waarde, actie.cls); break;
    case 'wis':           _uitlegWis(actie.cel); break;
    case 'highlight':     _uitlegHighlight(actie.cellen); break;
    case 'clearHighlight':_uitlegClearHighlights(); break;
  }
}

function _herstelToestand(totStap, totDeelstap) {
  Object.values(_uitlegCells).forEach(function(td) {
    if (td.classList.contains('uitleg-input')) td.textContent = '';
  });
  _uitlegClearHighlights();

  for (var si = 0; si <= totStap; si++) {
    var stap = _uitlegDef.stappen[si];
    if (!stap) break;
    var maxDs = si < totStap ? _aantalDeelstappen(si) - 1 : totDeelstap;
    if (stap.deelstappen) {
      for (var di = 0; di <= maxDs; di++) {
        var ds = stap.deelstappen[di];
        if (ds) (ds.animaties || []).forEach(function(a) { _voerActieUit(a); });
      }
    } else {
      if (si < totStap || totDeelstap === 0) {
        (stap.animaties || []).forEach(function(a) { _voerActieUit(a); });
      }
    }
  }
}

function _renderStap(stapIdx, deelstapIdx) {
  if (_uitlegAnimTimeout) { clearTimeout(_uitlegAnimTimeout); _uitlegAnimTimeout = null; }

  var def = _uitlegDef;
  var stap = def.stappen[stapIdx];
  if (!stap) return;

  var huidigeSom = _vindSom(stapIdx);
  var vorigeSom  = stapIdx > 0 ? _vindSom(stapIdx - 1) : null;
  if (huidigeSom !== vorigeSom || stapIdx === 0) {
    _bouwSom(huidigeSom);
  }

  _herstelToestand(stapIdx, deelstapIdx);

  var deelstap = stap.deelstappen ? stap.deelstappen[deelstapIdx] : null;
  var titelTekst  = stap.titel || ('Stap ' + (stapIdx + 1));
  var uitlegTekst = (deelstap ? deelstap.uitleg : stap.uitleg) || '';
  var highlights  = deelstap ? deelstap.highlight : stap.highlight;

  var nrEl = document.getElementById('uitleg-stap-nr');
  var titEl = document.getElementById('uitleg-stap-titel');
  var tekEl = document.getElementById('uitleg-stap-tekst');
  if (nrEl) nrEl.textContent = (stapIdx + 1) + (stap.deelstappen ? '.' + (deelstapIdx + 1) : '');
  if (titEl) titEl.textContent = titelTekst;
  if (tekEl) tekEl.textContent = uitlegTekst;

  _uitlegHighlight(highlights || []);

  var isEerste = (stapIdx === 0 && deelstapIdx === 0);
  var isLaatste = _isLaatsteDeelstap(stapIdx, deelstapIdx);
  var terugBtn = document.getElementById('uitleg-nav-terug');
  var volgBtn  = document.getElementById('uitleg-nav-volgende');
  if (terugBtn) terugBtn.disabled = isEerste;
  if (volgBtn)  { volgBtn.disabled = false; volgBtn.textContent = isLaatste ? 'Klaar \u2713' : 'Volgende stap \u2192'; }
  // Uil-pijlen: verborgen als helemaal eerste/laatste positie
  var isEersteDeelstap = (stapIdx === 0 && deelstapIdx === 0);
  var isLaatsteDeelstap = _isLaatsteDeelstap(stapIdx, deelstapIdx);
  var uilL = document.getElementById('uitleg-uil-links');
  var uilR = document.getElementById('uitleg-uil-rechts');
  if (uilL) uilL.className = 'uitleg-uil-pijl' + (isEersteDeelstap ? ' verborgen' : '');
  if (uilR) uilR.className = 'uitleg-uil-pijl' + (isLaatsteDeelstap ? ' verborgen' : '');
  // Vorige stap knop: verborgen bij stap 0
  if (terugBtn) terugBtn.style.visibility = (_uitlegStapIdx === 0 ? 'hidden' : '');

  _uitlegSpreek(titelTekst + '. ' + uitlegTekst);
}

function _bouwSom(somDef) {
  var container = document.getElementById('uitleg-som-container');
  if (!container || !somDef || !somDef.tabel) return;
  container.innerHTML = '';
  container.appendChild(_bouwTabel(somDef.tabel));
}

// Uil-pijl rechts: volgende DEELstap, of naar volgende hoofdstap als laatste deelstap
function uitlegDeelVolgende() {
  var def = _uitlegDef;
  var aantalDs = _aantalDeelstappen(_uitlegStapIdx);
  if (_uitlegDeelstapIdx < aantalDs - 1) {
    _uitlegDeelstapIdx++;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx);
  } else if (_uitlegStapIdx < def.stappen.length - 1) {
    _uitlegStapIdx++;
    _uitlegDeelstapIdx = 0;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx);
    _scrollNaarStap();
  } else {
    sluitUitleg();
  }
}

// Uil-pijl links: vorige DEELstap, of naar laatste deelstap van vorige hoofdstap
function uitlegDeelTerug() {
  if (_uitlegDeelstapIdx > 0) {
    _uitlegDeelstapIdx--;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx);
  } else if (_uitlegStapIdx > 0) {
    _uitlegStapIdx--;
    _uitlegDeelstapIdx = _aantalDeelstappen(_uitlegStapIdx) - 1;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx);
    _scrollNaarStap();
  }
}

// Knop Volgende stap: naar EERSTE deelstap van volgende hoofdstap
function uitlegVolgende() {
  var def = _uitlegDef;
  if (_uitlegStapIdx < def.stappen.length - 1) {
    _uitlegStapIdx++;
    _uitlegDeelstapIdx = 0;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx);
    _scrollNaarStap();
  } else {
    sluitUitleg();
  }
}

// Knop Vorige stap: naar EERSTE deelstap van vorige hoofdstap
function uitlegTerug() {
  if (_uitlegStapIdx > 0) {
    _uitlegStapIdx--;
    _uitlegDeelstapIdx = 0;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx);
    _scrollNaarStap();
  }
}

function _scrollNaarStap() {
  var el = document.getElementById('uitleg-stap-kaart');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}



function uitlegVoorlees() {
  var titel = document.getElementById('uitleg-stap-titel');
  var tekst = document.getElementById('uitleg-stap-tekst');
  if (!titel || !tekst) return;
  var spreekTekst_fn = typeof speakTekst === 'function' ? speakTekst : null;
  var volTekst = (titel.textContent || '') + '. ' + (tekst.textContent || '');
  if (spreekTekst_fn) {
    spreekTekst_fn(volTekst, true);
  } else if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(volTekst);
    u.lang = 'nl-NL';
    window.speechSynthesis.speak(u);
  }
}

function openUitleg(methode, bewerking) {
  var key = methode + '-' + bewerking;
  var def = UITLEG_DEFINITIES[key];
  if (!def) { if (typeof showUitlegOud === 'function') showUitlegOud(); return; }

  _uitlegActief      = true;
  _uitlegDef         = def;
  _uitlegStapIdx     = 0;
  _uitlegDeelstapIdx = 0;


  _bouwUitlegScherm(def);
  if (typeof showScreen === 'function') showScreen('screen-uitleg-interactief');
  _bouwSom(_vindSom(0));
  _renderStap(0, 0);
}

function sluitUitleg() {
  _uitlegActief = false;
  if (_uitlegAnimTimeout) { clearTimeout(_uitlegAnimTimeout); _uitlegAnimTimeout = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  // Herstel de originele zoom

  if (typeof showScreen === 'function') showScreen('screen-exercise');
}

function _bouwUitlegScherm(def) {
  var scherm = document.getElementById('screen-uitleg-interactief');
  scherm.innerHTML = '';

  var header = document.createElement('div');
  header.className = 'uitleg-int-header';
  header.innerHTML =
    '<div class="uitleg-int-terug-wrap"><button class="back-btn" id="uitleg-int-terug" aria-label="Terug naar de som">&#8592;</button></div>' +
    '<div class="uitleg-int-titel">' + (def.titel || 'Uitleg') + '</div>';
  scherm.appendChild(header);

  var somCont = document.createElement('div');
  somCont.id = 'uitleg-som-container';
  somCont.className = 'uitleg-som-container';
  scherm.appendChild(somCont);

  // Uil-pijl links + stap-kaart + uil-pijl rechts
  var kaartWrap = document.createElement('div');
  kaartWrap.className = 'uitleg-stap-kaart-wrap';

  var uilLinks = document.createElement('div');
  uilLinks.className = 'uitleg-uil-pijl';
  uilLinks.id = 'uitleg-uil-links';
  uilLinks.setAttribute('aria-label', 'Vorige stap');
  uilLinks.innerHTML = '<img src="https://raw.githubusercontent.com/arjen555/rekenen-afbeeldingen/main/uil_pijl2.png" alt="Vorige stap">';
  uilLinks.addEventListener('click', uitlegDeelTerug);

  var kaart = document.createElement('div');
  kaart.id = 'uitleg-stap-kaart';
  kaart.className = 'uitleg-stap-kaart';
  kaart.innerHTML =
    '<div class="uitleg-stap-nr-wrap">' +
    '<span class="uitleg-stap-badge" id="uitleg-stap-nr">1</span>' +
    '<span class="uitleg-stap-titel-tekst" id="uitleg-stap-titel"></span>' +
    '</div>' +
    '<div class="uitleg-stap-uitleg" id="uitleg-stap-tekst"></div>';

  var uilRechts = document.createElement('div');
  uilRechts.className = 'uitleg-uil-pijl';
  uilRechts.id = 'uitleg-uil-rechts';
  uilRechts.setAttribute('aria-label', 'Volgende stap');
  uilRechts.innerHTML = '<img src="https://raw.githubusercontent.com/arjen555/rekenen-afbeeldingen/main/uil_pijl.png" alt="Volgende stap">';
  uilRechts.addEventListener('click', uitlegDeelVolgende);

  kaartWrap.appendChild(uilLinks);
  kaartWrap.appendChild(kaart);
  kaartWrap.appendChild(uilRechts);
  scherm.appendChild(kaartWrap);

  var nav = document.createElement('div');
  nav.className = 'uitleg-nav';
  nav.innerHTML =
    '<button class="btn-secondary" id="uitleg-nav-terug" onclick="uitlegTerug()">&#8592; Vorige stap</button>' +
    '<button class="btn-primary" id="uitleg-nav-volgende" onclick="uitlegVolgende()">Volgende stap &#8594;</button>';
  scherm.appendChild(nav);

  document.getElementById('uitleg-int-terug').addEventListener('click', sluitUitleg);

  scherm.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); uitlegVolgende(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); uitlegTerug(); }
    if (e.key === 'Escape') sluitUitleg();
  });
  scherm.setAttribute('tabindex', '-1');
}

/* ================================================================
   UITLEG-DEFINITIES
   ================================================================ */

var UITLEG_DEFINITIES = {

  'kolomsgewijs-optellen': {
    titel: 'Kolomsgewijs optellen',
    stappen: [
      {
        som: {
          tabel: [
            { cellen: [ {type:'lbl',tekst:''}, {type:'lbl',tekst:'H'}, {type:'lbl',tekst:'T'}, {type:'lbl',tekst:'E'} ] },
            { cellen: [ {type:'op',tekst:''},  {id:'a-h',tekst:'3'}, {id:'a-t',tekst:'4'}, {id:'a-e',tekst:'7'} ] },
            { cellen: [ {type:'op',tekst:'+'}, {id:'b-h',tekst:'2'}, {id:'b-t',tekst:'5'}, {id:'b-e',tekst:'6'} ] },
            { type:'hr', colspan:4 },
            { cellen: [ {type:'lbl',tekst:'H'}, {id:'inv1-h',type:'input',tekst:''}, {id:'inv1-t',type:'input',tekst:''}, {id:'inv1-e',type:'input',tekst:''} ] },
            { cellen: [ {type:'lbl',tekst:'T'}, {id:'inv2-h',type:'input',tekst:''}, {id:'inv2-t',type:'input',tekst:''}, {id:'inv2-e',type:'input',tekst:''} ] },
            { cellen: [ {type:'lbl',tekst:'E'}, {id:'inv3-h',type:'input',tekst:''}, {id:'inv3-t',type:'input',tekst:''}, {id:'inv3-e',type:'input',tekst:''} ] },
            { type:'hr', colspan:4 },
            { cellen: [ {type:'op',tekst:''}, {id:'ans-h',type:'input',tekst:''}, {id:'ans-t',type:'input',tekst:''}, {id:'ans-e',type:'input',tekst:''} ] }
          ]
        },
        titel: 'Hoe moet je zo\'n optelling lezen?',
        uitleg: 'Bij kolomsgewijs optellen zetten we de som onder elkaar en tellen we per kolom de getallen op.',
        highlight: [],
        animaties: [],
        deelstappen: [
          {
            uitleg: 'Bij kolomsgewijs optellen zetten we de som onder elkaar en tellen we per kolom de getallen op.',
            highlight: [],
            animaties: []
          },
          {
            uitleg: 'Deelstap 1.2 — komt er nog aan.',
            highlight: [],
            animaties: []
          },
          {
            uitleg: 'Deelstap 1.3 — komt er nog aan.',
            highlight: [],
            animaties: []
          },
          {
            uitleg: 'Deelstap 1.4 — komt er nog aan.',
            highlight: [],
            animaties: []
          }
        ]
      },
      {
        som: null,
        titel: 'Tel de eenheden op',
        uitleg: 'We beginnen rechts: 7 plus 6 is 13. We schrijven 3 op in de eenhedenkolom. De 1 onthouden we.',
        highlight: ['a-e','b-e','ans-e'],
        animaties: [ { type:'vulIn', cel:'ans-e', waarde:'3' } ]
      },
      {
        som: null,
        titel: 'Tel de tientallen op',
        uitleg: '4 plus 5 is 9, plus de 1 die we onthielden is 10. We schrijven 0 op. De 1 onthouden we weer.',
        highlight: ['a-t','b-t','ans-t'],
        animaties: [ { type:'vulIn', cel:'ans-t', waarde:'0' } ]
      },
      {
        som: null,
        titel: 'Tel de honderdtallen op',
        uitleg: '3 plus 2 is 5, plus de 1 die we onthielden is 6. We schrijven 6 op.',
        highlight: ['a-h','b-h','ans-h'],
        animaties: [ { type:'vulIn', cel:'ans-h', waarde:'6' } ]
      },
      {
        som: null,
        titel: 'Lees het antwoord af',
        uitleg: '347 plus 256 is 603.',
        highlight: ['ans-h','ans-t','ans-e'],
        animaties: []
      }
    ]
  }

};
