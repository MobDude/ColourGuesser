let COLORS = [];

fetch('colornames.json')
  .then(res => res.json())
  .then(data => {
    COLORS = data; // store JSON in global COLORS variable
    initGame();    // start the game after JSON is loaded
  })
  .catch(err => console.error("Error loading colornames.json:", err));

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}
function initGame() {

    const TOTAL_ROUNDS = 5;
    let round = 0;
    let totalScore = 0;
    let roundHistory = [];
    
    const todayKey = getTodayKey();
    const savedGame = localStorage.getItem("colorGuess_" + todayKey);

    if (savedGame) {
        const saved = JSON.parse(savedGame);

        totalScore = saved.totalScore;
        roundHistory = saved.roundHistory;

        // hide game UI
        document.getElementById("picker").style.display = "none";
        document.getElementById("hex-display").style.display = "none";
        document.getElementById("reveal").style.display = "none";
        document.getElementById("next").style.display = "none";
        document.getElementById("progress").style.display = "none";

        renderFinalScreen();
        return;
    }
    
    // --- progress dots ---
    const progress = document.getElementById("progress");
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const d = document.createElement("div");
    d.className = "dot";
    progress.appendChild(d);
    }

    function updateDots() {
    document.querySelectorAll(".dot").forEach((d, i) => {
        d.classList.toggle("active", i < round);
    });
    }

    // --- elements ---
    const picker = new iro.ColorPicker("#picker", {
    width: 260,
    color: "#808080"
    });

    const hexDisplay = document.getElementById("hex-display");
    const colorName = document.getElementById("color-name");
    const revealBtn = document.getElementById("reveal");
    const nextBtn = document.getElementById("next");
    const resultDiv = document.getElementById("result");

    // live picker updates color of heading and hex display
    picker.on("color:change", (c) => {
    hexDisplay.textContent = c.hexString;
    colorName.style.color = c.hexString;
    });

    // --- deterministic daily colors ---
    function dailyColors() {
    const date = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < date.length; i++) seed = date.charCodeAt(i) + ((seed << 5) - seed);

    function random() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    const selected = [];
    const usedIndices = new Set();
    while (selected.length < TOTAL_ROUNDS) {
        const idx = Math.floor(random() * COLORS.length);
        if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        selected.push(COLORS[idx]);
        }
    }

    // convert hex to rgb
    return selected.map(c => ({ ...c, rgb: hexToRgb(c.hex) }));
    }

    const targets = dailyColors();

    // --- scoring function ---
    function scoreColor(targetRgb, guessRgb) {
    const dr = targetRgb.r - guessRgb.r;
    const dg = targetRgb.g - guessRgb.g;
    const db = targetRgb.b - guessRgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const maxDistance = Math.sqrt(255 * 255 * 3);
    return Math.round((1 - distance / maxDistance) * 100);
    }

    // --- reveal button ---
    revealBtn.onclick = () => {
    const guess = picker.color.rgb;
    const target = targets[round];

    const score = scoreColor(target.rgb, guess);
    totalScore += score;

    roundHistory.push({
        guess: { ...guess },
        actual: target,
        score: score
    });

    // show color name and color squares
    colorName.textContent = target.name;
    colorName.style.color = target.hex;

    const guessHex = `rgb(${guess.r},${guess.g},${guess.b})`;
    const targetHex = target.hex;

    resultDiv.innerHTML = `
        <div class="score">
            <span class="points">${score}</span><span class="max">/100</span>
        </div>
        <div class="color-comparison">
            <div>
                Your Guess
                <div class="color-box" style="background:${guessHex}"></div>
            </div>
            <div>
                Actual Color
                <div class="color-box" style="background:${targetHex}"></div>
            </div>
        </div>
    `;

    revealBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    };

    // --- next round ---
    nextBtn.onclick = () => {
    round++;
    updateDots();
    resultDiv.innerHTML = "";

    if (round < TOTAL_ROUNDS) {
        colorName.textContent = targets[round].name;
        colorName.style.color = "#808080"; // reset heading color
        picker.color.hexString = "#808080"; // reset picker
        revealBtn.style.display = "inline-block";
        nextBtn.style.display = "none";
    } else {
        // finished all rounds
         colorName.textContent = "Finished!";
        colorName.style.color = "#ffffff";
        const todayKey = getTodayKey();
        localStorage.setItem(
        "colorGuess_" + getTodayKey(),
        JSON.stringify({
            totalScore,
            roundHistory,
            targets
        })
);


    renderFinalScreen();

    revealBtn.style.display = "none";
    nextBtn.style.display = "none";
    }
    };

    // --- utility ---
    function hexToRgb(hex) {
    hex = hex.replace("#", "");
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
    }

    function renderFinalScreen() {

    document.getElementById("picker").style.display = "none";
    document.getElementById("hex-display").style.display = "none";
    document.getElementById("reveal").style.display = "none";
    document.getElementById("next").style.display = "none";
    document.getElementById("progress").style.display = "none";
    colorName.style.color = "white";
    colorName.textContent = "Results";

    const puzzleNumber = getPuzzleNumber();

    let historyHtml = roundHistory.map((r, i) => {

        const guessHex = `rgb(${r.guess.r},${r.guess.g},${r.guess.b})`;

        return `
        <div class="round-row">
            <span class="round-num">${i+1}</span>

            <div class="color-box" style="background:${guessHex}"></div>

            <span class="arrow">→</span>

            <div class="color-box" style="background:${r.actual.hex}"></div>

            <span class="round-score">${r.score}/100</span>
        </div>
        `;

    }).join("");

    resultDiv.innerHTML = `
        <div class="final-score">
            <div class="puzzle-id">Daily Puzzle #${puzzleNumber}</div>

            <div class="score">
                <span class="points">${totalScore}</span>
                <span class="max">/500</span>
            </div>

            <button id="share">Share Results</button>

            <h3>Round History</h3>

            <div class="round-history">
                ${historyHtml}
            </div>
        </div>
    `;

    document.getElementById("share").onclick = shareResults;
}

function getPuzzleNumber() {
    const start = new Date("2023-01-01");
    const today = new Date();
    return Math.floor((today - start) / (1000*60*60*24));
}

function scoreToBar(score) {

    const filled = Math.round(score / 10);
    const empty = 10 - filled;

    return "🟩".repeat(filled) + "⬜".repeat(empty);
}

function generateShareText() {

    const puzzleNumber = getPuzzleNumber();

    let text = `ColorGuess #${puzzleNumber} ${totalScore}/500\n`;

    roundHistory.forEach(r => {
        text += `${scoreToBar(r.score)} ${r.score}/100\n`;
    });

    return text;
}

function shareResults() {

    const text = generateShareText();

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("share");
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Share Results", 2000);
    });
}

    // --- initialize first color ---
    colorName.textContent = targets[0].name;
    colorName.style.color = "#808080";
    picker.color.hexString = "#808080";
};