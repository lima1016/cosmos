package com.lima.cosmos.core.kafka;

/**
 * processed.exoplanet 토픽으로 내보내는 정제된 메시지.
 * ai-service(Python)가 이 스키마를 그대로 소비해 학습 데이터로 사용한다.
 */
public record ExoplanetProcessed(
        String name,
        String hostname,
        Double distancePc,
        Double orbitalPeriodDays,
        Double radiusEarth,
        Double massEarth,
        Double stellarAgeGyr,
        Double stellarTeffK,
        Double stellarMassSun,
        Integer discYear,
        String discoveryMethod
) {
}
