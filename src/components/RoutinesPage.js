import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import '../styles/RoutinesPage.css';
import FloatingLabelInput from './FloatingLabelInput';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { generateTaskId } from '../utils';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../hooks/useUserProfile';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Map JS getDay() (0=Sunday, 1=Monday,...) to DAYS array (0=Monday,...6=Sunday)
const getCurrentRoutineDayIndex = () => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

function getDefaultTask(existingTasks = []) {
  // Suggest a time based on previous tasks or current time
  let start, end;
  if (existingTasks.length > 0) {
    const last = existingTasks[existingTasks.length - 1];
    const [eh, em] = last.endTime.split(":").map(Number);
    start = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
    // Default to 1 hour after last end
    let nextEndMins = eh * 60 + em + 60;
    end = `${Math.floor(nextEndMins / 60).toString().padStart(2, '0')}:${(nextEndMins % 60).toString().padStart(2, '0')}`;
  } else {
    // If no tasks, use current time rounded up to next 5 min
    const now = new Date();
    let mins = now.getHours() * 60 + now.getMinutes();
    mins = Math.ceil(mins / 5) * 5;
    start = `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
    let endMins = mins + 60;
    end = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
  }
  return { id: generateTaskId(), name: '', startTime: start, endTime: end };
}

const RoutinesPage = () => {
  const { user } = useUserProfile();
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [routines, setRoutines] = useState({}); // { Monday: [task, ...], ... }
  const [selectedDay, setSelectedDay] = useState(DAYS[getCurrentRoutineDayIndex()]);
  const [editTasks, setEditTasks] = useState([]);
  const [editing, setEditing] = useState(false);
  const [showLateBtns, setShowLateBtns] = useState(false);
  const [showEarlyBtns, setShowEarlyBtns] = useState(false);
  const [templates, setTemplates] = useState([]); // [{ id, name, tasks }]
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showEditTemplates, setShowEditTemplates] = useState(false);
  const [renameTemplateId, setRenameTemplateId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [taskOverlapWarning, setTaskOverlapWarning] = useState(null);
  const [showPushOptions, setShowPushOptions] = useState(false);
  const [showPullOptions, setShowPullOptions] = useState(false);

  useEffect(() => {
    if (user) setUserId(user.uid);
  }, [user]);

  useEffect(() => {
    if (!userId) return;
    // --- Listen for routines changes ---
    const routinesRef = collection(db, 'users', userId, 'routines');
    const unsubRoutines = onSnapshot(routinesRef, (snapshot) => {
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = (docSnap.data().tasks || []).map(t => ({ ...t, id: t.id || generateTaskId() }));
      });
      setRoutines(data);
    });
    // --- Listen for templates changes ---
    const templatesRef = collection(db, 'users', userId, 'templates');
    const unsubTemplates = onSnapshot(templatesRef, (snapshot) => {
      setTemplates(snapshot.docs.map(docSnap => {
        const t = docSnap.data();
        return { ...t, id: docSnap.id, tasks: (t.tasks || []).map(task => ({ ...task, id: task.id || generateTaskId() })) };
      }));
    });
    return () => {
      unsubRoutines();
      unsubTemplates();
    };
  }, [userId]);

  // Add effect to update selectedDay at midnight
  useEffect(() => {
    // Set selectedDay on mount and at every midnight
    const updateDay = () => setSelectedDay(DAYS[getCurrentRoutineDayIndex()]);
    updateDay(); // Set immediately

    // Calculate ms until next midnight
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;
    const midnightTimeout = setTimeout(() => {
      updateDay();
      // After the first midnight, update every 24h
      setInterval(updateDay, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    return () => {
      clearTimeout(midnightTimeout);
    };
  }, []);

  useEffect(() => {
    if (!showPushOptions && !showPullOptions) return;
    function handleClick(e) {
      // If the click is outside any .routine-action-popup, close both
      if (!e.target.closest('.routine-action-popup') && !e.target.closest('.neutral-btn')) {
        setShowPushOptions(false);
        setShowPullOptions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPushOptions, showPullOptions]);

  const handleDayChange = (day) => {
    setSelectedDay(day);
    setEditTasks(routines[day] ? [...routines[day]] : []);
    setEditing(false);
  };

  const startEdit = () => {
    if (!routines[selectedDay] || routines[selectedDay].length === 0) {
      setEditTasks([getDefaultTask([])]);
    } else {
      setEditTasks([...routines[selectedDay]]);
    }
    setEditing(true);
  };

  const addTask = () => {
    setEditTasks(prev => [
      ...prev,
      getDefaultTask(prev)
    ]);
  };

  const removeTask = (idx) => {
    setEditTasks(editTasks.filter((_, i) => i !== idx));
  };

  const handleTaskChange = (idx, field, value) => {
    const updated = editTasks.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    setEditTasks(updated);
  };

  const saveRoutine = async () => {
    if (!userId) return;
    const routinesRef = doc(db, 'users', userId, 'routines', selectedDay);
    await setDoc(routinesRef, { tasks: editTasks });
    setRoutines({ ...routines, [selectedDay]: editTasks });
    setEditing(false);
  };

  const deleteRoutine = async () => {
    if (!userId) return;
    const routinesRef = doc(db, 'users', userId, 'routines', selectedDay);
    await deleteDoc(routinesRef);
    const updated = { ...routines };
    delete updated[selectedDay];
    setRoutines(updated);
    setEditTasks([]);
    setEditing(false);
  };

  // --- Real-time progress calculation ---
  function getTaskProgress(task, idx) {
    if (!task.startTime || !task.endTime) return 0;
    const [sh, sm] = task.startTime.split(":").map(Number);
    const [eh, em] = task.endTime.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes() + new Date().getSeconds() / 60;
    if (nowMins < start) return 0;
    if (nowMins >= end) return 100;
    return ((nowMins - start) / (end - start)) * 100;
  }

  function getCurrentTaskIdx(tasks) {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes() + new Date().getSeconds() / 60;
    for (let i = 0; i < tasks.length; ++i) {
      const [sh, sm] = tasks[i].startTime.split(":").map(Number);
      const [eh, em] = tasks[i].endTime.split(":").map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (nowMins >= start && nowMins < end) return i;
    }
    return -1;
  }

  // --- Utility: Add/Subtract Minutes to All Tasks ---
  function shiftAllTasks(mins) {
    setEditTasks(tasks => tasks.map(task => {
      const start = Math.max(0, timeToMinutes(task.startTime) + mins);
      const end = Math.max(0, timeToMinutes(task.endTime) + mins);
      return {
        ...task,
        startTime: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
        endTime: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
      };
    }));
  }

  // Helper: returns time in minutes from 'HH:MM'
  function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  // Helper: auto-adjust times for a reordered list
  function autoAdjustTaskTimes(tasks) {
    if (tasks.length === 0) return [];
    const adjusted = [...tasks];
    // Set the first task's start/end as-is
    for (let i = 1; i < adjusted.length; ++i) {
      // Place this task right after the previous one
      const prevEnd = timeToMinutes(adjusted[i - 1].endTime);
      const duration = timeToMinutes(adjusted[i].endTime) - timeToMinutes(adjusted[i].startTime);
      const newStart = prevEnd;
      const newEnd = newStart + (duration > 0 ? duration : 60); // fallback: 1 hour
      adjusted[i] = {
        ...adjusted[i],
        startTime: `${String(Math.floor(newStart / 60)).padStart(2, '0')}:${String(newStart % 60).padStart(2, '0')}`,
        endTime: `${String(Math.floor(newEnd / 60)).padStart(2, '0')}:${String(newEnd % 60).padStart(2, '0')}`
      };
    }
    return adjusted;
  }

  // Helper: check for overlaps in a list of tasks
  function findTaskOverlaps(tasks) {
    if (!Array.isArray(tasks) || !tasks) return [];
    let overlaps = [];
    for (let i = 1; i < tasks.length; ++i) {
      if (tasks[i] && tasks[i - 1] && timeToMinutes(tasks[i].startTime) < timeToMinutes(tasks[i - 1].endTime)) {
        overlaps.push(i);
      }
    }
    return overlaps;
  }

  useEffect(() => {
    if (!editing) return;
    const overlaps = findTaskOverlaps(editTasks);
    if (overlaps.length > 0) {
      setTaskOverlapWarning('Warning: Some tasks overlap!');
    } else {
      setTaskOverlapWarning(null);
    }
  }, [editTasks, editing]);

  const handleDragEnd = result => {
    if (!result.destination) return;
    const items = Array.from(editTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    let adjusted;
    // If dragged to the first position, preserve the original first task's start time
    if (result.destination.index === 0 && editTasks.length > 1) {
      const origFirstStart = editTasks[0].startTime;
      const duration = timeToMinutes(reordered.endTime) - timeToMinutes(reordered.startTime);
      // Set new start/end for the moved task
      items[0] = {
        ...items[0],
        startTime: origFirstStart,
        endTime: `${String(Math.floor((timeToMinutes(origFirstStart) + (duration > 0 ? duration : 60)) / 60)).padStart(2, '0')}:${String((timeToMinutes(origFirstStart) + (duration > 0 ? duration : 60)) % 60).padStart(2, '0')}`
      };
      // Adjust the rest sequentially
      for (let i = 1; i < items.length; ++i) {
        const prevEnd = timeToMinutes(items[i - 1].endTime);
        const dur = timeToMinutes(items[i].endTime) - timeToMinutes(items[i].startTime);
        items[i] = {
          ...items[i],
          startTime: `${String(Math.floor(prevEnd / 60)).padStart(2, '0')}:${String(prevEnd % 60).padStart(2, '0')}`,
          endTime: `${String(Math.floor((prevEnd + (dur > 0 ? dur : 60)) / 60)).padStart(2, '0')}:${String((prevEnd + (dur > 0 ? dur : 60)) % 60).padStart(2, '0')}`
        };
      }
      adjusted = items;
    } else {
      // Use normal auto-adjust logic
      adjusted = autoAdjustTaskTimes(items);
    }
    // Check for overlaps
    const overlaps = findTaskOverlaps(adjusted);
    if (overlaps.length > 0) {
      setTaskOverlapWarning('Warning: Some tasks overlap!');
    } else {
      setTaskOverlapWarning(null);
    }
    setEditTasks(adjusted);
  };

  useEffect(() => {
    findTaskOverlaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lateBtnRef = React.useRef(null);
  const earlyBtnRef = React.useRef(null);

  const handleLateBtnClick = () => {
    if (!showLateBtns && lateBtnRef.current) {
      setShowLateBtns(s => !s);
      if (!showLateBtns) setShowEarlyBtns(false);
    }
  };
  const handleEarlyBtnClick = () => {
    if (!showEarlyBtns && earlyBtnRef.current) {
      setShowEarlyBtns(s => !s);
      if (!showEarlyBtns) setShowLateBtns(false);
    }
  };

  // --- Save Template Functionality ---
  const saveTemplate = async () => {
    if (!userId) return;
    const trimmedName = newTemplateName.trim();
    if (!trimmedName) {
      alert(t('routines.templateNameRequired'));
      return;
    }
    if (!editTasks || editTasks.length === 0) {
      alert(t('routines.noTasksToSaveTemplate'));
      return;
    }
    try {
      const templatesRef = collection(db, 'users', userId, 'templates');
      // Save with auto-generated ID
      await setDoc(doc(templatesRef), {
        name: trimmedName,
        tasks: editTasks.map(task => ({ ...task, id: task.id || generateTaskId() }))
      });
      setShowTemplateModal(false);
      setNewTemplateName("");
    } catch (err) {
      alert(t('routines.saveTemplateError'));
      console.error('Error saving template:', err);
    }
  };

  return (
    <>
      <div id="dnd-portal-root"></div>
      <div className="routines-main-bg">
        <div className="routines-container">
          <h1 className="routines-title heading-animate fade-slide-in">{t('routines.title')}</h1>
          <div className="routine-day-selector card-animate">
            {DAYS.map(day => (
              <button
                key={day}
                className={day === selectedDay ? 'active button-pop button-ripple' : 'button-pop button-ripple'}
                onClick={() => handleDayChange(day)}
              >
                {t(`days.${day.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <div className="separator"></div>
          <div className="routine-tasks-section">
            {!editing ? (
              <>
                
                {routines[selectedDay] && routines[selectedDay].length > 0 ? (
                  <ul className="routine-task-list">
                    {(routines[selectedDay] || [])
                      .slice()
                      .sort((a, b) => {
                        const [ah, am] = a.startTime.split(":").map(Number);
                        const [bh, bm] = b.startTime.split(":").map(Number);
                        return (ah * 60 + am) - (bh * 60 + bm);
                      })
                      .map((task, idx, arr) => {
                        const jsDay = new Date().getDay();
                        const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
                        const selectedIdx = DAYS.indexOf(selectedDay);
                        let progress = 0;
                        let currentIdx = -1;
                        if (selectedIdx < todayIdx) {
                          progress = 100;
                        } else if (selectedIdx === todayIdx) {
                          progress = getTaskProgress(task, idx);
                          currentIdx = getCurrentTaskIdx(arr);
                        }
                        // Animation classes for fade-in and stagger
                        const fadeClass = `fade-in-task stagger-${(idx % 10) + 1}`;
                        return (
                          <li key={idx} className={fadeClass} style={{ background: currentIdx === idx ? '#29294a' : undefined }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span><b>{task.name}</b> ({task.startTime} - {task.endTime})</span>
                              {currentIdx === idx && progress > 0 && progress < 100 && (
                                <span style={{ color: '#5d996c', fontWeight: 700, marginLeft: 12 }}>{t('routines.inProgress')}</span>
                              )}
                              {progress === 100 && (
                                <span style={{ color: '#aaa', fontWeight: 600, marginLeft: 12 }}>{t('routines.done')}</span>
                              )}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <div style={{
                                background: 'var(--routine-progress-bg, var(--modal-bg))',
                                borderRadius: 6,
                                height: 14,
                                width: '100%',
                                overflow: 'hidden',
                                border: '1px solid var(--routine-progress-border, var(--routine-progress-bar, var(--accent-color)))'
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: `${progress}%`,
                                  background: 'var(--routine-progress-bar, var(--accent-color))',
                                  transition: 'width 0.8s cubic-bezier(.6,0,.4,1)',
                                }}></div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                ) : <div style={{ color: '#bbb', margin: '16px 0', textAlign: 'center' }}>{t('routines.noRoutine')}</div>}
                <div className="separator"></div>
                <div className="routine-actions-row">
                  <button className="cancel-btn routine-btn button-pop button-ripple fade-in-edit-btn" onClick={startEdit}>
                    {t('routines.editRoutine')}
                  </button>
                  {routines[selectedDay] && routines[selectedDay].length > 0 && (
                    <button className="cancel-btn routine-btn button-pop button-ripple fade-in-edit-btn" onClick={deleteRoutine}>
                      {t('routines.deleteRoutine')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="template-actions">
                  <button className="save-btn button-pop button-ripple" onClick={() => setShowTemplateModal(true)}>
                    {t('routines.saveAsTemplate')}
                  </button>
                  <button className="save-btn button-pop button-ripple" onClick={() => setShowApplyTemplate(true)}>
                    {t('routines.applyTemplate')}
                  </button>
                  <button className="save-btn button-pop button-ripple" onClick={() => setShowEditTemplates(true)}>
                    {t('routines.editTemplates')}
                  </button>
                </div>
                <DragDropContext
                  onDragEnd={handleDragEnd}
                  getContainerForClone={() => document.getElementById('dnd-portal-root')}
                >
                  <Droppable droppableId='tasks'>
                    {(provided) => {
                      const overlaps = findTaskOverlaps(editTasks);
                      return (
                        <ul className='routine-task-list' {...provided.droppableProps} ref={provided.innerRef}>
                          {editTasks.map((task, idx) => (
                            <Draggable key={task.id} draggableId={task.id} index={idx}>
                              {(provided, snapshot) => {
                                const isOverlap = overlaps.includes(idx);
                                return (
                                  <li
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={
                                      'routine-task-edit-li' + (snapshot.isDragging ? ' dragging' : '')
                                    }
                                    style={{
                                      ...provided.draggableProps.style,
                                      background: isOverlap
                                        ? 'var(--routine-task-overlap-bg, #2d1c1c)'
                                        : 'var(--routine-task-bg, var(--card-bg))',
                                      border: isOverlap
                                        ? '1.5px solid var(--routine-task-overlap-border, #ff6b6b)'
                                        : '1.5px solid var(--routine-task-border, var(--drawer-bg))',
                                      borderRadius: 6,
                                      boxShadow: 'var(--routine-task-shadow, 0 2px 8px #0001)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '8px 12px',
                                      gap: 12,
                                      minHeight: 56
                                    }}
                                  >
                                    <FloatingLabelInput
                                      type="text"
                                      label={t('routines.taskName')}
                                      value={task.name}
                                      onChange={e => handleTaskChange(idx, 'name', e.target.value)}
                                      name={`task-name-${idx}`}
                                      required
                                    />
                                    <FloatingLabelInput
                                      type="time"
                                      label={t('routines.startTime')}
                                      value={task.startTime}
                                      onChange={e => handleTaskChange(idx, 'startTime', e.target.value)}
                                      name={`task-start-${idx}`}
                                      required
                                    />
                                    <span style={{ margin: '0 6px', color: '#aaa' }}>{t('routines.to')}</span>
                                    <FloatingLabelInput
                                      type="time"
                                      label={t('routines.endTime')}
                                      value={task.endTime}
                                      onChange={e => handleTaskChange(idx, 'endTime', e.target.value)}
                                      name={`task-end-${idx}`}
                                      required
                                    />
                                    <button className="cancel-btn button-pop button-ripple" style={{ marginLeft: 10, flexShrink: 0, height: 40, alignSelf: 'center', maxWidth: 90, overflow: 'hidden', whiteSpace: 'nowrap' }} onClick={() => removeTask(idx)}>
                                      {t('routines.delete')}
                                    </button>
                                  </li>
                                );
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      );
                    }}
                  </Droppable>
                </DragDropContext>
                {taskOverlapWarning && (
                  <div className="task-overlap-warning">
                    {taskOverlapWarning}
                  </div>
                )}
                <div className="routine-action-buttons-row">
                  <div>
                    <button className="save-btn button-pop button-ripple" onClick={addTask}>
                      + Add Task
                    </button>
                    <button className="save-btn button-pop button-ripple" onClick={saveRoutine}>
                      Save
                    </button>
                    <button className="cancel-btn button-pop button-ripple" style={{ display: 'inline-block', marginLeft: 2 }} onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                  <div className="routine-shift-controls">
                    <button className="routine-shift-btn" onClick={() => setShowPullOptions(v => !v)}>
                      Pull
                    </button>
                    <button className="routine-shift-btn" onClick={() => setShowPushOptions(v => !v)}>
                      Push
                    </button>
                    {showPullOptions && (
                      <div className="routine-shift-popup">
                        <button className="routine-shift-option" onClick={() => { shiftAllTasks(-10); setShowPullOptions(false); }}>- 10 min</button>
                        <button className="routine-shift-option" onClick={() => { shiftAllTasks(-30); setShowPullOptions(false); }}>- 30 min</button>
                        <button className="routine-shift-option" onClick={() => { shiftAllTasks(-60); setShowPullOptions(false); }}>- 1 hour</button>
                      </div>
                    )}
                    {showPushOptions && (
                      <div className="routine-shift-popup">
                        <button className="routine-shift-option" onClick={() => { shiftAllTasks(10); setShowPushOptions(false); }}>+ 10 min</button>
                        <button className="routine-shift-option" onClick={() => { shiftAllTasks(30); setShowPushOptions(false); }}>+ 30 min</button>
                        <button className="routine-shift-option" onClick={() => { shiftAllTasks(60); setShowPushOptions(false); }}>+ 1 hour</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Save as Template Card */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="template-card" style={{ padding: 32, minWidth: 320, maxWidth: 400 }}>
          <h4 style={{ marginTop: 0, color: 'var(--accent-color, #5d996c)' }}>{t('routines.saveAsTemplate')}</h4>
          <FloatingLabelInput
            type="text"
            label={t('routines.templateName')}
            value={newTemplateName}
            onChange={e => setNewTemplateName(e.target.value)}
            name="template-name"
            required
            autoFocus
            style={{ marginBottom: 18, width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
           <button className="save-btn button-pop button-ripple" onClick={saveTemplate}>
              {t('routines.save')}
            </button>
            <button className="cancel-btn button-pop button-ripple" onClick={() => setShowTemplateModal(false)}>
              {t('routines.cancel')}
            </button>
          </div>
        </div>
      </div>
      )}
      {/* Apply Template Card */}
      {showApplyTemplate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="template-card" style={{ padding: 32, minWidth: 320, maxWidth: 400 }}>
          <h4 style={{ marginTop: 0, color: 'var(--accent-color, #5d996c)' }}>{t('routines.applyTemplate')}</h4>
          {templates.length === 0 && <div style={{ marginBottom: 10, color: 'var(--muted-text, #aaa)' }}>{t('routines.noTemplates')}</div>}
          {templates.map(template => (
            <div key={template.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>{template.name}</span>
              <button className="save-btn button-pop button-ripple" onClick={() => setEditTasks(template.tasks)}>
                {t('routines.apply')}
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="cancel-btn button-pop button-ripple" onClick={() => setShowApplyTemplate(false)}>
              {t('routines.cancel')}
            </button>
          </div>
        </div>
      </div>
      )}
      {/* Edit Templates Card */}
      {showEditTemplates && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="template-card" style={{ padding: 32, minWidth: 340, maxWidth: 440 }}>
          <h4 style={{ marginTop: 0, color: 'var(--accent-color, #5d996c)' }}>{t('routines.editTemplates')}</h4>
          {templates.length === 0 && <div style={{ marginBottom: 10, color: 'var(--muted-text, #aaa)' }}>{t('routines.noTemplates')}</div>}
          {templates.map(template => (
            <div key={template.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <span style={{ flex: 1, cursor: 'pointer', color: '#fff' }} onClick={() => setPreviewTemplate(template)} title={t('routines.previewTasks')}>
                {renameTemplateId === template.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => setRenameTemplateId(null)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setRenameTemplateId(null);
                      if (e.key === 'Escape') setRenameTemplateId(null);
                    }}
                    style={{ borderRadius: 6, border: '1px solid #47449c', padding: '2px 8px', width: '80%' }}
                  />
                ) : (
                  <span>{template.name}</span>
                )}
              </span>
              {renameTemplateId === template.id ? (
                <button className="save-btn button-pop button-ripple" style={{ padding: '2px 10px' }} onClick={() => setRenameTemplateId(null)} disabled={!renameValue.trim()}>
                  {t('routines.save')}
                </button>
              ) : (
                <>
                  <button className="save-btn button-pop button-ripple" style={{ padding: '2px 10px', marginRight: 4 }} onClick={() => { setRenameTemplateId(template.id); setRenameValue(template.name); }}>
                    {t('routines.rename')}
                  </button>
                  <button className="save-btn button-pop button-ripple" style={{ padding: '2px 10px' }} onClick={() => setPreviewTemplate(template)}>
                    {t('routines.preview')}
                  </button>
                  <button className="cancel-btn button-pop button-ripple" style={{ padding: '2px 18px', borderRadius: '20px', fontSize: 14, minWidth: 'unset', maxHeight: '30px'}} onClick={async () => {
                    // Delete template from Firestore
                    if (!userId) return;
                    const templateId = template.id;
                    try {
                      await deleteDoc(doc(db, 'users', userId, 'templates', templateId));
                    } catch (err) {
                      alert('Failed to delete template.');
                      return;
                    }
                    setTemplates(templates.filter(tmpl => tmpl.id !== templateId));
                  }}>
                    {t('routines.delete')}
                  </button>
                </>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="cancel-btn button-pop button-ripple" onClick={() => setShowEditTemplates(false)}>
              {t('routines.close')}
            </button>
          </div>
        </div>
      </div>
      )}
      {/* Preview Template Card */}
      {previewTemplate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2100, background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="template-card" style={{ padding: 32, minWidth: 340, maxWidth: 440 }}>
          <h4 style={{ marginTop: 0, color: 'var(--accent-color, #5d996c)' }}>{t('routines.template', { name: previewTemplate.name })}</h4>
          {(!previewTemplate.tasks || previewTemplate.tasks.length === 0) ? (
            <div style={{ color: 'var(--muted-text, #aaa)' }}>{t('routines.noTasksInTemplate')}</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 220, overflowY: 'auto' }}>
              {previewTemplate.tasks.map((task, i) => (
                <li key={i} style={{
                  background: 'var(--routine-task-bg, var(--card-bg))',
                  border: '1.5px solid var(--routine-task-border, var(--accent-color, #FFD700))',
                  borderRadius: 8,
                  marginBottom: 8,
                  padding: '8px 14px',
                  color: 'var(--text-color)',
                  fontSize: 15,
                  boxShadow: 'var(--routine-task-shadow, 0 2px 8px #0002)'
                }}>
                  <b>{task.name || <span style={{ color: 'var(--muted-text, #aaa)' }}>{t('routines.untitled')}</span>}</b> <span style={{ color: 'var(--muted-text, #aaa)', fontWeight: 400 }}>({task.startTime} - {task.endTime})</span>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="neutral-btn button-pop button-ripple" onClick={() => setPreviewTemplate(null)}>
              {t('routines.close')}
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default RoutinesPage;
