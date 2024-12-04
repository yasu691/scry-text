import { NextResponse } from "next/server";
import axios from "axios";
import OpenAI from "openai";

// システムプロンプトの定義
// このプロンプトはAIの振る舞いを指定します
const systemPrompt = `# 役割
あなたは日記作成を支援するAIアシスタントです。

# タスク
1. 返答や説明ではなく、あくまでもユーザーが書いているかのような文章の続きを提案してください。
2. ユーザーの入力を分析し、その文体、トーン、内容に合わせて、自然に続く文章を生成してください。

# 例
入力：今日は
出力：、久しぶりにゆっくりと朝陽を浴びることが  
`;

// POSTリクエストを処理する非同期関数
export async function POST(req: Request) {
  try {
    // リクエストボディからプロンプトを抽出
    const { prompt } = await req.json();

    // GeminiのAPIキーが設定されているか確認
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      throw new Error("GEMINI_API_KEY is not set");
    }

    // OpenAIクライアントを作成してGeminiの設定を読み込ませる
    const openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    })

    console.log("Sending request to OpenAI API");

    // bodyの作成
    const body: OpenAI.ChatCompletionCreateParams = {
      model: "gemini-1.5-flash", // 使用するモデル
      messages: [
        { role: "system", content: systemPrompt }, // システムメッセージ
        { role: "user", content: prompt }, // ユーザーのプロンプト
      ],
      max_tokens: 10,
      temperature: 0.1
    };

    // Gemini APIにリクエストを送信
    const response = await openai.chat.completions.create(body);

    console.log("Received response from OpenAI API");
    // APIレスポンスから予測テキストを抽出し、JSONとして返す
    return NextResponse.json({
      prediction: response.choices[0].message.content,
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