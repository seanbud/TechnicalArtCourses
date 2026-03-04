import { useState, useCallback } from 'react';
import { SimProvider, useSimState } from './engine/SimContext';
import { CL, STAGES } from './data/data';
import PipelineGraph from './components/PipelineGraph';
import FileTree from './components/FileTree';
import FileLocation from './components/FileLocation';
import Inspector from './components/Inspector';
import Console from './components/Console';
import Modal from './components/Modal';
import './index.css';

function AppInner() {
  const { state, setClient, setTech, onNext, onReset, toggleAuto, toggleNasFailure, inspectPacket } = useSimState();
  const [modal, setModal] = useState(null); // { type, key }

  const openModal = useCallback((type, key) => {
    setModal({ type, key });
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const c = CL[state.client];
  const isRunning = state.running && state.step >= 0;
  const isDone = state.step >= STAGES.length;

  return (
    <div className="app">
      {/* NAV */}
      <nav className="nav">
        <span className="nav-title">Pipeline Simulator <span className="nav-badge">React Flow</span></span>
      </nav>

      {/* FILE EXPLORER */}
      <FileTree />

      {/* PIPELINE */}
      <div className="pipeline">
        <div className="control-bar">
          <label>Client:</label>
          <select id="sel-client" value={state.client} onChange={(e) => setClient(e.target.value)}>
            <option value="fc_sports">FC (FIFA)</option>
            <option value="madden">Madden</option>
            <option value="battlefield">Battlefield</option>
            <option value="metaverse">Metaverse</option>
            <option value="vendor_a">Vendor A</option>
          </select>
          <label>Tech:</label>
          <select id="sel-tech" value={state.tech} onChange={(e) => setTech(e.target.value)}>
            <option value="marker">⚡ Marker</option>
            <option value="markerless">📷 Markerless</option>
          </select>
          <div className="control-sep"></div>
          <button
            className="btn btn-send"
            onClick={onNext}
            disabled={isDone}
          >
            {!isRunning ? "▶ Start" : isDone ? "✅ Done" : "Next ▶"}
          </button>
          {isRunning && (
            <button className="btn" onClick={onReset}>↻ Reset</button>
          )}
          <button
            className={"btn btn-auto" + (state.autoPlay ? " active" : "")}
            onClick={toggleAuto}
          >
            {state.autoPlay ? "⏸ Pause" : "▶▶ Auto"}
          </button>
          <div className="control-sep"></div>
          <button
            className={"btn btn-fail" + (!state.nasEnabled ? " active-fail" : "")}
            onClick={toggleNasFailure}
          >
            {state.nasEnabled ? "💥 NAS Failure" : "🚨 NAS OFFLINE"}
          </button>
        </div>
        <div className="pgraph" id="pgraph">
          <PipelineGraph onOpenModal={openModal} />
        </div>
        <FileLocation onOpenModal={openModal} />
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          {state.packet && (
            <div className="data-packet" onClick={inspectPacket}>
              📦 {state.packet.take_name || ''}
            </div>
          )}
        </div>
      </div>

      {/* INSPECTOR */}
      <Inspector />

      {/* CONSOLE */}
      <Console />

      {/* MODAL */}
      {modal && (
        <Modal type={modal.type} itemKey={modal.key} onClose={closeModal} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SimProvider>
      <AppInner />
    </SimProvider>
  );
}
