package com.lima.cosmos.ingestion.nasa;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * NASA Exoplanet Archive (pscomppars 테이블)의 행성 1건 원본 레코드.
 * 값이 없는 항목은 null 로 들어온다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ExoplanetRaw(
        String pl_name,          // 행성 이름
        String hostname,         // 항성 이름
        Double sy_dist,          // 지구로부터 거리 (parsec)
        Double pl_orbper,        // 공전 주기 (일)
        Double pl_rade,          // 반지름 (지구 = 1)
        Double pl_bmasse,        // 질량 (지구 = 1)
        Double st_age,           // 항성 나이 (Gyr)
        Double st_teff,          // 항성 유효온도 (K)
        Double st_mass,          // 항성 질량 (태양 = 1)
        Double ra,               // 적경 (degree)
        @JsonProperty("dec") Double declination, // 적위 (degree)
        Integer disc_year,       // 발견 연도
        String discoverymethod   // 발견 방법
) {
}
