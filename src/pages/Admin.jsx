import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PlayerAvatar from '../components/PlayerAvatar'

const PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const POINTS_REF = [
  ['1er', 10], ['2e', 8], ['3e', 7], ['4e', 6], ['5e', 5],
  ['6e', 4], ['7e', 3], ['8e', 2], ['9e', 1],
]

export default function Admin() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('admin_authed') === 'true',
  )
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [tab, setTab] = useState('scores')

  const [players, setPlayers] = useState([])
  const [events, setEvents] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  // score grid: { [playerId]: { [eventId]: string } }
  const [grid, setGrid] = useState({})
  const [saving, setSaving] = useState({})
  const [savedFlash, setSavedFlash] = useState({})

  const [newPlayerName, setNewPlayerName] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [newEventEmoji, setNewEventEmoji] = useState('')
  const [uploading, setUploading] = useState({})

  // ── data fetching ──────────────────────────────────────────

  async function fetchAll() {
    const [{ data: p }, { data: e }, { data: s }] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('events').select('*').order('name'),
      supabase.from('scores').select('*'),
    ])
    const pl = p ?? []
    const ev = e ?? []
    const sc = s ?? []
    setPlayers(pl)
    setEvents(ev)
    setScores(sc)

    const g = {}
    for (const player of pl) {
      g[player.id] = {}
      for (const event of ev) {
        const found = sc.find(r => r.player_id === player.id && r.event_id === event.id)
        g[player.id][event.id] = found != null ? String(found.points) : ''
      }
    }
    setGrid(g)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) fetchAll()
  }, [authed])

  // ── auth ───────────────────────────────────────────────────

  function handleLogin(e) {
    e.preventDefault()
    if (pwInput === PASSWORD) {
      localStorage.setItem('admin_authed', 'true')
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('Mot de passe incorrect')
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_authed')
    setAuthed(false)
  }

  // ── players ────────────────────────────────────────────────

  async function addPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    const { error } = await supabase.from('players').insert({ name })
    if (error) { alert(error.message); return }
    setNewPlayerName('')
    fetchAll()
  }

  async function deletePlayer(id) {
    if (!window.confirm('Supprimer ce joueur et tous ses scores ?')) return
    await supabase.from('players').delete().eq('id', id)
    fetchAll()
  }

  async function uploadAvatar(playerId, file) {
    if (!file) return
    setUploading(u => ({ ...u, [playerId]: true }))
    const ext = file.name.split('.').pop()
    const path = `${playerId}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (upErr) { alert('Erreur upload : ' + upErr.message); setUploading(u => ({ ...u, [playerId]: false })); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('players').update({ avatar_url: publicUrl }).eq('id', playerId)
    setUploading(u => ({ ...u, [playerId]: false }))
    fetchAll()
  }

  async function removeAvatar(player) {
    if (!window.confirm('Supprimer la photo de ' + player.name + ' ?')) return
    await supabase.from('players').update({ avatar_url: null }).eq('id', player.id)
    fetchAll()
  }

  // ── events ─────────────────────────────────────────────────

  async function addEvent() {
    const name = newEventName.trim()
    if (!name) return
    const emoji = newEventEmoji.trim() || null
    const { error } = await supabase.from('events').insert({ name, emoji })
    if (error) { alert(error.message); return }
    setNewEventName('')
    setNewEventEmoji('')
    fetchAll()
  }

  async function deleteEvent(id) {
    if (!window.confirm('Supprimer cette épreuve et tous ses scores ?')) return
    await supabase.from('events').delete().eq('id', id)
    fetchAll()
  }

  // ── score grid ─────────────────────────────────────────────

  function updateCell(playerId, eventId, val) {
    setGrid(g => ({
      ...g,
      [playerId]: { ...g[playerId], [eventId]: val },
    }))
  }

  async function saveColumn(eventId) {
    setSaving(s => ({ ...s, [eventId]: true }))

    const upserts = []
    const toDelete = []

    for (const player of players) {
      const raw = grid[player.id]?.[eventId] ?? ''
      if (raw !== '') {
        const pts = parseInt(raw, 10)
        if (!isNaN(pts)) {
          upserts.push({ player_id: player.id, event_id: eventId, points: pts })
        }
      } else {
        const existing = scores.find(
          s => s.player_id === player.id && s.event_id === eventId,
        )
        if (existing) toDelete.push(existing.id)
      }
    }

    if (upserts.length > 0) {
      await supabase
        .from('scores')
        .upsert(upserts, { onConflict: 'player_id,event_id' })
    }
    if (toDelete.length > 0) {
      await supabase.from('scores').delete().in('id', toDelete)
    }

    await fetchAll()
    setSaving(s => ({ ...s, [eventId]: false }))
    setSavedFlash(f => ({ ...f, [eventId]: true }))
    setTimeout(() => setSavedFlash(f => ({ ...f, [eventId]: false })), 1500)
  }

  // ── login screen ───────────────────────────────────────────

  if (!authed) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">🏅</div>
          <h1 className="login-title">Admin Panel</h1>
          <p className="login-sub">Olympiades IUT</p>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="password"
              className="input"
              placeholder="Mot de passe"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
            {pwError && <p className="form-error">{pwError}</p>}
            <button type="submit" className="btn btn-primary btn-block">
              Se connecter
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-screen"><span>⏳ Chargement…</span></div>
  }

  // ── admin UI ───────────────────────────────────────────────

  return (
    <div className="admin-page">
      <header className="admin-header">
        <span className="admin-header-title">🏅 Admin – Olympiades IUT</span>
        <button className="btn btn-outline btn-sm" onClick={handleLogout}>
          Déconnexion
        </button>
      </header>

      <nav className="tab-bar">
        {[
          { id: 'scores', label: '📊 Scores' },
          { id: 'players', label: '👥 Joueurs' },
          { id: 'events', label: '🎯 Épreuves' },
        ].map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── PLAYERS TAB ── */}
      {tab === 'players' && (
        <section className="tab-section">
          <h2 className="section-title">Gérer les joueurs</h2>

          <div className="add-row">
            <input
              className="input"
              placeholder="Nom du joueur"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
            />
            <button className="btn btn-primary" onClick={addPlayer}>
              Ajouter
            </button>
          </div>

          {players.length === 0 ? (
            <p className="empty-hint">Aucun joueur. Ajoutez-en un ci-dessus.</p>
          ) : (
            <ul className="item-list">
              {players.map(player => (
                <li key={player.id} className="item-row">
                  <PlayerAvatar player={player} size={42} />
                  <span className="item-name">{player.name}</span>
                  <div className="item-actions">
                    <label className="avatar-btn" title="Changer la photo">
                      {uploading[player.id] ? '⏳' : '📷'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => uploadAvatar(player.id, e.target.files[0])}
                      />
                    </label>
                    {player.avatar_url && (
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Supprimer la photo"
                        onClick={() => removeAvatar(player)}
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deletePlayer(player.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── EVENTS TAB ── */}
      {tab === 'events' && (
        <section className="tab-section">
          <h2 className="section-title">Gérer les épreuves</h2>

          <div className="add-row">
            <input
              className="input emoji-input"
              placeholder="🏓"
              value={newEventEmoji}
              onChange={e => setNewEventEmoji(e.target.value)}
              maxLength={4}
            />
            <input
              className="input"
              placeholder="Nom de l'épreuve"
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEvent()}
            />
            <button className="btn btn-primary" onClick={addEvent}>
              Ajouter
            </button>
          </div>

          {events.length === 0 ? (
            <p className="empty-hint">Aucune épreuve. Ajoutez-en une ci-dessus.</p>
          ) : (
            <ul className="item-list">
              {events.map(ev => (
                <li key={ev.id} className="item-row">
                  <span className="event-icon">{ev.emoji ?? '🎯'}</span>
                  <span className="item-name">{ev.name}</span>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteEvent(ev.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── SCORES TAB ── */}
      {tab === 'scores' && (
        <section className="tab-section">
          <h2 className="section-title">Grille des scores</h2>

          <details className="ref-card">
            <summary>Barème de référence</summary>
            <div className="ref-grid">
              {POINTS_REF.map(([place, pts]) => (
                <div key={place} className="ref-cell">
                  <span className="ref-place">{place}</span>
                  <span className="ref-pts">{pts} pts</span>
                </div>
              ))}
            </div>
          </details>

          {events.length === 0 || players.length === 0 ? (
            <p className="empty-hint">
              Ajoutez des joueurs et des épreuves dans les onglets correspondants.
            </p>
          ) : (
            <div className="event-cards">
              {events.map(ev => (
                <div key={ev.id} className="event-card">
                  <div className="event-card-header">
                    <span className="event-card-title">
                      {ev.emoji ?? '🎯'} {ev.name}
                    </span>
                    <button
                      className={`btn btn-sm ${savedFlash[ev.id] ? 'btn-success' : 'btn-primary'}`}
                      onClick={() => saveColumn(ev.id)}
                      disabled={saving[ev.id]}
                    >
                      {saving[ev.id] ? '⏳' : savedFlash[ev.id] ? '✅ Sauvé' : '💾 Sauver'}
                    </button>
                  </div>
                  <div className="score-rows">
                    {players.map(player => (
                      <div key={player.id} className="score-row">
                        <PlayerAvatar player={player} size={30} />
                        <span className="score-player-name">{player.name}</span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          className="score-input"
                          value={grid[player.id]?.[ev.id] ?? ''}
                          onChange={e => updateCell(player.id, ev.id, e.target.value)}
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
