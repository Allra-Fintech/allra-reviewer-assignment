# 📋 PR 리뷰어 자동 할당 액션

> PR 리뷰 프로세스를 자동화하는 GitHub Action입니다.

[![GitHub Super-Linter](https://github.com/gnoyes/allra-reviewer-assignment/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/gnoyes/allra-reviewer-assignment/actions/workflows/ci.yml/badge.svg)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

**Language**: **한국어** | [English](./README.en.md)

## 🚀 주요 기능

- **자동 리뷰어 할당**: PR이 생성되거나 재오픈될 때 랜덤하게 3명의 리뷰어를 자동
  선택
- **PR 작성자 제외**: PR 작성자는 리뷰어 후보에서 자동으로 제외
- **Slack 알림 지원**: 선택적으로 Slack 웹훅을 통한 알림 전송
- **유연한 설정**: YAML 파일을 통한 리뷰어 관리 및 설정

## 📦 설치 및 사용법

### 1. 리뷰어 설정 파일 생성

프로젝트 루트에 `.github/reviewers.yml` 파일을 생성하고 리뷰어 목록을
정의합니다:

```yaml
reviewers:
  - githubName: '김개발'
    slackMention: '<@U1234567>' // Slack 사용자 ID
  - githubName: '박코딩'
    slackMention: '<@U2345678>' // Slack 사용자 ID
```

### 2. 워크플로우 파일 생성

`.github/workflows/reviewer-assignment.yml` 파일을 생성합니다:

```yaml
name: 🎯 PR 리뷰어 자동 할당

on:
  pull_request:
    types: [opened, reopened]

jobs:
  assign-reviewers:
    name: 리뷰어 할당
    runs-on: ubuntu-latest
    steps:
      - name: 저장소 체크아웃
        uses: actions/checkout@v4

      - name: 랜덤 리뷰어 할당
        uses: allra/allra-reviewer-assignment@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-webhook-url: ${{ secrets.PR_REVIEW_SLACK_WEBHOOK }} # 선택사항
          reviewers-config-path: '.github/reviewers.yml' # 기본값
          max-reviewers: '3' # 기본값
```

## ⚙️ 입력 파라미터

| 파라미터                | 필수 여부   | 기본값                  | 설명                                              |
| ----------------------- | ----------- | ----------------------- | ------------------------------------------------- |
| `github-token`          | ✅ **필수** | `${{ github.token }}`   | GitHub API 인증을 위한 토큰                       |
| `slack-webhook-url`     | ❌ 선택     | -                       | Slack 알림용 웹훅 URL (비어있으면 알림 전송 안함) |
| `reviewers-config-path` | ❌ 선택     | `.github/reviewers.yml` | 리뷰어 설정 파일의 경로                           |
| `max-reviewers`         | ❌ 선택     | `3`                     | 할당할 최대 리뷰어 수                             |

## 📤 출력

| 출력명               | 설명                                            |
| -------------------- | ----------------------------------------------- |
| `assigned-reviewers` | 할당된 리뷰어들의 GitHub 사용자명 (쉼표로 구분) |

## 💬 Slack 알림

Slack 웹훅 URL을 설정하면 다음과 같은 형식으로 알림을 전송합니다:

```
<@U1234567> <@U2345678> <@U3456789>
리뷰어로 할당되었습니다!!

• PR 제목: 로그인 버그 수정
• 담당자: allra
• 리뷰어: 김개발, 박코딩, 이프론트
• 리뷰하러 가기 >> https://github.com/owner/repo/pull/123
```

### Slack 웹훅 설정 방법

1. Slack 앱에서 Incoming Webhooks 기능 활성화
2. 웹훅 URL을 GitHub Secrets에 `PR_REVIEW_SLACK_WEBHOOK`로 등록
3. 리뷰어 설정에서 `slackMention` 필드에 Slack 사용자 ID 추가

## 🔧 동작 원리

1. **트리거**: PR이 생성되거나 재오픈될 때 액션이 실행됩니다
2. **설정 로드**: 지정된 경로에서 리뷰어 설정 파일을 읽어옵니다
3. **후보 필터링**: PR 작성자를 리뷰어 후보에서 제외합니다
4. **랜덤 선택**: Fisher-Yates 셔플 알고리즘으로 랜덤하게 리뷰어를 선택합니다
5. **GitHub 할당**: GitHub API를 통해 선택된 리뷰어들을 PR에 할당합니다
6. **Slack 알림**: (선택사항) Slack으로 할당 알림을 전송합니다

## 📁 프로젝트 구조

```
src/
├── main.ts              # 메인 오케스트레이션 로직
├── reviewer-selector.ts # 리뷰어 선택 및 설정 파일 로드
├── slack-notifier.ts    # Slack 웹훅 알림 기능
├── github-client.ts     # GitHub API 연동
└── types.ts            # 공용 타입 정의

__tests__/              # 포괄적인 단위 테스트
├── main.test.ts
├── reviewer-selector.test.ts
├── slack-notifier.test.ts
└── github-client.test.ts
```

## 🛠️ 개발자 가이드

### 의존성 설치

```bash
npm install
```

### 개발 및 빌드

```bash
# 코드 포맷팅
npm run format:write

# 린트 검사
npm run lint

# 테스트 실행
npm test

# 프로덕션 빌드
npm run bundle
```

### 로컬 테스트

```bash
# .env 파일을 생성하고 환경변수 설정
echo "INPUT_GITHUB-TOKEN=your-token" > .env
echo "INPUT_REVIEWERS-CONFIG-PATH=.github/reviewers.yml" >> .env
echo "INPUT_MAX-REVIEWERS=3" >> .env

# 로컬에서 액션 실행
npm run local-action
```

## 🚨 주의사항

- **토큰 권한**: `GITHUB_TOKEN`에는 PR 리뷰어 할당 권한이 필요합니다
- **설정 파일**: 리뷰어 설정 파일이 없으면 액션이 실패합니다
- **최소 리뷰어**: 리뷰어 후보가 요청된 수보다 적으면 모든 후보를 선택합니다
- **PR 작성자**: PR 작성자는 항상 리뷰어 후보에서 제외됩니다

## 📈 고급 사용법

### 조건부 실행

특정 조건에서만 리뷰어를 할당하고 싶다면:

```yaml
jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    # draft PR에서는 실행하지 않음
    if: github.event.pull_request.draft == false
    steps:
      # ... 액션 단계들
```

### 다른 액션과 연계

```yaml
steps:
  - name: 리뷰어 할당
    id: assign
    uses: allra/allra-reviewer-assignment@v1
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}

  - name: 할당된 리뷰어 출력
    run: echo "할당된 리뷰어: ${{ steps.assign.outputs.assigned-reviewers }}"
```

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋합니다 (`git commit -am '새 기능 추가'`)
4. 브랜치에 푸시합니다 (`git push origin feature/새기능`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

## 🔗 관련 링크

- [GitHub Actions 공식 문서](https://docs.github.com/ko/actions)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [YAML 문법 가이드](https://yaml.org/spec/1.2/spec.html)

---

**Made with ❤️ by Allra-Fintech**
