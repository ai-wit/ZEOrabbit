"use client";

import { useEffect, useState } from "react";

export default function TestCSRPage() {
  const [data, setData] = useState<string>("로딩 중...");
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 간단한 API 호출 테스트
    fetch("/api/me")
      .then(res => res.json())
      .then(data => {
        setData(`사용자: ${data.user?.email || "없음"}`);
      })
      .catch(err => {
        setData(`오류: ${err.message}`);
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">CSR 테스트 페이지</h1>
      <p className="mb-4">데이터: {data}</p>
      <p className="mb-4">카운트: {count}</p>
      <button
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        카운트 증가
      </button>
    </div>
  );
}
