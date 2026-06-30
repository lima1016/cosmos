package com.lima.cosmos.ingestion.ingest;

import com.lima.cosmos.ingestion.nasa.ExoplanetRaw;
import com.lima.cosmos.ingestion.nasa.NasaExoplanetClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.Comparator;
import java.util.List;

/**
 * 수집 3모드:
 *  - backfill : 전체를 한 번에 Kafka 로 적재
 *  - incremental : 최근 N년 발견분만 적재 (스케줄러가 주기 호출)
 *  - replay : 발견 연도 순으로 천천히 흘려보내 "발견사 타임라인" 재생
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExoplanetIngestionService {

    private final NasaExoplanetClient client;
    private final KafkaTemplate<String, ExoplanetRaw> kafkaTemplate;

    @Value("${cosmos.kafka.topic.raw-exoplanet}")
    private String topic;

    @Value("${cosmos.replay.delay-ms}")
    private long replayDelayMs;

    @Value("${cosmos.incremental.recent-years}")
    private int recentYears;

    public int backfill() {
        List<ExoplanetRaw> all = client.fetchAll();
        all.forEach(this::send);
        log.info("[backfill] {}건 produce 완료 → {}", all.size(), topic);
        return all.size();
    }

    public int incremental() {
        int sinceYear = Year.now().getValue() - recentYears;
        List<ExoplanetRaw> recent = client.fetchRecent(sinceYear);
        recent.forEach(this::send);
        log.info("[incremental] {}년 이후 {}건 produce 완료", sinceYear, recent.size());
        return recent.size();
    }

    /** 비동기로 발견 연도 순서대로 천천히 emit (대시보드 애니메이션용). */
    public void replay() {
        List<ExoplanetRaw> all = client.fetchAll().stream()
                .filter(e -> e.disc_year() != null)
                .sorted(Comparator.comparing(ExoplanetRaw::disc_year))
                .toList();
        log.info("[replay] {}건을 {}ms 간격으로 발견연도순 재생 시작", all.size(), replayDelayMs);
        new Thread(() -> {
            for (ExoplanetRaw e : all) {
                send(e);
                try {
                    Thread.sleep(replayDelayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
            log.info("[replay] 완료");
        }, "exoplanet-replay").start();
    }

    private void send(ExoplanetRaw raw) {
        if (raw.pl_name() == null) return;
        kafkaTemplate.send(topic, raw.pl_name(), raw);
    }
}
