export const CAMPUS_SECTIONS = [
  ['redstone', 'Redstone'],
  ['athletic', 'Athletic'],
  ['central', 'Central'],
  ['north', 'Trinity and North'],
];
export function campusHeading(campus, label) {
  return label + (campus === 'north' ? ' Campuses' : ' Campus');
}

const CAMPUS_COMPLEXES = {
  redstone: [
    { title: 'CWPSCR', roomIds: ['christie', 'cwp', 'patterson', 'slade', 'coolidge', 'redstone'] },
    { title: 'MSH', roomIds: ['mason', 'simpson', 'hamilton'] },
    { title: 'WDW', roomIds: ['wing', 'davis', 'wilks'] },
  ],
  athletic: [
    { title: 'Living-Learning Complex', roomIds: ['lll_140', 'lll_180', 'lll_b110', 'lll_c131', 'lll_d110', 'lll_d140', 'lll_e110', 'lll_e160'] },
    { title: 'University Heights North Complex', roomIds: ['uheightsn1', 'uheightsn2'] },
    { title: 'University Heights South Complex', roomIds: ['uheightss1', 'uheightss2'] },
    { title: 'MAT', roomIds: ['austin', 'tupper'] },
    { title: 'Harris-Millis', roomIds: ['harris', 'millis'] },
  ],
  central: [
    { title: 'CCRH', roomIds: ['central_campus_2', 'central_campus_3', 'central_campus_4', 'central_campus_5', 'central_campus_6', 'central_campus_7'] },
  ],
  north: [
    { title: 'The Back Five', roomIds: ['hunt', 'mccann', 'ready', 'richardson', 'sichel'] },
  ],
};

export function groupCampusRooms(rooms, campus) {
  const complexes = CAMPUS_COMPLEXES[campus] ?? [];
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const complexRoomIds = new Set(complexes.flatMap(({ roomIds }) => roomIds));
  const sections = complexes
    .map(({ title, roomIds }) => ({
      title,
      rooms: roomIds.map((id) => roomsById.get(id)).filter(Boolean),
    }))
    .filter(({ rooms: groupedRooms }) => groupedRooms.length > 0)
    .sort((first, second) => first.title.localeCompare(second.title));
  const otherRooms = rooms.filter((room) => !complexRoomIds.has(room.id));

  if (otherRooms.length > 0) sections.push({ title: 'Other Buildings', rooms: otherRooms });
  return sections;
}
