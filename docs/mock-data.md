# Mock Data Spec

All simulated data hardcoded in the app's JavaScript. No external fetches.

---

## File System Tree

```javascript
const FILE_TREE = {
  name: "pipeline_project",
  type: "folder",
  children: [
    {
      name: "pipeline",
      type: "folder",
      children: [
        { name: "core.py", type: "file", desc: "PipelineRunner — the single entry point" },
        { name: "runner.py", type: "file", desc: "UniversalPipeline — assembles stages from strategies" },
        { name: "retarget.py", type: "file", desc: "HumanIKRetarget — maps source to target skeleton" },
        { name: "validation.py", type: "file", desc: "UniversalValidator + pluggable checkers" },
      ]
    },
    {
      name: "config",
      type: "folder",
      children: [
        {
          name: "clients",
          type: "folder",
          children: [
            { name: "fc.json", type: "file" },
            { name: "madden.json", type: "file" },
            { name: "battlefield.json", type: "file" },
            { name: "metaverse.json", type: "file" },
            { name: "vendor_a.json", type: "file" },
          ]
        },
        { name: "pipeline_settings.json", type: "file" },
      ]
    },
    {
      name: "adapters",
      type: "folder",
      children: [
        { name: "vicon_ingest.py", type: "file", desc: "MarkerIngest — reads .c3d via Vicon SDK" },
        { name: "moveai_ingest.py", type: "file", desc: "MarkerlessIngest — reads ML JSON" },
        { name: "fbx_export.py", type: "file", desc: "FBXExportAdapter — Maya FBX export" },
        { name: "gltf_export.py", type: "file", desc: "GLTFExportAdapter — FBX2glTF conversion" },
        { name: "usd_export.py", type: "file", desc: "USDExportAdapter — Maya USD plugin" },
        { name: "p4_delivery.py", type: "file", desc: "PerforceDelivery — P4Python submit" },
        { name: "nas_delivery.py", type: "file", desc: "NASDelivery — SMB file copy + MD5" },
        { name: "s3_delivery.py", type: "file", desc: "S3Delivery — boto3 upload" },
      ]
    },
    {
      name: "plugins",
      type: "folder",
      children: [
        { name: "metaverse_client.py", type: "file", desc: "LOD decimation, preview gen, joint count check" },
        { name: "fc_custom.py", type: "file", desc: "FC-specific facial retarget hooks" },
      ]
    },
    {
      name: "scripts",
      type: "folder",
      children: [
        { name: "batch_rename.py", type: "file", desc: "Config-driven joint renaming tool" },
        { name: "delivery_bot.py", type: "file", desc: "File watcher + Slack notification bot" },
        { name: "health_monitor.py", type: "file", desc: "Health check daemon (30s heartbeat)" },
        { name: "deploy.sh", type: "file", desc: "Symlink-based zero-downtime deploy" },
      ]
    },
  ]
};
```

---

## Client Configurations (5 profiles)

