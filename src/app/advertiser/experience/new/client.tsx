'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Pill } from '@/app/_ui/primitives';

interface AdvertiserInfo {
  name: string;
  email: string;
  phone: string;
  businessNumber: string;
}

interface Props {
  advertiserInfo: AdvertiserInfo;
}

type PlaceType = 'OPENING_SOON' | 'OPERATING';

interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  priceKrw: number;
  description?: string;
  teamCount?: number;
  leaderLevel?: string;
  reviewCount?: number;
  hasRankingBoost: boolean;
  trafficTarget?: number;
  saveTarget?: number;
}

export default function NewExperienceApplicationClient({ advertiserInfo }: Props) {
  const router = useRouter();

  function formatNumber(n: number): string {
    return new Intl.NumberFormat("ko-KR").format(n);
  }

  function formatKrw(n: number): string {
    return `${formatNumber(n)}원`;
  }

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlaceType, setSelectedPlaceType] = useState<PlaceType | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  // Step 5: 추가 정보 입력을 위한 상태
  const [additionalInfo, setAdditionalInfo] = useState({
    businessName: '',
    openingDate: '',
    shootingStartDate: '',
    currentRanking: '',
    monthlyTeamCapacity: '',
    address: '',
    representativeMenu: '',
    localMomBenefit: '',
    contactPhone: '',
  });

  // 매장 유형 선택 시 요금제 로드
  const handlePlaceTypeSelect = async (placeType: PlaceType) => {
    setSelectedPlaceType(placeType);

    try {
      const response = await fetch(`/api/advertiser/experience/pricing-plans?placeType=${placeType}`);
      if (response.ok) {
        const plans = await response.json();
        setPricingPlans(plans);
      }
    } catch (error) {
      console.error('요금제 로드 실패:', error);
    }
  };

  const handleTermsAgree = () => {
    setTermsAgreed(!termsAgreed);
  };

  const canProceedToStep2 = selectedPlaceType && termsAgreed;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 진행 상태 표시 */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step <= currentStep
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-zinc-400'
              }`}
            >
              {step}
            </div>
            {step < 6 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  step < currentStep ? 'bg-gradient-to-r from-indigo-500 to-cyan-400' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 기본 정보 */}
      {currentStep === 1 && (
        <Card className="p-8">
          <div className="space-y-8">
            {/* 광고주 정보 출력 */}
            <div>
              <h2 className="text-xl font-semibold text-zinc-50 mb-4">광고주 정보</h2>
              <div className="bg-white/[0.03] border border-white/10 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400">이름</label>
                    <p className="text-sm text-zinc-50">{advertiserInfo.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400">이메일</label>
                    <p className="text-sm text-zinc-50">{advertiserInfo.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400">연락처</label>
                    <p className="text-sm text-zinc-50">{advertiserInfo.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400">사업자등록번호</label>
                    <p className="text-sm text-zinc-50">{advertiserInfo.businessNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 체험단 약관 동의 */}
            <div>
              <h2 className="text-xl font-semibold text-zinc-50 mb-4">체험단 약관 동의</h2>
              <div className="bg-white/[0.03] border border-white/10 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAgreed}
                    onChange={handleTermsAgree}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-zinc-300">
                    <span className="font-medium">[필수]</span> 체험단 서비스 이용약관에 동의합니다.
                    <a href="#" className="text-cyan-400 hover:text-cyan-300 ml-1">
                      약관 보기
                    </a>
                  </label>
                </div>
              </div>
            </div>

            {/* 매장 유형 선택 */}
            <div>
              <h2 className="text-xl font-semibold text-zinc-50 mb-4">매장 유형 선택</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 오픈 예정 매장 */}
                <div
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlaceType === 'OPENING_SOON'
                      ? 'border-cyan-400/20 bg-cyan-400/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                  onClick={() => handlePlaceTypeSelect('OPENING_SOON')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cyan-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-50 mb-2">오픈 예정</h3>
                    <p className="text-sm text-zinc-400 mb-3">
                      곧 오픈하시나요? 오픈빨 90일, 빈손으로 놓치지 마세요.
                    </p>
                    <p className="text-xs text-zinc-500">
                      신규 매장 전용 오픈런 패키지 (사전 촬영 + 리뷰 세팅)
                    </p>
                  </div>
                </div>

                {/* 운영 중인 매장 */}
                <div
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlaceType === 'OPERATING'
                      ? 'border-emerald-400/20 bg-emerald-400/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                  onClick={() => handlePlaceTypeSelect('OPERATING')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-50 mb-2">매장 운영 중</h3>
                    <p className="text-sm text-zinc-400 mb-3">
                      열심히 하는데 순위가 그대로인가요? 진단부터 다시 해드립니다.
                    </p>
                    <p className="text-xs text-zinc-500">
                      순위 상승 솔루션 & 리브랜딩 패키지
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 다음 단계 버튼 */}
            <div className="flex justify-end pt-6">
              <Button
                disabled={!canProceedToStep2}
                onClick={() => setCurrentStep(2)}
                className="px-8 py-2"
              >
                다음 단계
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: 요금제 선택 */}
      {currentStep === 2 && (
        <Card className="p-8">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-50">요금제 선택</h2>

            {pricingPlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400">요금제를 불러오는 중...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'border-cyan-400/20 bg-cyan-400/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-50">{plan.displayName}</h3>
                        <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
                        <div className="mt-3 space-y-1">
                          {plan.teamCount && (
                            <p className="text-xs text-zinc-500">팀 수: {plan.teamCount}팀</p>
                          )}
                          {plan.leaderLevel && (
                            <p className="text-xs text-zinc-500">팀장 레벨: {plan.leaderLevel}</p>
                          )}
                          {plan.reviewCount && (
                            <p className="text-xs text-zinc-500">리뷰 수: {plan.reviewCount}건</p>
                          )}
                          {plan.hasRankingBoost && (
                            <Pill tone="cyan" className="text-xs">순위 부스팅 포함</Pill>
                          )}
                          {(plan.trafficTarget || plan.saveTarget) && (
                            <p className="text-xs text-zinc-500">
                              유입 {plan.trafficTarget} + 저장 {plan.saveTarget}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-zinc-50">
                          {formatKrw(plan.priceKrw)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                이전 단계
              </Button>
              <Button
                disabled={!selectedPlan}
                onClick={() => setCurrentStep(3)}
              >
                다음 단계
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: 결제하기 */}
      {currentStep === 3 && (
        <Card className="p-8">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-50">결제 정보 입력</h2>
            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-lg">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-zinc-50 mb-4">결제하기 - 개발 진행 중</h3>
                <p className="text-zinc-400 mb-6">결제 시스템은 현재 개발 중입니다.</p>
                <div className="bg-cyan-400/10 border border-cyan-400/20 p-4 rounded-lg">
                  <p className="text-sm text-cyan-100 font-medium">선택된 요금제</p>
                  <p className="text-lg font-semibold text-zinc-50 mt-1">
                    {selectedPlan?.displayName} ({formatKrw(selectedPlan?.priceKrw || 0)})
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-6">
              <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                이전 단계
              </Button>
              <Button onClick={() => setCurrentStep(4)}>
                결제하기
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: 결제완료 */}
      {currentStep === 4 && (
        <Card className="p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-50 mb-4">결제완료 - 개발 진행 중</h2>
            <p className="text-zinc-400 mb-6">결제가 성공적으로 처리되었습니다.</p>
            <div className="bg-cyan-400/10 border border-cyan-400/20 p-4 rounded-lg mb-6">
              <p className="text-sm text-cyan-100 font-medium">결제 완료된 요금제</p>
              <p className="text-lg font-semibold text-zinc-50 mt-1">
                {selectedPlan?.displayName} ({formatKrw(selectedPlan?.priceKrw || 0)})
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                이전 단계
              </Button>
              <Button onClick={() => setCurrentStep(5)}>
                다음 단계
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 5: 추가 정보 입력 */}
      {currentStep === 5 && (
        <Card className="p-8">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-50">추가 정보 입력</h2>

            {selectedPlaceType === 'OPENING_SOON' && (
              <div className="space-y-6">
                <div className="bg-cyan-400/10 border border-cyan-400/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-cyan-100 mb-4">오픈 예정 매장 정보</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">상호명 (가칭)</label>
                      <input
                        type="text"
                        value={additionalInfo.businessName}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, businessName: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-cyan-400/50 focus:outline-none"
                        placeholder="예: 토끼네 분식"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">오픈 예정일</label>
                      <input
                        type="date"
                        value={additionalInfo.openingDate}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, openingDate: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 focus:border-cyan-400/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">체험단 촬영 가능 시작일</label>
                      <input
                        type="date"
                        value={additionalInfo.shootingStartDate}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, shootingStartDate: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 focus:border-cyan-400/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">매장 위치 (주소)</label>
                      <input
                        type="text"
                        value={additionalInfo.address}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, address: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-cyan-400/50 focus:outline-none"
                        placeholder="예: 서울시 강남구 역삼동 123-45"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">촬영용 대표 메뉴</label>
                      <input
                        type="text"
                        value={additionalInfo.representativeMenu}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, representativeMenu: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-cyan-400/50 focus:outline-none"
                        placeholder="예: 김밥, 떡볶이, 튀김"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">로컬맘 제공 혜택</label>
                      <select
                        value={additionalInfo.localMomBenefit}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, localMomBenefit: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 focus:border-cyan-400/50 focus:outline-none"
                      >
                        <option value="">선택하세요</option>
                        <option value="5만원">5만원</option>
                        <option value="10만원">10만원</option>
                        <option value="15만원">15만원</option>
                        <option value="20만원">20만원</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">담당자 휴대폰 번호</label>
                      <input
                        type="tel"
                        value={additionalInfo.contactPhone}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, contactPhone: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-cyan-400/50 focus:outline-none"
                        placeholder="예: 010-1234-5678"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedPlaceType === 'OPERATING' && (
              <div className="space-y-6">
                <div className="bg-emerald-400/10 border border-emerald-400/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-emerald-100 mb-4">운영 중인 매장 정보</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">상호명 (네이버 검색 연동 권장)</label>
                      <input
                        type="text"
                        value={additionalInfo.businessName}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, businessName: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                        placeholder="예: 토끼네 분식"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">현재 네이버 플레이스 순위 고민</label>
                      <select
                        value={additionalInfo.currentRanking}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, currentRanking: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">선택하세요</option>
                        <option value="유입">유입</option>
                        <option value="순위">순위</option>
                        <option value="리뷰수">리뷰수</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">월 방문 가능 팀 수</label>
                      <input
                        type="number"
                        value={additionalInfo.monthlyTeamCapacity}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, monthlyTeamCapacity: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                        placeholder="예: 10"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">매장 위치</label>
                      <input
                        type="text"
                        value={additionalInfo.address}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, address: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                        placeholder="예: 서울시 강남구 역삼동 123-45"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">대표 메뉴</label>
                      <input
                        type="text"
                        value={additionalInfo.representativeMenu}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, representativeMenu: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                        placeholder="예: 김밥, 떡볶이, 튀김"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">로컬맘 제공 혜택</label>
                      <select
                        value={additionalInfo.localMomBenefit}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, localMomBenefit: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">선택하세요</option>
                        <option value="5만원">5만원</option>
                        <option value="10만원">10만원</option>
                        <option value="15만원">15만원</option>
                        <option value="20만원">20만원</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">담당자 휴대폰 번호</label>
                      <input
                        type="tel"
                        value={additionalInfo.contactPhone}
                        onChange={(e) => setAdditionalInfo({...additionalInfo, contactPhone: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 placeholder-zinc-500 focus:border-emerald-400/50 focus:outline-none"
                        placeholder="예: 010-1234-5678"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button variant="secondary" onClick={() => setCurrentStep(4)}>
                이전 단계
              </Button>
              <Button
                disabled={!additionalInfo.businessName || !additionalInfo.contactPhone}
                onClick={() => setCurrentStep(6)}
              >
                신청 완료
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 6: 신청 완료 */}
      {currentStep === 6 && (
        <Card className="p-8">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-50 mb-4">접수가 완료되었습니다!</h2>
            <p className="text-zinc-400 mb-6">담당 매니저가 24시간 내에 배정됩니다.</p>
            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-lg mb-6">
              <p className="text-sm text-zinc-500 mb-4">
                입력하신 <span className="text-cyan-400 font-medium">{additionalInfo.contactPhone || '[010-XXXX-XXXX]'}</span> 번호로 담당자가 해피콜을 드립니다.
              </p>
              <p className="text-sm text-zinc-500">
                나머지 상세한 매장 정보(영업시간, 브랜드 철학 등)는 매니저와 통화하며 채워드릴 예정이니 걱정 마세요.
              </p>
            </div>
            <div className="bg-cyan-400/10 border border-cyan-400/20 p-4 rounded-lg mb-6">
              <p className="text-sm text-cyan-100 font-medium">신청 요약</p>
              <div className="mt-2 space-y-1 text-sm text-zinc-300">
                <p>매장 유형: {selectedPlaceType === 'OPENING_SOON' ? '오픈 예정' : '운영 중'}</p>
                <p>요금제: {selectedPlan?.displayName}</p>
                <p>상호명: {additionalInfo.businessName}</p>
                <p>담당자: {additionalInfo.contactPhone}</p>
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={() => router.push('/advertiser/experience')}>
                체험단 신청 완료
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}