# Daniela Rusev, site de prezentare

Site static pentru cabinetul de psihoterapie al Danielei Rusev (Drumul Taberei 29, București). Nu are build și nici framework. Pagina e un singur fișier HTML cu CSS inline.

Lucrăm doar pe varianta "Editorial", care e acum pagina principală. Respectă ghidul anti-"look de AI": hero asimetric, paletă luată din fotografie (bleumarin, roșu de mac, prună), Fraunces cu Instrument Sans, fără carduri decorative.

- `index.html` e site-ul. Încarcă `accordion.js` (dropdown-uri pe telefon) și imaginile din `img/`.
- `editor.js` e modul de editare pentru client. Se încarcă doar cu `?edit` în adresă, vezi mai jos.
- `img/` conține fotografia în WebP și JPG, la 480 și 900 px, plus `og.jpg` pentru preview pe rețele sociale.
- `varianta-2/index.html` e doar o redirecționare spre pagina principală, ca linkurile vechi să nu se strice.
- `archive/` păstrează celelalte variante, în caz că le vrem înapoi. Nu sunt legate din site.
  - `archive/varianta-1/`, "Briză": hero centrat, carduri, gradienți și animații la scroll, pe fond mentă și albastru.
  - `archive/varianta-3/`, "Senin": luminoasă, în verde salvie, cu hero în formă de arcadă, mini-test "Te regăsești?", mituri despre terapie și povestea sub formă de scrisoare.
  - `archive/switcher.js` era bara de comutare între variante. Nu mai e încărcată nicăieri și are căile vechi.

## Editare de către client

Linkul pentru Daniela e https://thebarbellengineer.com/daniela-rusev-psihoterapeut/?edit. Fără `?edit`, vizitatorii nu încarcă nimic în plus.

În modul de editare, header-ul, meniul, conținutul din `<main>` și subsolul devin `contenteditable`. Dropdown-urile de pe telefon rămân deschise, întrebările sunt toate deschise, iar butonul video devine `div` ca să i se poată edita eticheta. La clic pe un text apare o bară cu Duplică, Șterge și ↑ (blocul părinte). Lista de blocuri e în `BLOCKS`, în `editor.js`. Ciorna se salvează în `localStorage`, legată de un hash al paginii. Dacă pagina se schimbă între timp, editorul întreabă dacă păstrează ciorna veche.

Butonul Exportă descarcă `modificari-site-daniela-rusev-AAAA-LL-ZZ-HHMM.html` (pe telefon deschide meniul de partajare). Fișierul arată lista de modificări, înainte și după, și conține în `<script id="date-editare">` un JSON cu:

- `changes`: rândurile de text schimbate, grupate pe secțiuni
- `base`: HTML-ul fiecărei zone (`brand`, `nav`, `meniu`, `main`, `footer`) așa cum era când a început editarea
- `edited`: același HTML după editare

Ca să aplici un export, compară `base` cu `edited` pentru fiecare zonă și mută diferențele în `index.html`. `base` e luat din pagină în modul de editare, deci are `<details open>` și `<div class="video">` în loc de `<button>`. Diferențele astea nu sunt modificări ale clientului.

## De verificat cu Daniela înainte de lansare

Datele vin din două rapoarte de cercetare și din profilul ISTT. Unele nu sunt confirmate:

1. Fotografia e preluată de pe profilul ISTT. Trebuie confirmat că o putem folosi sau înlocuită cu una nouă.
2. Adresa de e-mail `dfocica@yahoo.com` apare doar pe Mapcarta. Trebuie confirmată.
3. Tariful și durata ședinței lipsesc intenționat. Dacă vrea să le afișeze, se completează în secțiunea de întrebări.
4. Adolescenții apar doar în întrebări, la cererea Danielei. Orientarea vocațională a fost scoasă.
5. Notele din recenzii (4,8 DoctorBun, 10/10 la-psiholog.ro) și citatul din recenzie trebuie verificate la sursă. Textele complete ale recenziilor se pot adăuga doar cu acordul autorilor.
6. Paragraful despre gândirea sistemică din cibernetică e o interpretare. Daniela trebuie să-l aprobe sau să-l rescrie în cuvintele ei.
7. Nu știm dacă face ședințe online. Dacă da, merită adăugat în hero și în întrebări.
8. Textul folosește "tu". Dacă preferă "dumneavoastră", se schimbă global.
9. Metoda Călătoria apare la "Cum lucrez" și la formare, fără titlu de acreditare. Daniela nu e pe lista de practicieni acreditați de pe metodacalatoria.ro, iar regulile metodei spun că doar practicienii acreditați pot cere bani pentru ședințe. Trebuie să ne spună dacă scriem "practician acreditat", "în curs de acreditare" sau altă formulare.
10. Pe metodacalatoria.ro, o ședință de Călătoria durează între 1 și 3 ore. Dacă vrea s-o menționăm, intră în întrebări.
