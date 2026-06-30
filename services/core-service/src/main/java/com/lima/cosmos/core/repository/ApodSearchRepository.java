package com.lima.cosmos.core.repository;

import com.lima.cosmos.core.domain.ApodDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;
import java.util.Optional;

public interface ApodSearchRepository extends ElasticsearchRepository<ApodDocument, String> {

    Optional<ApodDocument> findTop1ByOrderByDateDesc();

    List<ApodDocument> findTop24ByOrderByDateDesc();
}
