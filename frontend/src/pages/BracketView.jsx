import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'

const API = 'http://localhost:3001'
const WS_URL = 'ws://localhost:3001'

function MatchBox({ match, onScoreSubmit, selectedMatchId, onSelect }) {
  const [scoreTop, setScoreTop] = useState('')
  const [scoreBottom, setScoreBottom] = useState('')
  const [error, setError] = useState('')

  const isSelected = selectedMatchId === match.id
  const isPlayable =
    match.p1 !== null &&
    match.p2 !== null &&
    !match.p1_bye &&
    !match.p2_bye &&
    !match.winner_id

  const isCompleted = !!match.winner_id

  function handleClick() {
    if (isPlayable && !isSelected) {
      setScoreTop('')
      setScoreBottom('')
      setError('')
      onSelect(match.id)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    e.stopPropagation()
    const s1 = parseInt(scoreTop, 10)
    const s2 = parseInt(scoreBottom, 10)
    if (isNaN(s1) || isNaN(s2)) {
      setError('Please enter valid scores')
      return
    }
    if (s1 === s2) {
      setError('Tied scores are not allowed')
      return
    }
    setError('')
    const ok = await onScoreSubmit(match.id, s1, s2)
    if (ok) {
      onSelect(null)
    }
  }

  const p1Name = match.p1 ? match.p1.name : match.p1_bye ? 'BYE' : 'TBD'
  const p2Name = match.p2 ? match.p2.name : match.p2_bye ? 'BYE' : 'TBD'

  const isWinner1 = match.winner_id && match.p1 && match.winner_id === match.p1.id
  const isWinner2 = match.winner_id && match.p2 && match.winner_id === match.p2.id

  return (
    <div
      data-testid={`match-${match.round}-${match.position}`}
      onClick={handleClick}
      style={{
        border: `2px solid ${isSelected ? '#0066cc' : isCompleted ? '#4caf50' : '#999'}`,
        borderRadius: 4,
        background: isCompleted && !isSelected ? '#f0fff0' : !isPlayable && !isCompleted ? '#f5f5f5' : '#fff',
        cursor: isPlayable ? 'pointer' : 'default',
        opacity: !isPlayable && !isCompleted ? 0.6 : 1,
        minWidth: 150,
        userSelect: 'none',
      }}
    >
      {/* Participant rows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          background: isWinner1 ? '#e6f4ea' : 'transparent',
        }}
      >
        <span data-testid="match-participant-top" style={{ fontWeight: isWinner1 ? 'bold' : 'normal' }}>
          {p1Name}
        </span>
        {match.score1 !== null && (
          <span data-testid="match-score-top" style={{ marginLeft: 8, fontWeight: 'bold', minWidth: 20, textAlign: 'right' }}>
            {match.score1}
          </span>
        )}
      </div>
      <div style={{ borderTop: '1px solid #ddd' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          background: isWinner2 ? '#e6f4ea' : 'transparent',
        }}
      >
        <span data-testid="match-participant-bottom" style={{ fontWeight: isWinner2 ? 'bold' : 'normal' }}>
          {p2Name}
        </span>
        {match.score2 !== null && (
          <span data-testid="match-score-bottom" style={{ marginLeft: 8, fontWeight: 'bold', minWidth: 20, textAlign: 'right' }}>
            {match.score2}
          </span>
        )}
      </div>

      {/* Inline score entry */}
      {isSelected && (
        <div
          style={{ padding: '8px', borderTop: '2px solid #0066cc', background: '#f8f8ff' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ marginBottom: 6 }}>
            <input
              data-testid="score-input-top"
              type="number"
              value={scoreTop}
              onChange={e => setScoreTop(e.target.value)}
              placeholder={`${p1Name} score`}
              style={{ width: '100%', padding: '4px 6px', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 6 }}>
            <input
              data-testid="score-input-bottom"
              type="number"
              value={scoreBottom}
              onChange={e => setScoreBottom(e.target.value)}
              placeholder={`${p2Name} score`}
              style={{ width: '100%', padding: '4px 6px', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <div data-testid="score-error" style={{ color: 'red', fontSize: 12, marginBottom: 6 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              data-testid="submit-score-btn"
              onClick={handleSubmit}
              style={{ flex: 1, padding: '4px 8px', cursor: 'pointer', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 3 }}
            >
              Submit
            </button>
            <button
              onClick={e => { e.stopPropagation(); onSelect(null) }}
              style={{ padding: '4px 8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BracketView() {
  const { id } = useParams()
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const wsRef = useRef(null)

  async function loadBracket() {
    const res = await fetch(`${API}/api/tournaments/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setBracket(data)
    setLoading(false)
  }

  useEffect(() => {
    loadBracket()
  }, [id])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', tournamentId: id }))
    }

    ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'bracket_update' && msg.bracket) {
          setBracket(msg.bracket)
        } else if (msg.type === 'user_count') {
          setConnectedUsers(msg.count)
        }
      } catch {}
    }

    return () => {
      ws.close()
    }
  }, [id])

  const handleScoreSubmit = useCallback(
    async (matchId, score1, score2) => {
      const res = await fetch(`${API}/api/tournaments/${id}/matches/${matchId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score1, score2 }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.bracket) setBracket(data.bracket)
        return true
      }
      return false
    },
    [id]
  )

  if (loading) return <div>Loading...</div>
  if (!bracket) return <div>Tournament not found</div>

  // Group matches by round
  const rounds = {}
  for (const match of bracket.matches) {
    if (!rounds[match.round]) rounds[match.round] = []
    rounds[match.round].push(match)
  }
  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b)
  const maxRound = Math.max(...roundNumbers)

  return (
    <div data-testid="bracket-view" style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link data-testid="back-to-list" to="/" style={{ textDecoration: 'none', color: '#0066cc' }}>
          ← Back to List
        </Link>
        <h1 style={{ margin: 0, fontSize: 22 }}>{bracket.tournament.name}</h1>
        <div data-testid="connected-users" style={{ marginLeft: 'auto', color: '#666', fontSize: 14 }}>
          {connectedUsers} user{connectedUsers !== 1 ? 's' : ''} connected
        </div>
      </div>

      {bracket.champion && (
        <div
          data-testid="champion"
          style={{
            background: '#ffd700',
            padding: '12px 20px',
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 20,
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Champion: {bracket.champion}
        </div>
      )}

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 16 }}>
        {roundNumbers.map(round => (
          <div key={round} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 12, color: '#555' }}>
              {round === maxRound ? 'Final' : `Round ${round}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rounds[round].map(match => (
                <MatchBox
                  key={match.id}
                  match={match}
                  onScoreSubmit={handleScoreSubmit}
                  selectedMatchId={selectedMatchId}
                  onSelect={setSelectedMatchId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
