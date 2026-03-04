import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function TechLabelNode({ data }) {
  const { label, type, dimmed } = data;
  return (
    <div className={`tech-label ${type}-label${dimmed ? ' dimmed' : ''}`} style={{ position: 'relative' }}>
      {label}
      <Handle type="source" position={Position.Right} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
}

export default memo(TechLabelNode);
