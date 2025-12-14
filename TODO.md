# TODO

## Buy Me a Coffee 설정

### 1. 계정 생성
- [ ] https://buymeacoffee.com 가입
- [ ] 프로필 설정 (사진, 소개글)
- [ ] 결제 정보 연결 (Stripe)

### 2. 블로그 연동
- [ ] Buy Me a Coffee username 확정
- [ ] Footer에 버튼 추가 (`src/components/Footer.astro`)
- [ ] (선택) 블로그 포스트 하단에 위젯 추가

### 3. 위젯 코드 예시
```html
<a href="https://www.buymeacoffee.com/YOUR_USERNAME" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
       alt="Buy Me A Coffee"
       style="height: 40px;">
</a>
```

---

## 기타 TODO

### GitHub Secrets 설정
- [ ] `OPENAI_API_KEY` 추가 (번역 워크플로우용)
- [ ] (선택) `TRANSLATION_MODEL` 변수 설정 (기본값: gpt-4.1-mini)
