// ═══════════════════════════════════════════
// data.js — Mock data constants
// ═══════════════════════════════════════════

const STAGES = ["ingest","cleanup","retarget","validate","export","deliver"];

const TREE = [
  {n:"pipeline",t:"d",c:[{n:"core.py",t:"f"},{n:"runner.py",t:"f"},{n:"retarget.py",t:"f"},{n:"validation.py",t:"f"}]},
  {n:"config",t:"d",c:[{n:"clients",t:"d",c:[{n:"fc.json",t:"f"},{n:"madden.json",t:"f"},{n:"battlefield.json",t:"f"},{n:"metaverse.json",t:"f"},{n:"vendor_a.json",t:"f"}]},{n:"pipeline_settings.json",t:"f"}]},
  {n:"adapters",t:"d",c:[{n:"vicon_ingest.py",t:"f"},{n:"moveai_ingest.py",t:"f"},{n:"fbx_export.py",t:"f"},{n:"gltf_export.py",t:"f"},{n:"p4_delivery.py",t:"f"},{n:"nas_delivery.py",t:"f"},{n:"s3_delivery.py",t:"f"}]},
  {n:"plugins",t:"d",c:[{n:"metaverse_client.py",t:"f"},{n:"fc_custom.py",t:"f"}]},
  {n:"scripts",t:"d",c:[{n:"batch_rename.py",t:"f"},{n:"delivery_bot.py",t:"f"},{n:"health_monitor.py",t:"f"}]}
];

const CL = {
  fc_sports:{id:"fc_sports",display:"FC (FIFA)",skeleton:{template:"EA_Sports_v3",root:"Hips",required:["Hips","Spine","Spine1","Spine2","Head","L_Shoulder","L_Arm","L_ForeArm","L_Hand","R_Shoulder","R_Arm","R_ForeArm","R_Hand","L_UpLeg","L_Leg","L_Foot","R_UpLeg","R_Leg","R_Foot"]},naming:{example:"FC_20260228_sc01_sh05_v001"},export:{format:"fbx",fbx_version:"FBX202000",up_axis:"y",units:"cm"},delivery:{method:"perforce",depot_path:"//depot/fc/mocap/",slack:"#fc-mocap-delivery"},validation:{max_frames:50000,min_frames:10,max_residual:1.5},plugin:"fc_custom"},
  madden:{id:"madden",display:"Madden",skeleton:{template:"Madden_v2",root:"Hips",required:["Hips","Spine","Head","L_Arm","L_Hand","R_Arm","R_Hand","L_UpLeg","L_Foot","R_UpLeg","R_Foot"]},naming:{example:"MN_shotName_take03"},export:{format:"fbx",fbx_version:"FBX202000",up_axis:"y",units:"cm"},delivery:{method:"nas",nas_path:"\\\\nas02\\madden\\mocap\\",slack:"#madden-anim"},validation:{max_frames:30000,min_frames:10,max_residual:2.0},plugin:null},
  battlefield:{id:"battlefield",display:"Battlefield",skeleton:{template:"Frostbite_Generic",root:"Root",required:["Root","Hips","Spine","Head","L_Arm","L_Hand","R_Arm","R_Hand","L_UpLeg","L_Foot","R_UpLeg","R_Foot"]},naming:{example:"BF_actor01_sprint"},export:{format:"fbx",fbx_version:"FBX201900",up_axis:"y",units:"cm"},delivery:{method:"perforce",depot_path:"//depot/bf/anim/raw/",slack:"#bf-pipeline"},validation:{max_frames:100000,min_frames:5,max_residual:1.0},plugin:null},
  metaverse:{id:"metaverse",display:"Metaverse",skeleton:{template:"MetaHuman_compat",root:"Hips",required:["Hips","Spine","Head","L_Arm","L_Hand","R_Arm","R_Hand","L_UpLeg","L_Foot","R_UpLeg","R_Foot"]},naming:{example:"MV_avatar01_walk"},export:{format:"gltf",up_axis:"y",units:"m"},delivery:{method:"s3",s3_bucket:"ea-metaverse-delivery",slack:"#metaverse-drops"},validation:{max_frames:10000,min_frames:10,max_residual:5.0},plugin:"metaverse_client"},
  vendor_a:{id:"vendor_a",display:"Vendor A",skeleton:{template:"Vendor_Custom",root:"root",required:["root","hips","spine","head","l_arm","l_hand","r_arm","r_hand","l_thigh","l_foot","r_thigh","r_foot"]},naming:{example:"VEND_260228_take5"},export:{format:"fbx",fbx_version:"FBX202000",up_axis:"z",units:"m"},delivery:{method:"sftp",sftp_host:"sftp.vendor-a.com",slack:"#vendor-drops"},validation:{max_frames:50000,min_frames:10,max_residual:2.0},plugin:null}
};

