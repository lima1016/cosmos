package com.lima.cosmos.ingestion.core;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/**
 * core-service 조회 클라이언트(NeoWs 중복 확인).
 * 해당 접근일의 근지구 천체가 이미 저장돼 있는지 물어봐 하루 API 한도를 아낀다.
 * (저장 여부의 단일 진실원천은 ES 를 소유한 core.)
 */
@Slf4j
@Component
public class CoreNeoClient {

    private final RestClient restClient = RestClient.create();

    @Value("${cosmos.core.base-url}")
    private String baseUrl;

    /** 응답: {"date":"YYYY-MM-DD","exists":true} */
    private record ExistsResponse(String date, boolean exists) {}

    /**
     * 해당 접근일의 NEO 데이터가 이미 있으면 true.
     * core 장애 시 fail-open(false 반환 → 수집 진행): 데이터 누락보다 API 한 번 더가 안전.
     */
    public boolean existsForDate(String date) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/api/neo/exists")
                    .queryParam("date", date)
                    .build()
                    .encode()
                    .toUri();
            ExistsResponse res = restClient.get().uri(uri).retrieve().body(ExistsResponse.class);
            return res != null && res.exists();
        } catch (Exception e) {
            log.warn("[neo] core 중복확인 실패({}), 수집 진행: {}", date, e.getMessage());
            return false;
        }
    }
}
