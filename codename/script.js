// 1. 大容量の単語プール（ここから毎回ランダムに25個選ばれます）
const WORD_POOL = [
  "りんご", "宇宙", "パスワード", "病院", "赤", "鍵", "ガラス", "東京", "太陽", "電池",
  "データ", "歴史", "風", "鯨", "ゲーム", "ロボット", "紙", "山", "時計", "毒",
  "卵", "車", "パソコン", "音楽", "雪", "猫", "犬", "鳥", "本", "映画",
  "テレビ", "机", "椅子", "ペン", "ノート", "学校", "会社", "電車", "飛行機", "船",
  "愛", "平和", "未来", "魔法", "科学", "星", "夢", "鏡", "森", "砂漠"
];

// ゲームの現在の状態（State）を管理する変数
let boardCards = []; // 盤面の25枚のカードデータ {word, role, isRevealed}
let allyLeft = 8;    // 残りの正解（味方）の数
let enemyLeft = 8;
let isGameOver = false; // ゲーム終了フラグ
let currentTurn = "player"; // "player" or "enemy"
let firstTurn = "player"; // 先攻チーム。プレイヤーは常に青、相手は常に赤
let isWaitingForEnemyTurn = false;
let resultShowTimer = null;
let resultHideTimer = null;

function startGame() {
  const startScreen = document.getElementById("start-screen");
  if (startScreen) {
    startScreen.classList.add("hidden");
  }
  initGame();
}

function updateScoreUI() {
  const currentLeft = document.getElementById("current-left");
  if (!currentLeft) return;

  currentLeft.innerText = currentTurn === "enemy" ? enemyLeft : allyLeft;
}

function syncRemainingCounts() {
  if (boardCards.length === 0) return;

  allyLeft = boardCards.filter(c => c.role === "ally" && !c.isRevealed).length;
  enemyLeft = boardCards.filter(c => c.role === "enemy" && !c.isRevealed).length;
}

function revealCard(card) {
  if (!card || card.isRevealed) return;

  card.isRevealed = true;
  document.getElementById(card.id).classList.add(card.role);
}

function showResultOverlay(type, message) {
  const resultOverlay = document.getElementById("result-overlay");
  const resultText = document.getElementById("result-text");
  if (!resultOverlay || !resultText) return;

  window.clearTimeout(resultShowTimer);
  window.clearTimeout(resultHideTimer);
  resultText.innerText = message;
  resultOverlay.className = "result-overlay hidden";

  resultShowTimer = window.setTimeout(() => {
    resultOverlay.className = `result-overlay ${type}`;
    requestAnimationFrame(() => {
      resultOverlay.classList.add("show");
    });

    resultHideTimer = window.setTimeout(() => {
      resultOverlay.classList.remove("show");
      window.setTimeout(() => {
        resultOverlay.className = "result-overlay hidden";
      }, 280);
    }, 2000);
  }, 2000);
}

function hideResultOverlay() {
  const resultOverlay = document.getElementById("result-overlay");
  if (!resultOverlay) return;

  window.clearTimeout(resultShowTimer);
  window.clearTimeout(resultHideTimer);
  resultOverlay.className = "result-overlay hidden";
}

function updateTurnUI(turn) {
  currentTurn = turn;
  const turnInfo = document.querySelector(".turn-info");
  const scoreInfo = document.querySelector(".score-info");
  const turnBanner = document.getElementById("turn-banner");
  if (!turnInfo || !scoreInfo || !turnBanner) return;

  turnInfo.classList.toggle("player-turn", turn === "player");
  turnInfo.classList.toggle("enemy-turn", turn === "enemy");
  scoreInfo.classList.toggle("player-turn", turn === "player");
  scoreInfo.classList.toggle("enemy-turn", turn === "enemy");
  turnBanner.classList.toggle("player-turn", turn === "player");
  turnBanner.classList.toggle("enemy-turn", turn === "enemy");
  turnBanner.classList.remove("show");

  if (turn === "player") {
    turnInfo.innerText = "あなたのターン";
    turnBanner.innerText = "あなたのターン";
  } else {
    turnInfo.innerText = "相手のターン";
    turnBanner.innerText = "相手のターン";
  }
  updateScoreUI();

  requestAnimationFrame(() => {
    turnBanner.classList.add("show");
    window.clearTimeout(turnBanner.hideTimer);
    turnBanner.hideTimer = window.setTimeout(() => {
      turnBanner.classList.remove("show");
    }, 1400);
  });
}

