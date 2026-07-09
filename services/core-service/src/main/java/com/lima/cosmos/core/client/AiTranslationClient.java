package com.lima.cosmos.core.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/**
 * ai-service(FastAPI) 의 /translate 호출 — 영→한 번역.
 * 최초 호출은 모델 로드로 수 분 걸릴 수 있어 읽기 타임아웃을 두지 않는다(기본 무제한).
 */
@Slf4j
@Component
public class AiTranslationClient {

    private final RestClient restClient = RestClient.create();

    @Value("${cosmos.ai.base-url}")
    private String baseUrl;

    /** 실패 시 null 반환(호출측에서 원문 유지하도록). */
    public Translation translate(String title, String explanation) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/translate")
                    .build()
                    .encode()
                    .toUri();
            return restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new Request(title, explanation))
                    .retrieve()
                    .body(Translation.class);
        } catch (Exception e) {
            log.warn("[apod] 번역 실패, 원문 유지: {}", e.getMessage());
            return null;
        }
    }

    public record Request(String title, String explanation) {
    }

    public record Translation(String titleKo, String explanationKo) {
    }
}
