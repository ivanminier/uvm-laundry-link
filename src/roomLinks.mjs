export function roomDisplayName(room) {
  return room.displayName ?? room.name;
}

export function roomLabel(room) {
  return [roomDisplayName(room), room.locationLabel].filter(Boolean).join(' · ');
}

export function roomPath(room) {
  const slug = roomLabel(room).toLowerCase()
    .replace(/[&+]/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `#room/${slug}`;
}
