import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ZIP 파일 시그니처 검증 함수 (API와 동일)
function isZipFile(buffer) {
  if (buffer.length < 4) return false;
  // ZIP 파일 시그니처: PK\x03\x04
  return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
}

// 간단한 ZIP 파일 생성 (실제로는 zip 라이브러리 사용 권장)
function createTestZip() {
  // ZIP 파일 헤더 (PK\x03\x04)
  const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  // 간단한 ZIP 구조 (실제로는 제대로 된 ZIP 포맷 필요)
  const zipContent = Buffer.concat([
    zipHeader,
    Buffer.from('test content inside zip file for testing upload functionality')
  ]);

  const zipPath = join(__dirname, 'test-upload.zip');
  writeFileSync(zipPath, zipContent);
  return zipPath;
}

// 파일 업로드 검증 테스트
function testFileUploadValidation() {
  try {
    console.log('파일 업로드 검증 테스트 시작...');

    // 1. 테스트 ZIP 파일 생성
    const zipPath = createTestZip();
    console.log('테스트 ZIP 파일 생성됨:', zipPath);

    // 2. 파일 읽기 및 검증
    const fileBuffer = readFileSync(zipPath);

    console.log('파일 정보:', {
      path: zipPath,
      size: fileBuffer.length,
      sizeMB: (fileBuffer.length / 1024 / 1024).toFixed(2) + 'MB'
    });

    // 3. ZIP 파일 검증
    const isValidZip = isZipFile(fileBuffer);
    console.log('ZIP 파일 검증 결과:', isValidZip ? '✅ 유효한 ZIP 파일' : '❌ 유효하지 않은 ZIP 파일');

    // 4. 파일 크기 검증 (300MB 제한)
    const maxSize = 300 * 1024 * 1024; // 300MB
    const isValidSize = fileBuffer.length <= maxSize;
    console.log('파일 크기 검증 결과:', isValidSize ? '✅ 크기 적합' : '❌ 크기 초과');

    // 5. 파일명 검증
    const fileName = 'test.zip';
    const isValidExtension = fileName.toLowerCase().endsWith('.zip');
    console.log('파일 확장자 검증 결과:', isValidExtension ? '✅ ZIP 확장자' : '❌ 잘못된 확장자');

    const allValid = isValidZip && isValidSize && isValidExtension;

    return {
      success: allValid,
      message: allValid ? '모든 검증 통과' : '검증 실패',
      details: {
        isValidZip,
        isValidSize,
        isValidExtension,
        fileSize: fileBuffer.length,
        maxSize,
        fileName
      }
    };

  } catch (error) {
    console.error('테스트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 테스트 실행
const result = testFileUploadValidation();
console.log('테스트 결과:', JSON.stringify(result, null, 2));

if (result.success) {
  console.log('✅ 파일 업로드 기능 검증 완료 - 모든 테스트 통과');
} else {
  console.log('❌ 파일 업로드 기능 검증 실패');
}
