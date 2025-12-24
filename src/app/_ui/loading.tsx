export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-zinc-400">데이터 로딩 중...</div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-zinc-400 mb-4">데이터 로딩 중...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400 mx-auto"></div>
      </div>
    </div>
  );
}
