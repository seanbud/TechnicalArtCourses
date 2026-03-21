# Lesson 2: The FishNet Foundations — Core Components

## The Component Hierarchy

In Quantum, your architecture is split cleanly: Quantum Systems run the simulation using an Entity Component System, and Unity MonoBehaviours act as the "View" layer, handling visuals and audio. FishNet doesn't use an ECS. Everything lives inside Unity's standard component system, but there's a clear hierarchy of networked components you need to understand.

At the top is the NetworkManager. It's a singleton — one per scene — and it contains all the sub-managers: ServerManager handles server-side logic, ClientManager handles the local client connection, TransportManager wraps the underlying socket (Tugboat, FishyUnityTransport, etc.), TimeManager provides the tick clock, SceneManager handles networked scene loading, and ObserverManager controls which clients can see which objects.

Below the NetworkManager are NetworkObjects. Every GameObject that participates in the network needs a NetworkObject component — think of it as the network identity card. It's comparable to a Quantum EntityRef: it gives the object a unique ID that all clients agree on.

Attached to each NetworkObject are one or more NetworkBehaviours. These are your custom scripts — but instead of inheriting from MonoBehaviour, they inherit from NetworkBehaviour. A NetworkBehaviour has access to ownership information (who controls this object), network state properties (am I running on the server? am I the owner?), and the ability to send RPCs and use SyncVars.

## Lifecycle Hooks: When Things Happen

This is where newcomers trip up the most. The single most common mistake in FishNet development is putting network initialization code inside Unity's Start() or Awake(). At that point, the NetworkObject might not have a network ID assigned yet. SyncVars might not be initialized. RPCs won't work. Everything explodes.

FishNet provides its own set of lifecycle hooks that fire AFTER the network layer is ready. OnStartNetwork fires on both the server and the client when the NetworkObject is fully initialized — this is where you subscribe to TimeManager events. OnStartServer fires only on the server — use it for spawning AI, initializing game state, setting initial SyncVar values. OnStartClient fires only on the client — use it for setting up the local camera, UI, and input bindings. OnOwnershipServer and OnOwnershipClient fire when ownership of the object changes, which is how you handle things like passing a ball or transferring vehicle control. And OnStopNetwork fires when the object is despawned, where you clean up subscriptions.

The order is: Awake first (Unity standard, no network features available), then OnStartNetwork, then OnStartServer if you're the server, then OnStartClient if you're a client. If you're running as a Host, both OnStartServer and OnStartClient fire.

## SyncVars: Server-Owned Persistent State

A SyncVar is a variable that the server owns and all clients automatically receive. When the server changes a SyncVar's value, the change is replicated to every connected client. When a new client joins mid-game, all current SyncVar values are automatically sent to them — that's the "persistent state" part.

In Quantum terms, SyncVars are like the components on an Entity — they hold the authoritative state. The difference is that in Quantum, every client has its own local copy computed from the deterministic simulation. In FishNet, only the server writes SyncVars, and clients are read-only consumers.

You declare a SyncVar with the generic type: `private readonly SyncVar<float> _health = new();`. Then you set it on the server with `_health.Value = 100f;`. All clients receive the update via the OnChange callback, which fires with the old value, the new value, and a boolean indicating whether the callback is firing on the server.

The critical design decision is: SyncVars are for PERSISTENT state. If a player joins the game five minutes late, they need to see everyone's current health, which doors are open, which traps are armed. SyncVars handle this automatically. You don't write any extra code for late-joiners.

## RPCs: Explicit Network Messages

Remote Procedure Calls are how you send explicit commands across the network. There are three types.

ServerRpc is a method marked with the `[ServerRpc]` attribute. A client calls it locally, but it executes on the server. Think of it as the client raising their hand and asking the teacher for permission. The client says "I want to open this door," and the ServerRpc carries that request to the server. The server then validates: is the player close enough to the door? Is the door unlocked? Is the player alive? Only if all checks pass does the server actually open the door.

ObserversRpc is a method marked with `[ObserversRpc]`. The server calls it, and it executes on ALL connected clients. This is how the server broadcasts events — "the door is opening, play the animation and sound effect." ObserversRpc is for ephemeral events: explosions, hit effects, sound cues. Things that happen once and don't need to be replayed for late-joiners.

TargetRpc is a method marked with `[TargetRpc]`. The server calls it, and it executes on ONE specific client. This is for private messages — "Player 2, you picked up the key" or "Player 1, your inventory is full."

The flow is almost always the same: the client sends a ServerRpc request, the server validates and processes it, then the server sends an ObserversRpc to inform everyone of the result. Client requests, server decides, server announces. This is the fundamental pattern you'll repeat for every networked interaction in the game.

## SyncVar vs RPC: The Decision Matrix

Here's the question you'll ask yourself constantly: should this be a SyncVar or an RPC? The answer comes down to one test: if a player joins the game five minutes late, do they need to know about this?

If yes, use a SyncVar. Player health? SyncVar. Door state? SyncVar. Trap armed status? SyncVar. Team assignments? SyncVars. These are persistent facts about the world that any client needs at any time.

If no, use an RPC. Explosion effects? ObserversRpc — a late-joiner doesn't need to see an explosion that happened three minutes ago. Damage number popups? ObserversRpc. Chat messages? You could argue either way, but typically ObserversRpc with a chat log buffer. The point is: RPCs fire once and are gone. SyncVars persist and auto-sync to new clients.

## The Zenject Bridge

The Slop-Box project uses Zenject for dependency injection, which creates an interesting timing question: when do Zenject bindings resolve relative to FishNet's lifecycle?

The answer is: Zenject's Inject calls fire BEFORE OnStartNetwork. This is actually fine — you just need to be disciplined. Use Construct() (or [Inject] methods) to cache references to services like IInputProvider. Don't try to use network features in Construct() — no RPCs, no SyncVars, no TimeManager subscriptions. Then in OnStartNetwork(), wire up everything that needs the network. At that point, both your Zenject dependencies AND your network identity are ready.

## Object Spawning

In Quantum, entities exist in the simulation frame and the View layer instantiates Unity GameObjects to represent them visually. In FishNet, you instantiate and spawn GameObjects on the server, and they automatically replicate to all clients.

The key call is `ServerManager.Spawn(gameObject, ownerConnection)`. The first argument is the instantiated GameObject. The second argument assigns ownership — it tells FishNet which client "owns" this object and is allowed to send ServerRpcs for it. This is conceptually similar to Quantum's PlayerRef: it controls who can provide input for this entity.

When you spawn an object on the server, FishNet automatically instantiates it on all connected clients, assigns the same NetworkObject ID, and synchronizes all initial SyncVar values. When a new client joins later, all previously spawned objects are automatically instantiated on their machine with current state.

## Key Takeaways

Every networked GameObject needs a NetworkObject component — it's the network identity. Custom scripts inherit from NetworkBehaviour, not MonoBehaviour. Never initialize network state in Start or Awake — use OnStartNetwork for shared initialization, OnStartServer for server-only, and OnStartClient for client-only. ServerRpc means "client asking the server to do something" — always validate on the server side. ObserversRpc means "server telling all clients about an event." SyncVars are for persistent state that late-joiners need. RPCs are for ephemeral events. And Zenject's Inject fires before OnStartNetwork, so cache references in Construct, but don't use network features until OnStartNetwork.
