import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ConvergenceNode() {
  return (
    <div className="conv-cell" style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} id="top" style={{ background: 'transparent', border: 'none', top: '20%' }} />
      <Handle type="target" position={Position.Left} id="bottom" style={{ background: 'transparent', border: 'none', top: '80%' }} />
      <div className="conv-v-group">
        <div className="conv-v-bar"></div>
        <div className="conv-label-v">Convergence Point</div>
        <div className="conv-v-bar"></div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
}

export default memo(ConvergenceNode);
