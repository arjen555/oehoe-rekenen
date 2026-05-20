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

  _uitlegSpreek(titelTekst + '. ' + uitlegTekst);
}

function _bouwSom(somDef) {
  var container = document.getElementById('uitleg-som-container');
  if (!container || !somDef || !somDef.tabel) return;
  container.innerHTML = '';
  container.appendChild(_bouwTabel(somDef.tabel));
}

function uitlegVolgende() {
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

function uitlegTerug() {
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
    '<button class="back-btn" id="uitleg-int-terug" aria-label="Terug naar de som">&#8592;</button>' +
    '<div class="uitleg-int-titel">' + (def.titel || 'Uitleg') + '</div>' +
    '<div class="uitleg-int-knoppen">' +
    '<button class="uitleg-ctrl-btn" onclick="uitlegVergroot()" title="Groter">A+</button>' +
    '<button class="uitleg-ctrl-btn" onclick="uitlegVerklein()" title="Kleiner">A&#8722;</button>' +
    
    '</div>';
  scherm.appendChild(header);

  var somCont = document.createElement('div');
  somCont.id = 'uitleg-som-container';
  somCont.className = 'uitleg-som-container';
  scherm.appendChild(somCont);

  var kaart = document.createElement('div');
  kaart.id = 'uitleg-stap-kaart';
  kaart.className = 'uitleg-stap-kaart';
  kaart.innerHTML =
    '<div class="uitleg-stap-nr-wrap">' +
    '<span class="uitleg-stap-badge" id="uitleg-stap-nr">1</span>' +
    '<span class="uitleg-stap-titel-tekst" id="uitleg-stap-titel"></span>' +
    '</div>' +
    '<div class="uitleg-stap-uitleg" id="uitleg-stap-tekst"></div>';
  scherm.appendChild(kaart);

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
        titel: 'Schrijf de getallen onder elkaar',
        uitleg: 'We schrijven 347 bovenaan en 256 eronder. Elke kolom heeft zijn eigen positie: honderdtallen, tientallen en eenheden.',
        highlight: [],
        animaties: []
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
