package com.lima.cosmos.ingestion.nasa;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/**
 * api.nasa.gov NeoWs(근지구 천체) 클라이언트 (api_key 필요).
 * feed 는 최대 7일 범위만 허용한다(초과 시 NASA 가 400 반환).
 */
@Slf4j
@Component
public class NasaNeoClient {

    private final RestClient restClient = RestClient.create();

    @Value("${cosmos.nasa.api-base-url}")
    private String baseUrl;

    @Value("${cosmos.nasa.api-key}")
    private String apiKey;

    /** 빈 키면 DEMO_KEY 로 대체(한도 낮음). APOD 클라이언트와 동일한 폴백 패턴. */
    private String key() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("NASA_API_KEY 가 비어 있어 DEMO_KEY 로 대체합니다 (한도 낮음).");
            return "DEMO_KEY";
        }
        return apiKey;
    }

    /** start_date ~ end_date (YYYY-MM-DD, 최대 7일) 범위의 근지구 천체 피드. */
    public NeoFeedResponse fetchFeed(String startDate, String endDate) {
        URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/neo/rest/v1/feed")
                .queryParam("start_date", startDate)
                .queryParam("end_date", endDate)
                .queryParam("api_key", key())
                .build()
                .encode()
                .toUri();
        log.info("NeoWs 피드 조회: {} ~ {}", startDate, endDate);
        return restClient.get().uri(uri).retrieve().body(NeoFeedResponse.class);
    }
}
