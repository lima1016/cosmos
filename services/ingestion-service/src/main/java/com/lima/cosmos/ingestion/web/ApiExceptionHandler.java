package com.lima.cosmos.ingestion.web;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

/**
 * 외부 API(NASA) 호출 실패를 깔끔한 JSON 으로 변환한다.
 * 특히 DEMO_KEY 사용 시 자주 나오는 429(한도 초과)를 친절히 안내.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleUpstream(RestClientResponseException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String message = switch (status.value()) {
            case 429 -> "NASA API 요청 한도 초과. 환경변수 NASA_API_KEY를 본인 키로 설정하세요 "
                    + "(DEMO_KEY는 시간당 30회 제한). 또는 잠시 후 다시 시도.";
            case 503 -> "NASA API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도하세요.";
            default -> "NASA API 호출 실패: " + status.value();
        };
        return ResponseEntity.status(status).body(Map.of(
                "error", true,
                "status", status.value(),
                "message", message));
    }
}
