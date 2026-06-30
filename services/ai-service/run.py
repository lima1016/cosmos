"""PyCharm 실행용 진입점.

이 파일을 우클릭 → Run 'run' 하면 uvicorn 서버가 8000 포트로 뜬다.
(app/main.py 는 상대 임포트를 써서 직접 실행하면 에러가 나므로, 임포트 문자열
 "app.main:app" 형태로 루트에서 띄운다.)
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 코드 저장 시 자동 재시작 (개발용)
    )
