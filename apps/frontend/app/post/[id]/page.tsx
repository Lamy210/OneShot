"use client"

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: post, isLoading, isError, error } = trpc.posts.getById.useQuery(id);
  const reportMutation = trpc.reports.create.useMutation();
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  if (isLoading) return <div>読み込み中...</div>;
  if (isError || !post) return <div className="text-red-500">投稿が見つかりません</div>;

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);
    setReportSuccess(false);
    if (!reason.trim()) {
      setReportError("通報理由を入力してください");
      return;
    }
    try {
      await reportMutation.mutateAsync({ postId: id, reason });
      setReportSuccess(true);
      setShowReport(false);
      setReason("");
    } catch (err: any) {
      setReportError(err.message || "通報に失敗しました");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button onClick={() => router.back()} className="mb-4 text-primary-600 hover:underline">← 戻る</button>
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <div className="mb-2 text-gray-600">カテゴリ: {post.category}</div>
      <div className="mb-2 text-gray-600">作成者: {post.author?.nickname || "-"}</div>
      <div className="mb-2 text-gray-600">作成日: {new Date(post.createdAt).toLocaleDateString()}</div>
      <div className="mb-2 text-gray-600">予算: {post.budget.toLocaleString()} 円</div>
      {post.deadline && (
        <div className="mb-2 text-gray-600">締切: {new Date(post.deadline).toLocaleDateString()}</div>
      )}
      <div className="mt-6 whitespace-pre-line border-t pt-4 text-lg">{post.content}</div>

      {/* 通報ボタン */}
      <div className="mt-8">
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          onClick={() => setShowReport(true)}
        >
          通報する
        </button>
      </div>

      {/* 通報モーダル */}
      {showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">通報</h2>
            <form onSubmit={handleReport}>
              <textarea
                className="w-full border rounded p-2 mb-2"
                rows={4}
                placeholder="通報理由を入力してください（200文字以内）"
                maxLength={200}
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
              {reportError && <div className="text-red-500 mb-2">{reportError}</div>}
              <div className="flex justify-end space-x-2">
                <button type="button" className="px-4 py-2" onClick={() => setShowReport(false)}>キャンセル</button>
                <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">送信</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 通報成功メッセージ */}
      {reportSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
          通報が送信されました。ご協力ありがとうございます。
        </div>
      )}
    </div>
  );
} 