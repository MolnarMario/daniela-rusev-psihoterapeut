# Daniela Rusev, site de prezentare

Site static pentru cabinetul de psihoterapie al Danielei Rusev (Drumul Taberei 29, București). Nu are build și nici framework. Fiecare variantă e un singur fișier HTML cu CSS inline.

Sunt trei variante de design, ca să alegem sau să combinăm. Bara din dreapta sus (`switcher.js`) trece de la una la alta și păstrează secțiunea la care ești. Butonul "Etichete" numerotează secțiunile (de exemplu "2.4 Despre"), ca să putem spune ce piese luăm din fiecare.

- `index.html`, varianta 1, "Editorial". Respectă ghidul anti-"look de AI": hero asimetric, paletă luată din fotografie (bleumarin, roșu de mac, prună), Fraunces cu Instrument Sans, fără carduri decorative.
- `varianta-2/`, "Briză". Fără restricții de design: hero centrat, carduri, gradienți și animații la scroll, pe fond deschis în verde mentă și albastru.
- `varianta-3/`, "Senin". Luminoasă, în verde salvie. Are elemente care lipsesc din celelalte: hero cu portret în formă de arcadă, mini-test "Te regăsești?", secțiune cu mituri despre terapie, povestea sub formă de scrisoare semnată, listă cu ce să pregătești pentru primul telefon.
- `img/` conține fotografia în WebP și JPG, la 480 și 900 px, plus `og.jpg` pentru preview pe rețele sociale.

Când alegem varianta finală, scoatem `switcher.js` și linia `<script>` care îl încarcă.

## De verificat cu Daniela înainte de lansare

Datele vin din două rapoarte de cercetare și din profilul ISTT. Unele nu sunt confirmate:

1. Fotografia e preluată de pe profilul ISTT. Trebuie confirmat că o putem folosi sau înlocuită cu una nouă.
2. Adresa de e-mail `dfocica@yahoo.com` apare doar pe Mapcarta. Trebuie confirmată.
3. Tariful și durata ședinței lipsesc intenționat. Dacă vrea să le afișeze, se completează în secțiunea de întrebări.
4. Lucrul cu adolescenți și orientarea vocațională apar într-un singur raport, fără sursă solidă.
5. Notele din recenzii (4,8 DoctorBun, 10/10 la-psiholog.ro) și citatul din recenzie trebuie verificate la sursă. Textele complete ale recenziilor se pot adăuga doar cu acordul autorilor.
6. Paragraful despre gândirea sistemică din cibernetică e o interpretare. Daniela trebuie să-l aprobe sau să-l rescrie în cuvintele ei.
7. Nu știm dacă face ședințe online. Dacă da, merită adăugat în hero și în întrebări.
8. Textul folosește "tu". Dacă preferă "dumneavoastră", se schimbă global.
