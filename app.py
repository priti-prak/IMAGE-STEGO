import os
import io
import time
import uuid
import json
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, render_template, send_from_directory, send_file
import pandas as pd

from core.crypto import StegoCryptoError, CapacityError
from core.lsb_sequential import SequentialLSB
from core.lsb_matching import KeySeededLSBMatching
from core.dct_robust import RobustDCTStego
from core.steganalysis import ChiSquareAnalysis, RSSteganalysis
from core.metrics import calculate_metrics, calculate_ber
from core.benchmark import StegoBenchmarkRunner, compress_jpeg

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32MB max upload


def load_image_from_file(file_storage) -> np.ndarray:
    """Safely loads an uploaded image file into a uint8 RGB numpy array."""
    img = Image.open(file_storage.stream)
    img = img.convert("RGB")
    return np.array(img)


def save_image_to_disk(img_np: np.ndarray, ext: str = "png") -> str:
    """Saves numpy image to disk in uploads directory and returns filename."""
    filename = f"stego_{uuid.uuid4().hex[:10]}.{ext}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    img_pil = Image.fromarray(img_np)
    if ext.lower() in ["jpg", "jpeg"]:
        img_pil.save(filepath, format="JPEG", quality=95)
    else:
        img_pil.save(filepath, format="PNG")
    return filename


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/download-report")
def download_report():
    pdf_path = os.path.join(BASE_DIR, "PROJECT_REPORT.pdf")
    if os.path.exists(pdf_path):
        return send_file(pdf_path, as_attachment=True, download_name="Image_Steganography_Project_Report.pdf")
    return jsonify({"error": "Report PDF not found"}), 404


