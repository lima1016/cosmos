package com.lima.cosmos.core.repository;

import com.lima.cosmos.core.domain.ExoplanetEntity;
import com.lima.cosmos.core.service.StarPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExoplanetRepository extends JpaRepository<ExoplanetEntity, String> {

    @Query("""
            select new com.lima.cosmos.core.service.StarPosition(
                e.hostname, avg(e.ra), avg(e.declination), avg(e.distancePc), avg(e.stellarTeffK), count(e))
            from ExoplanetEntity e
            where e.ra is not null and e.declination is not null and e.distancePc is not null
            group by e.hostname
            """)
    List<StarPosition> findStarPositions();

    List<ExoplanetEntity> findByHostnameOrderByOrbitalPeriodDaysAsc(String hostname);

    @Query("select avg(e.distancePc) from ExoplanetEntity e where e.distancePc is not null")
    Double averageDistancePc();

    List<ExoplanetEntity> findTop10ByDistancePcIsNotNullOrderByDistancePcAsc();

    @Query("select e.discoveryMethod, count(e) from ExoplanetEntity e group by e.discoveryMethod order by count(e) desc")
    List<Object[]> countByDiscoveryMethod();

    @Query("select e.discYear, count(e) from ExoplanetEntity e where e.discYear is not null group by e.discYear order by e.discYear")
    List<Object[]> countByDiscYear();
}
