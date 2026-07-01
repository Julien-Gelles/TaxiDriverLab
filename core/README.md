# Taxi Driver

Reinforcement Learning school project: solve the **Taxi-v4** environment from [Gymnasium](https://gymnasium.farama.org/) using a model-free episodic algorithm (Q-Learning).

## Goal

- Train a Q-Learning agent to pick up and drop off passengers in the Taxi-v3 grid world.
- Compare performance against a random (brute-force) baseline.
- Keep the code modular and readable for academic use.

## Project Structure

```
T-AIA-902/
├── README.md
├── api/
├── app/
├── core/
│   ├── main.py               # Point d'entrée ; CLI et modes (user / auto)
│   ├── agents/
│   │   ├── tabular/
│   │   │   └── q_learning/   # Q-Learning (agent, train, test)
│   │   │       ├── agent.py
│   │   │       ├── train.py
│   │   │       └── test.py
│   │   ├── random/
│   │   │   └── brute_force/  # Agent aléatoire (baseline)
│   │   │       ├── agent.py
│   │   │       ├── train.py
│   │   │       └── test.py
│   │   └── rule_based/
│   │       └── heuristic/   # Agent heuristique (règles fixes)
│   │           ├── agent.py
│   │           ├── train.py
│   │           └── test.py
│   └── utils/
│       └── utils.py
├── data/
└── venv/
    └── requirements.txt      # Dépendances du projet
```

## Setup

**Python 3.11.x** (projet testé avec 3.11.9).

```bash
# Créer un environnement virtuel (recommandé)
python -m venv core/venv
# Windows (PowerShell) :
.\core\venv\Scripts\activate
# Si erreur "exécution de scripts désactivée" : utiliser l'Invite de commandes (cmd) et lancer
#   venv\Scripts\activate.bat
# Ou autoriser les scripts une fois : Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Linux/macOS :
# source venv/bin/activate

# Installer toutes les dépendances (gymnasium, pygame, numpy, matplotlib)
pip install -r venv/requirements.txt
```

## Usage

### User mode (default)

```bash
python -m core.main --mode user
```

**Arguments :**

| Argument                                | Description                                                                                                                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **--agent** [B\|Q\|R]                   | Agent à lancer : **B** = brute force, **Q** = Q-learning (défaut), **R** = heuristic (règles fixes).                                                                                                                                            |
| **--alpha**, **--gamma**, **--epsilon** | Paramètres Q-Learning (défaut : 0.1, 0.99, 1.0)                                                                                                                                                                                                 |
| **--episodes**                          | Nombre d’épisodes d’entraînement (défaut : 5000)                                                                                                                                                                                                |
| **--test-episodes**                     | Nombre d’épisodes d’évaluation (défaut : 100)                                                                                                                                                                                                   |
| **--seed**                              | Graine aléatoire (reproductibilité)                                                                                                                                                                                                             |
| **--render** [pygame\|terminal]         | Visuel pendant l’entraînement : **pygame** (fenêtre) ou **terminal** (ansi). Sans valeur → pygame. Fenêtre : **Pause** / **Quitter** + délai **MIN / 0.02 / 0.4 s**. Terminal : **Espace** = pause, **Effacer** = quitter, **←** **→** = délai. |
| **--demo** [pygame\|terminal] [N]       | Après l’entraînement, N épisodes en visuel (greedy). 1er arg : pygame ou terminal (défaut pygame). 2e : nombre d’épisodes (défaut 3). Ex. : `--demo pygame 5`, `--demo terminal`, `--demo` → pygame 3.                                          |
| **--plot**                              | Affiche les courbes (reward, steps, epsilon) ; sans --plot, pas de graphiques                                                                                                                                                                   |
| **--benchmark**                         | Lance aussi l’agent aléatoire et compare                                                                                                                                                                                                        |

Exemples :

```bash
# Courbes d’entraînement
python -m core.main --mode user --plot

# Visuel pendant l’entraînement : fenêtre pygame (défaut si --render sans valeur)
python -m core.main --mode user --render
python -m core.main --mode user --render pygame

# Visuel pendant l’entraînement : terminal (ansi)
python -m core.main --mode user --render terminal

# Après l’entraînement : démo 5 épisodes en pygame
python -m core.main --mode user --demo pygame 5
python -m core.main --mode user --demo 5

# Démo 3 épisodes en pygame (défaut)
python -m core.main --mode user --demo

# Démo en terminal
python -m core.main --mode user --demo terminal 3

# Comparaison avec l’agent aléatoire
python -m core.main --mode user --benchmark

# Agent heuristique (règles fixes, pas d'apprentissage)
python -m core.main --mode user --agent R

# Reproductibilité
python -m core.main --mode user --seed 42
```

**Test de convergence** : beaucoup d’épisodes pour observer reward ↑, steps ↓, success rate ↑ :

```bash
python -m core.main --mode user --episodes 10000 --epsilon 1.0
```

### Auto mode (placeholder)

Time-limited optimization placeholder (currently runs a short default training):

```bash
python -m core.main --mode auto
```

## Algorithms

- **Q-Learning** (`core/agents/tabular/q_learning/agent.py`): Tabular Q-Learning with epsilon-greedy exploration. Updates:  
  `Q(s,a) ← Q(s,a) + α [ r + γ max_{a'} Q(s',a') - Q(s,a) ]`
- **Random baseline** (`core/agents/random/brute_force/`): Uniform random actions; no learning.
- **Heuristic** (`core/agents/rule_based/heuristic/`): Deterministic rule-based policy: go to passenger → Pickup → go to destination → Dropoff; no learning.

## Environment

- **Taxi-v4** (Gymnasium): 5×5 grid, 4 locations. The taxi must pick up a passenger at one location and drop them at another. Actions: move (N/S/E/W), pick up, drop off. Reward: -1 per step, +20 for successful drop-off, -10 for illegal pick-up/drop-off.

### State and Action Spaces

- **Number of states:** 500 (discrete; encodes taxi position, passenger location, destination).
- **Number of actions:** 6 (South, North, East, West, Pickup, Dropoff).

## License

For academic use only.

# 1. Se positionner à la racine du projet

cd C:\Users\Nowa\Documents\T-AIA-902-LIL_2

# 2. Créer le venv (si pas déjà fait)

python -m venv core/venv

# 3. Activer le venv

.\core\venv\Scripts\activate

# 4. Installer les dépendances (le fichier est dans core/)

pip install -r core/requirements.txt

# 5. Lancer la simulation q-learning avec affichage

python -m core.main --render

Puis :

# Avec courbes d'entraînement

python -m core.main --render --plot

# Avec 10000 épisodes (convergence complète)

python -m core.main --episodes 10000 --plot

# Démo après entraînement (5 épisodes)

python -m core.main --demo pygame 5

# Comparaison avec agent aléatoire

python -m core.main --benchmark
