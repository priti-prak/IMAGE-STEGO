# Image Steganography Using LSB: Reducing Statistical Detectability and Improving JPEG Resilience with Key-Seeded LSB Matching and DCT-Domain Embedding

An academic-grade, turnkey Python and Web implementation of the mini-project framework. It provides both a web UI (Flask + modern dark-mode frontend) and a CLI interface for research benchmarking.

---

## 📌 Project Overview & Theoretical Foundation

Traditional **Least Significant Bit (LSB) replacement** suffers from two critical vulnerabilities:
1. **Statistical Detectability**: Sequential replacement alters the natural distribution of *Pairs of Values (PoVs)* (e.g., $2k \leftrightarrow 2k+1$), causing artificial histogram equalization easily detected by **Chi-Square ($\chi^2$) analysis** and **RS (Regular/Singular) steganalysis**.
2. **Fragility to Lossy JPEG Compression**: Spatial LSB data is destroyed when an image is saved as a lossy JPEG due to color subsampling and frequency quantization.

This project implements two complementary solutions:
1. **Low-Detectability Spatial Mode (Key-Seeded LSB Matching)**:
   - Derives a pseudo-random pixel permutation from the user's key to scatter bits across the image.
   - Applies **LSB Matching ($\pm 1$)**: if the pixel LSB does not match the secret bit, the pixel intensity is randomly incremented or decremented by 1 (with boundary clipping at 0 and 255). This preserves histogram continuity and avoids PoV artifacts.
   - Enforces a capped embedding rate ($\le 50\%$) to keep modifications below statistical detection thresholds.
2. **Robust Frequency-Domain Mode (Quantized 8x8 DCT + Reed-Solomon ECC)**:
   - Performs 2D Discrete Cosine Transform on 8x8 blocks of the Luminance ($Y$) channel.
   - Embeds bits into mid-frequency AC coefficients using Quantization Index Modulation (QIM).
   - Protects the encrypted payload with **Reed-Solomon Error Correcting Codes (`reedsolo`)**, allowing full recovery even when JPEG recompression alters high and mid frequency bins!
3. **Cryptographic Integrity & Authentication**:
   - Both modes encrypt data using **AES-256-GCM** with keys derived via **PBKDF2-HMAC-SHA256** (100,000 iterations).
   - Incorporates a 4-byte magic header (`STEG`) and 16-byte authenticated tag for tamper detection and clear error reporting.

---

## 📁 Repository Structure

```
image-steganography-project/
├── core/
│   ├── __init__.py          # Core package exports
│   ├── crypto.py            # AES-256-GCM authenticated encryption & PBKDF2
│   ├── lsb_sequential.py    # Baseline sequential LSB replacement
│   ├── lsb_matching.py      # Proposed Key-Seeded LSB Matching (+1/-1)
│   ├── dct_robust.py        # Proposed 8x8 DCT QIM + Reed-Solomon ECC
│   ├── steganalysis.py      # Westfeld Chi-Square & Fridrich RS attacks
│   ├── metrics.py           # PSNR, MSE, SSIM, BER & capacity metrics
│   └── benchmark.py         # Automated evaluation matrix across JPEG Q-factors
├── static/
│   ├── css/style.css        # Responsive dark-mode styling
│   └── js/main.js           # Interactive UI, live previews, AJAX callers
├── templates/
│   ├── index.html           # 5-tab web dashboard
├── tests/
│   └── test_stego.py        # Comprehensive verification test suite
├── app.py                   # Flask server providing Web App & REST API
├── cli.py                   # Command-line interface for terminal & scripts
├── run_app.bat              # One-click Windows runner
├── sample_cover.png         # Built-in 512x512 sample cover image
└── requirements.txt         # Dependencies
```

---

## 🚀 How to Run the Project

### Option A: Interactive Web Application (Recommended for Demo)
1. Double click **`run_app.bat`** (on Windows), OR in PowerShell / Terminal run:
   ```bash
   python app.py
   ```
2. Open your web browser at:
   ```
   http://127.0.0.1:5000
   ```
