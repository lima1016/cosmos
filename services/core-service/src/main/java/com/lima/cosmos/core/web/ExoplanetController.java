package com.lima.cosmos.core.web;

import com.lima.cosmos.core.domain.ExoplanetDocument;
import com.lima.cosmos.core.domain.ExoplanetEntity;
import com.lima.cosmos.core.service.ExoplanetService;
import com.lima.cosmos.core.service.ExoplanetStats;
import com.lima.cosmos.core.service.StarPosition;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/exoplanets")
@RequiredArgsConstructor
public class ExoplanetController {

    private final ExoplanetService service;

    @GetMapping
    public Page<ExoplanetEntity> list(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size,
                                      @RequestParam(required = false) String q) {
        return service.search(q, PageRequest.of(page, size));
    }

    @GetMapping("/stats")
    public ExoplanetStats stats() {
        return service.stats();
    }

    /** 3D 우주 시각화용 항성 위치(적경·적위·거리). limit 로 상한(가까운 순, 기본 2000). */
    @GetMapping("/map")
    public List<StarPosition> map(@RequestParam(defaultValue = "2000") int limit) {
        return service.starMap(limit);
    }

    /** 특정 항성계의 행성 목록 (별 클릭 시 상세). */
    @GetMapping("/system")
    public List<ExoplanetEntity> system(@RequestParam String hostname) {
        return service.system(hostname);
    }

    /** Elasticsearch 로 거리 기준 검색 (예: 50pc 이내). */
    @GetMapping("/search")
    public List<ExoplanetDocument> searchNearby(@RequestParam(defaultValue = "50") double maxDistancePc) {
        return service.searchNearby(maxDistancePc);
    }
}
