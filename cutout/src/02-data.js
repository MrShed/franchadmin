/* CUTOUT engine — 02-data.js
 * Static data: nationalities and name pools, cities, crossings, airlines,
 * items, methods, operation templates, targets, and flavour text.
 * Hotels, banks, companies and people are fictional; cities, landmarks and
 * border posts are real (autumn 1989).
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';

  // ------------------------------------------------------------- helpers
  // pattern: '#' digit, 'N' non-zero digit, '@' letter, anything else literal
  function pat(p, R) {
    var s = '';
    for (var i = 0; i < p.length; i++) {
      var c = p.charAt(i);
      if (c === '#') s += R.digits(1);
      else if (c === 'N') s += String(R.int(1, 9));
      else if (c === '@') s += R.letter();
      else s += c;
    }
    return s;
  }
  CX.pat = pat;

  function csFem(s) {
    if (/ý$/.test(s)) return s.replace(/ý$/, 'á');
    if (/ek$/.test(s)) return s.replace(/ek$/, 'ková');
    if (/ec$/.test(s)) return s.replace(/ec$/, 'cová');
    if (/a$/.test(s)) return s.replace(/a$/, 'ová');
    return s + 'ová';
  }
  function plFem(s) { return s.replace(/ski$/, 'ska').replace(/cki$/, 'cka'); }
  function suFem(s) { return /v$|n$/.test(s) ? s + 'a' : s; }

  // ------------------------------------------------------- nationalities
  // order: 'gs' given-surname (canonical everywhere), docs may show SURNAME, Given.
  var NAT = {
    AT: { adj: 'Austrian', country: 'Austria', pass: 'L #######', bloc: 'W',
      male: ['Franz', 'Josef', 'Johann', 'Herbert', 'Walter', 'Alois', 'Ernst', 'Leopold', 'Friedrich', 'Gottfried', 'Anton', 'Rudolf', 'Erich', 'Karl', 'Engelbert', 'Ferdinand'],
      female: ['Maria', 'Theresia', 'Hermine', 'Gertrude', 'Elfriede', 'Waltraud', 'Johanna', 'Anneliese', 'Hedwig', 'Susanne', 'Christine', 'Renate'],
      sur: ['Gruber', 'Huber', 'Pichler', 'Moser', 'Steiner', 'Hofer', 'Leitner', 'Wimmer', 'Haider', 'Eder', 'Schwarz', 'Fuchs', 'Aigner', 'Wallner', 'Riegler', 'Holzer', 'Kogler', 'Sulzbacher', 'Prohaska', 'Windisch', 'Pospischil', 'Haslinger', 'Zauner'] },
    DE: { adj: 'West German', country: 'FRG', pass: 'F #######', bloc: 'W',
      male: ['Klaus', 'Jürgen', 'Dieter', 'Wolfgang', 'Hans-Peter', 'Uwe', 'Manfred', 'Rainer', 'Horst', 'Helmut', 'Günter', 'Bernd', 'Werner', 'Joachim', 'Karl-Heinz', 'Gerd', 'Volker', 'Frank'],
      female: ['Ursula', 'Monika', 'Renate', 'Brigitte', 'Sabine', 'Gabriele', 'Heike', 'Karin', 'Petra', 'Ingrid', 'Elke', 'Christa'],
      sur: ['Kessler', 'Brandt', 'Hoffmann', 'Schäfer', 'Wagner', 'Becker', 'Richter', 'Krüger', 'Lindner', 'Vogt', 'Hartmann', 'Seidel', 'Maurer', 'Kühn', 'Brenner', 'Lorenz', 'Pohl', 'Engel', 'Wendt', 'Kramer', 'Adler', 'Ritter', 'Göbel', 'Sauter'] },
    DD: { adj: 'East German', country: 'GDR', pass: 'C ### ###', bloc: 'E',
      male: ['Siegfried', 'Lothar', 'Egon', 'Heinz', 'Detlef', 'Eberhard', 'Horst', 'Rolf', 'Gerhard', 'Hans-Joachim', 'Wolfram', 'Reinhard'],
      female: ['Gisela', 'Waltraut', 'Doris', 'Marlies', 'Gudrun', 'Karin', 'Heidrun', 'Bärbel'],
      sur: ['Krause', 'Lehmann', 'Schulze', 'Zimmermann', 'Neumann', 'Kaiser', 'Wolf', 'Pietsch', 'Hentschel', 'Rademacher', 'Jähnke', 'Kunze', 'Scholz', 'Matthes', 'Grabowski', 'Böttcher', 'Pfeiffer'] },
    CH: { adj: 'Swiss', country: 'Switzerland', pass: 'N#######', bloc: 'W',
      male: ['Urs', 'Beat', 'Reto', 'Hansruedi', 'Peter', 'Andreas', 'Thomas', 'Rolf', 'Kurt', 'Heinz', 'Marcel', 'Jean-Claude', 'Pierre-Alain'],
      female: ['Verena', 'Ruth', 'Regula', 'Barbara', 'Käthi', 'Monique', 'Esther'],
      sur: ['Meier', 'Keller', 'Baumann', 'Frei', 'Gerber', 'Widmer', 'Zürcher', 'Bühler', 'Studer', 'Ammann', 'Wyss', 'Rüegg', 'Egli', 'Favre', 'Rochat', 'Perrenoud', 'Tschudi', 'Hürlimann'] },
    HU: { adj: 'Hungarian', country: 'Hungary', pass: '@@ ######', bloc: 'E', surFirst: true,
      male: ['László', 'István', 'Zoltán', 'Gábor', 'Ferenc', 'Attila', 'Tibor', 'Sándor', 'János', 'Imre', 'Miklós', 'Csaba', 'Péter'],
      female: ['Katalin', 'Erzsébet', 'Ilona', 'Zsuzsanna', 'Mária', 'Judit', 'Éva', 'Ágnes'],
      sur: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Mészáros', 'Oláh', 'Rácz', 'Fekete', 'Szűcs'] },
    CS: { adj: 'Czechoslovak', country: 'Czechoslovakia', pass: '@ #######', bloc: 'E', fem: csFem,
      male: ['Jiří', 'Jan', 'Petr', 'Josef', 'Pavel', 'Jaroslav', 'Miroslav', 'Zdeněk', 'Václav', 'Karel', 'Milan', 'František', 'Ladislav', 'Vladimír'],
      female: ['Jana', 'Marie', 'Eva', 'Hana', 'Věra', 'Alena', 'Libuše', 'Zdeňka', 'Jitka'],
      sur: ['Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Pokorný', 'Marek', 'Pospíšil', 'Hájek', 'Král', 'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Kolář', 'Vlček'] },
    PL: { adj: 'Polish', country: 'Poland', pass: '@@ #######', bloc: 'E', fem: plFem,
      male: ['Andrzej', 'Krzysztof', 'Tadeusz', 'Zbigniew', 'Marek', 'Janusz', 'Jerzy', 'Wojciech', 'Ryszard', 'Stanisław'],
      female: ['Barbara', 'Krystyna', 'Elżbieta', 'Małgorzata', 'Danuta', 'Grażyna'],
      sur: ['Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Dąbrowski', 'Kozłowski', 'Mazur', 'Kaczmarek', 'Pawlak'] },
    SU: { adj: 'Soviet', country: 'USSR', pass: '## #######', bloc: 'E', fem: suFem,
      male: ['Viktor', 'Sergei', 'Nikolai', 'Yuri', 'Oleg', 'Anatoly', 'Gennady', 'Vladimir', 'Boris', 'Valentin', 'Igor', 'Leonid'],
      female: ['Tatiana', 'Galina', 'Lyudmila', 'Natalia', 'Irina', 'Svetlana'],
      sur: ['Sokolov', 'Morozov', 'Volkov', 'Lebedev', 'Kozlov', 'Novikov', 'Orlov', 'Belov', 'Zaitsev', 'Pavlov', 'Gusev', 'Titov', 'Kuznetsov', 'Shvetsov'] },
    YU: { adj: 'Yugoslav', country: 'Yugoslavia', pass: '@@ ######', bloc: 'N',
      male: ['Dragan', 'Milan', 'Zoran', 'Goran', 'Slobodan', 'Branko', 'Nenad', 'Dušan', 'Vlado', 'Ante', 'Mirko'],
      female: ['Snežana', 'Jasmina', 'Vesna', 'Mirjana', 'Ljiljana'],
      sur: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Horvat', 'Kovačević', 'Babić', 'Popović', 'Stojanović', 'Radić', 'Kovač', 'Lukić'] },
    IT: { adj: 'Italian', country: 'Italy', pass: '@ ######', bloc: 'W',
      male: ['Giuseppe', 'Giovanni', 'Antonio', 'Mario', 'Luigi', 'Franco', 'Sergio', 'Claudio', 'Roberto', 'Paolo', 'Enzo', 'Massimo', 'Carlo', 'Aldo'],
      female: ['Anna', 'Giovanna', 'Rosa', 'Franca', 'Lucia', 'Paola', 'Silvana', 'Loredana'],
      sur: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Rinaldi', 'Caruso'] },
    FR: { adj: 'French', country: 'France', pass: '## @@ #####', bloc: 'W',
      male: ['Jean-Pierre', 'Michel', 'Alain', 'Bernard', 'Philippe', 'Patrick', 'Gérard', 'Daniel', 'Christian', 'Jacques', 'Serge', 'Didier', 'Thierry'],
      female: ['Monique', 'Françoise', 'Catherine', 'Sylvie', 'Nathalie', 'Martine', 'Isabelle', 'Brigitte'],
      sur: ['Martin', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Laurent', 'Lefèbvre', 'Garcia', 'Fournier', 'Girard', 'Bonnet', 'Mercier', 'Blanc', 'Guérin', 'Faure', 'Roux', 'Chevalier', 'Vidal'] },
    PT: { adj: 'Portuguese', country: 'Portugal', pass: '@-######', bloc: 'W',
      male: ['José', 'Manuel', 'António', 'João', 'Joaquim', 'Francisco', 'Carlos', 'Fernando', 'Luís', 'Rui'],
      female: ['Maria', 'Ana', 'Isabel', 'Fátima', 'Teresa', 'Conceição'],
      sur: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Marques', 'Almeida', 'Ribeiro'] },
    TR: { adj: 'Turkish', country: 'Turkey', pass: '@-######', bloc: 'W',
      male: ['Mehmet', 'Mustafa', 'Ahmet', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Osman', 'Yusuf', 'Kemal', 'Erol', 'Orhan', 'Cemal'],
      female: ['Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Leyla'],
      sur: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir'] },
    GB: { adj: 'British', country: 'United Kingdom', pass: '@ ###### @', bloc: 'W',
      male: ['David', 'John', 'Michael', 'Peter', 'Richard', 'Robert', 'Nigel', 'Graham', 'Colin', 'Malcolm', 'Trevor', 'Keith', 'Clive'],
      female: ['Susan', 'Margaret', 'Patricia', 'Janet', 'Gillian', 'Carol', 'Pamela'],
      sur: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Roberts', 'Walker', 'Wright', 'Thompson', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Clarke', 'Pemberton', 'Fairbrother', 'Ashworth', 'Hollis'] },
    LB: { adj: 'Lebanese', country: 'Lebanon', pass: '######', bloc: 'N',
      male: ['Georges', 'Elias', 'Khalil', 'Nabil', 'Samir', 'Walid', 'Fouad', 'Antoine', 'Karim', 'Rafiq'],
      female: ['Nadia', 'Rima', 'Samira', 'Hoda'],
      sur: ['Haddad', 'Khoury', 'Nassar', 'Saad', 'Aoun', 'Hayek', 'Karam', 'Sfeir', 'Tannous', 'Bitar', 'Maalouf'] },
    NL: { adj: 'Dutch', country: 'Netherlands', pass: '@######', bloc: 'W',
      male: ['Johannes', 'Pieter', 'Hendrik', 'Willem', 'Cornelis', 'Gerrit', 'Jan', 'Kees', 'Dirk', 'Maarten'],
      female: ['Anneke', 'Marijke', 'Ingrid', 'Els', 'Wilma'],
      sur: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos', 'Vos', 'Hendriks'] }
  };

  // ------------------------------------------------------------ countries
  var COUNTRY = {
    AT: { name: 'Austria', cur: 'öS', curLong: 'Schilling', nat: 'AT', police: 'Bundespolizeidirektion', border: 'Grenzkontrolle (BMI)', hotelForm: 'Meldezettel', resReg: 'Zentrales Melderegister (Meldeamt)', coReg: 'Handelsregister, Handelsgericht Wien', lang: 'de', service: 'Staatspolizei' },
    DE: { name: 'FRG', cur: 'DM', curLong: 'Deutsche Mark', nat: 'DE', police: 'Polizeipräsidium', border: 'Bundesgrenzschutz', hotelForm: 'Meldeschein', resReg: 'Einwohnermeldeamt', coReg: 'Handelsregister, Amtsgericht', lang: 'de', service: 'BfV' },
    WB: { name: 'West Berlin', cur: 'DM', curLong: 'Deutsche Mark', nat: 'DE', police: 'Der Polizeipräsident in Berlin', border: 'Polizei Berlin, Grenzübergangsstelle', hotelForm: 'Meldeschein', resReg: 'Landeseinwohneramt Berlin', coReg: 'Handelsregister, Amtsgericht Charlottenburg', lang: 'de', service: 'LfV Berlin' },
    DD: { name: 'GDR', cur: 'M', curLong: 'Mark der DDR', nat: 'DD', police: 'Volkspolizei-Präsidium', border: 'Passkontrolleinheit (PKE)', hotelForm: 'Hotelmeldebuch (Interhotel)', resReg: 'Volkspolizei, Meldestelle', coReg: 'Register der volkseigenen Wirtschaft', lang: 'de', service: 'source HANSA', east: true },
    HU: { name: 'Hungary', cur: 'Ft', curLong: 'Forint', nat: 'HU', police: 'BRFK (Budapest Police)', border: 'Határőrség', hotelForm: 'bejelentőlap', resReg: 'KEOKH / lakcímnyilvántartás', coReg: 'Cégbíróság', lang: 'hu', service: 'source DUNA', east: true },
    CS: { name: 'Czechoslovakia', cur: 'Kčs', curLong: 'Koruna', nat: 'CS', police: 'Veřejná bezpečnost', border: 'Pohraniční stráž / pasová kontrola', hotelForm: 'přihlašovací lístek', resReg: 'evidence obyvatel (VB)', coReg: 'podnikový rejstřík', lang: 'cs', service: 'source MORAVA', east: true },
    CH: { name: 'Switzerland', cur: 'sFr.', curLong: 'Franken', nat: 'CH', police: 'Kantonspolizei', border: 'Grenzwachtkorps', hotelForm: 'Hotelmeldeschein (Fremdenpolizei)', resReg: 'Einwohnerkontrolle', coReg: 'Handelsregisteramt', lang: 'de', service: 'Bundespolizei (BuPo)' },
    IT: { name: 'Italy', cur: 'Lit.', curLong: 'Lire', nat: 'IT', police: 'Questura', border: 'Polizia di Frontiera', hotelForm: 'schedina alberghiera', resReg: 'Anagrafe comunale', coReg: 'Registro delle Imprese (Cancelleria commerciale)', lang: 'it', service: 'SISDE' },
    FR: { name: 'France', cur: 'FF', curLong: 'Francs', nat: 'FR', police: 'Préfecture de Police', border: 'Police de l\'Air et des Frontières', hotelForm: 'fiche individuelle de police', resReg: 'fichier des résidents (Préfecture)', coReg: 'Registre du Commerce et des Sociétés', lang: 'fr', service: 'DST' },
    PT: { name: 'Portugal', cur: 'Esc.', curLong: 'Escudos', nat: 'PT', police: 'PSP', border: 'Serviço de Estrangeiros e Fronteiras', hotelForm: 'boletim de alojamento', resReg: 'recenseamento (Junta de Freguesia)', coReg: 'Conservatória do Registo Comercial', lang: 'pt', service: 'SIS (Lisbon)' },
    TR: { name: 'Turkey', cur: 'TL', curLong: 'Lira', nat: 'TR', police: 'Emniyet Müdürlüğü', border: 'Pasaport Şube', hotelForm: 'otel bildirim formu', resReg: 'Nüfus Müdürlüğü', coReg: 'Ticaret Sicili', lang: 'tr', service: 'MİT liaison' }
  };

  // --------------------------------------------------------------- cities
  // Each hotel: n name, s stars, a address, o venue it overlooks (index into venues) or -1.
  // Each venue: n name, k kind, a address.
  // kinds: opera hall ministry embassy ballroom fair museum institute university
  var CITIES = {
    VIE: { name: 'Vienna', cc: 'AT', phone: '+43 1 ### ## ##', plate: 'W ##.###', post: 'Wien', addr: '{s} {n}/{f}, {z} Wien',
      zip: ['1040', '1050', '1060', '1070', '1080', '1090', '1030', '1020', '1150', '1180'],
      streets: ['Gumpendorfer Straße', 'Mariahilfer Straße', 'Josefstädter Straße', 'Favoritenstraße', 'Landstraßer Hauptstraße', 'Neubaugasse', 'Währinger Straße', 'Praterstraße', 'Wiedner Hauptstraße', 'Alser Straße', 'Kettenbrückengasse', 'Taborstraße'],
      venues: [{ n: 'Staatsoper', k: 'opera', a: 'Opernring 2' }, { n: 'Hofburg Congress Centre', k: 'hall', a: 'Heldenplatz' }, { n: 'Federal Chancellery', k: 'ministry', a: 'Ballhausplatz 2' }, { n: 'Palais Auersperg', k: 'ballroom', a: 'Auerspergstraße 1' }, { n: 'Rotunde halls of the Messe Wien', k: 'fair', a: 'Messeplatz 1' }, { n: 'Institute for Radium Research', k: 'institute', a: 'Boltzmanngasse 3' }, { n: 'main building of the University of Vienna', k: 'university', a: 'Dr.-Karl-Lueger-Ring 1' }],
      hotels: [{ n: 'Hotel Opernring', s: 4, a: 'Opernring 11', o: 0 }, { n: 'Hotel Burgring', s: 4, a: 'Burgring 3', o: 1 }, { n: 'Hotel Löwelhof', s: 3, a: 'Löwelstraße 6', o: 2 }, { n: 'Hotel Kärntnerhof', s: 3, a: 'Grashofgasse 4', o: -1 }, { n: 'Pension Wieden', s: 2, a: 'Mühlgasse 30', o: -1 }, { n: 'Hotel Westbahn-Europa', s: 3, a: 'Mariahilfer Gürtel 22', o: -1 }, { n: 'Hotel Auersperg-Stadt', s: 3, a: 'Lange Gasse 14', o: 3 }],
      cafes: ['Café Schottentor', 'Café Museumstraße', 'Café Kettenbrücke', 'Espresso Naschmarkt'],
      banks: [{ n: 'Wiener Handelsbank', c: 'WHB', f: '###-###-###/00' }, { n: 'Donau-Kreditanstalt', c: 'DKA', f: '####-#####' }, { n: 'Bankhaus Reichl & Söhne', c: 'BRS', f: '##.###.###' }],
      airport: { n: 'Wien-Schwechat', c: 'VIE' }, station: 'Westbahnhof',
      rental: ['Autoverleih Danubia', 'Alpina Autovermietung'], papers: ['Die Presse', 'Kurier', 'Wiener Zeitung'],
      landmarks: ['Naschmarkt', 'Stadtpark', 'Prater'] },
    WBE: { name: 'West Berlin', cc: 'WB', phone: '+49 30 ### ## ##', plate: 'B-@@ ###', addr: '{s} {n}, {z} Berlin {d}',
      zip: ['1000'], dist: ['12', '15', '19', '30', '31', '36', '41', '44', '61', '62'],
      streets: ['Kantstraße', 'Hauptstraße', 'Oranienstraße', 'Sonnenallee', 'Wilmersdorfer Straße', 'Schloßstraße', 'Potsdamer Straße', 'Karl-Marx-Straße', 'Bundesallee', 'Yorckstraße', 'Mehringdamm', 'Kaiser-Friedrich-Straße'],
      venues: [{ n: 'ICC Berlin', k: 'hall', a: 'Messedamm 19' }, { n: 'Deutsche Oper Berlin', k: 'opera', a: 'Bismarckstraße 35' }, { n: 'Schöneberg Town Hall', k: 'ministry', a: 'John-F.-Kennedy-Platz' }, { n: 'Messe am Funkturm', k: 'fair', a: 'Messedamm 22' }, { n: 'Physics Institute of the Technical University', k: 'institute', a: 'Hardenbergstraße 36' }, { n: 'Great Hall of the Hotel Palais am Zoo', k: 'ballroom', a: 'Budapester Straße 40' }],
      hotels: [{ n: 'Hotel Funkturm', s: 3, a: 'Messedamm 9', o: 0 }, { n: 'Hotel Bismarckhof', s: 3, a: 'Bismarckstraße 40', o: 1 }, { n: 'Pension Savigny', s: 2, a: 'Savignyplatz 3', o: -1 }, { n: 'Hotel Kantstraße', s: 3, a: 'Kantstraße 114', o: -1 }, { n: 'Hotel Palais am Zoo', s: 4, a: 'Budapester Straße 40', o: 5 }, { n: 'Hotel Rathauseck', s: 3, a: 'Belziger Straße 2', o: 2 }],
      cafes: ['Café Einstein-Ecke', 'Kranzler-Stube', 'Imbiss am Savignyplatz'],
      banks: [{ n: 'Berliner Handels-Kasse', c: 'BHK', f: '### ### ###' }, { n: 'Bankhaus Grunewald', c: 'BGW', f: '#######-##' }, { n: 'Spreebank', c: 'SPB', f: '## ### ####' }],
      airport: { n: 'Berlin-Tegel', c: 'TXL' }, station: 'Bahnhof Zoo',
      rental: ['Autovermietung Havel', 'City-Mobil Berlin'], papers: ['Der Tagesspiegel', 'Berliner Morgenpost'],
      landmarks: ['Kurfürstendamm', 'Tiergarten', 'Wannsee'] },
    EBE: { name: 'East Berlin', cc: 'DD', phone: '+37 2 ### ####', plate: 'I@ ##-##', addr: '{s} {n}, {z} Berlin', zip: ['1020', '1035', '1040', '1055', '1058', '1071'],
      streets: ['Leipziger Straße', 'Schönhauser Allee', 'Frankfurter Allee', 'Karl-Marx-Allee', 'Greifswalder Straße', 'Chausseestraße', 'Prenzlauer Allee', 'Wilhelm-Pieck-Straße', 'Dimitroffstraße'],
      venues: [{ n: 'Palast der Republik', k: 'hall', a: 'Marx-Engels-Platz' }, { n: 'Staatsoper Unter den Linden', k: 'opera', a: 'Unter den Linden 7' }, { n: 'Ministry of Foreign Trade', k: 'ministry', a: 'Unter den Linden 44' }, { n: 'Humboldt University', k: 'university', a: 'Unter den Linden 6' }, { n: 'Academy of Sciences Institute for Electron Physics', k: 'institute', a: 'Rudower Chaussee 5' }],
      hotels: [{ n: 'Interhotel Unter den Linden', s: 4, a: 'Unter den Linden 14', o: 1 }, { n: 'Hotel Spreeufer', s: 3, a: 'Spreeufer 4', o: 0 }, { n: 'Hotel Alexanderplatz', s: 3, a: 'Alexanderplatz 2', o: -1 }, { n: 'Hotel Friedrichstadt', s: 3, a: 'Friedrichstraße 150', o: 2 }, { n: 'Jugendtourist-Hotel Egon Schultz', s: 2, a: 'Franz-Mett-Straße 7', o: -1 }],
      cafes: ['Mokka-Milch-Eisbar', 'Café Moskau', 'Ganymed'],
      banks: [{ n: 'Deutsche Außenhandelsbank AG', c: 'DABA', f: '####-##-####' }, { n: 'Staatsbank der DDR', c: 'SBDDR', f: '#### #### ##' }],
      airport: { n: 'Berlin-Schönefeld', c: 'SXF' }, station: 'Bahnhof Friedrichstraße',
      rental: ['VEB Taxi-Mietwagen Berlin'], papers: ['Neues Deutschland', 'Berliner Zeitung'],
      landmarks: ['Alexanderplatz', 'Fernsehturm', 'Treptower Park'] },
    BUD: { name: 'Budapest', cc: 'HU', phone: '+36 1 ### ####', plate: '@@@-###', addr: '{s} {n}. {f}, {z} Budapest', zip: ['1051', '1061', '1072', '1085', '1092', '1113', '1136'],
      streets: ['Ráday utca', 'Andrássy út', 'Rákóczi út', 'Király utca', 'Bartók Béla út', 'Üllői út', 'Dob utca', 'Attila út', 'Múzeum körút', 'Pozsonyi út'],
      venues: [{ n: 'Hungarian State Opera', k: 'opera', a: 'Andrássy út 22' }, { n: 'Parliament (Országház)', k: 'ministry', a: 'Kossuth Lajos tér 1' }, { n: 'Budapest Convention Centre', k: 'hall', a: 'Jagelló út 1' }, { n: 'Hungexpo fairground', k: 'fair', a: 'Albertirsai út 10' }, { n: 'Central Research Institute for Physics (KFKI)', k: 'institute', a: 'Konkoly-Thege út 29' }, { n: 'ballroom of the Hotel Duna-Palota', k: 'ballroom', a: 'Apáczai Csere János u. 4' }],
      hotels: [{ n: 'Hotel Andrássy', s: 3, a: 'Andrássy út 25', o: 0 }, { n: 'Hotel Kossuth tér', s: 3, a: 'Balassi Bálint utca 2', o: 1 }, { n: 'Hotel Duna-Palota', s: 4, a: 'Apáczai Csere János u. 4', o: 5 }, { n: 'Hotel Nyugati', s: 3, a: 'Teréz körút 62', o: -1 }, { n: 'Panzió Ráday', s: 2, a: 'Ráday utca 9', o: -1 }, { n: 'Hotel Jagelló', s: 3, a: 'Jagelló út 3', o: 2 }],
      cafes: ['Café Művész', 'Café Gerbeaud-kert', 'Espresszó Ráday'],
      banks: [{ n: 'Magyar Külkereskedelmi Bank', c: 'MKB', f: '###-#####-##' }, { n: 'Országos Takarékpénztár', c: 'OTP', f: '####-###-###' }],
      airport: { n: 'Budapest-Ferihegy', c: 'BUD' }, station: 'Keleti pályaudvar',
      rental: ['Volántourist', 'Főtaxi Autókölcsönző'], papers: ['Népszabadság', 'Magyar Hírlap'],
      landmarks: ['Chain Bridge', 'Gellért Hill', 'Margaret Island'] },
    PRG: { name: 'Prague', cc: 'CS', phone: '+42 2 ### ## ##', plate: 'A@@ ##-##', addr: '{s} {n}, {z} Praha', zip: ['110 00', '120 00', '130 00', '140 00', '150 00', '170 00'],
      streets: ['Vinohradská', 'Žitná', 'Korunní', 'Vodičkova', 'Karlova', 'Nerudova', 'Belgická', 'Seifertova', 'Francouzská', 'Dlouhá'],
      venues: [{ n: 'National Theatre', k: 'opera', a: 'Národní 2' }, { n: 'Palace of Culture', k: 'hall', a: '5. května 65' }, { n: 'Černín Palace (Foreign Ministry)', k: 'ministry', a: 'Loretánské náměstí 5' }, { n: 'Výstaviště exhibition grounds', k: 'fair', a: 'Výstaviště' }, { n: 'Institute of Nuclear Physics', k: 'institute', a: 'Řež u Prahy' }, { n: 'Carolinum of Charles University', k: 'university', a: 'Ovocný trh 3' }],
      hotels: [{ n: 'Hotel Národní', s: 3, a: 'Národní 12', o: 0 }, { n: 'Hotel Vyšehrad', s: 3, a: 'Na Pankráci 4', o: 1 }, { n: 'Hotel Hradčany', s: 3, a: 'Loretánská 9', o: 2 }, { n: 'Hotel Vltava', s: 4, a: 'Rašínovo nábřeží 22', o: -1 }, { n: 'Hotel Florenc', s: 2, a: 'Sokolovská 30', o: -1 }],
      cafes: ['Kavárna Slavia-dvůr', 'Kavárna Národní', 'Vinárna U Zlaté konvice'],
      banks: [{ n: 'Československá obchodní banka', c: 'ČSOB', f: '###-#######' }, { n: 'Živnostenská banka', c: 'ŽB', f: '##-#####-###' }],
      airport: { n: 'Praha-Ruzyně', c: 'PRG' }, station: 'Hlavní nádraží',
      rental: ['Pragocar'], papers: ['Rudé právo', 'Svobodné slovo'],
      landmarks: ['Charles Bridge', 'Wenceslas Square', 'Petřín'] },
    MUC: { name: 'Munich', cc: 'DE', phone: '+49 89 ### ## ##', plate: 'M-@@ ###', addr: '{s} {n}, {z} München {d}', zip: ['8000'], dist: ['2', '5', '19', '21', '40', '60', '80', '90'],
      streets: ['Leopoldstraße', 'Schellingstraße', 'Lindwurmstraße', 'Rosenheimer Straße', 'Dachauer Straße', 'Nymphenburger Straße', 'Belgradstraße', 'Landsberger Straße', 'Westendstraße', 'Zenettistraße'],
      venues: [{ n: 'National Theatre (Bavarian State Opera)', k: 'opera', a: 'Max-Joseph-Platz 2' }, { n: 'Bavarian State Chancellery', k: 'ministry', a: 'Prinzregentenstraße 7' }, { n: 'Messegelände Theresienhöhe', k: 'fair', a: 'Theresienhöhe' }, { n: 'Deutsches Museum', k: 'museum', a: 'Museumsinsel 1' }, { n: 'Max Planck Institute at Garching', k: 'institute', a: 'Boltzmannstraße 2, Garching' }, { n: 'Festsaal of the Hotel Maximilianshof', k: 'ballroom', a: 'Maximilianstraße 18' }, { n: 'Congress Hall of the Deutsches Museum', k: 'hall', a: 'Zenneckbrücke' }],
      hotels: [{ n: 'Hotel Maximilianshof', s: 4, a: 'Maximilianstraße 18', o: 0 }, { n: 'Hotel am Isartor', s: 3, a: 'Zweibrückenstraße 5', o: 3 }, { n: 'Hotel Theresienhöhe', s: 3, a: 'Schwanthalerstraße 102', o: 2 }, { n: 'Pension Schwabing', s: 2, a: 'Ainmillerstraße 11', o: -1 }, { n: 'Hotel Hauptbahnhof-Nord', s: 3, a: 'Arnulfstraße 8', o: -1 }, { n: 'Hotel Prinzregent', s: 3, a: 'Prinzregentenstraße 11', o: 1 }],
      cafes: ['Café Luitpold-Stüberl', 'Schwabinger Espresso-Bar', 'Café am Viktualienmarkt'],
      banks: [{ n: 'Bayerische Handelsbank', c: 'BHB', f: '## ### ###' }, { n: 'Bankhaus Ettal & Co.', c: 'BEC', f: '###-######' }, { n: 'Isar-Kreditbank', c: 'IKB', f: '#### ### ##' }],
      airport: { n: 'München-Riem', c: 'MUC' }, station: 'Hauptbahnhof',
      rental: ['Isar-Autovermietung', 'Bavaria Mietwagen'], papers: ['Süddeutsche Zeitung', 'Münchner Merkur'],
      landmarks: ['Englischer Garten', 'Viktualienmarkt', 'Marienplatz'] },
    ZRH: { name: 'Zurich', cc: 'CH', phone: '+41 1 ### ## ##', plate: 'ZH ### ###', addr: '{s} {n}, {z} Zürich', zip: ['8001', '8003', '8004', '8005', '8006', '8008', '8032'],
      streets: ['Josefstrasse', 'Langstrasse', 'Badenerstrasse', 'Seefeldstrasse', 'Universitätstrasse', 'Hohlstrasse', 'Stauffacherstrasse', 'Weinbergstrasse', 'Hottingerstrasse', 'Zweierstrasse'],
      venues: [{ n: 'Zurich Opera House', k: 'opera', a: 'Falkenstrasse 1' }, { n: 'Kongresshaus Zürich', k: 'hall', a: 'Claridenstrasse 5' }, { n: 'ETH Institute for Applied Physics', k: 'institute', a: 'Hönggerberg' }, { n: 'Salle Belvoir of the Grand Hotel Limmat', k: 'ballroom', a: 'Limmatquai 24' }, { n: 'Swiss National Museum', k: 'museum', a: 'Museumstrasse 2' }, { n: 'Züspa exhibition halls', k: 'fair', a: 'Wallisellenstrasse 49' }],
      hotels: [{ n: 'Hotel Utoquai', s: 4, a: 'Utoquai 15', o: 0 }, { n: 'Hotel Tonhalle', s: 3, a: 'Claridenstrasse 10', o: 1 }, { n: 'Grand Hotel Limmat', s: 4, a: 'Limmatquai 24', o: 3 }, { n: 'Hotel Löwenstrasse', s: 3, a: 'Löwenstrasse 34', o: -1 }, { n: 'Pension Niederdorf', s: 2, a: 'Niederdorfstrasse 41', o: -1 }, { n: 'Hotel Landesmuseum', s: 3, a: 'Museumstrasse 7', o: 4 }],
      cafes: ['Café Odeon-Bar', 'Café Schober', 'Tea-Room Bellevue'],
      banks: [{ n: 'Zürcher Privatbank Escher & Cie', c: 'ZPE', f: '###-######.##' }, { n: 'Bank Limmat AG', c: 'BLA', f: '####-####-##' }, { n: 'Helvetische Handelsbank', c: 'HHB', f: '## ###.###' }],
      airport: { n: 'Zürich-Kloten', c: 'ZRH' }, station: 'Hauptbahnhof',
      rental: ['Limmat-Mietauto', 'Helvetia Car Rental'], papers: ['Neue Zürcher Zeitung', 'Tages-Anzeiger'],
      landmarks: ['Bahnhofstrasse', 'Lindenhof', 'Uetliberg'] },
    GVA: { name: 'Geneva', cc: 'CH', phone: '+41 22 ## ## ##', plate: 'GE ### ###', addr: '{s} {n}, {z} Genève', zip: ['1201', '1202', '1203', '1204', '1205', '1207'],
      streets: ['rue de Carouge', 'rue des Pâquis', 'boulevard Carl-Vogt', 'rue de Lausanne', 'rue de la Servette', 'route de Chêne', 'rue de Berne', 'avenue de France', 'rue des Eaux-Vives'],
      venues: [{ n: 'Palais des Nations', k: 'hall', a: 'avenue de la Paix 14' }, { n: 'Grand Théâtre de Genève', k: 'opera', a: 'place de Neuve 5' }, { n: 'Permanent Mission of the FRG', k: 'embassy', a: 'rue de Moillebeau 28' }, { n: 'CERN laboratories at Meyrin', k: 'institute', a: 'route de Meyrin' }, { n: 'Palexpo', k: 'fair', a: 'route François-Peyrot 30' }, { n: 'Salon des Glaces of the Hôtel Léman-Palace', k: 'ballroom', a: 'quai du Mont-Blanc 11' }],
      hotels: [{ n: 'Hôtel Ariana', s: 3, a: 'avenue de la Paix 3', o: 0 }, { n: 'Hôtel Neuve', s: 3, a: 'boulevard du Théâtre 8', o: 1 }, { n: 'Hôtel Léman-Palace', s: 4, a: 'quai du Mont-Blanc 11', o: 5 }, { n: 'Hôtel des Pâquis', s: 2, a: 'rue des Pâquis 22', o: -1 }, { n: 'Hôtel Moillebeau', s: 3, a: 'rue de Moillebeau 19', o: 2 }],
      cafes: ['Café du Molard', 'Brasserie Landolt-annexe', 'Buvette des Bains'],
      banks: [{ n: 'Banque Privée Lullin & Cie', c: 'BPL', f: '#.###.###-##' }, { n: 'Crédit Lémanique', c: 'CRL', f: '###.###.##' }, { n: 'Banque du Mont-Blanc', c: 'BMB', f: '####-#######' }],
      airport: { n: 'Genève-Cointrin', c: 'GVA' }, station: 'Cornavin',
      rental: ['Léman Location', 'Transauto Genève'], papers: ['Journal de Genève', 'La Tribune de Genève'],
      landmarks: ['Jet d\'Eau', 'Plainpalais', 'Old Town'] },
    ROM: { name: 'Rome', cc: 'IT', phone: '+39 6 ### ####', plate: 'ROMA N@####', addr: '{s} {n}, int. {f}, {z} Roma', zip: ['00184', '00185', '00186', '00153', '00161', '00176', '00198'],
      streets: ['Via dei Serpenti', 'Via Merulana', 'Via Cavour', 'Via Tuscolana', 'Via Ostiense', 'Via Nomentana', 'Via Appia Nuova', 'Via Prenestina', 'Via Flaminia', 'Via del Boschetto'],
      venues: [{ n: 'Teatro dell\'Opera', k: 'opera', a: 'Piazza Beniamino Gigli 7' }, { n: 'Palazzo della Farnesina', k: 'ministry', a: 'Piazzale della Farnesina 1' }, { n: 'Palazzo dei Congressi at EUR', k: 'hall', a: 'Piazza J. F. Kennedy 1' }, { n: 'Fiera di Roma', k: 'fair', a: 'Via Cristoforo Colombo 285' }, { n: 'Physics Institute of La Sapienza', k: 'university', a: 'Piazzale Aldo Moro 5' }, { n: 'Embassy of Austria', k: 'embassy', a: 'Via Pergolesi 3' }],
      hotels: [{ n: 'Albergo Viminale', s: 3, a: 'Via Firenze 38', o: 0 }, { n: 'Hotel Farnesina', s: 3, a: 'Lungotevere Maresciallo Cadorna 12', o: 1 }, { n: 'Hotel dei Congressi', s: 4, a: 'Viale Shakespeare 29', o: 2 }, { n: 'Pensione Esquilino', s: 2, a: 'Via Principe Amedeo 44', o: -1 }, { n: 'Hotel Flaminio', s: 3, a: 'Via Flaminia 60', o: -1 }, { n: 'Hotel Parioli-Pergolesi', s: 3, a: 'Via Pergolesi 8', o: 5 }],
      cafes: ['Bar Esedra', 'Caffè Monti', 'Bar Tabacchi Termini'],
      banks: [{ n: 'Banca Romana di Credito', c: 'BRC', f: '#####/##/##' }, { n: 'Banco del Tevere', c: 'BTV', f: '###-######-#' }, { n: 'Cassa Rurale Laziale', c: 'CRL', f: '## ### ###' }],
      airport: { n: 'Roma-Fiumicino', c: 'FCO' }, station: 'Termini',
      rental: ['Autonoleggio Tevere', 'Maggiore-Locauto'], papers: ['Il Messaggero', 'la Repubblica'],
      landmarks: ['Piazza Navona', 'Trastevere', 'Villa Borghese'] },
    PAR: { name: 'Paris', cc: 'FR', phone: '+33 1 4# ## ## ##', plate: '#### @@ 75', addr: '{n}, {s}, {z} Paris', zip: ['75004', '75010', '75011', '75012', '75014', '75018', '75020'],
      streets: ['rue de la Roquette', 'rue Oberkampf', 'rue du Faubourg-Saint-Denis', 'boulevard Voltaire', 'rue de Rennes', 'rue Lepic', 'rue de Charonne', 'avenue de Clichy', 'rue de Belleville', 'rue Mouffetard'],
      venues: [{ n: 'Opéra Garnier', k: 'opera', a: 'place de l\'Opéra' }, { n: 'Quai d\'Orsay (Foreign Ministry)', k: 'ministry', a: '37 quai d\'Orsay' }, { n: 'Palais des Congrès', k: 'hall', a: 'Porte Maillot' }, { n: 'Parc des Expositions', k: 'fair', a: 'Porte de Versailles' }, { n: 'Collège de France', k: 'university', a: '11 place Marcelin-Berthelot' }, { n: 'salons of the Hôtel Wagram-Étoile', k: 'ballroom', a: '20 avenue de Wagram' }, { n: 'Embassy of the FRG', k: 'embassy', a: '13-15 avenue Franklin-D.-Roosevelt' }],
      hotels: [{ n: 'Hôtel Auber', s: 3, a: '4 rue Auber', o: 0 }, { n: 'Hôtel d\'Orsay-Invalides', s: 3, a: '12 rue de l\'Université', o: 1 }, { n: 'Hôtel Porte Maillot', s: 3, a: '5 boulevard Pereire', o: 2 }, { n: 'Hôtel du Nord-Magenta', s: 2, a: '84 boulevard de Magenta', o: -1 }, { n: 'Hôtel Saint-Séverin', s: 2, a: '38 rue de la Harpe', o: -1 }, { n: 'Hôtel Wagram-Étoile', s: 4, a: '20 avenue de Wagram', o: 5 }],
      cafes: ['Café de la Paix-Annexe', 'Le Rostand', 'Tabac des Invalides'],
      banks: [{ n: 'Banque Vendôme', c: 'BVD', f: '#####-########-##' }, { n: 'Crédit Parisien du Commerce', c: 'CPC', f: '###-#####-#' }, { n: 'Banque Rothier & Cie', c: 'BRT', f: '## ##### ###' }],
      airport: { n: 'Paris-Charles-de-Gaulle', c: 'CDG' }, station: 'Gare de l\'Est',
      rental: ['Locauto Paris', 'Transmobile SA'], papers: ['Le Monde', 'Le Figaro'],
      landmarks: ['Montmartre', 'Les Halles', 'Bois de Boulogne'] },
    MRS: { name: 'Marseille', cc: 'FR', phone: '+33 91 ## ## ##', plate: '#### @@ 13', addr: '{n}, {s}, {z} Marseille', zip: ['13001', '13002', '13005', '13006', '13007', '13003'],
      streets: ['rue Paradis', 'rue de Rome', 'cours Julien', 'boulevard National', 'rue Sainte', 'rue d\'Aubagne', 'boulevard Baille', 'rue Consolat', 'rue de la République'],
      venues: [{ n: 'Opéra de Marseille', k: 'opera', a: '2 rue Molière' }, { n: 'Préfecture des Bouches-du-Rhône', k: 'ministry', a: 'place Félix-Baret' }, { n: 'Palais du Pharo', k: 'hall', a: '58 boulevard Charles-Livon' }, { n: 'Parc Chanot', k: 'fair', a: 'rond-point du Prado' }, { n: 'Musée Cantini', k: 'museum', a: '19 rue Grignan' }, { n: 'salons of the Grand Hôtel Canebière', k: 'ballroom', a: '26 la Canebière' }],
      hotels: [{ n: 'Hôtel Vieux-Port', s: 3, a: '3 rue Molière', o: 0 }, { n: 'Hôtel Préfecture', s: 2, a: '9 boulevard Louis-Salvator', o: 1 }, { n: 'Hôtel du Pharo', s: 3, a: '71 boulevard Charles-Livon', o: 2 }, { n: 'Hôtel Saint-Charles', s: 2, a: '12 boulevard d\'Athènes', o: -1 }, { n: 'Grand Hôtel Canebière', s: 4, a: '26 la Canebière', o: 5 }],
      cafes: ['Bar de la Marine-Annexe', 'Café des Deux Garçons-Sud', 'Bar Tabac du Prado'],
      banks: [{ n: 'Banque Phocéenne', c: 'BPH', f: '###-######-##' }, { n: 'Crédit Marseillais', c: 'CMS', f: '#####-####' }],
      airport: { n: 'Marseille-Marignane', c: 'MRS' }, station: 'Gare Saint-Charles',
      rental: ['Provence Location', 'Azur Auto'], papers: ['Le Provençal', 'Le Méridional'],
      landmarks: ['Vieux-Port', 'Notre-Dame-de-la-Garde', 'Le Panier'] },
    LIS: { name: 'Lisbon', cc: 'PT', phone: '+351 1 ## ## ##', plate: '@@-##-##', addr: '{s} {n}, {f}º, {z} Lisboa', zip: ['1100', '1200', '1000', '1150', '1170'],
      streets: ['Rua da Madalena', 'Rua dos Fanqueiros', 'Avenida Almirante Reis', 'Rua de São Bento', 'Rua do Benformoso', 'Calçada do Combro', 'Rua Morais Soares', 'Avenida de Roma', 'Rua da Palma'],
      venues: [{ n: 'Teatro Nacional de São Carlos', k: 'opera', a: 'Rua Serpa Pinto 9' }, { n: 'Palácio das Necessidades (Foreign Ministry)', k: 'ministry', a: 'Largo do Rilvas' }, { n: 'Gulbenkian Foundation Auditorium', k: 'hall', a: 'Avenida de Berna 45' }, { n: 'FIL fairground', k: 'fair', a: 'Praça das Indústrias' }, { n: 'Faculty of Sciences of the University of Lisbon', k: 'university', a: 'Rua da Escola Politécnica 58' }, { n: 'salões of the Grande Hotel Tejo', k: 'ballroom', a: 'Rua do Ouro 110' }],
      hotels: [{ n: 'Hotel Chiado', s: 3, a: 'Rua Serpa Pinto 14', o: 0 }, { n: 'Residencial Lapa', s: 2, a: 'Rua do Prior 5', o: 1 }, { n: 'Hotel Palhavã', s: 3, a: 'Avenida de Berna 30', o: 2 }, { n: 'Pensão Rossio', s: 2, a: 'Rua dos Sapateiros 173', o: -1 }, { n: 'Grande Hotel Tejo', s: 4, a: 'Rua do Ouro 110', o: 5 }],
      cafes: ['Café Nicola-Anexo', 'Pastelaria Suíça-Rossio', 'Café Brasileira do Chiado-Bar'],
      banks: [{ n: 'Banco Lusitano de Crédito', c: 'BLC', f: '####/######/##' }, { n: 'Banco Atlântico Comercial', c: 'BAC', f: '##-####-#####' }],
      airport: { n: 'Lisboa-Portela', c: 'LIS' }, station: 'Santa Apolónia',
      rental: ['Tejo Rent-a-Car', 'Lusocar'], papers: ['Diário de Notícias', 'O Século'],
      landmarks: ['Rossio', 'Alfama', 'Belém'] },
    IST: { name: 'Istanbul', cc: 'TR', phone: '+90 1 ### ## ##', plate: '34 @@ ###', addr: '{s} No:{n} D:{f}, {z} İstanbul', zip: ['Beyoğlu', 'Şişli', 'Fatih', 'Beşiktaş', 'Kadıköy', 'Eminönü'],
      streets: ['İstiklal Caddesi', 'Cumhuriyet Caddesi', 'Divanyolu', 'Ordu Caddesi', 'Tarlabaşı Bulvarı', 'Büyükdere Caddesi', 'Halaskargazi Caddesi', 'Mimar Kemalettin Caddesi', 'Sıraselviler Caddesi'],
      venues: [{ n: 'Atatürk Cultural Centre', k: 'opera', a: 'Taksim Meydanı' }, { n: 'reception halls of Dolmabahçe Palace', k: 'ministry', a: 'Dolmabahçe Caddesi' }, { n: 'Consulate-General of the FRG', k: 'embassy', a: 'İnönü Caddesi 16' }, { n: 'Tüyap fair halls', k: 'fair', a: 'Tepebaşı' }, { n: 'Istanbul Technical University', k: 'university', a: 'Maçka' }, { n: 'ballroom of the Grand Hotel Bosphorus', k: 'ballroom', a: 'Meclis-i Mebusan Caddesi 14' }],
      hotels: [{ n: 'Hotel Taksim Park', s: 3, a: 'Cumhuriyet Caddesi 12', o: 0 }, { n: 'Hotel Beşiktaş Sahil', s: 3, a: 'Dolmabahçe Caddesi 31', o: 1 }, { n: 'Otel Gümüşsuyu', s: 3, a: 'İnönü Caddesi 21', o: 2 }, { n: 'Otel Sirkeci', s: 2, a: 'Hüdavendigar Caddesi 7', o: -1 }, { n: 'Grand Hotel Bosphorus', s: 4, a: 'Meclis-i Mebusan Caddesi 14', o: 5 }],
      cafes: ['Kafe Lale', 'Pastane Markiz-Yan', 'Çay Bahçesi Gülhane'],
      banks: [{ n: 'Anadolu Ticaret Bankası', c: 'ATB', f: '####-######' }, { n: 'Boğaziçi Kredi Bankası', c: 'BKB', f: '###-##-#####' }],
      airport: { n: 'İstanbul-Atatürk', c: 'IST' }, station: 'Sirkeci',
      rental: ['Boğaz Oto Kiralama', 'Marmara Rent a Car'], papers: ['Cumhuriyet', 'Milliyet'],
      landmarks: ['Galata Bridge', 'Grand Bazaar', 'Taksim Square'] }
  };

  // Land borders. key 'AA-BB' (sorted). road / rail names; transit notes.
  var CROSS = {
    'AT-HU': { road: 'Nickelsdorf / Hegyeshalom', rail: 'Hegyeshalom (train)' },
    'AT-CS': { road: 'Berg / Petržalka', rail: 'Hohenau / Břeclav (train)' },
    'AT-DE': { road: 'Walserberg (Autobahn)', rail: 'Salzburg Hbf (train)' },
    'AT-CH': { road: 'St. Margrethen', rail: 'Buchs SG (train)' },
    'AT-IT': { road: 'Brenner', rail: 'Brenner (train)' },
    'CH-DE': { road: 'Basel / Weil am Rhein', rail: 'Basel Badischer Bahnhof (train)' },
    'DE-FR': { road: 'Strasbourg Europabrücke / Kehl', rail: 'Kehl (train)' },
    'CS-DE': { road: 'Waidhaus / Rozvadov', rail: 'Schirnding / Cheb (train)' },
    'DD-DE': { road: 'Rudolphstein / Hirschberg', rail: 'Probstzella (train)' },
    'DD-WB': { road: 'Checkpoint Charlie', rail: 'Bahnhof Friedrichstraße (S-Bahn)' },
    'DE-WB': { road: 'Dreilinden (transit route)', rail: 'Bahnhof Zoo (transit train)' },
    'CS-DD': { road: 'Zinnwald / Cínovec', rail: 'Bad Schandau (train)' },
    'CS-HU': { road: 'Komárno / Komárom', rail: 'Štúrovo / Szob (train)' },
    'CH-FR': { road: 'Genève-Bardonnex', rail: 'Genève-Cornavin, French platforms (train)' },
    'CH-IT': { road: 'Chiasso', rail: 'Chiasso (train)' },
    'FR-IT': { road: 'Menton / Ventimiglia', rail: 'Ventimiglia (train)' }
  };

  var AIRLINE = {
    AT: { c: 'OS', n: 'Austrian Airlines' }, DE: { c: 'LH', n: 'Lufthansa' }, WB: { c: 'PA', n: 'Pan Am' },
    DD: { c: 'IF', n: 'Interflug' }, HU: { c: 'MA', n: 'Malév' }, CS: { c: 'OK', n: 'ČSA' }, CH: { c: 'SR', n: 'Swissair' },
    IT: { c: 'AZ', n: 'Alitalia' }, FR: { c: 'AF', n: 'Air France' }, PT: { c: 'TP', n: 'TAP Air Portugal' }, TR: { c: 'TK', n: 'Turkish Airlines' }
  };

  var TRAVEL_AGENTS = ['Reisebüro Ruefa', 'Blaguss Reisen', 'Voyages Wasteels', 'Ibusz', 'Čedok', 'Hapag-Lloyd Reisebüro', 'Kuoni', 'CIT Viaggi', 'Havas Voyages', 'Abreu Viagens', 'Setur', 'airline desk'];

  // ------------------------------------------------------------- items
  // cat drives supplier role; method = which plot method it implies (null = neutral)
  var ITEMS = {
    rifle: { method: 'sniper rifle', cat: 'weapon', names: ['Steyr SSG 69 rifle, 7.62 mm', 'Mauser 66 SP rifle', 'Sako L691 hunting rifle, .308'], ref: ['Jagdwaffe lt. Vereinbarung', 'Sportwaffe, Zubehör, Futteral', 'Büchsenmacherarbeiten Rg. {n}'], street: 'a scoped hunting rifle' },
    scope: { method: 'sniper rifle', cat: 'optics', names: ['Kahles ZF 69 telescopic sight', 'Zeiss Diavari 1.5-6x telescopic sight', 'Hensoldt 10x42 sighting telescope'], ref: ['Optik Rg. {n} (Zielfernrohr)', 'Zielfernrohr m. Montage', 'optische Geräte, Rg. {n}'], street: 'a telescopic sight' },
    pistol: { method: 'pistol', cat: 'weapon', names: ['Makarov PM pistol', 'Walther PPK, 7.65 mm', 'Browning HP, 9 mm'], ref: ['Sportwaffe lt. Vereinbarung', 'Sammlerstück (Faustfeuerwaffe)', 'Rg. {n} Waffenhandel'], street: 'a pistol' },
    silencer: { method: 'pistol', cat: 'weapon', names: ['a workshop-made suppressor', 'screw-on silencer, 9 mm thread'], ref: ['Dreharbeiten Rg. {n}', 'Präzisionsmechanik, Einzelanfertigung'], street: 'a silencer' },
    toxin: { method: 'poison', cat: 'chemical', names: ['thallium sulphate (40 g)', 'aconitine (6 ampoules)', 'a ricin preparation'], ref: ['Laborbedarf Rg. {n}', 'Chemikalien lt. Liste'], street: 'a poison' },
    injector: { method: 'poison', cat: 'device', names: ['a fountain-pen injector', 'a modified umbrella tip', 'a spring-loaded syringe in a cigarette case'], ref: ['Feinmechanik Einzelstück', 'Reparatur Schreibgerät Rg. {n}'], street: 'an injection device' },
    explosive: { method: 'explosive device', cat: 'explosive', names: ['Semtex-H (6 kg)', 'Gelamon 30 (40 sticks)', 'Donarit 1 (25 kg)'], ref: ['Sprengmittel (Steinbruch)', 'Baustoffe Rg. {n}'], street: 'explosive' },
    timer: { method: 'explosive device', cat: 'device', names: ['electric detonators and a travel-alarm timer', 'six time-delay switches', 'a radio-control set (model aircraft)'], ref: ['Elektronikbauteile Rg. {n}', 'Modellbau-Fernsteuerung', 'Uhrenbestandteile'], street: 'detonators' },
    sedative: { method: 'abduction', cat: 'chemical', names: ['chloroform (2 litres)', 'ketamine, veterinary (10 vials)', 'diethyl ether (5 litres)'], ref: ['Tierarztbedarf Rg. {n}', 'Laborbedarf'], street: 'a sedative' },
    compartment: { method: 'abduction', cat: 'vehicle-work', names: ['a concealed compartment welded under a van floor', 'a false bulkhead fitted to a furniture van'], ref: ['Karosseriearbeiten Rg. {n}', 'Umbau Laderaum'], street: 'a vehicle conversion' },
    keys: { method: 'burglary', cat: 'tools', names: ['key blanks and impression wax', 'duplicate keys cut from wax impressions'], ref: ['Schlüsseldienst Rg. {n}', 'Rohlinge, Abdruckmasse'], street: 'key impressions' },
    drill: { method: 'burglary', cat: 'tools', names: ['a diamond core drill', 'a thermal lance kit', 'a hydraulic door spreader'], ref: ['Werkzeugmiete Rg. {n}', 'Baumaschinen'], street: 'safe-breaking tools' }
  };

  var METHODS = ['sniper rifle', 'pistol', 'poison', 'explosive device', 'burglary', 'abduction'];

  // ---------------------------------------------------- operation templates
  // roles: required specialist roles; opt: may be added; items: [key, mode choices]
  // recon: recon kinds used (operative does view-room / buys-schedule / asks-porter,
  // lookout (or operative) does photographs). venueKinds: where the act can happen.
  var TEMPLATES = {
    rifle: { family: 'assassination', method: 'sniper rifle', target: 'dignitary', venueKinds: ['opera', 'hall', 'ministry'], needOverlook: true,
      roles: ['armourer', 'forger', 'driver'], opt: ['lookout', 'courier', 'financier'],
      items: [['rifle', ['supplier']], ['scope', ['purchase', 'supplier']]],
      recon: ['view-room', 'photographs', 'buys-schedule'], label: 'assassination by rifle' },
    pistol: { family: 'assassination', method: 'pistol', target: 'dignitary', venueKinds: ['opera', 'hall', 'ministry', 'embassy', 'ballroom'],
      roles: ['armourer', 'forger', 'lookout'], opt: ['driver', 'courier', 'financier'],
      items: [['pistol', ['supplier']], ['silencer', ['purchase', 'supplier']]],
      recon: ['asks-porter', 'photographs', 'buys-schedule'], label: 'assassination at close range' },
    poison: { family: 'assassination', method: 'poison', target: 'dignitary', venueKinds: ['ballroom', 'embassy'],
      roles: ['chemist', 'inside-man', 'forger'], opt: ['courier', 'financier', 'lookout'],
      items: [['toxin', ['theft', 'supplier']], ['injector', ['purchase', 'supplier']]],
      recon: ['asks-porter', 'view-room', 'buys-schedule'], label: 'poisoning at a banquet' },
    bomb: { family: 'bombing', method: 'explosive device', target: 'dignitary', venueKinds: ['hall', 'opera', 'ministry', 'embassy', 'fair'],
      roles: ['chemist', 'driver'], opt: ['armourer', 'lookout', 'financier', 'courier'],
      items: [['explosive', ['theft', 'supplier']], ['timer', ['purchase', 'supplier']]],
      recon: ['photographs', 'buys-schedule', 'view-room'], label: 'bombing' },
    burglary: { family: 'theft', method: 'burglary', target: 'object', venueKinds: ['fair', 'museum', 'institute'],
      roles: ['inside-man', 'driver', 'lookout'], opt: ['forger', 'financier', 'courier'],
      items: [['keys', ['supplier', 'purchase']], ['drill', ['theft', 'purchase']]],
      recon: ['photographs', 'asks-porter', 'buys-schedule'], label: 'theft of a prototype' },
    abduction: { family: 'exfiltration', method: 'abduction', target: 'scientist', venueKinds: ['university', 'institute', 'hall'],
      roles: ['driver', 'chemist', 'forger'], opt: ['lookout', 'courier', 'financier'],
      items: [['sedative', ['theft', 'supplier']], ['compartment', ['purchase']]],
      recon: ['asks-porter', 'buys-schedule', 'view-room', 'photographs'], label: 'abduction across a border' }
  };

  // who supplies which item category
  var SUPPLIER_ROLE = { weapon: 'armourer', optics: 'armourer', chemical: 'chemist', device: 'chemist', explosive: 'armourer', 'vehicle-work': 'driver', tools: 'inside-man' };

  // ---------------------------------------------------------- targets
  var TRAITS = [
    { cat: 'music', code: 'the Musician', t: ['is a keen amateur organist who plays most Sundays at his parish church', 'plays the viola in a string quartet of retired diplomats', 'has not missed a Bayreuth season since 1962', 'sang bass in the university choir and, colleagues say, still does in the car'] },
    { cat: 'sea', code: 'the Sailor', t: ['is an accomplished yachtsman who crossed the Bay of Biscay single-handed', 'keeps a small ketch on Lake Constance', 'served in the navy and still refers to the ministry canteen as the galley'] },
    { cat: 'garden', code: 'the Gardener', t: ['breeds orchids and has a variety named after him', 'is a noted rose grower whose hybrid teas win prizes', 'spends the recess pruning his late wife\'s espaliers'] },
    { cat: 'collect', code: 'the Collector', t: ['collects eighteenth-century clocks', 'owns what is said to be the finest collection of Habsburg postage stamps in private hands', 'collects Meissen porcelain and is rarely without a catalogue'] },
    { cat: 'hunt', code: 'the Hunter', t: ['stalks chamois in the Tyrol every autumn', 'is a passionate game shot', 'breeds and trains wire-haired pointers'] },
    { cat: 'climb', code: 'the Climber', t: ['has climbed the north face of the Eiger', 'spends his holidays on the via ferratas of the Dolomites', 'was a member of a 1961 Karakoram expedition'] },
    { cat: 'chess', code: 'the Chess Player', t: ['composes chess problems for a Sunday newspaper', 'once drew against a grandmaster in a simultaneous exhibition', 'plays postal chess with opponents on three continents'] },
    { cat: 'horse', code: 'the Rider', t: ['rides to hounds and keeps two hunters', 'breeds Lipizzaners on a small stud farm', 'was a reserve for the 1964 Olympic dressage team'] },
    { cat: 'paint', code: 'the Painter', t: ['paints watercolours and exhibited in a Graz gallery last spring', 'is an amateur landscape painter who carries his easel on official trips', 'restores icons as a hobby'] },
    { cat: 'bees', code: 'the Beekeeper', t: ['keeps bees on the roof of his official residence', 'has written a monograph on Carniolan bees'] }
  ];

  var OBJECTS = [
    { cat: 'optics', code: 'the Owl', names: ['the NACHTAUGE thermal-imaging camera prototype', 'a third-generation image-intensifier tube set', 'the LUCHS night-sight for armoured vehicles'] },
    { cat: 'navigation', code: 'the Compass', names: ['the ring-laser gyroscope from an inertial navigation platform', 'the guidance section of an anti-tank missile', 'a fibre-optic gyrocompass prototype'] },
    { cat: 'cipher', code: 'the Typewriter', names: ['an electronic cipher machine of the latest NATO type', 'the key-generator module of a secure telex', 'a crate of printed one-time key tables'] },
    { cat: 'radio', code: 'the Radio', names: ['a frequency-hopping field radio prototype', 'the transmitter module of a naval radar', 'a satellite ground-terminal receiver'] },
    { cat: 'chip', code: 'the Stained Glass', names: ['a complete mask set for a 1-megabit memory chip', 'the photolithography masks for a military microprocessor'] }
  ];
  var OBJECT_OWNERS = ['Hartwig Optronik GmbH', 'Brandauer Elektronik AG', 'Société Valmont Électronique', 'Officine Galvani S.p.A.', 'Kessel & Rauch Präzisionstechnik', 'Lumatec SA', 'Nordwerk Systemtechnik'];

  var DIGNITARY_TITLES = [
    ['DE', 'Federal Minister for Economic Cooperation'], ['DE', 'State Secretary at the Federal Ministry of Defence'], ['AT', 'Austrian Minister of the Interior'],
    ['AT', 'Austrian Foreign Minister'], ['FR', 'French Minister for European Affairs'], ['IT', 'Italian Under-Secretary for Foreign Affairs'],
    ['GB', 'British Minister of State for Trade'], ['NL', 'Netherlands Minister of Defence'], ['CH', 'President of the Swiss Confederation'],
    ['TR', 'Turkish Minister of State'], ['PT', 'Portuguese Minister for Foreign Affairs'], ['DE', 'President of the Bundesbank'],
    ['GB', 'Chief of the Defence Staff (UK)'], ['US', 'US Assistant Secretary of State'], ['IT', 'Italian Minister of Defence'], ['FR', 'Director of the French atomic energy commission']
  ];
  var SCIENTIST_FIELDS = ['nuclear physicist', 'rocket-propulsion engineer', 'cryptologist', 'microelectronics engineer', 'laser physicist', 'virologist'];
  var US_NAMES = { male: ['Robert', 'Richard', 'Charles', 'William', 'Thomas', 'Donald'], sur: ['Whitaker', 'Hollis', 'Brennan', 'Caldwell', 'Morrison', 'Lindqvist'] };

  // Event templates per venue kind: what happens there, for whom
  var EVENT_KINDS = {
    opera: [{ t: 'gala performance', w: 'attends a gala performance of {opera} at the {venue}', time: [1170, 1140, 1200] }],
    hall: [{ t: 'conference address', w: 'addresses the {conf} at the {venue}', time: [600, 630, 900, 870] }],
    ministry: [{ t: 'official talks', w: 'holds official talks at the {venue}', time: [600, 660, 900] }],
    embassy: [{ t: 'reception', w: 'is guest of honour at a reception at the {venue}', time: [1110, 1140] }],
    ballroom: [{ t: 'banquet', w: 'is guest of honour at a banquet in the {venue}', time: [1170, 1200, 1140] }],
    fair: [{ t: 'exhibition', w: 'opens the {conf} at the {venue}', time: [600, 630] }],
    museum: [{ t: 'exhibition opening', w: 'opens an exhibition at the {venue}', time: [1080, 1110] }],
    institute: [{ t: 'visit', w: 'visits the {venue}', time: [600, 840] }],
    university: [{ t: 'lecture', w: 'gives a public lecture at the {venue}', time: [1050, 1080, 1020] }]
  };
  var OPERAS = ['Tosca', 'Der Rosenkavalier', 'Fidelio', 'La Traviata', 'Don Giovanni', 'Boris Godunov', 'Rusalka', 'Aida', 'Die Zauberflöte', 'Eugene Onegin'];
  var CONFS = ['CSCE follow-up conference on economic cooperation', 'European Energy Forum', 'International Symposium on Arms Verification', 'Conference of European Transport Ministers', 'East-West Trade Congress', 'Congress of the International Atomic Energy Association', 'European Security Colloquium', 'Danube Commission plenary'];
  var FAIRS = ['International Electronics Fair', 'Defence Technology Exhibition', 'Optics and Precision Engineering Fair', 'Telecom Europa 89', 'Aerospace Components Show'];

  // -------------------------------------------------------------- flavour
  var FLAVOUR = {
    hotelNotes: ['Paid cash in advance.', 'Complained about the radiator.', 'Asked for a quiet room; none available.', 'No luggage beyond a briefcase.', 'Requested early call 06:00.', 'Left a small umbrella; not collected.', 'Ordered breakfast to the room both mornings.', 'Tipped the porter well above the usual.', 'Asked for the Neue Zürcher Zeitung; given the Kurier.', 'Queried the bill for the minibar at length.', 'Arrived by taxi from the station.', 'Wanted to know if the hotel had a garage.', 'Borrowed a city map from reception.', 'Returned after midnight both nights.', 'Did not use the room telephone.', 'Asked twice whether there was mail for him.'],
    innocentHotelNotes: ['Travelling on company business (textiles).', 'Stays regularly; known to staff.', 'Complained about noise from the adjacent room.', 'Attending a dental congress.', 'Wedding anniversary; ordered flowers.'],
    callNoise: [['Radio-Taxi', 'business'], ['Pizzeria Da Gino', 'business'], ['Speaking clock', 'service'], ['Weather forecast (recorded)', 'service'], ['Railway timetable information', 'service'], ['Airline reservations desk', 'business'], ['Florist Blumen-Eck', 'business'], ['Garage and tyre service', 'business'], ['Dr. med. dent. practice', 'business'], ['Insurance agency', 'business']],
    bankNoise: [['Rent', 'rent'], ['Electricity / gas', 'utility'], ['Telephone account', 'utility'], ['Insurance premium', 'utility'], ['Cash withdrawal', 'cash'], ['Salary', 'salary']],
    informants: ['KRANICH', 'AMSEL', 'TAUBE', 'LOTTE', 'FISCHER', 'BOTANIKER', 'MÜLLERIN', 'SCHNEIDER', 'GRAF', 'PFARRER'],
    herringGoods: [
      { k: 'cigarettes', d: 'untaxed cigarettes', ref: 'Tabakwaren Rg. {n}', code: 'the shirts' },
      { k: 'watches', d: 'smuggled Swiss watches', ref: 'Uhren lt. Liste', code: 'the grandmother\'s clocks' },
      { k: 'icons', d: 'Russian icons without export papers', ref: 'Antiquitäten', code: 'the pictures' },
      { k: 'currency', d: 'black-market currency', ref: 'Devisen / Wechsel', code: 'the envelopes' },
      { k: 'porcelain', d: 'Meissen porcelain from GDR state stock', ref: 'Porzellan (Export)', code: 'the crockery' }
    ],
    coverCompanies: ['{a} Import-Export {f}', '{a} Handels{f}', '{a} Maschinen-Handel {f}', '{a} Consulting {f}', '{a} Transport {f}', '{a} Trading {f}', '{a} Technik-Vertrieb {f}'],
    coverRoots: ['Danubia', 'Helvetia-Ost', 'Adria', 'Transalpina', 'Balthasar', 'Merkur', 'Nordstern', 'Castellan', 'Orion', 'Lusitania', 'Bosporus', 'Carpathia', 'Rheingold', 'Pannonia', 'Mistral'],
    companyForms: { AT: 'Ges.m.b.H.', DE: 'GmbH', WB: 'GmbH', CH: 'AG', IT: 'S.r.l.', FR: 'SARL', PT: 'Lda.', TR: 'Ltd. Şti.', HU: 'Kft.', CS: 'n.p.', DD: 'AHB' },
    occupations: {
      principal: ['Counsellor (trade), GDR Ministry of Foreign Trade', 'Deputy director, foreign-trade enterprise', 'Retired colonel, now consultant', 'Commercial attaché', 'Managing partner, holding company'],
      cutout: ['Sales representative', 'Import-export agent', 'Freelance journalist', 'Travel agent', 'Antiques dealer', 'Language teacher'],
      operative: ['Engineer (unemployed)', 'Former soldier', 'Photographer', 'Mechanic', 'Security consultant', 'Merchant seaman'],
      armourer: ['Gunsmith', 'Sporting-goods dealer', 'Precision machinist', 'Hunting outfitter'],
      forger: ['Printer', 'Lithographer', 'Bookbinder', 'Graphic designer', 'Stamp dealer'],
      driver: ['Lorry driver', 'Taxi driver', 'Car mechanic', 'Removals driver', 'Chauffeur'],
      financier: ['Fiduciary (Treuhänder)', 'Accountant', 'Private banker', 'Lawyer (company formations)'],
      'inside-man': ['Waiter (banqueting)', 'Night porter', 'Security guard', 'Caterer', 'Technician (building services)', 'Cleaner (contract staff)'],
      chemist: ['Laboratory assistant', 'Pharmacist', 'Chemistry teacher', 'Veterinary assistant', 'Industrial chemist'],
      lookout: ['Student', 'Tourist guide', 'Waitress', 'Unemployed', 'Photographer\'s assistant'],
      courier: ['Airline steward', 'Long-distance coach driver', 'Sales representative', 'Diplomatic driver'],
      innocent: ['Retired schoolteacher', 'Nurse', 'Secretary', 'Civil servant', 'Shop assistant', 'Textile salesman', 'Dentist', 'Hairdresser'],
      herring: ['Market trader', 'Scrap-metal dealer', 'Café proprietor', 'Lorry driver', 'Antiques dealer', 'Bar owner']
    },
    codePhrases: {
      date: ['the wedding is on {wd}', 'your aunt arrives {wd}', 'the christening is fixed for {wd}', 'we deliver on {wd}, as agreed', 'the concert is {wd}, not before'],
      target: ['{code} will be there', 'it is definitely {code}', 'our friend is {code}, as I told you', 'the parcel is for {code}'],
      go: ['everything is as discussed', 'the weather looks good', 'no changes', 'the family is well'],
      noise: ['did you speak to the bank', 'I will call from the usual place', 'not on this line', 'my regards to your wife', 'same time Thursday', 'bring the papers', 'the car is ready']
    }
  };

  CX.DATA = {
    NAT: NAT, COUNTRY: COUNTRY, CITIES: CITIES, CROSS: CROSS, AIRLINE: AIRLINE, TRAVEL_AGENTS: TRAVEL_AGENTS,
    ITEMS: ITEMS, METHODS: METHODS, TEMPLATES: TEMPLATES, SUPPLIER_ROLE: SUPPLIER_ROLE,
    TRAITS: TRAITS, OBJECTS: OBJECTS, OBJECT_OWNERS: OBJECT_OWNERS, DIGNITARY_TITLES: DIGNITARY_TITLES,
    SCIENTIST_FIELDS: SCIENTIST_FIELDS, US_NAMES: US_NAMES, EVENT_KINDS: EVENT_KINDS, OPERAS: OPERAS, CONFS: CONFS, FAIRS: FAIRS,
    FLAVOUR: FLAVOUR,
    ROLES: ['principal', 'cutout', 'operative', 'armourer', 'forger', 'driver', 'financier', 'inside-man', 'chemist', 'lookout', 'courier', 'innocent', 'herring'],
    NETWORK_ROLES: ['principal', 'cutout', 'operative', 'armourer', 'forger', 'driver', 'financier', 'inside-man', 'chemist', 'lookout', 'courier'],
    // query cost in team-hours
    HOURS: { hotels: 1, border: 1, airline: 1, phones: 2, bank: 4, vehicles: 1, residents: 1, companies: 1, archive: 2 },
    // which token types each system accepts as a key
    KEYS: { hotels: ['name', 'passport', 'hotel+date'], border: ['name', 'passport', 'plate'], airline: ['name', 'flight'], phones: ['number'],
      bank: ['account', 'company'], vehicles: ['plate'], residents: ['name', 'address'], companies: ['company'], archive: ['name'] },
    DAY_HOURS: 16,
    fem: function (nat, sur) { var n = NAT[nat]; return n && n.fem ? n.fem(sur) : sur; }
  };
  CX.METHODS = METHODS;
  CX.ROLES = CX.DATA.ROLES;
})();