```javascript
const CLIENT_CONFIGS = {
  fc_sports: {
    client_id: "fc_sports",
    display_name: "FC (FIFA) Team",
    skeleton: {
      template: "EA_Sports_v3",
      root_joint: "Hips",
      required_joints: ["Hips","Spine","Spine1","Spine2","Head",
        "L_Shoulder","L_Arm","L_ForeArm","L_Hand",
        "R_Shoulder","R_Arm","R_ForeArm","R_Hand",
        "L_UpLeg","L_Leg","L_Foot","R_UpLeg","R_Leg","R_Foot"]
    },
    naming: { pattern: "^FC_\\d{8}_sc\\d+_sh\\d+_v\\d{3}$", example: "FC_20260228_sc01_sh05_v001" },
    export: { format: "fbx", fbx_version: "FBX202000", up_axis: "y", units: "cm", bake_animation: true },
    delivery: { method: "perforce", depot_path: "//depot/fc/mocap/", slack_channel: "#fc-mocap-delivery" },
    validation: { max_frame_count: 50000, min_frame_count: 10, check_foot_contact: true, max_residual_mm: 1.5 },
    has_plugin: true, plugin_id: "fc_custom"
  },

  madden: {
    client_id: "madden",
    display_name: "Madden Team",
    skeleton: {
      template: "Madden_v2",
      root_joint: "Hips",
      required_joints: ["Hips","Spine","Spine1","Head",
        "L_Shoulder","L_Arm","L_ForeArm","L_Hand",
        "R_Shoulder","R_Arm","R_ForeArm","R_Hand",
        "L_UpLeg","L_Leg","L_Foot","R_UpLeg","R_Leg","R_Foot"]
    },
    naming: { pattern: "^MN_[a-zA-Z]+_take\\d{2}$", example: "MN_shotName_take03" },
    export: { format: "fbx", fbx_version: "FBX202000", up_axis: "y", units: "cm", bake_animation: true },
    delivery: { method: "nas", nas_path: "\\\\nas02\\madden\\mocap\\", slack_channel: "#madden-anim" },
    validation: { max_frame_count: 30000, min_frame_count: 10, check_foot_contact: true, max_residual_mm: 2.0 },
    has_plugin: false
  },

  battlefield: {
    client_id: "battlefield",
    display_name: "Battlefield",
    skeleton: {
      template: "Frostbite_Generic",
      root_joint: "Root",
      required_joints: ["Root","Hips","Spine","Spine1","Spine2","Neck","Head",
        "L_Shoulder","L_Arm","L_ForeArm","L_Hand",
        "R_Shoulder","R_Arm","R_ForeArm","R_Hand",
        "L_UpLeg","L_Leg","L_Foot","R_UpLeg","R_Leg","R_Foot"]
    },
    naming: { pattern: "^BF_[a-zA-Z0-9]+_[a-zA-Z]+$", example: "BF_actor01_sprint" },
    export: { format: "fbx", fbx_version: "FBX201900", up_axis: "y", units: "cm", bake_animation: true },
    delivery: { method: "perforce", depot_path: "//depot/bf/anim/raw/", slack_channel: "#bf-pipeline" },
    validation: { max_frame_count: 100000, min_frame_count: 5, check_foot_contact: false, max_residual_mm: 1.0 },
    has_plugin: false
  },

  metaverse: {
    client_id: "metaverse",
    display_name: "Metaverse Partner",
    skeleton: {
      template: "MetaHuman_compat",
      root_joint: "Hips",
      required_joints: ["Hips","Spine","Head",
        "L_Shoulder","L_Arm","L_Hand",
        "R_Shoulder","R_Arm","R_Hand",
        "L_UpLeg","L_Leg","L_Foot","R_UpLeg","R_Leg","R_Foot"]
    },
    naming: { pattern: "^MV_[a-zA-Z0-9]+_[a-z]+$", example: "MV_avatar01_walk" },
    export: { format: "gltf", up_axis: "y", units: "m" },
    delivery: { method: "s3", s3_bucket: "ea-metaverse-delivery", slack_channel: "#metaverse-drops" },
    validation: { max_frame_count: 10000, min_frame_count: 10, max_joint_count: 50, max_residual_mm: 5.0 },
    has_plugin: true, plugin_id: "metaverse_client"
  },

  vendor_a: {
    client_id: "vendor_a",
    display_name: "External Vendor A",
    skeleton: {
      template: "Vendor_Custom",
      root_joint: "root",
      required_joints: ["root","hips","spine","chest","head",
        "l_shoulder","l_arm","l_hand","r_shoulder","r_arm","r_hand",
        "l_thigh","l_shin","l_foot","r_thigh","r_shin","r_foot"]
    },
    naming: { pattern: "^VEND_\\d{6}_take\\d+$", example: "VEND_260228_take5" },
    export: { format: "fbx", fbx_version: "FBX202000", up_axis: "z", units: "m" },
    delivery: { method: "sftp", sftp_host: "sftp.vendor-a.com", slack_channel: "#vendor-drops" },
    validation: { max_frame_count: 50000, min_frame_count: 10, max_residual_mm: 2.0 },
    has_plugin: false
  }
};
```

---

## CaptureResult Transforms Per Stage

The data packet evolves as it passes through each stage. Below is the state at each point:

### After INGEST
```json
{
  "take_name": "FC_20260228_sc01_sh05",
  "frame_rate": 120.0,
  "frame_count": 3450,
  "source_technology": "marker",
  "source_vendor": "vicon",
  "source_file": "/captures/raw/sc01_sh05.c3d",
  "confidence": 1.0,
  "joints": "{ 54 joints loaded }",
  "joint_hierarchy": "{ 54 parent→child mappings }",
  "metadata": { "session": "2026-02-28", "actor": "Actor_A" }
}
```

### After CLEANUP
```json
{
  "...": "all previous fields +",
  "cleanup_applied": ["marker_swap_fix (3 swaps)", "occlusion_gap_fill (12 gaps)", "butterworth_filter (6Hz cutoff)"],
  "joints": "{ 54 joints — cleaned }"
}
```

### After RETARGET (convergence point — same for both technologies)
```json
{
  "...": "all previous fields +",
  "target_skeleton": "EA_Sports_v3",
  "joints_remapped": true,
  "joints": "{ 18 joints (target skeleton) }",
  "joint_map_used": "maps/fc_joint_map.json"
}
```

### After VALIDATE
```json
{
  "...": "all previous fields +",
  "validation_results": [
    { "checker": "naming", "passed": true, "message": "Matches ^FC_\\d{8}..." },
    { "checker": "skeleton", "passed": true, "message": "All 18 required joints present" },
    { "checker": "frame_range", "passed": true, "message": "3450 within [10, 50000]" },
    { "checker": "root_origin", "passed": true, "message": "Root 0.3cm from origin" },
    { "checker": "integrity", "passed": true, "message": "Valid FBX header" }
  ]
}
```

### After EXPORT
```json
{
  "...": "all previous fields +",
  "output_path": "/output/fc/FC_20260228_sc01_sh05_v001.fbx",
  "output_format": "fbx",
  "fbx_version": "FBX202000",
  "adapter_used": "FBXExportAdapter",
  "file_size_mb": 12.4
}
```

