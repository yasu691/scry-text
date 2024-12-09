"use client";

import { text } from "stream/consumers";
import { getPrediction } from "../utils/api";
import { use, useCallback, useEffect, useRef, useState } from "react";

// エディタコンポーネント
const ScryEditor: React.FC = () => {
  // 状態変数の定義
  const [systemPrompt, setSystemPrompt] = useState(`# 役割
あなたは、ユーザーが書き始めたビジネスにおけるチャットテキスト文章の続きを提案するAIアシスタントです。

## タスク
### 自然な文脈の理解と調和
ユーザーの入力内容を深く分析し、その文体、トーン、内容に完全に調和した自然な続きを生成してください。ユーザーのスタイルを尊重し、一貫性のある文章を提案することを心がけてください。

### 対話の特性に配慮

- テキストチャット特有の曖昧さや文脈の変化を理解し、不必要な誤解を招かないように注意してください。
- 丁寧で謙虚な態度を保ち、不遜な印象を与えないよう慎重に言葉を選んでください。

### 誤解のリスクを最小化

- ユーザーの意図や気持ちをくみ取り、押しつけがましい提案や高圧的な表現を避けてください。
- 文章のニュアンスが誤解されそうな場合は、慎重な言葉遣いを用い、可能な限り明確でシンプルな表現を心がけてください。

### ユーザー主体の体験を提供
あなたの出力は、あくまでユーザー自身が続きを書いたかのように感じられる文章でなければなりません。解説や返答を行わず、文章の提案に徹してください。

### 文脈を補完する工夫
話の流れや意図を的確にくみ取り、自然な展開や関連性の高いアイデアを盛り込むことで、ユーザーの目的達成を支援してください。ただし、独自の主張や意見を過度に盛り込まないよう注意してください。

## 追加の注意
- ユーザーの意図を十分に汲み取り、柔軟に対応してください。
- 長すぎる提案や不自然な展開を避け、ユーザーの文章スタイルに合った適切な長さの出力を心がけてください。
- テキストチャットにおける言葉の微妙なニュアンスを常に意識してください。

## 例

### 例1: カジュアルなトーン
ユーザーの入力
「今日はいい天気だから、散歩に行こうと思ったけど」

AIの提案
「途中で雲が出てきて、少し雨が降りそうな気配もしてきたんだよね。でも、傘を持って出かけるのも悪くないかなって。」

### 例2: ビジネス向けのトーン
ユーザーの入力
「この件に関して、明日までに解決策を提示する必要があります。具体的には」

AIの提案
「現状の課題を明確に洗い出し、優先順位をつけた上で、短期的な対策案と長期的な戦略を整理することが重要です。」

### 例3: 説明文調
ユーザーの入力
「まずは基本的な構成要素を整理し、それを基にして」

AIの提案
「全体像を描きつつ、細かい部分を段階的に組み立てていく方法が効果的です。このプロセスによって、後の修正が容易になります。」

### 例4: 物語調
ユーザーの入力
「彼女は静かな森の中を歩いていた。その時、突然」

AIの提案
「頭上の木々がざわめき、どこからともなく聞こえる低い唸り声に気づいた。足元の草むらが揺れたかと思うと、小さな影が飛び出してきた。」
`); // システムプロンプト
  const [input, setInput] = useState(""); // 入力テキスト
  const [prediction, setPrediction] = useState(""); // AIの予測テキスト
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const [copySuccess, setCopySuccess] = useState(false); // コピー成功フラグ
  const textareaRef = useRef<HTMLTextAreaElement>(null); // textareaのDOMを参照
  const [isComposing, setIsComposing] = useState(false); // IME入力中フラグ

  // ユーザーの入力をstateに反映する関数
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("text area event: hancleInput");
    setInput(e.target.value);
    setError(null);
  }

  // システムプロンプトの入力をstateに反映する関数
  const handleSystemPrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("text area event: handleSystemPrompt");
    setSystemPrompt(e.target.value);
    setError(null);
  }

  // 重複した文字列を削除する関数
  function mergeStrings(inputText: string, predictionText: string) {
    const inputTextLen = inputText.length;
    const predictionTextLen = predictionText.length;
    let maxOverlap = 0;

    // 重複部分の最大長を探す
    for (let i = 1; i <= Math.min(inputTextLen, predictionTextLen); i++) {
      const end = inputText.slice(-i);
      const start = predictionText.slice(0, i);
      if (end === start) {
        maxOverlap = i;
      }
    }

    // 重複部分を削除したPredictionTextを返す
    return predictionText.slice(maxOverlap);
  }

  // AIの予測を取得する関数
  const fetchPrediction = useCallback(async (text: string) => {
    // textが空白じゃないかを確認、trimは前後の空白を除去している
    if(text.trim()){
      try {
        const result = await getPrediction(text, systemPrompt);
        // 重複している部分を削除してからセット
        setPrediction(mergeStrings(text, result));
      } catch(error) {
        console.error("Error fetching prediction:", error);
        setError(
          // errorオブジェクトの型を確認して、Error型ならメッセージを表示、そうじゃなければ固定のエラーメッセージを表示
          error instanceof Error ? error.message : "Failed to fetch prediction. Please try again."
        );
        setPrediction("");
      }
    } else {
      setPrediction("");
    }
  }, [systemPrompt]); // systemPromptが変更されたときのみ関数を再作成

  // AIの予測をテキストエディタに適用する関数
  const applySuggestion = useCallback(() => {
    if (textareaRef.current && prediction) {
      const textarea = textareaRef.current; // テキストエリアのDOM要素を取得
      const newText = textarea.value + prediction; // 現在のテキストに予測テキストを追加して新しいテキストを作成
      setInput(newText); // Reactの状態を更新してUIと同期
      textarea.focus(); // テキストエリアにフォーカスを当てる
      textarea.setSelectionRange(newText.length, newText.length); // カーソルを新しいテキストの末尾に移動
      setPrediction(""); // 予測テキストをクリアし、次の予測の準備をする
    }
  }, [prediction]); // predictionが変更されたときのみ関数を再作成

  // キーボードイベントを処理する関数（Tabキーで予測を適用）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      applySuggestion();
    }
  };

  const handleCopy = () => {
    // refオブジェクトのcurrentプロパティを見てDOMに存在していることを確認
    if (textareaRef.current) {
      const text = textareaRef.current.value;
      // navigatorオブジェクトからクリップボードにアクセスする
      navigator.clipboard.writeText(text).then(
        // クリップボードからのテキスト取得成功時
        () => {
          // コピー成功フラグをセット、2秒後にフラグリセット
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        },
        // 失敗時
        (error) => {
          console.error("Failed to copy text: ", error);
        }
      )
    }
  }

  // IME入力の開始と終了を処理するイベントリスナーを設定
  useEffect(() => {
    const textarea = textareaRef.current;
    // テキストエリアが存在しているときだけ処理
    if(textarea){
      const handleCompositionStart = () => setIsComposing(true);
      const handleCompositionEnd = () => setIsComposing(false);

      textarea.addEventListener("compositionstart", handleCompositionStart);
      textarea.addEventListener("compositionend", handleCompositionEnd);

      // クリーンアップ関数
      return () => {
        textarea.removeEventListener("compositionstart", handleCompositionStart);
        textarea.removeEventListener("compositionend", handleCompositionEnd);
      }
    }
  }, [fetchPrediction]);

  // 入力が変更されたときにAIの予測を取得（デバウンス処理付き）
  useEffect(() => {
    // IME入力時以外の時に入力予測を取得
    if (!isComposing) {
      // 遅延を付けて、inputが連続で変更されている間は予測が出ないようにする
      const timeoutId = setTimeout(() => fetchPrediction(input), 1000);
      // timeoutのタイマーをリセットする
      return () => clearTimeout(timeoutId);
    }
  }, [input, isComposing, fetchPrediction]);

  // UIのレンダリング
  return (
    <div className="bg-transparent flex items-top justify-center">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <div>
          <textarea
          className="w-full p-3 border border-gray-300 rounded min-h-[200px]
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          whitespace-pre-wrap break-words bg-white text-gray-800"
          value={systemPrompt}
          onChange={handleSystemPrompt}
          />
        </div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-slate-300 text-sm">
            Tabを押すと予測を適用できます
          </p>
          <button onClick={handleCopy}
            className="px-4 py-2 bg-slate-300 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
            {copySuccess ? "Copied" : "Copy Text"}
          </button>
        </div>
        <div className="relative w-full">
          {/* AIの予測テキストを表示するオーバーレイ */}
          <div className="absolute top-0 left-0 p-3 pointer-events-none whitespace-pre-wrap break-words z-10 text-transparent">
            {input}
            {prediction && <span className="text-gray-400">{prediction}</span>}
          </div>
          {/* 編集可能なテキストエリア */}
          <textarea
          className="w-full p-3 border border-gray-300 rounded min-h-[200px]
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          whitespace-pre-wrap break-words bg-white text-gray-800"
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          />
        </div>
        {/* エラーメッセージの表示 */}
        {error && <div>{error}</div>}
      </div>
    </div>
  );
};

export default ScryEditor;