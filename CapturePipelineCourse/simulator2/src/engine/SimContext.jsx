import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { STAGES, CL, SF, getExpAdapter, getDelAdapter, getDest } from '../data/data.js';

const SimContext = createContext(null);

export function useSimState() {
  return useContext(SimContext);
}

const INITIAL_STATE = {
  client: "fc_sports",
  tech: "marker",
  step: -1,
  selectedFile: null,
  activeFiles: [],
  inspectorTab: "data",
  packet: null,
  logs: [],
  valIdx: 0,
  cbState: "CLOSED",
  retries: 0,
  queueCount: 0,
  hooksDone: [],
  nasEnabled: true,
  prevPacket: null,
  running: false,
  autoPlay: false,
};

export function SimProvider({ children }) {
  const [state, setState] = useState({ ...INITIAL_STATE });
  const autoTimerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const addLog = useCallback((level, msg, nodeLoc, stage) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { level, msg, nodeLoc, stage, ts: new Date() }]
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  const setClient = useCallback((clientId) => {
    setState(prev => ({ ...prev, client: clientId }));
    addLog("info", "ClientRegistry: loaded " + CL[clientId].display);
  }, [addLog]);

  const setTech = useCallback((tech) => {
    setState(prev => ({ ...prev, tech }));
    addLog("info", "StrategyRegistry: swapped to " + tech);
  }, [addLog]);

  const selectFile = useCallback((path) => {
    setState(prev => {
      const c = CL[prev.client];
      let tab = prev.inspectorTab;
      if (path && (path.includes("adapters/") || path.includes("delivery"))) tab = "adapter";
      else if (path && path.includes("plugins/")) tab = "hooks";
      else tab = "config";
      return { ...prev, selectedFile: path, inspectorTab: tab };
    });
  }, []);

  const setActiveTab = useCallback((tab) => {
    setState(prev => ({ ...prev, inspectorTab: tab }));
  }, []);

  const clickStage = useCallback((stage, preserveSelection) => {
    setState(prev => {
      const wasInspectingPacket = (prev.inspectorTab === "data" && prev.selectedFile === null && prev.packet !== null);
      const c = CL[prev.client];
      let activeFiles = [];
      if (stage === "ingest" || stage === "cleanup") activeFiles = SF[stage][prev.tech] || [];
      else if (stage === "retarget" || stage === "validate") {
        activeFiles = [...(SF[stage].both || [])];
        if (stage === "validate" && c.plugin) activeFiles.push("plugins/" + c.plugin + ".py");
      } else if (stage === "export") {
        activeFiles = [...(SF[stage][c.export.format] || [])];
        if (c.plugin) activeFiles.push("plugins/" + c.plugin + ".py");
      } else if (stage === "deliver") {
        activeFiles = SF[stage][c.delivery.method] || [];
      }

      let selectedFile = activeFiles.length > 0 ? activeFiles[0] : null;
      let inspectorTab;
      if (stage === "export" || stage === "deliver") inspectorTab = "adapter";
      else if (stage === "validate" && c.plugin) inspectorTab = "hooks";
      else inspectorTab = "data";

      if (preserveSelection && wasInspectingPacket) {
        selectedFile = null;
        inspectorTab = "data";
      }

      return { ...prev, activeFiles, selectedFile, inspectorTab };
    });
  }, []);

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setState(prev => ({ ...prev, autoPlay: false }));
  }, []);

  const advanceStep = useCallback(async () => {
    const S = stateRef.current;
    const prevPacket = S.packet ? JSON.parse(JSON.stringify(S.packet)) : null;
    const newStep = S.step + 1;

    if (newStep >= STAGES.length) {
      setState(prev => ({ ...prev, step: newStep, prevPacket }));
      addLog("success", "✅ Pipeline complete: " + S.packet.output_path, "System");
      stopAuto();
      return;
    }

    const stage = STAGES[newStep];
    const c = CL[S.client];

    // Set step first
    setState(prev => ({ ...prev, step: newStep, prevPacket }));

    // Click stage for file selection
    clickStage(stage, true);

    if (stage === "ingest") {
      const take = c.naming.example;
      const packet = {
        take_name: take,
        frame_rate: S.tech === "marker" ? 120 : 30,
        frame_count: S.tech === "marker" ? 3450 : 862,
        source_technology: S.tech,
        source_vendor: S.tech === "marker" ? "vicon" : "moveai",
        source_file: S.tech === "marker" ? "/captures/raw/" + take + ".c3d" : "/captures/video/" + take + ".mp4",
        confidence: S.tech === "marker" ? 1.0 : 0.87,
        joints: S.tech === "marker" ? "{ 54 joints }" : "{ 32 joints }",
        metadata: { session: "2026-02-28", actor: "Actor_A" }
      };
      setState(prev => ({ ...prev, packet }));
      await new Promise(r => setTimeout(r, 400));
      addLog("info", (S.tech === "marker" ? "MarkerIngest" : "MarkerlessIngest") + ": reading " + packet.source_file, "Stage");
    } else if (stage === "cleanup") {
      const cleanup_applied = S.tech === "marker"
        ? ["marker_swap_fix (3)", "gap_fill (12)", "butterworth (6Hz)"]
        : ["temporal_smooth", "bone_stabilize", "contact_est", "conf_filter"];
      setState(prev => ({ ...prev, packet: { ...prev.packet, cleanup_applied } }));
      await new Promise(r => setTimeout(r, 600));
      addLog("info", (S.tech === "marker" ? "MarkerCleanup" : "MarkerlessCleanup") + ": " + cleanup_applied[0], S.tech === "marker" ? "Stage" : "Cloud");
    } else if (stage === "retarget") {
      setState(prev => ({
        ...prev,
        packet: {
          ...prev.packet,
          target_skeleton: c.skeleton.template,
          joints_remapped: true,
          joints: "{ " + c.skeleton.required.length + " joints (target) }"
        }
      }));
      await new Promise(r => setTimeout(r, 500));
      addLog("info", "HumanIKRetarget: → " + c.skeleton.template, "Cloud");
      if (c.plugin === "fc_custom") {
        await new Promise(r => setTimeout(r, 300));
        setState(prev => ({ ...prev, hooksDone: [...prev.hooksDone, "custom_retarget"] }));
        addLog("plugin", "Hook: fc_custom.custom_retarget()", "Cloud");
      }
    } else if (stage === "validate") {
      const checks = ["naming", "skeleton", "frames", "root", "integrity"];
      setState(prev => ({ ...prev, valIdx: -1, packet: { ...prev.packet, validation_results: [] } }));
      for (let i = 0; i < checks.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        setState(prev => ({
          ...prev,
          valIdx: i,
          packet: {
            ...prev.packet,
            validation_results: [...(prev.packet.validation_results || []), { checker: checks[i], passed: true }]
          }
        }));
        addLog("success", "Checker [" + checks[i] + "]: ✓ PASS", "Cloud");
      }
      if (c.plugin === "metaverse_client") {
        await new Promise(r => setTimeout(r, 200));
        setState(prev => ({ ...prev, hooksDone: [...prev.hooksDone, "custom_validate"] }));
        addLog("plugin", "Hook: custom_validate() — OK", "Cloud");
      }
    } else if (stage === "export") {
      if (c.plugin === "metaverse_client") {
        await new Promise(r => setTimeout(r, 250));
        setState(prev => ({ ...prev, hooksDone: [...prev.hooksDone, "pre_export"] }));
        addLog("plugin", "Hook: pre_export() — LOD 5k tris", "Cloud");
      }
      const output_path = "/output/" + c.id + "/" + c.naming.example + "_v001." + c.export.format;
      setState(prev => ({
        ...prev,
        packet: {
          ...prev.packet,
          output_path,
          adapter_used: getExpAdapter(c),
          output_format: c.export.format
        }
      }));
      await new Promise(r => setTimeout(r, 450));
      addLog("info", "Factory: " + getExpAdapter(c) + " → '" + c.export.format + "'", "Cloud");
      if (c.plugin === "metaverse_client") {
        await new Promise(r => setTimeout(r, 300));
        setState(prev => ({ ...prev, hooksDone: [...prev.hooksDone, "post_export"] }));
        addLog("plugin", "Hook: post_export() — turntable", "Cloud");
      }
    } else if (stage === "deliver") {
      if (!stateRef.current.nasEnabled && c.delivery.method === "nas") {
        addLog("error", "[System] NASDelivery: connection timeout (SMB Error 0x80070035)", "Storage");
        for (let r = 1; r <= 3; r++) {
          setState(prev => ({ ...prev, retries: r }));
          addLog("warn", "[System] Retrying NAS mount (attempt " + r + "/3)...", "Storage");
          await new Promise(res => setTimeout(res, 800));
        }
        setState(prev => ({ ...prev, cbState: "OPEN" }));
        addLog("critical", "[System] Circuit Breaker: OPEN (Fail-Fast mode)", "System");
        setState(prev => ({ ...prev, queueCount: 1 }));
        addLog("info", "[System] High-Availability: Queued take to local staging SSD.", "Stage");
        await new Promise(res => setTimeout(res, 1500));

        setState(prev => ({ ...prev, cbState: "HALF_OPEN" }));
        addLog("warn", "[System] Circuit Breaker: HALF_OPEN (Testing heartbeat)", "System");
        await new Promise(res => setTimeout(res, 1000));

        setState(prev => ({ ...prev, cbState: "CLOSED", queueCount: 0 }));
        addLog("success", "[System] Circuit Breaker: CLOSED (Healed)", "System");
        addLog("info", "[System] Flushing staging queue to NAS...", "Storage");
      }

      setState(prev => ({
        ...prev,
        packet: {
          ...prev.packet,
          delivery_method: c.delivery.method,
          delivery_destination: getDest(c) + c.naming.example + "." + c.export.format,
          md5_hash: "e4d909c290d0fb1ca068ffaddf22cbd" + Math.floor(Math.random() * 9),
          delivery_timestamp: new Date().toISOString(),
          notification_sent: c.delivery.slack
        }
      }));
      await new Promise(res => setTimeout(res, 700));
      addLog("success", getDelAdapter(c) + ": delivered (MD5 verified)", "Storage");
      await new Promise(res => setTimeout(res, 200));
      addLog("info", "Slack → " + c.delivery.slack, "System");
    }
  }, [addLog, clickStage, stopAuto]);

  const onNext = useCallback(async () => {
    const S = stateRef.current;
    if (S.step === -1) {
      // Start sim
      setState(prev => ({
        ...prev,
        step: -1,
        running: true,
        hooksDone: [],
        retries: 0,
        queueCount: 0,
        cbState: "CLOSED",
        valIdx: undefined,
      }));
      const c = CL[stateRef.current.client];
      addLog("info", "PipelineRunner: starting for " + c.display + " (" + stateRef.current.tech + ")", "System");
      if (c.plugin) {
        setTimeout(() => {
          addLog("plugin", "PluginManager: loaded " + c.plugin + ".py", "Cloud");
          setState(prev => ({ ...prev, hooksDone: [...prev.hooksDone, "register"] }));
        }, 300);
      }
      await advanceStep();
      return;
    }
    if (S.step >= STAGES.length) return;
    await advanceStep();
  }, [advanceStep, addLog]);

  const onReset = useCallback(() => {
    stopAuto();
    setState(prev => ({
      ...INITIAL_STATE,
      client: prev.client,
      tech: prev.tech,
      logs: prev.logs,
    }));
    addLog("info", "Pipeline reset", "System");
  }, [stopAuto, addLog]);

  const toggleNasFailure = useCallback(() => {
    setState(prev => {
      if (prev.nasEnabled) {
        addLog("critical", "[System] Simulated NAS Hardware Failure initiated!");
        return { ...prev, nasEnabled: false };
      } else {
        addLog("info", "[System] NAS Storage restored. Circuit Breaker resetting...");
        return {
          ...prev,
          nasEnabled: true,
          cbState: prev.cbState === "OPEN" ? "HALF_OPEN" : prev.cbState,
        };
      }
    });
  }, [addLog]);

  const scheduleAutoNext = useCallback(() => {
    const doNext = async () => {
      const S = stateRef.current;
      if (!S.autoPlay || S.step >= STAGES.length - 1) {
        stopAuto();
        return;
      }
      await advanceStep();
      // schedule next only if still in autoplay
      if (stateRef.current.autoPlay) {
        autoTimerRef.current = setTimeout(doNext, 2500);
      }
    };
    autoTimerRef.current = setTimeout(doNext, 2500);
  }, [advanceStep, stopAuto]);

  const toggleAuto = useCallback(async () => {
    const S = stateRef.current;
    if (S.autoPlay) {
      stopAuto();
      return;
    }
    setState(prev => ({ ...prev, autoPlay: true }));
    if (S.step === -1) {
      setState(prev => ({
        ...prev,
        running: true,
        hooksDone: [],
        retries: 0,
        queueCount: 0,
        cbState: "CLOSED",
        valIdx: undefined,
      }));
      const c = CL[stateRef.current.client];
      addLog("info", "PipelineRunner: starting for " + c.display + " (" + stateRef.current.tech + ")", "System");
      if (c.plugin) {
        setTimeout(() => {
          addLog("plugin", "PluginManager: loaded " + c.plugin + ".py", "Cloud");
          setState(prev => ({ ...prev, hooksDone: [...prev.hooksDone, "register"] }));
        }, 300);
      }
      await advanceStep();
    }
    // schedule the auto-advance loop
    setTimeout(() => {
      if (stateRef.current.autoPlay) {
        scheduleAutoNext();
      }
    }, 100);
  }, [advanceStep, addLog, stopAuto, scheduleAutoNext]);

  const inspectPacket = useCallback(() => {
    setState(prev => ({ ...prev, selectedFile: null, inspectorTab: "data" }));
  }, []);

  const value = {
    state,
    setState,
    addLog,
    clearLogs,
    setClient,
    setTech,
    selectFile,
    setActiveTab,
    clickStage,
    onNext,
    onReset,
    toggleNasFailure,
    toggleAuto,
    inspectPacket,
  };

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
