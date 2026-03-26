from flask import Flask, render_template, jsonify, request
import random

app = Flask(__name__)

# -------------------------------------------------------------------------
# Sudoku logic (ported from sudoku_solver_7.py)
# -------------------------------------------------------------------------

def is_valid(board, row, col, num):
    for i in range(9):
        if board[row][i] == num and i != col:
            return False
    for i in range(9):
        if board[i][col] == num and i != row:
            return False
    start_row = (row // 3) * 3
    start_col = (col // 3) * 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num and (start_row + i != row or start_col + j != col):
                return False
    return True

def find_empty_cell(board):
    for row in range(9):
        for col in range(9):
            if board[row][col] == 0:
                return row, col
    return None

def solve_sudoku(board, depth_limit=[1000000]):
    if not find_empty_cell(board):
        return True
    depth_limit[0] -= 1
    if depth_limit[0] <= 0:
        return False
    row, col = find_empty_cell(board)
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            if solve_sudoku(board, depth_limit):
                return True
            board[row][col] = 0
    return False

def random_number(board, count):
    datas = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    for _ in range(count):
        data = random.choice(datas)
        attempts = 0
        while attempts < 100:
            r = random.randint(0, 8)
            c = random.randint(0, 8)
            if board[r][c] == 0:
                break
            attempts += 1
        if is_valid(board, r, c, data):
            board[r][c] = data

def random_clear(board, count):
    cleared = 0
    attempts = 0
    while cleared < count and attempts < 1000:
        r = random.randint(0, 8)
        c = random.randint(0, 8)
        if board[r][c] != 0:
            board[r][c] = 0
            cleared += 1
        attempts += 1

def generate_puzzle(level):
    board = [[0]*9 for _ in range(9)]
    for _ in range(1000):
        b = [[0]*9 for _ in range(9)]
        random_number(b, 10)
        dl = [5000]
        if solve_sudoku(b, dl):
            board = b
            break
    random_clear(board, level)
    return board

# -------------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/new-game')
def new_game():
    level = int(request.args.get('level', 50))
    level = max(35, min(65, level))
    puzzle = generate_puzzle(level)
    return jsonify({'board': puzzle})

@app.route('/api/solve', methods=['POST'])
def solve():
    data = request.get_json()
    board = data.get('board')
    if not board:
        return jsonify({'success': False, 'message': 'No board provided'})
    # validate first
    for row in range(9):
        for col in range(9):
            num = board[row][col]
            if num != 0:
                if not is_valid(board, row, col, num):
                    return jsonify({'success': False, 'message': 'invalid'})
    dl = [1000000]
    success = solve_sudoku(board, dl)
    if success:
        return jsonify({'success': True, 'board': board})
    else:
        return jsonify({'success': False, 'message': 'no_solution'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
