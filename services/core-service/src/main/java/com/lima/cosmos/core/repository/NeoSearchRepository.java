package com.lima.cosmos.core.repository;

import com.lima.cosmos.core.domain.NeoDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface NeoSearchRepository extends ElasticsearchRepository<NeoDocument, String> {

    /** 최근 저장분(접근일 오름차순 상위 100). */
    List<NeoDocument> findTop100ByOrderByCloseApproachDateAsc();

    /** 위험 소행성만(접근일 순). */
    List<NeoDocument> findTop100ByHazardousTrueOrderByCloseApproachDateAsc();

    /** 다가오는 접근(오늘 이후, 접근일 순). */
    List<NeoDocument> findTop100ByCloseApproachDateGreaterThanEqualOrderByCloseApproachDateAsc(String date);

    /** 해당 접근일 데이터 존재 여부(dedup 가드용). */
    boolean existsByCloseApproachDate(String date);
}
