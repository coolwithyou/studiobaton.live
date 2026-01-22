# Suggested Commands for Studio Baton Live

## Development
```bash
npm run dev              # 개발 서버 실행 (포트 3090)
npm run build           # 프로덕션 빌드
npm run start           # 프로덕션 서버 실행
```

## Testing & Linting
```bash
npm run test            # Vitest 실행 (watch mode)
npm run test:run        # Vitest 단일 실행
npm run test:coverage   # 커버리지 리포트 생성
npm run lint            # ESLint 검사
```

## Database
```bash
npm run db:push         # Prisma 스키마를 DB에 푸시
npm run db:migrate      # Prisma 마이그레이션 생성 및 적용
npm run db:seed         # 초기 데이터 시드 실행
```

## Version Info
- Node.js: Modern (npm 10+)
- npm run postinstall: Prisma generate 자동 실행
