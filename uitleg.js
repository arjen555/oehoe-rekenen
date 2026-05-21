// ── CSS laden ──────────────────────────────────────────────────
(function(){
  if(document.getElementById('uitleg-css-link')) return;
  function injecteer(){
    var link=document.createElement('link');
    link.id='uitleg-css-link';link.rel='stylesheet';link.href='uitleg.css';
    (document.head||document.documentElement).appendChild(link);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injecteer);
  else injecteer();
})();

'use strict';

// ── Toestand ───────────────────────────────────────────────────
var _uitlegActief=false, _uitlegDef=null;
var _uitlegStapIdx=0, _uitlegDeelstapIdx=0;
var _uitlegAnimTimeout=null, _uitlegCells={};
var _uitlegOpenStap=-1; // welke hoofdstap heeft deelstappen open
var _uitlegFocusInNav=false; // voorkomt dat renderStap focus naar kaart stuurt

// ── Hulpfuncties ───────────────────────────────────────────────
function _uitlegSpreek(tekst){
  if(!tekst)return;
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(typeof speakTekst==='function'&&cfg&&cfg.autoVoorlezen) speakTekst(tekst,true);
}
function _uitlegSpreekDirect(tekst){
  // Spreek altijd voor, ook zonder cfg.autoVoorlezen check (voor focus-events)
  if(!tekst)return;
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(typeof speakTekst==='function'&&cfg&&cfg.autoVoorlezen){
    speakTekst(tekst,true);
  }
}
function _uitlegClearHighlights(){
  Object.values(_uitlegCells).forEach(function(td){td.classList.remove('uitleg-highlight');});
}
function _uitlegHighlight(sleutels){
  _uitlegClearHighlights();
  (sleutels||[]).forEach(function(s){if(_uitlegCells[s])_uitlegCells[s].classList.add('uitleg-highlight');});
}
function _uitlegVulIn(sleutel,waarde,klasse){
  var td=_uitlegCells[sleutel]; if(!td)return;
  td.textContent=waarde; td.className=klasse?('uitleg-input '+klasse):'uitleg-input';
}
function _uitlegWis(sleutel){
  var td=_uitlegCells[sleutel]; if(!td)return;
  td.textContent=''; td.className='uitleg-input';
}

function _bouwTabel(tabelDef){
  _uitlegCells={};
  var tbl=document.createElement('table');
  tbl.className='uitleg-table uitleg-interactief';
  tabelDef.forEach(function(rij,ri){
    var tr=tbl.insertRow();
    if(rij.type==='hr'){tr.className='uitleg-hr';var td=tr.insertCell();td.colSpan=rij.colspan||10;return;}
    rij.cellen.forEach(function(cel,ci){
      var td=tr.insertCell(); td.textContent=cel.tekst||'';
      switch(cel.type){
        case 'op': td.className='uitleg-op'; break;
        case 'lbl': td.className='uitleg-lbl'; break;
        case 'input': td.className='uitleg-input'; break;
        default: td.className='';
      }
      if(cel.cls)td.classList.add(cel.cls);
      _uitlegCells['r'+ri+'c'+ci]=td;
      if(cel.id)_uitlegCells[cel.id]=td;
    });
  });
  return tbl;
}

function _vindSom(si){
  for(var i=si;i>=0;i--) if(_uitlegDef.stappen[i].som)return _uitlegDef.stappen[i].som;
  return null;
}
function _aantalDeelstappen(si){
  var s=_uitlegDef.stappen[si]; return s&&s.deelstappen?s.deelstappen.length:1;
}
function _isLaatsteDeelstap(si,di){
  return si===_uitlegDef.stappen.length-1 && di===_aantalDeelstappen(si)-1;
}

function _voerActieUit(a){
  switch(a.type){
    case 'vulIn': _uitlegVulIn(a.cel,a.waarde,a.cls); break;
    case 'wis': _uitlegWis(a.cel); break;
    case 'highlight': _uitlegHighlight(a.cellen); break;
    case 'clearHighlight': _uitlegClearHighlights(); break;
  }
}

