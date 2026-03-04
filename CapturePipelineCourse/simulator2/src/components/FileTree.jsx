import { useState, useCallback } from 'react';
import { useSimState } from '../engine/SimContext';
import { TREE, FC } from '../data/data';

const DEFAULT_EXPANDED = new Set([
  "capture_pipeline", "capture_pipeline/pipeline", "capture_pipeline/config",
  "capture_pipeline/config/clients", "capture_pipeline/adapters",
  "capture_pipeline/plugins", "capture_pipeline/scripts"
]);

export default function FileTree() {
  const { state, selectFile } = useSimState();
  const [expandedDirs, setExpandedDirs] = useState(DEFAULT_EXPANDED);

  const toggleDir = useCallback((path) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  function buildTree(items, prefix) {
    return items.map((item) => {
      const fullPath = prefix ? prefix + "/" + item.n : item.n;
      if (item.t === "d") {
        const isOpen = expandedDirs.has(fullPath);
        return (
          <div key={fullPath}>
            <div
              className="ftree-dir"
              onClick={() => toggleDir(fullPath)}
            >
              <span className="ftree-icon">{isOpen ? "▾" : "▸"}</span>
              <span className="ftree-folder">{isOpen ? "📂" : "📁"}</span>
              {item.n}
            </div>
            {isOpen && item.c && (
              <div className="ftree-children">
                {buildTree(item.c, fullPath)}
              </div>
            )}
          </div>
        );
      }
      const isActive = state.activeFiles.includes(fullPath);
      const isSelected = state.selectedFile === fullPath;
      let cls = "ftree-file";
      if (isActive) cls += " ftree-active";
      if (isSelected) cls += " ftree-selected";
      return (
        <div
          key={fullPath}
          className={cls}
          onClick={() => selectFile(fullPath)}
        >
          <span className="ftree-icon">📄</span>
          {item.n}
        </div>
      );
    });
  }

  return (
    <div className="files">
      <div className="files-header">Project Explorer</div>
      <div className="ftree-root">
        {buildTree(TREE, "")}
      </div>
    </div>
  );
}
