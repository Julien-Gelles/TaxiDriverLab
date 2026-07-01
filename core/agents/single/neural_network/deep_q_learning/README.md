# Deep Q-Network (DQN) Agent

**DQN** is Q-Learning where the Q-table is replaced by a **neural network**. Instead of looking up `Q[s, a]` in a table, the network *computes* the Q-values for a state on demand. This scales to state spaces far too large to tabulate.

## Why a network instead of a table?

| | Tabular Q-Learning | Deep Q-Learning |
|---|---|---|
| Q-values | Stored in a 500×6 table | Computed by a network |
| State input | Integer index | Integer / features / image |
| Scales to | ~thousands of states | Millions (e.g. Atari frames) |
| Stability | Good out of the box | Fragile → needs tricks |

For Taxi-v4 a table is plenty (500 states), so DQN is **overkill here** — it's included as a teaching example of function approximation. Expect it to reach the same policy as tabular Q-Learning, but slower and with more variance.

## Network (`agent.py` → `QNetwork`)

Taxi's state is a single integer in `[0, 500)`, so the network starts with an embedding:

```
state (int) → Embedding(500, 32) → Linear(32, 64) → ReLU → Linear(64, 6) → Q-values
```

## The two stabilising tricks

A network shares weights across all states, so naively updating one state disturbs others. Two mechanisms fix the resulting instability:

### 1. Experience Replay
Transitions `(s, a, r, s', done)` are stored in a buffer (`deque`, max 10 000). Each step we train on a **random mini-batch** (64) instead of the latest transition. Random sampling decorrelates the data and smooths learning.

### 2. Target Network
The bootstrap target uses a **frozen copy** of the network (`target_net`), refreshed only every `target_update` episodes (default 10). Without it, the target moves every step ("chasing a moving target") and training diverges.

This implementation also uses **Double DQN**: the online network *picks* the next action, the target network *evaluates* it — which reduces Q-value over-estimation.

```
target = r + (1 - done) · γ · target_net(s')[ argmax_a policy_net(s')[a] ]
loss   = ( policy_net(s)[a] − target )²
```

## Files

| File | Role |
|------|------|
| `agent.py` | `QNetwork` (nn.Module) + `DQNAgent` (replay buffer, target net, Adam, epsilon-greedy) |
| `train.py` | Per-step loop: `agent.observe()` stores + learns; `agent.end_episode()` refreshes target net |
| `test.py` | Greedy evaluation (epsilon = 0) |

The agent exposes the same interface as the tabular agents (`choose_action`, `decay_epsilon`, `get_epsilon`, …) so it plugs into the shared rendering / CLI.

## Usage

```bash
# Requires torch (CPU build is enough):
#   pip install torch --index-url https://download.pytorch.org/whl/cpu

python -m core.main --agent D --episodes 2000
python -m core.main --agent D --episodes 2000 --plot
python -m core.main --agent D --render
```

## Live visualisation (`--render`)

With `--agent D --render`, the pygame window replaces the tabular Q-table heatmap
with a live view of the network itself (the network is its own data visual — no
heatmap needed):

- **Network graph** — the network drawn as real nodes + edges:
  `Embedding (32) → Caché (64) → Sortie (6)`. To stay readable, layers larger
  than `MAX_NODES_PER_LAYER` (50) are **grouped** (activations/weights averaged),
  and only the `EDGES_PER_NODE` (3) strongest edges per target neuron are drawn
  (red = positive weight, blue = negative, intensity = |weight|). Nodes are
  coloured by their activation for the current state, so you watch the network
  "light up" each step. Exposed via `agent.get_activations(state)` and
  `agent.get_weights()`.

The speed controls (MIN / 0.02 / 0.4 s) and Pause/Quit work exactly as for the
other agents. At the MIN speed only one frame every 200 steps is drawn, to keep
training fast.

## Hyperparameters

| Param | Default | Notes |
|-------|---------|-------|
| `lr` | 1e-3 | Adam learning rate (not the tabular `alpha`; 0.1 would diverge) |
| `gamma` | 0.99 | Discount factor |
| `batch_size` | 64 | Mini-batch sampled from the replay buffer |
| `memory_size` | 10000 | Replay buffer capacity |
| `target_update` | 10 | Refresh target network every N episodes |

## Notes / gotchas

- **Learning rate ≠ alpha.** The tabular agents use `alpha≈0.1`; a network with Adam needs `lr≈1e-3`. `main.py` gives the DQN its own learning rate rather than wiring `--alpha` to it.
- **`done = terminated OR truncated`** is stored in the buffer; the target zeroes the future on `done`. (Unlike the tabular agents which deliberately bootstrap through the 200-step truncation — for DQN we keep the standard DQN convention, which is fine because replay + target net already stabilise the bootstrap.)
- DQN is **slower** than tabular methods here (a gradient step every env step). Use fewer episodes (1000–3000) to start.
