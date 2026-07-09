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

    // 한국어 번역(lazy). 조회 시 없으면 ai-service 로 번역해 채우고 ES에 캐시한다.
    // copyright(작성자)는 번역하지 않고 원문을 그대로 둔다.
    @Field(type = FieldType.Text)
    private String titleKo;

    @Field(type = FieldType.Text)
    private String explanationKo;

    @Field(type = FieldType.Keyword, index = false)
    private String url;

    @Field(type = FieldType.Keyword, index = false)
    private String hdurl;

    @Field(type = FieldType.Keyword)
    private String mediaType;

    @Field(type = FieldType.Keyword)
    private String copyright;
}
