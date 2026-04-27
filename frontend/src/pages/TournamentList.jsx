import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:3001'

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([])
  const [name, setName] = useState('')
  const [participantsText, setParticipantsText] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function loadTournaments() {
    const res = await fetch(`${API}/api/tournaments`)
    const data = await res.json()
    setTournaments(data)
  }

  useEffect(() => {
    loadTournaments()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    const participants = participantsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    if (!name.trim()) {
      setError('Tournament name is required')
      return
    }
    if (participants.length < 3 || participants.length > 16) {
      setError('Please enter between 3 and 16 participants')
      return
    }

    const res = await fetch(`${API}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), participants }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to create tournament')
      return
    }
    setName('')
    setParticipantsText('')
    await loadTournaments()
  }

  async function handleDeleteAll() {
    await fetch(`${API}/api/tournaments`, { method: 'DELETE' })
    setTournaments([])
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>Tournament Bracket Manager</h1>

      <form data-testid="new-tournament-form" onSubmit={handleCreate} style={{ marginBottom: 32 }}>
        <h2>New Tournament</h2>
        <div style={{ marginBottom: 12 }}>
          <label>Tournament Name</label>
          <br />
          <input
            data-testid="tournament-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Participants (one per line, 3–16)</label>
          <br />
          <textarea
            data-testid="participants-input"
            value={participantsText}
            onChange={e => setParticipantsText(e.target.value)}
            rows={6}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        {error && (
          <div data-testid="form-error" style={{ color: 'red', marginBottom: 8 }}>
            {error}
          </div>
        )}
        <button data-testid="create-tournament-btn" type="submit" style={{ padding: '8px 16px' }}>
          Create Tournament
        </button>
      </form>

      <button
        data-testid="delete-all-btn"
        onClick={handleDeleteAll}
        style={{ padding: '8px 16px', background: '#c00', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 24 }}
      >
        Delete All Tournaments
      </button>

      <h2>Tournaments</h2>
      <div data-testid="tournament-list">
        {tournaments.map(t => (
          <div
            key={t.id}
            data-testid={`tournament-item-${t.id}`}
            onClick={() => navigate(`/tournament/${t.id}`)}
            style={{
              padding: 12,
              border: '1px solid #ccc',
              marginBottom: 8,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            {t.name}
          </div>
        ))}
      </div>
    </div>
  )
}
