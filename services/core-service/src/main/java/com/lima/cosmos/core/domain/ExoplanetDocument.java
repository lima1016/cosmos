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

/** Elasticsearch 검색/집계용 외계행성 도큐먼트. */
@Document(indexName = "exoplanets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExoplanetDocument {

    @Id
    private String name;

    @Field(type = FieldType.Text)
    private String hostname;

    @Field(type = FieldType.Double)
    private Double distancePc;

    @Field(type = FieldType.Double)
    private Double orbitalPeriodDays;

    @Field(type = FieldType.Double)
    private Double radiusEarth;

    @Field(type = FieldType.Double)
    private Double massEarth;

    @Field(type = FieldType.Double)
    private Double stellarAgeGyr;

    @Field(type = FieldType.Double)
    private Double stellarTeffK;

    @Field(type = FieldType.Double)
    private Double stellarMassSun;

    @Field(type = FieldType.Integer)
    private Integer discYear;

    @Field(type = FieldType.Keyword)
    private String discoveryMethod;
}
