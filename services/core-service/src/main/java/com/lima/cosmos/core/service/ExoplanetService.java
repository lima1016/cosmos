package com.lima.cosmos.core.service;

import com.lima.cosmos.core.domain.ExoplanetDocument;
import com.lima.cosmos.core.domain.ExoplanetEntity;
import com.lima.cosmos.core.kafka.ExoplanetMessage;
import com.lima.cosmos.core.kafka.ExoplanetProcessed;
import com.lima.cosmos.core.repository.ExoplanetRepository;
import com.lima.cosmos.core.repository.ExoplanetSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExoplanetService {

    private final ExoplanetRepository repository;
    private final ExoplanetSearchRepository searchRepository;
    private final KafkaTemplate<String, ExoplanetProcessed> kafkaTemplate;

    @Value("${cosmos.kafka.topic.processed-exoplanet}")
    private String processedTopic;

    /** raw 메시지를 가공하여 PostgreSQL + Elasticsearch 에 저장하고 processed 토픽으로 재발행. */
    @Transactional
    @CacheEvict(value = "exoplanet-stats", allEntries = true)
    public void ingest(ExoplanetMessage msg) {
        ExoplanetEntity entity = ExoplanetEntity.builder()
                .name(msg.pl_name())
                .hostname(msg.hostname())
                .distancePc(msg.sy_dist())
                .orbitalPeriodDays(msg.pl_orbper())
                .radiusEarth(msg.pl_rade())
                .massEarth(msg.pl_bmasse())
                .stellarAgeGyr(msg.st_age())
                .stellarTeffK(msg.st_teff())
                .stellarMassSun(msg.st_mass())
                .ra(msg.ra())
                .declination(msg.declination())
                .discYear(msg.disc_year())
                .discoveryMethod(msg.discoverymethod())
                .build();
        repository.save(entity);

        // Elasticsearch 색인은 부가 기능 — 실패해도 PostgreSQL 저장/대시보드는 막지 않는다.
        try {
            searchRepository.save(ExoplanetDocument.builder()
                    .name(entity.getName())
                    .hostname(entity.getHostname())
                    .distancePc(entity.getDistancePc())
                    .orbitalPeriodDays(entity.getOrbitalPeriodDays())
                    .radiusEarth(entity.getRadiusEarth())
                    .massEarth(entity.getMassEarth())
                    .stellarAgeGyr(entity.getStellarAgeGyr())
                    .stellarTeffK(entity.getStellarTeffK())
                    .stellarMassSun(entity.getStellarMassSun())
                    .discYear(entity.getDiscYear())
                    .discoveryMethod(entity.getDiscoveryMethod())
                    .build());
        } catch (Exception e) {
            log.warn("ES 색인 실패(무시): {} - {}", entity.getName(), e.getMessage());
        }

        kafkaTemplate.send(processedTopic, entity.getName(), toProcessed(entity));
    }

    public Page<ExoplanetEntity> list(Pageable pageable) {
        return repository.findAll(pageable);
    }

    /** 검색어(이름/항성명 부분일치)로 페이지 조회. 비어 있으면 전체. */
    public Page<ExoplanetEntity> search(String q, Pageable pageable) {
        if (q == null || q.isBlank()) {
            return repository.findAll(pageable);
        }
        return repository.findByNameContainingIgnoreCaseOrHostnameContainingIgnoreCase(q, q, pageable);
    }

    public List<ExoplanetDocument> searchNearby(double maxDistancePc) {
        return searchRepository.findByDistancePcLessThanEqual(maxDistancePc);
    }

    /** 3D 우주 시각화용 항성(시스템) 위치 목록. limit 로 상한(가까운 순)을 둔다. */
    public List<StarPosition> starMap(int limit) {
        return repository.findStarPositions(PageRequest.of(0, limit));
    }

    /** 특정 항성의 행성들(공전주기 오름차순). */
    public List<ExoplanetEntity> system(String hostname) {
        return repository.findByHostnameOrderByOrbitalPeriodDaysAsc(hostname);
    }

    @Cacheable("exoplanet-stats")
    public ExoplanetStats stats() {
        log.info("통계 계산 (캐시 미스) — Redis 에 캐싱됩니다");
        long total = repository.count();
        Double avg = repository.averageDistancePc();

        List<ExoplanetStats.NearestPlanet> nearest = repository
                .findTop10ByDistancePcIsNotNullOrderByDistancePcAsc().stream()
                .map(e -> new ExoplanetStats.NearestPlanet(e.getName(), e.getDistancePc()))
                .toList();

        Map<String, Long> byMethod = new LinkedHashMap<>();
        for (Object[] row : repository.countByDiscoveryMethod()) {
            byMethod.put(row[0] == null ? "Unknown" : (String) row[0], (Long) row[1]);
        }

        Map<Integer, Long> byYear = new LinkedHashMap<>();
        for (Object[] row : repository.countByDiscYear()) {
            byYear.put((Integer) row[0], (Long) row[1]);
        }

        // 반지름 기준 행성 유형 분포. 표시 순서를 고정하려고 0으로 미리 채운다.
        Map<String, Long> byType = new LinkedHashMap<>();
        byType.put("Rocky", 0L);
        byType.put("Super-Earth", 0L);
        byType.put("Neptune-like", 0L);
        byType.put("Gas Giant", 0L);
        for (Double r : repository.radiiEarth()) {
            String key = r < 1.25 ? "Rocky" : r < 2.0 ? "Super-Earth" : r < 6.0 ? "Neptune-like" : "Gas Giant";
            byType.merge(key, 1L, Long::sum);
        }

        return new ExoplanetStats(total, avg, nearest, byMethod, byYear, byType);
    }

    /** 질량–반지름 산점도용 점 목록(둘 다 값이 있는 행성). */
    public List<MassRadiusPoint> massRadius() {
        return repository.findMassRadiusPairs();
    }

    private ExoplanetProcessed toProcessed(ExoplanetEntity e) {
        return new ExoplanetProcessed(
                e.getName(), e.getHostname(), e.getDistancePc(), e.getOrbitalPeriodDays(),
                e.getRadiusEarth(), e.getMassEarth(), e.getStellarAgeGyr(), e.getStellarTeffK(),
                e.getStellarMassSun(), e.getDiscYear(), e.getDiscoveryMethod());
    }
}
