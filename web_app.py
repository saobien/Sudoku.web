from flask import Flask, render_template, jsonify, request
import random
import sys

sys.setrecursionlimit(50000)

app = Flask(__name__)

# -------------------------------------------------------------------------
# Sudoku logic
# -------------------------------------------------------------------------

def is_valid(board, row, col, num):
    for i in range(9):
        if board[row][i] == num and i != col:
            return False
    for i in range(9):
        if board[i][col] == num and i != row:
            return False
    sr = (row // 3) * 3
    sc = (col // 3) * 3
    for i in range(3):
        for j in range(3):
            if board[sr + i][sc + j] == num and (sr + i != row or sc + j != col):
                return False
    return True

def find_empty_cells(board):
    """Return list of (row, col) for all empty cells."""
    return [(r, c) for r in range(9) for c in range(9) if board[r][c] == 0]

def solve_sudoku_iterative(board, max_steps=2000000):
    """
    Iterative backtracking solver — avoids Python recursion limit.
    Returns True if solved (modifies board in-place), False otherwise.
    """
    empties = find_empty_cells(board)
    if not empties:
        return True

    n = len(empties)
    # num_choices[i] tracks which number to try next at position i (1..9)
    choices = [1] * n
    i = 0
    steps = 0

    while 0 <= i < n:
        steps += 1
        if steps > max_steps:
            return False

        row, col = empties[i]
        found = False
        for num in range(choices[i], 10):
            if is_valid(board, row, col, num):
                board[row][col] = num
                choices[i] = num + 1  # next time, try num+1 onwards
                i += 1
                found = True
                break

        if not found:
            # backtrack
            board[row][col] = 0
            choices[i] = 1
            i -= 1

    return i == n

def random_fill(board, count=11):
    """Place `count` random valid numbers to seed board generation."""
    nums = list(range(1, 10))
    random.shuffle(nums)
    placed = 0
    for num in nums:
        if placed >= count:
            break
        attempts = 0
        while attempts < 50:
            r = random.randint(0, 8)
            c = random.randint(0, 8)
            if board[r][c] == 0 and is_valid(board, r, c, num):
                board[r][c] = num
                placed += 1
                break
            attempts += 1

def random_clear(board, count):
    """Remove `count` random filled cells."""
    filled = [(r, c) for r in range(9) for c in range(9) if board[r][c] != 0]
    random.shuffle(filled)
    for r, c in filled[:count]:
        board[r][c] = 0

def generate_puzzle(level):
    """
    Generate a solvable Sudoku puzzle.
    level = number of cells to remove (35–65).
    """
    for _ in range(30):
        board = [[0] * 9 for _ in range(9)]
        random_fill(board, 11)
        if solve_sudoku_iterative(board, max_steps=500000):
            random_clear(board, level)
            return board
    # Fallback: return empty board
    return [[0] * 9 for _ in range(9)]

# -------------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/new-game')
def new_game():
    try:
        level = int(request.args.get('level', 50))
        level = max(35, min(65, level))
        puzzle = generate_puzzle(level)
        return jsonify({'board': puzzle})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/solve', methods=['POST'])
def solve():
    try:
        data = request.get_json()
        board = data.get('board')
        if not board:
            return jsonify({'success': False, 'message': 'No board provided'})

        # Validate existing numbers first
        for row in range(9):
            for col in range(9):
                num = board[row][col]
                if num != 0:
                    if not is_valid(board, row, col, num):
                        return jsonify({'success': False, 'message': 'invalid'})

        success = solve_sudoku_iterative(board, max_steps=2000000)
        if success:
            return jsonify({'success': True, 'board': board})
        else:
            return jsonify({'success': False, 'message': 'no_solution'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
