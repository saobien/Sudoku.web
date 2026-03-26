# Sudoku

Ứng dụng Sudoku với hai phiên bản: Desktop (Tkinter) và Web (Flask + HTML/CSS/JS).

## Tổng quan

Sudoku solver và game đầy đủ tính năng, hỗ trợ tiếng Anh và tiếng Việt.

## Cấu trúc

```
sudoku_solver_7.py     - Desktop app (Tkinter)
web_app.py             - Web app backend (Flask, port 5000)
templates/index.html   - Giao diện web
static/style.css       - Giao diện responsive mobile/web
static/game.js         - Logic game phía client
```

## Tính năng

- **7 cấp độ**: Intro, Easy, Medium, Hard, Expert, Final Boss, Universe
- **Ghi chú (Note mode)**: Ghi nhiều số vào một ô
- **Tô màu hợp lệ**: Xanh = đúng, Đỏ = sai
- **Giải tự động (Solve)**: Backend giải bằng thuật toán backtracking
- **Đồng hồ đếm giờ**
- **Hỗ trợ bàn phím** (web) và cảm ứng (mobile)
- **Hai ngôn ngữ**: Tiếng Anh / Tiếng Việt

## Workflows

- **Start application** — Web app Flask (port 5000, webview) — chạy tự động
- **Desktop App** — Tkinter VNC app — khởi động thủ công khi cần

## Dependencies

- `flask` (pip)
- `python312Packages.tkinter`, `tk` (Nix system — cho desktop app)
