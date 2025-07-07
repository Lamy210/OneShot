"use client"

import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function PostListPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: trpcError } = trpc.posts.list.useQuery({ limit: 20 });

  useEffect(() => {
    if (data) {
      setPosts(data.posts);
      setLoading(false);
    }
    if (isError && trpcError) {
      setError(trpcError.message);
      setLoading(false);
    }
  }, [data, isError, trpcError]);

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">依頼一覧</h1>
      <div className="mb-4 text-right">
        <Link href="/post/create" className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700">
          新規依頼を投稿
        </Link>
      </div>
      <table className="min-w-full bg-white border rounded shadow">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">タイトル</th>
            <th className="py-2 px-4 border-b">カテゴリ</th>
            <th className="py-2 px-4 border-b">作成者</th>
            <th className="py-2 px-4 border-b">作成日</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-500">依頼がありません</td>
            </tr>
          )}
          {posts.map((post) => (
            <tr key={post.id} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">
                <Link href={`/post/${post.id}`} className="text-primary-600 hover:underline">
                  {post.title}
                </Link>
              </td>
              <td className="py-2 px-4 border-b">{post.category}</td>
              <td className="py-2 px-4 border-b">{post.author?.nickname || "-"}</td>
              <td className="py-2 px-4 border-b">{new Date(post.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 