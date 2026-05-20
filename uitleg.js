/* ================================================================
   uitleg.js  —  Interactieve stap-voor-stap uitleg voor Oehoe Rekenen
   Versie: 1.0  (raamwerk + kolomsgewijs optellen als voorbeeld)
   ================================================================ */

'use strict';

// ── Constanten ──────────────────────────────────────────────────
var UITLEG_ANIMATIE_STAP_MS = 400;  // ms tussen animatie-deelstappen

// ── Toestand ────────────────────────────────────────────────────
var _uitlegActief       = false;
var _uitlegDef          = null;   // de actieve uitleg-definitie
var _uitlegStapIdx      = 0;      // huidige hoofd-stap (0-based)
var _uitlegDeelstapIdx  = 0;      // huidige deelstap binnen stap
var _uitlegAnimTimeout  = null;   // lopende animatie-timer
var _uitlegCells        = {};     // { 'r0c1': tdElement, ... } voor de huidige som-tabel

// ── Hulpfuncties ────────────────────────────────────────────────

/** Spreek een tekst voor via de engine van het hoofdprogramma */
function _uitlegSpreek(tekst) {
  if (typeof speakTekst === 'function' && cfg && cfg.autoVoorlezen) {
    speakTekst(tekst, true);
  }
}

/** Wis alle highlights in de uitleg-tabel */
function _uitlegClearHighlights() {
  Object.values(_uitlegCells).forEach(function(td) {
    td.classList.remove('uitleg-highlight');
  });
}

/** Highlight één of meer cellen op basis van hun sleutel (bijv. 'r0c2') */
function _uitlegHighlight(sleutels) {
  _uitlegClearHighlights();
  (sleutels || []).forEach(function(s) {
    if (_uitlegCells[s]) _uitlegCells[s].classList.add('uitleg-highlight');
  });
}

/** Vul een waarde in een cel — animatie */
function _uitlegVulIn(sleutel, waarde, klasse) {
  var td = _uitlegCells[sleutel];
  if (!td) return;
  td.textContent = waarde;
  if (klasse) td.className = 'uitleg-input ' + klasse;
  else        td.className = 'uitleg-input';
}

/** Wis de inhoud van een cel */
function _uitlegWis(sleutel) {
  var td = _uitlegCells[sleutel];
  if (!td) return;
  td.textContent = '';
  td.className = 'uitleg-input';
}

/** Bouw de som-tabel op uit een tabel-definitie en sla celreferenties op.
 *  tabelDef: array van rijen; elke rij is array van celobjecten:
 *    { type: 'static'|'input'|'op'|'lbl'|'hr', tekst, kolommen, cls }
 */
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
        case 'op':     td.className = 'uitleg-op';  break;
        case 'lbl':    td.className = 'uitleg-lbl'; break;
        case 'input':  td.className = 'uitleg-input'; break;
        default:       td.className = '';  // static
      }
      if (cel.cls) td.classList.add(cel.cls);
      // Sla op als 'rXcY'
      var sleutel = 'r' + ri + 'c' + ci;
      _uitlegCells[sleutel] = td;
      if (cel.id) _uitlegCells[cel.id] = td;  // ook op naam
    });
  });

  return tbl;
}

// ── Stap-rendering ──────────────────────────────────────────────

/** Render de huidige stap (en deelstap).
 *  Annuleert eerst eventuele lopende animatie.
 */
