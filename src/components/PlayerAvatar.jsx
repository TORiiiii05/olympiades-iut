const PALETTE = [
  '#0081C8', '#EE334E', '#FCB131', '#00A651',
  '#6B4EAA', '#E8320B', '#0D6B8A', '#C84B00', '#009B48',
]

function colorFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function initials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function PlayerAvatar({ player, size = 32 }) {
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  }

  if (player.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.name}
        style={{ ...base, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      style={{
        ...base,
        backgroundColor: colorFor(player.name),
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        letterSpacing: '-0.5px',
      }}
    >
      {initials(player.name)}
    </div>
  )
}
