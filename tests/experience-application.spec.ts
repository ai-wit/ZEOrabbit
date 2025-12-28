import { test, expect } from '@playwright/test';

test.describe('체험단 신청 프로세스', () => {
  test('광고주가 체험단 신청을 완료할 수 있다', async ({ page }) => {
    // 1. 로그인 페이지로 이동
    await page.goto('/login');

    // 2. 광고주 계정으로 로그인 (테스트 계정 사용)
    await page.click('text=광고주 1');

    // 로그인 완료 대기 (광고주 페이지로 리다이렉션)
    await page.waitForURL('**/advertiser');

    // 3. 체험단 신청 페이지로 이동
    await page.goto('/advertiser/experience/new');

    // Step 1: 기본 정보 확인
    console.log('=== Step 1: 기본 정보 ===');
    await expect(page.locator('text=광고주 정보')).toBeVisible();
    await expect(page.locator('text=체험단 약관 동의')).toBeVisible();
    await expect(page.locator('text=매장 유형 선택')).toBeVisible();

    // 광고주 정보 확인
    await expect(page.locator('text=이름')).toBeVisible();
    await expect(page.locator('text=이메일')).toBeVisible();
    await expect(page.locator('text=연락처')).toBeVisible();
    await expect(page.locator('text=사업자등록번호')).toBeVisible();

    // 약관 동의
    await page.check('input[id="terms"]');
    expect(await page.isChecked('input[id="terms"]')).toBe(true);

    // 매장 유형 선택 (오픈 예정 매장)
    await page.click('text=오픈 예정');
    await page.waitForTimeout(500); // 선택 상태 적용 대기

    // 다음 단계 버튼 클릭
    await page.click('text=다음 단계');
    await page.waitForTimeout(1000); // API 호출 대기

    // Step 2: 요금제 선택 확인
    console.log('=== Step 2: 요금제 선택 ===');
    await expect(page.locator('text=요금제 선택')).toBeVisible();

    // 요금제 로딩 대기
    await page.waitForSelector('text=요금제 선택', { timeout: 10000 });

    // 첫 번째 요금제 선택 (Basic 29만원)
    await page.locator('text=Basic 29만원').click();

    // 다음 단계 버튼 클릭
    await page.click('text=다음 단계');
    await page.waitForTimeout(500);

    // Step 3: 결제 정보 입력
    console.log('=== Step 3: 결제 정보 입력 ===');
    await expect(page.locator('text=결제 정보 입력')).toBeVisible();
    await expect(page.locator('text=선택된 요금제')).toBeVisible();

    // 무통장 입금 선택
    await page.check('input[value="BANK_TRANSFER"]');
    expect(await page.isChecked('input[value="BANK_TRANSFER"]')).toBe(true);

    // 세금계산서 발행 선택 (있는 경우에만)
    const taxCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: '세금계산서' });
    if (await taxCheckbox.count() > 0) {
      await taxCheckbox.check();
    }

    // 결제하기 버튼 클릭
    await page.click('text=결제하기');
    await page.waitForTimeout(2000); // API 호출 대기

    // Step 4: 결제 완료 확인
    console.log('=== Step 4: 결제 완료 ===');
    await expect(page.locator('text=결제 완료')).toBeVisible();
    await expect(page.locator('text=무통장 입금 신청이 완료되었습니다')).toBeVisible();

    // 추가 정보 입력하기 버튼 클릭
    await page.click('text=추가 정보 입력하기');
    await page.waitForTimeout(500);

    // Step 5: 추가 정보 입력
    console.log('=== Step 5: 추가 정보 입력 ===');
    await expect(page.locator('text=추가 정보 입력')).toBeVisible();
    await expect(page.locator('text=오픈 예정 매장 정보')).toBeVisible();

    // 필수 정보 입력
    await page.fill('input[placeholder*="토끼네 분식"]', '테스트 매장');
    await page.fill('input[type="date"]:first-of-type', '2025-12-31'); // 오픈 예정일
    await page.fill('input[type="date"]:last-of-type', '2025-12-25'); // 촬영 시작일
    await page.fill('input[placeholder*="서울시 강남구"]', '서울시 강남구 역삼동 123-45');
    await page.fill('input[placeholder*="김밥, 떡볶이"]', '김밥, 떡볶이, 튀김');
    await page.selectOption('select', '10만원'); // 혜택 선택
    await page.fill('input[placeholder*="010-1234-5678"]', '010-1234-5678');

    // 신청 완료 버튼 클릭
    await page.click('text=신청 완료');
    await page.waitForTimeout(2000); // API 호출 대기

    // Step 6: 신청 완료 확인
    console.log('=== Step 6: 신청 완료 ===');
    await expect(page.locator('text=접수가 완료되었습니다!')).toBeVisible();
    await expect(page.locator('text=담당 매니저가 24시간 내에 배정됩니다')).toBeVisible();
    await expect(page.locator('text=010-1234-5678')).toBeVisible();

    console.log('체험단 신청 테스트 완료!');
  });

  test('운영 중인 매장 유형으로 체험단 신청 (무통장 입금)', async ({ page }) => {
    // 1. 로그인
    await page.goto('/login');
    await page.click('text=광고주 2'); // 다른 광고주 계정 사용
    await page.waitForURL('**/advertiser');

    // 2. 체험단 신청 페이지로 이동
    await page.goto('/advertiser/experience/new');

    // 3. 약관 동의 및 매장 유형 선택 (운영 중인 매장)
    await page.check('input[id="terms"]');
    await page.click('text=매장 운영 중');
    await page.waitForTimeout(500); // 선택 상태 적용 대기
    await page.click('text=다음 단계');

    // 4. 요금제 선택
    await page.waitForSelector('text=요금제 선택', { timeout: 10000 });
    await page.locator('text=실속형').click(); // 29만원 요금제
    await page.click('text=다음 단계');

    // 5. 결제 정보 입력 (무통장 입금 선택)
    await page.check('input[value="BANK_TRANSFER"]');
    await page.click('text=결제하기');

    // 6. 결제 완료 확인 (무통장 입금)
    await expect(page.locator('text=무통장 입금 신청이 완료되었습니다')).toBeVisible();

    // 7. 추가 정보 입력하기
    await page.click('text=추가 정보 입력하기');

    // 8. 추가 정보 입력 (운영 중인 매장)
    await page.waitForSelector('input[placeholder*="토끼네 분식"]', { timeout: 10000 });

    // 필수 정보 입력
    await page.fill('input[placeholder*="토끼네 분식"]', '운영중 매장');
    await page.selectOption('select', '유입'); // 고민 선택
    await page.fill('input[placeholder*="10"]', '15'); // 월 방문 팀 수
    await page.fill('input[placeholder*="서울시 강남구"]', '서울시 서초구 방배동 123');
    await page.fill('input[placeholder*="김밥, 떡볶이"]', '커피, 케이크, 샌드위치');
    await page.selectOption('select', '15만원'); // 혜택 선택
    await page.fill('input[placeholder*="010-1234-5678"]', '010-9876-5432');

    // 신청 완료
    await page.click('text=신청 완료');

    // 완료 확인
    await expect(page.locator('text=접수가 완료되었습니다!')).toBeVisible();
    await expect(page.locator('text=010-9876-5432')).toBeVisible();

    console.log('운영 중인 매장 체험단 신청 테스트 완료!');
  });
});
