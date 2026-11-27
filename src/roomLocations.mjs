// Laundry room locations for every LaundryLink tracker, keyed by the existing room ID.
// Room numbers are strings so leading zeroes are kept. Washer and dryer counts are the
// provider-reported inventory in alerts/room-washers.json and alerts/room-dryers.json;
// tests reconcile them. They are not live availability.

export const roomLocations = {
  // Redstone Campus · CWPSCR
  christie: { building: 'Christie Hall', floor: 'Basement', rooms: ['013'], washers: 4, dryers: 4, shared: 'cwpscr' },
  cwp: { building: 'Wright Hall', floor: 'First floor', rooms: ['110'], washers: 6, dryers: 8, note: 'In the first-floor lobby.', shared: 'cwpscr' },
  patterson: { building: 'Patterson Hall', floor: 'First floor', rooms: ['118'], washers: 3, dryers: 3, shared: 'cwpscr' },
  slade: { building: 'Slade Hall', floor: 'Basement', rooms: ['004'], washers: 1, dryers: 1, shared: 'cwpscr' },
  coolidge: { building: 'Coolidge Hall', floor: 'Basement', rooms: ['004'], washers: 4, dryers: 4, shared: 'cwpscr' },
  redstone: { building: 'Redstone Hall', floor: 'Basement', rooms: ['103'], washers: 2, dryers: 2, shared: 'cwpscr' },
  // Redstone Campus · MSH
  mason: { building: 'Mason Hall', floor: 'Second floor', rooms: ['210'], washers: 4, dryers: 4 },
  simpson: { building: 'Simpson Hall', floor: 'Ground floor', rooms: ['201G'], washers: 3, dryers: 4, note: 'Near the back entrance, at the base of the back stairwell.' },
  hamilton: { building: 'Hamilton Hall', floor: 'First floor', rooms: ['111'], washers: 4, dryers: 4 },
  // Redstone Campus · WDW
  wing: { building: 'Wing Hall', floor: 'First floor', rooms: ['105A'], washers: 4, dryers: 4 },
  davis: { building: 'Davis Hall', floor: 'First floor', rooms: ['109'], washers: 4, dryers: 4 },
  wilks: { building: 'Wilks Hall', floor: 'First floor', rooms: ['105A'], washers: 4, dryers: 4 },
  // Athletic Campus · Harris-Millis
  harris: { building: 'Harris Hall', floor: 'Basement', rooms: ['030', '031'], washers: 6, dryers: 8 },
  millis: { building: 'Millis Hall', floor: 'Basement', rooms: ['014', '015'], washers: 6, dryers: 8 },
  // Athletic Campus · Living-Learning Complex
  lll_140: { building: 'Living-Learning A', floor: 'First floor', rooms: ['140'], washers: 2, dryers: 2, shared: 'livingLearning' },
  lll_180: { building: 'Living-Learning A', floor: 'First floor', rooms: ['180'], washers: 2, dryers: 2, shared: 'livingLearning' },
  lll_b110: { building: 'Living-Learning B', floor: 'First floor', rooms: ['110'], washers: 3, dryers: 4, shared: 'livingLearning' },
  lll_c131: { building: 'Living-Learning C', floor: 'First floor', rooms: ['131'], washers: 4, dryers: 4, shared: 'livingLearning' },
  lll_d110: { building: 'Living-Learning D', floor: 'First floor', rooms: ['110'], washers: 2, dryers: 2, shared: 'livingLearning' },
  lll_d140: { building: 'Living-Learning D', floor: 'First floor', rooms: ['140'], washers: 2, dryers: 2, shared: 'livingLearning' },
  lll_e110: { building: 'Living-Learning E', floor: 'First floor', rooms: ['110'], washers: 2, dryers: 2, shared: 'livingLearning' },
  lll_e160: { building: 'Living-Learning E', floor: 'First floor', rooms: ['160'], washers: 2, dryers: 2, shared: 'livingLearning' },
  // Athletic Campus · MAT
  austin: { building: 'Austin Hall', floor: 'Basement', rooms: ['012'], washers: 5, dryers: 5, shared: 'marshAustin' },
  tupper: { building: 'Tupper Hall', floor: 'Basement', rooms: ['006'], washers: 4, dryers: 4 },
  // Athletic Campus · University Heights
  uheightsn1: { building: 'University Heights North', designation: 'Tower 1', floor: 'Ground floor', rooms: ['010'], washers: 6, dryers: 6, shared: 'uhn' },
  uheightsn2: { building: 'University Heights North', designation: 'Towers 2+3', floor: 'Ground floor', rooms: ['041'], washers: 7, dryers: 8, shared: 'uhn' },
  uheightss1: { building: 'University Heights South', designation: 'Tower 1', floor: 'Ground floor', rooms: ['005'], washers: 6, dryers: 6, shared: 'uhs' },
  uheightss2: { building: 'University Heights South', designation: 'Towers 2+3', floor: 'Ground floor', rooms: ['030'], washers: 7, dryers: 8, shared: 'uhs' },
  // Central Campus · CCRH
  central_campus_2: { building: 'Central Campus Residence Hall', designation: 'Floor 2', floor: 'Floor 2', rooms: ['201'], washers: 5, dryers: 6, shared: 'ccrh' },
  central_campus_3: { building: 'Central Campus Residence Hall', designation: 'Floor 3', floor: 'Floor 3', rooms: ['301'], washers: 4, dryers: 4, shared: 'ccrh' },
  central_campus_4: { building: 'Central Campus Residence Hall', designation: 'Floor 4', floor: 'Floor 4', rooms: ['401'], washers: 5, dryers: 6, shared: 'ccrh' },
  central_campus_5: { building: 'Central Campus Residence Hall', designation: 'Floor 5', floor: 'Floor 5', rooms: ['501'], washers: 5, dryers: 6, shared: 'ccrh' },
  central_campus_6: { building: 'Central Campus Residence Hall', designation: 'Floor 6', floor: 'Floor 6', rooms: ['601'], washers: 5, dryers: 6, shared: 'ccrh' },
  central_campus_7: { building: 'Central Campus Residence Hall', designation: 'Floor 7', floor: 'Floor 7', rooms: ['701'], washers: 3, dryers: 4, shared: 'ccrh' },
  // Central Campus · Other Buildings
  converse: { building: 'Converse Hall', floor: 'Basement', rooms: ['110'], washers: 5, dryers: 6 },
  // Trinity and North Campuses · The Back Five (each hall has its own laundry room)
  hunt: { building: 'Hunt Hall', floor: 'First floor', rooms: ['106'], washers: 2, dryers: 2, shared: 'backFive' },
  mccann: { building: 'McCann Hall', floor: 'First floor', rooms: ['106'], washers: 2, dryers: 2, shared: 'backFive' },
  ready: { building: 'Ready Hall', floor: 'First floor', rooms: ['106'], washers: 2, dryers: 2, shared: 'backFive' },
  richardson: { building: 'Richardson Hall', floor: 'First floor', rooms: ['106'], washers: 2, dryers: 2, shared: 'backFive' },
  sichel: { building: 'Sichel Hall', floor: 'First floor', rooms: ['106'], washers: 2, dryers: 2, shared: 'backFive' },
  // Trinity and North Campuses · Other Buildings
  jeanne_mance: { building: 'Jeanne Mance Hall', floor: 'First floor', rooms: ['108A'], washers: 4, dryers: 4 },
  mcauley: { building: 'McAuley Hall', floor: 'Ground floor', rooms: ['017'], washers: 6, dryers: 6 },
  mercy: { building: 'Mercy Hall', floor: 'First floor', rooms: ['009D'], washers: 6, dryers: 6 },
  cottage256: { building: 'The Cottages', designation: 'Cottage 256', floor: 'First floor', rooms: ['106'], washers: 2, dryers: 2, note: 'Enter through the separate entrance at the back of Cottage 256.', shared: 'cottages' },
};

