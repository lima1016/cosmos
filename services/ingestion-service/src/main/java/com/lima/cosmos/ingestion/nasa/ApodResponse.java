package com.lima.cosmos.ingestion.nasa;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * NASA APOD(Astronomy Picture of the Day) 응답.
 * https://api.nasa.gov/planetary/apod
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ApodResponse(
        String date,
        String title,
        String explanation,
        String url,
        String hdurl,
        @JsonProperty("media_type") String mediaType,
        String copyright
) {
}
