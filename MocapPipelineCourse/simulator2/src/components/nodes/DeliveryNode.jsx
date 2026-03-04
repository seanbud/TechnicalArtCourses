import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function DeliveryNode({ data }) {
  const { delivery, isActive, step, cbState, nasEnabled, destPath, onClickStorage } = data;
  const d = delivery;
  const isNasOffline = (d.id === "nas" && !nasEnabled);

  let cls = "dnode";
  cls += isActive ? " active-dest" : " inactive-dest";
  if (isNasOffline && isActive) cls += " nas-offline";

  let dotCls = "";
  if (isActive && step === 5) {
    dotCls = ({ CLOSED: "cb-closed", OPEN: "cb-open", HALF_OPEN: "cb-half" })[cbState] || "cb-closed";
  }

  return (
    <div className={cls} onClick={() => isActive && onClickStorage?.()}>
      <Handle
        type="target"
        position={Position.Left}
        id={d.id}
        style={{ background: isActive ? '#6366f1' : '#555', width: 6, height: 6 }}
      />
      <div className="dname">
        {d.icon} {d.label}
        {dotCls && <span className={"cb-dot " + dotCls}></span>}
      </div>
      <div className="ddest">{isActive ? (destPath || d.proto) : d.proto}</div>
    </div>
  );
}

export default memo(DeliveryNode);
