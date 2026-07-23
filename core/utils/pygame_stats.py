"""
Fenêtre pygame affichant la map Taxi (rgb_array) à gauche et les infos de tour à droite.
"""

from typing import Any

try:
    import pygame
    import numpy as np
except ImportError:
    pygame = None
    np = None

STATS_PANEL_WIDTH = 320
STATS_PANEL_HEIGHT = 280
QTABLE_PANEL_WIDTH = 340
ACTIVATION_PANEL_WIDTH = 360
MAX_NODES_PER_LAYER = 50
EDGES_PER_NODE = 3
QTABLE_Y_LABEL_W = 28
QTABLE_X_LABEL_H = 20
QTABLE_LEGEND_W = 22
QTABLE_LEGEND_LABEL_W = 40
QTABLE_BORDER = 2
LEGEND_Q_MIN = -800
LEGEND_Q_MAX = 20
TAXI_ACTION_NAMES = ("South", "North", "East", "West", "Pickup", "Dropoff")
BUTTON_HEIGHT = 32
BUTTON_GAP = 8
PRESET_DELAYS: list[float] = [0.0, 0.02, 0.4]


class PygameStatsWindow:
    """Une seule fenêtre : map Taxi à gauche, infos (epsilon, reward, action, etc.) à droite."""

    def __init__(self, frame_shape: tuple[int, int, int] | None = None, show_activations: bool = False) -> None:
        if pygame is None or np is None:
            raise RuntimeError("pygame and numpy are required for --render. Install: pip install pygame numpy")
        if not pygame.get_init():
            pygame.init()
        self._map_w = 400
        self._map_h = 300
        if frame_shape is not None:
            self._map_h, self._map_w = frame_shape[0], frame_shape[1]
        self._show_activations = show_activations
        if show_activations:
            total_w = self._map_w + STATS_PANEL_WIDTH + ACTIVATION_PANEL_WIDTH
        else:
            total_w = self._map_w + STATS_PANEL_WIDTH + QTABLE_PANEL_WIDTH
        total_h = max(self._map_h, STATS_PANEL_HEIGHT)
        self._surface = pygame.display.set_mode((total_w, total_h), pygame.SHOWN)
        pygame.display.set_caption("Taxi - Infos tour")
        self._stats_x = self._map_w
        self._qtable_x = self._map_w + STATS_PANEL_WIDTH
        self._activation_x = self._map_w + STATS_PANEL_WIDTH
        self._font = pygame.font.Font(pygame.font.get_default_font(), 18)
        if self._font is None:
            self._font = pygame.font.SysFont("monospace", 16)
        self._font_small = pygame.font.Font(pygame.font.get_default_font(), 12)
        if self._font_small is None:
            self._font_small = pygame.font.SysFont("monospace", 11)
        self._bg = (30, 30, 40)
        self._fg = (220, 220, 220)
        self._title_color = (255, 200, 100)
        self._btn_pause_rect: "pygame.Rect | None" = None
        self._btn_quit_rect: "pygame.Rect | None" = None
        self._delay_btn_rects: list["pygame.Rect"] = []

    def _q_value_to_color(self, q: float, q_min: float, q_max: float) -> tuple[int, int, int]:
        """Bleu = score min, blanc = 0, rouge = score max. Par défaut (tout à 0) = blanc."""
        white = (255, 255, 255)
        if abs(q) < 1e-9:
            return white
        if q_max - q_min < 1e-9:
            return white  # tableau uniforme (ex. tout à 0) -> blanc
        if q <= 0:
            # Dégradé bleu (min) -> blanc (0)
            if q_min >= 0:
                return white
            t = q / q_min  # 1 au min, 0 à 0
            t = max(0.0, min(1.0, t))
            r = int(255 * (1 - t))
            g = int(255 * (1 - t))
            b = 255
            return (r, g, b)
        else:
            # Dégradé blanc (0) -> rouge (max)
            if q_max <= 0:
                return white
            t = q / q_max  # 0 à 0, 1 au max
            t = max(0.0, min(1.0, t))
            r = 255
            g = int(255 * (1 - t))
            b = int(255 * (1 - t))
            return (r, g, b)

    def _draw_qtable(
        self,
        q_table: Any,
        panel_x: int,
        panel_y: int,
        panel_w: int,
        panel_h: int,
        last_updated_state: int | None = None,
    ) -> None:
        """Dessine la Q-table en heatmap ; surligne en jaune la ligne last_updated_state si fournie."""
        if np is None or pygame is None or self._surface is None or q_table is None:
            return
        try:
            arr = np.asarray(q_table)
            if arr.ndim != 2:
                return
            n_states, n_actions = arr.shape
        except Exception:
            return
        q_min = float(np.min(arr))
        q_max = float(np.max(arr))
        cell_w = max(1, panel_w // n_actions)
        for state in range(n_states):
            y0 = panel_y + int(state * panel_h / n_states)
            y1 = panel_y + int((state + 1) * panel_h / n_states)
            if y1 <= y0:
                y1 = y0 + 1
            for action in range(n_actions):
                x0 = panel_x + action * cell_w
                x1 = min(panel_x + (action + 1) * cell_w, panel_x + panel_w)
                q = float(arr[state, action])
                color = self._q_value_to_color(q, q_min, q_max)
                pygame.draw.rect(self._surface, color, (x0, y0, x1 - x0, y1 - y0))
        # Surligner temporairement en jaune la ligne qui vient d'être mise à jour
        if last_updated_state is not None and 0 <= last_updated_state < n_states:
            y0 = panel_y + int(last_updated_state * panel_h / n_states)
            y1 = panel_y + int((last_updated_state + 1) * panel_h / n_states)
            if y1 <= y0:
                y1 = y0 + 1
            row_h = y1 - y0
            overlay = pygame.Surface((panel_w, row_h))
            overlay.fill((255, 255, 0))
            overlay.set_alpha(140)
            self._surface.blit(overlay, (panel_x, y0))
        pygame.draw.rect(self._surface, (80, 80, 90), (panel_x, panel_y, panel_w, panel_h), 2)

    @staticmethod
    def _layer_groups(n: int, max_nodes: int) -> list[tuple[int, int]]:
        """Partitionne range(n) en <= max_nodes groupes d'indices (start, end)."""
        if n <= 0:
            return []
        if n <= max_nodes:
            return [(i, i + 1) for i in range(n)]
        groups = []
        for k in range(max_nodes):
            s = k * n // max_nodes
            e = (k + 1) * n // max_nodes
            if e <= s:
                e = s + 1
            groups.append((s, e))
        return groups

    @staticmethod
    def _group_matrix(W: Any, row_groups: list, col_groups: list) -> Any:
        """Moyenne une matrice de poids (target, source) par blocs de groupes."""
        if W is None or not row_groups or not col_groups:
            return np.zeros((len(row_groups), len(col_groups)))
        W = np.asarray(W, dtype=float)
        out = np.zeros((len(row_groups), len(col_groups)))
        for j, (rs, re) in enumerate(row_groups):
            for i, (cs, ce) in enumerate(col_groups):
                out[j, i] = W[rs:re, cs:ce].mean()
        return out

    def _draw_network_graph(self, agent: Any, panel_x: int, panel_w: int, panel_h: int) -> None:
        """
        Dessine le réseau comme un vrai graphe : 3 colonnes de neurones
        (Embedding → Caché → Sortie) reliés par des arêtes.

        - Les couches de plus de MAX_NODES_PER_LAYER neurones sont regroupées
          (moyenne des activations / des poids) pour rester lisibles.
        - Seules les EDGES_PER_NODE arêtes les plus fortes par neurone cible
          sont tracées (rouge = poids positif, bleu = négatif, intensité = |poids|).
        - Les nœuds sont colorés par leur activation pour l'état courant
          (même code couleur que la heatmap).
        """
        if np is None or pygame is None or self._surface is None:
            return
        state = getattr(agent, "_current_state", None)
        if state is None or not hasattr(agent, "get_activations") or not hasattr(agent, "get_weights"):
            return
        try:
            acts = agent.get_activations(state)
            weights = agent.get_weights()
        except Exception:
            return

        title = self._font.render("Réseau (neurones)", True, self._title_color)
        self._surface.blit(title, (panel_x + (panel_w - title.get_width()) // 2, 4))

        layer_defs = [
            ("Emb", np.asarray(acts.get("embedding"), dtype=float)),
            ("Caché", np.asarray(acts.get("hidden"), dtype=float)),
            ("Sortie", np.asarray(acts.get("output"), dtype=float)),
        ]
        # Matrices de poids entre couches consécutives (target, source).
        w_between = [np.asarray(weights.get("fc1")), np.asarray(weights.get("fc2"))]

        top = 28
        bottom = panel_h - 18
        usable_h = bottom - top
        n_layers = len(layer_defs)
        if usable_h <= 0 or n_layers < 2:
            return

        margin_x = 26
        col_xs = [panel_x + margin_x + int(i * (panel_w - 2 * margin_x) / (n_layers - 1)) for i in range(n_layers)]

        # Regroupe chaque couche à <= MAX_NODES_PER_LAYER nœuds.
        groups = [self._layer_groups(len(v), MAX_NODES_PER_LAYER) for (_, v) in layer_defs]
        grouped_acts: list = []
        node_ys: list = []
        for li, (_, v) in enumerate(layer_defs):
            g = groups[li]
            ga = np.array([v[s:e].mean() for (s, e) in g]) if len(v) else np.zeros(len(g))
            grouped_acts.append(ga)
            ng = len(g)
            if ng <= 1:
                ys = [top + usable_h // 2]
            else:
                ys = [top + int(k * usable_h / (ng - 1)) for k in range(ng)]
            node_ys.append(ys)

        # Matrices de poids regroupées (target_groups, source_groups).
        grouped_w = [
            self._group_matrix(w_between[li], groups[li + 1], groups[li])
            for li in range(n_layers - 1)
        ]

        # Arêtes (top-K par nœud cible), tracées avant les nœuds.
        for li in range(n_layers - 1):
            wg = grouped_w[li]
            if wg.size == 0:
                continue
            maxabs = float(np.max(np.abs(wg))) or 1.0
            src_x, tgt_x = col_xs[li], col_xs[li + 1]
            src_ys, tgt_ys = node_ys[li], node_ys[li + 1]
            for j in range(wg.shape[0]):
                row = wg[j]
                k = min(EDGES_PER_NODE, len(row))
                for i in np.argsort(-np.abs(row))[:k]:
                    w = float(row[i])
                    strength = min(1.0, abs(w) / maxabs)
                    base = (230, 80, 80) if w >= 0 else (80, 120, 230)
                    color = tuple(int(self._bg[c] + (base[c] - self._bg[c]) * strength) for c in range(3))
                    pygame.draw.line(self._surface, color, (src_x, src_ys[i]), (tgt_x, tgt_ys[j]), 1)

        # Nœuds (colorés par activation), par-dessus les arêtes.
        for li, (name, v) in enumerate(layer_defs):
            ga = grouped_acts[li]
            vmin, vmax = (float(ga.min()), float(ga.max())) if len(ga) else (0.0, 0.0)
            x = col_xs[li]
            for k, y in enumerate(node_ys[li]):
                color = self._q_value_to_color(float(ga[k]), vmin, vmax)
                pygame.draw.circle(self._surface, color, (x, y), 4)
                pygame.draw.circle(self._surface, (60, 60, 70), (x, y), 4, 1)
            lbl = self._font_small.render(f"{name}({len(v)})", True, self._fg)
            self._surface.blit(lbl, (x - lbl.get_width() // 2, bottom + 2))

    def _frame_to_surface(self, frame: Any) -> "pygame.Surface | None":
        """Convertit un array numpy (H, W, 3) RGB en Surface pygame."""
        if np is None or pygame is None or frame is None:
            return None
        try:
            arr = np.asarray(frame)
            if arr.ndim != 3 or arr.shape[2] != 3:
                return None
            h, w = arr.shape[0], arr.shape[1]
            # pygame surfarray: (W, H, 3) pour blit_array
            arr_swapped = np.transpose(arr, (1, 0, 2)).copy()
            surf = pygame.Surface((w, h))
            pygame.surfarray.blit_array(surf, arr_swapped)
            return surf
        except Exception:
            return None

    def update(
        self,
        stats: dict[str, Any],
        env: Any = None,
        control: dict[str, Any] | None = None,
        agent: Any = None,
    ) -> None:
        """Met à jour : map, infos, boutons, et (si agent fourni) heatmap Q-table à droite."""
        if pygame is None or self._surface is None:
            return
        self._surface.fill(self._bg)
        if env is not None:
            try:
                frame = env.render()
                if frame is not None:
                    surf = self._frame_to_surface(frame)
                    if surf is not None:
                        self._surface.blit(surf, (0, 0))
            except Exception:
                pass
        # Panneau stats à droite
        stats_rect = pygame.Rect(self._stats_x, 0, STATS_PANEL_WIDTH, self._surface.get_height())
        pygame.draw.rect(self._surface, self._bg, stats_rect)
        pygame.draw.line(self._surface, (80, 80, 90), (self._stats_x, 0), (self._stats_x, self._surface.get_height()), 2)
        y = 8
        line_height = 22
        x_text = self._stats_x + 10
        title = stats.get("title", "--- Infos tour ---")
        title_surf = self._font.render(title, True, self._title_color)
        self._surface.blit(title_surf, (x_text, y))
        y += line_height + 4
        for key in ("episode", "step", "reward", "epsilon", "mode", "last_action", "delay"):
            if key not in stats:
                continue
            label = key.replace("_", " ").capitalize() + " :"
            val = stats[key]
            if isinstance(val, float) and key == "epsilon":
                text = f"{label} {val:.4f}"
            elif isinstance(val, float) and key == "delay":
                text = f"{label} {val:.3f} s"
            elif isinstance(val, float):
                text = f"{label} {val:.0f}"
            else:
                text = f"{label} {val}"
            surf = self._font.render(text, True, self._fg)
            self._surface.blit(surf, (x_text, y))
            y += line_height
        # Ligne : 3 boutons de délai (MIN + 0.02 + 0.4)
        self._delay_btn_rects = []
        if control is not None and "delay" in stats:
            y += 8
            btn_w = 64
            spacing = 6
            x = self._stats_x + 10
            current_delay = float(control.get("delay", stats.get("delay", 0.4)))
            for idx, val in enumerate(PRESET_DELAYS):
                rect = pygame.Rect(x, y, btn_w, BUTTON_HEIGHT)
                self._delay_btn_rects.append(rect)
                is_active = abs(current_delay - val) < 1e-6
                base_color = (70, 90, 110) if not is_active else (110, 140, 180)
                border_color = (120, 150, 200) if not is_active else (200, 230, 255)
                pygame.draw.rect(self._surface, base_color, rect)
                pygame.draw.rect(self._surface, border_color, rect, 2)
                if idx == 0:
                    txt = "MIN"
                else:
                    txt = f"{val:.3f}".rstrip("0").rstrip(".")
                txt_surf = self._font.render(txt, True, self._fg)
                self._surface.blit(txt_surf, (rect.x + (btn_w - txt_surf.get_width()) // 2, rect.y + 6))
                x += btn_w + spacing
            y += BUTTON_HEIGHT + BUTTON_GAP
        # Boutons Pause / Quitter (si control fourni)
        if control is not None:
            btn_w = STATS_PANEL_WIDTH - 20
            y += 12
            paused = control.get("pause", False)
            pause_label = "Reprendre" if paused else "Pause"
            self._btn_pause_rect = pygame.Rect(self._stats_x + 10, y, btn_w, BUTTON_HEIGHT)
            pygame.draw.rect(self._surface, (70, 100, 140), self._btn_pause_rect)
            pygame.draw.rect(self._surface, (120, 150, 200), self._btn_pause_rect, 2)
            pause_surf = self._font.render(pause_label, True, self._fg)
            self._surface.blit(pause_surf, (self._btn_pause_rect.x + (btn_w - pause_surf.get_width()) // 2, self._btn_pause_rect.y + 6))
            y += BUTTON_HEIGHT + BUTTON_GAP
            self._btn_quit_rect = pygame.Rect(self._stats_x + 10, y, btn_w, BUTTON_HEIGHT)
            pygame.draw.rect(self._surface, (80, 80, 80), self._btn_quit_rect)
            pygame.draw.rect(self._surface, (140, 140, 140), self._btn_quit_rect, 2)
            quit_surf = self._font.render("Quitter", True, self._fg)
            self._surface.blit(quit_surf, (self._btn_quit_rect.x + (btn_w - quit_surf.get_width()) // 2, self._btn_quit_rect.y + 6))
        # Panneau Q-table (heatmap + axes : 0..500 en y, noms actions en x).
        # Pas pour le DQN : il a son propre graphe de réseau à la place.
        panel_h = self._surface.get_height()
        if not self._show_activations and agent is not None and hasattr(agent, "q_table"):
            qpanel_rect = pygame.Rect(self._qtable_x, 0, QTABLE_PANEL_WIDTH, panel_h)
            pygame.draw.rect(self._surface, self._bg, qpanel_rect)
            title_q = self._font.render("Q-table", True, self._title_color)
            self._surface.blit(title_q, (self._qtable_x + (QTABLE_PANEL_WIDTH - title_q.get_width()) // 2, 4))
            heatmap_x = self._qtable_x + QTABLE_Y_LABEL_W + QTABLE_BORDER
            heatmap_y = 22 + QTABLE_BORDER
            heatmap_w = QTABLE_PANEL_WIDTH - QTABLE_Y_LABEL_W - QTABLE_LEGEND_W - QTABLE_LEGEND_LABEL_W - 3 * QTABLE_BORDER
            heatmap_h = panel_h - 22 - QTABLE_X_LABEL_H - 2 * QTABLE_BORDER
            if heatmap_w > 0 and heatmap_h > 0:
                last_updated = getattr(agent, "_last_updated_state", None)
                self._draw_qtable(agent.q_table, heatmap_x, heatmap_y, heatmap_w, heatmap_h, last_updated_state=last_updated)
                pygame.draw.rect(self._surface, (80, 80, 90), (heatmap_x, heatmap_y, heatmap_w, heatmap_h), QTABLE_BORDER)
            # Ordonnées dynamiques : 6 ticks répartis sur toute la plage d'états
            n_states_qt = agent.q_table.shape[0] if hasattr(agent.q_table, "shape") else 500
            for k in range(6):
                state_tick = int(n_states_qt * k / 5)
                y_pos = heatmap_y + int(state_tick * heatmap_h / n_states_qt)
                lbl = self._font_small.render(str(state_tick), True, self._fg)
                self._surface.blit(lbl, (self._qtable_x + QTABLE_Y_LABEL_W - lbl.get_width() - 2, y_pos - lbl.get_height() // 2))
            # Abscisses : noms des actions (sous la heatmap, séparés par la bordure)
            cell_w = heatmap_w / 6 if heatmap_w > 0 else 0
            for action in range(min(6, len(TAXI_ACTION_NAMES))):
                name = TAXI_ACTION_NAMES[action]
                lbl = self._font_small.render(name, True, self._fg)
                x_center = heatmap_x + (action + 0.5) * cell_w
                self._surface.blit(lbl, (int(x_center - lbl.get_width() // 2), heatmap_y + heatmap_h + QTABLE_BORDER))
            # Légende des couleurs à droite : échelle fixe -800 (bleu), 0 (blanc, centre), 20 (rouge)
            legend_x = heatmap_x + heatmap_w + QTABLE_BORDER
            legend_y = heatmap_y
            legend_h = heatmap_h
            legend_w = QTABLE_LEGEND_W
            if legend_w > 0 and legend_h > 0:
                steps = max(legend_h, 1)
                mid = steps // 2  # 0 au centre : moitié haute 20→0, moitié basse 0→-800
                for i in range(steps):
                    if i <= mid and mid > 0:
                        # Moitié haute : dégradé blanc → rouge (20 à 0)
                        t = i / mid
                        q_val = LEGEND_Q_MAX * (1.0 - t)
                    else:
                        # Moitié basse : dégradé bleu → blanc (-800 à 0)
                        denom = steps - mid if steps > mid else 1
                        t = (i - mid) / denom
                        q_val = LEGEND_Q_MIN * t
                    color = self._q_value_to_color(q_val, LEGEND_Q_MIN, LEGEND_Q_MAX)
                    pygame.draw.line(
                        self._surface,
                        color,
                        (legend_x, legend_y + i),
                        (legend_x + legend_w - 1, legend_y + i),
                    )
                # Bordure de la légende
                pygame.draw.rect(self._surface, (80, 80, 90), (legend_x, legend_y, legend_w, legend_h), 1)
                # Labels fixes à droite de la barre : 20 (haut), 0 (milieu), -800 (bas)
                label_x = legend_x + legend_w + 4
                lbl_max = self._font_small.render(str(LEGEND_Q_MAX), True, self._fg)
                self._surface.blit(lbl_max, (label_x, legend_y))
                zero_y = legend_y + legend_h // 2
                lbl_zero = self._font_small.render("0", True, self._fg)
                self._surface.blit(lbl_zero, (label_x, zero_y - lbl_zero.get_height() // 2))
                lbl_min = self._font_small.render(str(LEGEND_Q_MIN), True, self._fg)
                self._surface.blit(lbl_min, (label_x, legend_y + legend_h - lbl_min.get_height()))
        # Panneau graphe du réseau (DQN uniquement)
        if self._show_activations and agent is not None and hasattr(agent, "get_activations"):
            pygame.draw.line(self._surface, (80, 80, 90), (self._activation_x, 0), (self._activation_x, panel_h), 2)
            self._draw_network_graph(agent, self._activation_x, ACTIVATION_PANEL_WIDTH, panel_h)
        pygame.display.flip()
        # Traiter les événements (clics + clavier : Espace, Backspace, ← →)
        if control is not None and pygame is not None:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    control["quit"] = True
                    continue
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE:
                        control["pause"] = not control.get("pause", False)
                    elif event.key == pygame.K_BACKSPACE:
                        control["quit"] = True
                    elif event.key == pygame.K_LEFT:
                        idx = int(control.get("delay_idx", 0))
                        idx = max(0, idx - 1)
                        control["delay_idx"] = idx
                        control["delay"] = PRESET_DELAYS[idx]
                    elif event.key == pygame.K_RIGHT:
                        idx = int(control.get("delay_idx", 0))
                        idx = min(len(PRESET_DELAYS) - 1, idx + 1)
                        control["delay_idx"] = idx
                        control["delay"] = PRESET_DELAYS[idx]
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    pos = event.pos
                    # Boutons de délai
                    if self._delay_btn_rects:
                        for idx, rect in enumerate(self._delay_btn_rects):
                            if rect.collidepoint(pos):
                                control["delay_idx"] = idx
                                control["delay"] = PRESET_DELAYS[idx]
                                break
                    if self._btn_pause_rect is not None and self._btn_pause_rect.collidepoint(pos):
                        control["pause"] = not control.get("pause", False)
                    if self._btn_quit_rect is not None and self._btn_quit_rect.collidepoint(pos):
                        control["quit"] = True

    def process_events(self, control: dict[str, Any] | None) -> None:
        """Traite uniquement les événements (croix, Quitter, Pause, délai) sans redessiner la fenêtre."""
        if control is None or pygame is None or self._surface is None:
            return
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                control["quit"] = True
                return
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    control["pause"] = not control.get("pause", False)
                elif event.key == pygame.K_BACKSPACE:
                    control["quit"] = True
                elif event.key == pygame.K_LEFT:
                    idx = int(control.get("delay_idx", 0))
                    idx = max(0, idx - 1)
                    control["delay_idx"] = idx
                    control["delay"] = PRESET_DELAYS[idx]
                elif event.key == pygame.K_RIGHT:
                    idx = int(control.get("delay_idx", 0))
                    idx = min(len(PRESET_DELAYS) - 1, idx + 1)
                    control["delay_idx"] = idx
                    control["delay"] = PRESET_DELAYS[idx]
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                pos = event.pos
                if self._delay_btn_rects:
                    for idx, rect in enumerate(self._delay_btn_rects):
                        if rect.collidepoint(pos):
                            control["delay_idx"] = idx
                            control["delay"] = PRESET_DELAYS[idx]
                            break
                if self._btn_pause_rect is not None and self._btn_pause_rect.collidepoint(pos):
                    control["pause"] = not control.get("pause", False)
                if self._btn_quit_rect is not None and self._btn_quit_rect.collidepoint(pos):
                    control["quit"] = True

    def close(self) -> None:
        """Arrête les mises à jour."""
        self._surface = None
