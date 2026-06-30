package com.lima.cosmos.core.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * raw.exoplanet 토픽으로 들어오는 메시지 (ingestion-service의 ExoplanetRaw와 동일 스키마).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ExoplanetMessage(
        String pl_name,
        String hostname,
        Double sy_dist,
        Double pl_orbper,
        Double pl_rade,
        Double pl_bmasse,
        Double st_age,
        Double st_teff,
        Double st_mass,
        Double ra,
        @JsonProperty("dec") Double declination,
        Integer disc_year,
        String discoverymethod
) {
}
