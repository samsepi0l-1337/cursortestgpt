# User Management Module Evaluation

기준: 현재 구현된 코드에 대한 정적 리뷰, 서브에이전트 리뷰, IDE lint 상태(`No linter errors found`)를 바탕으로 평가했다.  
참고: 이번 최종 평가 시점에는 셸 훅 이슈 때문에 `build`/`test`를 다시 실행한 증거까지는 포함하지 못했다.

| Criteria                                  | Score (1-10) | Detailed Reason & Examples of Small Mistakes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | -----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Readability                               |            8 | 전반적으로 파일 경계가 명확하고, `app/(auth)`, `app/(dashboard)`, `lib/*`, `prisma/*`로 역할이 잘 분리되어 있다. `actions.ts` 중심 구조도 읽기 쉽다. 다만 작은 중복이 읽기 비용을 조금 올린다. 예를 들어 `getSingleValue()`가 `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(dashboard)/profile/page.tsx`, `app/(dashboard)/admin/page.tsx`에 반복된다. 또 `"Your account could not be found."` 같은 문구가 `lib/permissions.ts`, `app/(dashboard)/profile/page.tsx`, `app/(dashboard)/profile/actions.ts`에 흩어져 있어 작은 drift 포인트가 된다.           |
| Ease of Writing / Extensibility           |            7 | 초기 작성 속도는 좋았고, 서버 액션 중심 구조라 기능 추가도 비교적 straightforward 하다. 하지만 확장성 측면에서는 role/domain 상수가 흩어져 있다. `lib/auth-utils.ts`의 `isAdminRole()`는 `string` 기반이고, `"ADMIN"` / `"USER"`가 `auth.ts`, `lib/validation.ts`, `app/(auth)/register/page.tsx`, `app/(dashboard)/admin/actions.ts`, `app/(dashboard)/admin/page.tsx`, `app/(dashboard)/profile/page.tsx`에 raw string으로 반복된다. 향후 `OWNER`, `MODERATOR` 같은 role이 추가되면 수정 지점이 많아질 수 있다.                                                                |
| Long-running Stability (drift prevention) |            6 | 안정성 자체는 나쁘지 않지만, 장기 유지보수 관점의 drift 방지 장치는 충분하지 않다. 대표적으로 `auth.ts`에서 `session.user.id = token.id ?? token.sub ?? ""`, `session.user.role = token.role ?? "USER"`로 fallback 값을 만들어 세션을 “유효한 것처럼” 보이게 한다. 이 패턴은 타입상 안전해 보여도, 실제로는 invalid session 상태를 숨길 수 있다. 또한 현재 사용자 shape가 `auth.ts`의 session/token, `lib/permissions.ts`의 Prisma select 결과, `profile/admin` 페이지의 richer query 결과로 나뉘어 있어 필드 추가/변경 시 엇갈릴 여지가 있다.                                   |
| Small Mistake Rate                        |            7 | 치명적인 실수는 많지 않았고, 대부분은 “작지만 나중에 번질 수 있는” 종류였다. 예시는 다음과 같다. `lib/auth-utils.ts`에서 enum 대신 문자열 role 판별 사용, `app/(auth)/register/page.tsx`의 카피가 아직 greenfield/onboarding 문맥에 치우친 점, `app/(dashboard)/admin/actions.ts`에 “최소 한 명의 admin 유지” 규칙이 update/delete 양쪽에 중복된 점, `auth.ts`와 `types/next-auth.d.ts` 사이의 세션 fallback 관습 의존 등이다. 테스트도 `tests/lib/*` 헬퍼 레벨에는 있으나 `auth.ts`, `middleware.ts`, `app/(dashboard)/admin/actions.ts` 같은 핵심 auth invariant에는 부족하다. |
| Overall Satisfaction                      |            7 | 전체적으로는 “잘 정리된 1차 완성본”에 가깝다. 구조는 깔끔하고, validation/transaction/revalidate 흐름도 무난하다. 특히 profile CRUD와 admin action 분리는 좋다. 반면, 장기 유지보수를 생각하면 공통 상수/공통 타입/공통 auth invariant 테스트가 더 빨리 정리됐어야 했다. 즉, 현재 만족도는 높지만 “바로 다음 규모의 확장”을 생각하면 다듬을 부분이 분명히 있다.                                                                                                                                                                                                                  |

## `.cursorrules`에 추가할 만한 5가지 구체 규칙

1. **Role/Status 문자열 리터럴 금지**
   - `Role`, `Status` 같은 도메인 값은 Prisma enum 또는 중앙 상수만 사용한다.
   - `"ADMIN"`, `"USER"` 같은 raw string 비교/할당은 금지한다.

2. **Auth 세션에 sentinel fallback 금지**
   - `session.user.id ?? ""`, `role ?? "USER"`처럼 “가짜 정상값”을 만들지 말고, 세션이 불완전하면 invalid state로 처리한다.
   - auth/session 타입은 실제 런타임 보장과 정확히 일치해야 한다.

3. **3회 이상 반복되는 helper/message는 즉시 공통화**
   - query param parser, redirect message builder, 동일 에러 문구가 3개 이상 파일에 반복되면 `lib/*`로 승격한다.
   - 예외는 없고, “작은 중복”도 drift source로 간주한다.

4. **권한 불변식은 UI와 서버에서 모두 검증**
   - admin-only, self-demotion 금지, last-admin 보호 같은 규칙은 middleware/UI만 믿지 말고 server action 또는 route handler에서 최종 검증한다.
   - 관련 변경에는 최소 1개의 테스트를 추가한다.

5. **UI 문구와 validation 제한값은 같은 출처를 사용**
   - 업로드 용량, 허용 MIME, 안내 문구, 에러 메시지는 하드코딩을 분산하지 않는다.
   - 가능하면 validation 상수/메시지를 공유해서 화면 문구와 실제 제한이 어긋나지 않게 한다.

## 다음 비슷한 규모 작업에서 개선할 3가지

1. **공통 도메인 타입과 상수를 초기에 고정하기**
   - `Role`, session user shape, redirect helper, 공통 메시지 같은 것은 초반에 `lib/domain.ts` 또는 `lib/constants.ts` 류로 모아두는 편이 낫다.

2. **auth/middleware/server-action 통합 테스트를 더 빨리 추가하기**
   - 이번 구현은 helper 테스트는 있으나, 실제 위험은 세션 hydration과 권한 검증 경계에 있다.
   - 다음에는 `login -> protected route -> admin action` 흐름 테스트를 더 일찍 두는 것이 좋다.

3. **scaffold 문구와 실제 제품 문구를 마지막에 한 번 분리 점검하기**
   - `Greenfield Auth`, `Create the first account`처럼 초기 구현 맥락의 카피가 남기 쉽다.
   - 기능이 완성된 뒤 UX 문구만 따로 훑는 마감 단계가 필요하다.

## 이번 작업에서 가장 잘 유지된 1가지

**서버 중심 구조와 기능 단위 분리**가 가장 잘 유지됐다.  
`app/(auth)`, `app/(dashboard)`, `actions.ts`, `lib/*`, `prisma/*` 분리가 끝까지 크게 무너지지 않았고, 그 덕분에 이후 리뷰에서도 문제를 국소적으로 찾기 쉬웠다.

## 한 줄 총평

현재 결과물은 **구조는 좋고 작은 drift 위험이 남아 있는 상태**다.  
즉, “다음 확장을 버틸 뼈대”는 갖췄지만, enum/세션/중복 헬퍼를 더 일찍 공통화했으면 완성도가 한 단계 더 올라갔을 것이다.
