package com.lima.cosmos.core.service;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

/** 대시보드용 통계 (Redis 캐싱 대상이라 Serializable). */
public record ExoplanetStats(
        long total,
        Double averageDistancePc,
        List<NearestPlanet> nearest,
        Map<String, Long> byDiscoveryMethod,
        Map<Integer, Long> byDiscoveryYear,
        // 반지름 기준 행성 유형 분포(암석형/슈퍼지구/해왕성형/목성형).
        Map<String, Long> byPlanetType
) implements Serializable {

    public record NearestPlanet(String name, Double distancePc) implements Serializable {
    }
}
