"use client";

import { useState, useEffect } from "react";
import { Button, ButtonLink, Input, Label, Select } from "@/app/_ui/primitives";

interface Product {
  id: string;
  name: string;
  missionType: string;
  unitPriceKrw: number;
  vatPercent: number;
  minOrderDays: number;
  isActive: boolean;
  marketingCopy: string | null;
  guideText: string | null;
}

interface ProductFormProps {
  product: Product;
  error?: string;
  saved?: string;
}

export function ProductForm({ product, error, saved }: ProductFormProps) {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 검증 함수
  const validateField = (name: string, value: string | number | boolean): string => {
    switch (name) {
      case 'name':
        if (!value || typeof value !== 'string') return '상품명을 입력해주세요';
        if (value.length > 100) return '상품명은 100자를 초과할 수 없습니다';
        if (value.trim().length === 0) return '상품명은 공백만으로 구성될 수 없습니다';
        return '';

      case 'unitPriceKrw':
        const price = typeof value === 'string' ? parseInt(value) : typeof value === 'number' ? value : NaN;
        if (isNaN(price) || price < 1) return '단가는 1원 이상이어야 합니다';
        if (price > 1000000) return '단가는 1,000,000원을 초과할 수 없습니다';
        return '';

      case 'vatPercent':
        const vat = typeof value === 'string' ? parseInt(value) : typeof value === 'number' ? value : NaN;
        if (isNaN(vat) || vat < 0) return 'VAT는 0 이상이어야 합니다';
        if (vat > 100) return 'VAT는 100을 초과할 수 없습니다';
        return '';

      case 'minOrderDays':
        const days = typeof value === 'string' ? parseInt(value) : typeof value === 'number' ? value : NaN;
        if (isNaN(days) || days < 1) return '최소 주문 기간은 1일 이상이어야 합니다';
        if (days > 365) return '최소 주문 기간은 365일을 초과할 수 없습니다';
        return '';

      case 'marketingCopy':
        if (typeof value === 'string' && value.length > 10000) return '상품 설명은 10,000자를 초과할 수 없습니다';
        return '';

      case 'guideText':
        if (typeof value === 'string' && value.length > 50000) return '상세 가이드는 50,000자를 초과할 수 없습니다';
        return '';

      default:
        return '';
    }
  };

  // 실시간 검증
  const handleFieldChange = (name: string, value: string | number | boolean) => {
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // 폼 제출 전 검증
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const errors: Record<string, string> = {};

    // 모든 필드 검증
    const fieldsToValidate = ['name', 'unitPriceKrw', 'vatPercent', 'minOrderDays', 'marketingCopy', 'guideText'];
    fieldsToValidate.forEach(field => {
      const value = field === 'isActive' ? formData.get(field) === 'on' : formData.get(field);
      const error = validateField(field, value as string);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      e.preventDefault();
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
  };

  // 저장 성공 시 메시지 표시
  useEffect(() => {
    if (saved) {
      // URL에서 saved 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('saved');
      window.history.replaceState({}, '', url.toString());
    }
  }, [saved]);

  return (
    <>
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <div className="text-sm font-medium text-red-400 mb-2">수정에 실패했습니다:</div>
          <div className="text-sm text-red-300">{decodeURIComponent(error)}</div>
        </div>
      )}

      {/* 저장 성공 메시지 */}
      {saved && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <div className="text-sm font-medium text-green-400">상품이 성공적으로 수정되었습니다.</div>
        </div>
      )}

      <form action={`/api/admin/products/${product.id}`} method="post" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">상품명</Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={product.name}
            onBlur={(e) => handleFieldChange('name', e.target.value)}
            className={formErrors.name ? 'border-red-500/50' : ''}
          />
          {formErrors.name && <div className="text-sm text-red-400">{formErrors.name}</div>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>상품 구분</Label>
            <Select disabled defaultValue={product.missionType}>
              <option value={product.missionType}>{product.missionType}</option>
            </Select>
            <div className="text-xs text-zinc-500">상품 구분(미션 유형)은 생성 후 변경을 막습니다.</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitPriceKrw">단가(원)</Label>
            <Input
              id="unitPriceKrw"
              name="unitPriceKrw"
              type="number"
              min={1}
              step={1}
              defaultValue={product.unitPriceKrw}
              required
              onBlur={(e) => handleFieldChange('unitPriceKrw', e.target.value)}
              className={formErrors.unitPriceKrw ? 'border-red-500/50' : ''}
            />
            {formErrors.unitPriceKrw && <div className="text-sm text-red-400">{formErrors.unitPriceKrw}</div>}
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
              defaultValue={product.vatPercent}
              required
              onBlur={(e) => handleFieldChange('vatPercent', e.target.value)}
              className={formErrors.vatPercent ? 'border-red-500/50' : ''}
            />
            {formErrors.vatPercent && <div className="text-sm text-red-400">{formErrors.vatPercent}</div>}
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
              defaultValue={product.minOrderDays}
              required
              onBlur={(e) => handleFieldChange('minOrderDays', e.target.value)}
              className={formErrors.minOrderDays ? 'border-red-500/50' : ''}
            />
            {formErrors.minOrderDays && <div className="text-sm text-red-400">{formErrors.minOrderDays}</div>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="marketingCopy">상품 설명 문구</Label>
          <textarea
            id="marketingCopy"
            name="marketingCopy"
            rows={4}
            defaultValue={product.marketingCopy ?? ""}
            onBlur={(e) => handleFieldChange('marketingCopy', e.target.value)}
            className={`w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10 ${
              formErrors.marketingCopy ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
          {formErrors.marketingCopy && <div className="text-sm text-red-400">{formErrors.marketingCopy}</div>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guideText">상세 가이드</Label>
          <textarea
            id="guideText"
            name="guideText"
            rows={8}
            defaultValue={product.guideText ?? ""}
            onBlur={(e) => handleFieldChange('guideText', e.target.value)}
            className={`w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10 ${
              formErrors.guideText ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
          {formErrors.guideText && <div className="text-sm text-red-400">{formErrors.guideText}</div>}
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            className="h-4 w-4"
            defaultChecked={product.isActive}
          />
          <Label htmlFor="isActive">판매/노출 활성화</Label>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? '수정 중...' : '수정'}
          </Button>
          <ButtonLink href="/admin/products" variant="secondary">
            목록
          </ButtonLink>
        </div>
      </form>
    </>
  );
}
