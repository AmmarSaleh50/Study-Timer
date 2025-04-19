import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, addDoc } from 'firebase/firestore';
import './RoutinesPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import FloatingLabelInput from './components/FloatingLabelInput';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { generateTaskId } from './utils';
import { AnimatePresence, motion } from 'framer-motion';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  console.log('RoutinesPage mounted');
  const [userId, setUserId] = useState(null);
  const [routines, setRoutines] = useState({}); // { Monday: [task, ...], ... }
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()]);
  const [editTasks, setEditTasks] = useState([]);
  const [editing, setEditing] = useState(false);
  const [showLateBtns, setShowLateBtns] = useState(false);
  const [showEarlyBtns, setShowEarlyBtns] = useState(false);
  const [templates, setTemplates] = useState([]); // [{ id, name, tasks }]
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [showEditTemplates, setShowEditTemplates] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");
  const [renameTemplateId, setRenameTemplateId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Drawer/Sidebar State ---
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => { console.log('drawerOpen changed:', drawerOpen); }, [drawerOpen]);
  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };
  const drawerVariants = {
    hidden: { x: '-120%', scale: 0.98, opacity: 0.7 },
    visible: { x: 0, scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 80, damping: 23 } },
    exit: { x: '-120%', scale: 0.98, opacity: 0.7 }
  };

  const Drawer = () => (
    <AnimatePresence initial={false}>
      {drawerOpen && (
        <>
          {/* Overlay Animation */}
          <motion.div
            key="drawer-overlay"
            className="drawer-overlay"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 2000, width: '100vw', height: '100vh', pointerEvents: 'auto' }}
            onClick={handleDrawerClose}
          />
          {/* Drawer Panel Animation */}
          <motion.aside
            key="drawer-panel"
            className={`drawer${drawerOpen ? ' open' : ''}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={drawerVariants}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: 320,
              maxWidth: '80vw',
              background: '#232234',
              boxShadow: '2px 0 16px rgba(44,44,68,0.12)',
              pointerEvents: 'auto',
              zIndex: 2110,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="drawer-header-row" style={{ justifyContent: 'center' }}>
              <span className="drawer-title" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Menu</span>
              <button className="drawer-close-btn" onClick={handleDrawerClose}>&times;</button>
            </div>
            <div className="drawer-actions" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
              <button onClick={() => { navigate('/routines'); handleDrawerClose(); }} style={{ background: location.pathname === '/routines' ? '#fff' : '#47449c', color: location.pathname === '/routines' ? '#47449c' : '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginBottom: 10 }} className="button-pop button-ripple">
                Routines
              </button>
              <button onClick={() => { navigate('/timer'); handleDrawerClose(); }} style={{ background: location.pathname === '/timer' ? '#fff' : '#47449c', color: location.pathname === '/timer' ? '#47449c' : '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} className="button-pop button-ripple">
                Study Timer
              </button>
              <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="button-pop button-ripple" style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 24 }}>Sign Out</button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  const DrawerToggle = () => (
    <div style={{position: 'fixed', top: 18, left: 18, zIndex: 1200}}>
      {!drawerOpen && (
        <button onClick={handleDrawerOpen} className="drawer-open-btn button-pop button-ripple">
          <div className="drawer-slashes">
            <div className="drawer-slash" />
            <div className="drawer-slash" />
            <div className="drawer-slash" />
          </div>
        </button>
      )}
    </div>
  );

  // Save as template
  const saveAsTemplate = async () => {
    if (!userId || !newTemplateName.trim()) return;
    const ref = collection(db, 'users', userId, 'templates');
    await addDoc(ref, { name: newTemplateName.trim(), tasks: editTasks });
    setShowTemplateModal(false);
    setNewTemplateName("");
    // Refresh templates
    const snapshot = await getDocs(ref);
    setTemplates(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    showTemplateCardMsg('Template saved');
  };

  // Apply a template to current day
  const applyTemplateToDay = async (template) => {
    setEditTasks(template.tasks.map(t => ({ ...t, id: t.id || generateTaskId() })));
    setShowApplyTemplate(false);
  };

  // Card-style message popup
  const showTemplateCardMsg = (msg, ms = 1800) => {
    setTemplateMsg(msg);
    setTimeout(() => setTemplateMsg(""), ms);
  };

  // Edit templates (delete)
  const deleteTemplate = async (id) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'templates', id));
    setTemplates(templates => templates.filter(t => t.id !== id));
    showTemplateCardMsg('Template deleted');
  };

  // Rename template
  const renameTemplate = async (id, newName) => {
    if (!userId || !newName.trim()) return;
    const ref = doc(db, 'users', userId, 'templates', id);
    await setDoc(ref, { name: newName.trim() }, { merge: true });
    setTemplates(templates => templates.map(t => t.id === id ? { ...t, name: newName.trim() } : t));
    setRenameTemplateId(null);
    setRenameValue("");
    showTemplateCardMsg('Template renamed');
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) setUserId(user.uid);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchRoutines = async () => {
      const routinesRef = collection(db, 'users', userId, 'routines');
      const snapshot = await getDocs(routinesRef);
      const data = {};
      snapshot.forEach(docSnap => {
        // Add id if missing
        data[docSnap.id] = (docSnap.data().tasks || []).map(t => ({ ...t, id: t.id || generateTaskId() }));
      });
      setRoutines(data);
    };
    fetchRoutines();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchTemplates = async () => {
      const ref = collection(db, 'users', userId, 'templates');
      const snapshot = await getDocs(ref);
      setTemplates(snapshot.docs.map(docSnap => {
        const t = docSnap.data();
        return { ...t, id: docSnap.id, tasks: (t.tasks || []).map(task => ({ ...task, id: task.id || generateTaskId() })) };
      }));
    };
    fetchTemplates();
  }, [userId]);

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
    if (!routines[selectedDay] || routines[selectedDay].length === 0) return;
    const pad = n => n.toString().padStart(2, '0');
    function addMins(time, delta) {
      let [h, m] = time.split(":").map(Number);
      let total = h * 60 + m + delta;
      if (total < 0) total = 0;
      h = Math.floor(total / 60);
      m = total % 60;
      return `${pad(h)}:${pad(m)}`;
    }
    const shifted = routines[selectedDay].map(task => ({
      ...task,
      startTime: addMins(task.startTime, mins),
      endTime: addMins(task.endTime, mins)
    }));
    setRoutines({ ...routines, [selectedDay]: shifted });
    if (!editing) setEditTasks(shifted);
    // Optionally, save to Firestore here if needed
  }

  const handleDragEnd = result => {
    if (!result.destination) return;
    const items = Array.from(editTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setEditTasks(items);
  };

  const lateBtnRef = React.useRef(null);
  const earlyBtnRef = React.useRef(null);
  const [latePopupPos, setLatePopupPos] = useState({ top: 0, left: 0, width: 0 });
  const [earlyPopupPos, setEarlyPopupPos] = useState({ top: 0, left: 0, width: 0 });

  const handleLateBtnClick = () => {
    if (!showLateBtns && lateBtnRef.current) {
      const rect = lateBtnRef.current.getBoundingClientRect();
      setLatePopupPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
    setShowLateBtns(s => !s);
    if (!showLateBtns) setShowEarlyBtns(false);
  };
  const handleEarlyBtnClick = () => {
    if (!showEarlyBtns && earlyBtnRef.current) {
      const rect = earlyBtnRef.current.getBoundingClientRect();
      setEarlyPopupPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
    setShowEarlyBtns(s => !s);
    if (!showEarlyBtns) setShowLateBtns(false);
  };

  return (
    <>
      <div id="dnd-portal-root"></div>
      <div className="routines-main-bg">
        <DrawerToggle />
        <Drawer />
        <div className="routines-container">
          <h1 className="heading-animate fade-slide-in">Routines</h1>
          <div className="routine-day-selector card-animate">
            {DAYS.map(day => (
              <button
                key={day}
                className={day === selectedDay ? 'active button-pop button-ripple' : 'button-pop button-ripple'}
                onClick={() => handleDayChange(day)}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="routine-separator" />
          <div className="routine-tasks-section">
            {!editing ? (
              <>
                <h3 style={{ color: '#47449c', fontWeight: 700 }}>{selectedDay} Routine</h3>
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
                        const progress = getTaskProgress(task, idx);
                        const currentIdx = getCurrentTaskIdx(arr);
                        return (
                          <li key={idx} style={{ background: currentIdx === idx ? '#29294a' : undefined }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span><b>{task.name}</b> ({task.startTime} - {task.endTime})</span>
                              {currentIdx === idx && progress > 0 && progress < 100 && (
                                <span style={{ color: '#5d996c', fontWeight: 700, marginLeft: 12 }}>In Progress</span>
                              )}
                              {progress === 100 && (
                                <span style={{ color: '#aaa', fontWeight: 600, marginLeft: 12 }}>Done</span>
                              )}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <div style={{ background: '#232234', borderRadius: 6, height: 14, width: '100%', overflow: 'hidden', border: '1px solid #47449c' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${progress}%`,
                                  background: currentIdx === idx ? '#5d996c' : (progress === 100 ? '#47449c' : '#47449c'),
                                  transition: 'width 0.8s cubic-bezier(.6,0,.4,1)',
                                }}></div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                ) : <div style={{ color: '#bbb', margin: '16px 0' }}>No routine set for this day.</div>}
                <div className="routine-separator" />
                <div className="routine-actions">
                  <button className="save-btn button-pop button-ripple" onClick={startEdit}>
                    Edit Routine
                  </button>
                  {routines[selectedDay] && routines[selectedDay].length > 0 && (
                    <button className="delete-btn button-pop button-ripple" onClick={deleteRoutine}>
                      Delete Routine
                    </button>
                  )}
                  {routines[selectedDay] && routines[selectedDay].length > 0 && (
                    <button
                      className="save-btn button-pop button-ripple"
                      style={{ background: '#ad7c3b', marginLeft: 0 }}
                      ref={lateBtnRef}
                      onClick={handleLateBtnClick}
                    >
                      Woke up late?
                    </button>
                  )}
                  {routines[selectedDay] && routines[selectedDay].length > 0 && (
                    <button
                      className="save-btn button-pop button-ripple"
                      style={{ background: '#5d996c', marginLeft: 0 }}
                      ref={earlyBtnRef}
                      onClick={handleEarlyBtnClick}
                    >
                      Woke up early?
                    </button>
                  )}
                </div>
                {/* Popups for expandable buttons */}
                {showLateBtns && (
                  <div
                    className="routine-action-popup"
                    style={{
                      position: 'absolute',
                      top: latePopupPos.top,
                      left: window.innerWidth <= 600 ? 'auto' : latePopupPos.left,
                      right: window.innerWidth <= 600 ? 0 : 'auto',
                      width: latePopupPos.width,
                      minWidth: 220
                    }}
                  >
                    <button className="save-btn" onClick={() => { shiftAllTasks(15); setShowLateBtns(false); }}>+15 min</button>
                    <button className="save-btn" onClick={() => { shiftAllTasks(30); setShowLateBtns(false); }}>+30 min</button>
                    <button className="save-btn" onClick={() => { shiftAllTasks(60); setShowLateBtns(false); }}>+1 hour</button>
                  </div>
                )}
                {showEarlyBtns && (
                  <div
                    className="routine-action-popup"
                    style={{
                      position: 'absolute',
                      top: earlyPopupPos.top,
                      left: window.innerWidth <= 600 ? 'auto' : earlyPopupPos.left,
                      right: window.innerWidth <= 600 ? 0 : 'auto',
                      width: earlyPopupPos.width,
                      minWidth: 220
                    }}
                  >
                    <button className="save-btn" style={{ background: '#5d996c' }} onClick={() => { shiftAllTasks(-15); setShowEarlyBtns(false); }}>-15 min</button>
                    <button className="save-btn" style={{ background: '#5d996c' }} onClick={() => { shiftAllTasks(-30); setShowEarlyBtns(false); }}>-30 min</button>
                    <button className="save-btn" style={{ background: '#5d996c' }} onClick={() => { shiftAllTasks(-60); setShowEarlyBtns(false); }}>-1 hour</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="template-actions">
                  <button className="save-btn button-pop button-ripple" onClick={() => setShowTemplateModal(true)}>
                    Save as Template
                  </button>
                  <button className="save-btn button-pop button-ripple" onClick={() => setShowApplyTemplate(true)}>
                    Apply Template
                  </button>
                  <button className="save-btn button-pop button-ripple" onClick={() => setShowEditTemplates(true)}>
                    Edit Templates
                  </button>
                </div>
                <h3 style={{ color: '#47449c', fontWeight: 700 }}>Edit {selectedDay} Routine</h3>
                <DragDropContext
                  onDragEnd={handleDragEnd}
                  getContainerForClone={() => document.getElementById('dnd-portal-root')}
                >
                  <Droppable droppableId='tasks'>
                    {(provided) => (
                      <ul className='routine-task-list' {...provided.droppableProps} ref={provided.innerRef}>
                        {editTasks.map((task, idx) => (
                          <Draggable key={task.id} draggableId={task.id} index={idx}>
                            {(provided, snapshot) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={
                                  'routine-task-edit-li' + (snapshot.isDragging ? ' dragging' : '')
                                }
                                style={{
                                  ...provided.draggableProps.style,
                                  background: '#232234',
                                  marginBottom: 8,
                                  borderRadius: 6,
                                  boxShadow: '0 2px 8px #0001',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  gap: 12,
                                  minHeight: 56
                                }}
                              >
                                <FloatingLabelInput
                                  type="text"
                                  label="Task name"
                                  value={task.name}
                                  onChange={e => handleTaskChange(idx, 'name', e.target.value)}
                                  name={`task-name-${idx}`}
                                  required
                                />
                                <FloatingLabelInput
                                  type="time"
                                  label="Start time"
                                  value={task.startTime}
                                  onChange={e => handleTaskChange(idx, 'startTime', e.target.value)}
                                  name={`task-start-${idx}`}
                                  required
                                />
                                <span style={{ margin: '0 6px', color: '#aaa' }}>to</span>
                                <FloatingLabelInput
                                  type="time"
                                  label="End time"
                                  value={task.endTime}
                                  onChange={e => handleTaskChange(idx, 'endTime', e.target.value)}
                                  name={`task-end-${idx}`}
                                  required
                                />
                                <button className="delete-btn button-pop button-ripple" style={{ marginLeft: 10, flexShrink: 0, height: 40, alignSelf: 'center', maxWidth: 90, overflow: 'hidden', whiteSpace: 'nowrap' }} onClick={() => removeTask(idx)}>
                                  Delete
                                </button>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
                <button className="save-btn button-pop button-ripple" onClick={addTask} style={{ marginTop: 10, marginRight: 8 }}>
                  + Add Task
                </button>
                <button className="save-btn button-pop button-ripple" onClick={saveRoutine} style={{ marginTop: 10 }}>
                  Save
                </button>
                <button className="cancel-btn button-pop button-ripple" onClick={() => setEditing(false)} style={{ marginTop: 10, marginLeft: 10 }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
        {/* Save as Template Card */}
        {showTemplateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#232234', borderRadius: 16, boxShadow: '0 2px 24px #0006', padding: 32, minWidth: 320, maxWidth: 400 }}>
              <h4 style={{ marginTop: 0, color: '#5d996c' }}>Save as Template</h4>
              <FloatingLabelInput
                type="text"
                label="Template name"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                name="template-name"
                required
                autoFocus
                style={{ marginBottom: 18, width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="save-btn button-pop button-ripple" onClick={saveAsTemplate} disabled={!newTemplateName.trim()}>
                  Save
                </button>
                <button className="cancel-btn button-pop button-ripple" onClick={() => setShowTemplateModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Apply Template Card */}
        {showApplyTemplate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#232234', borderRadius: 16, boxShadow: '0 2px 24px #0006', padding: 32, minWidth: 320, maxWidth: 400 }}>
              <h4 style={{ marginTop: 0, color: '#5d996c' }}>Apply Template</h4>
              {templates.length === 0 && <div style={{ marginBottom: 10, color: '#aaa' }}>No templates saved yet.</div>}
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span>{t.name}</span>
                  <button className="save-btn button-pop button-ripple" onClick={() => applyTemplateToDay(t)}>
                    Apply
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="cancel-btn button-pop button-ripple" onClick={() => setShowApplyTemplate(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Templates Card */}
        {showEditTemplates && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#232234', borderRadius: 16, boxShadow: '0 2px 24px #0006', padding: 32, minWidth: 340, maxWidth: 440 }}>
              <h4 style={{ marginTop: 0, color: '#5d996c' }}>Edit Templates</h4>
              {templates.length === 0 && <div style={{ marginBottom: 10, color: '#aaa' }}>No templates saved yet.</div>}
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <span style={{ flex: 1, cursor: 'pointer', color: '#fff' }} onClick={() => setPreviewTemplate(t)} title="Preview tasks">
                    {renameTemplateId === t.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => setRenameTemplateId(null)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameTemplate(t.id, renameValue);
                          if (e.key === 'Escape') setRenameTemplateId(null);
                        }}
                        style={{ borderRadius: 6, border: '1px solid #47449c', padding: '2px 8px', width: '80%' }}
                      />
                    ) : (
                      <span>{t.name}</span>
                    )}
                  </span>
                  {renameTemplateId === t.id ? (
                    <button className="save-btn button-pop button-ripple" style={{ padding: '2px 10px' }} onClick={() => renameTemplate(t.id, renameValue)} disabled={!renameValue.trim()}>
                      Save
                    </button>
                  ) : (
                    <button className="save-btn button-pop button-ripple" style={{ padding: '2px 10px', marginRight: 4 }} onClick={() => { setRenameTemplateId(t.id); setRenameValue(t.name); }}>
                      Rename
                    </button>
                  )}
                  <button className="delete-btn button-pop button-ripple" style={{ background: '#ff6b6b', color: '#fff', borderRadius: 8, padding: '2px 10px', border: 'none' }} onClick={() => deleteTemplate(t.id)}>
                    Delete
                  </button>
                  <button className="save-btn button-pop button-ripple" style={{ padding: '2px 10px' }} onClick={() => setPreviewTemplate(t)}>
                    Preview
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="cancel-btn button-pop button-ripple" onClick={() => setShowEditTemplates(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Preview Template Card */}
        {previewTemplate && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2100, background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#232234', borderRadius: 16, boxShadow: '0 2px 24px #0006', padding: 32, minWidth: 340, maxWidth: 440 }}>
              <h4 style={{ marginTop: 0, color: '#5d996c' }}>Template: {previewTemplate.name}</h4>
              {(!previewTemplate.tasks || previewTemplate.tasks.length === 0) ? (
                <div style={{ color: '#aaa', marginBottom: 12 }}>No tasks in this template.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 220, overflowY: 'auto' }}>
                  {previewTemplate.tasks.map((task, i) => (
                    <li key={i} style={{ background: '#181828', borderRadius: 8, marginBottom: 8, padding: '8px 14px', color: '#fff', fontSize: 15 }}>
                      <b>{task.name || <span style={{ color: '#aaa' }}>Untitled</span>}</b> <span style={{ color: '#aaa', fontWeight: 400 }}>({task.startTime} - {task.endTime})</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="cancel-btn button-pop button-ripple" onClick={() => setPreviewTemplate(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {templateMsg && (
          <div style={{ position: 'fixed', top: 30, right: 30, zIndex: 9999 }}>
            <div style={{ background: '#29294a', color: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0003', padding: '16px 32px', fontWeight: 600, fontSize: 18, minWidth: 180, textAlign: 'center' }}>
              {templateMsg}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RoutinesPage;