function _renderStap(stapIdx, deelstapIdx, animeren) {
  if (_uitlegAnimTimeout) { clearTimeout(_uitlegAnimTimeout); _uitlegAnimTimeout = null; }

  var def = _uitlegDef;
  var stap = def.stappen[stapIdx];
  if (!stap) return;

  // Controleer of de som gewisseld is t.o.v. vorige stap
  var vorigeStap = stapIdx > 0 ? def.stappen[stapIdx - 1] : null;
  // Som=null betekent: gebruik de som van de dichtstbijzijnde vorige stap met som
  function _vindSom(si) {
    for (var i = si; i >= 0; i--) {
      if (def.stappen[i].som) return def.stappen[i].som;
    }
    return null;
  }
  var huidigeSom = _vindSom(stapIdx);
  var vorigeSom  = stapIdx > 0 ? _vindSom(stapIdx - 1) : null;
  if (huidigeSom !== vorigeSom || !vorigeStap) {
    _bouwSom(huidigeSom, stapIdx);
  }

  // Speel de toestand terug t/m (stapIdx, deelstapIdx)
  _herstelToestand(stapIdx, deelstapIdx);

  // Update uitleg-tekst
  var deelstap = stap.deelstappen ? stap.deelstappen[deelstapIdx] : null;
  var titelTekst = stap.titel || ('Stap ' + (stapIdx + 1));
  var uitlegTekst = (deelstap ? deelstap.uitleg : stap.uitleg) || '';

  document.getElementById('uitleg-stap-nr').textContent = (stapIdx + 1) + (stap.deelstappen ? '.' + (deelstapIdx + 1) : '');
  document.getElementById('uitleg-stap-titel').textContent = titelTekst;
  document.getElementById('uitleg-stap-tekst').textContent = uitlegTekst;

  // Highlights
  var highlights = deelstap ? deelstap.highlight : stap.highlight;
  _uitlegHighlight(highlights || []);

  // Navigatieknoppen
  var isEerste = (stapIdx === 0 && deelstapIdx === 0);
  var isLaatste = _isLaatsteDeelstap(stapIdx, deelstapIdx);
  document.getElementById('uitleg-nav-terug').disabled = isEerste;
  document.getElementById('uitleg-nav-volgende').disabled = isLaatste;
  document.getElementById('uitleg-nav-volgende').textContent = isLaatste ? 'Klaar ✓' : 'Volgende stap →';

  // Voorlezen
  if (animeren || !cfg.autoVoorlezen) {
    _uitlegSpreek(titelTekst + '. ' + uitlegTekst);
  }
}

/** Herstel de toestand van de tabel t/m stapIdx, deelstapIdx.
 *  Wis eerst alles, speel dan alle animaties opnieuw af (instant).
 */
function _herstelToestand(totStap, totDeelstap) {
  // Wis alle input-cellen
  Object.entries(_uitlegCells).forEach(function(kv) {
    if (kv[1].classList.contains('uitleg-input')) {
      kv[1].textContent = '';
    }
  });
  _uitlegClearHighlights();

  var def = _uitlegDef;
  for (var si = 0; si <= totStap; si++) {
    var stap = def.stappen[si];
    if (!stap) break;
    var maxDs = si < totStap ? _aantalDeelstappen(si) - 1 : totDeelstap;

    if (stap.deelstappen) {
      for (var di = 0; di <= maxDs; di++) {
        var ds = stap.deelstappen[di];
        if (!ds) break;
        _voerAnimatiesUit(ds.animaties || [], true);
      }
    } else {
      if (si < totStap || totDeelstap === 0) {
        _voerAnimatiesUit(stap.animaties || [], true);
      }
    }
  }
}

/** Voer een lijst animatie-acties uit (instant of met vertraging) */
function _voerAnimatiesUit(animaties, instant) {
  if (instant) {
    animaties.forEach(function(a) { _voerActieUit(a); });
  } else {
    var i = 0;
    function volgende() {
      if (i >= animaties.length) return;
      _voerActieUit(animaties[i++]);
      _uitlegAnimTimeout = setTimeout(volgende, UITLEG_ANIMATIE_STAP_MS);
    }
    volgende();
  }
}

/** Voer één animatie-actie uit */
function _voerActieUit(actie) {
  switch (actie.type) {
    case 'vulIn':
      _uitlegVulIn(actie.cel, actie.waarde, actie.cls);
      break;
    case 'wis':
      _uitlegWis(actie.cel);
      break;
    case 'highlight':
      _uitlegHighlight(actie.cellen);
      break;
    case 'clearHighlight':
      _uitlegClearHighlights();
      break;
  }
}

/** Aantal deelstappen van stap si */
function _aantalDeelstappen(si) {
  var stap = _uitlegDef.stappen[si];
  return stap && stap.deelstappen ? stap.deelstappen.length : 1;
}

/** Is dit de allerlaatste deelstap? */
function _isLaatsteDeelstap(stapIdx, deelstapIdx) {
  var def = _uitlegDef;
  var isLaatsteStap = (stapIdx === def.stappen.length - 1);
  var isLaatsteDs   = (deelstapIdx === _aantalDeelstappen(stapIdx) - 1);
  return isLaatsteStap && isLaatsteDs;
}

// ── Som-tabel bouwen ────────────────────────────────────────────

/** Bouw de som-tabel in het uitleg-scherm op basis van de som-definitie.
 *  somDef: { tabel: tabelDef } — de tabelDef van de uitleg-definitie
 */
function _bouwSom(somDef, stapIdx) {
  var container = document.getElementById('uitleg-som-container');
  container.innerHTML = '';
  if (!somDef || !somDef.tabel) return;
  var tbl = _bouwTabel(somDef.tabel);
  container.appendChild(tbl);
}

// ── Navigatie ───────────────────────────────────────────────────

