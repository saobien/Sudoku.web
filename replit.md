# Sudoku Solver

A Python Tkinter desktop GUI application for solving and playing Sudoku puzzles.

## Project Overview

This is a feature-rich Sudoku solver with a graphical interface built using Python's Tkinter library. The app supports multiple difficulty levels, note-taking, a timer, and bilingual support (English/Vietnamese).

## Architecture

- **Language**: Python 3.12
- **UI Framework**: Tkinter (desktop GUI)
- **Display**: VNC (virtual display for Replit)

## Key Files

- `sudoku_solver_7.py` - Main application file (682 lines) containing:
  - Sudoku solving algorithm (backtracking with depth limiting)
  - Tkinter GUI interface
  - Multiple difficulty levels (Intro, Easy, Medium, Hard, Expert, Final Boss, Universe)
  - Note-taking mode
  - Timer functionality
  - Bilingual support (English/Vietnamese)

## Running the App

The app runs as a VNC desktop application via the "Start application" workflow:

```
python3 sudoku_solver_7.py
```

## Dependencies

- `python312Packages.tkinter` (system dependency via Nix)
- `tk` (system dependency via Nix)
