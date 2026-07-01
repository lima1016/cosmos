package com.lima.cosmos.ingestion.ingest;

import com.lima.cosmos.ingestion.core.CoreNeoClient;
import com.lima.cosmos.ingestion.nasa.NasaNeoClient;
import com.lima.cosmos.ingestion.nasa.NeoFeedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * NeoWs 수집: feed(최대 7일) → 접근건마다 평탄화 → raw.neo 로 produce.
 * NASA 호출 전 core 에 범위 전체가 이미 저장됐는지 확인해 중복 호출을 막는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NeoIngestionService {

    private final NasaNeoClient client;
    private final CoreNeoClient coreNeoClient;
    private final KafkaTemplate<String, Object> nasaKafkaTemplate;

    @Value("${cosmos.kafka.topic.raw-neo}")
    private String topic;

    /**
     * @param start null/blank 이면 오늘
     * @param end   null/blank 이면 start+6일(7일 창; NASA 는 7일 초과 시 400)
     */
    public NeoIngestResult ingest(String start, String end) {
        LocalDate startD = (start != null && !start.isBlank()) ? LocalDate.parse(start) : LocalDate.now();
        LocalDate endD = (end != null && !end.isBlank()) ? LocalDate.parse(end) : startD.plusDays(6);
        String startS = startD.toString();
        String endS = endD.toString();

        // dedup 가드: 범위의 모든 날짜가 이미 저장돼 있으면 NASA 호출 스킵.
        boolean allPresent = true;
        for (LocalDate d = startD; !d.isAfter(endD); d = d.plusDays(1)) {
            if (!coreNeoClient.existsForDate(d.toString())) {
                allPresent = false;
                break;
            }
        }
        if (allPresent) {
            log.info("[neo] {}~{} 이미 저장됨 → NASA 호출 스킵", startS, endS);
            return NeoIngestResult.skipped(startS, endS);
        }

        NeoFeedResponse feed = client.fetchFeed(startS, endS);
        List<NeoFlat> flats = flatten(feed);
        for (NeoFlat f : flats) {
            nasaKafkaTemplate.send(topic, f.neoId() + "_" + f.closeApproachDate(), f);
        }
        log.info("[neo] {}~{} 접근 {}건 produce 완료", startS, endS, flats.size());
        return NeoIngestResult.fetched(startS, endS, flats.size());
    }

    /** 중첩 feed 를 접근건(NEO × close_approach) 단위로 평탄화. */
    private List<NeoFlat> flatten(NeoFeedResponse feed) {
        List<NeoFlat> out = new ArrayList<>();
        if (feed == null || feed.nearEarthObjects() == null) return out;

        for (List<NeoFeedResponse.Neo> neos : feed.nearEarthObjects().values()) {
            if (neos == null) continue;
            for (NeoFeedResponse.Neo neo : neos) {
                if (neo == null || neo.closeApproachData() == null) continue;
                Double dMin = null, dMax = null;
                if (neo.estimatedDiameter() != null && neo.estimatedDiameter().kilometers() != null) {
                    dMin = neo.estimatedDiameter().kilometers().min();
                    dMax = neo.estimatedDiameter().kilometers().max();
                }
                for (NeoFeedResponse.CloseApproach ca : neo.closeApproachData()) {
                    if (ca == null || ca.closeApproachDate() == null) continue;
                    out.add(new NeoFlat(
                            neo.id(),
                            neo.name(),
                            neo.hazardous(),
                            neo.absoluteMagnitudeH(),
                            dMin,
                            dMax,
                            ca.closeApproachDate(),
                            parse(ca.relativeVelocity() != null ? ca.relativeVelocity().kilometersPerSecond() : null),
                            parse(ca.missDistance() != null ? ca.missDistance().kilometers() : null),
                            parse(ca.missDistance() != null ? ca.missDistance().lunar() : null),
                            parse(ca.missDistance() != null ? ca.missDistance().astronomical() : null)
                    ));
                }
            }
        }
        return out;
    }

    /** NeoWs 는 속도·거리를 문자열로 주므로 안전하게 Double 변환. */
    private Double parse(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Double.valueOf(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
