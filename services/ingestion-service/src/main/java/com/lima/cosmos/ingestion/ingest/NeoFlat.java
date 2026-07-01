package com.lima.cosmos.ingestion.ingest;

/**
 * 평탄화된 근지구 천체 접근 1건 (raw.neo 로 produce 되는 페이로드).
 * 필드명은 core 의 NeoMessage 와 동일한 camelCase 라 JSON 이 그대로 매핑된다.
 * 접근건마다 1레코드 → ES 에서 (neoId, closeApproachDate) 복합키로 누적 저장.
 */
public record NeoFlat(
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
