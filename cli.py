import argparse
import sys
import os
import numpy as np
from PIL import Image
import pandas as pd

from core.crypto import StegoCryptoError, CapacityError
from core.lsb_sequential import SequentialLSB
from core.lsb_matching import KeySeededLSBMatching
from core.dct_robust import RobustDCTStego
from core.steganalysis import ChiSquareAnalysis, RSSteganalysis
from core.metrics import calculate_metrics
from core.benchmark import StegoBenchmarkRunner


def load_img(path: str) -> np.ndarray:
    if not os.path.exists(path):
        print(f"Error: File not found at '{path}'")
        sys.exit(1)
    return np.array(Image.open(path).convert("RGB"))


def save_img(img_np: np.ndarray, out_path: str):
    ext = os.path.splitext(out_path)[1].lower()
    fmt = "JPEG" if ext in [".jpg", ".jpeg"] else "PNG"
    Image.fromarray(img_np).save(out_path, format=fmt, quality=95)
    print(f"[+] Output saved to: {out_path}")


def cmd_embed(args):
    cover = load_img(args.cover)
    msg_bytes = args.msg.encode("utf-8")
    pwd = args.pwd
    method = args.method.lower()

    print(f"[*] Embedding message into '{args.cover}' using [{method.upper()}]...")

    try:
        if method == "sequential":
            stego = SequentialLSB.embed(cover, msg_bytes, pwd)
        elif method == "dct":
            stego, stats = RobustDCTStego.embed(cover, msg_bytes, pwd)
            print(f"[*] DCT Embedding stats: {stats}")
        else:  # matching
            stego, stats = KeySeededLSBMatching.embed(cover, msg_bytes, pwd)
            print(f"[*] LSB Matching stats: {stats}")

        save_img(stego, args.out)
        metrics = calculate_metrics(cover, stego)
        print(f"[+] Metrics -> PSNR: {metrics['psnr_db']} dB | SSIM: {metrics['ssim']} | MSE: {metrics['mse']}")
    except (CapacityError, StegoCryptoError) as e:
        print(f"[!] Stego Error: {e}")
        sys.exit(1)


def cmd_extract(args):
    stego = load_img(args.stego)
    pwd = args.pwd
    method = args.method.lower()

    print(f"[*] Extracting secret from '{args.stego}' using [{method.upper()}]...")
    try:
        if method == "sequential":
            msg = SequentialLSB.extract(stego, pwd)
        elif method == "dct":
            msg = RobustDCTStego.extract(stego, pwd)
        elif method == "matching":
            msg = KeySeededLSBMatching.extract(stego, pwd)
        else:  # auto
            msg = None
            for fn, name in [
                (KeySeededLSBMatching.extract, "LSB Matching"),
                (RobustDCTStego.extract, "Robust DCT"),
                (SequentialLSB.extract, "Sequential LSB"),
            ]:
                try:
                    msg = fn(stego, pwd)
                    print(f"[+] Successfully extracted via [{name}]")
                    break
                except Exception:
                    continue
            if msg is None:
                raise StegoCryptoError("Auto-detection failed for all methods.")

        print("\n" + "=" * 50)
        print("RECOVERED MESSAGE:")
        print(msg.decode("utf-8", errors="replace"))
        print("=" * 50 + "\n")
    except Exception as e:
        print(f"[!] Extraction Error: {e}")
        sys.exit(1)


def cmd_steganalysis(args):
    img = load_img(args.image)
    print(f"[*] Running Steganalysis on '{args.image}'...")

    chi = ChiSquareAnalysis.analyze(img)
    rs = RSSteganalysis.analyze(img)

    print("\n--- Chi-Square (Chi^2) PoV Analysis ---")
    print(f"  Stat: {chi['chi2_stat']} | df: {chi['degrees_of_freedom']} | p-val: {chi['p_value']:.6f}")
    print(f"  Verdict: {chi['conclusion']}")

    print("\n--- Fridrich RS Steganalysis ---")
    print(f"  Rm: {rs['Rm']:.4f} | R-m: {rs['R_minus_m']:.4f} | delta_R: {rs['delta_R']:.4f}")
    print(f"  Verdict: {rs['conclusion']}")


def cmd_benchmark(args):
    cover = load_img(args.cover)
    payload = ("BenchPayload" * 8).encode("utf-8")
    print(f"[*] Running full benchmark on '{args.cover}' with payload {len(payload)} bytes...")
    results = StegoBenchmarkRunner.evaluate_methods_on_image(cover, payload, "BenchPass123", [90, 80, 70])
    df = pd.DataFrame(results)
    print("\n" + df.to_string())
    if args.out:
        df.to_csv(args.out, index=False)
        print(f"\n[+] Benchmark CSV saved to: {args.out}")


def main():
    parser = argparse.ArgumentParser(description="Image Steganography CLI Suite (LSB Matching & Robust DCT)")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Embed
    p_embed = subparsers.add_parser("embed", help="Embed secret into image")
    p_embed.add_argument("--cover", required=True, help="Cover image path")
    p_embed.add_argument("--out", required=True, help="Output stego image path")
    p_embed.add_argument("--msg", required=True, help="Secret message text")
    p_embed.add_argument("--pwd", required=True, help="Encryption password")
    p_embed.add_argument("--method", choices=["matching", "dct", "sequential"], default="matching")

    # Extract
    p_ext = subparsers.add_parser("extract", help="Extract secret from stego image")
    p_ext.add_argument("--stego", required=True, help="Stego image path")
    p_ext.add_argument("--pwd", required=True, help="Decryption password")
    p_ext.add_argument("--method", choices=["matching", "dct", "sequential", "auto"], default="auto")

    # Steganalysis
    p_steg = subparsers.add_parser("steganalysis", help="Run Chi-Square & RS analysis on image")
    p_steg.add_argument("--image", required=True, help="Image path to analyze")

    # Benchmark
    p_bench = subparsers.add_parser("benchmark", help="Run comparative benchmark suite")
    p_bench.add_argument("--cover", required=True, help="Cover image path")
    p_bench.add_argument("--out", default="benchmark_results.csv", help="Output CSV path")

    args = parser.parse_args()
    if args.command == "embed":
        cmd_embed(args)
    elif args.command == "extract":
        cmd_extract(args)
    elif args.command == "steganalysis":
        cmd_steganalysis(args)
    elif args.command == "benchmark":
        cmd_benchmark(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
