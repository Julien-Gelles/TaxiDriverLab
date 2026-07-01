# SARSA Agent

**SARSA** (State-Action-Reward-State-Action) is an on-policy tabular reinforcement learning algorithm for discrete MDPs.

## Key Difference from Q-Learning

| Aspect | Q-Learning | SARSA |
|--------|-----------|-------|
| **Policy** | Off-policy | On-policy |
| **Learns** | Optimal policy | Current policy |
| **Next value** | `max_a Q(s',a')` | `Q(s', a')` (actual action) |
| **Stability** | Can be aggressive | Conservative (safer) |
| **Convergence** | Faster, higher reward | Slower, safer exploration |

## Update Equation

SARSA update uses 5 elements: **S** (state), **A** (action), **R** (reward), **S'** (next state), **A'** (next action):

```
Q(s,a) ← Q(s,a) + α [ r + γ Q(s',a') - Q(s,a) ]
                              ↑
                    Actual next action (may be random!)
```

Whereas Q-Learning uses:

```
Q(s,a) ← Q(s,a) + α [ r + γ max_a' Q(s',a') - Q(s,a) ]
                              ↑
                    Best possible next action
```

## Implementation Details

### agent.py

`SARSAAgent` class:
- `__init__`: Initialize Q-table
- `choose_action`: Epsilon-greedy policy
- `update_q_value`: SARSA TD update with next_action parameter
- `decay_epsilon`: Reduce exploration over time
- `set_epsilon` / `get_epsilon`: Control exploration

**Key difference**: `update_q_value(state, action, reward, next_state, next_action, terminated)`
- Takes `next_action` as parameter (the action actually taken in next_state)
- Uses `Q[next_state, next_action]` instead of `max Q[next_state, :]`

### train.py

Training loop:

```python
for episode in range(num_episodes):
    obs, info = env.reset()
    state = int(obs)
    action = agent.choose_action(state, explore=True)  # ← Choose first action
    
    while True:
        next_obs, reward, terminated, truncated, info = env.step(action)
        next_state = int(next_obs)
        next_action = agent.choose_action(next_state, explore=True)  # ← Choose next action first
        
        # Update with actual next action (on-policy)
        agent.update_q_value(state, action, reward, next_state, next_action, terminated)
        
        state = next_state
        action = next_action  # ← Move forward
        if terminated or truncated:
            break
    
    agent.decay_epsilon(epsilon_decay, min_epsilon)
```

**Critical difference**: Choose next action BEFORE update, then use it in update.

### test.py

Evaluation is identical to Q-Learning: set ε=0 and run greedy episodes.

## When to Use SARSA

✅ **Safe environments where exploration is costly**
- Robotics (can't afford many failures during learning)
- Real-world systems with risks
- Conservative exploration needed

❌ **Simulation/safe environments**
- Q-Learning is often better (learns optimal policy faster)
- When you can afford aggressive exploration

## Usage Example

```python
from core.agents.tabular.sarsa import SARSAAgent, train_agent, test_agent

# Create agent
agent = SARSAAgent(
    state_size=500,
    action_size=6,
    alpha=0.1,
    gamma=0.99,
    epsilon=1.0,
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

## Performance Comparison (Expected)

On Taxi-v4 with similar hyperparameters:

- **Q-Learning**: Faster convergence, higher peak performance (~+15 reward)
- **SARSA**: Slower convergence, more stable learning path (~+12 reward), safer during training

This is because SARSA learns the value of its actual exploratory actions, while Q-Learning assumes optimal future behavior.
