package com.lima.cosmos.ingestion.nasa;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Arrays;
import java.util.List;

/**
 * api.nasa.gov APOD 클라이언트 (api_key 필요).
 */
@Slf4j
@Component
public class NasaApodClient {

    private final RestClient restClient = RestClient.create();

    @Value("${cosmos.nasa.api-base-url}")
    private String baseUrl;

    @Value("${cosmos.nasa.api-key}")
    private String apiKey;

    /** 빈 키면 DEMO_KEY 로 대체(한도 낮음). 어떤 키를 쓰는지 로그로 확인 가능. */
    private String key() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("NASA_API_KEY 가 비어 있어 DEMO_KEY 로 대체합니다 (시간당 30회 제한). "
                    + ".env 값이 IntelliJ 환경변수(빈 값)에 가려졌는지 확인하세요.");
            return "DEMO_KEY";
        }
        log.info("NASA API 키 사용 (DEMO_KEY 아님, 길이 {})", apiKey.length());
        return apiKey;
    }

    /** 오늘의 천문 사진 1건. */
    public ApodResponse fetchToday() {
        URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/planetary/apod")
                .queryParam("api_key", key())
                .build()
                .encode()
                .toUri();
        log.info("APOD 조회: {}/planetary/apod", baseUrl);
        return restClient.get().uri(uri).retrieve().body(ApodResponse.class);
    }

    /** 최근 count 일치 (1~10 권장). */
    public List<ApodResponse> fetchRecent(int count) {
        URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/planetary/apod")
                .queryParam("api_key", key())
                .queryParam("count", count)
                .build()
                .encode()
                .toUri();
        log.info("APOD {}건 조회", count);
        ApodResponse[] body = restClient.get().uri(uri).retrieve().body(ApodResponse[].class);
        return body == null ? List.of() : Arrays.asList(body);
    }
}
