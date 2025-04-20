import React, { useState } from 'react';

export default function SpotifySearchBar({ accessToken, onResultSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      const items = [];
      if (data.tracks) items.push(...data.tracks.items.map(item => ({ ...item, _type: 'track' })));
      if (data.albums) items.push(...data.albums.items.map(item => ({ ...item, _type: 'album' })));
      if (data.artists) items.push(...data.artists.items.map(item => ({ ...item, _type: 'artist' })));
      setResults(items);
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100%', marginBottom: 16, position: 'relative' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search Spotify (tracks, albums, artists)"
          style={{ flex: 1, borderRadius: 8, border: '1px solid #47449c', padding: '8px 12px', fontSize: 15, background: '#232234', color: '#fff' }}
        />
        <button type="submit" style={{ borderRadius: 8, border: 'none', background: '#1db954', color: '#fff', fontWeight: 600, padding: '8px 16px', fontSize: 15, cursor: 'pointer' }}>Search</button>
      </form>
      {loading && <div style={{ color: '#aaa', marginTop: 8 }}>Searching...</div>}
      {results.length > 0 && (
        <div style={{
          marginTop: 8,
          background: '#191826',
          borderRadius: 8,
          padding: 8,
          maxHeight: 240,
          overflowY: 'auto',
          width: '100%',
          minWidth: 0,
          position: 'absolute',
          left: 0,
          zIndex: 10,
          boxShadow: '0 4px 32px #0006',
        }}>
          {results.map(item => (
            <div
              key={item.id + item._type}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #222', cursor: 'pointer' }}
              onClick={() => onResultSelect(item)}
            >
              {item.images && item.images[0] && (
                <img src={item.images[0].url} alt="" style={{ width: 36, height: 36, borderRadius: 5 }} />
              )}
              <div>
                <div style={{ fontWeight: 600, color: '#fff' }}>{item.name}</div>
                <div style={{ color: '#aaa', fontSize: 13 }}>{item._type.charAt(0).toUpperCase() + item._type.slice(1)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
