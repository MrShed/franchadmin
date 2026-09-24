/* INDEX CASE engine — 02-data.js
 * Static data: UK-diverse names (British names by birth cohort), place-name parts,
 * venues, symptoms and pathogen trait tables. Text templates for reports, press,
 * council, rumours and interviews live in IX.DATA.TEXT (extended in 07).
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA = {};

  // ---------------------------------------------------------------- names
  // British first names by birth cohort (so an 88-year-old is a Doreen, not an Isla)
  D.BRIT_F = {
    1935: ['Margaret', 'Joan', 'Doreen', 'Jean', 'Betty', 'Irene', 'Sheila', 'Brenda', 'Maureen', 'Pauline', 'Barbara', 'Patricia', 'Sylvia', 'Eileen', 'Dorothy', 'Audrey', 'Joyce', 'Marjorie', 'Edna', 'Vera', 'Iris', 'Beryl'],
    1955: ['Susan', 'Linda', 'Christine', 'Karen', 'Julie', 'Janet', 'Carol', 'Gillian', 'Deborah', 'Alison', 'Jacqueline', 'Wendy', 'Elaine', 'Lesley', 'Denise', 'Lorraine', 'Tracey', 'Angela', 'Hazel', 'Jill'],
    1975: ['Sarah', 'Emma', 'Claire', 'Nicola', 'Joanne', 'Rachel', 'Lisa', 'Kelly', 'Gemma', 'Helen', 'Victoria', 'Laura', 'Michelle', 'Kirsty', 'Donna', 'Natalie', 'Stacey', 'Jennifer', 'Rebecca', 'Katherine'],
    1995: ['Jessica', 'Chloe', 'Hannah', 'Sophie', 'Lauren', 'Megan', 'Amy', 'Charlotte', 'Ellie', 'Abigail', 'Bethany', 'Holly', 'Georgia', 'Katie', 'Jade', 'Shannon', 'Courtney', 'Emily', 'Lucy', 'Eleanor'],
    2013: ['Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Freya', 'Poppy', 'Evie', 'Ivy', 'Rosie', 'Willow', 'Florence', 'Maisie', 'Aria', 'Grace', 'Lily', 'Phoebe', 'Ruby', 'Elsie', 'Harper']
  };
  D.BRIT_M = {
    1935: ['John', 'Kenneth', 'Derek', 'Raymond', 'Roy', 'Brian', 'Dennis', 'Frank', 'Peter', 'Ronald', 'Harold', 'Leslie', 'Stanley', 'Norman', 'Alan', 'Geoffrey', 'Arthur', 'Albert', 'Eric', 'Cyril', 'Walter', 'Donald'],
    1955: ['David', 'Michael', 'Stephen', 'Paul', 'Mark', 'Ian', 'Andrew', 'Gary', 'Kevin', 'Nigel', 'Keith', 'Graham', 'Philip', 'Martin', 'Trevor', 'Colin', 'Robert', 'Tony', 'Terry', 'Malcolm'],
    1975: ['James', 'Daniel', 'Richard', 'Matthew', 'Christopher', 'Lee', 'Craig', 'Jonathan', 'Simon', 'Darren', 'Neil', 'Stuart', 'Jason', 'Ben', 'Wayne', 'Dean', 'Scott', 'Gareth', 'Carl', 'Jamie'],
    1995: ['Thomas', 'Jack', 'Josh', 'Ryan', 'Liam', 'Callum', 'Jordan', 'Connor', 'Luke', 'Harry', 'Kieran', 'Nathan', 'Aaron', 'Adam', 'Joe', 'Sam', 'Lewis', 'Bradley', 'Reece', 'Owen'],
    2013: ['Oliver', 'George', 'Noah', 'Leo', 'Arthur', 'Freddie', 'Theo', 'Alfie', 'Archie', 'Oscar', 'Jacob', 'Teddy', 'Reggie', 'Finley', 'Harrison', 'Max', 'Albie', 'Louie', 'Stanley', 'Tommy']
  };
  D.BRIT_S = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans',
    'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Hughes', 'Harris', 'Lewis', 'Edwards', 'Turner', 'Hill',
    'Cooper', 'Ward', 'Morris', 'Moore', 'Baker', 'Harrison', 'Morgan', 'Allen', 'Pearce', 'Holt', 'Fletcher', 'Pickering', 'Marsh',
    'Ashworth', 'Bradshaw', 'Crossley', 'Dunn', 'Hartley', 'Kemp', 'Lister', 'Nuttall', 'Pratt', 'Sutcliffe', 'Whitworth', 'Brammer',
    'Fairclough', 'Hebden', 'Oakes', 'Rudd', 'Stanworth', 'Thorley', 'Varley', 'Crabtree', 'Pemberton', 'McKenzie', 'Campbell', 'Stewart',
    'Murray', 'Reid', 'Ross', 'Fraser', 'Price', 'Jenkins', 'Pritchard', 'Llewellyn', 'Rees', 'Owen', 'Powell', 'Bevan', 'Probert',
    'Barraclough', 'Greenwood', 'Horsfall', 'Ingham', 'Moorhouse', 'Priestley', 'Shackleton', 'Tattersall', 'Holroyd', 'Entwistle',
    'Openshaw', 'Duckworth', 'Haworth', 'Birtwistle', 'Cartwright', 'Gould', 'Hodgson', 'Parkin', 'Swales', 'Wadsworth'];

  // other heritages: {f:[...], m:[...], s:[...]} or s pairs [male, female] for gendered surnames
  D.HER = {
    irish: { f: ['Siobhan', 'Niamh', 'Aoife', 'Bridget', 'Mary', 'Ciara', 'Orla', 'Roisin', 'Maeve', 'Grainne', 'Sinead', 'Eileen'], m: ['Sean', 'Patrick', 'Declan', 'Liam', 'Ciaran', 'Eamon', 'Brendan', 'Niall', 'Padraig', 'Cormac', 'Fergal', 'Michael'], s: ['Murphy', "O'Brien", 'Kelly', 'Byrne', 'Doyle', 'Gallagher', 'Quinn', 'McCarthy', 'Flanagan', 'Brennan', 'Donnelly', 'Kavanagh', "O'Neill", 'Lynch', 'Keane', 'Doherty'] },
    polish: { f: ['Agnieszka', 'Katarzyna', 'Magdalena', 'Joanna', 'Zuzanna', 'Ewa', 'Natalia', 'Oliwia', 'Aleksandra', 'Monika', 'Dorota', 'Julia'], m: ['Piotr', 'Tomasz', 'Marek', 'Krzysztof', 'Paweł', 'Jakub', 'Michał', 'Łukasz', 'Kamil', 'Grzegorz', 'Szymon', 'Adam'], s: [['Kowalski', 'Kowalska'], ['Wiśniewski', 'Wiśniewska'], ['Lewandowski', 'Lewandowska'], ['Kamiński', 'Kamińska'], ['Zieliński', 'Zielińska'], ['Dąbrowski', 'Dąbrowska'], 'Nowak', 'Wójcik', 'Mazur', 'Krawczyk', 'Kaczmarek', 'Pawlak'] },
    romanian: { f: ['Elena', 'Ioana', 'Andreea', 'Maria', 'Alexandra', 'Cristina', 'Gabriela', 'Mihaela'], m: ['Andrei', 'Ionuț', 'Mihai', 'Alexandru', 'Florin', 'Cristian', 'Adrian', 'Gheorghe'], s: ['Popescu', 'Ionescu', 'Dumitru', 'Stan', 'Stoica', 'Gheorghiu', 'Munteanu', 'Rusu', 'Matei', 'Constantin'] },
    pakistani: { f: ['Ayesha', 'Fatima', 'Zainab', 'Maryam', 'Sana', 'Nadia', 'Samina', 'Rukhsana', 'Shazia', 'Amina', 'Hafsa', 'Iqra', 'Safiya', 'Nasreen', 'Parveen', 'Aaliyah'], m: ['Mohammed', 'Imran', 'Asif', 'Tariq', 'Bilal', 'Usman', 'Zain', 'Hamza', 'Irfan', 'Khalid', 'Nasir', 'Shahid', 'Yusuf', 'Ibrahim', 'Adnan', 'Rashid'], s: ['Khan', 'Hussain', 'Ahmed', 'Ali', 'Iqbal', 'Akhtar', 'Mahmood', 'Siddiqui', 'Chaudhry', 'Butt', 'Malik', 'Aslam', 'Rafiq', 'Qureshi', 'Anwar', 'Javed'] },
    bangladeshi: { f: ['Fahmida', 'Rahima', 'Shirin', 'Nazma', 'Tahmina', 'Sumaiya', 'Jannat', 'Rukshana', 'Halima', 'Momena'], m: ['Abdul', 'Shahid', 'Rofiq', 'Anwar', 'Jamal', 'Sayed', 'Rahim', 'Kamal', 'Faruk', 'Mizanur'], s: ['Rahman', 'Uddin', 'Miah', 'Islam', 'Hoque', 'Chowdhury', 'Begum', 'Ahmed', 'Hussain', 'Karim'] },
    indian: { f: ['Priya', 'Anjali', 'Kavita', 'Sunita', 'Meera', 'Pooja', 'Nisha', 'Asha', 'Divya', 'Leela', 'Hema', 'Rekha', 'Shreya', 'Ananya'], m: ['Rajesh', 'Sanjay', 'Vikram', 'Anil', 'Arjun', 'Rohan', 'Deepak', 'Nikhil', 'Suresh', 'Kiran', 'Hitesh', 'Mahesh', 'Aarav', 'Dev'], s: ['Patel', 'Shah', 'Mistry', 'Sharma', 'Joshi', 'Desai', 'Mehta', 'Chauhan', 'Parmar', 'Lad', 'Solanki', 'Pandya', 'Trivedi', 'Kotecha'] },
    sikh: { f: ['Harpreet', 'Gurpreet', 'Manpreet', 'Jaspreet', 'Simran', 'Navdeep', 'Amrit', 'Parminder', 'Rajvir', 'Kiranjit'], m: ['Harjit', 'Gurdeep', 'Jaswinder', 'Sukhdev', 'Rajinder', 'Amarjit', 'Balvinder', 'Kulwant', 'Harvinder', 'Jaspal'], s: ['Sandhu', 'Gill', 'Dhillon', 'Sidhu', 'Bains', 'Johal', 'Sangha', 'Grewal', 'Atwal', 'Bassi'], mid: ['Singh', 'Kaur'] },
    caribbean: { f: ['Marcia', 'Beverley', 'Sharon', 'Donna', 'Jasmine', 'Tanisha', 'Keisha', 'Shanice', 'Althea', 'Yvonne', 'Paulette', 'Hyacinth', 'Maxine', 'Janelle'], m: ['Winston', 'Delroy', 'Leroy', 'Marcus', 'Tyrone', 'Jermaine', 'Carlton', 'Devon', 'Clive', 'Errol', 'Lloyd', 'Everton', 'Andre', 'Kyle'], s: ['Campbell', 'Brown', 'Williams', 'Thompson', 'Francis', 'Grant', 'Morrison', 'Bailey', 'Clarke', 'Richards', 'Samuels', 'Forbes', 'Henry', 'Gordon', 'Walters', 'Barrett'] },
    african: { f: ['Chiamaka', 'Ngozi', 'Adaeze', 'Funmilayo', 'Abena', 'Akosua', 'Blessing', 'Temitope', 'Ifeoma', 'Yewande', 'Esi', 'Nkechi', 'Folake', 'Grace'], m: ['Chukwuemeka', 'Oluwaseun', 'Kwame', 'Kofi', 'Tunde', 'Emeka', 'Babajide', 'Obinna', 'Femi', 'Kwabena', 'Yaw', 'Segun', 'Chidi', 'Samuel'], s: ['Okafor', 'Adeyemi', 'Mensah', 'Owusu', 'Oyelaran', 'Nwosu', 'Boateng', 'Adebayo', 'Okonkwo', 'Asante', 'Eze', 'Ogunleye', 'Appiah', 'Oduya', 'Ansah', 'Bello'] },
    somali: { f: ['Hodan', 'Amina', 'Faduma', 'Sahra', 'Ifrah', 'Nimco', 'Hibo', 'Deeqa', 'Ayaan', 'Sagal'], m: ['Abdi', 'Mohamed', 'Ahmed', 'Abdirahman', 'Hassan', 'Omar', 'Yusuf', 'Mahad', 'Liban', 'Guled'], s: ['Farah', 'Warsame', 'Abdi', 'Hassan', 'Jama', 'Osman', 'Aden', 'Ali', 'Mohamud', 'Nur', 'Egal', 'Dualeh'] },
    chinese: { f: ['Mei', 'Jing', 'Xiu Ying', 'Li Na', 'Hui', 'Grace', 'Annie', 'Wing', 'Ling', 'Yan'], m: ['Wei', 'Jun', 'Ming', 'Hao', 'Chen', 'David', 'Kenneth', 'Kwok', 'Tony', 'Ho'], s: ['Chan', 'Wong', 'Li', 'Zhang', 'Liu', 'Cheung', 'Lam', 'Ng', 'Yip', 'Tang', 'Leung', 'Ho'] },
    southern: { f: ['Ana', 'Maria', 'Sofia', 'Giulia', 'Beatriz', 'Inês', 'Francesca', 'Carla', 'Lucia', 'Rita'], m: ['João', 'Luca', 'Marco', 'Diogo', 'Rui', 'Paolo', 'Tiago', 'Giorgio', 'Nuno', 'Stefano'], s: ['Silva', 'Santos', 'Ferreira', 'Rossi', 'Costa', 'Pereira', 'Esposito', 'Moretti', 'Oliveira', 'Romano', 'Gomes', 'Ricci'] }
  };
  // faith by heritage: [faith, share who attend a place of worship weekly]
  D.FAITH = {
    british: ['church', 0.07], irish: ['church', 0.25], polish: ['church', 0.4], romanian: ['church', 0.3], pakistani: ['mosque', 0.45],
    bangladeshi: ['mosque', 0.45], indian: ['temple', 0.3], sikh: ['gurdwara', 0.4], caribbean: ['church', 0.35], african: ['church', 0.55],
    somali: ['mosque', 0.5], chinese: ['church', 0.06], southern: ['church', 0.2]
  };
  D.HERITAGES = ['british', 'irish', 'polish', 'romanian', 'pakistani', 'bangladeshi', 'indian', 'sikh', 'caribbean', 'african', 'somali', 'chinese', 'southern'];

  // ---------------------------------------------------------------- places
  D.CITY_A = ['Wex', 'Brind', 'Hal', 'Thorn', 'Marl', 'Ash', 'Kirk', 'Salt', 'Ridd', 'Coll', 'Fen', 'Gorse', 'Orm', 'Whit', 'Bram', 'Dray', 'Stan', 'Cald', 'Hax', 'Lynd'];
  D.CITY_B = ['moor', 'ley', 'ford', 'bridge', 'wick', 'field', 'thorpe', 'stead', 'hurst', 'borough', 'combe', 'dale', 'minster', 'bury'];
  D.DIST_A = ['Ash', 'Bram', 'Brind', 'Coll', 'Dray', 'Fen', 'Gorse', 'Hal', 'Kirk', 'Lang', 'Marl', 'Nether', 'Orm', 'Pen', 'Quarr', 'Ridd', 'Salt', 'Thorn', 'Whit', 'Yard', 'Holl', 'Mickle', 'Sow', 'Tan', 'Cop', 'Bur', 'Elm', 'Hare', 'Stock', 'Wood'];
  D.DIST_B = ['ley', 'ton', 'field', 'gate', 'holme', 'bridge', 'wick', 'combe', 'thorpe', 'stead', 'by', 'hurst', 'dale', 'well', 'brook', 'croft', 'end', 'side', 'green', 'royd'];
  D.DIST_FIXED = { centre: ['Old Town', 'Town Centre', 'Market Quarter'], student: ['University Quarter', 'College Park'], canal: ['Canal Basin', 'Canal Side', 'Wharfside'] };
  D.STREETS = ['Road', 'Street', 'Lane', 'Terrace', 'Avenue', 'Close', 'Grove', 'Way', 'Row', 'Crescent', 'Drive', 'Walk'];
  D.STREET_A = ['Station', 'Victoria', 'Albert', 'Mill', 'Chapel', 'Tannery', 'Coronation', 'Jubilee', 'Beech', 'Church', 'Park', 'Canal', 'Queen', 'King',
    'Wellington', 'Nelson', 'Gladstone', 'Balfour', 'Peel', 'Spring', 'Well', 'Brook', 'Moor', 'Hollin', 'Rowan', 'Laburnum', 'Sycamore', 'Holly', 'Ivy',
    'Foundry', 'Weaver', 'Cotton', 'Dyer', 'Bobbin', 'Railway', 'Tram', 'Market', 'Castle', 'Abbey', 'Priory', 'Bank', 'Cross', 'Garden', 'Orchard', 'Meadow'];

  D.VENUES = {
    pub: ['The Red Lion', 'The Crown', 'The Wheatsheaf', 'The Fox & Hounds', 'The Railway', "The Nag's Head", 'The Plough', 'The Royal Oak', 'The Bell',
      'The Black Swan', 'The Three Tuns', 'The Coach & Horses', 'The Lamb', "The Mason's Arms", 'The Feathers', "The King's Head", 'The Grapes', 'The Anchor', 'The Drovers', 'The Navigation', 'The Weavers'],
    restaurant: ['Spice Garden', 'The Golden Dragon', "Luigi's", 'Taj Mahal', 'Casa Nostra', 'The Olive Tree', "Mama Ngozi's Kitchen", 'Pho 88', 'Istanbul Grill',
      'Harbour Fish Bar', 'The Copper Kettle (café)', 'Lahore Karahi', 'Ming Garden', 'Bella Napoli', 'The Greasy Spoon'],
    gym: ['IronWorks Gym', 'Pulse Fitness', 'Canal Side Boxing Club', 'Leisure Centre', 'Studio Nine (spin & yoga)'],
    church: ["St Michael's Church", "St Mary's Church", 'Holy Trinity', "St Barnabas' Church", 'Christ Church', 'Our Lady of Lourdes (RC)', 'New Testament Church of God',
      'House of Praise (RCCG)', 'Central Methodist Hall', 'St Casimir Polish Mission', 'Elim Pentecostal', 'Baptist Chapel'],
    mosque: ['Jamia Masjid Ghausia', 'Central Mosque', 'Masjid Al-Noor', 'Abu Bakr Mosque', 'Masjid Tawhid (Somali community)'],
    temple: ['Shree Krishna Mandir'],
    gurdwara: ['Guru Nanak Gurdwara'],
    choir: ['{city} Choral Society', 'Canal Side Community Choir', 'Voices of Praise Gospel Choir', 'The Thursday Singers'],
    stadium: ['{city} Town FC, Mill Road ground'],
    market: ['{city} Market Hall'],
    livestock: ['{city} Livestock & Poultry Market'],
    farm: ['Hollins Farm (poultry)', 'Greaves Farm (pigs)', 'Low Moor Farm (poultry)'],
    meat_plant: ['Northgate Meats Ltd'],
    lab: ['University Infection Sciences Unit', 'Brindley Biologics Ltd'],
    care_home: ['Elm Lodge Care Home', 'Beechwood House', 'The Laurels', 'Rosedene Nursing Home', 'Hillcrest Court', 'Meadowbank Care Centre'],
    school_p: ['St Barnabas C of E Primary', 'Oakfield Primary', 'Mill Lane Primary', 'Victoria Road Primary', 'Holy Family RC Primary', 'Brookside Primary', 'Spring Grove Primary'],
    school_s: ['{city} High School', 'Bishop Hartley RC High', 'Harrowfield Academy', 'Canal Side Academy'],
    nursery: ['Little Acorns Nursery', 'Tiny Steps Nursery', 'Rainbow Day Nursery', 'Humpty Dumpty Pre-school', 'Sunflowers Nursery', 'Tadpoles Day Care', 'Honeypot Nursery', 'Bright Horizons Nursery'],
    university: ['University of {city}'],
    office: ['{city} Civic Centre (council offices)', 'Brindley Insurance', 'Calloway Direct (call centre)', 'Harlow & Finch Solicitors', 'Pennine Water (regional office)',
      'Kestrel Software', 'Northern Building Society HQ', 'Jobcentre and benefits office', 'Tax office, Crown House', 'Ashworth & Lister Accountants', 'Magistrates Court', 'Police station'],
    factory: ['Morland Foods (factory)', 'Aspinall Engineering', 'Northgate Distribution Centre', 'Crossley Carpets', 'Wexcel Plastics', 'Kestrel Logistics (depot)'],
    supermarket: ["Hallam's Supermarket", 'ValueMart', 'Castle Foods', 'FreshWay', 'Budget Stores', 'Corner Pantry'],
    shop: ['Market Street shops'],
    hotel: ['The Grand Hotel', '{city} Park Hotel'],
    community_hall: ['Canal Side Community Centre', "Miners' Welfare Hall", 'Scout Hut & Community Rooms', 'Polish Club'],
    station: ['{city} Central Station & Bus Station'],
    gp: ['{dist} Medical Practice', '{dist} Health Centre', '{dist} Family Practice'],
    hospital: ["St Anne's Hospital"]
  };

  // ---------------------------------------------------------------- symptoms
  // id, label, share of ordinary flu-like illness with it (background noise), tell?
  D.SYMPTOMS = [
    { id: 'fever', label: 'fever', flu: 0.8 },
    { id: 'cough', label: 'cough', flu: 0.8 },
    { id: 'sore_throat', label: 'sore throat', flu: 0.55 },
    { id: 'runny_nose', label: 'runny nose', flu: 0.5 },
    { id: 'headache', label: 'headache', flu: 0.6 },
    { id: 'aches', label: 'muscle aches', flu: 0.65 },
    { id: 'fatigue', label: 'exhaustion', flu: 0.75 },
    { id: 'breathless', label: 'shortness of breath', flu: 0.15 },
    { id: 'chest_pain', label: 'chest pain', flu: 0.08 },
    { id: 'chills', label: 'chills', flu: 0.45 },
    { id: 'diarrhoea', label: 'diarrhoea', flu: 0.08 },
    { id: 'vomiting', label: 'vomiting', flu: 0.08 },
    { id: 'abdo_pain', label: 'stomach cramps', flu: 0.06 },
    { id: 'nausea', label: 'nausea', flu: 0.12 },
    { id: 'joint_pain', label: 'joint pain', flu: 0.15 },
    { id: 'confusion', label: 'confusion', flu: 0.03 },
    { id: 'swollen_glands', label: 'swollen neck glands', flu: 0.05 },
    { id: 'anosmia', label: 'loss of taste and smell', flu: 0.01, tell: true },
    { id: 'rash', label: 'a rash on the trunk', flu: 0.01, tell: true },
    { id: 'red_eyes', label: 'red, sore eyes', flu: 0.03, tell: true },
    { id: 'bleeding_gums', label: 'bleeding gums', flu: 0.002, tell: true },
    { id: 'jaundice', label: 'yellowing of the eyes', flu: 0.002, tell: true },
    { id: 'hiccups', label: 'persistent hiccups', flu: 0.005, tell: true },
    { id: 'nosebleeds', label: 'nosebleeds', flu: 0.01, tell: true }
  ];
  D.SYM = {};
  D.SYMPTOMS.forEach(function (s, i) { s.i = i; D.SYM[s.id] = s; });

  // symptom profiles by route family: [id, [freqLo, freqHi]]
  D.SYM_PROFILE = {
    resp: [['fever', [0.6, 0.9]], ['cough', [0.5, 0.85]], ['fatigue', [0.5, 0.8]], ['headache', [0.3, 0.6]], ['aches', [0.3, 0.6]], ['sore_throat', [0.2, 0.5]],
      ['breathless', [0.2, 0.45]], ['chills', [0.2, 0.4]], ['runny_nose', [0.1, 0.3]], ['chest_pain', [0.1, 0.25]], ['diarrhoea', [0.05, 0.2]], ['confusion', [0.03, 0.12]]],
    gut: [['diarrhoea', [0.75, 0.95]], ['abdo_pain', [0.5, 0.8]], ['nausea', [0.4, 0.7]], ['vomiting', [0.3, 0.7]], ['fever', [0.3, 0.6]], ['fatigue', [0.3, 0.6]], ['headache', [0.1, 0.35]], ['aches', [0.1, 0.3]]],
    contact: [['fever', [0.8, 0.95]], ['fatigue', [0.7, 0.9]], ['aches', [0.5, 0.8]], ['headache', [0.4, 0.7]], ['vomiting', [0.3, 0.6]], ['diarrhoea', [0.3, 0.6]],
      ['joint_pain', [0.2, 0.5]], ['abdo_pain', [0.2, 0.4]], ['sore_throat', [0.1, 0.3]], ['confusion', [0.05, 0.2]]]
  };
  D.TELLS = {
    resp: [['anosmia', 3], ['rash', 1], ['red_eyes', 2], ['hiccups', 0.5], ['swollen_glands', 1], ['nosebleeds', 0.5]],
    gut: [['jaundice', 2], ['rash', 1], ['red_eyes', 0.5], ['confusion', 1]],
    contact: [['bleeding_gums', 3], ['rash', 2], ['red_eyes', 2], ['nosebleeds', 2], ['jaundice', 1]]
  };

  // ---------------------------------------------------------------- age bands used everywhere
  D.AGE_BANDS = ['0-4', '5-17', '18-34', '35-49', '50-64', '65-79', '80+'];
  D.AGE_LO = [0, 5, 18, 35, 50, 65, 80];
  D.ageBand = function (age) { return age < 5 ? 0 : age < 18 ? 1 : age < 35 ? 2 : age < 50 ? 3 : age < 65 ? 4 : age < 80 ? 5 : 6; };
  // trust groups (adults; children follow their parents at 35-64)
  D.TRUST_BANDS = ['18-34', '35-64', '65+'];
  D.trustBand = function (age) { return age < 18 ? 1 : age < 35 ? 0 : age < 65 ? 1 : 2; };

  // relative infection-fatality by age band for each age-risk shape (normalised later)
  D.AGE_RISK = {
    elderly: [0.02, 0.01, 0.06, 0.2, 0.7, 3.2, 11],
    'young-adult': [1.4, 0.35, 2.6, 1.8, 0.9, 1.0, 1.6],
    children: [5, 2.2, 0.35, 0.4, 0.7, 1.5, 3],
    even: [0.7, 0.6, 0.8, 0.9, 1.0, 1.3, 1.8]
  };
  // share of hospitalised patients who die, by age band (baseline; scaled by severity)
  D.FH_BASE = [0.03, 0.03, 0.05, 0.08, 0.14, 0.26, 0.42];

  D.ROUTES = ['airborne', 'droplet', 'contact', 'gut', 'animal'];
  D.ROUTE_LABEL = { airborne: 'airborne (shared indoor air)', droplet: 'droplets (close contact)', contact: 'direct contact (body fluids)', gut: 'faecal-oral (food, hands)', animal: 'animal source (continuing spillover)' };
  D.AGE_SHAPES = ['elderly', 'young-adult', 'children', 'even'];
  D.SOURCES = ['market', 'farm', 'lab', 'traveller', 'hospital'];
  D.TREATMENTS = ['none', 'partial', 'good'];

  D.PLACE_KINDS = ['hospital', 'gp', 'care_home', 'school', 'nursery', 'university', 'office', 'factory', 'shop', 'supermarket', 'pub', 'restaurant', 'gym', 'church',
    'mosque', 'temple', 'gurdwara', 'choir', 'stadium', 'market', 'meat_plant', 'farm', 'lab', 'station', 'hotel', 'community_hall'];

  D.TEXT = {};
})();

/* ---------------------------------------------------------------------------------------
 * Text templates. {var} placeholders. IX.pickText(g, key, salt, vars) picks one
 * deterministically (by salt) and fills it. Tone: procedural, humane, British, dry.
 * --------------------------------------------------------------------------------------- */
