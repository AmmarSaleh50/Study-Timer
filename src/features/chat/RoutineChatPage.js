import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../../hooks/useUserProfile';
import PageLoader from '../../components/PageLoader';
import '../../styles/RoutineChatPage.css';
import '../../styles/animations.css';

const AI_AVATAR = <span className="routinechat-avatar" title="AI">🤖</span>;
const USER_AVATAR = <span className="routinechat-avatar" title="You">🧑</span>;

function renderRoutinePreview(routine, t) {
  if (!routine || typeof routine !== 'object' || Object.keys(routine).length === 0) return null;
  const daysObj = routine.weekly_study_routine || routine;
  if (!daysObj || typeof daysObj !== 'object' || Object.keys(daysObj).length === 0) return null;
  function formatDuration(minutes) {
    const isRTL = t && t.dir && t.dir() === 'rtl';
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (isRTL) {
      if (hours > 0 && rem > 0) {
        return `${hours} ${t('time.hour', 'h')} ${rem} ${t('time.minute', 'm')}`;
      } else if (hours > 0) {
        return `${hours} ${t('time.hour', 'h')}`;
      }
      return `${minutes} ${t('time.minute', 'm')}`;
    } else {
      if (hours > 0 && rem > 0) {
        return `${hours} ${t('time.hour', 'h')} ${rem} ${t('time.minute', 'm')}`;
      } else if (hours > 0) {
        return `${hours} ${t('time.hour', 'h')}`;
      }
      return `${minutes} ${t('time.minute', 'm')}`;
    }
  }
  return (
    <div className="routinechat-routine-preview">
      <div className="routinechat-preview-title">{t('routineChat.routinePreviewTitle', 'Routine Preview')}</div>
      <div className="routinechat-preview-table">
        {Object.entries(daysObj).map(([day, tasks]) => (
          <div key={day} className="routinechat-preview-row">
            <div className="routinechat-preview-day">{t(`days.${day.toLowerCase()}`, day)}</div>
            <div className="routinechat-preview-tasks">
              {Array.isArray(tasks)
                ? tasks.length === 0
                  ? <span style={{ color: '#aaa' }}>{t('routineChat.noTasks', '(No tasks)')}</span>
                  : <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {tasks.map((task, i) =>
                        typeof task === 'object' && task !== null ? (
                          <li key={i}>
                            {task.name || task.Activity || t('routineChat.untitledTask', 'Untitled Task')}
                            {task.Subject ? `: ${task.Subject}` : ''}
                            {task.startTime || task['Start Time'] ?
                              ` (${task.startTime || task['Start Time']} - ${task.endTime || task['End Time']}` +
                              (task.durationMinutes ? `, ${formatDuration(task.durationMinutes)}` : '') +
                              ')'
                              : ''}
                            {task.location ? ` @ ${task.location}` : ''}
                          </li>
                        ) : (
                          <li key={i}>{String(task)}</li>
                        )
                      )}
                    </ul>
                : typeof tasks === 'object' && tasks !== null
                  ? JSON.stringify(tasks)
                  : String(tasks)
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function extractJsonFromText(text) {
  let cleaned = text.replace(/```json|```/gi, '').trim();
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) {
    cleaned = cleaned.substring(first, last + 1);
    try {
      return JSON.parse(cleaned);
    } catch (e) {}
  }
  return null;
}

const RoutineChatPage = ({ onImportRoutine }) => {
  const [loading, setLoading] = React.useState(true);
  const { user } = useUserProfile();
  const [chatLoaded, setChatLoaded] = React.useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { sender: 'ai', text: t('routineChat.intro') }
  ]);
  const [input, setInput] = useState('');
  const [pendingRoutine, setPendingRoutine] = useState(null);
  const [importPrompt, setImportPrompt] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAccumulatingJson, setIsAccumulatingJson] = useState(false);
  const messagesEndRef = useRef(null);

  // Set chatLoaded to true after initial messages are set
  useEffect(() => {
    if (messages && messages.length > 0) {
      setChatLoaded(true);
    }
  }, [messages]);

  useEffect(() => {
    if (user && chatLoaded) {
      setLoading(false);
    }
  }, [user, chatLoaded]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, streamingText]);

  function isLikelyJsonStart(chunk) {
    const trimmed = chunk.trim();
    return /^```json/i.test(trimmed) || /^\{\s*$/.test(trimmed);
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');
    let aiText = '';
    let accumulatingJson = false;
    let jsonBuffer = '';
    let fallbackText = '';
    let routineParsed = false;
    try {
      const response = await fetch('http://localhost:5001/chat-generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...newMessages], stream: true }),
      });
      const reader = response.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        if (!accumulatingJson && isLikelyJsonStart(chunk)) {
          accumulatingJson = true;
          setIsAccumulatingJson(true);
          jsonBuffer = chunk;
          fallbackText = '';
          setStreamingText('');
          continue;
        }
        if (accumulatingJson) {
          jsonBuffer += chunk;
          fallbackText += chunk;
          const routine = extractJsonFromText(jsonBuffer);
          if (routine) {
            setPendingRoutine(routine);
            setImportPrompt(true);
            routineParsed = true;
            accumulatingJson = false;
            setIsAccumulatingJson(false);
            jsonBuffer = '';
            fallbackText = '';
            setStreamingText('');
            break;
          }
          continue;
        }
        aiText += chunk;
        setStreamingText(aiText);
      }
      setIsStreaming(false);
      setStreamingText('');
      setIsAccumulatingJson(false);
      if (routineParsed) return;
      if (accumulatingJson && fallbackText.trim()) {
        setMessages(prevMsgs => ([...prevMsgs, { sender: 'ai', text: fallbackText.trim() }]));
      } else if (aiText.trim()) {
        setMessages(prevMsgs => ([...prevMsgs, { sender: 'ai', text: aiText.trim() }]));
      }
    } catch (e) {
      setIsStreaming(false);
      setStreamingText('');
      setIsAccumulatingJson(false);
      setMessages(prevMsgs => ([...prevMsgs, { sender: 'ai', text: t('routineChat.error', 'Sorry, something went wrong.') }]));
    }
  };

  const handleImport = () => {
    if (pendingRoutine && onImportRoutine) {
      onImportRoutine(pendingRoutine);
      setMessages([...messages, { sender: 'ai', text: t('routineChat.imported', 'Routine imported to your routines!') }]);
      setPendingRoutine(null);
      setImportPrompt(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
      setTimeout(() => navigate('/routines'), 900);
    } else {
      alert(t('routineChat.importError', 'Routine or import handler missing!'));
    }
  };

  const hasValidRoutine = pendingRoutine && typeof pendingRoutine === 'object' && Object.keys((pendingRoutine.weekly_study_routine || pendingRoutine)).length > 0;

  return (
    <PageLoader loading={loading}>
      <div className="routinechat-bg-animated">
        <div className="routinechat-card">
          <div className="routinechat-header heading-animate classic">
            <span className="classic-main">{t('routineChat.title', 'Routistant')}</span>
            <div className="routinechat-header-underline classic-underline" />
          </div>
          <div className="routinechat-messages-area">
            {messages.map((msg, i) => (
              <div key={i} className={`routinechat-bubble heading-animate ${msg.sender} ${i < 8 ? ` stagger-${i+1}` : ''}`}>
                {msg.sender === 'ai' && AI_AVATAR}
                <span className="routinechat-bubble-content">
                  {msg.text}
                </span>
                {msg.sender === 'user' && USER_AVATAR}
              </div>
            ))}
            {isStreaming && !isAccumulatingJson && (
              <div className="routinechat-bubble ai">
                {AI_AVATAR}
                <span className="routinechat-bubble-content routinechat-streaming">{streamingText}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Routine preview & import prompt, only if valid routine exists */}
          {importPrompt && hasValidRoutine && (
            <div className="routinechat-import-prompt">
              {renderRoutinePreview(pendingRoutine, t)}
              <div className="routinechat-import-btns">
                <button className="button-pop routinechat-send-btn import-yes" onClick={handleImport}>{t('routineChat.importYes', 'Yes, import')}</button>
                <button className="button-pop routinechat-send-btn import-no" onClick={() => setImportPrompt(false)}>{t('routineChat.importNo', 'No')}</button>
              </div>
            </div>
          )}
        {showToast && (
          <div className="routinechat-toast">{t('routineChat.toastSuccess', 'Routine imported successfully!')}</div>
        )}
          <div className="routinechat-input-row">
            <input
              className="routinechat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => (e.key === 'Enter' && !isStreaming) && sendMessage()}
              placeholder={t('routineChat.inputPlaceholder', 'Describe your routine needs...')}
              disabled={loading || isStreaming}
              aria-label={t('routineChat.inputPlaceholder', 'Describe your routine needs...')}
            />
            <button
              className="routinechat-send-btn button-pop"
              onClick={sendMessage}
              disabled={loading || isStreaming || !input.trim()}
              aria-label={t('routineChat.send', 'Send')}
            >
              {loading ? (
                <span className="routinechat-spinner"></span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 17.5L17.5 10L2.5 2.5V8.33333L13.3333 10L2.5 11.6667V17.5Z" fill="currentColor"/></svg>
                  <span style={{ fontWeight: 600, marginLeft: 4 }}>{t('routineChat.send', 'Send')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </PageLoader>
  );
};

export default RoutineChatPage;