function _herstelToestand(totStap,totDeelstap){
  Object.values(_uitlegCells).forEach(function(td){if(td.classList.contains('uitleg-input'))td.textContent='';});
  _uitlegClearHighlights();
  for(var si=0;si<=totStap;si++){
    var stap=_uitlegDef.stappen[si]; if(!stap)break;
    var maxDs=si<totStap?_aantalDeelstappen(si)-1:totDeelstap;
    if(stap.deelstappen){
      for(var di=0;di<=maxDs;di++){var ds=stap.deelstappen[di];if(ds)(ds.animaties||[]).forEach(function(a){_voerActieUit(a);});}
    } else {
      if(si<totStap||totDeelstap===0)(stap.animaties||[]).forEach(function(a){_voerActieUit(a);});
    }
  }
}

function _bouwSom(somDef){
  var c=document.getElementById('uitleg-som-container'); if(!c||!somDef||!somDef.tabel)return;
  c.innerHTML='';
  var wrap=document.createElement('div'); wrap.className='uitleg-som-wrap';
  wrap.appendChild(_bouwTabel(somDef.tabel)); c.appendChild(wrap);
}

// ── Render stap ────────────────────────────────────────────────
function _renderStap(si,di){
  if(_uitlegAnimTimeout){clearTimeout(_uitlegAnimTimeout);_uitlegAnimTimeout=null;}
  var def=_uitlegDef; var stap=def.stappen[si]; if(!stap)return;

  // Som bijwerken indien nodig
  var huidigeSom=_vindSom(si);
  var vorigeSom=si>0?_vindSom(si-1):null;
  if(huidigeSom!==vorigeSom||si===0) _bouwSom(huidigeSom);

  _herstelToestand(si,di);

  var deelstap=stap.deelstappen?stap.deelstappen[di]:null;
  var titelTekst=stap.titel||('Stap '+(si+1));
  var uitlegTekst=(deelstap?deelstap.uitleg:stap.uitleg)||'';
  var highlights=deelstap?deelstap.highlight:stap.highlight;

  var titEl=document.getElementById('uitleg-stap-titel');
  var tekEl=document.getElementById('uitleg-stap-tekst');
  if(titEl)titEl.textContent=titelTekst;
  if(tekEl)tekEl.textContent=uitlegTekst;

  _uitlegHighlight(highlights||[]);
  _updateNavKolom(si,di);
  _updateUilPijlen(si,di);

  _uitlegSpreek(titelTekst+'. '+uitlegTekst);
  if(!_uitlegFocusInNav){
    var kaartEl=document.getElementById('uitleg-stap-kaart');
    if(kaartEl)setTimeout(function(){kaartEl.focus();},60);
  }
  _uitlegFocusInNav=false;
}

// ── Navigatiekolom bijwerken ───────────────────────────────────
function _updateNavKolom(activeSi,activeDi){
  var def=_uitlegDef;
  def.stappen.forEach(function(stap,si){
    var item=document.getElementById('uitleg-stap-item-'+si);
    var bol=document.getElementById('uitleg-bol-'+si);
    var deelLijst=document.getElementById('uitleg-deel-lijst-'+si);
    if(!item||!bol)return;

    var isActief=(si===activeSi);
    item.classList.toggle('actief',isActief);
    bol.classList.toggle('actief',isActief);

    // Deelstappen tonen/verbergen
    if(deelLijst){
      var isOpen=(si===_uitlegOpenStap);
      deelLijst.classList.toggle('open',isOpen);

      // Deelbol-stijlen bijwerken
      if(stap.deelstappen){
        stap.deelstappen.forEach(function(ds,di2){
          var deelItem=document.getElementById('uitleg-deel-item-'+si+'-'+di2);
          var deelBol=document.getElementById('uitleg-deelbol-'+si+'-'+di2);
          if(deelItem)deelItem.classList.toggle('actief',isActief&&di2===activeDi);
          if(deelBol)deelBol.classList.toggle('actief',isActief&&di2===activeDi);
        });
      }
    }
  });
}

function _updateUilPijlen(si,di){
  var isEerste=(si===0&&di===0);
  var isLaatste=_isLaatsteDeelstap(si,di);
  var uilL=document.getElementById('uitleg-uil-links');
  var uilR=document.getElementById('uitleg-uil-rechts');
  if(uilL)uilL.className='uitleg-uil-pijl'+(isEerste?' verborgen':'');
  if(uilR)uilR.className='uitleg-uil-pijl'+(isLaatste?' verborgen':'');
}

