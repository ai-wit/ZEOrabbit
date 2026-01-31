export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">이용약관</h1>
        
        <div className="prose prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-6">이용약관 (일반 회원)</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">제1조 (목적)</h3>
                <p>본 약관은 일반 회원이 본 사이트(ZEOrabbit)에서 제공하는 미션, 포인트 적립 및 유료 기능 이용과 관련하여 회사와 회원 간의 권리·의무를 규정함을 목적으로 합니다.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제2조 (일반 회원의 정의)</h3>
                <p>&quot;일반 회원&quot;이란 광고 집행 목적이 아닌 서비스 이용, 미션 수행, 기능 사용을 위해 가입한 개인을 의미합니다.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제3조 (클로버 포인트의 운영 정책)</h3>
                
                <div className="ml-4 space-y-3">
                  <div>
                    <h4 className="font-semibold">획득 주체</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>클로버 포인트는 미션을 수행한 일반 회원에게만 적립됩니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">보상 구조</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>클로버 포인트는 광고주가 지출한 당근 포인트 대비 최대 10배 수치로 적립되어, 보상 체감 가치를 높입니다.</li>
                      <li>이는 내부 보상 설계에 따른 수치적 표현이며, 현금 가치를 직접적으로 의미하지 않습니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">사용 방식</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>내부 사용: 500클로버, 1,000클로버 단위로 AI 글쓰기 자동화 등 유료 기능을 이용할 수 있습니다.</li>
                      <li>외부 환전: 회사가 정한 최소 기준 이상 적립 시, 10:1 비율로 역산하여 현금 출금이 가능합니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">환전 제한</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>부정 행위, 자동화, 어뷰징이 확인된 경우 클로버 적립·환전이 제한되거나 취소될 수 있습니다.</li>
                      <li>환전 시 세금, 수수료 등은 관련 법령에 따라 처리됩니다.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제4조 (포인트의 법적 성격)</h3>
                <ul className="list-disc pl-6">
                  <li>클로버 포인트는 현금이나 전자화폐가 아니며, 서비스 이용을 위한 보상 수단입니다.</li>
                  <li>회사는 포인트의 현금 가치 보장을 하지 않습니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제5조 (회원의 의무)</h3>
                <p>회원은 다음 행위를 해서는 안 됩니다.</p>
                <ul className="list-disc pl-6">
                  <li>미션 조작, 허위 수행, 다중 계정 생성</li>
                  <li>시스템 또는 보상 구조를 악용하는 행위</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제6조 (포인트 소멸)</h3>
                <ul className="list-disc pl-6">
                  <li>클로버 포인트는 적립일로부터 회사가 정한 유효기간 내 사용하지 않을 경우 소멸될 수 있습니다.</li>
                  <li>회원 탈퇴 시 미사용 포인트는 자동 소멸됩니다.</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="my-8 border-t-2" />

          <section>
            <h2 className="text-2xl font-bold mb-6">이용약관 (광고주 회원)</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">제1조 (목적)</h3>
                <p>본 약관은 광고주 회원이 본 사이트(ZEOrabbit)에서 제공하는 광고 집행 및 이에 부수되는 포인트 시스템을 이용함에 있어 회사와 광고주 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제2조 (광고주 회원의 정의)</h3>
                <p>&quot;광고주 회원&quot;이란 본 프로젝트에서 광고 집행을 목적으로 가입한 개인 또는 법인을 의미합니다.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제3조 (당근 포인트의 운영 정책)</h3>
                
                <div className="ml-4 space-y-3">
                  <div>
                    <h4 className="font-semibold">구매 주체</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>당근 포인트는 광고주 회원만 구매할 수 있습니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">결제 단위</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>당근 포인트는 실제 현금과 1:1 비율로 충전됩니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">사용 범위</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>당근 포인트는 광고 집행(트래픽 구매, 저장 수 증가 등)에 한하여 사용 가능합니다.</li>
                      <li>일반 회원 대상 AI 글쓰기 도구, 미션 참여, 내부 콘텐츠 이용에는 사용할 수 없습니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">환불 및 현금성</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>당근 포인트는 현금이 아니며, 충전 후 환불은 환불정책에 따릅니다.</li>
                      <li>이미 광고 집행에 사용된 당근은 환불되지 않습니다.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">포인트 순환 구조</h4>
                    <ul className="list-disc pl-6 mt-1">
                      <li>광고주가 사용한 당근 포인트는 시스템 정산을 통해 일반 회원에게 &apos;클로버&apos; 포인트로 분배됩니다.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제4조 (광고 집행 책임)</h3>
                <ul className="list-disc pl-6">
                  <li>광고 내용, 소재, 링크 및 법적 적합성에 대한 책임은 광고주에게 있습니다.</li>
                  <li>관련 법령 위반으로 발생하는 모든 문제는 광고주가 부담합니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제5조 (서비스 변경 및 제한)</h3>
                <p>회사는 운영상 필요에 따라 광고 단가, 집행 방식, 포인트 소진 기준을 변경할 수 있으며, 사전 공지합니다.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">제6조 (책임의 제한)</h3>
                <p>회사는 광고 성과, 노출 수, 전환 결과에 대해 보장하지 않으며, 시스템 장애 등 불가항력 사유에 대해서는 책임을 지지 않습니다.</p>
              </div>
            </div>
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

