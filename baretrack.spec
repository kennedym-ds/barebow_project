# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for BareTrack desktop app.

Build with:  pyinstaller baretrack.spec
Output:      dist/BareTrack/BareTrack.exe
"""

import os
import sys
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

# Collect all submodules that uvicorn / sqlmodel lazy-import
hidden = (
    collect_submodules("uvicorn")
    + collect_submodules("sqlmodel")
    + collect_submodules("pydantic")
    + collect_submodules("starlette")
    + collect_submodules("fastapi")
    + [
        "engineio.async_drivers.threading",
        "multipart",          # python-multipart
        "scipy.special.cython_special",
    ]
)

a = Analysis(
    ["desktop.py"],
    pathex=["."],
    binaries=[],
    datas=[
        # Bundle the built React frontend
        ("frontend/dist", "frontend/dist"),
        # Bundle domain source so imports work
        ("src", "src"),
        ("api", "api"),
    ],
    hiddenimports=hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unused pywebview renderers to slim down the bundle
        "PyQt5", "PyQt6", "PySide2", "PySide6",
        "gi",  # GTK
        "cefpython3",
        "tkinter",
        "matplotlib",
        "IPython", "jupyter",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],                        # not one-file — use COLLECT below
    exclude_binaries=True,
    name="BareTrack",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,             # No console window
    icon="assets/baretrack.ico",
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="BareTrack",
)
