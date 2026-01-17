"use client";

import { useState, useTransition } from "react";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Input, Label, Select } from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";
import { createProduct } from "./actions";

type FormErrors = {
  name?: string;
  missionType?: string;
  unitPriceKrw?: string;
  vatPercent?: string;
  minOrderDays?: string;
  marketingCopy?: string;
  guideText?: string;
  general?: string;
};

export default function AdminProductNewPage() {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (formData: FormData): FormErrors => {
    const errors: FormErrors = {};

    const name = formData.get("name")?.toString().trim();
    if (!name || name.length === 0) {
      errors.name = "상품명을 입력해주세요.";
    } else if (name.length > 100) {
      errors.name = "상품명은 100자를 초과할 수 없습니다.";
    }

    const missionType = formData.get("missionType")?.toString();
    if (!missionType || !["TRAFFIC", "SAVE", "SHARE"].includes(missionType)) {
      errors.missionType = "상품 구분을 선택해주세요.";
    }

    const unitPriceKrw = formData.get("unitPriceKrw")?.toString();
    const unitPriceNum = unitPriceKrw ? parseInt(unitPriceKrw, 10) : null;
    if (!unitPriceNum || unitPriceNum < 1) {
      errors.unitPriceKrw = "단가는 1원 이상이어야 합니다.";
    } else if (unitPriceNum > 1000000) {
      errors.unitPriceKrw = "단가는 1,000,000원을 초과할 수 없습니다.";
    }

    const vatPercent = formData.get("vatPercent")?.toString();
    const vatPercentNum = vatPercent ? parseInt(vatPercent, 10) : null;
    if (vatPercentNum !== null && (vatPercentNum < 0 || vatPercentNum > 100)) {
      errors.vatPercent = "VAT는 0-100% 사이여야 합니다.";
    }

    const minOrderDays = formData.get("minOrderDays")?.toString();
    const minOrderDaysNum = minOrderDays ? parseInt(minOrderDays, 10) : null;
    if (!minOrderDaysNum || minOrderDaysNum < 1) {
      errors.minOrderDays = "최소 주문 기간은 1일 이상이어야 합니다.";
    } else if (minOrderDaysNum > 365) {
      errors.minOrderDays = "최소 주문 기간은 365일을 초과할 수 없습니다.";
    }

    const marketingCopy = formData.get("marketingCopy")?.toString();
    if (marketingCopy && marketingCopy.length > 10000) {
      errors.marketingCopy = "상품 설명 문구는 10,000자를 초과할 수 없습니다.";
    }

    const guideText = formData.get("guideText")?.toString();
    if (guideText && guideText.length > 50000) {
      errors.guideText = "상세 가이드는 50,000자를 초과할 수 없습니다.";
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    startTransition(async () => {
      try {
        console.log("상품 생성 요청 시작");
        await createProduct(formData);
        // 성공 시 redirect로 페이지 이동
      } catch (error) {
        console.error("상품 생성 실패:", error);
        setErrors({ general: "서버 오류가 발생했습니다." });
      }
    });
  };

  const handleBlur = (fieldName: keyof FormErrors) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const formData = new FormData(e.currentTarget.form!);
    const validationErrors = validateForm(formData);

    setErrors(prev => ({
      ...prev,
      [fieldName]: validationErrors[fieldName],
    }));
  };

  return (
    <PageShell
      header={
        <AdminHeader
          title="상품 생성"
          description="관리자"
        />
      }
    >
      <Card>
        <CardBody className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">상품명</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={100}
                placeholder="예: 100% 리얼 휴먼 트래픽"
                onBlur={handleBlur("name")}
                className={errors.name ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
              />
              {errors.name && <div className="text-xs text-red-400">{errors.name}</div>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="missionType">상품 구분(미션 유형)</Label>
                <Select
                  id="missionType"
                  name="missionType"
                  required
                  onBlur={handleBlur("missionType")}
                  className={errors.missionType ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
                >
                  <option value="">선택해주세요</option>
                  <option value="TRAFFIC">TRAFFIC (유입)</option>
                  <option value="SAVE">SAVE (저장)</option>
                  <option value="SHARE">SHARE (공유)</option>
                </Select>
                {errors.missionType && <div className="text-xs text-red-400">{errors.missionType}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPriceKrw">단가(원)</Label>
                <Input
                  id="unitPriceKrw"
                  name="unitPriceKrw"
                  type="number"
                  min={1}
                  step={1}
                  required
                  placeholder="예: 100"
                  onBlur={handleBlur("unitPriceKrw")}
                  className={errors.unitPriceKrw ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
                />
                {errors.unitPriceKrw && <div className="text-xs text-red-400">{errors.unitPriceKrw}</div>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vatPercent">VAT(%)</Label>
                <Input
                  id="vatPercent"
                  name="vatPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={10}
                  onBlur={handleBlur("vatPercent")}
                  className={errors.vatPercent ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
                />
                {errors.vatPercent && <div className="text-xs text-red-400">{errors.vatPercent}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderDays">최소 주문 기간(일)</Label>
                <Input
                  id="minOrderDays"
                  name="minOrderDays"
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  defaultValue={7}
                  onBlur={handleBlur("minOrderDays")}
                  className={errors.minOrderDays ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
                />
                {errors.minOrderDays && <div className="text-xs text-red-400">{errors.minOrderDays}</div>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketingCopy">상품 설명 문구</Label>
              <textarea
                id="marketingCopy"
                name="marketingCopy"
                rows={4}
                placeholder="광고주에게 노출될 마케팅 카피를 입력하세요."
                onBlur={handleBlur("marketingCopy")}
                className={`w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-2 ${
                  errors.marketingCopy
                    ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    : "border-white/10 focus:border-cyan-300/40 focus:ring-cyan-300/10"
                }`}
              />
              {errors.marketingCopy && <div className="text-xs text-red-400">{errors.marketingCopy}</div>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guideText">상세 가이드</Label>
              <textarea
                id="guideText"
                name="guideText"
                rows={8}
                placeholder="구매 후 운영 가이드/주의사항 등을 입력하세요."
                onBlur={handleBlur("guideText")}
                className={`w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-2 ${
                  errors.guideText
                    ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    : "border-white/10 focus:border-cyan-300/40 focus:ring-cyan-300/10"
                }`}
              />
              {errors.guideText && <div className="text-xs text-red-400">{errors.guideText}</div>}
            </div>

            <div className="flex items-center gap-3">
              <input id="isActive" name="isActive" type="checkbox" className="h-4 w-4" defaultChecked />
              <Label htmlFor="isActive">판매/노출 활성화</Label>
            </div>

            {errors.general && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
                <div className="text-sm font-semibold text-red-100">{errors.general}</div>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
              {isPending ? "생성 중..." : "생성"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}

