# Taxi Driver Lab

Projet de reinforcement learning : plusieurs agents apprennent à conduire un taxi sur l'environnement **Taxi-v4** (Gymnasium) — récupérer un ou deux passagers et les déposer à la bonne destination en un minimum de pas. Le dépôt regroupe trois briques indépendantes :

- **[`core/`](core)** — la simulation Python pure (Gymnasium + un environnement 2‑passagers custom), les agents et leur entraînement, un rendu pygame en CLI. C'est le moteur ; il peut tourner seul, sans API ni navigateur.
- **[`api/`](api)** — un pont FastAPI + WebSocket entre `core` et le navigateur : fait tourner une simulation dans un thread et stream l'état décodé.
- **[`app/`](app)** — le dashboard React (le « Lab ») : une grille de widgets déplaçables/redimensionnables pour piloter et visualiser la simulation en direct.

**Démo en ligne : [taxidriverlab.nowapi.fr](https://taxidriverlab.nowapi.fr/)**

## Le Lab (dashboard)

L'app n'est pas un tableau de bord figé : c'est une grille (GridStack) sur laquelle on compose son propre écran en piochant des widgets dans la sidebar et en les glissant-déposant, redimensionnant, empilant ou supprimant à volonté:

- terrain
- contrôles play/pause/vitesse
- choix de l'agent
- hyperparamètres
- statistiques
- heatmap de la Q-table
- activations du réseau (DQN)
- graphiques reward/steps/epsilon
- cartes de métriques
- chrono, etc.

Deux modes :

- **Entraînement** — configure les hyperparamètres et lance un agent en apprentissage, avec jusqu'à **3 versions en parallèle** pour comparer des agents ou des réglages côte à côte sur les mêmes graphiques.
- **Démo** — recharge un modèle déjà entraîné (`core/save/*.pkl`, servis par l'API) et le fait tourner en exploitation pure, sans entraînement.

L'interface est disponible en français et en anglais.

## Lancer le projet

Trois façons de le faire tourner, du plus complet au plus minimal.

### 1. Docker Compose (recommandé)

Construit et lance l'API et le front ensemble avec Docker :

```bash
docker compose up --build
```

- Front : http://localhost:5173
- API : http://localhost:8000 (`/health`, `/docs`)

`docker-compose.prod.yml` est la variante de déploiement (Traefik + Docker Swarm) utilisée par le workflow GitHub Actions [`deploy.yml`](.github/workflows/deploy.yml) à chaque push sur `main` — elle sert https://taxidriverlab.nowapi.fr/, pas besoin d'y toucher en local.

### 2. API + front séparément, sans Docker

Prérequis : **Python 3.11.x** et **Node 20+**.

**API** — depuis la **racine du repo** (pour que `core` soit importable comme package) :

```bash
python -m venv .venv
# Windows (PowerShell) : .\.venv\Scripts\Activate.ps1
# Linux/macOS         : source .venv/bin/activate

pip install -r api/requirements.txt
uvicorn api.main:app --reload --port 8000
```

**Front** — dans un second terminal :

```bash
cd app
npm install
npm run dev
```

→ http://localhost:5173, connecté par défaut à `ws://127.0.0.1:8000/ws` (surchargeable via `VITE_SIM_WS_URL`). Détails du protocole WebSocket et des routes dans [`api/README.md`](api/README.md).

### 3. Juste la simulation `core`, en pygame

Pour entraîner ou observer un agent directement dans une fenêtre pygame, sans rien lancer d'autre :

```bash
python -m venv .venv
pip install -r core/requirements.txt

# depuis la racine du repo (core doit être importable comme package)
python -m core.main --render
```

Quelques options utiles (référence complète dans [`core/README.md`](core/README.md)) :

```bash
python -m core.main --agent Q --render --plot        # fenêtre pygame + courbes reward/steps/epsilon
python -m core.main --agent D --episodes 10000        # DQN, 10000 épisodes, sans rendu
python -m core.main --double --render                 # variante 2 passagers
python -m core.main --benchmark                       # compare l'agent choisi à la baseline aléatoire
python -m core.main --save qlearning                  # sauvegarde le modèle → core/save/qlearning.pkl
python -m core.main --demo qlearning                  # recharge ce modèle et lance une démo pygame, sans entraîner
```

Un modèle sauvegardé avec `--save` est automatiquement repris par l'API (`GET /pretrained`) et proposé dans le mode **Démo** du dashboard.

## Agents disponibles

| Clé | Agent          | Type                             |
| --- | -------------- | -------------------------------- |
| `Q` | Q-Learning     | Tabulaire                        |
| `S` | SARSA          | Tabulaire                        |
| `M` | Monte Carlo    | Tabulaire, épisodique            |
| `D` | Deep Q-Network | Réseau de neurones               |
| `R` | Heuristique    | Règles fixes, sans apprentissage |
| `B` | Aléatoire      | Baseline, sans apprentissage     |

Chacun existe en variante **single** (1 passager, `Taxi-v4`) et **double** (2 passagers, environnement custom dans `core/double_taxi_env.py`).

## Stack technique

- **core** : Python 3.11, Gymnasium, NumPy, PyTorch (agent DQN), Matplotlib, Pygame
- **api** : FastAPI, WebSocket, Uvicorn
- **app** : React 19, TypeScript, Vite, styled-components, GridStack, react-i18next

## Licence

[MIT](LICENSE) — usage académique.
