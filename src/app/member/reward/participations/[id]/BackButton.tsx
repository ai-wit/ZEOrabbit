'use client';

import { Button } from "@/app/_ui/primitives";

export function BackButton() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <Button onClick={handleBack} variant="primary" size="md">
      ← 목록으로 돌아가기
    </Button>
  );
}
