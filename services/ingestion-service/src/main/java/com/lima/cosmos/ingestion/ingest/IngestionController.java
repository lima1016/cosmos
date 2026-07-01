package com.lima.cosmos.ingestion.ingest;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
public class IngestionController {

    private final ExoplanetIngestionService service;
    private final ApodIngestionService apodService;
    private final NeoIngestionService neoService;

    /** 전체 적재 */
    @PostMapping("/exoplanet")
    public Map<String, Object> backfill() {
        int count = service.backfill();
        return Map.of("mode", "backfill", "produced", count);
    }

    /** 증분 적재 */
    @PostMapping("/exoplanet/incremental")
    public Map<String, Object> incremental() {
        int count = service.incremental();
        return Map.of("mode", "incremental", "produced", count);
    }

    /** 발견연도순 타임라인 리플레이 (비동기 시작) */
    @PostMapping("/exoplanet/replay")
    public Map<String, Object> replay() {
        service.replay();
        return Map.of("mode", "replay", "status", "started");
    }

    /** 오늘의 APOD 수집 (api.nasa.gov 토큰 사용) */
    @PostMapping("/apod")
    public Object apodToday() {
        return apodService.ingestToday();
    }

    /** 최근 N일치 APOD 수집 (기본 5일) */
    @PostMapping("/apod/recent")
    public Map<String, Object> apodRecent(@RequestParam(defaultValue = "5") int count) {
        int produced = apodService.ingestRecent(count);
        return Map.of("mode", "apod-recent", "produced", produced);
    }

    /** NeoWs 근지구 천체 수집 (기본 오늘~+6일, 최대 7일 범위). */
    @PostMapping("/neo")
    public Object neo(@RequestParam(required = false) String startDate,
                      @RequestParam(required = false) String endDate) {
        return neoService.ingest(startDate, endDate);
    }
}
