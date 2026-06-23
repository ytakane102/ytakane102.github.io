import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# .envファイルからAPIキーを読み込む
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def expand_hint(hint_word: str) -> list[str]:
    """
    【意味展開エージェント】
    人間のヒントを受け取り、ダブルミーニングや背景を解釈して複数の「展開語」を出力する。
    """
    system_prompt = """
    あなたは連想ゲーム「コードネーム」の優秀な意味解析エージェントです。
    マスターから与えられたヒント単語が持つ「多義性」や「連想される概念」を解釈し、
    ベクトル計算に有利なように3つの関連単語に展開してください。
    出力は必ず以下のようなJSONの配列形式のみにしてください。
    例: ["海", "産卵", "塩水"]
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"ヒント単語: {hint_word}"}
        ],
        temperature=0.7
    )
    
    # AIが返してきたJSON形式の文字列を、Pythonのリストに変換
    try:
        expanded_words = json.loads(response.choices[0].message.content)
        return expanded_words
    except Exception as e:
        print("JSONの解析に失敗しました:", e)
        return [hint_word] # 失敗した場合は元のヒントをそのまま返す