### After DELIVER
```json
{
  "...": "all previous fields +",
  "delivery_method": "perforce",
  "delivery_destination": "//depot/fc/mocap/FC_20260228_sc01_sh05_v001.fbx",
  "delivery_md5": "a1b2c3d4e5f6...",
  "delivery_timestamp": "2026-02-28T14:23:45",
  "notification_sent": "#fc-mocap-delivery"
}
```

### Markerless variant (INGEST stage differs)
```json
{
  "take_name": "FC_20260228_sc01_sh05",
  "frame_rate": 30.0,
  "frame_count": 862,
  "source_technology": "markerless",
  "source_vendor": "moveai",
  "source_file": "/captures/video/sc01_sh05.mp4",
  "confidence": 0.87,
  "joints": "{ 32 joints loaded }",
  "metadata": { "session": "2026-02-28", "model_version": "moveai_v3.2" }
}
```

### Markerless CLEANUP differs
```json
{
  "cleanup_applied": ["temporal_smooth (gaussian σ=2)", "bone_length_stabilize", "contact_estimation (heuristic)", "confidence_filter (low-conf frames smoothed)"]
}
```

---

## Simulated File Contents

When a file is clicked in the explorer, the inspector shows a simulated preview. Keep these short (15-25 lines max) — just enough to communicate what the file does.

### pipeline/runner.py
```python
class UniversalPipeline:
    STRATEGIES = {
        "marker":     { "ingest": MarkerIngest, "cleanup": MarkerCleanup },
        "markerless": { "ingest": MarkerlessIngest, "cleanup": MarkerlessCleanup },
    }
    
    def process(self, input_path, technology, client_id):
        profile = self.registry.get_profile(client_id)
        strategies = self.STRATEGIES[technology]
        
        # Divergent stages
        data = strategies["ingest"]().ingest(input_path)
        data = strategies["cleanup"]().cleanup(data)
        
        # ── CONVERGENCE POINT ──
        data = HumanIKRetarget().retarget(data, profile.skeleton_template)
        results = UniversalValidator(profile).validate(data)
        
        adapter = get_export_adapter(profile)
        adapter.export(data, output_path, profile)
        
        get_delivery_adapter(profile).deliver(output_path, profile)
```

### pipeline/validation.py
```python
class UniversalValidator:
    def validate(self, data):
        checkers = [
            check_naming, check_skeleton,
            check_frame_range, check_root_origin,
            check_integrity
        ]
        # Run all checkers (parallelizable)
        return [c(data, self.profile) for c in checkers]
```

### adapters/fbx_export.py
```python
class FBXExportAdapter(BaseExportAdapter):
    def export(self, scene_data, output_path, profile):
        fbx_version = profile.get("export","fbx_version")
        mel.eval(f'FBXExportFileVersion -v "{fbx_version}"')
        if profile.get("export","bake_animation"):
            mel.eval('FBXExportBakeComplexAnimation -v true')
        cmds.file(output_path, force=True, type="FBX export")
```

### adapters/gltf_export.py
```python
class GLTFExportAdapter(BaseExportAdapter):
    def export(self, scene_data, output_path, profile):
        temp_fbx = output_path.replace('.gltf', '_temp.fbx')
        FBXExportAdapter().export(scene_data, temp_fbx, profile)
        subprocess.run(["FBX2glTF", "--input", temp_fbx,
                        "--output", output_path, "--binary"])
```

### plugins/metaverse_client.py
```python
def register():
    return { 'client_id': 'metaverse_partner', 'version': '1.0' }

def pre_export(scene_data, profile):
    decimator.reduce_to_target(scene_data, max_tris=5000)

def post_export(output_path, profile):
    preview_gen.create_turntable(output_path)

def custom_validate(scene_data, profile):
    joints = len(scene_data.get_joints())
    if joints > 50:
        return False, f"Too many joints: {joints}"
    return True, "OK"
```

### config/clients/fc.json
(Use the fc_sports config from CLIENT_CONFIGS above, formatted as JSON)

---

## Stage → Active Files Mapping

| Stage | Active Files (highlighted in explorer) |
|-------|---------------------------------------|
| INGEST | `pipeline/core.py`, `adapters/vicon_ingest.py` (or `moveai_ingest.py`) |
| CLEANUP | `pipeline/core.py`, `adapters/vicon_ingest.py` (cleanup methods) |
| RETARGET | `pipeline/retarget.py`, `config/clients/{client}.json` |
| VALIDATE | `pipeline/validation.py`, plugin if client has one |
| EXPORT | `adapters/fbx_export.py` (or `gltf_export.py`, `usd_export.py`), plugin hooks |
| DELIVER | `adapters/p4_delivery.py` (or `nas_delivery.py`, `s3_delivery.py`), `scripts/delivery_bot.py` |

---

## Plugin Hook Registry

| Hook | When Called | Clients With Hooks |
|------|-----------|-------------------|
| `pre_export` | Before export adapter runs | metaverse (LOD decimation) |
| `post_export` | After export file written | metaverse (turntable gen) |
| `custom_validate` | After core validation | metaverse (joint count check) |
| `custom_retarget` | After HumanIK | fc_custom (facial retarget) |
