export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>
        
        <div className="prose prose-sm max-w-none space-y-6">
          <p className="text-base">
            본 사이트(ZEOrabbit)는 개인정보 보호법 등 관련 법령을 준수하며, 이용자의 개인정보를 보호합니다.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>필수항목: 이름, 연락처(이메일 또는 전화번호)</li>
              <li>선택항목: 서비스 이용 과정에서 이용자가 제공한 기타 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>서비스 제공 및 계약 이행</li>
              <li>고객 문의 응대 및 공지 전달</li>
              <li>서비스 품질 개선 및 내부 통계 분석</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. 개인정보 보유 및 이용 기간</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>원칙적으로 개인정보 수집 및 이용 목적 달성 시 즉시 파기합니다.</li>
              <li>단, 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. 개인정보의 제3자 제공</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</li>
              <li>법령에 의거하거나 이용자의 사전 동의를 받은 경우에 한해 제공될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. 개인정보의 파기 절차 및 방법</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>전자적 파일: 복구 불가능한 방법으로 삭제</li>
              <li>종이 문서: 분쇄 또는 소각</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. 이용자의 권리</h2>
            <p>이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. 개인정보 보호 책임</h2>
            <p>회사는 개인정보 보호를 위해 기술적·관리적 조치를 취합니다.</p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="text-primary hover:underline">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}