// ── Navigatie ──────────────────────────────────────────────────
function _gaNaarStap(si,di){
  _uitlegStapIdx=si; _uitlegDeelstapIdx=di;
  _renderStap(si,di);
}

function uitlegDeelVolgende(){
  var aantalDs=_aantalDeelstappen(_uitlegStapIdx);
  if(_uitlegDeelstapIdx<aantalDs-1){
    _gaNaarStap(_uitlegStapIdx,_uitlegDeelstapIdx+1);
  } else if(_uitlegStapIdx<_uitlegDef.stappen.length-1){
    _uitlegOpenStap=_uitlegStapIdx+1;
    _gaNaarStap(_uitlegStapIdx+1,0);
  } else { sluitUitleg(); }
}

function uitlegDeelTerug(){
  if(_uitlegDeelstapIdx>0){
    _gaNaarStap(_uitlegStapIdx,_uitlegDeelstapIdx-1);
  } else if(_uitlegStapIdx>0){
    var vorigeSi=_uitlegStapIdx-1;
    _uitlegOpenStap=vorigeSi;
    _gaNaarStap(vorigeSi,_aantalDeelstappen(vorigeSi)-1);
  }
}

// Muiswiel navigatie door stappen
function _handleWheel(e){
  // Ctrl+muiswiel: laat browser zoom werken
  if(e.ctrlKey)return;
  // Als muis boven de som-container: laat normaal scrollen
  var somCont=document.getElementById('uitleg-som-container');
  if(somCont&&somCont.contains(e.target))return;
  e.preventDefault();
  if(e.deltaY>0) uitlegDeelVolgende();
  else if(e.deltaY<0) uitlegDeelTerug();
}