// Shared-facility and resident access notes. These describe how the rooms are
// generally used; UVM Housing and Dining Services sets the actual access rules.
export const sharedFacilities = {
  cwpscr: 'The Wright Hall laundry room serves authorized residents of the CWPSCR complex: Christie, Wright, Patterson, Slade, Coolidge, and Redstone Halls.',
  livingLearning: 'All eight Living-Learning laundry rooms are on first floors. During the day, residents of Buildings A–E can generally use any of them. At night, access may be limited to the laundry rooms in your own building.',
  marshAustin: 'Marsh and Austin share one laundry room in the basement of Austin Hall.',
  uhn: 'Both University Heights North laundry rooms are available to residents of the University Heights North complex.',
  uhs: 'Both University Heights South laundry rooms are available to residents of the University Heights South complex.',
  ccrh: 'Each floor has its own laundry room for residents of that floor. Floor 7 residents can also use the Floor 6 laundry room; Floor 6 residents cannot use Floor 7’s.',
  backFive: 'Each Back Five hall has its own laundry room: Hunt, McCann, Ready, Richardson, and Sichel Halls.',
  cottages: 'One laundry room serves all four Cottages: 252, 254, 256, and 258 Colchester Avenue.',
};

export const accessStatement = 'Residence hall laundry rooms are for authorized residents. Access is subject to UVM Housing and Dining Services policies.';
export const accessQualifier = 'Shared-room notes describe typical resident access and are not official UVM policy.';

