import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ValidateNode({ data }) {
  const { step, onClick, onInfo, hookPing } = data;
  const stageIdx = 3; // validate is index 3 in STAGES
  const isActive = step === stageIdx;
  const isCompleted = step > stageIdx;

  let cls = "snode";
  if (isActive) cls += " active";
  else if (isCompleted) cls += " completed";

  const valIdx = data.valIdx;
  const labels = ["N", "S", "F", "R", "I"];

  return (
    <div className={cls} onClick={() => onClick?.("validate")} style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 6, height: 6 }} />
      <span className="sinfo" onClick={(e) => { e.stopPropagation(); onInfo?.("validate"); }}>ⓘ</span>
      <div className="sname">Validate</div>
      <div className="ssub">5 Checkers</div>
      <div className="vchecks">
        {labels.map((l, i) => {
          const passed = isCompleted || (isActive && valIdx !== undefined && i <= valIdx);
          return (
            <div key={i} className={"vck" + (passed ? " pass" : "")}>
              {passed ? "✓" : l}
            </div>
          );
        })}
      </div>
      {isCompleted && <span className="sbadge" style={{ display: 'flex' }}>✓</span>}
      {hookPing && <div className="hook-ping">⚙️ {hookPing}</div>}
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 6, height: 6 }} />
    </div>
  );
}

export default memo(ValidateNode);
