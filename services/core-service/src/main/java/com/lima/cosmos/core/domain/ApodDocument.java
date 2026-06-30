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
 * 천문 사진(APOD) — Elasticsearch 저장.
 * 미디어 피드는 계속 쌓이므로 ES에 두고 Postgres 는 가볍게 유지한다.
 * date(YYYY-MM-DD)를 id 로 사용하며 Keyword 라서 사전식 정렬 = 시간순.
 */
@Document(indexName = "apod")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApodDocument {

    @Id
    @Field(type = FieldType.Keyword)
    private String date;

    @Field(type = FieldType.Text)
    private String title;

    @Field(type = FieldType.Text)
    private String explanation;

    @Field(type = FieldType.Keyword, index = false)
    private String url;

    @Field(type = FieldType.Keyword, index = false)
    private String hdurl;

    @Field(type = FieldType.Keyword)
    private String mediaType;

    @Field(type = FieldType.Keyword)
    private String copyright;
}
