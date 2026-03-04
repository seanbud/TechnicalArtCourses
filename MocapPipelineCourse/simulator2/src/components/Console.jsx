import { useEffect, useRef } from 'react';
import { useSimState } from '../engine/SimContext';

export default function Console() {
  const { state, clearLogs } = useSimState();
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs.length]);

  return (
    <>
      <div className="console-header">
        <span>System Console</span>
        <button className="btn-clear" onClick={clearLogs}>Clear</button>
      </div>
      <div className="console" id="console-log">
        {state.logs.map((entry, i) => (
          <div key={i} className={"log-entry log-" + entry.level}>
            <span className="log-ts">{entry.ts.toLocaleTimeString()}</span>
            {entry.nodeLoc && <span className="log-loc">[{entry.nodeLoc}]</span>}
            <span className="log-msg">{entry.msg}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </>
  );
}
