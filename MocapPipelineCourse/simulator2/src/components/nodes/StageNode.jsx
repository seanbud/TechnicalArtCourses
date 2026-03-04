import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function StageNode({ data }) {
  const { stage, name, sub, active, step, stageIdx, onClick, onInfo, dimmed, hookPing } = data;

  const isActive = step === stageIdx && active;
  const isCompleted = step > stageIdx && active;
  const isFailed = stage === "deliver" && data.cbState === "OPEN";

  let cls = "snode";
  if (isActive) cls += " active";
  else if (isCompleted) cls += " completed";
  if (isFailed) cls += " failed";
  if (dimmed) cls += " dimmed";

  return (
    <div className={cls} onClick={() => onClick?.(stage)} style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 6, height: 6}} />
      <span className="sinfo" onClick={(e) => { e.stopPropagation(); onInfo?.(stage); }}>ⓘ</span>
      <div className="sname">{name}</div>
      <div className="ssub">{sub}</div>
      {isCompleted && <span className="sbadge" style={{ display: 'flex' }}>✓</span>}
      {hookPing && <div className="hook-ping">⚙️ {hookPing}</div>}
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 6, height: 6 }} />
    </div>
  );
}

export default memo(StageNode);