const FC = {
"pipeline/runner.py":"class UniversalPipeline:\n    STRATEGIES = {\n        \"marker\":     {\n            \"ingest\":  MarkerIngest,\n            \"cleanup\": MarkerCleanup\n        },\n        \"markerless\": {\n            \"ingest\":  MarkerlessIngest,\n            \"cleanup\": MarkerlessCleanup\n        },\n    }\n\n    def process(self, input_path, technology, client_id):\n        profile = self.registry.get_profile(client_id)\n        strategies = self.STRATEGIES[technology]\n\n        # ── Divergent stages (technology-specific) ──\n        data = strategies[\"ingest\"]().ingest(input_path)\n        data = strategies[\"cleanup\"]().cleanup(data)\n\n        # ── CONVERGENCE POINT ──\n        data = HumanIKRetarget().retarget(data, profile.skeleton_template)\n        results = UniversalValidator(profile).validate(data)\n\n        adapter = get_export_adapter(profile)  # Factory pattern\n        adapter.export(data, output_path, profile)\n        get_delivery_adapter(profile).deliver(output_path, profile)",
"pipeline/core.py":"class PipelineRunner:\n    \"\"\"Entry point — orchestrates the full pipeline.\"\"\"\n\n    def __init__(self):\n        self.registry = ClientRegistry(\"/config/clients/\")\n        self.plugin_mgr = PluginManager(\"/plugins/\")\n        self.pipeline = UniversalPipeline()\n\n    def run(self, input_path, client_id, technology=\"marker\"):\n        log.info(f\"Starting pipeline for {client_id} ({technology})\")\n        profile = self.registry.get_profile(client_id)\n        self.plugin_mgr.load_plugins_for(client_id)\n        self.pipeline.process(input_path, technology, client_id)\n        log.info(\"Pipeline complete ✅\")",
"pipeline/validation.py":"class UniversalValidator:\n    \"\"\"Runs pluggable validation checkers.\"\"\"\n\n    def validate(self, data, profile):\n        checkers = [\n            check_naming,       # filename matches client regex\n            check_skeleton,     # all required joints present\n            check_frame_range,  # frame count within bounds\n            check_root_origin,  # root near world origin\n            check_integrity,    # valid FBX header\n        ]\n        results = [checker(data, profile) for checker in checkers]\n        return results",
"pipeline/retarget.py":"class HumanIKRetarget:\n    \"\"\"Maps source skeleton to target (client) skeleton.\"\"\"\n\n    def retarget(self, data, target_skeleton):\n        joint_map = load_joint_map(target_skeleton)\n        for src, tgt in joint_map.items():\n            data.joints[tgt] = data.joints.pop(src)\n        data.target_skeleton = target_skeleton\n        data.joints_remapped = True\n        return data",
"adapters/fbx_export.py":"class FBXExportAdapter(BaseExportAdapter):\n    def export(self, data, output_path, profile):\n        fbx_ver = profile.export[\"fbx_version\"]\n        mel.eval(f'FBXExportFileVersion -v \"{fbx_ver}\"')\n        if profile.export.get(\"bake_animation\"):\n            mel.eval('FBXExportBakeComplexAnimation -v true')\n        cmds.file(output_path, force=True, type=\"FBX export\")",
"adapters/gltf_export.py":"class GLTFExportAdapter(BaseExportAdapter):\n    def export(self, data, output_path, profile):\n        temp_fbx = output_path.replace('.gltf', '_temp.fbx')\n        FBXExportAdapter().export(data, temp_fbx, profile)\n        subprocess.run([\"FBX2glTF\", \"--input\", temp_fbx,\n                        \"--output\", output_path, \"--binary\"])",
"adapters/vicon_ingest.py":"class MarkerIngest(IngestStage):\n    def ingest(self, input_path):\n        raw = vicon_sdk.read_c3d(input_path)\n        result = CaptureResult()\n        result.source_technology = \"marker\"\n        result.source_vendor = \"vicon\"\n        result.joints = raw.get_marker_positions()\n        result.frame_rate = raw.sample_rate   # 120fps\n        result.confidence = 1.0\n        return result",
"adapters/moveai_ingest.py":"class MarkerlessIngest(IngestStage):\n    def ingest(self, input_path):\n        ml_data = moveai_sdk.process_video(input_path)\n        result = CaptureResult()\n        result.source_technology = \"markerless\"\n        result.source_vendor = \"moveai\"\n        result.joints = ml_data.joint_predictions\n        result.frame_rate = ml_data.fps   # 30fps\n        result.confidence = ml_data.avg_confidence\n        return result",
"adapters/p4_delivery.py":"class PerforceDelivery(BaseDeliveryAdapter):\n    def deliver(self, output_path, profile):\n        depot = profile.delivery[\"depot_path\"]\n        p4 = P4(); p4.connect()\n        p4.run(\"add\", output_path)\n        p4.run(\"submit\", \"-d\", f\"Auto: {os.path.basename(output_path)}\")\n        notify_slack(profile.delivery[\"slack\"], output_path)",
"adapters/nas_delivery.py":"class NASDelivery(BaseDeliveryAdapter):\n    @circuit_breaker(max_failures=3, reset_timeout=30)\n    @retry(max_attempts=3, delay=2.0, backoff=2.0)\n    def deliver(self, output_path, profile):\n        nas_path = profile.delivery[\"nas_path\"]\n        dest = os.path.join(nas_path, os.path.basename(output_path))\n        shutil.copy2(output_path, dest)\n        verify_md5(output_path, dest)\n        notify_slack(profile.delivery[\"slack\"], dest)",
"adapters/s3_delivery.py":"class S3Delivery(BaseDeliveryAdapter):\n    def deliver(self, output_path, profile):\n        bucket = profile.delivery[\"s3_bucket\"]\n        key = f\"mocap/{os.path.basename(output_path)}\"\n        boto3.client(\"s3\").upload_file(output_path, bucket, key)\n        notify_slack(profile.delivery[\"slack\"], f\"s3://{bucket}/{key}\")",
"plugins/metaverse_client.py":"def register():\n    return {\"client_id\": \"metaverse\", \"version\": \"1.0\"}\n\ndef pre_export(data, profile):\n    decimator.reduce_to_target(data, max_tris=5000)\n\ndef post_export(output_path, profile):\n    preview_gen.create_turntable(output_path)\n\ndef custom_validate(data, profile):\n    if len(data.joints) > 50:\n        return False, f\"Too many joints: {len(data.joints)}\"\n    return True, \"Joint count OK\"",
"plugins/fc_custom.py":"def register():\n    return {\"client_id\": \"fc_sports\", \"version\": \"2.1\"}\n\ndef custom_retarget(data, profile):\n    facial_map = load_fc_facial_map()\n    data.blendshapes = map_facial_markers(data, facial_map)\n    return data",
"scripts/batch_rename.py":"\"\"\"Config-driven batch bone renaming tool.\"\"\"\ndef batch_rename(fbx_path, joint_map_path):\n    with open(joint_map_path) as f:\n        mapping = json.load(f)\n    for src, tgt in mapping.items():\n        if cmds.objExists(src):\n            cmds.rename(src, tgt)\n    cmds.file(fbx_path, force=True, save=True)",
"scripts/delivery_bot.py":"\"\"\"File watcher — sweeps into pipeline.\"\"\"\nclass DeliveryBot:\n    def __init__(self, watch_dir, pipeline):\n        self.observer = Observer()\n        self.observer.schedule(self, watch_dir, recursive=True)\n    def on_created(self, event):\n        if event.src_path.endswith('.c3d'):\n            self.pipeline.run(event.src_path)\n            slack.post(f\"Auto-processed: {event.src_path}\")",
"scripts/health_monitor.py":"\"\"\"Health check — 30s heartbeat.\"\"\"\ndef check_all():\n    checks = {\"NAS\": ping_nas(), \"Perforce\": check_p4_connection(),\n              \"Farm\": check_deadline_status(), \"Disk\": check_disk_space() > 0.1}\n    for name, ok in checks.items():\n        if not ok:\n            alert_slack(f\"🚨 {name} is DOWN\", severity=\"critical\")"
};

