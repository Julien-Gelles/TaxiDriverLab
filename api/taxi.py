"""
Static Taxi-v4 layout and state decoding for the front-end terrain (option B).

Instead of streaming pixels, the API sends the *decoded* environment state so the
browser can draw the 5x5 grid itself. The layout (grid size, the 4 locations and
the walls) is constant for Taxi-v4 and sent once when a client connects.

Taxi-v4 state encoding (Gymnasium):
    ((taxi_row * 5 + taxi_col) * 5 + passenger_location) * 4 + destination
"""

GRID_ROWS = 5
GRID_COLS = 5

# (row, col) of the 4 pickup / drop-off locations R, G, Y, B.
LOCATIONS = [
    {"id": 0, "label": "R", "row": 0, "col": 0},
    {"id": 1, "label": "G", "row": 0, "col": 4},
    {"id": 2, "label": "Y", "row": 4, "col": 0},
    {"id": 3, "label": "B", "row": 4, "col": 3},
]

# Vertical walls between two horizontally-adjacent cells [[rowA, colA], [rowB, colB]].
WALLS = [
    [[0, 1], [0, 2]],
    [[1, 1], [1, 2]],
    [[3, 0], [3, 1]],
    [[3, 2], [3, 3]],
    [[4, 0], [4, 1]],
    [[4, 2], [4, 3]],
]

# passenger == 4 means the passenger is currently inside the taxi.
PASSENGER_IN_TAXI = 4
# passenger == 5 means the passenger has been delivered (double mode only).
PASSENGER_DELIVERED = 5

ACTION_NAMES = ["South", "North", "East", "West", "Pickup", "Dropoff"]

LAYOUT = {
    "rows": GRID_ROWS,
    "cols": GRID_COLS,
    "locations": LOCATIONS,
    "walls": WALLS,
    "passengerInTaxi": PASSENGER_IN_TAXI,
    "passengerDelivered": PASSENGER_DELIVERED,
    "actionNames": ACTION_NAMES,
}


def decode_state(state: int) -> dict:
    """Decode a Taxi-v4 integer state into taxi position, passenger and destination."""
    s = int(state)
    destination = s % 4
    s //= 4
    passenger = s % 5
    s //= 5
    taxi_col = s % 5
    taxi_row = s // 5
    return {
        "taxi": {"row": taxi_row, "col": taxi_col},
        "passenger": passenger,  # 0-3 = at a location, 4 = in the taxi
        "destination": destination,  # 0-3
    }


def decode_double_env(env) -> dict:
    """Read 2-passenger state directly from a TaxiEnvironmentSimulator's inner env."""
    inner = env.env
    return {
        "taxi": {"row": int(inner.taxi_row), "col": int(inner.taxi_col)},
        "p1Loc": int(inner.p1_loc),   # 0-3 at location, 4 in taxi, 5 delivered
        "p1Dest": int(inner.p1_dest),
        "p2Loc": int(inner.p2_loc),
        "p2Dest": int(inner.p2_dest),
    }
