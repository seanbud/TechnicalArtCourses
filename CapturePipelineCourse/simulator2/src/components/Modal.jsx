import { STAGE_INFO, STORAGE_INFO, FC, STAGES } from '../data/data';
import { highlightPy, buildJsonTreeHTML } from '../utils/utils';
import { useSimState } from '../engine/SimContext';

export default function Modal({ type, itemKey, onClose }) {
  const { state, selectFile } = useSimState();

  if (!type) return null;

  let title = "";
  let sub = "";
  let bodyHTML = "";

  if (type === "info" && STAGE_INFO[itemKey]) {
    const info = STAGE_INFO[itemKey];
    title = info.title;
    sub = "Pattern: " + info.pattern;
    bodyHTML = '<div class="modal-section"><p>' + info.desc + '</p></div>' +
      '<div class="modal-section"><h4>Source Code</h4>' + highlightPy(FC[info.code] || "") + '</div>';
  } else if (type === "storage" && STORAGE_INFO[itemKey]) {
    const sInfo = STORAGE_INFO[itemKey];
    title = "Storage Logistics";
    sub = sInfo.title;
    bodyHTML = '<div class="modal-section"><p>' + sInfo.desc + '</p></div>';
  } else if (type === "packet" && state.packet) {
    title = "Data Packet — " + state.packet.take_name;
    sub = "After stage: " + (STAGES[state.step] || "complete");
    bodyHTML = '<div class="jtree">' + buildJsonTreeHTML(state.packet) + '</div>';
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>{title}</h3>
        <div className="modal-sub">{sub}</div>
        <div dangerouslySetInnerHTML={{ __html: bodyHTML }} />
      </div>
    </div>
  );
}
