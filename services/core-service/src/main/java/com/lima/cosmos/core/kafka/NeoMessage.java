package com.lima.cosmos.core.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** raw.neo 토픽 메시지 (ingestion 의 NeoFlat 와 동일 스키마). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NeoMessage(
        String neoId,
        String name,
        boolean hazardous,
        Double absoluteMagnitudeH,
        Double diameterMinKm,
        Double diameterMaxKm,
        String closeApproachDate,
        Double relativeVelocityKmS,
        Double missDistanceKm,
        Double missDistanceLunar,
        Double missDistanceAstronomical
) {
}