const STAGE_INFO = {
  ingest:{title:"Ingest Stage",desc:"Reads raw capture data from the source hardware. Marker-based uses Vicon SDK to read .c3d files; markerless uses Move.ai to process video. This is the DIVERGENT part — each technology has its own IngestStage implementation via the Strategy Pattern.",pattern:"Strategy Pattern",lesson:"09-real-ea-pipeline.html",code:"pipeline/runner.py"},
  cleanup:{title:"Cleanup Stage",desc:"Technology-specific post-processing. Marker path fixes marker swaps and fills occlusion gaps. Markerless applies temporal smoothing and bone length stabilization. Still DIVERGENT — different strategies for different tech.",pattern:"Strategy Pattern",lesson:"09-real-ea-pipeline.html",code:"pipeline/runner.py"},
  retarget:{title:"Retarget Stage",desc:"Maps source skeleton joints onto the client's target skeleton using HumanIK. This is the FIRST universal stage — identical for both technologies. The convergence point: both pipelines produce the same CaptureResult format.",pattern:"Template Method",lesson:"12-universal-pipeline.html",code:"pipeline/retarget.py"},
  validate:{title:"Validation Stage",desc:"Runs 5 pluggable checkers in parallel: naming convention, skeleton integrity, frame range, root origin, and file integrity. Plugins can add custom validators like the metaverse joint count check.",pattern:"Plugin Architecture",lesson:"11-defensive-architecture.html",code:"pipeline/validation.py"},
  export:{title:"Export Stage",desc:"The Factory Pattern selects the correct export adapter based on the client config (FBX, glTF). Plugin hooks fire here — pre_export for LOD decimation, post_export for preview generation.",pattern:"Adapter + Factory",lesson:"10-pipeline-centralization.html",code:"adapters/fbx_export.py"},
  deliver:{title:"Delivery Stage",desc:"Delivers the exported file to the client's destination. Protected by Circuit Breaker pattern and retry decorator. If NAS goes down, data queues to local SSD and auto-flushes on recovery.",pattern:"Circuit Breaker + Retry",lesson:"11-defensive-architecture.html",code:"adapters/nas_delivery.py"}
};

