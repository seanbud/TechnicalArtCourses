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
"pipeline/runner.py":
`class UniversalPipeline:
    """Orchestrates the convergent/divergent execution flow."""
    
    # Strategy Pattern: Define logic for different capture techs
    STRATEGIES = {
        "marker": {
            "ingest":  MarkerIngest,
            "cleanup": MarkerCleanup
        },
        "markerless": {
            "ingest":  MarkerlessIngest,
            "cleanup": MarkerlessCleanup
        },
    }

    def process(self, input_path, technology, client_id):
        profile    = self.registry.get_profile(client_id)
        strategies = self.STRATEGIES[technology]

        # ── DIVERGENT STAGES (Technology-Specific) ──
        # Injecting technology-specific adapters
        data = strategies["ingest"]().ingest(input_path)
        data = strategies["cleanup"]().cleanup(data)

        # ── CONVERGENCE POINT ──
        # Both paths join here to use universal logic
        data = HumanIKRetarget().retarget(
            data, 
            profile.skeleton_template
        )
        
        results = UniversalValidator(profile).validate(data)

        # ── ADAPTERS (Client-Specific Export) ──
        # Factory Pattern: Resolve correct exporter
        adapter = get_export_adapter(profile)
        adapter.export(data, output_path, profile)

        # ── DELIVERY ──
        # Final handoff to destination medium
        get_delivery_adapter(profile).deliver(
            output_path, 
            profile
        )`,

"pipeline/core.py":
`class PipelineRunner:
    """The master entry point for the entire capture system."""

    def __init__(self):
        self.registry   = ClientRegistry("/config/clients/")
        self.plugin_mgr = PluginManager("/plugins/")
        self.pipeline   = UniversalPipeline()

    def run(self, input_path, client_id, technology="marker"):
        log.info(f"Starting pipeline flow for {client_id} ({technology})")
        
        # Resolve client profile and load any logic overrides
        profile = self.registry.get_profile(client_id)
        self.plugin_mgr.load_plugins_for(client_id)
        
        # Execute core pipeline logic
        self.pipeline.process(
            input_path, 
            technology, 
            client_id
        )
        
        log.info("Pipeline execution complete ✅")`,

"pipeline/validation.py":
`class UniversalValidator:
    """Runs a series of pluggable readiness checks on capture data."""

    def validate(self, data, profile):
        # Dispatch table for automated quality gates
        checkers = [
            check_naming,       # Matches client regex pattern
            check_skeleton,     # Verifies critical joint presence
            check_frame_range,  # Frame count health check
            check_root_origin,  # Actor world-space origin check
            check_integrity,    # FBX stream binary integrity
        ]

        # Iterative execution and reporting
        results = [
            checker(data, profile) 
            for checker in checkers
        ]
        
        return results`,

"pipeline/retarget.py":
`class HumanIKRetarget:
    """Standardizes source skeleton to the target client delivery spec."""

    def retarget(self, data, target_skeleton):
        joint_map = load_joint_map(target_skeleton)
        
        # Perform 1:1 joint redirection
        for src, tgt in joint_map.items():
            if src in data.joints:
                data.joints[tgt] = data.joints.pop(src)
        
        # Update simulation state metadata
        data.target_skeleton = target_skeleton
        data.joints_remapped = True
        
        return data`,

"adapters/fbx_export.py":
`class FBXExportAdapter(BaseExportAdapter):
    """Factory-spawned adapter for standard Maya/FBX output."""

    def export(self, data, output_path, profile):
        fbx_ver = profile.export["fbx_version"]
        
        # Maya API / MEL Configuration
        mel.eval(f'FBXExportFileVersion -v "{fbx_ver}"')
        
        if profile.export.get("bake_animation"):
            mel.eval('FBXExportBakeComplexAnimation -v true')
        
        # Trigger native binary export
        cmds.file(
            output_path, 
            force=True, 
            type="FBX export"
        )`,

"adapters/gltf_export.py":
`class GLTFExportAdapter(BaseExportAdapter):
    """Adapter for Real-time web/mobile delivery (glTF 2.0)."""

    def export(self, data, output_path, profile):
        # Intermediary format for conversion
        temp_fbx = output_path.replace('.gltf', '_temp.fbx')
        
        # Step 1: Maya FBX Export
        FBXExportAdapter().export(data, temp_fbx, profile)
        
        # Step 2: Open Source Converter
        subprocess.run([
            "FBX2glTF", 
            "--input", temp_fbx,
            "--output", output_path, 
            "--binary"
        ])`,