// --------------------------------------------------
// ① ゲームの初期化（ランダム盤面生成）
// --------------------------------------------------
function initGame() {
  isGameOver = false;
  isWaitingForEnemyTurn = false;
  hideResultOverlay();
  firstTurn = Math.random() < 0.5 ? "player" : "enemy";
  const playerGoesFirst = firstTurn === "player";
  allyLeft = playerGoesFirst ? 9 : 8;
  enemyLeft = playerGoesFirst ? 8 : 9;
  updateTurnUI(firstTurn);
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.innerText = playerGoesFirst ? "AIに伝える" : "相手のターンです...";
    submitBtn.disabled = !playerGoesFirst;
  }
  document.getElementById("ai-message").innerText = playerGoesFirst
    ? "抽選の結果、青チームが先攻です。マスター、ヒントをお願いします！"
    : "抽選の結果、赤チームが先攻です。相手のターンから始まります。";
  document.getElementById("vector-graph").classList.add("hidden");

  // 単語プールをシャッフルして先頭の25個を取得
  const shuffledWords = WORD_POOL.sort(() => Math.random() - 0.5).slice(0, 25);
  
  // 役割の配列を作成（先攻9、後攻8、暗殺者1、一般人7）
  const roles = [
    ...Array(allyLeft).fill("ally"),
    ...Array(1).fill("assassin"),
    ...Array(enemyLeft).fill("enemy"),
    ...Array(7).fill("neutral")
  ];
  const shuffledRoles = roles.sort(() => Math.random() - 0.5);

  // 盤面データを作成
  boardCards = shuffledWords.map((word, index) => ({
    id: `card-${index}`,
    word: word,
    role: shuffledRoles[index],
    isRevealed: false
  }));

  // HTMLにカードを描画
  const board = document.getElementById("board");
  board.innerHTML = ""; 
  boardCards.forEach((cardData) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.id = cardData.id;
    cardEl.innerText = cardData.word;
    
    // スパイマスター機能のためにHTML側に正解データを持たせる
    cardEl.dataset.role = cardData.role; 
    
    board.appendChild(cardEl);
  });

  // ゲーム開始時はスパイマスターモードをONにする
  board.classList.add("spymaster-mode");
  const toggleBtn = document.getElementById("spymaster-toggle-btn");
  if(toggleBtn) {
    toggleBtn.innerText = "👁️ 答えを隠す";
    toggleBtn.classList.remove("hidden-mode");
  }

  if (!playerGoesFirst) {
    setTimeout(processEnemyTurn, 1600);
  }
}

// --------------------------------------------------
// ② ヒント送信時の処理（Python通信連携）
// --------------------------------------------------
async function submitHint() {
  if (isGameOver) {
    alert("ゲームは終了しています。リロードして再挑戦してください！");
    return;
  }

  if (isWaitingForEnemyTurn) {
    startEnemyTurn();
    return;
  }

  if (currentTurn !== "player") {
    alert("今は相手のターンです。しばらくお待ちください。");
    return;
  }

  const hintWord = document.getElementById("hint-word").value;
  const hintNum = parseInt(document.getElementById("hint-number").value, 10);
  
  if (!hintWord) {
    alert("ヒント単語を入力してください！");
    return;
  }

  // ボタンとUIをロック
  const btn = document.getElementById("submit-btn");
  btn.innerText = "Pythonサーバーでベクトル計算中...";
  btn.disabled = true;
  document.getElementById("ai-message").innerText = `「${hintWord}」（${hintNum}枚）ですね。コサイン類似度を計算しています...`;

  try {
    // 🌟 現在、盤面に残っている未めくりの単語リストを取得
    const currentBoardWords = boardCards
      .filter(c => !c.isRevealed)
      .map(c => c.word);

    // 🌟 バックエンドとの通信
    const response = await fetch("/api/human-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hint_word: hintWord,
        hint_number: hintNum,
        board_words: currentBoardWords // 盤面の単語をPythonに送る
      })
    });

    // Pythonから計算結果（本物のAIデータ）を受け取る
    const backendResult = await response.json();
    console.log("Pythonバックエンドからの返事:", backendResult);
    
    // 🌟 修正箇所：正しく backendResult.message を参照するように直しました 🌟
    document.getElementById("ai-message").innerText = backendResult.message;

    // 受け取った本物のデータを使ってターンを処理する
    processAiTurn(backendResult);

  } catch (error) {
    console.error("通信エラー:", error);
    alert("サーバーに繋がりませんでした！ローカルサーバーが起動しているか確認してください。");
    btn.innerText = "AIに伝える";
    btn.disabled = false;
  }
}

