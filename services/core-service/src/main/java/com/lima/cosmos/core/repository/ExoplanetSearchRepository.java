package com.lima.cosmos.core.repository;

import com.lima.cosmos.core.domain.ExoplanetDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;

public interface ExoplanetSearchRepository extends ElasticsearchRepository<ExoplanetDocument, String> {

    List<ExoplanetDocument> findByDistancePcLessThanEqual(Double maxDistancePc);

    List<ExoplanetDocument> findByHostnameContaining(String hostname);
}