function uitlegVolgende() {
  var def = _uitlegDef;
  var aantalDs = _aantalDeelstappen(_uitlegStapIdx);

  if (_uitlegDeelstapIdx < aantalDs - 1) {
    // Volgende deelstap
    _uitlegDeelstapIdx++;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx, true);
  } else if (_uitlegStapIdx < def.stappen.length - 1) {
    // Volgende hoofdstap
    _uitlegStapIdx++;
    _uitlegDeelstapIdx = 0;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx, true);
    _scrollNaarStap();
  } else {
    // Klaar — terug naar de som
    sluitUitleg();
  }
}

function uitlegTerug() {
  if (_uitlegDeelstapIdx > 0) {
    _uitlegDeelstapIdx--;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx, false);
  } else if (_uitlegStapIdx > 0) {
    _uitlegStapIdx--;
    _uitlegDeelstapIdx = _aantalDeelstappen(_uitlegStapIdx) - 1;
    _renderStap(_uitlegStapIdx, _uitlegDeelstapIdx, false);
    _scrollNaarStap();
  }
}

function _scrollNaarStap() {
  var el = document.getElementById('uitleg-stap-kaart');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Openen / Sluiten ────────────────────────────────────────────

/** Hoofdprogramma roept dit aan bij klik op "Uitleg" */
function openUitleg(methode, bewerking) {
  var key = methode + '-' + bewerking;
  var def = UITLEG_DEFINITIES[key];
  if (!def) {
    // Nog geen uitleg beschikbaar
    if (typeof showUitlegOud === 'function') showUitlegOud();
    return;
  }

  _uitlegActief      = true;
  _uitlegDef         = def;
  _uitlegStapIdx     = 0;
  _uitlegDeelstapIdx = 0;

  // Bouw het scherm
  _bouwUitlegScherm(def);

  // Toon het scherm
  if (typeof showScreen === 'function') showScreen('screen-uitleg-interactief');

  // Render stap 0
  _bouwSom(def.stappen[0].som, 0);
  _renderStap(0, 0, true);
}

function sluitUitleg() {
  _uitlegActief = false;
  if (_uitlegAnimTimeout) { clearTimeout(_uitlegAnimTimeout); _uitlegAnimTimeout = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (typeof showScreen === 'function') showScreen('screen-exercise');
}

// ── Scherm bouwen (eenmalig bij eerste gebruik) ─────────────────

function _bouwUitlegScherm(def) {
  var scherm = document.getElementById('screen-uitleg-interactief');
  scherm.innerHTML = '';

  // Header
  var header = document.createElement('div');
  header.className = 'uitleg-int-header';
  header.innerHTML =
    '<button class="back-btn" id="uitleg-int-terug" aria-label="Terug naar de som">&#8592;</button>' +
    '<div class="uitleg-int-titel">' + (def.titel || 'Uitleg') + '</div>';
  scherm.appendChild(header);

  // Som-container (bovenaan, blijft zichtbaar)
  var somCont = document.createElement('div');
  somCont.id = 'uitleg-som-container';
  somCont.className = 'uitleg-som-container';
  scherm.appendChild(somCont);

  // Stap-kaart (scrollt in beeld)
  var kaart = document.createElement('div');
  kaart.id = 'uitleg-stap-kaart';
  kaart.className = 'uitleg-stap-kaart';
  kaart.innerHTML =
    '<div class="uitleg-stap-nr-wrap">' +
    '  <span class="uitleg-stap-badge" id="uitleg-stap-nr">1</span>' +
    '  <span class="uitleg-stap-titel-tekst" id="uitleg-stap-titel"></span>' +
    '</div>' +
    '<div class="uitleg-stap-uitleg" id="uitleg-stap-tekst"></div>';
  scherm.appendChild(kaart);

  // Navigatie
  var nav = document.createElement('div');
  nav.className = 'uitleg-nav';
  nav.innerHTML =
    '<button class="btn-secondary" id="uitleg-nav-terug" onclick="uitlegTerug()">&#8592; Vorige stap</button>' +
    '<button class="btn-primary"   id="uitleg-nav-volgende" onclick="uitlegVolgende()">Volgende stap &#8594;</button>';
  scherm.appendChild(nav);

  // Events
  document.getElementById('uitleg-int-terug').addEventListener('click', sluitUitleg);

  // Toetsenbord: pijltjes en Escape
  scherm.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); uitlegVolgende(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); uitlegTerug(); }
    if (e.key === 'Escape') sluitUitleg();
  });
  scherm.setAttribute('tabindex', '-1');
}

