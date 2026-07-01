package com.lima.cosmos.ingestion.nasa;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * NASA NeoWs feed 응답(중첩 구조).
 * near_earth_objects 는 "날짜 → 그날 접근하는 소행성 목록" 맵이다.
 * 속도·거리 값은 API 에서 문자열로 오므로 여기선 String 그대로 받고, 평탄화 단계에서 Double 로 변환한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NeoFeedResponse(
        @JsonProperty("near_earth_objects") Map<String, List<Neo>> nearEarthObjects
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Neo(
            String id,
            String name,
            @JsonProperty("absolute_magnitude_h") Double absoluteMagnitudeH,
            @JsonProperty("is_potentially_hazardous_asteroid") boolean hazardous,
            @JsonProperty("estimated_diameter") EstimatedDiameter estimatedDiameter,
            @JsonProperty("close_approach_data") List<CloseApproach> closeApproachData
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EstimatedDiameter(Kilometers kilometers) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Kilometers(
            @JsonProperty("estimated_diameter_min") Double min,
            @JsonProperty("estimated_diameter_max") Double max
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CloseApproach(
            @JsonProperty("close_approach_date") String closeApproachDate,
            @JsonProperty("relative_velocity") RelativeVelocity relativeVelocity,
            @JsonProperty("miss_distance") MissDistance missDistance
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RelativeVelocity(
            @JsonProperty("kilometers_per_second") String kilometersPerSecond
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MissDistance(
            String kilometers,
            String lunar,
            String astronomical
    ) {}
}