(function () {
  'use strict';
  var T = IX.DATA.TEXT;
  T.refuse = [
    'I\'ve told the hospital everything already. I\'m not going through it again with a stranger on the phone.',
    'Who did you say you were? No. My son says not to give details to anyone who rings.',
    'I don\'t want to get anyone into trouble. I\'ll not be naming names.',
    'Not now, love. I can barely lift my head.',
    'I\'m not being funny, but last time someone from the council rang it was about the bins and I ended up with a fine.'
  ];
  T.onset = [
    'It started on {date}. {sym}. I thought it was just the usual winter thing.',
    'I first felt rough on {date}: {sym}. By the next day I couldn\'t get out of bed.',
    '{date}, I think. Maybe the day before. {sym}. My wife says I was grumpy before that, but that\'s not a symptom.',
    'It came on {date}. {sym}. I kept going to work for a day because I thought it was a cold.',
    'Round about {date}. {sym}. I\'d have said flu, if you\'d asked me then.'
  ];
  T.event = [
    'We were at a {what} on {date}, at {where}. Lovely do. Everybody hugging everybody.',
    'There was a {what} on {date} at {where}. Packed. I was only there a couple of hours.',
    'I went to a {what}, {date}, {where}. You don\'t say no to a {what}, do you.'
  ];
  T.travel = [
    'I flew back in on {date}, after two weeks away. I felt fine on the plane. Honestly.',
    'I got back from abroad on {date}. Work trip. Conference, hotel, the usual.',
    'Back on {date} from visiting family overseas. Half the village had a cold, but they always do.'
  ];
  T.animal = [
    'I\'m in and out of {place} most days. Animals don\'t bother me, it\'s the paperwork I can\'t stand.',
    'I work at {place}. We had a few birds go off their feed a while back, but that happens.',
    'I go to {place} every week. Have done for thirty years.'
  ];
  T.illcontact = [
    '{who} was poorly before me, from about {date}. That\'s my {rel}.',
    'Now you mention it, {who} had it first. From {date}, I think.',
    '{who} was off sick from {date}. We\'re in and out of each other\'s pockets.'
  ];
  T.carer = [
    'We\'ve had people poorly on the unit for a while. We thought it was the usual winter thing. We gloved and aproned, but you can\'t do personal care at arm\'s length.',
    'I did three double shifts that week because we were short. Everyone\'s short.',
    'Half the residents had a cough. We just got on with it.'
  ];
  T.aside = [
    'Will this be on my record? I\'ve got a job interview next month.',
    'Is it true it\'s in the water? My neighbour said.',
    'I\'m sorry, I\'m not much help, am I. I can\'t remember what I had for lunch yesterday, never mind a fortnight ago.',
    'You sound tired. Are you all right?',
    'My daughter says I should have got the flu jab. I did get the flu jab.'
  ];
  T.drug = ['favipiravir', 'nitazoxanide', 'baricitinib', 'high-dose dexamethasone', 'camostat', 'interferon beta', 'molnupiravir'];
  T.site_choir = ['{place}: forty-odd singers in a church hall, rows of chairs a foot apart, windows painted shut decades ago. Rehearsal runs two and a half hours with a tea break round one urn.'];
  T.site_pub = ['{place}: low ceilings, one front room and a back room with a dartboard. On a Friday it is standing room only. The landlord props the door open "when it gets fuggy".'];
  T.site_restaurant = ['{place}: thirty covers, an open kitchen, one toilet shared by staff and customers.'];
  T.site_school = ['{place}: classrooms of 28-30 pupils, windows that open a crack, a shared dining hall and one very busy set of toilets.'];
  T.site_nursery = ['{place}: three rooms of toddlers who share everything, especially what they should not. Nappy changing next to the snack table; staff move between rooms at lunchtime.'];
  T.site_care = ['{place}: residents share a lounge and dining room; carers move between rooms all shift. Agency staff cover gaps and also work at other homes.'];
  T.site_hospital = ['{place}: bays of six beds on the medical wards, side rooms full, staff moving between wards to cover shortages. Hand gel at every door; used at most of them.'];
  T.site_faith = ['{place}: the main hall holds a few hundred; worshippers stand or sit close. Refreshments afterwards in a side room.'];
  T.site_gym = ['{place}: spin studio in a basement with one extractor fan; the weights floor is better ventilated.'];
  T.site_meat = ['{place}: the cutting hall is kept at four degrees; workers stand shoulder to shoulder on the line and shout over the machinery. Many share cars and houses.'];
  T.site_work = ['{place}: open-plan floors, hot-desking, a kitchen everyone uses at eleven and at one.'];
  T.site_market = ['{place}: stalls close together under one roof; the doors at each end stay open.'];
  T.site_farm = ['{place}: sheds, a yard, a farmhouse kitchen where everyone has their tea.'];
  T.site_hall = ['{place}: function room for 120, a bar, a buffet table, a dance floor, a car park that doubles as the smoking area.'];
  T.site_stadium = ['{place}: open terraces; the concourse and the bars under the stand are where people crowd at half-time.'];
  T.site_shop = ['{place}: busy aisles, short contacts.'];
  T.site_lab = ['{place}: containment suites with logged entry; staff describe a recent spill that was "dealt with".'];
  T.site_uni = ['{place}: lecture theatres, labs, halls of residence and a students\' union that never quite closes.'];
  T.site_gp = ['{place}: a small waiting room with twenty chairs and a queue out of the door at 8am.'];
  T.site_generic = ['{place}: nothing remarkable on inspection.'];
  T.press_names = ['{city} Echo', '{city} Evening Post', '{city} Gazette'];

  IX.pickText = function (g, key, salt, vars) {
    var L = T[key];
    if (!L || !L.length) return '';
    var s = L[IX.h3(g.keys.text, IX.hash(key), salt | 0, g.S ? g.S.day : 0) % L.length];
    vars = vars || {};
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
  };
})();
