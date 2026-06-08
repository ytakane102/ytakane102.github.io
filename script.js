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

// --------------------------------------------------
// ① ゲームの初期化（ランダム盤面生成）
// --------------------------------------------------
function initGame() {
  isGameOver = false;
  allyLeft = 8;
  enemyLeft = 8;
  document.getElementById("ally-left").innerText = allyLeft;
  document.getElementById("ai-message").innerText = "マスター、ヒントをお願いします！";
  document.getElementById("vector-graph").classList.add("hidden"); // グラフを隠す

  // 単語プールをシャッフルして先頭の25個を取得
  const shuffledWords = WORD_POOL.sort(() => Math.random() - 0.5).slice(0, 25);
  
  // 役割の配列を作成（味方8、暗殺者1、敵8、一般人8）
  const roles = [
    ...Array(8).fill("ally"),
    ...Array(1).fill("assassin"),
    ...Array(8).fill("enemy"),
    ...Array(8).fill("neutral")
  ];
  // 役割もシャッフル
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
    board.appendChild(cardEl);
  });
}

// --------------------------------------------------
// ② ヒント送信時の処理（ターンの開始）
// --------------------------------------------------
function submitHint() {
  if (isGameOver) {
    alert("ゲームは終了しています。リロードして再挑戦してください！");
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
  btn.innerText = "AIが推論中...";
  btn.disabled = true;
  document.getElementById("ai-message").innerText = `「${hintWord}」（${hintNum}枚）ですね。ベクトル距離を計算しています...`;

  // 1.5秒後にAIが回答するシミュレーション
  setTimeout(() => {
    processAiTurn(hintWord, hintNum);
  }, 1500);
}

// --------------------------------------------------
// ③ AIの回答と勝敗判定
// --------------------------------------------------
function processAiTurn(hintWord, hintNum) {
  // ■ テスト用の特別挙動（"ドボン"と入力するとわざと暗殺者を引く）
  let chosenCards = [];
  if (hintWord === "ドボン") {
    const assassinCard = boardCards.find(c => c.role === "assassin");
    chosenCards.push(assassinCard);
  } else {
    // 通常のテスト：まだめくられていない「味方(ally)」のカードから、指定枚数だけ賢く選ぶ（モック挙動）
    const availableAllies = boardCards.filter(c => c.role === "ally" && !c.isRevealed);
    chosenCards = availableAllies.slice(0, Math.min(hintNum, availableAllies.length));
  }

  // グラフ用のHTMLを生成（モック）
  let graphHtml = "";
  let chosenWordNames = [];

  // 選んだカードを1枚ずつめくる処理
  chosenCards.forEach((card, index) => {
    card.isRevealed = true;
    chosenWordNames.push(card.word);
    
    // HTML側の見た目を変更
    const cardEl = document.getElementById(card.id);
    cardEl.classList.add(card.role); // 'ally' や 'assassin' のCSSクラスが付与されて色が変わる

    // グラフの数値を適当に生成（80%〜95%）
    const dummyScore = (0.95 - (index * 0.05)).toFixed(2);
    graphHtml += `<div class="graph-row"><span class="word">${card.word}</span> <progress max="100" value="${dummyScore * 100}"></progress> <span class="score">${dummyScore}</span></div>`;

    // 味方だったら残りを減らす
    if (card.role === "ally") allyLeft--;
  });

  // UIの更新
  document.getElementById("ally-left").innerText = allyLeft;
  document.getElementById("vector-graph").innerHTML = graphHtml;
  document.getElementById("vector-graph").classList.remove("hidden");

  // メッセージの更新
  document.getElementById("ai-message").innerText = `「${hintWord}」のベクトルから『${chosenWordNames.join("、")}』を選択しました！`;

  // --------------------------------------------------
  // ④ 勝利・敗北のチェック（味方ターン終了時）
  // --------------------------------------------------
  const hitAssassin = chosenCards.some(c => c.role === "assassin");

  if (hitAssassin) {
    isGameOver = true;
    document.getElementById("ai-message").innerHTML = "<b>【GAME OVER】</b><br>暗殺者を選んでしまいました…マスター、ごめんなさい！";
    document.getElementById("submit-btn").innerText = "ゲーム終了（リロードして再挑戦）";
  } else if (allyLeft <= 0) {
    isGameOver = true;
    document.getElementById("ai-message").innerHTML = "<b>【GAME CLEAR!!】</b><br>私たちの勝利です！";
    document.getElementById("submit-btn").innerText = "クリア！（リロードして再挑戦）";
  } else {
    // ゲーム続行の場合、敵のターンに移行する
    document.getElementById("submit-btn").innerText = "敵のターンです...";
    document.getElementById("submit-btn").disabled = true; // 人間の操作をロック
    
    // 2秒後に敵のターンを開始
    setTimeout(processEnemyTurn, 2000); 
  }
}

// --------------------------------------------------
// ⑤ 敵ターンの自動処理（ノイズシミュレーション付き）
// --------------------------------------------------
function processEnemyTurn() {
  if (isGameOver) return;

  // 敵のUI演出（味方のグラフを隠す）
  const graphEl = document.getElementById("vector-graph");
  if (graphEl) graphEl.classList.add("hidden");
  
  document.getElementById("ai-message").innerHTML = "<i>敵のAIスパイマスターが最適ヒントを計算中...</i>";

  setTimeout(() => {
    // 1. 敵が狙うターゲット数（1〜2枚）を決定
    const availableEnemies = boardCards.filter(c => c.role === "enemy" && !c.isRevealed);
    
    if (availableEnemies.length === 0) {
      finishEnemyTurn();
      return;
    }
    
    const targetCount = Math.min(Math.floor(Math.random() * 2) + 1, availableEnemies.length);
    let chosenCards = [];
    
    // 2. ベクトルノイズのシミュレーション（25%の確率で計算ミス・深読みをする）
    const NOISE_PROBABILITY = 0.25; 

    for (let i = 0; i < targetCount; i++) {
      if (Math.random() < NOISE_PROBABILITY) {
        // ノイズ発生！敵(赤)以外のカードを勘違いして引いてしまう
        const otherCards = boardCards.filter(c => c.role !== "enemy" && !c.isRevealed && !chosenCards.includes(c));
        if (otherCards.length > 0) {
          const mistakeCard = otherCards[Math.floor(Math.random() * otherCards.length)];
          chosenCards.push(mistakeCard);
        }
      } else {
        // 正常に敵(赤)のカードを引く
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
      card.isRevealed = true;
      chosenWordNames.push(card.word);
      document.getElementById(card.id).classList.add(card.role); 
      
      if (card.role === "enemy") enemyLeft--;
      if (card.role === "ally") {
        allyLeft--;
        document.getElementById("ally-left").innerText = allyLeft;
      }
      if (card.role === "assassin") hitAssassin = true;
    });

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
    } else if (enemyLeft <= 0) {
      isGameOver = true;
      document.getElementById("ai-message").innerHTML += "<br><b>【GAME OVER】</b><br>先に敵にすべて当てられてしまいました…。";
      document.getElementById("submit-btn").innerText = "敗北（リロードして再挑戦）";
    } else if (allyLeft <= 0) {
       isGameOver = true;
       document.getElementById("ai-message").innerHTML += "<br><b>【GAME CLEAR!!】</b><br>敵が勘違いで最後の味方を当ててくれました！ラッキー勝利！";
       document.getElementById("submit-btn").innerText = "クリア！（リロードして再挑戦）";
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
    document.getElementById("submit-btn").innerText = "次のヒントを出す";
    document.getElementById("submit-btn").disabled = false;
    document.getElementById("hint-word").value = ""; 
  }, 2000); 
}

// 起動時に盤面を描画
window.onload = initGame;
