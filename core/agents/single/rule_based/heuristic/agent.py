"""
Agent heuristique : politique déterministe basée sur des règles.

Pas d'apprentissage ; stratégie fixe : aller au passager → Pickup → aller à la
destination → Dropoff. Utilisé comme baseline déterministe (vs aléatoire et Q-Learning).
"""

from collections import deque

# Taxi-v3 : positions (row, col) des 4 emplacements R, G, Y, B
# R=0, G=1, Y=2, B=3 (Gymnasium Taxi-v3)
LOCATION_CELLS = {
    0: (0, 0),   # R
    1: (0, 4),   # G
    2: (4, 0),   # Y
    3: (4, 3),   # B
}
# Passager dans le taxi
PASSENGER_IN_TAXI = 4

# Actions Taxi-v3 : 0=South, 1=North, 2=East, 3=West, 4=Pickup, 5=Dropoff
SOUTH, NORTH, EAST, WEST, PICKUP, DROPOFF = 0, 1, 2, 3, 4, 5

# Dimensions de la grille Taxi-v3
GRID_ROWS = 5
GRID_COLS = 5

# Murs horizontaux entre deux cases adjacentes (cell1, cell2) –
# extraits de la constante MAP de Taxi-v3 (gymnasium.envs.toy_text.taxi).
WALLS_BETWEEN: set[tuple[tuple[int, int], tuple[int, int]]] = {
    ((0, 1), (0, 2)),
    ((1, 1), (1, 2)),
    ((3, 0), (3, 1)),
    ((3, 2), (3, 3)),
    ((4, 0), (4, 1)),
    ((4, 2), (4, 3)),
}


def _decode_state(state: int) -> tuple[int, int, int, int]:
    """
    Décode l'état Taxi-v3 (entier) en (taxi_row, taxi_col, passenger_location, destination).

    Encodage Gymnasium : ((taxi_row*5 + taxi_col)*5 + passenger_location)*4 + destination
    """
    s = state
    destination = s % 4
    s //= 4
    passenger_location = s % 5
    s //= 5
    taxi_col = s % 5
    taxi_row = s // 5
    return taxi_row, taxi_col, passenger_location, destination


def _are_adjacent(a: tuple[int, int], b: tuple[int, int]) -> bool:
    """Retourne True si a et b sont adjacentes (distance de Manhattan = 1)."""
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1


def _is_wall_between(a: tuple[int, int], b: tuple[int, int]) -> bool:
    """Retourne True si un mur sépare les deux cases adjacentes a et b."""
    if not _are_adjacent(a, b):
        return False
    return (a, b) in WALLS_BETWEEN or (b, a) in WALLS_BETWEEN


def _neighbors(cell: tuple[int, int]) -> list[tuple[int, int]]:
    """Cases voisines atteignables depuis cell en respectant les murs Taxi-v3."""
    r, c = cell
    candidates: list[tuple[int, int]] = []
    if r > 0:
        candidates.append((r - 1, c))
    if r < GRID_ROWS - 1:
        candidates.append((r + 1, c))
    if c > 0:
        candidates.append((r, c - 1))
    if c < GRID_COLS - 1:
        candidates.append((r, c + 1))

    return [n for n in candidates if not _is_wall_between(cell, n)]


def _next_step_towards(
    start: tuple[int, int],
    goal: tuple[int, int],
) -> tuple[int, int]:
    """
    Calcule la prochaine case à suivre sur un plus court chemin start → goal,
    en tenant compte des murs Taxi-v3 (BFS sur la grille 5×5).
    """
    if start == goal:
        return start

    queue: deque[tuple[int, int]] = deque([start])
    parents: dict[tuple[int, int], tuple[int, int]] = {}
    visited: set[tuple[int, int]] = {start}

    found = False
    while queue:
        current = queue.popleft()
        if current == goal:
            found = True
            break
        for nxt in _neighbors(current):
            if nxt not in visited:
                visited.add(nxt)
                parents[nxt] = current
                queue.append(nxt)

    if not found:
        # En théorie la grille est connexe, mais par sécurité
        return start

    # Reconstruire le chemin goal → start puis inverser
    path = [goal]
    while path[-1] != start:
        parent = parents.get(path[-1])
        if parent is None:
            # Défaut de sécurité : revenir au départ
            return start
        path.append(parent)
    path.reverse()

    # path = [start, ..., goal] → prochaine case = path[1]
    return path[1]


class HeuristicAgent:
    """
    Agent qui choisit une action selon des règles fixes (heuristique).

    Stratégie : si le passager n'est pas dans le taxi → aller à sa position puis Pickup ;
    sinon → aller à la destination puis Dropoff. Déplacements par priorité ligne puis colonne.

    Interface compatible avec QLearningAgent (choose_action, get_epsilon, etc.)
    pour réutiliser les mêmes boucles d'entraînement/évaluation.
    """

    def __init__(self, action_size: int, seed: int | None = None) -> None:
        """
        Initialise l'agent heuristique.

        Args:
            action_size: Nombre d'actions discrètes (6 pour Taxi-v3).
            seed: Non utilisé ; conservé pour compatibilité d'interface.
        """
        self.action_size = action_size

    def choose_action(self, state: int, explore: bool = True) -> int:
        """
        Choisit l'action selon l'heuristique (ignorer explore : toujours déterministe).

        Args:
            state: État courant (index entier Taxi-v3).
            explore: Non utilisé ; conservé pour compatibilité.

        Returns:
            Indice d'action dans [0, action_size).
        """
        taxi_row, taxi_col, passenger_location, destination = _decode_state(state)

        # Déterminer la case cible (position du passager ou destination)
        if passenger_location == PASSENGER_IN_TAXI:
            target_row, target_col = LOCATION_CELLS[destination]
            if (taxi_row, taxi_col) == (target_row, target_col):
                return DROPOFF
        else:
            target_row, target_col = LOCATION_CELLS[passenger_location]
            if (taxi_row, taxi_col) == (target_row, target_col):
                return PICKUP

        # Calculer la prochaine case sur un plus court chemin qui respecte les murs
        current_cell = (taxi_row, taxi_col)
        target_cell = (target_row, target_col)
        next_cell = _next_step_towards(current_cell, target_cell)

        next_row, next_col = next_cell
        if next_row > taxi_row:
            return SOUTH
        if next_row < taxi_row:
            return NORTH
        if next_col > taxi_col:
            return EAST
        if next_col < taxi_col:
            return WEST

        # Sécurité : si, pour une raison quelconque, on ne trouve pas de mouvement,
        # on garde l'ancien comportement (avancer "vers" la cible, même si sous-optimal).
        if taxi_row < target_row:
            return SOUTH
        if taxi_row > target_row:
            return NORTH
        if taxi_col < target_col:
            return EAST
        if taxi_col > target_col:
            return WEST
        return SOUTH

    def get_epsilon(self) -> float:
        """Toujours 0 (pas d'exploration, politique déterministe)."""
        return 0.0

    def set_epsilon(self, epsilon: float) -> None:
        """Sans effet ; conservé pour compatibilité avec QLearningAgent."""
        pass

    def get_last_was_exploration(self) -> bool:
        """Toujours False (action déterministe)."""
        return False
