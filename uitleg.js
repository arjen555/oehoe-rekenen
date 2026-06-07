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
var _uitlegFocusInNav=false;
var _uitlegVanuitKeuzemenu=false; // voorkomt dat renderStap focus naar kaart stuurt

// ── Hulpfuncties ───────────────────────────────────────────────
function _uitlegSpreek(tekst){
  if(!tekst)return;
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(typeof speakTekst==='function'&&cfg&&cfg.autoVoorlezen) speakTekst(tekst,true);
}
function _uitlegSpreekDirect(tekst){
  if(!tekst||!cfg||!cfg.autoVoorlezen||!window.speechSynthesis)return;
  speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(tekst);
  u.lang='nl-NL';
  u.rate=typeof spreekSnelheid!=='undefined'?spreekSnelheid:1;
  speechSynthesis.speak(u);
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
  // Titel alleen tonen bij eerste deelstap of stap zonder deelstappen
  var toonTitel=(di===0||!stap.deelstappen||stap.deelstappen.length<=1);
  if(titEl){titEl.textContent=titelTekst;titEl.style.display=toonTitel?'':'none';}
  if(tekEl)tekEl.textContent=uitlegTekst;

  _uitlegHighlight(highlights||[]);
  _updateNavKolom(si,di);
  _updateUilPijlen(si,di);

  // Bij deelstappen alleen de uitlegtekst voorlezen, niet de hoofdstaptitel
  var spreekTekst = (stap.deelstappen && stap.deelstappen.length > 1)
    ? uitlegTekst
    : titelTekst + '. ' + uitlegTekst;
  _uitlegSpreek(spreekTekst);
  // Controleer of tekstkader overloopt → fade weg, schuifbalk aan
  setTimeout(function(){
    var kaart=document.getElementById('uitleg-stap-kaart');
    if(kaart){
      kaart.scrollTop=0;
      if(kaart.scrollHeight>kaart.clientHeight+8){
        kaart.classList.add('heeft-overflow');
      } else {
        kaart.classList.remove('heeft-overflow');
      }
    }
  },60);
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
  } else {
    // Laatste deelstap: als vanuit keuzemenu, focus naar startknop
    var sk=document.getElementById('btn-uitleg-start');
    if(sk&&sk.style.display!=='none'){
      sk.focus();
      _uitlegSpreekDirect(sk.textContent);
      return;
    }
    sluitUitleg();
  }
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
  // Ctrl+muiswiel: browser zoom, nooit afvangen
  if(e.ctrlKey)return;
  // Muiswiel altijd: navigeer door deelstappen
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
  var terugTekst=_uitlegVanuitKeuzemenu?'Terug naar het keuzemenu':'Terug naar de som';
  header.innerHTML=
    '<button class="uitleg-header-terug" id="uitleg-int-terug" aria-label="'+terugTekst+'">&#8592;</button>'+
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
        deelBol.textContent=(si+1)+'.'+(di+1);

        var deelLabel=document.createElement('div');
        deelLabel.className='uitleg-deelstap-label';
        deelLabel.textContent=ds.titel||(ds.uitleg?ds.uitleg.substring(0,30)+'…':'');

        deelItem.appendChild(deelBol);
        deelItem.appendChild(deelLabel);

        (function(s,d){
          deelItem.addEventListener('click',function(e){
            e.stopPropagation();
            _gaNaarStap(s,d);
            setTimeout(function(){
              var db=document.getElementById('uitleg-deelbol-'+s+'-'+d);
              if(db){_uitlegFocusInNav=true;db.focus();}
            },80);
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
          _uitlegOpenStap=-1;
        } else {
          _uitlegOpenStap=s;
        }
        _gaNaarStap(s,0);
        // Focus op de bol zodat pijltjesnavigatie werkt
        setTimeout(function(){
          var b=document.getElementById('uitleg-bol-'+s);
          if(b){_uitlegFocusInNav=true;b.focus();}
        },80);
      });
    })(si);

    navKolom.appendChild(item);
  });

  // Knop 'Nu zelf aan de slag!' onder navigatiemenu (alleen vanuit keuzemenu)
  var startKnopWrap=document.createElement('div');
  startKnopWrap.className='uitleg-start-knop-wrap';
  var startKnop=document.createElement('button');
  startKnop.className='btn-uitleg-start';
  startKnop.id='btn-uitleg-start';
  startKnop.textContent=_uitlegVanuitKeuzemenu?'Nu zelf aan de slag!':'Verder met de som';
  startKnop.addEventListener('click', function(){
    sluitUitlegNaarSom();
  });
  startKnopWrap.appendChild(startKnop);
  navKolom.appendChild(startKnopWrap);

  // Klik in navkolom: focus op actieve bol
  // Compacte terugknop bovenin navkolom (zichtbaar als header verdwijnt)
  var terugCompact=document.createElement('button');
  terugCompact.className='uitleg-header-terug uitleg-header-terug-compact';
  terugCompact.setAttribute('aria-label', 'Terug');
  terugCompact.innerHTML='&#8592;';
  terugCompact.style.cssText='display:none;margin:8px auto 12px auto;';
  terugCompact.addEventListener('click',sluitUitleg);
  navKolom.insertBefore(terugCompact, navKolom.firstChild);

  navKolom.addEventListener('click',function(e){
    if(e.target===navKolom||e.target.classList.contains('uitleg-nav-kolom')){
      var actieveBol=document.getElementById('uitleg-bol-'+_uitlegStapIdx);
      if(actieveBol) actieveBol.focus();
    }
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
  uilLinks.setAttribute('tabindex','-1');
  uilLinks.setAttribute('aria-hidden','true');
  uilLinks.setAttribute('aria-label','Vorige deelstap');
  uilLinks.innerHTML='<img src="https://raw.githubusercontent.com/arjen555/rekenen-afbeeldingen/main/uil_pijl2.png" alt="Vorige deelstap">';
  uilLinks.addEventListener('click',uitlegDeelTerug);


  var kaart=document.createElement('div');
  kaart.id='uitleg-stap-kaart';
  kaart.className='uitleg-stap-kaart';
  kaart.setAttribute('tabindex','-1');
  kaart.id='uitleg-stap-kaart';
  kaart.innerHTML=
    '<span class="uitleg-stap-titel-tekst" id="uitleg-stap-titel"></span>'+
    '<div class="uitleg-stap-uitleg" id="uitleg-stap-tekst"></div>';

  var uilRechts=document.createElement('div');
  uilRechts.className='uitleg-uil-pijl';
  uilRechts.id='uitleg-uil-rechts';
  uilRechts.setAttribute('tabindex','-1');
  uilRechts.setAttribute('aria-hidden','true');
  uilRechts.setAttribute('aria-label','Volgende deelstap');
  uilRechts.innerHTML='<img src="https://raw.githubusercontent.com/arjen555/rekenen-afbeeldingen/main/uil_pijl.png" alt="Volgende deelstap">';
  uilRechts.addEventListener('click',uitlegDeelVolgende);


  tekstSectie.appendChild(uilLinks);
  tekstSectie.appendChild(kaart);
  tekstSectie.appendChild(uilRechts);
  inhoud.appendChild(tekstSectie);
  body.appendChild(inhoud);
  scherm.appendChild(body);

  // Events
  var terugEl=document.getElementById('uitleg-int-terug');
  terugEl.addEventListener('click',sluitUitleg);



  // Muiswiel
  scherm.addEventListener('wheel',_handleWheel,{passive:false});

  // Focus trap, TAB en pijltjestoetsen
  scherm.addEventListener('keydown',function(e){
    if(e.key==='Escape'){sluitUitleg();return;}

    // Pijltjes omhoog/omlaag: altijd navigeren, behalve als tekst focus heeft en overloopt
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      var kaartFocus=document.activeElement&&document.getElementById('uitleg-stap-kaart')&&
                     document.getElementById('uitleg-stap-kaart').contains(document.activeElement);
      var kaart2=document.getElementById('uitleg-stap-kaart');
      if(kaartFocus&&kaart2&&kaart2.scrollHeight>kaart2.clientHeight+4){
        // Tekst heeft focus en overloopt: scroll door tekst
        // Aan einde? Dan toch navigeren
        var aanTop2=kaart2.scrollTop<=0;
        var aanOnder2=kaart2.scrollTop+kaart2.clientHeight>=kaart2.scrollHeight-4;
        if(e.key==='ArrowDown'&&!aanOnder2){return;}
        if(e.key==='ArrowUp'&&!aanTop2){return;}
      }
      e.preventDefault();
      if(e.key==='ArrowDown') uitlegDeelVolgende();
      else uitlegDeelTerug();
      return;
    }

    var actief=document.activeElement;
    var inNav=actief&&(actief.classList.contains('uitleg-bol')||actief.classList.contains('uitleg-deelbol'));
    var inTerug=actief&&actief.id==='uitleg-int-terug';

    function getEl(id){return document.getElementById(id);}
    function zichtbaar(el){return el&&!el.classList.contains('verborgen');}

    // TAB-volgorde: terug → nav → uil-links → kaart → uil-rechts → terug
    if(e.key==='Tab'){
      e.preventDefault();
      var volgorde=[];
      var t=getEl('uitleg-int-terug');
      if(t) volgorde.push({el:t,tekst:_uitlegVanuitKeuzemenu?'Terug naar het keuzemenu':'Terug naar de som'});
      var b=getEl('uitleg-bol-0'); if(b){
        var actieveSi=_uitlegStapIdx;
        var actieveStap=_uitlegDef.stappen[actieveSi];
        volgorde.push({el:b,tekst:'Navigatiemenu. '+(actieveStap?'Stap '+(actieveSi+1)+': '+actieveStap.titel:'')});
      }
      var sk=getEl('btn-uitleg-start');
      if(sk&&sk.style.display!=='none'){
        volgorde.push({el:sk,tekst:sk.textContent});
      }

      var huidig=document.activeElement;
      var idx=-1;
      for(var vi=0;vi<volgorde.length;vi++){if(volgorde[vi].el===huidig){idx=vi;break;}}
      var nieuwIdx=e.shiftKey?(idx<=0?volgorde.length-1:idx-1):(idx>=volgorde.length-1?0:idx+1);
      var doel=volgorde[nieuwIdx];
      doel.el.focus();
      _uitlegSpreekDirect(doel.tekst);
      return;
    }



    // Pijltjes omhoog/omlaag in nav: door bolletjes
    if(inNav&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
      e.preventDefault();
      // Verzamel bollen in DOM-volgorde:
      // - hoofdbollen altijd zichtbaar
      // - deelbolletjes alleen als hun lijst open is
      var alleBollen=[];
      var navKolom2=document.getElementById('uitleg-nav-kolom');
      if(navKolom2){
        var kandidaten=Array.from(navKolom2.querySelectorAll('.uitleg-bol,.uitleg-deelbol'));
        kandidaten.forEach(function(b){
          if(b.classList.contains('uitleg-bol')){
            alleBollen.push(b); // hoofdbol altijd meenemen
          } else {
            var lijst=b.closest('.uitleg-deelstap-lijst');
            if(lijst&&lijst.classList.contains('open')) alleBollen.push(b);
          }
        });
      }
      var huidigeIdx=alleBollen.indexOf(actief);
      var nieuweIdx=e.key==='ArrowDown'?huidigeIdx+1:Math.max(huidigeIdx-1,0);
      // Voorbij laatste bol: focus naar actieknop
      if(nieuweIdx>=alleBollen.length&&e.key==='ArrowDown'){
        var sk2=document.getElementById('btn-uitleg-start');
        if(sk2&&sk2.style.display!=='none'){
          sk2.focus();
          _uitlegSpreekDirect(sk2.textContent);
        }
        return;
      }
      nieuweIdx=Math.min(nieuweIdx,alleBollen.length-1);
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


  });
}

// ── Openen / Sluiten ───────────────────────────────────────────
function openUitleg(methode,bewerking,vanuitKeuzemenu){
  var key=methode+'-'+bewerking;
  var def=UITLEG_DEFINITIES[key];
  if(!def){if(typeof showUitlegOud==='function')showUitlegOud();return;}

  _uitlegActief=true; _uitlegDef=def;
  _uitlegStapIdx=0; _uitlegDeelstapIdx=0;
  _uitlegOpenStap=0; // eerste stap open bij start
  _uitlegVanuitKeuzemenu=(vanuitKeuzemenu===true);

  _bouwUitlegScherm(def);
  if(typeof showScreen==='function')showScreen('screen-uitleg-interactief');
  // Toon 'Nu zelf aan de slag!' alleen vanuit keuzemenu
  var startKnop=document.getElementById('btn-uitleg-start');
  if(startKnop){
    startKnop.style.display='block';
    startKnop.textContent=_uitlegVanuitKeuzemenu?'Nu zelf aan de slag!':'Verder met de som';
  }
  _bouwSom(_vindSom(0));
  _renderStap(0,0);
  setTimeout(function(){var b=document.getElementById('uitleg-bol-0');if(b)b.focus();},100);
}

function sluitUitleg(){
  _uitlegActief=false;
  if(_uitlegAnimTimeout){clearTimeout(_uitlegAnimTimeout);_uitlegAnimTimeout=null;}
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(_uitlegVanuitKeuzemenu){
    // Terug naar keuzemenu
    _uitlegVanuitKeuzemenu=false;
    if(typeof showScreen==='function')showScreen('screen-setup');
  } else {
    // Terug naar de som
    if(typeof showScreen==='function')showScreen('screen-exercise');
  }
}

function sluitUitlegNaarSom(){
  var vanuitKeuzemenu=_uitlegVanuitKeuzemenu;
  _uitlegVanuitKeuzemenu=false;
  _uitlegActief=false;
  if(_uitlegAnimTimeout){clearTimeout(_uitlegAnimTimeout);_uitlegAnimTimeout=null;}
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(vanuitKeuzemenu){
    if(typeof startExercise==='function') startExercise();
    else if(typeof showScreen==='function') showScreen('screen-exercise');
  } else {
    if(typeof showScreen==='function') showScreen('screen-exercise');
  }
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
          { titel: 'Per kolom', uitleg: 'Bij kolomsgewijs optellen zetten we de som onder elkaar en tellen we per kolom de getallen op.', highlight: [], animaties: [] },
          { titel: 'Cijferwaardes', uitleg: 'De cijfers in iedere kolom hebben een andere waarde. De 3 en de 2, die je in deze kolom ziet, zijn 300 en 200 waard in de getallen van de som. Daarom staat bovenaan de letter H, die staat voor honderdtallen.', highlight: ['a-h','b-h','inv1-h','inv2-h','inv3-h','ans-h'], animaties: [] },
          { titel: 'Tientallen', uitleg: 'De 4 en de 5 zijn op diezelfde manier tientallen: 40 en 50. Bovenaan de kolom staat dan ook de T van tientallen.', highlight: ['a-t','b-t','inv1-t','inv2-t','inv3-t','ans-t'], animaties: [] },
          { titel: 'Eenheden', uitleg: 'En tenslotte, de 7 en de 6, dat zijn de losse getallen, die noemen we ook wel eenheden. Vandaar de letter E bovenaan de kolom.', highlight: ['a-e','b-e','inv1-e','inv2-e','inv3-e','ans-e'], animaties: [] }
        ]
      },
      {
        som: null,
        titel: 'Per kolom optellen',
        uitleg: 'Nu gaan we per kolom de getallen optellen.',
        highlight: [],
        animaties: [],
        deelstappen: [
          {
            titel: 'De rijen',
            uitleg: 'Zoals er een kolom van boven naar beneden is voor de honderdtallen, zo is er ook een rij van links naar rechts voor de honderdtallen: de H-rij.',
            highlight: ['a-h','b-h','inv1-h','inv1-t','inv1-e','inv2-h','inv3-h','ans-h'],
            animaties: []
          },
          { titel: 'De H-rij', uitleg: 'In de H-rij tellen we de honderdtallen van de som bij elkaar en vullen die in, zoals hier.', highlight: ['a-h','b-h','inv1-h','inv1-t','inv1-e'], animaties: [
            { type:'vulIn', cel:'inv1-h', waarde:'5' },
            { type:'vulIn', cel:'inv1-t', waarde:'0' },
            { type:'vulIn', cel:'inv1-e', waarde:'0' }
          ] },
          { titel: 'De T-rij', uitleg: 'Na de honderdtallen zijn de tientallen aan de beurt, de 4 en de 5. Die optelsom schrijven we in de T-rij. Let er goed op dat je begint in te vullen in de T-kolom, het zijn immers tientallen.', highlight: ['a-t','b-t','inv2-h','inv2-t','inv2-e'], animaties: [
            { type:'vulIn', cel:'inv2-t', waarde:'9' },
            { type:'vulIn', cel:'inv2-e', waarde:'0' }
          ] },
          { titel: 'De E-rij', uitleg: 'Tenslotte moeten we de eenheden nog optellen. We kijken naar de E-kolom en vullen in op de E-rij. Maar let op:', highlight: ['a-e','b-e','inv3-h','inv3-t','inv3-e'], animaties: [] },
          { titel: 'Doorschuiven', uitleg: '7+6=13. Wat is de 1 in dit getal? Juist, een tiental. Dus de 1 schrijven we in de kolom van de tientallen op de rij van de eenheden. En de 3 komt daar natuurlijk gezellig naast te staan.', highlight: ['a-e','b-e','inv3-t','inv3-e'], animaties: [
            { type:'vulIn', cel:'inv3-t', waarde:'1' },
            { type:'vulIn', cel:'inv3-e', waarde:'3' }
          ] }
        ]
      },
      {
        som: null,
        titel: 'Onze uitkomsten optellen',
        uitleg: 'Nu gaan we wat we al opgeteld hebben samenvoegen tot één einduitkomst.',
        highlight: [],
        animaties: [],
        deelstappen: [
          {
            titel: 'Naar de einduitkomst',
            uitleg: 'Nu gaan we wat we al opgeteld hebben, samenvoegen tot één einduitkomst.',
            highlight: ['inv1-h','inv1-t','inv1-e','inv2-h','inv2-t','inv2-e','inv3-h','inv3-t','inv3-e'],
            animaties: []
          },
          {
            titel: 'Honderdtallen',
            uitleg: 'We hebben in totaal 5 honderdtallen opgeschreven, die mag je dus invullen in de einduitkomst bij de honderdtallen.',
            highlight: ['inv1-h','ans-h'],
            animaties: [ { type:'vulIn', cel:'ans-h', waarde:'5' } ]
          },
          {
            titel: 'Tien tientallen',
            uitleg: 'In de T-kolom hebben we 9+1. O jee, dat zijn 10 tientallen en dat is 100: nog een honderdtal! En we hebben daar al een 5 geschreven. Dat moet een 6 worden.',
            highlight: ['inv2-t','inv3-t','ans-t','ans-h'],
            animaties: [
              { type:'vulIn', cel:'ans-h', waarde:'6' },
              { type:'vulIn', cel:'ans-t', waarde:'0' }
            ]
          },
          {
            titel: 'De som is klaar!',
            uitleg: 'Tenslotte kijken we naar de eenheden. Die hebben we 3 in onze uitkomstrijen bij de E-kolom staan. En dus vullen we een 3 in op de einduitkomst. Totaal: 603. We zijn klaar!',
            highlight: ['inv3-e','ans-e'],
            animaties: [ { type:'vulIn', cel:'ans-e', waarde:'3' } ]
          }
        ]
      },

    ]
  }
};
