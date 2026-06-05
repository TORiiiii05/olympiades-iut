import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PlayerAvatar from '../components/PlayerAvatar'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const RANK_CLASS = { 1: 'gold', 2: 'silver', 3: 'bronze' }

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [events, setEvents] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const [{ data: p }, { data: e }, { data: s }] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('events').select('*').order('name'),
      supabase.from('scores').select('*'),
    ])
    setPlayers(p ?? [])
    setEvents(e ?? [])
    setScores(s ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchAll)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const scoreMap = {}
  for (const s of scores) {
    if (!scoreMap[s.player_id]) scoreMap[s.player_id] = {}
    scoreMap[s.player_id][s.event_id] = s.points
  }

  const rows = players
    .map(player => {
      let total = 0
      const byEvent = {}
      for (const ev of events) {
        const pts = scoreMap[player.id]?.[ev.id]
        byEvent[ev.id] = pts ?? null
        if (pts != null) total += pts
      }
      return { ...player, total, byEvent }
    })
    .sort((a, b) => b.total - a.total)

  let currentRank = 1
  const ranked = rows.map((row, i) => {
    if (i > 0 && row.total < rows[i - 1].total) currentRank = i + 1
    return { ...row, rank: currentRank }
  })

  if (loading) {
    return (
      <div className="loading-screen">
        <span>⏳ Chargement…</span>
      </div>
    )
  }

  return (
    <div className="lb-page">
      <header className="lb-header">
        <div className="lb-header-inner">
          <h1 className="lb-title">
            <span className="lb-rings">⚪🔵🔴🟡🟢</span>
            Olympiades IUT
          </h1>
          <p className="lb-subtitle">Classement général en direct 🏅</p>
        </div>
      </header>

      {players.length === 0 ? (
        <div className="empty-state">
          Aucun joueur pour l'instant. L'admin doit d'abord ajouter des participants.
        </div>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th className="col-rank">Rang</th>
                <th className="col-player">Joueur</th>
                <th className="col-total">Total</th>
                {events.map(ev => (
                  <th key={ev.id} className="col-event">
                    {ev.emoji && <span className="ev-emoji">{ev.emoji}</span>}
                    {ev.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, i) => {
                const rankCls = RANK_CLASS[row.rank] ?? ''
                return (
                  <tr key={row.id} className={`lb-row ${rankCls} ${i % 2 === 0 ? 'stripe-even' : 'stripe-odd'}`}>
                    <td className="cell-rank">
                      {MEDAL[row.rank] ?? row.rank}
                    </td>
                    <td className="cell-player">
                      <PlayerAvatar player={row} size={68} />
                      <span className="player-name">{row.name}</span>
                    </td>
                    <td className="cell-total">{row.total}</td>
                    {events.map(ev => (
                      <td key={ev.id} className="cell-score">
                        {row.byEvent[ev.id] != null
                          ? row.byEvent[ev.id]
                          : <span className="absent-mark">0</span>}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="lb-footer">
        <span>Mise à jour en temps réel via Supabase Realtime</span>
      </footer>
    </div>
  )
}
