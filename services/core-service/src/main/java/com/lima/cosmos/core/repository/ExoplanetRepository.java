package com.lima.cosmos.core.repository;

import com.lima.cosmos.core.domain.ExoplanetEntity;
import com.lima.cosmos.core.service.MassRadiusPoint;
import com.lima.cosmos.core.service.StarPosition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExoplanetRepository extends JpaRepository<ExoplanetEntity, String> {

    /** 이름 또는 항성명 부분일치 검색(대소문자 무시). */
    Page<ExoplanetEntity> findByNameContainingIgnoreCaseOrHostnameContainingIgnoreCase(
            String name, String hostname, Pageable pageable);

    /**
     * 3D 성도용 항성 위치. 데이터가 무한정 커지지 않도록 Pageable 로 상한을 두고,
     * 가까운(거리 오름차순) 별부터 채운다 — 공간적으로 의미 있는 "태양 이웃" 우선.
     * 실제 표시 개수(거리 슬라이더)는 프론트에서 이 결과 안에서 필터한다.
     */
    @Query("""
            select new com.lima.cosmos.core.service.StarPosition(
                e.hostname, avg(e.ra), avg(e.declination), avg(e.distancePc), avg(e.stellarTeffK), count(e))
            from ExoplanetEntity e
            where e.ra is not null and e.declination is not null and e.distancePc is not null
            group by e.hostname
            order by avg(e.distancePc) asc
            """)
    List<StarPosition> findStarPositions(Pageable pageable);

    List<ExoplanetEntity> findByHostnameOrderByOrbitalPeriodDaysAsc(String hostname);

    @Query("select avg(e.distancePc) from ExoplanetEntity e where e.distancePc is not null")
    Double averageDistancePc();

    List<ExoplanetEntity> findTop10ByDistancePcIsNotNullOrderByDistancePcAsc();

    @Query("select e.discoveryMethod, count(e) from ExoplanetEntity e group by e.discoveryMethod order by count(e) desc")
    List<Object[]> countByDiscoveryMethod();

    @Query("select e.discYear, count(e) from ExoplanetEntity e where e.discYear is not null group by e.discYear order by e.discYear")
    List<Object[]> countByDiscYear();

    /** 반지름(지구=1) 값들 — 행성 유형 분류용(서비스에서 버킷팅). */
    @Query("select e.radiusEarth from ExoplanetEntity e where e.radiusEarth is not null")
    List<Double> radiiEarth();

    /** 질량·반지름 둘 다 있는 행성의 (이름, 반지름, 질량) — 산점도용. */
    @Query("""
            select new com.lima.cosmos.core.service.MassRadiusPoint(e.name, e.radiusEarth, e.massEarth)
            from ExoplanetEntity e
            where e.radiusEarth is not null and e.massEarth is not null
            """)
    List<MassRadiusPoint> findMassRadiusPairs();
}
