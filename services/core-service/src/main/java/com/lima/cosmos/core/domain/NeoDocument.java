package com.lima.cosmos.core.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

/**
 * 근지구 천체(NeoWs) 접근 1건 — Elasticsearch 저장.
 * 같은 소행성의 여러 접근을 보존하기 위해 id = "{neoId}_{closeApproachDate}" 복합키.
 * closeApproachDate 는 Keyword(YYYY-MM-DD)라 사전식 정렬 = 시간순.
 */
@Document(indexName = "neo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NeoDocument {

    @Id
    private String id;

    @Field(type = FieldType.Keyword)
    private String neoId;

    @Field(type = FieldType.Text)
    private String name;

    @Field(type = FieldType.Boolean)
    private boolean hazardous;

    @Field(type = FieldType.Double)
    private Double absoluteMagnitudeH;

    @Field(type = FieldType.Double)
    private Double diameterMinKm;

    @Field(type = FieldType.Double)
    private Double diameterMaxKm;

    @Field(type = FieldType.Keyword)
    private String closeApproachDate;

    @Field(type = FieldType.Double)
    private Double relativeVelocityKmS;

    @Field(type = FieldType.Double)
    private Double missDistanceKm;

    @Field(type = FieldType.Double)
    private Double missDistanceLunar;

    @Field(type = FieldType.Double)
    private Double missDistanceAstronomical;
}
