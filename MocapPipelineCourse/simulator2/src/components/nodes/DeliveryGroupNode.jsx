import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function DeliveryGroupNode({ data }) {
  const { deliveries, activeMethod, step, cbState, nasEnabled } = data;

  return (
    <div className="deliver-col" style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 6, height: 6 }} />
      {deliveries.map((d) => {
        const isActive = d.id === activeMethod;
        const isNasOffline = (d.id === "nas" && !nasEnabled);
        let cls = isActive ? "active-dest" : "inactive-dest";
        if (isNasOffline && isActive) cls += " nas-offline";

        let extra = "";
        if (isActive && step === 5) {
          const cc = ({ CLOSED: "cb-closed", OPEN: "cb-open", HALF_OPEN: "cb-half" })[cbState] || "cb-closed";
          extra = cc;
        }

        return (
          <div key={d.id} className={"dnode " + cls}>
            <div className="dname">
              {d.icon} {d.label}
              {extra && <span className={"cb-dot " + extra}></span>}
            </div>
            <div className="ddest">{isActive ? (data.destPath || d.proto) : d.proto}</div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(DeliveryGroupNode);
