// Demo photos from the Figma design (Unsplash, free to use under the Unsplash license).
// Generated photographers have no photos of their own, so each gets a stable pick from this list.
// Photos uploaded in Profile settings (data URLs) always win.

const IDS = [
  'photo-1563170446-9c3c0622d8a9', // portrait
  'photo-1536766768598-e09213fdcf22', // editorial
  'photo-1517462964-21fdcec3f25b', // studio
  'photo-1533392151650-269f96231f65', // black and white
  'photo-1654765437547-6b572f52ee1a', // fashion
  'photo-1783816297488-87b9c86dea7a', // couple
  'photo-1786189535576-0eb2b7969f37', // family
  'photo-1761211488163-67bc659a8180', // bride
]

export const PHOTOS = {
  portrait: IDS[0], editorial: IDS[1], studio: IDS[2], bw: IDS[3],
  fashion: IDS[4], couple: IDS[5], family: IDS[6], bride: IDS[7],
}

export function unsplash(id, width = 800) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`
}

function hashOf(text) {
  let h = 0
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function avatarSrc(photographer, width = 400) {
  if (photographer.photo) return photographer.photo
  return unsplash(IDS[hashOf(photographer.id) % IDS.length], width)
}

export function portfolioSrc(photographer, item, index, width = 800) {
  if (item.src) return item.src
  return unsplash(IDS[(hashOf(photographer.id) + index + 1) % IDS.length], width)
}
