package com.lima.cosmos.core.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** raw.apod 토픽 메시지 (ingestion 의 ApodResponse 와 동일 스키마). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ApodMessage(
        String date,
        String title,
        String explanation,
        String url,
        String hdurl,
        @JsonProperty("media_type") String mediaType,
        String copyright
) {
}