// ================================================================
//  UITLEG-DEFINITIES
//  Elke definitie heeft:
//    titel:   string
//    stappen: array van stap-objecten
//
//  Stap-object:
//    som:        somDef (zie hieronder) — mag zelfde zijn als vorige stap
//    titel:      string
//    uitleg:     string (te voorlezen en te tonen)
//    highlight:  array van cel-sleutels om te highlighten
//    animaties:  array van acties die bij DEZE stap worden uitgevoerd
//    deelstappen: array van deelstap-objecten (optioneel)
//      Deelstap:
//        uitleg, highlight, animaties
//
//  somDef:
//    tabel: array van rij-definities
//      Rij: { type:'hr', colspan:N }
//         | { cellen: [ celDef, ... ] }
//      celDef: { type:'static'|'input'|'op'|'lbl', tekst, id, cls }
// ================================================================

var UITLEG_DEFINITIES = {

  // ──────────────────────────────────────────────────────────────
  // KOLOMSGEWIJS OPTELLEN  —  347 + 256 = 603
  // ──────────────────────────────────────────────────────────────
  'kolomsgewijs-optellen': {
    titel: 'Kolomsgewijs optellen',
    stappen: [

      // STAP 1: schrijf de getallen onder elkaar
      {
        som: {
          tabel: [
            { cellen: [ {type:'lbl',tekst:''}, {type:'lbl',tekst:'H'}, {type:'lbl',tekst:'T'}, {type:'lbl',tekst:'E'} ] },
            { cellen: [ {type:'op',tekst:''},  {id:'a-h',tekst:'3'},   {id:'a-t',tekst:'4'},   {id:'a-e',tekst:'7'} ] },
            { cellen: [ {type:'op',tekst:'+'}, {id:'b-h',tekst:'2'},   {id:'b-t',tekst:'5'},   {id:'b-e',tekst:'6'} ] },
            { type:'hr', colspan:4 },
            { cellen: [ {type:'op',tekst:''},  {id:'ans-h',type:'input',tekst:''}, {id:'ans-t',type:'input',tekst:''}, {id:'ans-e',type:'input',tekst:''} ] }
          ]
        },
        titel: 'Schrijf de getallen onder elkaar',
        uitleg: 'We schrijven 347 bovenaan en 256 eronder. Elke kolom heeft zijn eigen positie: honderdtallen, tientallen en eenheden.',
        highlight: ['a-h','a-t','a-e','b-h','b-t','b-e'],
        animaties: []
      },

      // STAP 2: tel de eenheden op
      {
        som: null, // zelfde som — null = gebruik som van vorige stap
        titel: 'Tel de eenheden op',
        uitleg: 'We beginnen rechts: 7 plus 6 is 13. We schrijven 3 op in de eenhedenkolom. De 1 onthouden we — die tellen we straks bij de tientallen op.',
        highlight: ['a-e','b-e','ans-e'],
        animaties: [
          { type:'vulIn', cel:'ans-e', waarde:'3' }
        ]
      },

      // STAP 3: tel de tientallen op
      {
        som: null,
        titel: 'Tel de tientallen op',
        uitleg: 'Nu de tientallen: 4 plus 5 is 9, plus de 1 die we onthielden is 10. We schrijven 0 op in de tientallenkolom. De 1 onthouden we weer.',
        highlight: ['a-t','b-t','ans-t'],
        animaties: [
          { type:'vulIn', cel:'ans-t', waarde:'0' }
        ]
      },

      // STAP 4: tel de honderdtallen op
      {
        som: null,
        titel: 'Tel de honderdtallen op',
        uitleg: 'Dan de honderdtallen: 3 plus 2 is 5, plus de 1 die we onthielden is 6. We schrijven 6 op.',
        highlight: ['a-h','b-h','ans-h'],
        animaties: [
          { type:'vulIn', cel:'ans-h', waarde:'6' }
        ]
      },

      // STAP 5: antwoord aflezen
      {
        som: null,
        titel: 'Lees het antwoord af',
        uitleg: '347 plus 256 is 603. Lees het antwoord af van links naar rechts: zes honderd drie.',
        highlight: ['ans-h','ans-t','ans-e'],
        animaties: []
      }

    ] // einde stappen
  } // einde kolomsgewijs-optellen

  // Hier komen de andere 5 uitleggen:
  // 'kolomsgewijs-aftrekken': { ... },
  // 'kolomsgewijs-vermenigvuldigen': { ... },
  // 'cijferend-optellen': { ... },
  // 'cijferend-aftrekken': { ... },
  // 'cijferend-vermenigvuldigen': { ... }

}; // einde UITLEG_DEFINITIES
