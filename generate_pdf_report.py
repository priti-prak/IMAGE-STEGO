import os
import subprocess
import markdown

BASE_DIR = r"C:\Users\Sona\Desktop\image-steganography-project"
MD_PATH = os.path.join(BASE_DIR, "PROJECT_REPORT.md")
HTML_PATH = os.path.join(BASE_DIR, "report_print.html")
PDF_PATH = os.path.join(BASE_DIR, "PROJECT_REPORT.pdf")
EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

# Convert markdown to HTML with tables, fenced code, and attr_list extensions
html_body = markdown.markdown(
    md_content,
    extensions=["tables", "fenced_code", "toc"]
)

styled_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Academic Project Report - Image Steganography</title>
<style>
    @page {{
        size: A4;
        margin: 22mm 18mm 22mm 18mm;
        @bottom-right {{
            content: counter(page);
        }}
    }}
    body {{
        font-family: 'Times New Roman', Times, serif;
        font-size: 11.5pt;
        line-height: 1.5;
        color: #111;
        margin: 0;
        padding: 0;
    }}
    h1 {{
        font-size: 18pt;
        font-weight: bold;
        text-align: center;
        margin-top: 2rem;
        margin-bottom: 1rem;
        page-break-before: always;
        color: #0f172a;
        text-transform: uppercase;
        border-bottom: 2px solid #334155;
        padding-bottom: 0.3rem;
    }}
    h1:first-of-type {{
        page-break-before: avoid;
        margin-top: 0;
    }}
    h2 {{
        font-size: 14pt;
        font-weight: bold;
        margin-top: 1.5rem;
        margin-bottom: 0.6rem;
        color: #1e293b;
        page-break-after: avoid;
    }}
    h3 {{
        font-size: 12pt;
        font-weight: bold;
        margin-top: 1.2rem;
        margin-bottom: 0.4rem;
        color: #334155;
        page-break-after: avoid;
    }}
    p {{
        margin-bottom: 0.8rem;
        text-align: justify;
        text-justify: inter-word;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin: 1.2rem 0;
        font-size: 10pt;
        page-break-inside: avoid;
    }}
    th, td {{
        border: 1px solid #475569;
        padding: 6px 10px;
        text-align: left;
        vertical-align: top;
    }}
    th {{
        background-color: #f1f5f9;
        font-weight: bold;
        color: #0f172a;
    }}
    tr:nth-child(even) {{
        background-color: #f8fafc;
    }}
    pre, code {{
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 9pt;
        background-color: #f1f5f9;
    }}
    pre {{
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 10px 14px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
        margin: 1rem 0;
        page-break-inside: avoid;
    }}
    ul, ol {{
        margin-bottom: 0.8rem;
        padding-left: 1.5rem;
    }}
    li {{
        margin-bottom: 0.3rem;
        text-align: justify;
    }}
    hr {{
        border: none;
        border-top: 1px solid #94a3b8;
        margin: 1.5rem 0;
    }}
    .report-title-block {{
        text-align: center;
        margin-bottom: 2.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 3px double #0f172a;
    }}
    .report-main-title {{
        font-size: 20pt;
        font-weight: bold;
        color: #0f172a;
        margin-bottom: 0.8rem;
        line-height: 1.3;
    }}
    .report-sub-title {{
        font-size: 13pt;
        color: #475569;
        font-style: italic;
    }}
</style>
</head>
<body>
<div class="report-title-block">
    <div class="report-main-title">Image Steganography Using LSB: Reducing Statistical Detectability and Improving JPEG Resilience with Key-Seeded LSB Matching and DCT-Domain Embedding</div>
    <div class="report-sub-title">A Comprehensive Academic Project Report Across Chapters 1 to 10</div>
</div>
{html_body}
</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(styled_html)

print("Generated styled HTML report at:", HTML_PATH)

# Run Edge headless to print to PDF
cmd = [
    EDGE_EXE,
    "--headless",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    f"--print-to-pdf={PDF_PATH}",
    HTML_PATH
]

print("Executing Microsoft Edge headless PDF generation...")
result = subprocess.run(cmd, capture_output=True, text=True)
print("Exit code:", result.returncode)
if os.path.exists(PDF_PATH):
    size_kb = os.path.getsize(PDF_PATH) / 1024
    print(f"SUCCESS: PDF created at '{PDF_PATH}' ({size_kb:.1f} KB)")
else:
    print("PDF generation failed. Stderr:", result.stderr)
