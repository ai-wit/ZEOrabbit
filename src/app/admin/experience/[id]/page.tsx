import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import {
  ButtonLink,
  Card,
  CardBody,
  KeyValueRow,
  Pill
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";
import { notFound } from "next/navigation";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

export default async function ExperienceApplicationDetailPage(props: {
  params: { id: string };
}) {
  const application = await prisma.experienceApplication.findUnique({
    where: { id: props.params.id },
    include: {
      pricingPlan: {
        select: { name: true, displayName: true, priceKrw: true, description: true }
      },
      advertiser: {
        include: {
          user: { select: { name: true, email: true } }
        }
      },
      payment: {
        select: { id: true, status: true, amountKrw: true, provider: true, createdAt: true }
      }
    }
  });

  if (!application) {
    notFound();
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title={`${application.businessName} 체험단 신청`}
          description={`${application.advertiser.user.name}님의 신청 - ${application.pricingPlan.displayName}`}
        />
      }
    >
      <div className="space-y-6">
        {/* 신청 기본 정보 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-50">{application.businessName}</div>
                <div className="text-xs text-zinc-400">
                  광고주: {application.advertiser.user.name ?? application.advertiser.user.email}
                </div>
              </div>
              <Pill tone={
                application.status === "PAYMENT_COMPLETED" ? "emerald" :
                application.status === "PAYMENT_INFO_COMPLETED" ? "cyan" :
                application.status === "COMPLETED" ? "indigo" : "neutral"
              }>
                {application.status === "PAYMENT_COMPLETED" ? "결제완료" :
                 application.status === "PAYMENT_INFO_COMPLETED" ? "결제대기" :
                 application.status === "COMPLETED" ? "신청완료" : application.status}
              </Pill>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <KeyValueRow k="광고주" v={application.advertiser.user.name ?? application.advertiser.user.email} />
              <KeyValueRow k="매장 유형" v={application.placeType === "OPENING_SOON" ? "오픈 예정" : "운영 중"} />
              <KeyValueRow k="요금제" v={`${application.pricingPlan.displayName} (${formatNumber(application.pricingPlan.priceKrw)}원)`} />
              <KeyValueRow k="상호명" v={application.businessName} />
              <KeyValueRow k="주소" v={application.address} />
              {application.representativeMenu && <KeyValueRow k="대표 메뉴" v={application.representativeMenu} />}
              {application.contactPhone && <KeyValueRow k="연락처" v={application.contactPhone} />}
              <KeyValueRow k="신청일" v={formatDateTime(application.createdAt)} />
              {application.termsAgreedAt && <KeyValueRow k="약관 동의일" v={formatDateTime(application.termsAgreedAt)} />}
            </div>

            {/* 오픈 예정 매장 추가 정보 */}
            {application.placeType === "OPENING_SOON" && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-100 mb-3">오픈 예정 매장 정보</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {application.openingDate && <KeyValueRow k="오픈 예정일" v={formatDate(application.openingDate)} />}
                  {application.shootingStartDate && <KeyValueRow k="촬영 시작일" v={formatDate(application.shootingStartDate)} />}
                  {application.localMomBenefit && <KeyValueRow k="로컬맘 혜택" v={application.localMomBenefit} />}
                </div>
              </div>
            )}

            {/* 운영 중인 매장 추가 정보 */}
            {application.placeType === "OPERATING" && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-emerald-100 mb-3">운영 중인 매장 정보</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {application.currentRanking && <KeyValueRow k="현재 순위" v={application.currentRanking} />}
                  {application.monthlyTeamCapacity && <KeyValueRow k="월간 팀 수용량" v={`${application.monthlyTeamCapacity}팀`} />}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 결제 정보 */}
        {application.payment && (
          <Card>
            <CardBody className="space-y-4">
              <div className="text-sm font-semibold text-zinc-50">결제 정보</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <KeyValueRow k="결제 ID" v={application.payment.id} />
                <KeyValueRow k="결제 금액" v={`${formatNumber(application.payment.amountKrw)}원`} />
                <KeyValueRow k="결제 수단" v={application.payment.provider === "TOSS" ? "토스페이먼츠" : application.payment.provider} />
                <KeyValueRow k="결제 상태" v={
                  <Pill tone={application.payment.status === "PAID" ? "emerald" : "cyan"}>
                    {application.payment.status === "PAID" ? "결제완료" : application.payment.status}
                  </Pill>
                } />
                <KeyValueRow k="결제일" v={formatDateTime(application.payment.createdAt)} />
              </div>
            </CardBody>
          </Card>
        )}

        {/* 액션 버튼들 */}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href={`/admin/experience/${application.id}/campaigns/new`} variant="primary" size="sm">
            공고 등록
          </ButtonLink>
          <ButtonLink href="/admin/experience" variant="secondary" size="sm">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
