"use client"

import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function PaymentListPage() {
  const { data, isLoading, isError, error } = trpc.payments.list.useQuery({ limit: 20 });
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (data) setPayments(data.payments);
  }, [data]);

  if (isLoading) return <div>読み込み中...</div>;
  if (isError) return <div className="text-red-500">{error?.message || "エラーが発生しました"}</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">決済管理</h1>
      <table className="min-w-full bg-white border rounded shadow">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">ID</th>
            <th className="py-2 px-4 border-b">依頼タイトル</th>
            <th className="py-2 px-4 border-b">支払者</th>
            <th className="py-2 px-4 border-b">金額</th>
            <th className="py-2 px-4 border-b">手数料</th>
            <th className="py-2 px-4 border-b">ステータス</th>
            <th className="py-2 px-4 border-b">作成日</th>
            <th className="py-2 px-4 border-b">操作</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 && (
            <tr>
              <td colSpan={8} className="py-4 text-center text-gray-500">決済履歴がありません</td>
            </tr>
          )}
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{payment.id}</td>
              <td className="py-2 px-4 border-b">{payment.post?.title || "-"}</td>
              <td className="py-2 px-4 border-b">{payment.payer?.nickname || "-"}</td>
              <td className="py-2 px-4 border-b">{payment.amount.toLocaleString()} 円</td>
              <td className="py-2 px-4 border-b">{payment.platformFee.toLocaleString()} 円</td>
              <td className="py-2 px-4 border-b">{payment.status}</td>
              <td className="py-2 px-4 border-b">{new Date(payment.createdAt).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b">
                {/* 詳細・返金ボタンは今後実装 */}
                <button className="text-primary-600 hover:underline mr-2">詳細</button>
                <button className="text-red-600 hover:underline">返金</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 