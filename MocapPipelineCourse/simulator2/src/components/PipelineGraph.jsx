import { useMemo, useCallback, useState } from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import StageNode from './nodes/StageNode';
import ValidateNode from './nodes/ValidateNode';
import DeliveryNode from './nodes/DeliveryNode';
import ConvergenceNode from './nodes/ConvergenceNode';
import TechLabelNode from './nodes/TechLabelNode';
import { useSimState } from '../engine/SimContext';
import { CL, STAGES, DELIVERIES, getExpAdapter, getDelAdapter } from '../data/data';

const nodeTypes = {
  stageNode: StageNode,
  validateNode: ValidateNode,
  deliveryNode: DeliveryNode,
  convergenceNode: ConvergenceNode,
  techLabelNode: TechLabelNode,
};

// Layout constants — wider spacing for comfortable fit
const ROW_MARKER = 20;
const ROW_UNIVERSAL = 160;
const ROW_MARKERLESS = 300;
const NODE_W = 160;
const COL_GAP = 80;

function buildNodes(state, onClickStage, onInfoStage, onClickStorage) {
  const c = CL[state.client];
  const isMk = state.tech === "marker";
  const step = state.step;

  const nodes = [];

  // ── Marker Track ──
  nodes.push({
    id: 'mk-ingest',
    type: 'stageNode',
    position: { x: 0, y: ROW_MARKER },
    data: {
      stage: 'ingest', name: 'Ingest', sub: 'Vicon .c3d',
      active: isMk, step, stageIdx: 0,
      dimmed: !isMk,
      onClick: onClickStage, onInfo: onInfoStage,
    },
  });
  nodes.push({
    id: 'mk-cleanup',
    type: 'stageNode',
    position: { x: NODE_W + COL_GAP, y: ROW_MARKER },
    data: {
      stage: 'cleanup', name: 'Cleanup', sub: 'Swap Fix / Gap Fill',
      active: isMk, step, stageIdx: 1,
      dimmed: !isMk,
      onClick: onClickStage, onInfo: onInfoStage,
    },
  });

  // ── Markerless Track ──
  nodes.push({
    id: 'ml-ingest',
    type: 'stageNode',
    position: { x: 0, y: ROW_MARKERLESS },
    data: {
      stage: 'ingest', name: 'Ingest', sub: 'Move.ai Video',
      active: !isMk, step, stageIdx: 0,
      dimmed: isMk,
      onClick: onClickStage, onInfo: onInfoStage,
    },
  });
  nodes.push({
    id: 'ml-cleanup',
    type: 'stageNode',
    position: { x: NODE_W + COL_GAP, y: ROW_MARKERLESS },
    data: {
      stage: 'cleanup', name: 'Cleanup', sub: 'ML Jitter Filter',
      active: !isMk, step, stageIdx: 1,
      dimmed: isMk,
      onClick: onClickStage, onInfo: onInfoStage,
    },
  });

  // ── Convergence ──
  nodes.push({
    id: 'convergence',
    type: 'convergenceNode',
    position: { x: (NODE_W + COL_GAP) * 2, y: ROW_MARKER - 10 },
    data: {},
  });

  // ── Universal stages ──
  const convX = (NODE_W + COL_GAP) * 2 + 80;
  nodes.push({
    id: 'retarget',
    type: 'stageNode',
    position: { x: convX + COL_GAP, y: ROW_UNIVERSAL },
    data: {
      stage: 'retarget', name: 'Retarget', sub: 'HumanIK → ' + c.skeleton.template,
      active: true, step, stageIdx: 2,
      onClick: onClickStage, onInfo: onInfoStage,
      hookPing: state.hooksDone.includes('custom_retarget') ? 'custom_retarget' : null,
    },
  });
  nodes.push({
    id: 'validate',
    type: 'validateNode',
    position: { x: convX + COL_GAP + (NODE_W + COL_GAP), y: ROW_UNIVERSAL },
    data: {
      step, valIdx: state.valIdx,
      onClick: onClickStage, onInfo: onInfoStage,
      hookPing: state.hooksDone.includes('custom_validate') ? 'custom_validate' : null,
    },
  });
  nodes.push({
    id: 'export',
    type: 'stageNode',
    position: { x: convX + COL_GAP + (NODE_W + COL_GAP) * 2, y: ROW_UNIVERSAL },
    data: {
      stage: 'export', name: 'Export',
      sub: (c.export.format === "gltf" ? "GLTF" : "FBX") + " via " + getExpAdapter(c),
      active: true, step, stageIdx: 4,
      onClick: onClickStage, onInfo: onInfoStage,
      hookPing: state.hooksDone.includes('pre_export') || state.hooksDone.includes('post_export') ? 'export hooks' : null,
    },
  });

  // ── Individual Delivery Nodes ──
  const dm = c.delivery.method;
  let destPath = "";
  if (dm === "perforce") destPath = c.delivery.depot_path || "";
  else if (dm === "nas") destPath = c.delivery.nas_path || "";
  else if (dm === "s3") destPath = c.delivery.s3_bucket ? "s3://" + c.delivery.s3_bucket + "/" : "";
  else if (dm === "sftp") destPath = c.delivery.sftp_host || "";

  const delivX = convX + COL_GAP + (NODE_W + COL_GAP) * 3 + 20;
  DELIVERIES.forEach((d, i) => {
    const isActive = d.id === dm;
    nodes.push({
      id: 'del-' + d.id,
      type: 'deliveryNode',
      position: { x: delivX, y: ROW_MARKER - 20 + i * 80 },
      data: {
        delivery: d,
        isActive,
        step,
        cbState: state.cbState,
        nasEnabled: state.nasEnabled,
        destPath: isActive ? destPath : "",
        onClickStorage: isActive ? onClickStorage : undefined,
      },
    });
  });

  return nodes;
}

