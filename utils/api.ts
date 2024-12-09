// axios ライブラリをインポート（HTTPリクエストを簡単に行うため）
import axios from "axios";

// アロー関数を使用してgetPrediction関数を定義し、エクスポート
export const getPrediction = async (prompt: string, systemPrompt: string): Promise<string> => {
  try {
    // '/api/prediction' エンドポイントにPOSTリクエストを送信
    // promptをリクエストボディに含める
    const response = await axios.post("/api/prediction", { prompt, systemPrompt });

    // レスポンスからpredictionプロパティを取り出して返す
    return response.data.prediction;
  } catch (error) {
    // エラーが発生した場合、コンソールにエラー情報を出力
    console.error("Error fetching prediction:", error);

    // エラー時は空文字列を返す（エラーハンドリングの簡略化）
    return "";
  }
};