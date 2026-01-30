"use client";

import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/app/_ui/primitives";

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

function validateFiles(files: File[]): string | null {
  if (files.length === 0) return null;
  if (files.length > MAX_FILES) {
    return `최대 ${MAX_FILES}개까지 업로드할 수 있습니다.`;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return "총 업로드 용량은 10MB 이하여야 합니다.";
  }
  return null;
}

type EvidenceUploadFormProps = {
  action: string;
  expiresAtLabel: string;
};

export function EvidenceUploadForm({ action, expiresAtLabel }: EvidenceUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = () => {
    const files = Array.from(inputRef.current?.files ?? []);
    setError(validateFiles(files));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const files = Array.from(inputRef.current?.files ?? []);
    const validationError = validateFiles(files);
    if (validationError) {
      event.preventDefault();
      setError(validationError);
      return;
    }
    setError(null);
  };

  return (
    <form
      action={action}
      method="post"
      encType="multipart/form-data"
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      <div className="text-sm text-zinc-300">
        증빙 내용을 입력하고 이미지 또는 동영상 최대 10개(총 10MB 이하)를 업로드하세요.
        <br />
        <span className="text-amber-200">주의: 제출 기한({expiresAtLabel})까지 업로드하지 않으면 참여가 취소됩니다.</span>
      </div>
      <textarea
        name="proofText"
        maxLength={2000}
        placeholder="증빙 내용(선택)"
        className="block w-full rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10"
        rows={4}
      />
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        required
        className="block w-full rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-50 hover:file:bg-white/15"
        onChange={handleChange}
      />
      {error ? <div className="text-xs text-red-200">{error}</div> : null}
      <Button type="submit" variant="primary" className="w-full">
        인증 제출
      </Button>
    </form>
  );
}
