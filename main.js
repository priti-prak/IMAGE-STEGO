document.addEventListener("DOMContentLoaded", () => {
    // =========================================================
    // 1. WEB AUDIO API SYNTHESIZER (CYBER SOUND FX)
    // =========================================================
    let audioCtx = null;
    let sfxEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
    }

    const sfxToggleBtn = document.getElementById("sfxToggleBtn");
    const sfxIcon = document.getElementById("sfxIcon");
    const sfxBtnText = sfxToggleBtn.querySelector(".btn-text");

    sfxToggleBtn.addEventListener("click", () => {
        initAudio();
        sfxEnabled = !sfxEnabled;
        if (sfxEnabled) {
            sfxIcon.textContent = "🔊";
            sfxBtnText.textContent = "Audio: ON";
            sfxToggleBtn.classList.remove("muted");
            playTone(600, 0.05, "sine");
        } else {
            sfxIcon.textContent = "🔇";
            sfxBtnText.textContent = "Audio: OFF";
            sfxToggleBtn.classList.add("muted");
        }
    });

    function playTone(freq, duration, type = "sine") {
        if (!sfxEnabled) return;
        try {
            initAudio();
            if (audioCtx.state === "suspended") audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.warn("Audio unavailable:", e);
        }
    }

    function playSuccessFanfare() {
        if (!sfxEnabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => playTone(freq, 0.18, "triangle"), idx * 90);
        });
    }

    function playScanBlip() {
        playTone(850, 0.06, "sine");
    }

    function playErrorBuzzer() {
        playTone(180, 0.25, "sawtooth");
    }

    // =========================================================
    // 2. BACKGROUND PARTICLES CONSTELLATION CANVAS
    // =========================================================
    const bgCanvas = document.getElementById("bgCanvas");
    if (bgCanvas) {
        const ctx = bgCanvas.getContext("2d");
        let width, height;
        let particles = [];
        const numParticles = 45;

        function resizeBg() {
            width = bgCanvas.width = window.innerWidth;
            height = bgCanvas.height = window.innerHeight;
        }
        window.addEventListener("resize", resizeBg);
        resizeBg();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.7;
                this.vy = (Math.random() - 0.5) * 0.7;
                this.radius = Math.random() * 2 + 1;
                this.color = Math.random() > 0.5 ? "rgba(56, 189, 248, " : "rgba(139, 92, 246, ";
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color + "0.7)";
                ctx.fill();
            }
        }

        for (let i = 0; i < numParticles; i++) particles.push(new Particle());

        function animateBg() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.25 * (1 - dist / 130)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animateBg);
        }
        animateBg();
    }

    // =========================================================
    // 3. CONFETTI FIREWORKS SYSTEM
    // =========================================================
    const confettiCanvas = document.getElementById("confettiCanvas");
    let confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;
    let confettiPieces = [];
    let confettiActive = false;

    function resizeConfetti() {
        if (!confettiCanvas) return;
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeConfetti);
    resizeConfetti();

    function triggerConfetti() {
        if (!confettiCanvas) return;
        confettiPieces = [];
        const colors = ["#38bdf8", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
        for (let i = 0; i < 90; i++) {
            confettiPieces.push({
                x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
                y: window.innerHeight / 2 - 50,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 1.2) * 12,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                alpha: 1,
            });
        }
        if (!confettiActive) {
            confettiActive = true;
            animateConfetti();
        }
    }

    function animateConfetti() {
        if (!confettiPieces.length) {
            confettiActive = false;
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            return;
        }
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        for (let i = confettiPieces.length - 1; i >= 0; i--) {
            const p = confettiPieces[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // gravity
            p.rotation += p.rotationSpeed;
            p.alpha -= 0.012;

            if (p.alpha <= 0) {
                confettiPieces.splice(i, 1);
                continue;
            }

            confettiCtx.save();
            confettiCtx.translate(p.x, p.y);
            confettiCtx.rotate((p.rotation * Math.PI) / 180);
            confettiCtx.fillStyle = p.color;
            confettiCtx.globalAlpha = p.alpha;
            confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            confettiCtx.restore();
        }
        requestAnimationFrame(animateConfetti);
    }

    // =========================================================
    // 4. ANIMATED MASCOT COMPANION: STEGOBOT
    // =========================================================
    const mascotBubble = document.getElementById("mascotBubble");
    const mascotText = document.getElementById("mascotText");
    const stegoBotMascot = document.getElementById("stegoBotMascot");

    const mascotQuotes = [
        "🛡️ Did you know? Basic LSB equalizes pairs of values, leaving an easy trail for Chi-Square tests!",
        "🥷 Key-Seeded LSB Matching nudges pixels by ±1 at random, keeping the histogram 100% natural!",
        "🌪️ Lossy JPEG compression discards high frequencies, but our 8x8 DCT mode survives through Reed-Solomon math!",
        "🔐 AES-256-GCM ensures that even a single flipped pixel alerts you to tampering!",
        "📊 High PSNR (>45 dB) means the human eye cannot spot any visual alterations!"
    ];

    function setMascotText(msg, autoReset = false) {
        mascotBubble.style.animation = "none";
        void mascotBubble.offsetWidth; // trigger reflow
        mascotBubble.style.animation = "bubblePop 0.35s ease";
        mascotText.innerHTML = msg;
        playScanBlip();

        if (autoReset) {
            setTimeout(() => {
                mascotText.innerHTML = "💬 Ready for the next operation! Need help? Just click on me!";
            }, 8000);
        }
    }

    stegoBotMascot.addEventListener("click", () => {
        const rand = mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)];
        setMascotText(rand);
    });

    // =========================================================
    // 5. TAB NAVIGATION WITH AUDIO & MASCOT DIALOGUES
    // =========================================================
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    const tabDialogues = {
        "embed-tab": "🔒 <strong>Tab 1: Embed Secret</strong> — Pick an image, select your algorithm, and conceal your confidential data!",
        "extract-tab": "🔓 <strong>Tab 2: Extract & Decrypt</strong> — Upload your stego file and enter the passphrase to authenticate the payload!",
        "jpeg-tab": "🌪️ <strong>Tab 3: JPEG Resilience Lab</strong> — Test our frequency-domain mode under lossy compression storms!",
        "steganalysis-tab": "🔬 <strong>Tab 4: Steganalysis Lab</strong> — Run Chi-Square (χ²) and RS attacks to evaluate detectability!",
        "benchmark-tab": "📈 <strong>Tab 5: Academic Benchmark</strong> — Generate the complete comparative evaluation matrix and export CSV!"
    };

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-tab");
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add("active");

            playTone(480, 0.08, "sine");
            if (tabDialogues[targetId]) setMascotText(tabDialogues[targetId]);
        });
    });

    // =========================================================
    // 6. CARTOON ALGORITHM CARDS INTERACTION
    // =========================================================
    const algoCards = document.querySelectorAll(".algo-card");
    const embedMethodInput = document.getElementById("embedMethod");
    const methodHint = document.getElementById("methodHint");

    const methodHints = {
        matching: "🛡️ <strong>Key-Seeded LSB Matching (+1/-1):</strong> Disperses bits randomly across pixels using a key-derived PRNG seed, and perturbs pixel intensities by ±1 rather than direct replacement, preventing Pairs-of-Values equalization and evading Chi-Square / RS steganalysis.",
        dct: "📦 <strong>Robust 8x8 DCT + Reed-Solomon:</strong> Transforms the Luminance (Y) channel into frequency domain 8x8 DCT blocks, embedding bits into mid-frequency AC coefficients protected with Reed-Solomon ECC to survive lossy JPEG recompression.",
        sequential: "⚙️ <strong>Sequential LSB Baseline:</strong> Simple raster-scan bit replacement. High capacity and fast, but easily detected by statistical Chi-Square / RS tests and fragile to JPEG compression."
    };

    algoCards.forEach(card => {
        card.addEventListener("click", () => {
            algoCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            const algo = card.getAttribute("data-algo");
            embedMethodInput.value = algo;
            methodHint.innerHTML = methodHints[algo] || "";
            playTone(600, 0.08, "triangle");

            if (algo === "matching") {
                setMascotText("🥷 <strong>Ninja Mode Selected!</strong> Randomly modifying pixels by ±1 so statistical detectives can't find a trace.");
            } else if (algo === "dct") {
                setMascotText("🛡️ <strong>Iron Fortress Mode Selected!</strong> Hiding data in 8x8 DCT waves with Reed-Solomon to survive lossy JPEG!");
            } else {
                setMascotText("⚙️ <strong>Baseline Selected!</strong> Classic sequential LSB for academic comparison with your guide.");
            }
        });
    });

    // =========================================================
    // 7. EMBED FORM & REAL-TIME CAPACITY LOGIC
    // =========================================================
    const embedCoverInput = document.getElementById("embedCoverInput");
    const embedCoverName = document.getElementById("embedCoverName");
    const capacityInfo = document.getElementById("capacityInfo");
    const capDims = document.getElementById("capDims");
    const capMatch = document.getElementById("capMatch");
    const capDct = document.getElementById("capDct");
    const embedMessage = document.getElementById("embedMessage");
    const msgByteCount = document.getElementById("msgByteCount");
    const embedForm = document.getElementById("embedForm");
    const embedSubmitBtn = document.getElementById("embedSubmitBtn");
    const scanLaser = document.getElementById("scanLaser");

    embedMessage.addEventListener("input", () => {
        const bytes = new TextEncoder().encode(embedMessage.value).length;
        msgByteCount.textContent = bytes;
    });

    embedCoverInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        embedCoverName.textContent = `Selected: ${file.name}`;
        playScanBlip();
        setMascotText(`📁 Image selected: <strong>${file.name}</strong>. Computing available bit capacity...`);

        const formData = new FormData();
        formData.append("image", file);
        try {
            const resp = await fetch("/api/capacity", { method: "POST", body: formData });
            const data = await resp.json();
            if (resp.ok) {
                capDims.textContent = `${data.width} × ${data.height}`;
                capMatch.textContent = `${(data.lsb_matching_capacity_bytes / 1024).toFixed(1)} KB (Capped 50%)`;
                capDct.textContent = `${(data.dct_robust_capacity_bytes / 1024).toFixed(1)} KB (ECC Protected)`;
                capacityInfo.classList.remove("hidden");
                setMascotText(`✅ Great! This image can hold up to <strong>${(data.lsb_matching_capacity_bytes / 1024).toFixed(1)} KB</strong> of confidential data!`);
            }
        } catch (err) {
            console.error("Capacity fetch error:", err);
        }
    });

    // Helper: Number counter animation
    function animateValue(elem, start, end, duration, suffix = "") {
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const current = (progress * (end - start) + start).toFixed(2);
            elem.textContent = `${current}${suffix}`;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                elem.textContent = `${end}${suffix}`;
            }
        }
        window.requestAnimationFrame(step);
    }

    embedForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const file = embedCoverInput.files[0];
        if (!file) {
            alert("Please select a cover image first.");
            return;
        }

        embedSubmitBtn.disabled = true;
        embedSubmitBtn.innerHTML = "<span>⚡ Encrypting & Embedding Bits...</span>";
        if (scanLaser) scanLaser.classList.add("scanning");
        setMascotText("⚙️ Processing AES-256-GCM cipher and mapping pixels into the image carrier...");

        const formData = new FormData();
        formData.append("image", file);
        formData.append("message", embedMessage.value);
        formData.append("password", document.getElementById("embedPassword").value);
        formData.append("method", embedMethodInput.value);
        formData.append("format", document.getElementById("embedFormat").value);

        try {
            const resp = await fetch("/api/embed", { method: "POST", body: formData });
            const data = await resp.json();

            if (!resp.ok) {
                playErrorBuzzer();
                alert(data.error || "Embedding failed.");
                setMascotText(`⚠️ Oops! Embedding error: ${data.error}`);
            } else {
                playSuccessFanfare();
                triggerConfetti();

                document.getElementById("embedPlaceholder").classList.add("hidden");
                const resCard = document.getElementById("embedResultDetails");
                resCard.classList.remove("hidden");

                // Animate Numbers
                animateValue(document.getElementById("resPsnr"), 0, data.metrics.psnr_db, 800, " dB");
                document.getElementById("resSsim").textContent = data.metrics.ssim;
                document.getElementById("resMse").textContent = data.metrics.mse;
                document.getElementById("resTime").textContent = `${data.elapsed_ms} ms`;

                document.getElementById("coverPreview").src = data.cover_url;
                document.getElementById("stegoPreview").src = data.stego_url;

                const dlLink = document.getElementById("downloadStegoLink");
                dlLink.href = data.stego_url;
                dlLink.download = data.stego_filename;

                // Setup "Test in Extract Tab"
                document.getElementById("sendToExtractBtn").onclick = () => {
                    document.querySelector('[data-tab="extract-tab"]').click();
                    document.getElementById("extractPassword").value = document.getElementById("embedPassword").value;
                    document.getElementById("extractMethod").value = embedMethodInput.value;
                    setMascotText("➡️ Switched to Extract Tab! Just click extract to decrypt your message!");
                };

                setMascotText(`🎉 <strong>Embedding Complete!</strong> PSNR is <strong>${data.metrics.psnr_db} dB</strong>. The human eye cannot detect any difference!`);
            }
        } catch (err) {
            playErrorBuzzer();
            alert("Error connecting to server: " + err.message);
        } finally {
            if (scanLaser) scanLaser.classList.remove("scanning");
            embedSubmitBtn.disabled = false;
            embedSubmitBtn.innerHTML = "<span>✨ Embed Secret Message</span>";
        }
    });

    // =========================================================
    // 8. INTERACTIVE BEFORE / AFTER SPLIT COMPARISON SLIDER
    // =========================================================
    const splitContainer = document.getElementById("splitSliderContainer");
    const stegoSplitLayer = document.getElementById("stegoSplitLayer");
    const splitHandle = document.getElementById("splitHandle");
    let isDraggingSplit = false;

    if (splitContainer && splitHandle && stegoSplitLayer) {
        function updateSplitPosition(clientX) {
            const rect = splitContainer.getBoundingClientRect();
            let offsetX = clientX - rect.left;
            offsetX = Math.max(0, Math.min(offsetX, rect.width));
            const percentage = (offsetX / rect.width) * 100;
            stegoSplitLayer.style.width = `${percentage}%`;
            splitHandle.style.left = `${percentage}%`;
        }

        splitHandle.addEventListener("mousedown", (e) => {
            isDraggingSplit = true;
            e.preventDefault();
        });

        window.addEventListener("mouseup", () => {
            isDraggingSplit = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDraggingSplit) return;
            updateSplitPosition(e.clientX);
        });

        // Touch support for tablets / touch screens
        splitHandle.addEventListener("touchstart", (e) => {
            isDraggingSplit = true;
        });
        window.addEventListener("touchend", () => {
            isDraggingSplit = false;
        });
        window.addEventListener("touchmove", (e) => {
            if (!isDraggingSplit || !e.touches[0]) return;
            updateSplitPosition(e.touches[0].clientX);
        });
    }

    // =========================================================
    // 9. INTERACTIVE BIT-PLANE X-RAY VISUALIZER
    // =========================================================
    const toggleBitplaneBtn = document.getElementById("toggleBitplaneBtn");
    const bitplaneWrapper = document.getElementById("bitplaneWrapper");
    const bitplaneCanvas = document.getElementById("bitplaneCanvas");

    if (toggleBitplaneBtn && bitplaneWrapper && bitplaneCanvas) {
        toggleBitplaneBtn.addEventListener("click", () => {
            playScanBlip();
            if (!bitplaneWrapper.classList.contains("hidden")) {
                bitplaneWrapper.classList.add("hidden");
                toggleBitplaneBtn.textContent = "🔬 View LSB Plane (X-Ray Mode)";
                return;
            }

            const stegoImg = document.getElementById("stegoPreview");
            if (!stegoImg || !stegoImg.src) {
                alert("Please embed an image first to visualize its bit-plane.");
                return;
            }

            const tempImg = new Image();
            tempImg.crossOrigin = "anonymous";
            tempImg.src = stegoImg.src;
            tempImg.onload = () => {
                const offCanvas = document.createElement("canvas");
                offCanvas.width = tempImg.naturalWidth;
                offCanvas.height = tempImg.naturalHeight;
                const offCtx = offCanvas.getContext("2d");
                offCtx.drawImage(tempImg, 0, 0);

                const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
                const data = imgData.data;

                // Extract 0th bit of green channel and scale to 0 or 255
                for (let i = 0; i < data.length; i += 4) {
                    const lsb = data[i + 1] & 1; // green LSB
                    const val = lsb ? 255 : 0;
                    data[i] = val;     // R
                    data[i + 1] = val; // G
                    data[i + 2] = val; // B
                }

                bitplaneCanvas.width = tempImg.naturalWidth;
                bitplaneCanvas.height = tempImg.naturalHeight;
                const bpCtx = bitplaneCanvas.getContext("2d");
                bpCtx.putImageData(imgData, 0, 0);

                bitplaneWrapper.classList.remove("hidden");
                toggleBitplaneBtn.textContent = "❌ Close LSB Plane X-Ray";
                setMascotText("🔬 <strong>X-Ray Revealed!</strong> Notice how the least-significant bit plane looks like pure random static noise!");
            };
        });
    }

    // =========================================================
    // 10. EXTRACT SECRET & AUTHENTICATION
    // =========================================================
    const extractForm = document.getElementById("extractForm");
    const extractImageInput = document.getElementById("extractImageInput");
    const extractImageName = document.getElementById("extractImageName");
    const extractSubmitBtn = document.getElementById("extractSubmitBtn");

    extractImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            extractImageName.textContent = `Selected: ${file.name}`;
            playScanBlip();
            setMascotText(`🔍 Ready to extract from <strong>${file.name}</strong>! Enter the passphrase.`);
        }
    });

    extractForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const file = extractImageInput.files[0];
        if (!file) {
            alert("Please select a stego image to extract from.");
            return;
        }

        extractSubmitBtn.disabled = true;
        extractSubmitBtn.innerHTML = "<span>🔓 Decrypting & Authenticating...</span>";

        const formData = new FormData();
        formData.append("image", file);
        formData.append("password", document.getElementById("extractPassword").value);
        formData.append("method", document.getElementById("extractMethod").value);

        const resPlaceholder = document.getElementById("extractPlaceholder");
        const resSuccess = document.getElementById("extractResultDetails");
        const resError = document.getElementById("extractErrorDetails");

        resPlaceholder.classList.add("hidden");
        resSuccess.classList.add("hidden");
        resError.classList.add("hidden");

        try {
            const resp = await fetch("/api/extract", { method: "POST", body: formData });
            const data = await resp.json();

            if (!resp.ok) {
                playErrorBuzzer();
                resError.classList.remove("hidden");
                document.getElementById("extractErrorMsg").textContent = data.error || "Extraction failed.";
                setMascotText("❌ <strong>Decryption Failed!</strong> Incorrect passphrase or the stego data was tampered with.");
            } else {
                playSuccessFanfare();
                triggerConfetti();
                resSuccess.classList.remove("hidden");
                document.getElementById("extractMethodBadge").textContent = data.method;
                document.getElementById("extractTime").textContent = data.elapsed_ms;
                document.getElementById("extractedMessageText").textContent = data.message;
                document.getElementById("extractedLength").textContent = data.length_bytes;
                setMascotText(`🎉 <strong>Success!</strong> Secret message verified and decrypted in <strong>${data.elapsed_ms} ms</strong>!`);
            }
        } catch (err) {
            playErrorBuzzer();
            resError.classList.remove("hidden");
            document.getElementById("extractErrorMsg").textContent = "Network error: " + err.message;
        } finally {
            extractSubmitBtn.disabled = false;
            extractSubmitBtn.innerHTML = "<span>🔓 Extract & Decrypt Secret</span>";
        }
    });

    document.getElementById("copyExtractedBtn").addEventListener("click", () => {
        const text = document.getElementById("extractedMessageText").textContent;
        navigator.clipboard.writeText(text).then(() => {
            playTone(800, 0.1, "sine");
            alert("Plaintext secret message copied to clipboard!");
        });
    });

    // =========================================================
    // 11. JPEG RESILIENCE LAB INTERACTION
    // =========================================================
    const jpegQSlider = document.getElementById("jpegQSlider");
    const jpegQVal = document.getElementById("jpegQVal");
    const runJpegLabBtn = document.getElementById("runJpegLabBtn");

    jpegQSlider.addEventListener("input", () => {
        jpegQVal.textContent = jpegQSlider.value;
        playTone(300 + jpegQSlider.value * 5, 0.03, "sine");
    });

    runJpegLabBtn.addEventListener("click", async () => {
        const coverInput = document.getElementById("jpegLabCover");
        const file = coverInput.files[0];
        if (!file) {
            alert("Please upload a cover image for the JPEG resilience test.");
            return;
        }

        runJpegLabBtn.disabled = true;
        runJpegLabBtn.textContent = "🌪️ Simulating Lossy JPEG Compression & Extraction...";
        setMascotText("🌪️ Simulating heavy JPEG quantization noise! Testing if Reed-Solomon can save the message...");

        const formData = new FormData();
        formData.append("image", file);
        formData.append("message", document.getElementById("jpegLabMessage").value);
        formData.append("password", document.getElementById("jpegLabPassword").value);
        formData.append("quality", jpegQSlider.value);

        try {
            const resp = await fetch("/api/jpeg-lab", { method: "POST", body: formData });
            const data = await resp.json();

            if (!resp.ok) {
                playErrorBuzzer();
                alert(data.error || "JPEG lab experiment failed.");
            } else {
                playSuccessFanfare();
                triggerConfetti();
                document.getElementById("reportQ").textContent = data.quality;
                const tbody = document.getElementById("jpegLabTableBody");
                tbody.innerHTML = "";

                data.results.forEach(item => {
                    const tr = document.createElement("tr");
                    const statusClass = item.survived ? "text-success font-bold" : "text-danger font-bold";
                    const statusIcon = item.survived ? "✅ " : "❌ ";
                    tr.innerHTML = `
                        <td><strong>${item.method}</strong></td>
                        <td>${item.domain}</td>
                        <td class="${statusClass}">${statusIcon} ${item.status}</td>
                        <td><small>${item.note} <em>(${item.error})</em></small></td>
                    `;
                    tbody.appendChild(tr);
                });

                document.getElementById("jpegLabResults").classList.remove("hidden");
                setMascotText(`🎯 <strong>Experiment Result:</strong> Notice how Sequential LSB died, but our <strong>Robust DCT + Reed-Solomon</strong> survived completely at Q=${data.quality}!`);
            }
        } catch (err) {
            playErrorBuzzer();
            alert("Error in JPEG test: " + err.message);
        } finally {
            runJpegLabBtn.disabled = false;
            runJpegLabBtn.textContent = "⚡ Run JPEG Recompression Resilience Test";
        }
    });

    // =========================================================
    // 12. STEGANALYSIS ATTACK LAB (CHI-SQUARE & RS)
    // =========================================================
    const runSteganalysisBtn = document.getElementById("runSteganalysisBtn");
    const steganalysisInput = document.getElementById("steganalysisInput");

    runSteganalysisBtn.addEventListener("click", async () => {
        const file = steganalysisInput.files[0];
        if (!file) {
            alert("Please choose an image to perform steganalysis on.");
            return;
        }

        runSteganalysisBtn.disabled = true;
        runSteganalysisBtn.textContent = "🔬 Executing χ² & RS Statistical Analysis...";
        setMascotText("🕵️ Detective mode active! Analyzing histogram pairs and regular/singular mask groups...");

        const formData = new FormData();
        formData.append("image", file);

        try {
            const resp = await fetch("/api/steganalysis", { method: "POST", body: formData });
            const data = await resp.json();

            if (!resp.ok) {
                playErrorBuzzer();
                alert(data.error || "Steganalysis failed.");
            } else {
                playSuccessFanfare();
                document.getElementById("steganalysisResults").classList.remove("hidden");

                // Populate Chi-Square
                const chi = data.chi_square;
                const chiBanner = document.getElementById("chiVerdictBanner");
                chiBanner.className = "verdict-banner " + (chi.detected_as_stego ? "verdict-flagged" : "verdict-clean");
                document.getElementById("chiVerdictIcon").textContent = chi.detected_as_stego ? "⚠️" : "🛡️";
                document.getElementById("chiVerdictText").textContent = chi.conclusion;
                document.getElementById("chiStat").textContent = chi.chi2_stat;
                document.getElementById("chiDf").textContent = chi.degrees_of_freedom;
                document.getElementById("chiPval").textContent = chi.p_value.toFixed(6);
                document.getElementById("chiProb").textContent = (chi.stego_probability * 100).toFixed(2) + "%";

                // Populate RS
                const rs = data.rs_analysis;
                const rsBanner = document.getElementById("rsVerdictBanner");
                rsBanner.className = "verdict-banner " + (rs.detected_as_stego ? "verdict-flagged" : "verdict-clean");
                document.getElementById("rsVerdictIcon").textContent = rs.detected_as_stego ? "⚠️" : "🛡️";
                document.getElementById("rsVerdictText").textContent = rs.conclusion;
                document.getElementById("rsRm").textContent = (rs.Rm * 100).toFixed(2) + "%";
                document.getElementById("rsRneg").textContent = (rs.R_minus_m * 100).toFixed(2) + "%";
                document.getElementById("rsSm").textContent = (rs.Sm * 100).toFixed(2) + "%";
                document.getElementById("rsSneg").textContent = (rs.S_minus_m * 100).toFixed(2) + "%";
                document.getElementById("rsDeltaR").textContent = rs.delta_R.toFixed(4);
                document.getElementById("rsPayload").textContent = (rs.estimated_payload_rate * 100).toFixed(2) + "%";

                setMascotText("📊 <strong>Analysis Complete!</strong> Check out the Chi-Square and RS verdicts above!");
            }
        } catch (err) {
            playErrorBuzzer();
            alert("Error executing steganalysis: " + err.message);
        } finally {
            runSteganalysisBtn.disabled = false;
            runSteganalysisBtn.textContent = "🔬 Execute χ² and RS Steganalysis";
        }
    });

    // =========================================================
    // 13. BENCHMARK & EVALUATION SUITE
    // =========================================================
    const runBenchmarkBtn = document.getElementById("runBenchmarkBtn");
    const benchCoverInput = document.getElementById("benchCoverInput");

    runBenchmarkBtn.addEventListener("click", async () => {
        const file = benchCoverInput.files[0];
        if (!file) {
            alert("Please select a cover image for running the benchmark suite.");
            return;
        }

        runBenchmarkBtn.disabled = true;
        runBenchmarkBtn.textContent = "📊 Running Multi-Quality Evaluation Matrix (~5s)...";
        setMascotText("📈 Generating complete academic benchmark matrix across all methods and JPEG qualities!");

        const formData = new FormData();
        formData.append("image", file);
        formData.append("payload_size", document.getElementById("benchPayloadSize").value);
        formData.append("password", "BenchMatrixSecretPass2026");

        try {
            const resp = await fetch("/api/benchmark", { method: "POST", body: formData });
            const data = await resp.json();

            if (!resp.ok) {
                playErrorBuzzer();
                alert(data.error || "Benchmark failed.");
            } else {
                playSuccessFanfare();
                triggerConfetti();
                document.getElementById("benchResults").classList.remove("hidden");
                document.getElementById("downloadBenchCsv").href = data.csv_url;

                const tbody = document.getElementById("benchTableBody");
                tbody.innerHTML = "";

                data.data.forEach(row => {
                    const tr = document.createElement("tr");
                    const succBadge = row["Extraction Success"]
                        ? `<span class="text-success font-bold">✔ Yes</span>`
                        : `<span class="text-danger font-bold">✖ No</span>`;

                    tr.innerHTML = `
                        <td><strong>${row["Method"]}</strong></td>
                        <td>${row["Condition"]}</td>
                        <td>${row["Payload (Bytes)"]} B</td>
                        <td>${row["Embedding Time (ms)"]}</td>
                        <td>${row["Extraction Time (ms)"]}</td>
                        <td>${row["PSNR (dB)"] ?? "-"}</td>
                        <td>${row["SSIM"] ?? "-"}</td>
                        <td>${row["Chi-Square Stat"]}</td>
                        <td>${row["RS delta_R"]}</td>
                        <td>${succBadge}</td>
                        <td>${row["BER"]}</td>
                    `;
                    tbody.appendChild(tr);
                });

                setMascotText("🏆 <strong>Benchmark Generated!</strong> Click 'Export CSV Report' to download the spreadsheet for your project documentation!");
            }
        } catch (err) {
            playErrorBuzzer();
            alert("Benchmark execution error: " + err.message);
        } finally {
            runBenchmarkBtn.disabled = false;
            runBenchmarkBtn.textContent = "📊 Run Comprehensive Benchmark";
        }
    });
});
