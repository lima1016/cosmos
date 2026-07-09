package com.lima.cosmos.core.service;

import com.lima.cosmos.core.domain.NeoDocument;
import com.lima.cosmos.core.kafka.NeoMessage;
import com.lima.cosmos.core.repository.NeoSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/** NeoWs 저장/조회 — Elasticsearch(neo 인덱스). */
@Service
@RequiredArgsConstructor
public class NeoService {

    private final NeoSearchRepository repository;

    public void save(NeoMessage msg) {
        repository.save(NeoDocument.builder()
                .id(msg.neoId() + "_" + msg.closeApproachDate())
                .neoId(msg.neoId())
                .name(msg.name())
                .hazardous(msg.hazardous())
                .absoluteMagnitudeH(msg.absoluteMagnitudeH())
                .diameterMinKm(msg.diameterMinKm())
                .diameterMaxKm(msg.diameterMaxKm())
                .closeApproachDate(msg.closeApproachDate())
                .relativeVelocityKmS(msg.relativeVelocityKmS())
                .missDistanceKm(msg.missDistanceKm())
                .missDistanceLunar(msg.missDistanceLunar())
                .missDistanceAstronomical(msg.missDistanceAstronomical())
                .build());
    }

    /** 기본(파라미터 없음)은 다가오는 접근만. from/to 지정 시 해당 구간(과거 포함) 조회. */
    public List<NeoDocument> list(String from, String to) {
        boolean hasFrom = from != null && !from.isBlank();
        boolean hasTo = to != null && !to.isBlank();
        if (!hasFrom && !hasTo) {
            return upcoming();
        }
        String lo = hasFrom ? from : "0000-01-01";
        String hi = hasTo ? to : "9999-12-31";
        return repository.findTop100ByCloseApproachDateBetweenOrderByCloseApproachDateAsc(lo, hi);
    }

    public List<NeoDocument> hazardous() {
        return repository.findTop100ByHazardousTrueOrderByCloseApproachDateAsc();
    }

    public List<NeoDocument> upcoming() {
        return repository.findTop100ByCloseApproachDateGreaterThanEqualOrderByCloseApproachDateAsc(
                LocalDate.now().toString());
    }

    public boolean exists(String date) {
        if (date == null || date.isBlank()) return false;
        return repository.existsByCloseApproachDate(date);
    }
}