// --------------------------------------------------
// ③ AIの回答と勝敗判定（Pythonデータ使用版）
// --------------------------------------------------
function processAiTurn(backendResult) {
  // Pythonが選んだ単語のリストを取得
  const selectedWords = backendResult.selected_cards || [];
  let chosenCards = [];

  // 盤面データから該当するカードオブジェクトを探す
  selectedWords.forEach(word => {
    const card = boardCards.find(c => c.word === word && !c.isRevealed);
    if (card) {
      chosenCards.push(card);
    }
  });

  // グラフ用のHTMLを生成（Pythonのスコアデータを使用）
  let graphHtml = "";
  if (backendResult.scores) {
    backendResult.scores.forEach((item, index) => {
      // スコアは最大1.0なので、100倍してプログレスバーの％にする
      const percent = Math.max(0, item.score * 100);
      graphHtml += `<div class="graph-row"><span class="word">${item.word}</span> <progress max="100" value="${percent}"></progress> <span class="score">${item.score.toFixed(3)}</span></div>`;
    });
  }

  // 選んだカードを1枚ずつめくる処理
  chosenCards.forEach((card) => {
    revealCard(card);
  });
  syncRemainingCounts();

  // UIの更新
  updateScoreUI();
  document.getElementById("vector-graph").innerHTML = graphHtml;
  document.getElementById("vector-graph").classList.remove("hidden");

  // --------------------------------------------------
  // ④ 勝利・敗北のチェック（味方ターン終了時）
  // --------------------------------------------------
  const hitAssassin = chosenCards.some(c => c.role === "assassin");

  if (hitAssassin) {
    isGameOver = true;
    document.getElementById("ai-message").innerHTML = "<b>【GAME OVER】</b><br>暗殺者を選んでしまいました…マスター、ごめんなさい！";
    document.getElementById("submit-btn").innerText = "ゲーム終了（リロードして再挑戦）";
    showResultOverlay("assassin-result", "GAME OVER");
  } else if (allyLeft <= 0) {
    isGameOver = true;
    document.getElementById("ai-message").innerHTML = "<b>【GAME CLEAR!!】</b><br>すべての味方を救出しました！私たちの勝利です！";
    document.getElementById("submit-btn").innerText = "クリア！（リロードして再挑戦）";
    showResultOverlay("win", "YOU WIN");
  } else if (enemyLeft <= 0) {
    isGameOver = true;
    document.getElementById("ai-message").innerHTML = "<b>【GAME OVER】</b><br>相手のカードをすべてめくってしまいました…。";
    document.getElementById("submit-btn").innerText = "敗北（リロードして再挑戦）";
    showResultOverlay("lose", "YOU LOSE");
  } else {
    // ゲーム続行の場合、敵のターンに移行
    isWaitingForEnemyTurn = true;
    document.getElementById("submit-btn").innerText = "相手のターンへ";
    document.getElementById("submit-btn").disabled = false;
  }
}

function startEnemyTurn() {
  isWaitingForEnemyTurn = false;
  updateTurnUI("enemy");
  document.getElementById("submit-btn").innerText = "敵のターンです...";
  document.getElementById("submit-btn").disabled = true;
  setTimeout(processEnemyTurn, 600);
}

