import { useSimState } from '../engine/SimContext';
import { CL, STAGES, FILE_LOC } from '../data/data';

export default function FileLocation({ onOpenModal }) {
  const { state } = useSimState();

  if (state.step < 0 || !state.packet) return null;

  const stage = STAGES[state.step];
  if (!stage) return null;

  const c = CL[state.client];
  let loc;
  if (stage === "ingest") loc = FILE_LOC.ingest[state.tech];
  else if (stage === "deliver") loc = FILE_LOC.deliver[c.delivery.method] || FILE_LOC.deliver.perforce;
  else loc = FILE_LOC[stage] ? FILE_LOC[stage].any : null;

  if (!loc) return null;

  const path = loc.path
    .replace("{TAKE}", c.naming.example)
    .replace("{CLIENT}", c.id)
    .replace("{FMT}", c.export.format)
    .replace("{BUCKET}", c.delivery.s3_bucket || "")
    .replace("{HOST}", c.delivery.sftp_host || "");

  return (
    <div className="file-location">
      <span className="file-loc-path">📁 {path}</span>
      <span className="file-loc-sep">·</span>
      <span
        className="file-loc-storage"
        onClick={() => onOpenModal?.('storage', loc.storage_id)}
      >
        {loc.storage}
      </span>
    </div>
  );
}