@app.route("/api/capacity", methods=["POST"])
def check_capacity():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    try:
        img_np = load_image_from_file(request.files["image"])
        h, w, c = img_np.shape
        seq_cap = SequentialLSB.get_capacity_bytes(img_np.shape)
        match_cap = KeySeededLSBMatching.get_capacity_bytes(img_np.shape, max_rate=0.5)
        dct_cap = RobustDCTStego.get_capacity_bytes(img_np.shape)

        return jsonify({
            "width": w,
            "height": h,
            "channels": c,
            "total_pixels": h * w,
            "sequential_lsb_capacity_bytes": seq_cap,
            "lsb_matching_capacity_bytes": match_cap,
            "dct_robust_capacity_bytes": dct_cap,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/embed", methods=["POST"])
def embed():
    if "image" not in request.files:
        return jsonify({"error": "Please upload a cover image."}), 400

    message = request.form.get("message", "").strip()
    password = request.form.get("password", "").strip()
    method = request.form.get("method", "matching").lower()
    save_format = request.form.get("format", "png").lower()

    if not message:
        return jsonify({"error": "Secret message cannot be empty."}), 400
    if not password:
        return jsonify({"error": "Password cannot be empty."}), 400

    try:
        cover_np = load_image_from_file(request.files["image"])
        # Save cover copy for preview
        cover_fn = save_image_to_disk(cover_np, ext="png")

        msg_bytes = message.encode("utf-8")
        start_time = time.perf_counter()

        if method == "sequential":
            stego_np = SequentialLSB.embed(cover_np, msg_bytes, password)
            method_label = "Baseline Sequential LSB"
            embed_stats = {"note": "Standard raster-scan LSB replacement"}
        elif method == "dct":
            stego_np, embed_stats = RobustDCTStego.embed(cover_np, msg_bytes, password)
            method_label = "Proposed Robust 8x8 DCT + Reed-Solomon"
        else:  # matching
            stego_np, embed_stats = KeySeededLSBMatching.embed(cover_np, msg_bytes, password)
            method_label = "Proposed Key-Seeded LSB Matching (+1/-1)"

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Save stego image
        ext = "jpg" if save_format == "jpeg" else "png"
        stego_fn = save_image_to_disk(stego_np, ext=ext)

        # Compute fidelity metrics
        metrics = calculate_metrics(cover_np, stego_np)

        return jsonify({
            "success": True,
            "method": method_label,
            "elapsed_ms": round(elapsed_ms, 2),
            "cover_url": f"/uploads/{cover_fn}",
            "stego_url": f"/uploads/{stego_fn}",
            "stego_filename": stego_fn,
            "metrics": metrics,
            "stats": embed_stats,
            "payload_length_bytes": len(msg_bytes),
        })

    except CapacityError as ce:
        return jsonify({"error": f"Capacity Exceeded: {str(ce)}"}), 400
    except StegoCryptoError as se:
        return jsonify({"error": f"Cryptographic Error: {str(se)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Embedding Failed: {str(e)}"}), 500


@app.route("/api/extract", methods=["POST"])
def extract():
    if "image" not in request.files:
        return jsonify({"error": "Please upload a stego image."}), 400

    password = request.form.get("password", "").strip()
    method = request.form.get("method", "auto").lower()

    if not password:
        return jsonify({"error": "Password cannot be empty."}), 400

    try:
        stego_np = load_image_from_file(request.files["image"])
        start_time = time.perf_counter()

        recovered_bytes = None
        detected_method = None
        errors = []

        # If method specified, try that first
        methods_to_try = []
        if method == "sequential":
            methods_to_try = [("Baseline Sequential LSB", SequentialLSB.extract)]
        elif method == "matching":
            methods_to_try = [("Proposed Key-Seeded LSB Matching", KeySeededLSBMatching.extract)]
        elif method == "dct":
            methods_to_try = [("Proposed Robust DCT + Reed-Solomon", RobustDCTStego.extract)]
        else:
            # Auto-detect mode: try proposed methods then baseline
            methods_to_try = [
                ("Proposed Key-Seeded LSB Matching", KeySeededLSBMatching.extract),
                ("Proposed Robust DCT + Reed-Solomon", RobustDCTStego.extract),
                ("Baseline Sequential LSB", SequentialLSB.extract),
            ]

        for name, extract_func in methods_to_try:
            try:
                recovered_bytes = extract_func(stego_np, password)
                detected_method = name
                break
            except Exception as e:
                errors.append(f"{name}: {str(e)}")

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if recovered_bytes is None:
            return jsonify({
                "success": False,
                "error": "Extraction failed for all attempted methods. Incorrect password or image is not a valid stego image.",
                "details": errors,
            }), 400

        try:
            message_text = recovered_bytes.decode("utf-8")
        except UnicodeDecodeError:
            message_text = f"[Binary/Hex Data, Length {len(recovered_bytes)} bytes]: {recovered_bytes.hex()}"

        return jsonify({
            "success": True,
            "method": detected_method,
            "message": message_text,
            "length_bytes": len(recovered_bytes),
            "elapsed_ms": round(elapsed_ms, 2),
        })

    except Exception as e:
        return jsonify({"error": f"Extraction Error: {str(e)}"}), 500


@app.route("/api/steganalysis", methods=["POST"])
def steganalysis():
    if "image" not in request.files:
        return jsonify({"error": "Please upload an image for steganalysis."}), 400

    try:
        img_np = load_image_from_file(request.files["image"])
        chi_res = ChiSquareAnalysis.analyze(img_np)
        rs_res = RSSteganalysis.analyze(img_np)

        return jsonify({
            "success": True,
            "chi_square": chi_res,
            "rs_analysis": rs_res,
        })
    except Exception as e:
        return jsonify({"error": f"Analysis Error: {str(e)}"}), 500


@app.route("/api/jpeg-lab", methods=["POST"])
def jpeg_lab():
    """
    Directly compares how Sequential LSB, LSB Matching, and Robust DCT survive
    lossy JPEG recompression at a given Quality Factor.
    """
    if "image" not in request.files:
        return jsonify({"error": "Please upload an image."}), 400

    message = request.form.get("message", "Resilience Lab Secret Test Message 2026").strip()
    password = request.form.get("password", "LabPass123").strip()
    quality = int(request.form.get("quality", 80))

    try:
        cover_np = load_image_from_file(request.files["image"])
        msg_bytes = message.encode("utf-8")

        # 1. Embed Sequential LSB
        seq_stego = SequentialLSB.embed(cover_np, msg_bytes, password)
        seq_jpeg = compress_jpeg(seq_stego, quality)
        seq_success = False
        seq_err = ""
        try:
            recovered = SequentialLSB.extract(seq_jpeg, password)
            seq_success = (recovered == msg_bytes)
        except Exception as e:
            seq_err = str(e)

        # 2. Embed LSB Matching
        match_stego, _ = KeySeededLSBMatching.embed(cover_np, msg_bytes, password, enforce_rate_cap=False)
        match_jpeg = compress_jpeg(match_stego, quality)
        match_success = False
        match_err = ""
        try:
            recovered = KeySeededLSBMatching.extract(match_jpeg, password)
            match_success = (recovered == msg_bytes)
        except Exception as e:
            match_err = str(e)

        # 3. Embed Proposed Robust DCT
        dct_stego, _ = RobustDCTStego.embed(cover_np, msg_bytes, password)
        dct_jpeg = compress_jpeg(dct_stego, quality)
        dct_success = False
        dct_err = ""
        try:
            recovered = RobustDCTStego.extract(dct_jpeg, password)
            dct_success = (recovered == msg_bytes)
        except Exception as e:
            dct_err = str(e)

        dct_metrics = calculate_metrics(cover_np, dct_jpeg)

        return jsonify({
            "success": True,
            "quality": quality,
            "payload_bytes": len(msg_bytes),
            "results": [
                {
                    "method": "Baseline Sequential LSB",
                    "domain": "Spatial",
                    "survived": seq_success,
                    "status": "RECOVERED" if seq_success else "CORRUPTED / DESTROYED",
                    "error": seq_err if not seq_success else "None (100% matched)",
                    "note": "Spatial bits are altered by 8x8 DCT quantization and color subsampling.",
                },
                {
                    "method": "Proposed LSB Matching (+1/-1)",
                    "domain": "Spatial",
                    "survived": match_success,
                    "status": "RECOVERED" if match_success else "CORRUPTED / DESTROYED",
                    "error": match_err if not match_success else "None (100% matched)",
                    "note": "Designed for low statistical detectability, not JPEG recompression.",
                },
                {
                    "method": "Proposed Robust DCT + Reed-Solomon ECC",
                    "domain": "Frequency (DCT)",
                    "survived": dct_success,
                    "status": "RECOVERED (SURVIVED)" if dct_success else "CORRUPTED",
                    "error": dct_err if not dct_success else "None (Protected by Reed-Solomon ECC)",
                    "note": "Frequency-domain embedding with Reed-Solomon survives lossy compression!",
                },
            ],
            "dct_fidelity_under_jpeg": dct_metrics,
        })
    except Exception as e:
        return jsonify({"error": f"JPEG Lab Error: {str(e)}"}), 500


@app.route("/api/benchmark", methods=["POST"])
def run_benchmark():
    if "image" not in request.files:
        return jsonify({"error": "Please upload a cover image for benchmarking."}), 400

    password = request.form.get("password", "BenchPass123").strip()
    msg_size = int(request.form.get("payload_size", 64))

    try:
        cover_np = load_image_from_file(request.files["image"])
        # Generate payload of specified size
        payload = ("A" * (msg_size - 1) + "!").encode("utf-8")
        results = StegoBenchmarkRunner.evaluate_methods_on_image(
            cover_img=cover_np,
            payload_bytes=payload,
            password=password,
            jpeg_qualities=[90, 80, 70],
        )

        df = pd.DataFrame(results)
        csv_fn = f"benchmark_{uuid.uuid4().hex[:8]}.csv"
        csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_fn)
        df.to_csv(csv_path, index=False)

        return jsonify({
            "success": True,
            "data": results,
            "csv_url": f"/uploads/{csv_fn}",
        })
    except Exception as e:
        return jsonify({"error": f"Benchmark Error: {str(e)}"}), 500


if __name__ == "__main__":
    print("=" * 60)
    print("  Image Steganography System - Web Server Starting")
    print("  Open your browser at: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=False)
