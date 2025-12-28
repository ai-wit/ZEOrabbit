import { chromium } from 'playwright';

async function runManualTest() {
  console.log('체험단 신청 수동 테스트를 시작합니다...');

  // 브라우저 실행
  const browser = await chromium.launch({
    headless: false, // 브라우저 창을 직접 볼 수 있도록
    slowMo: 1000, // 각 동작 사이에 1초 지연
  });

  const page = await browser.newPage();

  try {
    console.log('1. 로그인 페이지로 이동합니다...');
    await page.goto('http://localhost:3000/login');

    console.log('2. 테스트 계정으로 로그인할 준비가 되었습니다.');
    console.log('   - 광고주 계정: "광고주 1" 버튼을 클릭하세요');
    console.log('   - 또는 직접 이메일/비밀번호를 입력하세요 (password123!)');

    // 로그인 완료 대기
    await page.waitForURL('**/advertiser', { timeout: 120000 });

    console.log('3. 광고주 페이지에 로그인되었습니다.');
    console.log('4. 체험단 신청 페이지로 이동합니다...');

    await page.goto('http://localhost:3000/advertiser/experience/new');

    console.log('5. 체험단 신청 페이지가 열렸습니다.');
    console.log('6. 이제 수동으로 다음 단계를 진행해보세요:');
    console.log('   - Step 1: 약관 동의 및 매장 유형 선택');
    console.log('   - Step 2: 요금제 선택');
    console.log('   - Step 3: 결제 정보 입력 (무통장 입금 권장)');
    console.log('   - Step 4: 결제 완료');
    console.log('   - Step 5: 추가 정보 입력');
    console.log('   - Step 6: 신청 완료');

    console.log('\n브라우저 창을 확인하고 수동으로 테스트를 진행하세요.');
    console.log('테스트가 끝나면 Ctrl+C를 눌러 종료하세요.');

    // 무한 대기 - 사용자가 수동으로 테스트할 수 있도록
    await new Promise(() => {}); // 무한 대기

  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  } finally {
    // 사용자가 Ctrl+C로 종료할 때 브라우저 닫기
    process.on('SIGINT', async () => {
      console.log('\n브라우저를 닫습니다...');
      await browser.close();
      process.exit(0);
    });
  }
}

// 서버가 실행 중인지 확인
import http from 'http';

const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};

async function main() {
  console.log('서버 상태를 확인합니다...');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ Next.js 개발 서버가 실행되지 않고 있습니다.');
    console.log('다음 명령어로 서버를 먼저 실행하세요:');
    console.log('  npm run dev');
    console.log('');
    console.log('그 다음 다시 이 스크립트를 실행하세요.');
    process.exit(1);
  }

  console.log('✅ Next.js 개발 서버가 실행 중입니다.');
  await runManualTest();
}

main().catch(console.error);
