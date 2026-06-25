from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import vector  # ◀◀ 修正：フォルダ内のvector.pyを正しく読み込む
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import vector

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# フロントエンドから受け取るデータの形
class TurnRequest(BaseModel):
    hint_word: str
    hint_number: int
    board_words: list[str]

@app.post("/api/human-turn")
async def process_human_turn(request: TurnRequest):
    print(f"ヒント: {request.hint_word}, 枚数: {request.hint_number}")
    print(f"盤面の単語数: {len(request.board_words)}枚")
    
    # 1. ヒント単語をベクトル化 (1536次元)
    hint_vec = vector.get_embedding(request.hint_word)
    
    # 2. 盤面の単語を一括でベクトル化
    board_vecs = vector.get_embeddings_batch(request.board_words)
    
    # 3. コサイン類似度（距離）を一括計算
    similarities = vector.calculate_similarities_matrix(hint_vec, board_vecs)
    
    # 4. 結果を計算スコア（高い順）に並び替える
    results = []
    for word, score in zip(request.board_words, similarities):
        results.append({
            "word": word, 
            "score": round(float(score), 3) # 小数第3位までに丸める
        })
    
    # スコア順に降順ソート
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # 上位のカードをAIの選択とする（マスターが指定した枚数分）
    selected_cards = [r["word"] for r in results[:request.hint_number]]
    
    return {
        "status": "success",
        "message": f"AIは「{request.hint_word}」のベクトルから『{', '.join(selected_cards)}』を選択しました！",
        "selected_cards": selected_cards,
        "scores": results[:3]  # フロントエンドのグラフ表示用に上位3件を返す
    }
