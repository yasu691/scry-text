import { NextResponse } from "next/server";
import axios from "axios";
import OpenAI from "openai";

// システムプロンプトの定義
// このプロンプトはAIの振る舞いを指定します
const systemPrompt = `あなたは日記作成を支援するAIアシスタントです。
1. ユーザーの入力を分析し、その文体、トーン、内容に合わせて、自然に続く文章を生成してください。
2. 返答や説明ではなく、あくまでもユーザーが書いているかのような文章の続きを提案してください。
`;

// POSTリクエストを処理する非同期関数
export async function POST(req: Request) {
  try {
    // リクエストボディからプロンプトを抽出
    const { prompt } = await req.json();

    // OpenAI APIキーが設定されているか確認
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OPENAI_API_KEY is not set");
    }

    console.log("Sending request to OpenAI API");
    // OpenAI APIにリクエストを送信
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini", // 使用するモデル
        messages: [
          { role: "system", content: systemPrompt }, // システムメッセージ
          { role: "user", content: prompt }, // ユーザーのプロンプト
        ],
        max_tokens: 10, // 生成するトークンの最大数
        n: 1, // 生成する回答の数
        stop: null, // 生成を停止する条件（ここではnull）
        temperature: 0.7, // 生成の多様性（0.0-1.0）
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // 認証ヘッダー
        },
      }
    );

    console.log("Received response from OpenAI API");
    // APIレスポンスから予測テキストを抽出し、JSONとして返す
    return NextResponse.json({
      prediction: response.data.choices[0].message.content.trim(),
    });
  } catch (error) {
    console.error("Error in API route:", error);

    // エラーハンドリング
    if (axios.isAxiosError(error)) {
      // Axiosのエラーの場合
      console.error("Axios error details:", error.response?.data);
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      return NextResponse.json({ error: message }, { status });
    } else if (error instanceof Error) {
      // 一般的なエラーの場合
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 予期せぬエラーの場合
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}