// Expanded names for the existing abbreviated complex titles.
export const complexFullNames = {
  CWPSCR: 'Christie, Wright, Patterson, Slade, Coolidge, and Redstone',
  MSH: 'Mason, Simpson, and Hamilton',
  WDW: 'Wing, Davis, and Wilks',
  MAT: 'Marsh, Austin, and Tupper',
};

// UVM housing without a LaundryLink tracker. Names follow UVM Housing and Dining Services.
export const unsupportedHousing = {
  residenceHalls: [{ name: 'Hillel', laundryRoom: '202B' }],
  affiliate: ['Redstone Lofts', 'Redstone Commons', 'Catamount Run Apartments', 'University Commons at Catamount Run'],
  offCampus: ['Spinner Place'],
};

// One sentence shared by the Information page and the campus directory.
export const coverageNote = 'LaundryLink tracks 44 laundry rooms across 30 UVM residence hall guides. '
  + 'Hillel, the Exploring Jewish Culture residence, has a laundry room (Room 202B) without a LaundryLink tracker. '
  + `UVM affiliate apartments (${unsupportedHousing.affiliate.join(', ').replace(/, ([^,]+)$/, ', and $1')}) `
  + `and off-campus apartments such as ${unsupportedHousing.offCampus.join(', ')} are not covered.`;

const roomNumbers = (rooms) => rooms.length === 1 ? `Room ${rooms[0]}`
  : `Rooms ${rooms.slice(0, -1).join(', ')} and ${rooms[rooms.length - 1]}`;

export function roomLocation(room) {
  return roomLocations[room?.id];
}

// "Basement · Rooms 030 and 031", "Austin Hall basement · Room 012"
export function locationLine(room) {
  const location = roomLocation(room);
  if (!location) return '';
  const displayName = room.displayName ?? room.name;
  const floor = location.building !== displayName && !location.designation
    ? `${location.building} ${location.floor.toLowerCase()}` : location.floor;
  return `${floor} · ${roomNumbers(location.rooms)}`;
}

// "in Room 013 in the basement", "in Room 012 in the basement of Austin Hall"
export function locationPhrase(room) {
  const location = roomLocation(room);
  const displayName = room.displayName ?? room.name;
  const floor = location.floor === 'Basement' ? 'in the basement'
    : location.floor.startsWith('Floor') ? `on ${location.floor}` : `on the ${location.floor.toLowerCase()}`;
  const building = location.designation && !location.designation.startsWith('Floor') ? location.designation
    : !location.designation && location.building !== displayName ? location.building : '';
  return `in ${roomNumbers(location.rooms)} ${floor}${building ? ` of ${building}` : ''}`;
}

export function machineInventory(room) {
  const { washers, dryers } = roomLocation(room);
  return `${washers} ${washers === 1 ? 'washer' : 'washers'} and ${dryers} ${dryers === 1 ? 'dryer' : 'dryers'}`;
}
