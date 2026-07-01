# Monte Carlo Agent

**Monte Carlo (MC) control** is a tabular reinforcement learning algorithm that updates the Q-table using **actual observed returns** from complete episodes, instead of bootstrapped (estimated) targets.

## Key Difference from Q-Learning / SARSA

| Aspect | Q-Learning / SARSA (TD) | Monte Carlo |
|--------|-------------------------|--------------|
| **When updated** | Every step | End of episode |
| **Target value** | Estimated (`r + γ·Q(s',·)`) | Real cumulative return `G` |
| **Bias** | Biased (bootstrapping) | Unbiased |
| **Variance** | Low | High |
| **Data needed** | One transition | Full episode trajectory |
| **Best for** | Long episodes | Short episodes |

## Update Equation

For each step `t` in the episode, the **return** `G_t` is the actual discounted sum of all future rewards:

```
G_t = r_t + γ·r_{t+1} + γ²·r_{t+2} + ... + γ^{T-t}·r_T
```

The Q-table is updated towards this real return (constant-alpha / incremental form):

```
Q(s,a) ← Q(s,a) + α [ G(s,a) - Q(s,a) ]
                       ↑
              Actual return observed, not an estimate
```

Compare to Q-Learning's TD update:

```
Q(s,a) ← Q(s,a) + α [ r + γ max_a' Q(s',a') - Q(s,a) ]
                              ↑
                       Estimate of the future
```

## Implementation Details

### agent.py

`MonteCarloAgent` class:
- `__init__`: Initialize Q-table (+ `first_visit` flag, default `True`)
- `choose_action`: Epsilon-greedy policy (same as Q-Learning/SARSA)
- `update_from_episode`: Processes a full trajectory **backwards**
- `decay_epsilon` / `set_epsilon` / `get_epsilon`: Same as Q-Learning/SARSA

**Key method**: `update_from_episode(trajectory)`
- `trajectory` is a list of `(state, action, reward)` tuples for the whole episode
- Iterates **backwards** (from the last step to the first), accumulating `G = r + γ·G`
- **First-visit MC** (default): only the first occurrence of each `(s,a)` pair in the episode is updated
- **Every-visit MC** (`first_visit=False`): every occurrence is updated

### train.py

Training loop:

```python
for episode in range(num_episodes):
    obs, info = env.reset()
    state = int(obs)
    trajectory = []  # ← collect the whole episode

    while True:
        action = agent.choose_action(state, explore=True)
        next_obs, reward, terminated, truncated, info = env.step(action)
        trajectory.append((state, action, reward))  # ← no update yet!
        state = int(next_obs)
        if terminated or truncated:
            break

    # ← Update happens ONCE, after the episode ends
    agent.update_from_episode(trajectory)
    agent.decay_epsilon(epsilon_decay, min_epsilon)
```

**Critical difference**: no `update_q_value()` call inside the step loop — the Q-table is untouched during the episode, then updated all at once at the end.

### test.py

Evaluation is identical to Q-Learning/SARSA: set ε=0 and run greedy episodes.

## Worked Example

Episode rewards: `-1, -1, -1, -1, -1, -1, -1, -1, -1, +20` (10 steps, γ=0.99)

Walking backwards from the last step:

```
G(step 10) = 20
G(step 9)  = -1 + 0.99 × 20        = 18.8
G(step 8)  = -1 + 0.99 × 18.8      = 17.6
...
G(step 1)  = -1 + 0.99 × G(step 2) ≈ 11.5
```

Each `Q[s_t, a_t]` is then nudged towards its corresponding `G(step t)` with `Q ← Q + α(G - Q)`.

## Gotchas on Taxi (why MC can get "stuck" at 200 steps)

MC has **no bootstrapping**, which makes it much more fragile than Q-Learning/SARSA on Taxi. Two things matter a lot:

1. **Epsilon must decay slowly enough.** MC only learns from episodes that *actually reach the goal*. If exploration ends too early (e.g. a fixed `epsilon_decay=0.995` finishes exploring by ~episode 900), a half-learned greedy policy almost never reaches the goal anymore, the learning signal dries up, and the agent plateaus at the 200-step truncation limit. The training entry point scales the decay to the episode budget so exploration lasts ~90% of the run.

2. **Bootstrap on truncation, not termination.** Taxi truncates episodes at 200 steps (`truncated=True`, `terminated=False`). A pure-MC return would treat that cutoff as a terminal failure and inject fully-negative returns, freezing Q at pessimistic values. Like Q-Learning/SARSA (which only zero the future on `terminated`), `update_from_episode` seeds the return from `max_a Q(s_final, a)` when the episode was truncated. See `agent.py`.

Even with both fixes, MC is **unbiased but high-variance**: at ~10k episodes its greedy success rate swings between ~88% and 100% depending on the seed, whereas Q-Learning/SARSA sit reliably at 100%. More episodes (~20k+) tighten the spread. This variance is the textbook MC-vs-TD trade-off, not a bug.

> Reproducibility note: seed the environment **once** at the start of training, not on every `env.reset()`. Re-seeding every episode makes every episode identical and the agent just memorises a single trajectory.

## When to Use Monte Carlo

✅ **Short episodes** (Taxi-v4 averages ~25 steps — a good fit)
✅ **Unbiased estimates** matter more than sample efficiency
✅ **Episodic tasks** with a clear terminal state

❌ **Very long or non-episodic (continuing) tasks** — must wait until the end of the episode to learn anything
❌ **When sample efficiency / fast online learning is critical** — Q-Learning/SARSA learn from every step

## Usage Example

```python
from core.agents.tabular.monte_carlo import MonteCarloAgent, train_agent, test_agent

# Create agent
agent = MonteCarloAgent(
    state_size=500,
    action_size=6,
    alpha=0.1,
    gamma=0.99,
    epsilon=1.0,
    first_visit=False,  # every-visit (what the core entry point uses)
)

# Train
rewards, steps, epsilons, stopped = train_agent(
    agent=agent,
    env=env,
    num_episodes=5000,
    epsilon_decay=0.995,
    min_epsilon=0.01,
)

# Evaluate
test_rewards, test_steps = test_agent(
    agent,
    env,
    num_episodes=100,
)
```
