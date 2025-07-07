"use client"

import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function UserListPage() {
  const { data, isLoading, isError, error } = trpc.users.list.useQuery({ limit: 20 });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (data) setUsers(data.users);
  }, [data]);

  if (isLoading) return <div>読み込み中...</div>;
  if (isError) return <div className="text-red-500">{error?.message || "エラーが発生しました"}</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>
      <table className="min-w-full bg-white border rounded shadow">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">ID</th>
            <th className="py-2 px-4 border-b">ニックネーム</th>
            <th className="py-2 px-4 border-b">メール</th>
            <th className="py-2 px-4 border-b">ロール</th>
            <th className="py-2 px-4 border-b">作成日</th>
            <th className="py-2 px-4 border-b">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-gray-500">ユーザーがいません</td>
            </tr>
          )}
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{user.id}</td>
              <td className="py-2 px-4 border-b">{user.nickname}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b">{user.role}</td>
              <td className="py-2 px-4 border-b">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b">
                {/* 詳細・編集・削除ボタンは今後実装 */}
                <button className="text-primary-600 hover:underline mr-2">詳細</button>
                <button className="text-blue-600 hover:underline mr-2">編集</button>
                <button className="text-red-600 hover:underline">削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 