const SF = {
  ingest:{marker:["pipeline/core.py","adapters/vicon_ingest.py"],markerless:["pipeline/core.py","adapters/moveai_ingest.py"]},
  cleanup:{marker:["pipeline/core.py","adapters/vicon_ingest.py"],markerless:["pipeline/core.py","adapters/moveai_ingest.py"]},
  retarget:{both:["pipeline/retarget.py"]},validate:{both:["pipeline/validation.py"]},
  export:{fbx:["adapters/fbx_export.py"],gltf:["adapters/gltf_export.py"]},
  deliver:{perforce:["adapters/p4_delivery.py","scripts/delivery_bot.py"],nas:["adapters/nas_delivery.py","scripts/delivery_bot.py"],s3:["adapters/s3_delivery.py","scripts/delivery_bot.py"],sftp:["adapters/s3_delivery.py"]}
};

const DELIVERIES = [
  {id:"perforce",label:"Perforce",proto:"P4Python",icon:"📦"},
  {id:"nas",label:"NAS (SMB)",proto:"SMB + MD5",icon:"🗄️"},
  {id:"s3",label:"S3 Bucket",proto:"boto3 API",icon:"☁️"},
  {id:"sftp",label:"SFTP",proto:"paramiko",icon:"🔐"}
];

// File location per stage — path + storage medium
const FILE_LOC = {
  ingest:   {marker:{path:"/captures/raw/{TAKE}.c3d",    storage:"📡 Capture Stage (Local)"},
             markerless:{path:"/captures/video/{TAKE}.mp4",storage:"📡 Capture Stage (Local)"}},
  cleanup:  {any:{path:"/pipeline/working/{TAKE}_cleaned.c3d",  storage:"💻 Processing Node (Local SSD)"}},
  retarget: {any:{path:"/pipeline/working/{TAKE}_retargeted.ma",storage:"💻 Processing Node (Local SSD)"}},
  validate: {any:{path:"/pipeline/working/{TAKE}_validated.ma", storage:"💻 Processing Node (Local SSD)"}},
  export:   {any:{path:"/output/{CLIENT}/{TAKE}_v001.{FMT}",   storage:"💻 Processing Node (Local SSD)"}},
  deliver:  {perforce:{path:"//depot/{CLIENT}/mocap/{TAKE}_v001.{FMT}",storage:"🗄️ Perforce Server"},
             nas:{path:"\\\\nas02\\{CLIENT}\\mocap\\{TAKE}_v001.{FMT}",storage:"🗄️ NAS (SMB Share)"},
             s3:{path:"s3://{BUCKET}/mocap/{TAKE}_v001.{FMT}",storage:"☁️ AWS S3"},
             sftp:{path:"{HOST}:/{TAKE}_v001.{FMT}",storage:"🔐 External SFTP"}}
};