3. Explore the 5 interactive tabs:
   - **Tab 1 (Embed Secret)**: Upload cover image, select algorithm, enter secret & password, view real-time capacity and PSNR/SSIM, download stego image.
   - **Tab 2 (Extract & Decrypt)**: Upload stego image, auto-detect algorithm or select manual mode, enter password, recover plaintext.
   - **Tab 3 (JPEG Resilience Lab)**: Adjust JPEG Quality Factor slider (Q=20 to Q=95) and see how Spatial LSB fails while Proposed DCT + Reed-Solomon survives!
   - **Tab 4 (Steganalysis Lab)**: Run Chi-Square and RS tests on any image to inspect detection verdicts.
   - **Tab 5 (Benchmark & Evaluation Suite)**: Run full comparative experiment and export results to CSV.

---

### Option B: Command-Line Interface (CLI)

#### 1. Embed Secret Message:
```bash
python cli.py embed --cover sample_cover.png --out stego.png --msg "Confidential Message" --pwd "Secret123" --method matching
```
*(Options for `--method`: `matching`, `dct`, `sequential`)*

#### 2. Extract Secret Message:
```bash
python cli.py extract --stego stego.png --pwd "Secret123" --method matching
```

#### 3. Run Steganalysis on an Image:
```bash
python cli.py steganalysis --image stego.png
```

#### 4. Run Automated Benchmark across Payloads & JPEG Qualities:
```bash
python cli.py benchmark --cover sample_cover.png --out report.csv
```

---

### Option C: Run Unit Tests
```bash
python tests/test_stego.py
```
Outputs:
```
Running steganography module tests...
[PASS] Crypto test passed.
[PASS] Sequential LSB test passed.
[PASS] LSB Matching test passed.
[PASS] Robust DCT & JPEG resilience test passed.
[PASS] Steganalysis tests passed.
All tests successfully completed!
```

---

## 🎓 Viva & Presentation Q&A Preparation

### Q1: What is the primary difference between LSB Replacement and LSB Matching?
**Answer:** In LSB replacement, if the pixel bit differs from the secret bit, it is strictly overwritten. This pairs values ($2k \leftrightarrow 2k+1$) and flattens their histogram frequencies. In LSB matching ($\pm 1$), the pixel is randomly incremented or decremented by 1, which preserves natural histogram variances and prevents Pairs-of-Values equalization.

### Q2: Why does Spatial LSB fail after JPEG compression?
**Answer:** JPEG is a lossy compression format that converts images into the $YC_bC_r$ color space, divides the image into 8x8 blocks, applies 2D DCT, and divides coefficients by a quantization matrix before rounding to integers. This quantization roundoff alters the spatial pixel values, completely corrupting spatial LSBs.

### Q3: How does your Robust DCT mode survive JPEG compression?
**Answer:** The robust mode embeds bits into the quantized mid-frequency AC coefficients of 8x8 DCT blocks in the Luminance ($Y$) channel using Quantization Index Modulation (QIM). Furthermore, it packages the payload with **Reed-Solomon Error Correcting Codes (`reedsolo`)**, which mathematically reconstructs any bits flipped during lossy quantization.

### Q4: Why use AES-GCM instead of plain AES-CBC?
**Answer:** AES-GCM is an *Authenticated Encryption with Associated Data (AEAD)* mode. In addition to encrypting the message, it produces a 128-bit authentication tag. If an attacker tampers with a single pixel or if an incorrect password is used, AES-GCM immediately rejects the data, preventing decryption of garbage.

---

## 📚 References
1. Aljughaiman, A. and Alrawashdeh, R. (2026). Content-adaptive LSB steganography with saliency fusion, ACO dispersion, and hybrid encryption with ablation study. *Scientific Reports*, 16, 3829.
2. Joshi, A. and Bhand, K. (2026). Adaptive Fuzzy Logic-Based Steganographic Encryption Framework: A Comprehensive Experimental Evaluation. *arXiv:2603.18105*.
3. Westfeld, A. and Pfitzmann, A. (1999). Attacks on steganographic systems: Breaking the steganographic utilities with $\chi^2$-statistic. *Information Hiding*.
4. Fridrich, J., Goljan, M., and Du, R. (2001). Detecting LSB steganography in color, and gray-scale images. *IEEE Magazine on Multimedia*.
