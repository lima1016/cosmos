package com.lima.cosmos.ingestion.ingest;

import com.lima.cosmos.ingestion.core.CoreApodClient;
import com.lima.cosmos.ingestion.nasa.ApodResponse;
import com.lima.cosmos.ingestion.nasa.NasaApodClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * APOD 수집: api.nasa.gov 호출 → raw.apod 토픽으로 produce.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApodIngestionService {

    private final NasaApodClient client;
    private final CoreApodClient coreApodClient;
    private final KafkaTemplate<String, Object> nasaKafkaTemplate;

    // APOD 는 미 동부시각 자정에 발행되므로 "오늘"의 기준도 ET 로 잡아야
    // 날짜 경계에서 헛호출이 줄어든다(KST 로 잡으면 새벽에 아직 없는 날짜를 계속 조회하게 됨).
    private static final ZoneId APOD_ZONE = ZoneId.of("America/New_York");

    @Value("${cosmos.kafka.topic.raw-apod}")
    private String topic;

    /**
     * 오늘의 APOD 1건 수집.
     * NASA 를 호출하기 전에 core 에 오늘 날짜가 이미 저장됐는지 물어보고,
     * 이미 있으면 API 를 호출하지 않고 스킵한다(하루 한도 절약). 프론트는 이후
     * GET /api/apod/latest 로 저장된 사진을 그대로 보여주면 된다.
     */
    public ApodIngestResult ingestToday() {
        String today = LocalDate.now(APOD_ZONE).toString();

        if (coreApodClient.existsForDate(today)) {
            log.info("[apod] 오늘({}) 이미 저장됨 → NASA 호출 스킵", today);
            return ApodIngestResult.skipped(today);
        }

        ApodResponse apod = client.fetchToday();
        send(apod);
        log.info("[apod] 수집 완료: {} ({})", apod != null ? apod.title() : null,
                apod != null ? apod.date() : null);
        String date = apod != null && apod.date() != null ? apod.date() : today;
        return ApodIngestResult.fetched(date, apod != null ? apod.title() : null);
    }

    /** 최근 N일치 수집. */
    public int ingestRecent(int count) {
        List<ApodResponse> list = client.fetchRecent(count);
        list.forEach(this::send);
        log.info("[apod] 최근 {}건 수집 완료", list.size());
        return list.size();
    }

    private void send(ApodResponse apod) {
        if (apod == null || apod.date() == null) return;
        nasaKafkaTemplate.send(topic, apod.date(), apod);
    }
}
