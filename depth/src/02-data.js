/* DEPTH engine — 02-data.js
 * Word lists: people, streets, districts, places, callsigns, covers, codewords, keyword pool,
 * grade tables. The message templates live in 05-ring.js; DX.VOCAB (the station's dictionary of
 * words the ring uses) is built there from these lists + the templates.
 */
(function () {
  'use strict';

  DX.DATA = {
    CITY: 'Haldmar',
    STATION: 'Station Kestrel',

    FIRST_M: ['Anders', 'Bruno', 'Carsten', 'Dieter', 'Egil', 'Frode', 'Gunnar', 'Henrik', 'Ivo', 'Jens', 'Karel', 'Leif',
      'Mikael', 'Niels', 'Oskar', 'Pavel', 'Rasmus', 'Sten', 'Tomas', 'Ulrik', 'Viggo', 'Waldemar', 'Arvid', 'Bent',
      'Janis', 'Konrad', 'Lasse', 'Mogens', 'Poul', 'Ragnar', 'Sigurd', 'Torben', 'Aksel', 'Edvard', 'Harald', 'Juozas'],
    FIRST_F: ['Agnete', 'Birte', 'Dagmar', 'Elin', 'Frida', 'Grete', 'Hanne', 'Inga', 'Jytte', 'Karin', 'Lene', 'Marta',
      'Nina', 'Ruta', 'Signe', 'Tove', 'Ulla', 'Vibeke', 'Wanda', 'Astrid', 'Bodil', 'Else', 'Helga', 'Irena', 'Kirsten', 'Liv'],
    SURNAMES: ['Aaberg', 'Brandt', 'Christoffersen', 'Dahl', 'Engberg', 'Falk', 'Grabowski', 'Holst', 'Iversen', 'Jankowski',
      'Kjeldsen', 'Lund', 'Mortensen', 'Nowak', 'Olsen', 'Petersen', 'Quist', 'Ravn', 'Sørensen', 'Thorsen', 'Ulvaeus',
      'Vogel', 'Winther', 'Zielinski', 'Bergmann', 'Krause', 'Lindqvist', 'Mikkelsen', 'Norberg', 'Ostrowski', 'Paulsen',
      'Rasmussen', 'Schröder', 'Tamm', 'Urbonas', 'Vilks', 'Wendt', 'Hagen', 'Juhl', 'Kask', 'Lorenzen', 'Madsen'],

    DISTRICTS: ['Gammelby', 'Nordhavn', 'Skipperholm', 'Vesterbro', 'Klosterhage', 'Ravnsborg', 'Møllebakken',
      'Tolboden', 'Østerled', 'Frihavn', 'Brohus', 'Lindevang', 'Kirkeby', 'Søndermark', 'Kalkværket', 'Sankt Jakob'],
    DISTRICT_BLURB: ['old town, narrow lanes and gabled merchant houses', 'the working harbour: cranes, sheds, seamen\'s hostels',
      'a tight island of chandlers and boatbuilders', 'tenements and tram lines', 'a quiet quarter around the old convent',
      'villas behind hedges; doctors and ship-owners', 'terraced streets climbing to the windmill', 'customs sheds and bonded warehouses',
      'post-war blocks along the ring road', 'the free port and container yard', 'workshops around the river bridges',
      'lime-tree avenues and the teachers\' college', 'the parish and its market square', 'allotments, the gasworks, the cemetery',
      'the old lime works, now half-empty sheds', 'the cathedral close and the courts'],

    STREET_A: ['Kongens', 'Dronning', 'Strand', 'Havne', 'Kloster', 'Mølle', 'Skipper', 'Told', 'Brygger', 'Smede', 'Reberbane',
      'Kirke', 'Bro', 'Slots', 'Fiske', 'Torve', 'Linde', 'Pile', 'Bager', 'Vester', 'Nørre', 'Øster', 'Sønder', 'Anker', 'Tov',
      'Sejl', 'Kobber', 'Kalk', 'Lods', 'Fyr'],
    STREET_B: ['gade', 'vej', 'stræde', 'allé', 'torv', 'kaj', 'bakke', 'gang'],

    // places: kind -> list of {name, code (as the ring would write it in a message)}
    QUAYS: 9,
    CAFES: [['Café Merkur', 'CAFE MERKUR'], ['Café Lilja', 'CAFE LILJA'], ['Konditori Holm', 'KONDITORI HOLM'], ['Café Nordstjernen', 'CAFE NORDSTJERNEN'],
      ['Sømandshjemmet canteen', 'SEAMENS CANTEEN'], ['Café Bristol', 'CAFE BRISTOL'], ['Hotel Baltic bar', 'BALTIC BAR'], ['Café Anker', 'CAFE ANKER']],
    SPOTS: [['loose brick, St Olai churchyard wall', 'OLAI WALL'], ['hollow bench leg, Tivoli park', 'TIVOLI BENCH'],
      ['under the third pier, Brohus footbridge', 'BRIDGE PIER'], ['drain grate behind the tram shelter, Linde allé', 'TRAM SHELTER'],
      ['cracked urn, Søndermark cemetery', 'CEMETERY URN'], ['boathouse slipway, Skipperholm', 'BOATHOUSE'],
      ['fire hose box, Frihavn shed 4', 'HOSE BOX'], ['water tower railings, Møllebakken', 'WATER TOWER'],
      ['bandstand steps, Kongens have', 'BANDSTAND'], ['loose paving, windmill yard', 'WINDMILL YARD']],
    SIGNALS: [['lamp post, corner of Kirkegade', 'KIRKEGADE LAMP'], ['newspaper kiosk, Torvet', 'TORVET KIOSK'],
      ['tram stop sign, Vesterbro', 'VESTERBRO STOP'], ['railings, Kloster bridge', 'KLOSTER RAILINGS'], ['post box, Strandvej', 'STRANDVEJ POSTBOX']],
    PHONES: [['phone box, Central Station forecourt', 'STATION BOX'], ['phone box, Torvet', 'TORVET BOX'], ['phone box, Nordhavn gate', 'NORDHAVN BOX'],
      ['phone box, Lindevang square', 'LINDEVANG BOX'], ['phone box, ferry terminal', 'FERRY BOX'], ['phone box, Kirkeby market', 'MARKET BOX']],
    // unique landmarks: [kind, name, code]
    LANDMARKS: [['naval_yard', 'Naval dockyard, main gate', 'YARD MAIN GATE'], ['naval_yard', 'Naval dockyard, dry dock 2', 'DRY DOCK 2'],
      ['naval_yard', 'Naval dockyard, drawing office', 'DRAWING OFFICE'], ['fuel_depot', 'Fuel depot, tank farm', 'FUEL DEPOT'],
      ['station', 'Central Station', 'CENTRAL STATION'], ['ferry', 'Ferry terminal', 'FERRY TERMINAL'], ['lighthouse', 'Holmen lighthouse', 'LIGHTHOUSE'],
      ['power', 'Harbour power station', 'POWER STATION'], ['bridge', 'Railway bridge', 'RAIL BRIDGE'], ['customs', 'Customs house', 'CUSTOMS HOUSE'],
      ['radar', 'Coastguard radar mast', 'RADAR MAST'], ['hotel', 'Hotel Baltic', 'HOTEL BALTIC'], ['church', 'St Olai church', 'ST OLAI'],
      ['market', 'Fish market', 'FISH MARKET'], ['cinema', 'Kino Palads', 'KINO PALADS'], ['post', 'Head post office', 'POST OFFICE'],
      ['tram', 'Tram depot', 'TRAM DEPOT'], ['park', 'Tivoli park', 'TIVOLI'], ['gasworks', 'Gasworks', 'GASWORKS'], ['hospital', 'Amtssygehus hospital', 'HOSPITAL']],

    CONTROLLERS: [['SÆL', 'SAEL'], ['ORM', 'ORM'], ['RAVN', 'RAVN'], ['ULV', 'ULV'], ['ØRN', 'OERN'], ['LOM', 'LOM'], ['TERN', 'TERN'], ['UGLE', 'UGLE']],
    CALL_LETTERS: 'ABDEFGHKLMNPRSTVWXZ',

    COVERS: ['crane driver at Nordhavn', 'clerk at a ship\'s chandler', 'tram conductor', 'schoolteacher (mathematics)', 'pharmacist',
      'radio and television repairman', 'taxi driver', 'night porter at the Hotel Baltic', 'auctioneer at the fish market',
      'dental technician', 'second-hand bookseller', 'customs clerk', 'welder at the naval dockyard', 'telephone engineer', 'piano tuner',
      'portrait photographer', 'purser on the Rønne ferry', 'baker', 'retired sea captain', 'draughtsman at the dockyard',
      'lorry driver for the fuel depot', 'hospital orderly', 'lock-keeper', 'shipping agent'],

    // operation codewords (the station's dictionary holds all of them — common words)
    CODEWORDS: ['LANTERN', 'HERON', 'ORCHARD', 'ANVIL', 'BELFRY', 'CANDLE', 'HARVEST', 'MARIGOLD', 'SPINDLE', 'THIMBLE',
      'WINTER', 'FALCON', 'GRANITE', 'JUNIPER', 'KETTLE', 'MEADOW', 'PELICAN', 'SAFFRON', 'TIMBER', 'VIOLET'],

    // keyword pool for checkerboards (Chief: the big computer tries every one)
    KEYWORDS: ['BALTIC', 'HARBOUR', 'SEAGULL', 'NORDLYS', 'AMBER', 'KOMPAS', 'MOLODEZ', 'VOLGA', 'PRAVDA', 'OKTOBER', 'SPUTNIK',
      'MAYAK', 'BEREZA', 'ZVEZDA', 'LENINGRAD', 'MINSK', 'RIGA', 'TALLINN', 'KLAIPEDA', 'KALININGRAD', 'SEVASTOPOL', 'ODESSA',
      'PUSHKIN', 'TOLSTOY', 'GORKY', 'CHEKHOV', 'MOSKVA', 'NEVA', 'DNEPR', 'URAL', 'TAIGA', 'SIBIR', 'KAMCHATKA', 'MURMANSK',
      'ARKHANGELSK', 'KRONSHTADT', 'SOYUZ', 'VOSTOK', 'MIR', 'DRUZHBA', 'ROSSIYA', 'LYUBOV', 'ZARYA', 'SMENA', 'IZVESTIA'],

    // broadcast stations always on the band (fictional)
    BCAST: [['Radio Nordvik', 5.985], ['Baltic Service', 7.255], ['Radio Østersø', 6.035], ['Deutsche Welle (relay)', 9.545], ['Radio Vilnius', 11.790], ['Marine weather, Rønne', 3.290]],

    SECURITY: ['Oleg Varkov', 'Ivan Sedykh', 'Pyotr Lanin', 'Arkady Bel', 'Yuri Kostov'],
    SUPER: 'Superintendent Brask',
    SB: 'Special Branch (Inspector Lyng)'
  };

  DX.MENTOR_INFO = {
    name: 'Mrs Ingrid Ansgar',
    title: 'Night supervisor',
    bio: 'Twenty-six years on the sets. Copied Morse in a Swedish attic in 1944 and still takes it down faster than anyone at Kestrel. Tea, no sugar, and no guesses without evidence.'
  };

  // ------------------------------------------------------------- grades
  // Every knob the case uses. Balanced with tests/play.js.
  DX.GRADES = [
    { id: 'cadet', label: 'Cadet', blurb: 'Five nights. The station holds the ring\'s checkerboard, the pad clerk was lazy, and Special Branch is generous.',
      shifts: 5, warrants: 6, outstations: 4, reusePairs: 5, garble: 0.55, cost: 0.6, alert: 0.5, boardHeld: true, suggest: true,
      period: [4, 5], bursts: 0, decoys: 0, patience: 120, collapseAgents: 1, dfSd: 0.75, vanSec: 150, opNights: [3, 4],
      mentorCost: { 1: 0, 2: 15, 3: 5 }, courierMsgs: 3, stopReuseAt: 99, lateReuse: 1 },
    { id: 'analyst', label: 'Analyst', blurb: 'Four nights. You hold the checkerboard; the pad clerk reused a few pages. The ring reacts to what you do.',
      shifts: 4, warrants: 4, outstations: 3, reusePairs: 3, garble: 1.0, cost: 1.0, alert: 1.0, boardHeld: true, suggest: true,
      period: [5, 6], bursts: 0.25, decoys: 1, patience: 100, collapseAgents: 2, dfSd: 1.0, vanSec: 110, opNights: [2, 3],
      mentorCost: { 1: 0, 2: 30, 3: 10 }, courierMsgs: 2, stopReuseAt: 3, lateReuse: 0 },
    { id: 'chief', label: 'Chief', blurb: 'Four nights. No checkerboard on file: recover it from courier traffic. Few warrants; a sharp security officer.',
      shifts: 4, warrants: 3, outstations: 3, reusePairs: 2, garble: 1.3, cost: 1.3, alert: 1.5, boardHeld: false, suggest: false,
      period: [6, 7], bursts: 0.5, decoys: 2, patience: 80, collapseAgents: 2, dfSd: 1.3, vanSec: 80, opNights: [2, 3],
      mentorCost: { 1: 0, 2: 45, 3: 15 }, courierMsgs: 2, stopReuseAt: 2, lateReuse: 0 }
  ];
  DX.grade = function (id) { for (var i = 0; i < DX.GRADES.length; i++) if (DX.GRADES[i].id === id) return DX.GRADES[i]; return DX.GRADES[1]; };
})();
