#!/usr/bin/env python3
"""Rasterize a 16x16 snake mark into PWA icons."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "icons"

INK = (15, 23, 42, 255)
GREEN = (34, 197, 94, 255)
GREEN_DIM = (22, 163, 74, 255)
RED = (220, 38, 38, 255)
WHITE = (255, 255, 255, 255)

# 16x16. S body, H head, A apple, . empty.
MARK = [
    "................",
    "................",
    "......AA........",
    ".....AWW........",
    "................",
    "..SSSS..........",
    ".....SSSSS......",
    ".........S......",
    ".........S......",
    ".........HHH....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
]


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, pixels: list[tuple[int, int, int, int]], size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(pixels[y * size + x])
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def paint(size: int, pad: int) -> list[tuple[int, int, int, int]]:
    grid = 16
    inner = size - pad * 2
    cell = inner // grid
    offset = pad + (inner - cell * grid) // 2
    pixels = [INK] * (size * size)
    colors = {"S": GREEN_DIM, "H": GREEN, "A": RED, "W": WHITE, ".": None}
    for gy, row in enumerate(MARK):
        for gx, symbol in enumerate(row):
            color = colors[symbol]
            if color is None:
                continue
            x0 = offset + gx * cell
            y0 = offset + gy * cell
            for y in range(y0, y0 + cell):
                for x in range(x0, x0 + cell):
                    pixels[y * size + x] = color
    return pixels


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    write_png(ROOT / "icon-192.png", paint(192, 16), 192)
    write_png(ROOT / "icon-512.png", paint(512, 40), 512)
    write_png(ROOT / "icon-maskable-512.png", paint(512, 96), 512)
    write_png(ROOT / "apple-touch-icon.png", paint(180, 18), 180)
    write_png(ROOT / "favicon-32.png", paint(32, 2), 32)


if __name__ == "__main__":
    main()