"adapters/vicon_ingest.py":
`class MarkerIngest(IngestStage):
    """Ingest strategy for Vicon Shogun / Vicon Blade data."""

    def ingest(self, input_path):
        # Native Vicon C3D Stream
        raw = vicon_sdk.read_c3d(input_path)
        
        result = CaptureResult()
        result.source_technology = "marker"
        result.source_vendor     = "vicon"
        
        # Spatial Marker extraction
        result.joints     = raw.get_marker_positions()
        result.frame_rate = raw.sample_rate  # (120Hz)
        result.confidence = 1.0
        
        return result`,

"adapters/moveai_ingest.py":
`class MarkerlessIngest(IngestStage):
    """Ingest strategy for AI-driven Markerless video capture."""

    def ingest(self, input_path):
        # High-performance ML Inference
        ml_data = moveai_sdk.process_video(input_path)
        
        result = CaptureResult()
        result.source_technology = "markerless"
        result.source_vendor     = "moveai"
        
        # Extract AI joint predictions
        result.joints     = ml_data.joint_predictions
        result.frame_rate = ml_data.fps  # (30Hz)
        result.confidence = ml_data.avg_confidence
        
        return result`,

"adapters/p4_delivery.py":
`class PerforceDelivery(BaseDeliveryAdapter):
    """Production asset management delivery (Source Control)."""

    def deliver(self, output_path, profile):
        depot = profile.delivery["depot_path"]
        
        p4 = P4()
        p4.connect()
        
        # Source Control Operations
        p4.run("add", output_path)
        p4.run(
            "submit", 
            "-d", 
            f"Auto: Pipeline v2.1 ({os.path.basename(output_path)})"
        )
        
        notify_slack(profile.delivery["slack"], output_path)`,

"adapters/nas_delivery.py":
`class NASDelivery(BaseDeliveryAdapter):
    """High-speed local network storage delivery (SMB)."""

    @circuit_breaker(max_failures=3, reset_timeout=30)
    @retry(max_attempts=3, delay=1.0)
    def deliver(self, output_path, profile):
        nas_path = profile.delivery["nas_path"]
        dest     = os.path.join(nas_path, os.path.basename(output_path))
        
        # Native Copy + Checksum
        shutil.copy2(output_path, dest)
        verify_md5(output_path, dest)
        
        notify_slack(profile.delivery["slack"], dest)`,

"adapters/s3_delivery.py":
`class S3Delivery(BaseDeliveryAdapter):
    """Cloud storage delivery for distributed workflows."""

    def deliver(self, output_path, profile):
        bucket = profile.delivery["s3_bucket"]
        key    = f"mocap/{os.path.basename(output_path)}"
        
        # AWS S3 API Upload
        boto3.client("s3").upload_file(
            output_path, 
            bucket, 
            key
        )
        
        notify_slack(
            profile.delivery["slack"], 
            f"s3://{bucket}/{key}"
        )`,

"plugins/metaverse_client.py":
`def register():
    """Client-specific plugin manifest."""
    return {
        "client_id": "metaverse", 
        "version":   "1.0"
    }

def pre_export(data, profile):
    # Optimize for real-time shaders
    decimator.reduce_to_target(
        data, 
        max_tris=5000
    )

def post_export(output_path, profile):
    # Auto-generate character deck thumbnail
    preview_gen.create_turntable(output_path)

def custom_validate(data, profile):
    # Specific Metaverse Constraint
    if len(data.joints) > 50:
        return False, f"LOD Error: {len(data.joints)} joints"
    return True, "Success"`,

"plugins/fc_custom.py":
`def register():
    """Client-specific plugin manifest (FC Sports)."""
    return {
        "client_id": "fc_sports", 
        "version":   "2.1"
    }

def custom_retarget(data, profile):
    # Specialized sports facial rig injection
    facial_map = load_fc_facial_map()
    data.blendshapes = map_facial_markers(
        data, 
        facial_map
    )
    return data`,

"scripts/batch_rename.py":
`"""
Core Utility Script:
Batches nomenclature remapping across FBX hierarchies.
"""
def batch_rename(fbx_path, joint_map_path):
    with open(joint_map_path) as f:
        mapping = json.load(f)

    for src, tgt in mapping.items():
        if cmds.objExists(src):
            cmds.rename(src, tgt)

    cmds.file(fbx_path, force=True, save=True)`,

