import React, { useState, useEffect } from 'react';
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from '../spotifyConfig';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import SpotifyPlayerControls from './SpotifyPlayerControls';
import SpotifySearchBar from './SpotifySearchBar';
import Select from 'react-select';

// Simple music note icon SVG for the button
const MusicNoteIcon = (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" style={{ display: 'block' }}>
    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
  </svg>
);

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function base64UrlEncode(arrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkceChallengeFromVerifier(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

async function getSpotifyAuthUrl() {
  const state = generateRandomString(16);
  const codeVerifier = generateRandomString(64);
  localStorage.setItem('spotify_auth_state', state);
  localStorage.setItem('spotify_code_verifier', codeVerifier);
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);
  const scope = encodeURIComponent(SPOTIFY_SCOPES.join(' '));
  return (
    `https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}` +
    `&scope=${scope}` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&state=${state}` +
    `&code_challenge_method=S256&code_challenge=${codeChallenge}`
  );
}

const DEFAULT_SPOTIFY_URL = "https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH"; // Chill Lofi Study Beats

export default function FloatingMusicPlayer() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [detectedSpotify, setDetectedSpotify] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [playerInterval, setPlayerInterval] = useState(null);
  const [searchSelected, setSearchSelected] = useState(null);

  // Save Spotify refresh token to Firestore for the logged-in user
  async function saveSpotifyRefreshTokenToFirestore(refreshToken) {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        spotifyRefreshToken: refreshToken
      }, { merge: true });
    } catch (e) {}
  }

  // Load Spotify refresh token from Firestore for the logged-in user
  async function loadSpotifyRefreshTokenFromFirestore() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    if (!user?.uid) return null;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      return userDoc.exists() ? userDoc.data().spotifyRefreshToken : null;
    } catch (e) { return null; }
  }

  // --- Helper: Refresh Spotify Access Token using Refresh Token ---
  async function refreshSpotifyAccessToken(refreshTokenOverride) {
    const refreshToken = refreshTokenOverride || localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return null;
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: SPOTIFY_CLIENT_ID,
        })
      });
      const data = await response.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
        // Spotify may return a new refresh token
        if (data.refresh_token) {
          localStorage.setItem('spotify_refresh_token', data.refresh_token);
          await saveSpotifyRefreshTokenToFirestore(data.refresh_token);
        }
        return data.access_token;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // --- On mount: Try to use existing access token, or refresh if expired ---
  useEffect(() => {
    const tryRestoreSpotifySession = async () => {
      let token = localStorage.getItem('spotify_access_token');
      if (token) {
        setAccessToken(token);
      } else {
        // Try refresh token if available locally
        let refreshToken = localStorage.getItem('spotify_refresh_token');
        // If not in localStorage, try Firestore
        if (!refreshToken) {
          refreshToken = await loadSpotifyRefreshTokenFromFirestore();
          if (refreshToken) {
            localStorage.setItem('spotify_refresh_token', refreshToken);
          }
        }
        if (refreshToken) {
          const refreshed = await refreshSpotifyAccessToken(refreshToken);
          if (refreshed) setAccessToken(refreshed);
        }
      }
    };
    // Only run if not coming back from Spotify auth (which sets token directly)
    const params = new URLSearchParams(window.location.search);
    if (!params.get('code')) {
      tryRestoreSpotifySession();
    }
  }, []);

  useEffect(() => {
    // When we get a new refresh token, save it to Firestore
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (refreshToken) saveSpotifyRefreshTokenToFirestore(refreshToken);
  }, [localStorage.getItem('spotify_refresh_token')]);

  useEffect(() => {
    const stored = localStorage.getItem('customSpotifyUrl');
    if (stored) {
      setSavedUrl(stored);
      setInputUrl(stored);
      setDetectedSpotify(isSpotifyUrl(stored));
    }
    // Handle redirect from Spotify auth
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = localStorage.getItem('spotify_auth_state');
    if (code && state && state === storedState) {
      // Exchange code for access token
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          client_id: SPOTIFY_CLIENT_ID,
          code_verifier: codeVerifier,
        })
      })
        .then(res => res.json())
        .then(data => {
          setAccessToken(data.access_token);
          localStorage.setItem('spotify_access_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
            saveSpotifyRefreshTokenToFirestore(data.refresh_token);
          }
          window.history.replaceState({}, document.title, window.location.pathname); // Clean up URL
        });
    } else {
      const token = localStorage.getItem('spotify_access_token');
      if (token) setAccessToken(token);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(setUser);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.items) setPlaylists(data.items);
        });
    }
  }, [accessToken]);

  useEffect(() => {
    if (!panelOpen && showConnect) setShowConnect(false);
  }, [panelOpen, showConnect]);

  // --- Fetch current playback state ---
  useEffect(() => {
    if (!accessToken) return;
    const fetchState = async () => {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlayerState(data);
      }
    };
    fetchState();
    if (playerInterval) clearInterval(playerInterval);
    const interval = setInterval(fetchState, 3000);
    setPlayerInterval(interval);
    return () => clearInterval(interval);
  }, [accessToken]);

  // --- Player control handlers ---
  const handlePlay = async () => {
    await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };
  const handlePause = async () => {
    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };
  const handleNext = async () => {
    await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };
  const handlePrev = async () => {
    await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };
  const handleSeek = async (ms) => {
    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${ms}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  };

  function isSpotifyUrl(url) {
    return /^https?:\/\/(open\.)?spotify\.com\/(playlist|album|track)\//.test(url);
  }

  function getSpotifyEmbed(url) {
    if (!isSpotifyUrl(url)) return DEFAULT_SPOTIFY_URL;
    // Convert to embed URL
    return url.replace("open.spotify.com/", "open.spotify.com/embed/");
  }

  function handleSave() {
    if (inputUrl && isSpotifyUrl(inputUrl)) {
      localStorage.setItem('customSpotifyUrl', inputUrl);
      setSavedUrl(inputUrl);
      setDetectedSpotify(true);
    } else {
      localStorage.removeItem('customSpotifyUrl');
      setSavedUrl('');
      setDetectedSpotify(false);
    }
  }

  return (
    <>
      {/* Music Note Button */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        style={{
          position: 'fixed', left: 32, bottom: 32, zIndex: 10002,
          width: 40, height: 40, borderRadius: 14,
          background: '#232234', color: '#fff', border: 'none', boxShadow: '0 2px 8px #0003',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
          padding: 8,
        }}
        aria-label="Music Player"
      >
        {MusicNoteIcon}
      </button>

      {/* Dropdown Card: Only controls and dropdown/select */}
      {panelOpen && (
        <div
          style={{
            position: 'fixed', left: -110, bottom: 76, zIndex: 10001,
            width: 340, maxWidth: '90vw', background: '#18182b', color: '#fff',
            borderRadius: 14, boxShadow: '0 4px 24px #0005',
            padding: 0, minWidth: 40, minHeight: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            animation: 'fadeSlideIn 0.2s',
          }}
        >
          {/* Spotify Logo Step */}
          {!accessToken && !showConnect && (
            <button
              style={{
                background: 'transparent', border: 'none', padding: 24, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={() => setShowConnect(true)}
              aria-label="Open Spotify Connect"
            >
              <img
                src={process.env.PUBLIC_URL + '/2024-spotify-logo-icon/Spotify_Primary_Logo_RGB_Green.png'}
                alt="Spotify Logo"
                style={{ height: 60, width: 180, objectFit: 'contain', display: 'block' }}
                draggable={false}
                onDragStart={e => e.preventDefault()}
              />
            </button>
          )}

          {/* Connect with Spotify Step */}
          {!accessToken && showConnect && (
            <button
              style={{
                background: '#1db954', color: '#fff', border: 'none', borderRadius: 10,
                padding: '7px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                width: 200, minWidth: 100, margin: 12
              }}
              onClick={async () => {
                const url = await getSpotifyAuthUrl();
                window.location.href = url;
              }}
            >
              Connect with Spotify
            </button>
          )}

          {/* Already Connected UI */}
          {accessToken && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 15, color: '#aaa', marginBottom: -2,marginTop: 4, gap: 8 }}>
                <img src={process.env.PUBLIC_URL + '/2024-spotify-logo-icon/Spotify_Primary_Logo_RGB_Green.png'} alt="Spotify Logo" style={{ height: 22, width: 22, objectFit: 'contain', verticalAlign: 'middle', marginRight: 4 }} draggable={false} onDragStart={e => e.preventDefault()} />
                {user && user.display_name ? `Connected to Spotify as ${user.display_name}` : 'Connecting to Spotify...'}
              </div>
              {/* Spotify Search Bar */}
              {/**
              <SpotifySearchBar accessToken={accessToken} onResultSelect={setSearchSelected} />
              */}
              {/* Playlist selection dropdown */}
              {playlists.length > 0 && (
                <Select
                  options={playlists.map(pl => ({ value: pl.id, label: pl.name }))}
                  value={playlists.find(pl => pl.id === selectedPlaylist) ? { value: selectedPlaylist, label: playlists.find(pl => pl.id === selectedPlaylist).name } : null}
                  onChange={opt => setSelectedPlaylist(opt ? opt.value : '')}
                  placeholder="Select a playlist..."
                  isSearchable
                  isClearable
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      background: '#232234',
                      borderColor: '#47449c',
                      color: '#fff',
                      minHeight: 25,
                      borderRadius: 8,
                      boxShadow: state.isFocused ? '0 0 0 2px #47449c' : 'none',
                      margin: '16px auto 8px auto',
                      width: '100%', // Make the select wider
                      fontSize: 18,
                      zIndex: 10004, // Ensure control is above button
                    }),
                    singleValue: base => ({ ...base, color: '#fff' }),
                    menu: base => ({ ...base, background: '#232234', color: '#fff', borderRadius: 8, zIndex: 10005, width: 500 }), // Make dropdown menu wider and above everything
                    option: (base, state) => ({
                      ...base,
                      background: state.isFocused ? '#47449c' : '#232234',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 18,
                      padding: '10px 16px',
                      whiteSpace: 'pre-wrap',
                    }),
                    placeholder: base => ({ ...base, color: '#aaa', fontSize: 18 }),
                    dropdownIndicator: base => ({ ...base, color: '#aaa' }),
                    indicatorSeparator: base => ({ ...base, background: '#47449c' }),
                    input: base => ({ ...base, color: '#fff', fontSize: 18 }),
                    menuPortal: base => ({ ...base, zIndex: 10005 }),
                  }}
                  menuPortalTarget={typeof window !== 'undefined' ? window.document.body : undefined}
                  menuPosition="fixed"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* SINGLE SPOTIFY EMBED: Always rendered, styled based on panelOpen */}
      {selectedPlaylist && (
        <div style={{
          position: 'fixed',
          left: -115,
          bottom: panelOpen ? 160 : 76,
          zIndex: panelOpen ? 10000 : 10001,
          width: 350,
          maxWidth: '90vw',
          background: 'transparent',
          borderRadius: 16,
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          height: panelOpen ? 380 : 80,
          transition: 'all 0.2s cubic-bezier(.4,2,.6,1)'
        }}>
          <iframe
            title="Spotify Playlist"
            src={`https://open.spotify.com/embed/playlist/${selectedPlaylist}`}
            width="100%"
            height={panelOpen ? 380 : 90}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{
              borderRadius: 12,
              marginTop: panelOpen ? 8 : 0,
              minHeight: panelOpen ? 200 : 60,
              background: 'transparent',
              transition: 'all 0.2s cubic-bezier(.4,2,.6,1)'
            }}
          ></iframe>
        </div>
      )}

      {/* Always render the player controls, but only show when a song is playing */}
      {accessToken && playerState && playerState.item && (
        <>
          {/* Full player controls when panel is open */}
          {panelOpen ? (
            <div style={{
              position: 'fixed', left: 32, bottom: 76, zIndex: 9998,
              width: 340, maxWidth: '90vw',
              background: 'transparent',
              pointerEvents: panelOpen ? 'none' : 'auto',
            }}>
              <SpotifyPlayerControls
                isPlaying={playerState.is_playing}
                onPlay={handlePlay}
                onPause={handlePause}
                onNext={handleNext}
                onPrev={handlePrev}
                track={playerState.item}
                progressMs={playerState.progress_ms}
                durationMs={playerState.item.duration_ms}
                onSeek={handleSeek}
              />
            </div>
          ) : (
            // Mini player when panel is closed
            <div style={{
              position: 'fixed', left: 32, bottom: 76, zIndex: 9998,
              width: 220, height: 64, background: '#232234ee', borderRadius: 16,
              display: 'flex', alignItems: 'center', boxShadow: '0 2px 12px #0005',
              padding: '0 16px', gap: 12,
            }}>
              <img src={playerState.item.album?.images?.[0]?.url} alt="cover" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playerState.item.name}</div>
                <div style={{ color: '#aaa', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playerState.item.artists?.map(a => a.name).join(', ')}</div>
              </div>
              <button onClick={playerState.is_playing ? handlePause : handlePlay} style={{
                background: 'none', border: 'none', color: '#1db954', fontSize: 22, cursor: 'pointer', marginLeft: 4
              }}>
                {playerState.is_playing ? '❚❚' : '▶'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