// ── Scherm bouwen ──────────────────────────────────────────────
function _bouwUitlegScherm(def){
  var scherm=document.getElementById('screen-uitleg-interactief');
  scherm.innerHTML='';

  // Header
  var header=document.createElement('div');
  header.className='uitleg-header';
  header.innerHTML=
    '<button class="uitleg-header-terug" id="uitleg-int-terug" aria-label="Terug naar de som">&#8592;</button>'+
    '<div class="uitleg-header-titel">'+def.titel+'</div>';
  scherm.appendChild(header);

  // Body
  var body=document.createElement('div');
  body.className='uitleg-body';

  // Navigatiekolom links
  var navKolom=document.createElement('div');
  navKolom.className='uitleg-nav-kolom';
  navKolom.id='uitleg-nav-kolom';

  def.stappen.forEach(function(stap,si){
    var item=document.createElement('div');
    item.className='uitleg-stap-item';
    item.id='uitleg-stap-item-'+si;

    var bolRij=document.createElement('div');
    bolRij.className='uitleg-stap-bol-rij';

    var bol=document.createElement('div');
    bol.className='uitleg-bol';
    bol.id='uitleg-bol-'+si;
    bol.textContent=''+(si+1);

    var label=document.createElement('div');
    label.className='uitleg-stap-label';
    label.textContent=stap.titel||('Stap '+(si+1));

    bol.setAttribute('tabindex', '0');
    bol.setAttribute('role', 'button');
    bol.setAttribute('aria-label', 'Stap ' + (si+1) + ': ' + (stap.titel||''));
    (function(s){
      bol.addEventListener('focus',function(){
        var stap2=_uitlegDef.stappen[s];
        if(stap2) _uitlegSpreekDirect('Stap '+(s+1)+': '+(stap2.titel||''));
      });
    })(si);
    bolRij.appendChild(bol);
    bolRij.appendChild(label);
    item.appendChild(bolRij);

    // Deelstappen
    if(stap.deelstappen&&stap.deelstappen.length>1){
      var deelLijst=document.createElement('div');
      deelLijst.className='uitleg-deelstap-lijst';
      deelLijst.id='uitleg-deel-lijst-'+si;

      stap.deelstappen.forEach(function(ds,di){
        var deelItem=document.createElement('div');
        deelItem.className='uitleg-deelstap-item';
        deelItem.id='uitleg-deel-item-'+si+'-'+di;

        var deelBol=document.createElement('div');
        deelBol.className='uitleg-deelbol';
        deelBol.id='uitleg-deelbol-'+si+'-'+di;
        deelBol.setAttribute('tabindex','0');
        (function(s,d){
          deelBol.addEventListener('focus',function(){
            var stap2=_uitlegDef.stappen[s];
            var ds=stap2&&stap2.deelstappen?stap2.deelstappen[d]:null;
            var tekst='Deelstap '+(s+1)+'.'+(d+1);
            if(ds&&ds.uitleg) tekst+=': '+ds.uitleg.substring(0,60);
            _uitlegSpreekDirect(tekst);
          });
        })(si,di);
        deelBol.textContent=(si+1)+'.'+(di+1);

        var deelLabel=document.createElement('div');
        deelLabel.className='uitleg-deelstap-label';
        deelLabel.textContent=ds.uitleg?ds.uitleg.substring(0,30)+'…':'';

        deelItem.appendChild(deelBol);
        deelItem.appendChild(deelLabel);

        (function(s,d){
          deelItem.addEventListener('click',function(e){
            e.stopPropagation();
            _gaNaarStap(s,d);
          });
        })(si,di);

        deelLijst.appendChild(deelItem);
      });
      item.appendChild(deelLijst);
    }

    // Enter op bol → navigeer naar stap en focus naar kaart
    (function(s){
      bol.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          _uitlegFocusInNav=false;
          bolRij.click();
          setTimeout(function(){
            var k=document.getElementById('uitleg-stap-kaart');
            if(k)k.focus();
          },120);
        }
      });
    })(si);

    // Klik op hoofdstap-rij
    (function(s){
      bolRij.addEventListener('click',function(){
        if(_uitlegOpenStap===s&&_uitlegStapIdx===s){
          // Al open en actief: sluit deelstappen
          _uitlegOpenStap=-1;
        } else {
          _uitlegOpenStap=s;
        }
        _gaNaarStap(s,0);
      });
    })(si);

    navKolom.appendChild(item);
  });

  body.appendChild(navKolom);

  // Inhoud rechts
  var inhoud=document.createElement('div');
  inhoud.className='uitleg-inhoud';

  // Som-container
  var somCont=document.createElement('div');
  somCont.id='uitleg-som-container';
  somCont.className='uitleg-som-container';
  inhoud.appendChild(somCont);

  // Tekst-sectie met uil-pijlen
  var tekstSectie=document.createElement('div');
  tekstSectie.className='uitleg-tekst-sectie';

  var uilLinks=document.createElement('div');
  uilLinks.className='uitleg-uil-pijl verborgen';
  uilLinks.id='uitleg-uil-links';
  uilLinks.setAttribute('tabindex','0');
  uilLinks.setAttribute('aria-label','Vorige deelstap');
  uilLinks.innerHTML='<img src="https://raw.githubusercontent.com/arjen555/rekenen-afbeeldingen/main/uil_pijl2.png" alt="Vorige deelstap">';
  uilLinks.addEventListener('click',uitlegDeelTerug);
  uilLinks.addEventListener('focus',function(){_uitlegSpreekDirect('Vorige deelstap');});
  uilLinks.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();uitlegDeelTerug();}});

  var kaart=document.createElement('div');
  kaart.id='uitleg-stap-kaart';
  kaart.className='uitleg-stap-kaart';
  kaart.setAttribute('tabindex','0');
  kaart.id='uitleg-stap-kaart';
  kaart.addEventListener('focus',function(){
    var t=document.getElementById('uitleg-stap-titel');
    var k=document.getElementById('uitleg-stap-tekst');
    var tekst=(t?t.textContent:'')+(k?'. '+k.textContent:'');
    _uitlegSpreekDirect(tekst);
  });
  kaart.innerHTML=
    '<span class="uitleg-stap-titel-tekst" id="uitleg-stap-titel"></span>'+
    '<div class="uitleg-stap-uitleg" id="uitleg-stap-tekst"></div>';

  var uilRechts=document.createElement('div');
  uilRechts.className='uitleg-uil-pijl';
  uilRechts.id='uitleg-uil-rechts';
  uilRechts.setAttribute('tabindex','0');
  uilRechts.setAttribute('aria-label','Volgende deelstap');
  uilRechts.innerHTML='<img src="https://raw.githubusercontent.com/arjen555/rekenen-afbeeldingen/main/uil_pijl.png" alt="Volgende deelstap">';
  uilRechts.addEventListener('click',uitlegDeelVolgende);
  uilRechts.addEventListener('focus',function(){_uitlegSpreekDirect('Volgende deelstap');});
  uilRechts.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();uitlegDeelVolgende();}});

  tekstSectie.appendChild(uilLinks);
  tekstSectie.appendChild(kaart);
  tekstSectie.appendChild(uilRechts);
  inhoud.appendChild(tekstSectie);
  body.appendChild(inhoud);
  scherm.appendChild(body);

  // Events
  var terugEl=document.getElementById('uitleg-int-terug');
  terugEl.addEventListener('click',sluitUitleg);
  terugEl.addEventListener('focus',function(){_uitlegSpreekDirect('Terug naar de som');});

  // Toetsenbord op tekstvak
  var tekEl=document.getElementById('uitleg-stap-tekst');
  if(tekEl){
    tekEl.addEventListener('keydown',function(e){
      if(e.key==='Escape'){sluitUitleg();return;}
      if(e.key==='ArrowRight'){e.preventDefault();var ur=document.getElementById('uitleg-uil-rechts');if(ur&&!ur.classList.contains('verborgen'))ur.focus();else uitlegDeelVolgende();}
      if(e.key==='ArrowLeft'){e.preventDefault();var ul=document.getElementById('uitleg-uil-links');if(ul&&!ul.classList.contains('verborgen'))ul.focus();else uitlegDeelTerug();}
    });
  }

  // Muiswiel
  scherm.addEventListener('wheel',_handleWheel,{passive:false});

  // Focus trap, TAB en pijltjestoetsen
  scherm.addEventListener('keydown',function(e){
    if(e.key==='Escape'){sluitUitleg();return;}

    var actief=document.activeElement;
    var inNav=actief&&(actief.classList.contains('uitleg-bol')||actief.classList.contains('uitleg-deelbol'));
    var inKaart=actief&&actief.id==='uitleg-stap-kaart';
    var inUilL=actief&&actief.id==='uitleg-uil-links';
    var inUilR=actief&&actief.id==='uitleg-uil-rechts';
    var inTerug=actief&&actief.id==='uitleg-int-terug';

    function getEl(id){return document.getElementById(id);}
    function zichtbaar(el){return el&&!el.classList.contains('verborgen');}

    // TAB-volgorde: terug → nav → uil-links → kaart → uil-rechts → terug
    if(e.key==='Tab'){
      e.preventDefault();
      // Bouw de actuele volgorde op basis van wat zichtbaar is
      var volgorde=[];
      var t=getEl('uitleg-int-terug'); if(t) volgorde.push(t);
      var b=getEl('uitleg-bol-0'); if(b) volgorde.push(b);
      var ul=getEl('uitleg-uil-links'); if(ul&&zichtbaar(ul)) volgorde.push(ul);
      var kk=getEl('uitleg-stap-kaart'); if(kk) volgorde.push(kk);
      var ur=getEl('uitleg-uil-rechts'); if(ur&&zichtbaar(ur)) volgorde.push(ur);
      
      var huidig=document.activeElement;
      var idx=volgorde.indexOf(huidig);
      var nieuwIdx;
      if(e.shiftKey){
        nieuwIdx=idx<=0?volgorde.length-1:idx-1;
      } else {
        nieuwIdx=idx>=volgorde.length-1?0:idx+1;
      }
      volgorde[nieuwIdx].focus();
      return;
    }

    // Pijltjes links/rechts buiten nav: tussen zones
    if(!inNav&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
      e.preventDefault();
      var uilL2=getEl('uitleg-uil-links');
      var kaart2=getEl('uitleg-stap-kaart');
      var uilR2=getEl('uitleg-uil-rechts');
      var bol02=getEl('uitleg-bol-0');
      if(e.key==='ArrowRight'){
        if(inUilL){if(kaart2)kaart2.focus();}
        else if(inKaart){if(zichtbaar(uilR2))uilR2.focus();}
        else if(inUilR){uitlegDeelVolgende();}
      } else {
        if(inUilR){if(kaart2)kaart2.focus();}
        else if(inKaart){if(zichtbaar(uilL2))uilL2.focus();else if(bol02)bol02.focus();}
        else if(inUilL){if(bol02)bol02.focus();}
      }
      return;
    }

    // Pijltjes omhoog/omlaag in nav: door bolletjes
    if(inNav&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
      e.preventDefault();
      var alleBollen=Array.from(scherm.querySelectorAll('[id^="uitleg-bol-"],[id^="uitleg-deelbol-"]'));
      // Filter alleen zichtbare
      alleBollen=alleBollen.filter(function(b){
        var lijst=b.closest('.uitleg-deelstap-lijst');
        return !lijst||lijst.classList.contains('open');
      });
      var huidigeIdx=alleBollen.indexOf(actief);
      var nieuweIdx=e.key==='ArrowDown'?Math.min(huidigeIdx+1,alleBollen.length-1):Math.max(huidigeIdx-1,0);
      var doelBol=alleBollen[nieuweIdx];
      if(doelBol){
        _uitlegFocusInNav=true;
        var bolId=doelBol.id;
        var mH=/^uitleg-bol-(\d+)$/.exec(bolId);
        var mD=/^uitleg-deelbol-(\d+)-(\d+)$/.exec(bolId);
        if(mH){_uitlegOpenStap=parseInt(mH[1]);_gaNaarStap(parseInt(mH[1]),0);}
        else if(mD){_gaNaarStap(parseInt(mD[1]),parseInt(mD[2]));}
        doelBol.scrollIntoView({block:'nearest'});
        setTimeout(function(){doelBol.focus();},80);
      }
      return;
    }

    // Pijltjes links in nav: ga naar uil-links of kaart
    if(inNav&&e.key==='ArrowLeft'){
      e.preventDefault();
      var uilL3=getEl('uitleg-uil-links');
      if(zichtbaar(uilL3))uilL3.focus();else{var k3=getEl('uitleg-stap-kaart');if(k3)k3.focus();}
      return;
    }
    // Pijltjes rechts in nav: ga naar uil-links
    if(inNav&&e.key==='ArrowRight'){
      e.preventDefault();
      var uilL4=getEl('uitleg-uil-links');
      if(zichtbaar(uilL4))uilL4.focus();else{var k4=getEl('uitleg-stap-kaart');if(k4)k4.focus();}
      return;
    }
  });
}