"scripts/delivery_bot.py":
`"""
Background Execution Daemon:
Triggered on capture server filesystem events.
"""
class DeliveryBot:
    def __init__(self, watch_dir, pipeline):
        self.observer = Observer()
        self.observer.schedule(self, watch_dir, recursive=True)

    def on_created(self, event):
        if event.src_path.endswith('.c3d'):
            # Automated ingestion pipeline
            self.pipeline.run(
                event.src_path, 
                technology="marker"
            )
            slack.post(f"Watcher: processing {event.src_path}")`,

"scripts/health_monitor.py":
`"""
Infrastructure Heartbeat Watchdog:
Monitors critical capture pipeline services.
"""
def check_all():
    checks = {
        "NAS":      ping_nas(), 
        "Perforce": check_p4_connection(),
        "Farm":     check_deadline_status(), 
        "Disk":     check_disk_space() > 0.1
    }
    
    for name, ok in checks.items():
        if not ok:
            alert_slack(
                f"🚨 CRITICAL: {name} is OFFLINE", 
                severity="critical"
            )`
};

const STAGE_INFO = {
  ingest:{
    title:"Ingest Stage",
    desc:"The pipeline begins with a **Watchdog daemon** that monitors the stage output directories. When a new file is detected, it triggers the `PipelineRunner` to start a new take.<br><br>The runner looks up the technology type in the `Strategy Registry` to select the correct ingest logic—either `MarkerIngest` for Vicon .c3d data or `MarkerlessIngest` for Move.ai video. Regardless of the source hardware, the output is always a standardized `CaptureResult` object.",
    pattern:"Strategy Pattern",lesson:"09-real-ea-pipeline.html",code:"pipeline/runner.py"
  },
  cleanup:{
    title:"Cleanup Stage",
    desc:"Immediately following ingest, the runner invokes the technology-specific cleanup strategy. Current implementations handle different data cleaning needs in-place.<br><br>For markers, it automates gap-filling and swap-fixing via cubic interpolation. For markerless, it applies temporal smoothing and jitter filters to the neural network's output. After this stage, the data is clean, normalized, and ready for universal processing.",
    pattern:"Strategy Pattern",lesson:"09-real-ea-pipeline.html",code:"pipeline/runner.py"
  },
  retarget:{
    title:"Retarget Stage",
    desc:"This is the first universal stage. The runner calls `RetargetStage.process()` using the client's JSON configuration to load the correct skeleton template.<br><br>Standard `HumanIK` logic handles joint remapping, while optional pipeline plugins can hook into this process to apply client-specific offsets (e.g., custom shoulder bone orientations for specific game rigs).",
    pattern:"Template Method",lesson:"12-universal-pipeline.html",code:"pipeline/retarget.py"
  },
  validate:{
    title:"Validation Stage",
    desc:"A suite of pluggable checkers is executed to ensure data integrity before delivery. The runner iterates through standard checks like naming conventions, skeleton joint counts, and frame ranges.<br><br>New validators can be added by registering functions with the `PluginManager`. If any check fails, the pipeline can be configured to halt immediately or flag the take for manual TA review in the dashboard.",
    pattern:"Plugin Architecture",lesson:"11-defensive-architecture.html",code:"pipeline/validation.py"
  },
  export:{
    title:"Export Stage",
    desc:"The `ExportFactory` selects the appropriate adapter (FBX or glTF) based on the project's export configuration. <br><br>Before the file is written, `pre_export` hooks can trigger mesh decimation or LOD generation. Once written, a `post_export` hook typically generates a video turntable preview and records the file's MD5 hash into a sidecar metadata file for audit tracking.",
    pattern:"Adapter + Factory",lesson:"10-pipeline-centralization.html",code:"adapters/fbx_export.py"
  },
  deliver:{
    title:"Delivery Stage",
    desc:"Final delivery is handled via adapters for Perforce, NAS (SMB), or S3. To ensure reliability, all delivery calls are protected by a **Circuit Breaker** and a retry decorator.<br><br>If a destination like the NAS goes offline, the circuit 'opens' and data is queued to the local SSD. Once the system detects the NAS is back (HALF_OPEN state), it automatically flushes the local queue to the server.",
    pattern:"Circuit Breaker + Retry",lesson:"11-defensive-architecture.html",code:"adapters/nas_delivery.py"
  }
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