// --------------------------------------------------
// ⑤ 敵ターンの自動処理（ノイズシミュレーション付き）
// --------------------------------------------------
function processEnemyTurn() {
  if (isGameOver) return;

  // 敵のUI演出
  const graphEl = document.getElementById("vector-graph");
  if (graphEl) graphEl.classList.add("hidden");
  
  document.getElementById("ai-message").innerHTML = "<i>敵のAIスパイマスターが最適ヒントを計算中...</i>";

  setTimeout(() => {
    // 1. 敵が狙うターゲット数を決定
    const availableEnemies = boardCards.filter(c => c.role === "enemy" && !c.isRevealed);
    
    if (availableEnemies.length === 0) {
      syncRemainingCounts();
      updateScoreUI();
      if (enemyLeft <= 0) {
        isGameOver = true;
        document.getElementById("ai-message").innerHTML = "<b>【GAME OVER】</b><br>先に敵にすべて当てられてしまいました…。";
        document.getElementById("submit-btn").innerText = "敗北（リロードして再挑戦）";
        showResultOverlay("lose", "YOU LOSE");
      } else {
        finishEnemyTurn();
      }
      return;
    }
    
    const targetCount = Math.min(Math.floor(Math.random() * 2) + 1, availableEnemies.length);
    let chosenCards = [];
    
    // 2. ベクトルノイズのシミュレーション（25%の確率で計算ミス・深読みをする）
    const NOISE_PROBABILITY = 0.25; 

    for (let i = 0; i < targetCount; i++) {
      if (Math.random() < NOISE_PROBABILITY) {
        // ノイズ発生：敵(赤)以外のカードを勘違いして引く
        const otherCards = boardCards.filter(c => c.role !== "enemy" && !c.isRevealed && !chosenCards.includes(c));
        if (otherCards.length > 0) {
          const mistakeCard = otherCards[Math.floor(Math.random() * otherCards.length)];
          chosenCards.push(mistakeCard);
        }
      } else {
        chosenCards.push(availableEnemies[i]);
      }
    }

    // 3. ダミーヒントの生成
    const dummyHints = ["概念", "物質", "行動", "自然", "人工物", "空間", "情報"];
    const fakeHint = dummyHints[Math.floor(Math.random() * dummyHints.length)];

    // 4. カードをめくる処理
    let chosenWordNames = [];
    let hitAssassin = false;

    chosenCards.forEach(card => {
      revealCard(card);
      chosenWordNames.push(card.word);
      if (card.role === "assassin") hitAssassin = true;
    });
    syncRemainingCounts();
    updateScoreUI();

    // 5. 敵の行動結果メッセージを作成
    let resultMessage = `<span style="color:#dc2626; font-weight:bold;">【敵ターンの結果】</span><br>`;
    resultMessage += `敵マスターのヒント: 『${fakeHint} (${targetCount}枚)』<br>`;
    resultMessage += `敵AIは『${chosenWordNames.join("、")}』を選びました！<br>`;
    
    // AIの勘違い（ノイズ）が発生した場合のログ追加
    const hasMistake = chosenCards.some(c => c.role !== "enemy");
    if (hasMistake && !hitAssassin) {
      resultMessage += `<span style="color:#2563eb; font-size:0.85em;">（※ベクトルノイズにより敵AIが深読みしてミスしました！）</span>`;
    }

    document.getElementById("ai-message").innerHTML = resultMessage;

    // 6. 勝敗チェックとターン終了処理
    if (hitAssassin) {
      isGameOver = true;
      document.getElementById("ai-message").innerHTML += "<br><b>【GAME CLEAR!!】</b><br>敵が暗殺者を引いて自爆しました！私たちの勝利です！";
      document.getElementById("submit-btn").innerText = "クリア！（リロードして再挑戦）";
      showResultOverlay("win", "YOU WIN");
    } else if (enemyLeft <= 0) {
      isGameOver = true;
      document.getElementById("ai-message").innerHTML += "<br><b>【GAME OVER】</b><br>先に敵にすべて当てられてしまいました…。";
      document.getElementById("submit-btn").innerText = "敗北（リロードして再挑戦）";
      showResultOverlay("lose", "YOU LOSE");
    } else if (allyLeft <= 0) {
       isGameOver = true;
       document.getElementById("ai-message").innerHTML += "<br><b>【GAME CLEAR!!】</b><br>敵が勘違いで最後の味方を当ててくれました！ラッキー勝利！";
       document.getElementById("submit-btn").innerText = "クリア！（リロードして再挑戦）";
       showResultOverlay("win", "YOU WIN");
    } else {
      finishEnemyTurn();
    }
  }, 2000);
}

// --------------------------------------------------
// ⑥ 敵ターン終了後の復帰処理
// --------------------------------------------------
function finishEnemyTurn() {
  setTimeout(() => {
    updateTurnUI("player");
    document.getElementById("submit-btn").innerText = "次のヒントを出す";
    document.getElementById("submit-btn").disabled = false;
    document.getElementById("hint-word").value = ""; 
  }, 2000); 
}

// --------------------------------------------------
// ⑦ スパイマスターモード（答え透視）の切り替え
// --------------------------------------------------
function toggleSpymaster() {
  const board = document.getElementById("board");
  const btn = document.getElementById("spymaster-toggle-btn");
  
  if (board.classList.contains("spymaster-mode")) {
    // モードOFF（答えを隠す）
    board.classList.remove("spymaster-mode");
    btn.innerText = "👁️ 答えを見る";
    btn.classList.add("hidden-mode");
  } else {
    // モードON（答えを表示する）
    board.classList.add("spymaster-mode");
    btn.innerText = "👁️ 答えを隠す";
    btn.classList.remove("hidden-mode");
  }
}
