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

// Each tracker belongs to one generated residence hall guide.
export function hallName(room) {
  const display = roomDisplayName(room);
  return room.id.startsWith('lll_') ? 'Living-Learning'
    : display === 'CCRH' ? 'Central Campus Residence Hall'
    : display.replace(/^UHeights /, 'University Heights ');
}

export function hallSlug(name) {
  return name.toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function hallGuidePath(room) {
  return `/residence-halls/${hallSlug(hallName(room))}/`;
}
