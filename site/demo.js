// Chat dimostrativa: cliccando una domanda di "Cosa puoi chiedere" si apre un pannello laterale
// con una risposta d'esempio, come la darebbe un assistente AI collegato a seomcp.
// Tutti i dati sono di fantasia. Nessuna chiamata esterna: le risposte sono qui sotto.
(function () {
  'use strict';

  var CONTACT_URL = 'https://contentisking.guru/contattaci/';

  // Ogni risposta: tool usati e blocchi di contenuto ['p', testo] | ['ul', [voci]] | ['table', [intestazioni], [[righe]]].
  var ANSWERS = {
    'Quali query sono in posizione 4-20 negli ultimi 90 giorni?': {
      tools: ['gsc_striking_distance · 90 giorni'],
      blocks: [
        ['p', 'Ho trovato 38 query in posizione 4-20. Le cinque con più potenziale, ordinate per impressioni:'],
        ['table', ['Query', 'Pos.', 'Impr.', 'Pagina'], [
          ['scarpe trekking donna', '6,2', '8.410', '/scarpe-trekking/donna/'],
          ['scarponi impermeabili', '11,8', '5.120', '/scarponi/'],
          ['zaino 30 litri', '4,9', '3.760', '/zaini/30-litri/'],
          ['bastoncini trekking', '14,3', '2.980', '/accessori/bastoncini/'],
          ['giacca antipioggia', '8,7', '2.450', '/abbigliamento/giacche/'],
        ]],
        ['p', 'La più vicina è "zaino 30 litri": la pagina è già quinta. Aggiungerei una tabella di confronto tra i modelli e una FAQ sulle misure da bagaglio a mano.'],
      ],
    },
    'Confronta questo mese con lo stesso periodo dell\'anno scorso.': {
      tools: ['gsc_compare_periods · anno precedente'],
      blocks: [
        ['p', 'Nel complesso i clic sono +12% (18.240 contro 16.290), con impressioni +21%. Il posizionamento medio è sceso leggermente, da 14,1 a 15,3: siete visibili per più query, ma su alcune più in basso.'],
        ['ul', [
          'In crescita: "scarpe trekking donna" (+640 clic) e "zaino 30 litri" (+410).',
          'In calo: "scarponi invernali" (−380 clic, da posizione 3 a 7).',
          'Nuove query: 214 query che l\'anno scorso non portavano clic.',
        ]],
        ['p', 'Da guardare subito il calo di "scarponi invernali": la pagina non è aggiornata da 14 mesi.'],
      ],
    },
    'Confronta questo mese con lo stesso periodo dell\'anno scorso e segnala i cali di clic sopra il 30%.': {
      tools: ['gsc_compare_periods · anno precedente'],
      blocks: [
        ['p', 'Clic totali: +12% rispetto a settembre dell\'anno scorso. Ma 4 query hanno perso più del 30% dei clic:'],
        ['table', ['Query', 'Clic prima', 'Clic ora', 'Variazione'], [
          ['scarponi invernali', '1.020', '640', '−37%'],
          ['calze tecniche', '410', '230', '−44%'],
          ['ghette neve', '260', '150', '−42%'],
          ['borraccia termica', '380', '250', '−34%'],
        ]],
        ['p', 'Tre su quattro sono prodotti invernali: in parte è stagionalità, ma "calze tecniche" ha perso anche posizioni (da 4 a 9). Lì controllerei i concorrenti che vi hanno superato.'],
      ],
    },
    'Quali pagine ricevono molti clic da Google ma convertono poco?': {
      tools: ['gsc_performance · per pagina', 'ga_organic_landing_pages'],
      blocks: [
        ['p', 'Ho incrociato i clic di Search Console con le conversioni organiche di Analytics (ultimi 28 giorni):'],
        ['table', ['Pagina', 'Clic', 'Tasso conv.', 'Media sito'], [
          ['/guida/come-scegliere-scarpe/', '4.120', '0,3%', '2,1%'],
          ['/blog/sentieri-dolomiti/', '2.870', '0,1%', '2,1%'],
          ['/scarponi/', '1.940', '0,9%', '2,1%'],
        ]],
        ['p', 'Le prime due sono contenuti informativi: attirano traffico ma non portano ai prodotti. Aggiungerei link ai modelli consigliati dentro la guida. "/scarponi/" invece è una pagina di categoria che converte poco: controllerei prezzi e filtri.'],
      ],
    },
    'Il traffico organico di questo mese è calato rispetto all\'anno scorso? Su quali pagine di destinazione?': {
      tools: ['ga_compare_periods · ricerca organica'],
      blocks: [
        ['p', 'Sì, le sessioni organiche sono −8% (12.300 contro 13.370). Il calo è concentrato in poche pagine:'],
        ['table', ['Pagina di destinazione', 'Sessioni', 'Variazione'], [
          ['/scarponi-invernali/', '980', '−41%'],
          ['/blog/ciaspole-principianti/', '410', '−52%'],
          ['/offerte/', '720', '−18%'],
        ]],
        ['p', 'Le altre pagine sono stabili o in crescita. Le prime due sono stagionali, ma il −52% del blog è più del normale: controllerei in Search Console se ha perso posizioni.'],
      ],
    },
    'Da Bing arrivano visitatori più o meno coinvolti rispetto a Google?': {
      tools: ['ga_report · sessionSource'],
      blocks: [
        ['table', ['Motore', 'Sessioni', 'Tasso di coinvolgimento', 'Conversioni'], [
          ['Google', '11.480', '58%', '214'],
          ['Bing', '820', '66%', '23'],
        ]],
        ['p', 'Da Bing arrivano molte meno visite, ma più coinvolte: il tasso di conversione è 2,8% contro l\'1,9% di Google. Vale la pena curare Bing: con Bing Webmaster Tools puoi vedere su quali query compari.'],
      ],
    },
    'Quante persone stanno leggendo il nuovo articolo in questo momento?': {
      tools: ['ga_realtime · ultimi 30 minuti'],
      blocks: [
        ['p', 'In questo momento ci sono 37 utenti attivi sul sito. Sul nuovo articolo "Guida alle ciaspole 2026" ce ne sono 12:'],
        ['ul', ['8 da mobile, 4 da desktop.', '9 dall\'Italia, 2 dalla Svizzera, 1 dalla Germania.']],
        ['p', 'È la seconda pagina più letta del momento, dopo la home. Arrivano soprattutto dalla newsletter di stamattina.'],
      ],
    },
    'Perché ChatGPT cita il mio concorrente e non me? Confronta le due pagine.': {
      tools: ['geo_page_metrics × 2'],
      blocks: [
        ['p', 'Ho misurato la tua pagina e quella di concorrente.it sulla stessa guida. Le differenze che contano per i motori AI:'],
        ['table', ['Misura', 'Tu', 'Concorrente'], [
          ['Risposta in apertura', '12 parole', '52 parole'],
          ['Titoli a domanda', '0 su 6', '5 su 7'],
          ['Dati numerici ogni 100 parole', '0,8', '3,4'],
          ['Fonti autorevoli citate', '0', '3'],
          ['Ultimo aggiornamento', '14 mesi fa', '2 mesi fa'],
        ]],
        ['p', 'Il concorrente risponde subito alla domanda, con dati e fonti: è esattamente il formato che i motori AI estraggono e citano. Partirei da un paragrafo iniziale di 40-60 parole che risponde senza giri di parole.'],
      ],
    },
    'Questa pagina è indicizzata? Quale canonical ha scelto Google?': {
      tools: ['gsc_inspect_url'],
      blocks: [
        ['p', 'Sì, la pagina è indicizzata ("L\'URL è su Google"). Ultima scansione: 3 giorni fa, da smartphone.'],
        ['ul', [
          'Canonical dichiarato: https://www.esempio.it/scarponi/',
          'Canonical scelto da Google: https://www.esempio.it/scarponi/ (coincidono).',
          'Risultati avanzati: breadcrumb valido, prodotto con 2 avvisi (manca "brand").',
        ]],
        ['p', 'Tutto in ordine. Se vuoi, sistemo i due avvisi dei dati strutturati.'],
      ],
    },
    'Su Bing come va la query "corso SEO" rispetto a Google?': {
      tools: ['bing_query_stats', 'gsc_performance'],
      blocks: [
        ['table', ['Motore', 'Impressioni', 'Clic', 'Posizione'], [
          ['Google', '6.200', '148', '9,4'],
          ['Bing', '1.340', '61', '4,1'],
        ]],
        ['p', 'Su Bing siete in quarta posizione e il CTR è più alto (4,6% contro 2,4%). Su Google la pagina è al limite della prima pagina: è la query su cui investirei, perché basterebbe salire di 3-4 posizioni.'],
      ],
    },
    'Qual è il volume di ricerca su Bing di "noleggio bici Garda"?': {
      tools: ['bing_keyword_stats · Italia'],
      blocks: [
        ['p', 'Su Bing, in Italia, "noleggio bici Garda" ha circa 1.900 impressioni al mese, con un forte picco stagionale:'],
        ['ul', ['Aprile-settembre: 2.500-3.400 al mese.', 'Novembre-febbraio: meno di 400 al mese.']],
        ['p', 'La corrispondenza estesa (varianti della query) arriva a 5.800 al mese. Conviene pubblicare o aggiornare la pagina entro marzo.'],
      ],
    },
    'Il sito supera i Core Web Vitals su mobile?': {
      tools: ['crux_query · mobile, 28 giorni'],
      blocks: [
        ['p', 'No, per poco. Dati reali degli utenti Chrome su mobile, ultimi 28 giorni:'],
        ['table', ['Metrica', '75° percentile', 'Giudizio'], [
          ['LCP', '2,9 s', 'da migliorare'],
          ['INP', '140 ms', 'buono'],
          ['CLS', '0,04', 'buono'],
        ]],
        ['p', 'Manca solo l\'LCP: 0,4 secondi sopra la soglia di 2,5. Di solito basta ottimizzare l\'immagine principale della home (è un JPG di 480 KB).'],
      ],
    },
    'Il sito supera i Core Web Vitals su mobile? Com\'è cambiato l\'LCP nelle ultime settimane?': {
      tools: ['crux_query', 'crux_history · 12 settimane'],
      blocks: [
        ['p', 'Su mobile INP e CLS sono buoni, l\'LCP no: 2,9 secondi al 75° percentile (la soglia è 2,5).'],
        ['table', ['Settimana', 'LCP'], [['12 settimane fa', '2,4 s'], ['8 settimane fa', '2,5 s'], ['4 settimane fa', '2,8 s'], ['Oggi', '2,9 s']]],
        ['p', 'Il peggioramento è iniziato circa due mesi fa. Coincide con qualche modifica al sito in quel periodo?'],
      ],
    },
    'L\'LCP è migliorato dopo il cambio di tema del mese scorso?': {
      tools: ['crux_history · 16 settimane'],
      blocks: [
        ['p', 'Sì, in modo netto. LCP al 75° percentile, mobile:'],
        ['table', ['Periodo', 'LCP', 'Giudizio'], [['Prima del cambio', '3,6 s', 'da migliorare'], ['2 settimane dopo', '2,7 s', 'da migliorare'], ['Ultima settimana', '2,1 s', 'buono']]],
        ['p', 'I dati CrUX coprono 28 giorni, quindi il miglioramento completo si vede solo ora. Il sito supera la soglia di 2,5 secondi per la prima volta da marzo.'],
      ],
    },
    'Testa la home con PageSpeed e dimmi le tre correzioni che valgono di più.': {
      tools: ['psi_analyze · mobile'],
      blocks: [
        ['p', 'Punteggio prestazioni su mobile: 58/100. Le tre correzioni con il risparmio stimato più alto:'],
        ['ul', [
          'Ridurre il JavaScript inutilizzato: −1,4 s (soprattutto lo script della chat e un vecchio slider).',
          'Servire le immagini in formato moderno (WebP o AVIF): −0,9 s.',
          'Eliminare le risorse che bloccano il rendering (3 fogli di stile): −0,6 s.',
        ]],
        ['p', 'Il controllo SEO di Lighthouse segnala anche 2 link senza testo descrittivo.'],
      ],
    },
    'Le pagine con Core Web Vitals scarsi hanno perso posizioni su Google?': {
      tools: ['crux_query × 8 pagine', 'gsc_compare_periods'],
      blocks: [
        ['p', 'Ho confrontato le 8 pagine con più traffico. Le 3 con LCP scarso hanno perso in media 2,1 posizioni negli ultimi 3 mesi; le altre sono stabili.'],
        ['table', ['Pagina', 'LCP', 'Posizione'], [['/scarponi/', '4,4 s', '5,1 → 7,8'], ['/offerte/', '4,1 s', '8,0 → 9,6'], ['/zaini/', '2,1 s', '4,2 → 4,0']]],
        ['p', 'La correlazione c\'è, ma non prova la causa: nello stesso periodo anche i concorrenti hanno aggiornato quelle pagine. Migliorare l\'LCP resta comunque la prima cosa da fare.'],
      ],
    },
    'Le sitemap hanno errori? Quando le ha scaricate Google l\'ultima volta?': {
      tools: ['gsc_list_sitemaps'],
      blocks: [
        ['table', ['Sitemap', 'Ultimo download', 'URL', 'Errori'], [
          ['/sitemap_index.xml', 'ieri', '1.240', '0'],
          ['/post-sitemap.xml', 'ieri', '380', '0'],
          ['/product-sitemap.xml', '9 giorni fa', '860', '2 avvisi'],
        ]],
        ['p', 'Nessun errore. I due avvisi della sitemap prodotti riguardano URL che reindirizzano: andrebbero sostituiti con la destinazione finale.'],
      ],
    },
    'Valida i dati strutturati della home e dimmi se sono idonei ai risultati avanzati.': {
      tools: ['schema_validate'],
      blocks: [
        ['p', 'Ho trovato 6 oggetti schema.org: Organization, WebSite, WebPage, BreadcrumbList e 2 ImageObject.'],
        ['ul', [
          'Errori: 1. "foundingDate" è scritto "21-07-2019", deve essere "2019-07-21".',
          'Avvisi: 1. Organization senza "sameAs" (i profili social ufficiali).',
          'Idonei ai risultati avanzati: Organizzazione e Breadcrumb.',
        ]],
        ['p', 'Correggendo la data l\'errore sparisce. Aggiungere "sameAs" aiuta anche i motori AI a riconoscere il marchio.'],
      ],
    },
    'Questo JSON-LD prodotto è corretto prima che lo pubblichi?': {
      tools: ['schema_validate · JSON-LD incollato'],
      blocks: [
        ['p', 'Quasi. Ho trovato 2 errori e 1 avviso:'],
        ['ul', [
          'Il tipo "Prodcut" non esiste: intendevi "Product".',
          'La proprietà "priceCurency" non esiste: intendevi "priceCurrency".',
          '"availability" vale "Disponibile": usa "https://schema.org/InStock".',
        ]],
        ['p', 'Con queste tre correzioni il prodotto è idoneo allo snippet con prezzo e disponibilità.'],
      ],
    },
    'Correggi i dati strutturati della pagina e dammi il codice da incollare.': {
      tools: ['schema_validate', 'schema_validate · verifica della correzione'],
      blocks: [
        ['p', 'Ho corretto la data in formato ISO e aggiunto "sameAs". Ho verificato la nuova versione: nessun errore.'],
        ['p', '{ "@context": "https://schema.org", "@type": "Organization", "name": "Esempio Srl", "url": "https://www.esempio.it/", "logo": "https://www.esempio.it/logo.png", "foundingDate": "2019-07-21", "sameAs": ["[URL della pagina LinkedIn]", "[URL della pagina Instagram]"] }'],
        ['p', 'Sostituisci i valori tra parentesi quadre con i vostri profili: non li ho inventati.'],
      ],
    },
    'Quali pagine del blog non hanno autore e data nei dati strutturati?': {
      tools: ['schema_validate × 12 articoli'],
      blocks: [
        ['p', 'Ho controllato gli ultimi 12 articoli. In 5 mancano autore e date:'],
        ['ul', ['/blog/sentieri-dolomiti/', '/blog/ciaspole-principianti/', '/blog/zaino-perfetto/', '/blog/scarpe-o-scarponi/', '/blog/meteo-montagna/']],
        ['p', 'Sono tutti articoli pubblicati prima del cambio di tema: probabilmente il vecchio template non genera "author", "datePublished" e "dateModified". Autore e data aiutano sia Google sia i motori AI a fidarsi del contenuto.'],
      ],
    },
    'Fai un audit tecnico del sito e dimmi le cinque correzioni più urgenti.': {
      tools: ['tech_page_audit', 'tech_site_check', 'psi_analyze'],
      blocks: [
        ['p', 'Ecco le cinque correzioni più urgenti, in ordine di impatto:'],
        ['ul', [
          '12 link interni rotti (404) nel menu del blog.',
          'La sitemap contiene 38 URL che reindirizzano: sostituirli con la destinazione finale.',
          'Due redirect in catena da http a https: uno solo, permanente (301).',
          '14 immagini senza testo alternativo nella home.',
          'Nessun header di sicurezza (HSTS, X-Content-Type-Options).',
        ]],
        ['p', 'La pagina 404 è configurata bene e il canonical è corretto su tutte le pagine controllate.'],
      ],
    },
    'La versione http reindirizza bene a https, con un solo passaggio?': {
      tools: ['tech_page_audit · http://esempio.it/'],
      blocks: [
        ['p', 'No, ci sono due passaggi:'],
        ['ul', ['http://esempio.it/ → 301 → https://esempio.it/', 'https://esempio.it/ → 301 → https://www.esempio.it/']],
        ['p', 'Entrambi i redirect sono permanenti, ma ne basta uno: fai puntare http://esempio.it/ direttamente a https://www.esempio.it/. Si risparmia un passaggio a ogni visita e a ogni scansione.'],
      ],
    },
    'La sitemap contiene pagine reindirizzate o in errore?': {
      tools: ['tech_site_check · 20 URL campione'],
      blocks: [
        ['p', 'La sitemap indice contiene 6 sitemap e 1.240 URL. Su 20 URL campione:'],
        ['ul', ['17 rispondono 200.', '2 reindirizzano (301) a una nuova versione della pagina.', '1 risponde 404: /prodotti/borraccia-vecchio-modello/']],
        ['p', 'Ho trovato anche 33 URL duplicati tra le sitemap figlie. Nessun URL di altri domini.'],
      ],
    },
    'Gli hreflang delle versioni in altre lingue sono reciproci?': {
      tools: ['tech_page_audit · hreflang'],
      blocks: [
        ['p', 'La pagina dichiara 4 versioni: it, en, de e x-default. I codici sono validi e c\'è l\'autoreferenza.'],
        ['table', ['Versione', 'Stato', 'Rimanda a questa?'], [['en', '200', 'sì'], ['de', '200', 'no']]],
        ['p', 'La versione tedesca non ha il link di ritorno verso quella italiana: senza reciprocità Google può ignorare la coppia. Va aggiunto nell\'head della pagina tedesca.'],
      ],
    },
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var panel, overlay, body, closeBtn, lastFocus, timers = [];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function buildPanel() {
    overlay = el('div', 'demo-overlay');
    overlay.hidden = true;
    panel = el('aside', 'demo-chat');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'demo-title');

    var head = el('div', 'demo-head');
    var title = el('strong', null, 'Assistente AI con seomcp');
    title.id = 'demo-title';
    head.appendChild(title);
    closeBtn = el('button', 'demo-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Chiudi');
    head.appendChild(closeBtn);

    body = el('div', 'demo-body');
    body.setAttribute('aria-live', 'polite');

    var foot = el('p', 'demo-disclaimer');
    foot.appendChild(document.createTextNode('Dati di esempio. Se vuoi queste funzionalità integrate nel tuo CMS o nel tuo e-commerce '));
    var link = el('a', null, 'scrivici');
    link.href = CONTACT_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    foot.appendChild(link);
    foot.appendChild(document.createTextNode('.'));

    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(foot);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    overlay.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });
  }

  function renderBlock(b) {
    if (b[0] === 'p') return el('p', null, b[1]);
    if (b[0] === 'ul') {
      var ul = el('ul');
      b[1].forEach(function (t) { ul.appendChild(el('li', null, t)); });
      return ul;
    }
    var wrap = el('div', 'demo-table');
    var table = el('table');
    var tr = el('tr');
    b[1].forEach(function (h) { tr.appendChild(el('th', null, h)); });
    var thead = el('thead');
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    b[2].forEach(function (row) {
      var r = el('tr');
      row.forEach(function (c) { r.appendChild(el('td', null, c)); });
      tbody.appendChild(r);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function open(question) {
    var answer = ANSWERS[question];
    if (!answer) return;
    if (!panel) buildPanel();
    timers.forEach(clearTimeout);
    timers = [];
    body.textContent = '';

    body.appendChild(el('div', 'demo-msg demo-user', question));
    var ai = el('div', 'demo-msg demo-ai');
    body.appendChild(ai);
    answer.tools.forEach(function (t) {
      var chip = el('p', 'demo-tool');
      chip.appendChild(el('code', null, t.split(' · ')[0]));
      if (t.indexOf(' · ') > -1) chip.appendChild(document.createTextNode(' · ' + t.split(' · ').slice(1).join(' · ')));
      ai.appendChild(chip);
    });
    var thinking = el('p', 'demo-thinking', 'Sto leggendo i dati…');
    ai.appendChild(thinking);

    lastFocus = document.activeElement;
    overlay.hidden = false;
    panel.hidden = false;
    document.body.classList.add('demo-open');
    closeBtn.focus();

    // Risposta che compare a blocchi, come in una chat. Senza animazioni se l'utente le ha disattivate.
    var delay = reduceMotion ? 0 : 700;
    timers.push(setTimeout(function () {
      thinking.remove();
      answer.blocks.forEach(function (b, i) {
        timers.push(setTimeout(function () {
          ai.appendChild(renderBlock(b));
        }, reduceMotion ? 0 : i * 350));
      });
    }, delay));
  }

  function close() {
    timers.forEach(clearTimeout);
    timers = [];
    panel.hidden = true;
    overlay.hidden = true;
    document.body.classList.remove('demo-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Rende cliccabili le domande delle sezioni "Cosa puoi chiedere" che hanno una risposta d'esempio.
  document.querySelectorAll('ul.prompts:not(.plain)').forEach(function (list) {
    var any = false;
    list.querySelectorAll('li').forEach(function (li) {
      var q = li.textContent.trim();
      if (!ANSWERS[q]) return;
      any = true;
      li.classList.add('demo-q');
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-haspopup', 'dialog');
      li.addEventListener('click', function () { open(q); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(q);
        }
      });
    });
    if (any) list.insertAdjacentElement('afterend', el('p', 'demo-hint', 'Clicca una domanda per vedere un esempio di risposta.'));
  });
})();
