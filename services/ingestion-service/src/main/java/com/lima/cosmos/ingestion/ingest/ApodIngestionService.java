package com.lima.cosmos.ingestion.ingest;

import com.lima.cosmos.ingestion.nasa.ApodResponse;
import com.lima.cosmos.ingestion.nasa.NasaApodClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * APOD 수집: api.nasa.gov 호출 → raw.apod 토픽으로 produce.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApodIngestionService {

    private final NasaApodClient client;
    private final KafkaTemplate<String, Object> nasaKafkaTemplate;

    @Value("${cosmos.kafka.topic.raw-apod}")
    private String topic;

    /** 오늘의 APOD 1건 수집. */
    public ApodResponse ingestToday() {
        ApodResponse apod = client.fetchToday();
        send(apod);
        log.info("[apod] 수집 완료: {} ({})", apod != null ? apod.title() : null,
                apod != null ? apod.date() : null);
        return apod;
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
