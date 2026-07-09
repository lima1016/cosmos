package com.lima.cosmos.core.repository;

import com.lima.cosmos.core.domain.ApodDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;
import java.util.Optional;

public interface ApodSearchRepository extends ElasticsearchRepository<ApodDocument, String> {

    Optional<ApodDocument> findTop1ByOrderByDateDesc();

    /** 최신 페이지(최근 24). date 는 YYYY-MM-DD Keyword라 사전식 정렬 = 시간순. */
    List<ApodDocument> findTop24ByOrderByDateDesc();

    /** 더보기(keyset): 주어진 날짜보다 과거 24건. before=현재 목록의 가장 오래된 날짜. */
    List<ApodDocument> findTop24ByDateLessThanOrderByDateDesc(String before);
}