// ── Openen / Sluiten ───────────────────────────────────────────
function openUitleg(methode,bewerking){
  var key=methode+'-'+bewerking;
  var def=UITLEG_DEFINITIES[key];
  if(!def){if(typeof showUitlegOud==='function')showUitlegOud();return;}

  _uitlegActief=true; _uitlegDef=def;
  _uitlegStapIdx=0; _uitlegDeelstapIdx=0;
  _uitlegOpenStap=0; // eerste stap open bij start

  _bouwUitlegScherm(def);
  if(typeof showScreen==='function')showScreen('screen-uitleg-interactief');
  _bouwSom(_vindSom(0));
  _renderStap(0,0);
  setTimeout(function(){var b=document.getElementById('uitleg-bol-0');if(b)b.focus();},100);
}

function sluitUitleg(){
  _uitlegActief=false;
  if(_uitlegAnimTimeout){clearTimeout(_uitlegAnimTimeout);_uitlegAnimTimeout=null;}
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(typeof showScreen==='function')showScreen('screen-exercise');
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
          { uitleg: 'Bij kolomsgewijs optellen zetten we de som onder elkaar en tellen we per kolom de getallen op.', highlight: [], animaties: [] },
          { uitleg: 'Deelstap 1.2 — komt er nog aan.', highlight: [], animaties: [] },
          { uitleg: 'Deelstap 1.3 — komt er nog aan.', highlight: [], animaties: [] },
          { uitleg: 'Deelstap 1.4 — komt er nog aan.', highlight: [], animaties: [] }
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
