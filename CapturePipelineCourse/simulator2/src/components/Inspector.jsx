import { useSimState } from '../engine/SimContext';
import { CL, FC, STAGES } from '../data/data';
import { highlightPy, buildJsonTreeHTML } from '../utils/utils';

export default function Inspector() {
  const { state, setActiveTab } = useSimState();
  const { inspectorTab, selectedFile, packet, prevPacket } = state;
  const c = CL[state.client];
  const tabs = ["data", "config", "adapter", "hooks", "logs"];

  function renderContent() {
    if (inspectorTab === "data") {
      if (!selectedFile && packet) {
        return (
          <div>
            <h4 className="inspector-title">📦 Data Packet</h4>
            <div className="inspector-subtitle">After stage: {STAGES[state.step] || "—"}</div>
            <div
              className="jtree"
              dangerouslySetInnerHTML={{ __html: buildJsonTreeHTML(packet, 0, prevPacket || undefined) }}
            />
          </div>
        );
      }
      if (selectedFile && FC[selectedFile]) {
        return (
          <div>
            <h4 className="inspector-title">{selectedFile.split('/').pop()}</h4>
            <div dangerouslySetInnerHTML={{ __html: highlightPy(FC[selectedFile]) }} />
          </div>
        );
      }
      return <div className="inspector-empty">Select a file or run the simulation to inspect data.</div>;
    }
    if (inspectorTab === "config") {
      if (selectedFile && FC[selectedFile]) {
        return (
          <div>
            <h4 className="inspector-title">{selectedFile.split('/').pop()}</h4>
            <div dangerouslySetInnerHTML={{ __html: highlightPy(FC[selectedFile]) }} />
          </div>
        );
      }
      // Show client config as JSON
      return (
        <div>
          <h4 className="inspector-title">Client: {c.display}</h4>
          <div
            className="jtree"
            dangerouslySetInnerHTML={{ __html: buildJsonTreeHTML(c, 0) }}
          />
        </div>
      );
    }
    if (inspectorTab === "adapter") {
      const adapterFile = selectedFile && FC[selectedFile] ? selectedFile : null;
      if (adapterFile) {
        return (
          <div>
            <h4 className="inspector-title">{adapterFile.split('/').pop()}</h4>
            <div dangerouslySetInnerHTML={{ __html: highlightPy(FC[adapterFile]) }} />
          </div>
        );
      }
      return <div className="inspector-empty">No adapter file selected.</div>;
    }
    if (inspectorTab === "hooks") {
      const hooksDone = state.hooksDone;
      if (hooksDone.length === 0) {
        return <div className="inspector-empty">No hooks have fired yet. Run the simulation with a plugin-enabled client (FC or Metaverse).</div>;
      }
      return (
        <div>
          <h4 className="inspector-title">⚙️ Hook Activity</h4>
          {hooksDone.map((h, i) => (
            <div key={i} className="hook-entry">
              <span className="hook-badge">✓</span> {h}
            </div>
          ))}
        </div>
      );
    }
    if (inspectorTab === "logs") {
      return (
        <div>
          <h4 className="inspector-title">Partitioned Logs</h4>
          <div className="log-partitions">
            {["Cloud", "Stage", "Storage", "System"].map(partition => {
              const filtered = state.logs.filter(l => l.nodeLoc === partition);
              if (filtered.length === 0) return null;
              return (
                <div key={partition} className="log-partition">
                  <div className="log-partition-title">{partition}</div>
                  {filtered.map((l, i) => (
                    <div key={i} className={"log-line log-" + l.level}>{l.msg}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="inspector">
      <div className="inspector-tabs">
        {tabs.map(t => (
          <div
            key={t}
            className={"inspector-tab" + (inspectorTab === t ? " active" : "")}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>
      <div className="inspector-content" id="inspector-body">
        {renderContent()}
      </div>
    </div>
  );
}