function buildEdges(state) {
  const isMk = state.tech === "marker";
  const step = state.step;
  const c = CL[state.client];
  const dm = c.delivery.method;

  const mkColor = isMk ? '#6366f1' : '#444';
  const mlColor = !isMk ? '#6366f1' : '#444';

  const edges = [];

  // Marker track
  edges.push({
    id: 'e-mk-ingest-cleanup',
    source: 'mk-ingest', target: 'mk-cleanup',
    animated: isMk && step >= 1,
    label: 'Raw CaptureResult',
    style: { stroke: mkColor, strokeWidth: 2, opacity: isMk ? 1 : 0.3 },
    labelStyle: { fill: '#94a3b8', fontSize: 10, opacity: isMk ? 1 : 0.3 },
    className: 'edge-hover-label',
  });
  edges.push({
    id: 'e-mk-cleanup-conv',
    source: 'mk-cleanup', target: 'convergence', targetHandle: 'top',
    animated: isMk && step >= 1,
    style: { stroke: mkColor, strokeWidth: 2, opacity: isMk ? 1 : 0.3 },
  });

  // Markerless track
  edges.push({
    id: 'e-ml-ingest-cleanup',
    source: 'ml-ingest', target: 'ml-cleanup',
    animated: !isMk && step >= 1,
    label: 'Raw CaptureResult',
    style: { stroke: mlColor, strokeWidth: 2, opacity: !isMk ? 1 : 0.3 },
    labelStyle: { fill: '#94a3b8', fontSize: 10, opacity: !isMk ? 1 : 0.3 },
    className: 'edge-hover-label',
  });
  edges.push({
    id: 'e-ml-cleanup-conv',
    source: 'ml-cleanup', target: 'convergence', targetHandle: 'bottom',
    animated: !isMk && step >= 1,
    style: { stroke: mlColor, strokeWidth: 2, opacity: !isMk ? 1 : 0.3 },
  });

  // Universal stages
  edges.push({
    id: 'e-conv-retarget',
    source: 'convergence', target: 'retarget',
    animated: step >= 2,
    label: 'Remapped joints',
    style: { stroke: step >= 2 ? '#6366f1' : '#555', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: 10 },
    className: 'edge-hover-label',
  });
  edges.push({
    id: 'e-retarget-validate',
    source: 'retarget', target: 'validate',
    animated: step >= 3,
    label: 'Validated data',
    style: { stroke: step >= 3 ? '#6366f1' : '#555', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: 10 },
    className: 'edge-hover-label',
  });
  edges.push({
    id: 'e-validate-export',
    source: 'validate', target: 'export',
    animated: step >= 4,
    label: c.export.format.toUpperCase() + ' file',
    style: { stroke: step >= 4 ? '#6366f1' : '#555', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: 10 },
    className: 'edge-hover-label',
  });

  // ── Per-destination delivery edges ──
  DELIVERIES.forEach((d) => {
    const isActive = d.id === dm;
    edges.push({
      id: 'e-export-del-' + d.id,
      source: 'export',
      target: 'del-' + d.id,
      targetHandle: d.id,
      animated: isActive && step >= 5,
      label: isActive ? getDelAdapter(c) : undefined,
      style: {
        stroke: isActive ? (step >= 5 ? '#6366f1' : '#555') : '#333',
        strokeWidth: isActive ? 2 : 1,
        strokeDasharray: isActive ? undefined : '4 4',
        opacity: isActive ? 1 : 0.2,
      },
      labelStyle: isActive ? { fill: '#94a3b8', fontSize: 10 } : undefined,
      className: isActive ? 'edge-hover-label' : '',
    });
  });

  return edges;
}

export default function PipelineGraph({ onOpenModal }) {
  const { state, clickStage } = useSimState();
  const [hoverAll, setHoverAll] = useState(false);

  const onClickStage = useCallback((stage) => {
    clickStage(stage, false);
  }, [clickStage]);

  const onInfoStage = useCallback((stage) => {
    onOpenModal?.('info', stage);
  }, [onOpenModal]);

  const onClickStorage = useCallback(() => {
    const c = CL[state.client];
    const stage = STAGES[state.step];
    let storageId;
    if (stage === "deliver") {
      const loc = { perforce: "perforce", nas: "nas", s3: "s3", sftp: "sftp" };
      storageId = loc[c.delivery.method] || "perforce";
    }
    if (storageId) onOpenModal?.('storage', storageId);
  }, [state.client, state.step, onOpenModal]);

  const nodes = useMemo(() => buildNodes(state, onClickStage, onInfoStage, onClickStorage),
    [state.client, state.tech, state.step, state.cbState, state.nasEnabled, state.hooksDone, state.valIdx, onClickStage, onInfoStage, onClickStorage]);

  const edges = useMemo(() => buildEdges(state),
    [state.client, state.tech, state.step, state.cbState]);

  return (
    <div 
      style={{ width: '100%', height: '100%' }}
      className={hoverAll ? "show-all-labels" : ""}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={true}
        zoomOnPinch={false}
        fitView
        onEdgeMouseEnter={() => setHoverAll(true)}
        onEdgeMouseLeave={() => setHoverAll(false)}
        fitViewOptions={{ padding: 0.35, minZoom: 0.5, maxZoom: 1.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" color="#555" gap={24} size={1.5} />
      </ReactFlow>
    </div>
  );
}
