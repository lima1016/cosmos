package com.lima.cosmos.ingestion.ingest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 주기적 증분 수집. NASA Exoplanet Archive는 자주 갱신되지 않으므로
 * 기본 주기는 길게(6시간). 운영 시 cron 으로 조정.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IngestionScheduler {

    private final ExoplanetIngestionService service;

    @Scheduled(fixedDelayString = "${cosmos.incremental.interval-ms:21600000}", initialDelay = 60000)
    public void scheduledIncremental() {
        try {
            service.incremental();
        } catch (Exception e) {
            log.warn("증분 수집 실패(다음 주기에 재시도): {}", e.getMessage());
        }
    }
}
