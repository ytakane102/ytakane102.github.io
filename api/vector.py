import os
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

# .envファイルからAPIキーを読み込む
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embedding(text: str) -> np.ndarray:
    """ヒント単語用：単語を1つだけベクトル化する"""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return np.array(response.data[0].embedding)

def get_embeddings_batch(texts: list[str]) -> list[np.ndarray]:
    """盤面用：複数の単語を一括でAPIに送り、ベクトルのリストを取得する"""
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    # 返ってきたデータを順番通りにNumPy配列のリストに変換
    return [np.array(data.embedding) for data in response.data]

def calculate_similarities_matrix(hint_vec: np.ndarray, board_vecs: list[np.ndarray]) -> np.ndarray:
    """
    ヒントベクトル(1次元)と盤面ベクトル群(2次元行列)の内積を
    NumPyの行列演算を用いて一括で計算し、全単語のコサイン類似度を返す
    """
    # 盤面のベクトルリストを (25, 1536) の行列に変換
    board_matrix = np.array(board_vecs)
    
    # 行列とベクトルの内積を一括計算 -> (25,) の配列になる
    dot_products = np.dot(board_matrix, hint_vec)
    
    # 各ベクトルのノルム（長さ）を計算
    hint_norm = np.linalg.norm(hint_vec)
    board_norms = np.linalg.norm(board_matrix, axis=1)
    
    # ゼロ割り算の回避
    if hint_norm == 0:
        return np.zeros(len(board_vecs))
        
    # コサイン類似度を一括計算 (要素ごとの割り算)
    similarities = dot_products / (board_norms * hint_norm)
    
    return similarities