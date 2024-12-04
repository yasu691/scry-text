"use client";

import { getPrediction } from "../utils/api";
import { use, useCallback, useEffect, useRef, useState } from "react";

// エディタコンポーネント
const ScryEditor: React.FC = () => {
  // 状態変数の定義
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
        const result = await getPrediction(text);
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
  }, []);

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
      const timeoutId = setTimeout(() => fetchPrediction(input), 200);
      // timeoutのタイマーをリセットする
      return () => clearTimeout(timeoutId);
    }
  }, [input, isComposing, fetchPrediction]);

  // UIのレンダリング
  return (
    <div className="bg-transparent flex items-top justify-center">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-slate-300 text-sm">
            未来を確定させるにはTabボタンを押して!
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