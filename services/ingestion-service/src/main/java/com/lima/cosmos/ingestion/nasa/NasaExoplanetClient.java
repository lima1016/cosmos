package com.lima.cosmos.ingestion.nasa;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Arrays;
import java.util.List;

/**
 * NASA Exoplanet Archive TAP(Table Access Protocol) 동기 조회 클라이언트.
 * https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html
 */
@Slf4j
@Component
public class NasaExoplanetClient {

    private static final String COLUMNS =
            "pl_name,hostname,sy_dist,pl_orbper,pl_rade,pl_bmasse,st_age,st_teff,st_mass,ra,dec,disc_year,discoverymethod";

    private final RestClient restClient = RestClient.create();

    @Value("${cosmos.nasa.exoplanet-tap-url}")
    private String tapUrl;

    @Value("${cosmos.nasa.max-rows}")
    private int maxRows;

    /**
     * 행성 전체를 가져온다.
     * pscomppars 는 행성당 1행(조합 파라미터)이라 ps 테이블의 default_flag 가 없다.
     */
    public List<ExoplanetRaw> fetchAll() {
        return query(null);
    }

    /** 최근 N년 내 발견된 행성만 (증분 수집 간이 구현). */
    public List<ExoplanetRaw> fetchRecent(int sinceYear) {
        return query("disc_year>=" + sinceYear);
    }

    private List<ExoplanetRaw> query(String whereClause) {
        String top = maxRows > 0 ? "top " + maxRows + " " : "";
        String where = (whereClause == null || whereClause.isBlank()) ? "" : " where " + whereClause;
        String adql = "select " + top + COLUMNS + " from pscomppars" + where;

        // URI 객체로 넘겨야 RestClient 가 재인코딩(이중 인코딩)하지 않는다.
        URI uri = UriComponentsBuilder.fromUriString(tapUrl)
                .queryParam("query", adql)
                .queryParam("format", "json")
                .build()
                .encode()
                .toUri();

        log.info("NASA TAP 조회: {}", adql);
        ExoplanetRaw[] body = restClient.get().uri(uri).retrieve().body(ExoplanetRaw[].class);
        List<ExoplanetRaw> result = body == null ? List.of() : Arrays.asList(body);
        log.info("NASA TAP 응답: {}건", result.size());
        return result;
    }
}
