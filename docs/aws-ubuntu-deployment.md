# AWS Ubuntu 인스턴스 ZEOrabbit 테스트 런칭 가이드

## 🎯 개요

ZEOrabbit 프로젝트를 AWS EC2 Ubuntu 인스턴스에 테스트 런칭하는 완전 가이드입니다.
이 가이드는 Vercel에서 AWS EC2로의 마이그레이션을 위한 단계별 절차를 제공합니다.

### 📋 사전 준비사항
- AWS 계정 및 IAM 권한
- 도메인 (선택사항, Route 53 사용 권장)
- SSL 인증서 (Let's Encrypt 무료 인증서 사용)
- Toss Payments API 키 (실제 결제 테스트용)

### ⏱️ 예상 소요시간
- 전체: 3-4시간
- 인프라 준비: 30분
- 환경 설정: 1시간
- 배포 및 테스트: 1.5시간
- 최적화: 1시간

---

## 1️⃣ AWS 인프라 준비 (30분)

### EC2 인스턴스 생성
```bash
# AWS 콘솔에서 EC2 인스턴스 생성
# 또는 AWS CLI 사용
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \  # Ubuntu 22.04 LTS
  --count 1 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups zeorabbit-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ZEOrabbit-Test}]'
```

### 보안 그룹 설정
```bash
# SSH (22), HTTP (80), HTTPS (443) 포트 개방
aws ec2 authorize-security-group-ingress \
  --group-id your-security-group-id \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id your-security-group-id \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id your-security-group-id \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 인스턴스 접속 및 초기 설정
```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-instance-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 기본 도구 설치
sudo apt install -y curl wget git htop unzip software-properties-common
```

---

## 2️⃣ 런타임 환경 설정 (1시간)

### Node.js 설치 (LTS 버전)
```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

# Node.js 및 npm 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.x.x
npm --version   # 10.x.x
```

### PM2 프로세스 매니저 설치
```bash
# PM2 전역 설치
sudo npm install -g pm2

# PM2 설정
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 로그 디렉토리 생성
mkdir -p ~/logs
```

### Nginx 설치 및 설정
```bash
# Nginx 설치
sudo apt install -y nginx

# 기본 설정 백업
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# ZEOrabbit용 Nginx 설정 생성
sudo tee /etc/nginx/sites-available/zeorabbit << EOF
server {
    listen 80;
    # 도메인이 없는 경우: server_name을 생략하거나 IP 주소로 설정
    # server_name your-instance-public-ip;  # 또는 생략 (모든 호스트에 응답)

    # Next.js 앱으로 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 정적 파일 캐싱
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/zeorabbit /etc/nginx/sites-enabled/

# 기본 설정 비활성화
sudo unlink /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 3️⃣ 데이터베이스 설정 (45분)

### MySQL 설치
```bash
# MySQL 서버 설치
sudo apt install -y mysql-server

# MySQL 보안 설정 (프롬프트에 따라 설정)
sudo mysql_secure_installation

# MySQL 서비스 시작
sudo systemctl start mysql
sudo systemctl enable mysql
```

### ZEOrabbit 데이터베이스 생성
```bash
# MySQL 접속
sudo mysql -u root -p

# 데이터베이스 및 사용자 생성
CREATE DATABASE zeorabbit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zeorabbit'@'localhost' IDENTIFIED BY 'ZEOrabbit123!@#';
GRANT ALL PRIVILEGES ON zeorabbit.* TO 'zeorabbit'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 환경변수 설정
```bash
# 환경변수 파일 생성
cat > ~/zeorabbit.env << EOF
# Database
DATABASE_URL="mysql://zeorabbit:your_secure_password@localhost:3306/zeorabbit"

# Next.js
NODE_ENV=production
NEXTAUTH_URL=http://your-instance-public-ip  # IP 주소로 접근하는 경우
# NEXTAUTH_URL=http://your-domain.com      # 도메인이 있는 경우
NEXTAUTH_SECRET=your-nextauth-secret-here

# Toss Payments
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
TOSS_PAYMENTS_WEBHOOK_SECRET_KEY=test_wh_...

# Cron Jobs
CRON_SECRET=prod_cron_secret_change_me

# Vercel 호환 (배포 시 사용하지 않음)
DB_PUSH_ON_DEPLOY=0
SEED_ON_DEPLOY=0
EOF
```

---

## 4️⃣ 코드 배포 및 빌드 (45분)

### ⚠️ 빌드 주의사항
- **로컬 환경에서 빌드 실패 시**: AWS 인스턴스에서 직접 빌드 권장
- **Node.js 버전**: 18.x 이상 필요
- **메모리**: 최소 2GB RAM 필요
- **환경변수**: config/env.local 파일에 DATABASE_URL 설정 필요

### 소스코드 클론
```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/apps
cd ~/apps

# Git 클론 (또는 ZIP 파일 업로드)
git clone git@github.com:ai-wit/ZEOrabbit.git
cd ZEOrabbit

# 의존성 설치
npm install
```

### Prisma 설정 및 마이그레이션
```bash
# ⚠️ 중요: 스키마 변경 시 반드시 Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 스키마 적용
npx prisma db push

# Seed data
npm run db:seed

# 프로덕션용 초기 데이터 생성
npx tsx src/scripts/init-db.ts
```

### 환경변수 설정 및 빌드
```bash
# 환경변수 파일 생성 (실제 DB 연결 정보로 변경)
cat > config/env.local << EOF
# Database
DATABASE_URL="mysql://zeorabbit:ZEOrabbit123%21%40%23@localhost:3306/zeorabbit"

# Next.js
NODE_ENV=production
NEXTAUTH_URL=http://your-instance-public-ip
NEXTAUTH_SECRET=your-production-nextauth-secret

# Toss Payments (실제 키로 변경)
TOSS_PAYMENTS_CLIENT_KEY="test_ck_..."
TOSS_PAYMENTS_SECRET_KEY="test_sk_..."
TOSS_PAYMENTS_WEBHOOK_SECRET_KEY="test_wh_..."

# 기타 설정
CRON_SECRET=prod_cron_secret
DB_PUSH_ON_DEPLOY=0
SEED_ON_DEPLOY=0
EOF

# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -la .next/
```

### PM2로 애플리케이션 실행
```bash
# PM2로 애플리케이션 직접 시작 (ecosystem 파일 없이)
cd /home/ubuntu/apps/zeorabbit
pm2 start npm --name zeorabbit -- start -- --port 3000
pm2 save
pm2 startup
```

---

## 5️⃣ 보안 설정 (30분)

### SSH 보안 강화
```bash
# root 로그인 비활성화
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 패스워드 인증 비활성화 (키 기반 인증만 허용)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# SSH 재시작
sudo systemctl restart ssh
```

### 방화벽 설정 (UFW)
```bash
# UFW 활성화
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 상태 확인
sudo ufw status
```

### SSL 인증서 설치 (Let's Encrypt)
```bash
# 도메인이 있는 경우에만 SSL 인증서 발급 가능
# IP 주소만 있는 경우 SSL을 사용할 수 없음 (브라우저 보안 정책)

# 도메인이 있는 경우:
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 인증서 갱신 크론 작업 (매월 자동)
sudo crontab -e
# 추가: 0 12 * * * /usr/bin/certbot renew --quiet

# IP 주소만 사용하는 경우: HTTP만 사용 (포트 80)
# 프로덕션에서는 도메인과 SSL 인증서 필수 권장
```

---

## 6️⃣ 모니터링 및 로깅 설정 (30분)

### PM2 모니터링
```bash
# PM2 로그 확인
pm2 logs zeorabbit

# PM2 모니터링 대시보드
pm2 monit

# 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 시스템 모니터링
```bash
# 시스템 리소스 모니터링
htop

# 디스크 사용량 확인
df -h

# 메모리 사용량 확인
free -h

# 프로세스 모니터링
ps aux | grep node
```

### 헬스체크 엔드포인트 확인
```bash
# 기본 API 테스트
curl http://localhost:3000/api/health
curl http://localhost:3000/api/me
```

### Nginx 로그 모니터링
```bash
# Nginx 액세스 로그 실시간 모니터링
sudo tail -f /var/log/nginx/access.log

# 오류 로그 확인
sudo tail -f /var/log/nginx/error.log
```

---

## 7️⃣ 테스트 및 검증 (45분)

### 기본 기능 테스트
```bash
# 애플리케이션 상태 확인
curl -I http://localhost:3000

# 주요 API 엔드포인트 테스트
curl http://localhost:3000/api/advertiser/experience/pricing-plans?placeType=OPENING_SOON
curl http://localhost:3000/api/member/experience/campaigns

# 데이터베이스 연결 테스트
npx prisma db execute --file <(echo "SELECT 1 as test;")
```

### 사용자 플로우 테스트
```bash
# 1. 회원가입/로그인 테스트
# 브라우저에서 http://your-domain.com 접속
# - 회원가입 기능 확인
# - 로그인 기능 확인

# 2. 광고주 기능 테스트
# - 체험단 신청 플로우
# - 요금제 선택 및 결제

# 3. 멤버 기능 테스트
# - 체험단 참여
# - 미션 제출
```

### 결제 시스템 테스트
```bash
# Toss Payments 연동 확인
# - 결제 플로우 테스트 (실제 결제는 최소 금액으로)
# - 웹훅 엔드포인트 확인
curl http://localhost:3000/api/webhooks/toss-payments
```

### E2E 테스트 실행 (선택사항)
```bash
# Playwright 테스트 실행
npx playwright install
npx playwright test

# 또는 특정 테스트만 실행
npx playwright test tests/experience-application.spec.ts
```

---

## 8️⃣ 최적화 및 백업 설정 (30분)

### Nginx 최적화
```bash
# Gzip 압축 설정
sudo tee -a /etc/nginx/nginx.conf << EOF
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied expired no-cache no-store private must-revalidate max-age=0;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
EOF

# Nginx 재시작
sudo systemctl restart nginx
```

### 백업 스크립트 설정
```bash
# 데이터베이스 백업 스크립트 생성
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="zeorabbit"

mkdir -p $BACKUP_DIR

# 데이터베이스 백업
mysqldump -u zeorabbit -p'your_secure_password' $DB_NAME > $BACKUP_DIR/${DB_NAME}_$DATE.sql

# 오래된 백업 정리 (7일 이상)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/${DB_NAME}_$DATE.sql"
EOF

# 실행 권한 부여
chmod +x ~/backup-db.sh

# 크론 작업으로 매일 백업 설정
crontab -e
# 추가: 0 2 * * * /home/ubuntu/backup-db.sh
```

### AWS S3 백업 (선택사항)
```bash
# AWS CLI 설치 및 설정
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# AWS CLI 설정 (IAM 권한 필요)
aws configure

# S3 백업 스크립트
cat > ~/backup-to-s3.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
S3_BUCKET="your-backup-bucket"
DB_NAME="zeorabbit"
DATE=$(date +%Y%m%d_%H%M%S)

# 최신 백업을 S3로 업로드
aws s3 cp $BACKUP_DIR/${DB_NAME}_$DATE.sql s3://$S3_BUCKET/backups/

echo "S3 backup completed"
EOF

chmod +x ~/backup-to-s3.sh
```

---

## 9️⃣ 비용 관리 및 모니터링

### AWS 비용 모니터링
```bash
# AWS Cost Explorer에서 비용 확인
# 또는 AWS CLI로 비용 조회
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# EC2 사용량 모니터링
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-12-31T23:59:59Z \
  --period 3600 \
  --statistics Average \
  --dimensions Name=InstanceId,Value=your-instance-id
```

### 리소스 정리
```bash
# 사용하지 않는 EBS 볼륨 정리
aws ec2 describe-volumes --filters Name=status,Values=available

# 사용하지 않는 스냅샷 정리
aws ec2 describe-snapshots --owner-ids self
```

---

## 🔧 롤백 및 재배포 전략

### 빠른 롤백 (5분 내)
```bash
# 이전 버전으로 롤백
cd ~/apps/zeorabbit
git checkout previous-commit-hash
npm install
npm run build
pm2 restart zeorabbit

# 또는 백업에서 복원
cd ~/apps
mv zeorabbit zeorabbit_backup_$(date +%Y%m%d_%H%M%S)
git clone https://github.com/your-org/zeorabbit.git
cd zeorabbit
npm install
npm run build
pm2 restart ecosystem.config.js
```

### 블루-그린 배포 (고급)
```bash
# 두 개의 인스턴스 사용
# 1. 새 버전의 인스턴스에 배포
# 2. 로드밸런서로 트래픽 전환
# 3. 기존 인스턴스 정리
```

---

## 📊 모니터링 체크리스트

### 시스템 모니터링
- [ ] CPU 사용량 < 70%
- [ ] 메모리 사용량 < 80%
- [ ] 디스크 사용량 < 80%
- [ ] 네트워크 트래픽 정상

### 애플리케이션 모니터링
- [ ] PM2 프로세스 실행 중
- [ ] Nginx 정상 응답
- [ ] 데이터베이스 연결 정상
- [ ] API 응답시간 < 2초

### 비즈니스 모니터링
- [ ] 사용자 로그인 성공
- [ ] 결제 플로우 정상
- [ ] 데이터베이스 트랜잭션 정상

---

## 🚨 트러블슈팅

### 일반적인 문제 해결

#### 애플리케이션이 시작되지 않음
```bash
# PM2 로그 확인
pm2 logs zeorabbit --lines 50

# 프로세스 상태 확인
pm2 list

# 수동으로 애플리케이션 시작
cd ~/apps/zeorabbit
npm run start
```

#### 데이터베이스 연결 실패
```bash
# MySQL 서비스 상태 확인
sudo systemctl status mysql

# 데이터베이스 연결 테스트
mysql -u zeorabbit -p -e "SELECT 1;"

# 환경변수 확인
cat ~/zeorabbit.env
```

#### Nginx 오류
```bash
# 설정 파일 검증
sudo nginx -t

# 오류 로그 확인
sudo tail -f /var/log/nginx/error.log

# Nginx 재시작
sudo systemctl restart nginx
```

#### 메모리 부족
```bash
# 메모리 사용량 확인
free -h

# PM2 메모리 제한 조정
pm2 restart zeorabbit --max-memory 512M

# 스왑 파일 생성 (임시)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 빌드 실패 (Build Error)
```bash
# Node.js 버전 확인
node --version  # 18.x 이상 필요

# 메모리 확인
free -h  # 최소 2GB 필요

# 환경변수 확인
cat config/env.local

# ⚠️ Prisma 스키마 변경 시 필수: 클라이언트 재생성
npx prisma generate

# 캐시 정리 후 재빌드
rm -rf .next node_modules/.cache
npm install
npm run build

# 상세 로그로 빌드 (문제 진단용)
DEBUG=* npm run build 2>&1 | tee build.log
```

#### Prisma 타입 에러 (taxPercent does not exist)
```bash
# 1. 스키마에 taxPercent 필드가 추가되었는지 확인
grep "taxPercent" prisma/schema.prisma

# 2. Prisma 클라이언트 재생성 (스키마 변경 후 필수)
npx prisma generate

# 3. 임시 코드 수정 해제 (src/app/api/advertiser/experience/applications/route.ts)
# 다음 라인의 주석을 해제:
# taxPercent: pricingPlan.taxPercent || 10,
# 그리고 "as any" 제거

# 4. node_modules 정리 후 재설치
rm -rf node_modules package-lock.json
npm install

# 5. 재빌드
npm run build
```

#### 데이터베이스 연결 실패
```bash
# MySQL 서비스 상태 확인
sudo systemctl status mysql

# 데이터베이스 접속 테스트
mysql -u zeorabbit -p -e "SELECT 1;"

# Prisma 연결 테스트
npx prisma db push --preview-feature

# 환경변수에 특수문자 확인 (URL 인코딩 필요)
# 예: ! → %21, @ → %40, # → %23
```

---

## 📝 배포 완료 보고서

### 배포 정보
- **배포 일시**: ____________________
- **담당자**: ____________________
- **인스턴스 ID**: ____________________
- **도메인**: ____________________

### 테스트 결과
- [ ] 기본 페이지 로딩: ⭕/❌
- [ ] 회원가입/로그인: ⭕/❌
- [ ] 체험단 신청: ⭕/❌
- [ ] 결제 시스템: ⭕/❌
- [ ] 데이터베이스: ⭕/❌

### 성능 지표
- **초기 로딩 시간**: ____ 초
- **API 응답시간**: ____ ms
- **CPU 사용량**: ____ %
- **메모리 사용량**: ____ %

### 다음 단계
- [ ] 프로덕션 전환 계획 수립
- [ ] 모니터링 대시보드 구축
- [ ] CI/CD 파이프라인 구축
- [ ] 백업 전략 고도화

---

---

## 🌐 IP 주소로 접근 시 추가 고려사항

### 도메인이 없는 경우 (IP 주소 직접 접근)

#### 1. Nginx 설정
```bash
# server_name을 생략하면 모든 호스트에 응답
server {
    listen 80;
    # server_name 생략 = 모든 요청에 응답
}
```

#### 2. 환경변수 설정
```bash
# NextAuth URL을 IP 주소로 설정
NEXTAUTH_URL=http://your-instance-public-ip

# 프로덕션에서는 HTTPS를 강제하지 않음
# (IP 주소로는 SSL 인증서를 발급받을 수 없음)
```

#### 3. 브라우저 호환성
- **HTTP Only**: IP 주소로는 SSL 인증서를 발급받을 수 없어 HTTP만 사용
- **보안 경고**: 브라우저에서 HTTP 사이트 접속 시 "안전하지 않음" 경고 표시
- **기능 제한**: 일부 브라우저 기능 (Geolocation, Camera 등) 제한될 수 있음

#### 4. 프로덕션 고려사항
```bash
# 테스트 완료 후 도메인 설정 권장:
# 1. Route 53으로 도메인 구매/설정
# 2. SSL 인증서 발급 (Let's Encrypt)
# 3. HTTPS 리다이렉트 설정
```

#### 5. IP 주소 확인 방법
```bash
# AWS 콘솔에서 확인
aws ec2 describe-instances --instance-ids your-instance-id --query 'Reservations[0].Instances[0].PublicIpAddress'

# 또는 인스턴스에 접속하여 확인
curl ifconfig.me
curl icanhazip.com
```

#### 6. 테스트 접근 URL
```
http://your-instance-public-ip
http://your-instance-public-ip/api/health
http://your-instance-public-ip/login
```

---

**문서 버전**: 1.0
**작성일**: 2025-01-01
**다음 검토일**: 2025-03-01</content>
</xai:function_call">📋 **AWS Ubuntu 인스턴스 ZEOrabbit 테스트 런칭 가이드**를 sequential-thinking으로 체계적으로 계획하여 작성했습니다.

## 🎯 계획 수립 과정 요약

**1단계: 전체 계획 수립** → **15단계: 최종 실행 계획**까지의 체계적 사고 과정을 통해 다음과 같은 주요 영역을 다루었습니다:

- 인프라 및 런타임 환경 설정
- 데이터베이스 및 코드 배포
- 보안, 모니터링, 테스트
- 최적화, 백업, 비용 관리
- 롤백 전략 및 문서화

## 📋 작성된 가이드 주요 내용

### ✅ **완전한 단계별 절차**
- **인프라 준비** (EC2 생성, 보안 그룹 설정)
- **런타임 환경** (Node.js, PM2, Nginx 설정)
- **데이터베이스** (MySQL 설치, 스키마 적용)
- **코드 배포** (Git 클론, 빌드, PM2 실행)
- **보안 설정** (SSH, 방화벽, SSL 인증서)
- **모니터링** (PM2, Nginx, 시스템 로그)
- **테스트 및 검증** (API 테스트, 사용자 플로우)
- **최적화 및 백업** (Nginx 튜닝, 자동 백업)

### 🔧 **실행 가능한 명령어들**
- 모든 단계별 상세 bash 명령어
- 환경변수 설정 예시
- 설정 파일 템플릿
- 트러블슈팅 명령어

### 📊 **모니터링 및 관리**
- 비용 관리 및 AWS 리소스 모니터링
- 롤백 전략 및 재배포 계획
- 성능 지표 및 체크리스트
- 문제 해결 가이드

이 가이드를 따라하면 AWS Ubuntu 인스턴스에서 ZEOrabbit을 완전히 테스트 런칭할 수 있습니다. 각 단계별로 예상 소요시간과 성공 기준이 명시되어 있어 체계적인 배포가 가능합니다. 필요하신가요? 특정 단계에 대해 더 자세한 설명이 필요하시면 말씀해주세요! 🚀
