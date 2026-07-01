package com.lima.cosmos.ingestion.core;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/**
 * core-service 조회 클라이언트.
 * NASA 를 호출하기 전에 "오늘 APOD 가 이미 ES 에 있는지" 물어봐 하루 API 한도를 아낀다.
 * (ES 는 core-service 만 접근하므로, 저장 여부의 단일 진실원천도 core 다.)
 */
@Slf4j
@Component
public class CoreApodClient {

    private final RestClient restClient = RestClient.create();

    @Value("${cosmos.core.base-url}")
    private String baseUrl;

    /** 응답: {"date":"YYYY-MM-DD","exists":true} */
    private record ExistsResponse(String date, boolean exists) {}

    /**
     * 해당 날짜의 APOD 가 이미 저장돼 있으면 true.
     * core 가 응답하지 않으면(장애 등) fail-open: false 를 돌려 수집이 진행되도록 한다
     * (데이터 누락보다 API 한 번 더 쓰는 쪽이 안전).
     */
    public boolean existsForDate(String date) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/api/apod/exists")
                    .queryParam("date", date)
                    .build()
                    .encode()
                    .toUri();
            ExistsResponse res = restClient.get().uri(uri).retrieve().body(ExistsResponse.class);
            boolean exists = res != null && res.exists();
            log.info("[apod] core 중복확인 date={} exists={}", date, exists);
            return exists;
        } catch (Exception e) {
            log.warn("[apod] core 중복확인 실패({}), 수집을 진행합니다: {}", date, e.getMessage());
            return false;
        }
    }
}
